import { describe, expect, it, vi } from 'vitest';
import { NOT_YET, adminApi, bottleneck, diffWord, disputedDeposits, disputeRows, gdnRow, invoicesByState, logRow, pickupRefusals, readExposure, readLog, readMoney, readPlatform, readStreak, reconLine, refusals, reserveLine, scorecard, streakRow, threeRows, typeWord, verifiedWord, weekOf, WEEK1, type AdminExposure, type Money, type MoneyEvent, type Reconciliation, type Streak } from './admin-api';
import type { Lot } from './auction';

const BASE = 'http://lane.test';
const KEY = 'd:*.sig';
type Seen = { url: string; method: string; body: unknown; auth: string | null };

/** A fetch that answers one route table; anything else is the Worker's own 404 "not found". */
function lane(routes: Record<string, (b: unknown) => Response>) {
  const seen: Seen[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET', path = url.replace(BASE, '');
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    seen.push({ url: path, method, body, auth: (init?.headers as Record<string, string>)?.Authorization ?? null });
    const h = routes[`${method} ${path}`];
    return h ? h(body) : new Response('not found', { status: 404 });
  });
  return { api: adminApi(BASE, () => KEY, f), seen, f };
}
const ok = (x: unknown) => () => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });

describe('admin-api: every route, and a 404 reads as Not yet', () => {
  it('GET /admin/exposure carries the admin key', async () => {
    const { api, seen } = lane({ 'GET /admin/exposure': ok({ deposits: { heldCount: 2, heldUsd: 500, byStatus: {}, reserveRatio: null } }) });
    const r = await api.exposure();
    expect(r.ok && r.value.deposits.reserveRatio).toBe(null);
    expect(seen[0].auth).toBe(`Bearer ${KEY}`);
  });
  it('POST /admin/reconcile', async () => {
    const { api } = lane({ 'POST /admin/reconcile': ok({ id: 'rec_1', equal: 1 }) });
    expect((await api.reconcile()).ok).toBe(true);
  });
  it('POST /admin/buyers/:id/bump, and a 404 that names the thing is passed on', async () => {
    const { api } = lane({ 'POST /admin/buyers/b_1/bump': ok({ id: 'b_1', epoch: 2 }), 'POST /admin/buyers/b_x/bump': () => new Response('no such buyer', { status: 404 }) });
    expect(await api.bump('b_1')).toEqual({ ok: true, value: { id: 'b_1', epoch: 2 } });
    expect(await api.bump('b_x')).toEqual({ ok: false, reason: 'no such buyer' });
  });
  it('the dealer routes: list, suspend, restore, mint', async () => {
    const { api, seen } = lane({
      'GET /dealers': ok([]), 'POST /dealers/P12345/suspend': ok({ gdn: 'P12345' }), 'POST /dealers/P12345/restore': ok({ gdn: 'P12345' }), 'POST /dealers': ok({ token: 'd:P12345.x' }),
    });
    expect((await api.dealers()).ok).toBe(true);
    expect((await api.suspend('P12345')).ok).toBe(true);
    expect((await api.restore('P12345')).ok).toBe(true);
    expect(await api.mint('P12345', 'Example Motors')).toEqual({ ok: true, value: { token: 'd:P12345.x' } });
    expect(seen.at(-1)!.body).toEqual({ gdn: 'P12345', name: 'Example Motors' });
  });
  it('GET /lots', async () => {
    const { api } = lane({ 'GET /lots': ok([{ id: 'a' }]) });
    const r = await api.lane();
    expect(r.ok && r.value.length).toBe(1);
  });
  it('GET /admin/money reads the list newest first', async () => {
    const { api } = lane({ 'GET /admin/money': ok({ events: [{ id: 'e1', type: 'payment.succeeded', kind: 'deposit', amountUsd: 250, at: 1 }, { id: 'e2', type: 'refund.created', amountUsd: 250, at: 5 }], payouts: [{ id: 'p1', lotId: 'l1', dealer: 'P12345', amountUsd: 5400, state: 'owed' }] }) });
    const r = await api.money();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.events.map(e => e.id)).toEqual(['e2', 'e1']);
    expect(r.value.payouts[0]).toMatchObject({ id: 'p1', state: 'owed', method: null, paidAt: null });
    expect(r.value.sales).toEqual([]);
    expect(r.value.invoices).toEqual([]);
    expect(r.value.evidencePacks).toEqual([]);
  });
  it('GET /admin/money 404 is Not yet', async () => {
    expect(await lane({}).api.money()).toEqual({ ok: false, reason: NOT_YET });
  });
  it('GET /admin/reconcile?n= reads the streak and the nights, newest first, with the admin key', async () => {
    const { api, seen } = lane({ 'GET /admin/reconcile?n=7': ok({ equalNights: 7, sevenEqual: true, latest: { id: 'rec_b', ranAt: 20, equal: true },
      nights: [{ id: 'rec_a', ranAt: 10, equal: true, lotsChecked: 3, lotsDiffering: 0, differing: [], differences: [], depositsHeld: 2, payoutsOwed: 0, payoutsOwedCents: 0, whopBalanceCents: 50_000, reserveRatio: 1, note: 'equal' },
        { id: 'rec_b', ranAt: 20, equal: 1, lotsChecked: 3, lotsDiffering: 0, differing: [], differences: [], depositsHeld: 2, payoutsOwed: 1, payoutsOwedCents: 540_000, whopBalanceCents: null, reserveRatio: null, note: '' }] }) });
    const r = await api.streak();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(seen[0]).toMatchObject({ url: '/admin/reconcile?n=7', method: 'GET', auth: `Bearer ${KEY}` });
    expect(r.value).toMatchObject({ equalNights: 7, sevenEqual: true, latest: { id: 'rec_b', equal: true } });
    expect(r.value.nights.map(n => n.id)).toEqual(['rec_b', 'rec_a']);
    expect(r.value.nights[0]).toMatchObject({ equal: true, whopBalanceCents: null, reserveRatio: null, payoutsOwedCents: 540_000 });
  });
  it('GET /admin/reconcile?n= clamps n to 1..100 as the Worker does (0 is the default 7), and a 404 is Not yet', async () => {
    const empty = ok({ equalNights: 0, sevenEqual: false, latest: null, nights: [] });
    const { api, seen } = lane({ 'GET /admin/reconcile?n=100': empty, 'GET /admin/reconcile?n=7': empty, 'GET /admin/reconcile?n=1': empty });
    expect((await api.streak(500)).ok).toBe(true);
    expect((await api.streak(0)).ok).toBe(true);
    expect((await api.streak(-2)).ok).toBe(true);
    expect(seen.map(s => s.url)).toEqual(['/admin/reconcile?n=100', '/admin/reconcile?n=7', '/admin/reconcile?n=1']);
    expect(await lane({}).api.streak()).toEqual({ ok: false, reason: NOT_YET });
  });
  it('POST /admin/payouts/:id/paid sends the method and the note', async () => {
    const { api, seen } = lane({ 'POST /admin/payouts/p1/paid': ok({ id: 'p1', state: 'paid', method: 'check' }) });
    expect((await api.paidByHand('p1', 'check', '  check 1042 ')).ok).toBe(true);
    expect(seen[0].body).toEqual({ method: 'check', note: 'check 1042' });
  });
  it('POST /admin/payouts/:id/paid 404 is Not yet; no method sends nothing', async () => {
    const { api, f } = lane({});
    expect(await api.paidByHand('p1', 'wire', '')).toEqual({ ok: false, reason: NOT_YET });
    expect(await api.paidByHand('p1', 'venmo' as never, '')).toEqual({ ok: false, reason: 'no method' });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('POST /admin/buyers/:id/release sends the reason and the lot', async () => {
    const { api, seen } = lane({ 'POST /admin/buyers/b_1/release': ok({ id: 'b_1', deposit: 'refunded' }) });
    expect(await api.release('b_1', 'Dealer sold it off the lane', 'lot1')).toEqual({ ok: true, value: { id: 'b_1', deposit: 'refunded' } });
    expect(seen[0].body).toEqual({ reason: 'Dealer sold it off the lane', lotId: 'lot1' });
  });
  it('POST /admin/buyers/:id/release 404 is Not yet; an empty reason sends nothing', async () => {
    const { api, f } = lane({});
    expect(await api.release('b_1', 'x')).toEqual({ ok: false, reason: NOT_YET });
    expect(await api.release('b_1', '   ')).toEqual({ ok: false, reason: 'no reason' });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('POST /admin/lots/:id/forfeit sends the reason', async () => {
    const { api, seen } = lane({ 'POST /admin/lots/lot1/forfeit': ok({ id: 'lot1' }) });
    expect((await api.forfeit('lot1', 'Buyer did not pay by the deadline')).ok).toBe(true);
    expect(seen[0]).toMatchObject({ method: 'POST', body: { reason: 'Buyer did not pay by the deadline' } });
  });
  it('POST /admin/lots/:id/forfeit 404 is Not yet; a JSON error reads its error', async () => {
    expect(await lane({}).api.forfeit('lot1', 'x')).toEqual({ ok: false, reason: NOT_YET });
    const { api } = lane({ 'POST /admin/lots/lot2/forfeit': () => new Response(JSON.stringify({ error: 'not_owed' }), { status: 409 }) });
    expect(await api.forfeit('lot2', 'x')).toEqual({ ok: false, reason: 'not_owed' });
  });
  it('no key, no base, no network', async () => {
    expect(await adminApi(BASE, () => null).exposure()).toEqual({ ok: false, reason: 'no key' });
    expect(await adminApi('', () => KEY).exposure()).toEqual({ ok: false, reason: 'offline' });
    expect(await adminApi(BASE, () => KEY, async () => { throw new Error('down'); }).exposure()).toEqual({ ok: false, reason: 'offline' });
  });
});

describe('readMoney', () => {
  it('reads nothing as empty lists and keeps unknown methods out', () => {
    expect(readMoney(null)).toEqual({ events: [], payouts: [], sales: [], invoices: [], evidencePacks: [] });
    expect(readMoney({ payouts: [{ lotId: 'l', method: 'venmo', state: 'paid' }] }).payouts[0]).toMatchObject({ id: 'l', method: null, state: 'paid' });
  });
});

describe('readStreak', () => {
  it('reads nothing as no nights and no streak; a streak the Worker omits is counted from the rows, never above them', () => {
    expect(readStreak(null)).toEqual({ equalNights: 0, sevenEqual: false, latest: null, nights: [] });
    const rows = { nights: [{ id: 'c', ranAt: 3, equal: true }, { id: 'b', ranAt: 2, equal: true }, { id: 'a', ranAt: 1, equal: false }] };
    const s = readStreak(rows);
    expect(s).toMatchObject({ equalNights: 2, sevenEqual: false, latest: { id: 'c', ranAt: 3, equal: true } });
    expect(s.nights[0].differences).toEqual([]);
    expect(readStreak({ ...rows, equalNights: 9, sevenEqual: true }).sevenEqual).toBe(true);
    expect(readStreak({ equalNights: -3, nights: [] }).equalNights).toBe(0);
  });
});

/* The streak row on the admin home: the number touching "nights equal", the Phase 2 Server gate, the differences. */
describe('the streak row', () => {
  const night = (id: string, equal: boolean, differences: Streak['nights'][number]['differences'] = []): Streak['nights'][number] =>
    ({ id, ranAt: Date.parse('2026-10-13T08:00:00Z'), equal, lotsChecked: 3, lotsDiffering: differences.length, differing: [...new Set(differences.map(d => d.lot))], differences, depositsHeld: 2, payoutsOwed: 0, payoutsOwedCents: 0, whopBalanceCents: 50_000, reserveRatio: 1, note: '' });
  it('seven nights running meets the gate (phases.md: "equal seven nights running")', () => {
    const r = streakRow({ equalNights: 7, sevenEqual: true, latest: { id: 'n7', ranAt: 1, equal: true }, nights: [night('n7', true)] });
    expect(r).toEqual({ n: 7, met: true, gate: 'Phase 2 Server exit, met', differences: [] });
    expect(streakRow({ equalNights: 6, sevenEqual: false, latest: { id: 'n6', ranAt: 1, equal: true }, nights: [night('n6', true)] })).toMatchObject({ n: 6, met: false, gate: 'Phase 2 Server exit at 7', differences: [] });
  });
  it('a latest night that was not equal lists its differences: lot, field, copy, object, four words or fewer each', () => {
    const diffs = [
      { lot: 'lot_7', field: 'high', copy: 5400, object: 5425 },
      { lot: 'lot_9', field: 'closed', copy: null, object: { at: 1, sold: true } },
    ];
    const r = streakRow({ equalNights: 0, sevenEqual: false, latest: { id: 'n0', ranAt: 1, equal: false }, nights: [night('n0', false, diffs), night('n1', true)] });
    expect(r.n).toBe(0);
    expect(r.met).toBe(false);
    expect(r.differences).toEqual([
      { lot: 'lot_7', field: 'High bid', copy: '$5,400', object: '$5,425' },
      { lot: 'lot_9', field: 'Closed', copy: 'Open', object: 'Sold' },
    ]);
    for (const c of r.differences) for (const cell of Object.values(c)) expect(cell.split(/\s+/).length).toBeLessThanOrEqual(4);
    // an equal latest night lists nothing, even if an older night differed
    expect(streakRow({ equalNights: 1, sevenEqual: false, latest: { id: 'n1', ranAt: 2, equal: true }, nights: [night('n1', true), night('n0', false, diffs)] }).differences).toEqual([]);
  });
  it('not read, and never reconciled', () => {
    expect(streakRow(null)).toEqual({ n: null, met: false, gate: 'Not read', differences: [] });
    expect(streakRow({ equalNights: 0, sevenEqual: false, latest: null, nights: [] })).toEqual({ n: 0, met: false, gate: 'Never reconciled', differences: [] });
  });
  it('every value is four words or fewer: the time, the leader, the sale, the gone object', () => {
    expect(diffWord('closesAt', Date.parse('2026-10-13T08:00:00Z'))).toBe('Oct 13, 3:00 AM');
    expect(diffWord('leader', null)).toBe('Nobody');
    expect(diffWord('leader', 'b_12')).toBe('b_12');
    expect(diffWord('sale', null)).toBe('No sale');
    expect(diffWord('sale', { buyer: 'b_12', hammer: 5400, paidAt: 1 })).toBe('paid, b_12');
    expect(diffWord('sale', { buyer: 'b_12', hammer: 5400, voidedAt: 1 })).toBe('voided, b_12');
    expect(diffWord('closed', { at: 1, sold: false })).toBe('Not sold');
    expect(diffWord('object', '{"high":5400}')).toBe('Copy kept');
    expect(diffWord('object', null)).toBe('Gone');
    expect(diffWord('bids', 12)).toBe('12');
    expect(diffWord('odd', { a: 'x'.repeat(40) })).toHaveLength(24);
  });
});

/* The scorecard. Week 3 (Mon Oct 26 to Sun Nov 1, 2026): floors L 2, D 3 (13), B 2, S 60%, T 90%. */
const H = 3_600_000, D = 24 * H;
const w3 = WEEK1 + 14 * D;
const lot = (p: Partial<Lot>): Lot => ({ id: 'x', start: 1000, retail: 2000, opensAt: 0, closesAt: 0, high: 0, bids: 0, watching: 0, ...p });
const ex = (sales: AdminExposure['sales']): AdminExposure => ({ deposits: { heldCount: 0, heldUsd: 0, byStatus: {}, reserveRatio: 1 }, lots: { open: 0, atLender: 0, floorBelowPayoff: 0 }, sales, incidentsByDealer: {}, dealers: [], obaviaFeesOwed: 0 });

describe('the week', () => {
  it('week 1 begins Monday Oct 12, 2026 at midnight Central (05:00 UTC in daylight time)', () => {
    expect(new Date(WEEK1).toISOString()).toBe('2026-10-12T05:00:00.000Z');
    expect(weekOf(Date.parse('2026-10-13T12:00:00Z')).n).toBe(1);
    expect(weekOf(Date.parse('2026-10-19T04:59:00Z')).n).toBe(1);   // Sunday 23:59 Central
    expect(weekOf(Date.parse('2026-10-19T05:00:00Z')).n).toBe(2);
    expect(new Date(weekOf(Date.parse('2026-11-03T12:00:00Z')).start).toISOString()).toBe('2026-11-02T06:00:00.000Z');   // standard time from Nov 1
  });
});

describe('scorecard', () => {
  it('reads L and S from the lane, D from deposit.captured, T from the exposure; B is Not yet without bidders', () => {
    const now = w3 + 2 * D;
    const lane = [lot({ id: 'a', opensAt: w3 + H, closed: { at: w3 + D, sold: true } }), lot({ id: 'b', opensAt: w3 + 2 * H, closed: { at: w3 + D, sold: false } }), lot({ id: 'c', opensAt: w3 - D })];
    const money: Money = { payouts: [], sales: [], events: [
      { id: '1', type: 'deposit.captured', kind: null, amountUsd: 250, lotId: null, buyer: 'b1', at: w3 + H },
      { id: '2', type: 'deposit.captured', kind: null, amountUsd: 250, lotId: null, buyer: 'b2', at: w3 - D },
      { id: '3', type: 'payment.succeeded', kind: 'balance', amountUsd: 5000, lotId: 'a', buyer: 'b1', at: w3 + H },
      { id: '4', type: 'payment.succeeded', kind: 'deposit', amountUsd: 250, lotId: null, buyer: 'b1', at: w3 + H },
      { id: '5', type: 'deposit.duplicate', kind: null, amountUsd: 250, lotId: null, buyer: 'b1', at: w3 + 2 * H },
    ] };
    const s = scorecard(now, ex([{ lotId: 'a', state: 'started', hammer: 1, deadlineAt: 0 }, { lotId: 'z', state: 'forfeited', hammer: 1, deadlineAt: 0 }, { lotId: 'y', state: 'owed', hammer: 1, deadlineAt: 0 }]), lane, money);
    expect(s.week).toBe(3);
    const by = Object.fromEntries(s.numbers.map(n => [n.k, n]));
    expect(by.L).toMatchObject({ value: 2, shown: '2', floor: 2 });
    expect(by.D).toMatchObject({ value: 1, shown: '1 (2)', floorShown: '3 (13)' });
    expect(by.B).toMatchObject({ value: null, shown: 'Not yet' });
    expect(by.S).toMatchObject({ value: 0.5, shown: '50%', floorShown: '60%' });
    expect(by.T).toMatchObject({ value: 0.5, shown: '50%', floorShown: '90%' });
    // D is 1 of 3 (67% under), S 50 of 60 (17% under), T 50 of 90 (44% under): D is furthest below
    expect(s.bottleneck).toBe('D is the bottleneck: 1 (2) against 3 (13). Fix the ad or the page.');
  });
  it('says Not yet with no data, and the lane past three days marks L and refuses S', () => {
    const s = scorecard(w3 + 5 * D, null, [lot({ opensAt: w3 + H, closed: { at: w3 + D, sold: true } })], null);
    const by = Object.fromEntries(s.numbers.map(n => [n.k, n]));
    expect(by.L.shown).toBe('1 or more');
    expect(by.S.value).toBe(null);
    expect(by.D.shown).toBe('Not yet');
    expect(by.T.shown).toBe('Not yet');
    expect(scorecard(w3, null, null, null).bottleneck).toBe('Nothing to judge yet. The week stands on its gate.');
  });
  it('D counts deposit.captured only: Whop news, a duplicate and a refund move nothing', () => {
    const ev = (id: string, type: string, at: number, kind: string | null = null): MoneyEvent => ({ id, type, kind, amountUsd: 250, lotId: null, buyer: 'b', at });
    const money: Money = { payouts: [], sales: [], events: [ev('a', 'payment.succeeded', w3 + H, 'deposit'), ev('b', 'deposit.duplicate', w3 + H), ev('c', 'deposit.released', w3 + H)] };
    const D3 = scorecard(w3 + D, null, null, money).numbers.find(n => n.k === 'D')!;
    expect(D3).toMatchObject({ value: 0, shown: '0 (0)' });
    money.events.push(ev('d', 'deposit.captured', w3 + 2 * H), ev('e', 'deposit.captured', w3 + 3 * H));
    expect(scorecard(w3 + D, null, null, money).numbers.find(n => n.k === 'D')).toMatchObject({ value: 2, shown: '2 (2)' });
  });
  it('B averages exposure.bidders over the lots closed this week, shown rounded down', () => {
    const b = (lotId: string, closedAt: number, bidders: number) => ({ lotId, dealer: 'P1', closedAt, sold: true, bidders });
    const x = { ...ex([]), bidders: [b('a', w3 + H, 3), b('b', w3 + 2 * H, 2), b('c', w3 + 3 * H, 3), b('old', w3 - D, 40)] };
    const B = scorecard(w3 + D, x, null, null).numbers.find(n => n.k === 'B')!;
    expect(B.value).toBeCloseTo(8 / 3);
    expect(B).toMatchObject({ shown: '2.6', floor: 2, floorShown: '2', from: '3 closed this week' });
    expect(scorecard(w3 + D, { ...ex([]), bidders: [b('x', w3 + H, 2), b('y', w3 + H, 2)] }, null, null).numbers.find(n => n.k === 'B')!.shown).toBe('2');
    // a week with lots closed but none bid on is a real 0, judged under the floor
    const zero = scorecard(w3 + D, { ...ex([]), bidders: [b('z', w3 + H, 0)] }, null, null);
    expect(zero.numbers.find(n => n.k === 'B')).toMatchObject({ value: 0, shown: '0' });
    expect(zero.bottleneck).toBe('B is the bottleneck: 0 against 2. Fix the lane’s reach: Marketplace posts and the share sheet.');
    expect(scorecard(w3 + D, { ...ex([]), bidders: [b('old', w3 - D, 4)] }, null, null).numbers.find(n => n.k === 'B')).toMatchObject({ value: null, from: 'No lot closed this week' });
    expect(scorecard(w3 + D, ex([]), null, null).numbers.find(n => n.k === 'B')!.from).toBe('The lane does not count bidders yet');
  });
  it('the bottleneck rule: nothing under the floor', () => {
    const n = (k: 'L' | 'S', value: number, floor: number) => ({ k, label: '', value, shown: String(value), floor, floorShown: String(floor), from: '' });
    expect(bottleneck([n('L', 5, 4)], 5)).toBe('Nothing measured is under its floor. Spend G at +10%.');
    expect(bottleneck([n('L', 5, 4)], 3)).toBe('Nothing measured is under its floor.');
    expect(bottleneck([n('L', 0, 0)], 1)).toBe('Nothing to judge yet. The week stands on its gate.');
  });
});

describe('the last reconciliation, one line', () => {
  const row = (p: Partial<Reconciliation>): Reconciliation => ({ id: 'r', ran_at: Date.parse('2026-10-13T08:00:00Z'), lots_checked: 3, lots_differing: 0, differing: [], deposits_held: 2, whop_balance_cents: 50_000, equal: 1, note: '', ...p });
  it('equal, short, unread, never', () => {
    expect(reconLine([row({})])).toBe('Tue, Oct 13, 3:00 AM. Equal.');
    expect(reconLine([row({ whop_balance_cents: 40_000, equal: 0 })])).toMatch(/Whop \$100 short of the deposits\.$/);
    expect(reconLine([row({ whop_balance_cents: null })])).toMatch(/Whop balance not read\.$/);
    expect(reconLine([row({ lots_differing: 2, equal: 0 }), row({ ran_at: 0 })])).toMatch(/2 lot copies differed\.$/);
    expect(reconLine([])).toBe('Never reconciled.');
  });
});

describe('refusals and words', () => {
  it('counts by reason and keeps the last ten, newest first', () => {
    const x = { ...ex([]), bidRefusals: { byReason: { win_cap: 2, not_a_buyer: 5 }, recent: Array.from({ length: 8 }, (_, i) => ({ lotId: 'l', who: 'b', reason: 'win_cap', matched: null, at: i })) },
      tokenRefusals: { byPresented: { stale: 1 }, recent: Array.from({ length: 8 }, (_, i) => ({ claimed: 'b', reason: 'not_yours', presented: 'stale', known: 1, at: 100 + i })) } };
    const r = refusals(x);
    expect(r.counts[0]).toEqual({ label: 'Desk key bid', n: 5 });
    expect(r.recent).toHaveLength(10);
    expect(r.recent[0]).toMatchObject({ label: 'Old token sign-in', at: 107 });
    for (const c of [...r.counts, ...r.recent]) expect(c.label.split(/\s+/).length).toBeLessThanOrEqual(4);
    expect(refusals(ex([])).read).toBe(false);
  });
  it('the Worker\'s two bid gates have their desk words, four words or fewer', () => {
    const r = refusals({ ...ex([]), bidRefusals: { byReason: { too_many_bids: 3, one_open_bid: 1 }, recent: [] } });
    expect(r.counts).toEqual([{ label: 'Twenty-one bids a minute', n: 3 }, { label: 'A second open bid', n: 1 }]);
    for (const c of r.counts) expect(c.label.split(/\s+/).length).toBeLessThanOrEqual(4);
  });
  it('names money events in plain words', () => {
    expect(typeWord({ type: 'payment.succeeded', kind: 'deposit' })).toBe('Deposit in');
    expect(typeWord({ type: 'refund.created', kind: null })).toBe('Refunded');
    expect(typeWord({ type: 'dispute.created', kind: null })).toBe('Disputed');
  });
  it('every money event the Worker writes has its own desk word', () => {
    const words: Record<string, string> = {
      'deposit.captured': 'Deposit held', 'deposit.released': 'Deposit back', 'deposit.applied': 'Deposit to the dealer',
      'deposit.duplicate': 'Second deposit refused', 'deposit.disputed': 'Deposit disputed', 'deposit.refund_conflict': 'Refund conflict',
      'payout.sent': 'Payout sent', 'balance.paid_at_lot': 'Paid at the lot', 'admin.forfeit': 'Forfeited by admin',
      'admin.release': 'Released by admin', 'admin.paid': 'Paid by hand', 'payout.by_hand': 'Paid by hand', 'dealer.account': 'Dealer account',
    };
    for (const [type, w] of Object.entries(words)) expect(typeWord({ type, kind: null })).toBe(w);
    expect(typeWord({ type: '', kind: null })).toBe('Unknown');
  });
});

describe('disputed deposits, pickup refusals, the reserve read', () => {
  it('disputed: the count from byStatus, the buyers from deposit.disputed events, once each', () => {
    const x = { ...ex([]), deposits: { heldCount: 0, heldUsd: 0, byStatus: { captured: 3, disputed: 2 }, reserveRatio: 1 } };
    const ev = (id: string, type: string, buyer: string): MoneyEvent => ({ id, type, kind: null, amountUsd: 250, lotId: null, buyer, at: 1 });
    const money: Money = { payouts: [], sales: [], events: [ev('1', 'deposit.disputed', 'b_1'), ev('2', 'deposit.disputed', 'b_2'), ev('3', 'deposit.disputed', 'b_1'), ev('4', 'deposit.captured', 'b_3')] };
    expect(disputedDeposits(x, money)).toEqual({ n: 2, buyers: ['b_1', 'b_2'] });
    expect(disputedDeposits(ex([]), null)).toEqual({ n: 0, buyers: [] });
    expect(disputedDeposits(null, null)).toEqual({ n: null, buyers: [] });
  });
  it('pickup refusals: newest first, at most 20, the six scanned and the reason word', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ lotId: `l${i}`, dealer: 'P1', reason: i === 24 ? 'wrong car' : i === 23 ? 'vin_required' : 'odd_reason', presented: i === 23 ? null : `ABC${100 + i}`, at: i }));
    const r = pickupRefusals({ ...ex([]), pickupRefusals: rows });
    expect(r.read).toBe(true);
    expect(r.rows).toHaveLength(20);
    expect(r.rows[0]).toEqual({ label: 'Wrong car', lotId: 'l24', dealer: 'P1', six: 'scanned ABC124', at: 24 });
    expect(r.rows[1]).toMatchObject({ label: 'VIN not read', six: 'nothing scanned' });
    expect(r.rows[2].label).toBe('odd_reason');
    expect(pickupRefusals(ex([]))).toEqual({ rows: [], read: false });
    expect(pickupRefusals(null).read).toBe(false);
  });
  it('the reserve line says when the Whop balance was read, or that it never was', () => {
    const at = Date.parse('2026-10-13T08:00:00Z');
    expect(reserveLine({ ...ex([]), deposits: { heldCount: 0, heldUsd: 0, byStatus: {}, reserveRatio: 1, reserveReadAt: at } })).toBe('Read Tue, Oct 13, 3:00 AM');
    expect(reserveLine({ ...ex([]), deposits: { heldCount: 0, heldUsd: 0, byStatus: {}, reserveRatio: null, reserveReadAt: null } })).toBe('Never read');
    expect(reserveLine(null)).toBe('Not read');
  });
});

