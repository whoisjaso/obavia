import { describe, expect, it, vi } from 'vitest';
import { NOT_YET, adminApi, bottleneck, diffWord, disputedDeposits, pickupRefusals, readMoney, readStreak, reconLine, refusals, reserveLine, scorecard, streakRow, typeWord, weekOf, WEEK1, type AdminExposure, type Money, type MoneyEvent, type Reconciliation, type Streak } from './admin-api';
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
    expect(readMoney(null)).toEqual({ events: [], payouts: [], sales: [] });
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
    expect(r.counts[0]).toEqual({ label: 'A Desk key tried to bid', n: 5 });
    expect(r.recent).toHaveLength(10);
    expect(r.recent[0]).toMatchObject({ label: 'Sign-in with an old token', at: 107 });
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