/* ---------- Wave 3 (gap-table.md §4 W3-E): the readers coded to W3-B's and W3-A's names, against a faked fetch ---------- */
const T0 = Date.parse('2026-10-13T08:00:00Z');
const x3 = (p: Partial<AdminExposure> = {}): AdminExposure => ({ ...ex([]), ...p });

describe('W3-B routes: the lot log, the GDN, the exposure fields', () => {
  it('GET /admin/lots/:id/log reads every row oldest first, in the desk words, with the admin key', async () => {
    const { api, seen } = lane({ 'GET /admin/lots/lot%201/log': ok({ lotId: 'lot 1', rows: [
      { kind: 'payout', state: 'owed', dealer: 'P1', amountUsd: 250, at: T0 + 5000 },
      { kind: 'bid', buyer: 'b_1', amount: 5400, at: T0 + 1000 },
      { kind: 'bid_refusal', who: 'b_2', reason: 'win_cap', at: T0 + 2000 },
      { kind: 'signature', document: 'Buyers Guide', buyer: 'b_1', at: T0 + 3000 },
      { kind: 'plates', state: 'filed', at: T0 + 4000 },
      { kind: 'evidence_pack', sha256: 'abcdef0123456789', uploadedAt: null, at: T0 + 6000 },
    ] }) });
    const r = await api.log('lot 1');
    expect(seen[0]).toMatchObject({ url: '/admin/lots/lot%201/log', method: 'GET', auth: `Bearer ${KEY}` });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lotId).toBe('lot 1');
    expect(r.value.rows.map(w => w.word)).toEqual(['Bid', 'Fifth win this year', 'Signed', 'Plates filed', 'Payout owed', 'Evidence pack']);
    expect(r.value.rows[0]).toMatchObject({ at: T0 + 1000, line: 'b_1', amountUsd: 5400 });
    expect(r.value.rows[5].line).toBe('sha abcdef012345 · not sent');
    for (const w of r.value.rows) expect(w.word.split(/\s+/).length).toBeLessThanOrEqual(4);
  });
  it('GET /admin/lots/:id/log 404 is Not yet; a bare array and `events` read the same', async () => {
    expect(await lane({}).api.log('l')).toEqual({ ok: false, reason: NOT_YET });
    expect(readLog([{ type: 'deposit.captured', buyer: 'b', at: 2 }, { kind: 'incident', reason: 'no_start', dealer: 'P1', at: 1 }], 'l').rows.map(r => r.word)).toEqual(['Did not start', 'Deposit held']);
    expect(readLog({ events: [{ kind: 'pickup_refusal', reason: 'wrong car', presented: 'ABC123', at: 1 }] }, 'l').rows[0]).toMatchObject({ word: 'Wrong car', line: 'scanned ABC123' });
    expect(readLog(null, 'l')).toEqual({ lotId: 'l', rows: [] });
  });
  it('POST /admin/gdn sends the date and the two fees in cents, as typed; nothing is sent without a date or with a bad fee', async () => {
    const { api, seen, f } = lane({ 'POST /admin/gdn': ok({ gdn_issued_at: T0, fee_per_car_cents: 19900, fee_monthly_cents: 29900 }) });
    const r = await api.gdn(T0 + 0.4, 19900, 29900);
    expect(seen[0]).toMatchObject({ method: 'POST', body: { issuedAt: T0, feePerCarCents: 19900, feeMonthlyCents: 29900 } });
    expect(r).toEqual({ ok: true, value: { gdnIssuedAt: T0, feePerCarCents: 19900, feeMonthlyCents: 29900 } });
    expect(await api.gdn(NaN, 1, 1)).toEqual({ ok: false, reason: 'no date' });
    expect(await api.gdn(T0, 1.5, 1)).toEqual({ ok: false, reason: 'bad fee' });
    expect(await api.gdn(T0, 1, -1)).toEqual({ ok: false, reason: 'bad fee' });
    expect(f).toHaveBeenCalledTimes(1);
    expect(await lane({}).api.gdn(T0, 0, 0)).toEqual({ ok: false, reason: NOT_YET });
  });
  it('GET /admin/exposure reads the platform row (camel or snake), the watchers and the packs; absent stays absent', async () => {
    const { api } = lane({ 'GET /admin/exposure': ok({ deposits: { heldCount: 1 }, platform: { gdnIssuedAt: T0, feePerCarCents: 100, feeMonthlyCents: 0 },
      watchers: [{ lotId: 'a', watching: 3 }, { lotId: 'b', watchers: 1 }], evidencePacks: [{ lotId: 'a', buyer: 'b_1', sha256: 'ff', uploaded_at: T0, at: T0 }],
      dealers: [{ gdn: 'P1', name: 'One', whop_account: 'biz_1', whop_account_verified_at: T0 }] }) });
    const r = await api.exposure();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.platform).toEqual({ gdnIssuedAt: T0, feePerCarCents: 100, feeMonthlyCents: 0 });
    expect(r.value.watchers).toEqual([{ lotId: 'a', dealer: undefined, watching: 3 }, { lotId: 'b', dealer: undefined, watching: 1 }]);
    expect(r.value.evidencePacks![0]).toMatchObject({ lotId: 'a', sha256: 'ff', uploadedAt: T0, uploadError: null });
    expect(r.value.deposits).toMatchObject({ heldCount: 1, reserveRatio: null });
    const old = readExposure({ deposits: { heldCount: 0, heldUsd: 0, byStatus: {}, reserveRatio: 1 }, lots: { open: 0, atLender: 0, floorBelowPayoff: 0 }, sales: [], incidentsByDealer: {}, dealers: [], obaviaFeesOwed: 0 });
    expect('platform' in old).toBe(false);
    expect(old.watchers).toBeUndefined();
    expect(readExposure({ platform: null }).platform).toBe(null);
    expect(readPlatform({ gdn_issued_at: null, fee_per_car_cents: null, fee_monthly_cents: null })).toEqual({ gdnIssuedAt: null, feePerCarCents: null, feeMonthlyCents: null });
  });
  it('GET /admin/money reads the invoices (cents or dollars, kinds outside balance and fee dropped) and the packs', () => {
    const m = readMoney({ invoices: [{ id: 'i1', lotId: 'a', kind: 'balance', whopId: 'inv_1', state: 'open', amountCents: 540000, at: 2 }, { id: 'i2', lotId: 'a', kind: 'fee', state: 'paid', amountUsd: 199, at: 3 }, { id: 'i3', kind: 'tip', amountUsd: 1, at: 4 }],
      disputes: [{ lot: 'a', buyer: 'b_1', dispute_id: 'dp_1', sha256: 'ab', upload_error: 'no key', created_at: 1 }] });
    expect(m.invoices.map(i => [i.id, i.kind, i.amountUsd])).toEqual([['i2', 'fee', 199], ['i1', 'balance', 5400]]);
    expect(m.evidencePacks).toEqual([{ lotId: 'a', buyer: 'b_1', disputeId: 'dp_1', sha256: 'ab', uploadedAt: null, uploadError: 'no key', at: 1 }]);
  });
});

describe('Home: the three rows beside deposits held (phases.md:61)', () => {
  const now = w3 + 2 * D;
  const bidder = (lotId: string, closedAt: number, sold: boolean, hammer?: number | null, floor?: number | null) => ({ lotId, dealer: 'P1', closedAt, sold, bidders: 2, hammer, floor });
  it('watchers per open lot: the exposure rows first, the lane list when the Worker does not send them, shown rounded down', () => {
    const lanes = [lot({ id: 'a', watching: 5 }), lot({ id: 'b', watching: 2 }), lot({ id: 'c', watching: 40, closed: { at: 1, sold: true } })];
    expect(threeRows(now, x3(), lanes)[0]).toEqual({ k: 'W', label: 'Watchers per lot', value: 3.5, shown: '3.5', from: '2 open now' });
    expect(threeRows(now, x3({ watchers: [{ lotId: 'a', watching: 8 }, { lotId: 'b', watching: 3 }, { lotId: 'c', watching: 0 }] }), lanes)[0]).toMatchObject({ value: 11 / 3, shown: '3.6', from: '3 open now' });
    expect(threeRows(now, null, null)[0]).toMatchObject({ value: null, shown: 'Not yet', from: 'The lane did not answer' });
    expect(threeRows(now, x3({ watchers: [] }), lanes)[0]).toMatchObject({ value: null, from: 'No lot open' });
  });
  it('hammer over floor: the lots sold this week with a floor, two places rounded down (CF1), null without the floor', () => {
    const x = x3({ bidders: [bidder('a', w3 + H, true, 5400, 5000), bidder('b', w3 + 2 * H, true, 4000, 3900), bidder('c', w3 + 3 * H, false, null, 3000), bidder('old', w3 - D, true, 9000, 3000)] });
    const h = threeRows(now, x, null)[1];
    expect(h.value).toBeCloseTo((1.08 + 4000 / 3900) / 2);
    expect(h).toMatchObject({ k: 'H', label: 'Hammer over floor', shown: '1.05', from: '2 sold this week' });
    expect(threeRows(now, x3({ bidders: [bidder('a', w3 + H, true)] }), null)[1]).toMatchObject({ value: null, shown: 'Not yet', from: 'The lane does not send the floor yet' });
    expect(threeRows(now, x3({ bidders: [bidder('old', w3 - D, true, 1, 1)] }), null)[1]).toMatchObject({ value: null, from: 'No lot sold this week' });
    expect(threeRows(now, x3(), null)[1].from).toBe('The lane does not send the floor yet');
    expect(threeRows(now, null, null)[1].from).toBe('The exposure did not answer');
  });
  it('days to pickup: startedAt less wonAt over every started sale, one place rounded up (a wait shown is never shorter than it was)', () => {
    const sale = (lotId: string, wonAt: number | null, startedAt: number | null, state: 'started' | 'paid' = 'started') => ({ lotId, state, hammer: 1, deadlineAt: 0, wonAt, startedAt });
    const x = x3({ sales: [sale('a', T0, T0 + 2 * D + 1), sale('b', T0, T0 + 3 * D), sale('c', T0, null), sale('d', T0, T0 + 9 * D, 'paid')] });
    const p = threeRows(now, x, null)[2];
    expect(p.value).toBeCloseTo(2.5 + 1 / (2 * D));
    expect(p).toMatchObject({ k: 'P', label: 'Days to pickup', shown: '2.6', from: '2 picked up, all weeks' });
    expect(threeRows(now, x3({ sales: [sale('a', T0, T0 + 2 * D)] }), null)[2].shown).toBe('2');
    expect(threeRows(now, x3({ sales: [sale('a', null, null)] }), null)[2]).toMatchObject({ value: null, from: 'The lane does not send wonAt yet' });
    expect(threeRows(now, x3(), null)[2]).toMatchObject({ value: null, from: 'No car picked up yet' });
    expect(threeRows(now, null, null)[2].from).toBe('The exposure did not answer');
  });
  it('every label is four words or fewer', () => {
    for (const r of threeRows(now, null, null)) expect(r.label.split(/\s+/).length).toBeLessThanOrEqual(4);
  });
});

describe('the GDN row, the fees line, the verified state, the invoices, the disputes', () => {
  it('the GDN row: Not read without the field, Not issued while the row is null, the date once set; fees say none until then', () => {
    expect(gdnRow(null)).toEqual({ read: false, issued: false, line: 'Not read', feesLine: 'None until the GDN issues' });
    expect(gdnRow(x3())).toMatchObject({ read: false, line: 'Not read' });
    expect(gdnRow(x3({ platform: null }))).toEqual({ read: true, issued: false, line: 'Not issued', feesLine: 'None until the GDN issues' });
    expect(gdnRow(x3({ platform: { gdnIssuedAt: null, feePerCarCents: null, feeMonthlyCents: null } }))).toMatchObject({ read: true, issued: false, line: 'Not issued' });
    expect(gdnRow(x3({ platform: { gdnIssuedAt: Date.parse('2026-11-02T18:00:00Z'), feePerCarCents: 100, feeMonthlyCents: 0 } }))).toEqual({ read: true, issued: true, line: 'Issued Nov 2, 2026', feesLine: 'Since Nov 2, 2026' });
  });
  it('the dealer row: Not read, Verified, Not verified, No account', () => {
    const row = { gdn: 'P1', name: 'One', created_at: 0, suspended_at: null, suspended: false, incidents: 0 };
    expect(verifiedWord(row)).toBe('Not read');
    expect(verifiedWord({ ...row, whop_account: 'biz_1', whop_account_verified_at: T0 })).toBe('Verified');
    expect(verifiedWord({ ...row, whop_account: 'biz_1', whop_account_verified_at: null })).toBe('Not verified');
    expect(verifiedWord({ ...row, whop_account: null, whop_account_verified_at: null })).toBe('No account');
  });
  it('invoices by state: open first, then paid, then the rest; each row keeps its kind', () => {
    const m = readMoney({ invoices: [{ id: 'a', kind: 'fee', state: 'paid', amountUsd: 199, at: 1 }, { id: 'b', kind: 'balance', state: 'void', amountUsd: 1, at: 2 }, { id: 'c', kind: 'balance', state: 'open', amountUsd: 5400, at: 3 }, { id: 'd', kind: 'balance', state: 'open', amountUsd: 100, at: 4 }] });
    const g = invoicesByState(m);
    expect(g.map(x => [x.state, x.word, x.rows.map(r => r.id)])).toEqual([['open', 'Open', ['d', 'c']], ['paid', 'Paid', ['a']], ['void', 'Voided', ['b']]]);
    expect(invoicesByState(null)).toEqual([]);
  });
  it('the disputes rows: the sha256 and one word for the upload, newest first; the exposure packs stand in when the money list has none', () => {
    const packs = [{ lotId: 'a', buyer: 'b_1', disputeId: 'dp', sha256: 'aa', uploadedAt: T0, uploadError: null, at: 1 }, { lotId: 'b', buyer: null, disputeId: null, sha256: 'bb', uploadedAt: null, uploadError: 'no key', at: 2 }, { lotId: 'c', buyer: null, disputeId: null, sha256: null, uploadedAt: null, uploadError: null, at: 3 }];
    expect(disputeRows(null, { events: [], payouts: [], sales: [], invoices: [], evidencePacks: packs }).map(r => [r.lotId, r.upload])).toEqual([['c', 'Not sent'], ['b', 'Refused'], ['a', 'Sent']]);
    expect(disputeRows(x3({ evidencePacks: [packs[0]] }), null)).toEqual([{ lotId: 'a', buyer: 'b_1', sha256: 'aa', upload: 'Sent', at: 1 }]);
    expect(disputeRows(null, { events: [], payouts: [], sales: [], invoices: [], evidencePacks: [{ ...packs[1], uploadError: 'whop_unavailable' }] })[0].upload).toBe('Not sent');
    expect(invoicesByState({ events: [], payouts: [], sales: [], invoices: [{ id: 'e', lotId: 'l', kind: 'balance', state: 'paid_at_lot', amountUsd: 10 } as never, { id: 'f', lotId: 'l', kind: 'fee', state: 'held', amountUsd: 199 } as never], evidencePacks: [] }).map(g => g.word)).toEqual(['Paid at the lot', 'Not yet invoiced']);
    expect(disputeRows(null, null)).toEqual([]);
  });
  it('every log word is four words or fewer, every kind the Worker joins has one', () => {
    const rows = [
      { kind: 'bid', buyer: 'b', at: 1 }, { kind: 'bid', buyer: 'b', placed: false, at: 1 }, { kind: 'bid_refusals', reason: 'too_many_bids', at: 1 }, { kind: 'pickup_refusals', reason: 'vin_required', at: 1 },
      { kind: 'signatures', document: 'Bill of sale', at: 1 }, { kind: 'plates', state: 'kickback', note: 'VIN wrong', at: 1 }, { kind: 'dealer_payouts', state: 'paid', method: 'check', at: 1 },
      { kind: 'incidents', reason: 'non_delivery', at: 1 }, { kind: 'evidence_packs', sha256: 'x', error: 'refused', at: 1 }, { kind: 'money_events', type: 'admin.gdn', at: 1 }, { type: 'sale.offer', at: 1 }, { kind: 'closed', sold: false, at: 1 }, { at: 1 },
    ];
    const words = rows.map(r => logRow(r).word);
    expect(words).toEqual(['Bid', 'Bid too low', 'Twenty-one bids a minute', 'VIN not read', 'Signed', 'Plates kicked back', 'Paid by hand', 'Not delivered', 'Evidence pack', 'GDN issued', 'Second chance', 'Closed, not sold', 'Event']);
    for (const w of words) expect(w.split(/\s+/).length).toBeLessThanOrEqual(4);
    expect(logRow(rows[8]).line).toBe('sha x · refused');
    expect(logRow(rows[5]).line).toBe('VIN wrong');
  });
  it('the Wave 3 money events have their words', () => {
    expect(typeWord({ type: 'admin.gdn', kind: null })).toBe('GDN issued');
    expect(typeWord({ type: 'invoice.paid', kind: null })).toBe('Invoice paid');
    expect(typeWord({ type: 'invoice.voided', kind: null })).toBe('Invoice');
    expect(typeWord({ type: 'fee.waived', kind: null })).toBe('Fee');
  });
});
