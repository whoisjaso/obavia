import { describe, expect, it, vi } from 'vitest';
import { NOT_YET, adminApi, bottleneck, readMoney, reconLine, refusals, scorecard, typeWord, weekOf, WEEK1, type AdminExposure, type Money, type Reconciliation } from './admin-api';
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
  it('reads L and S from the lane, D from money events, T from the exposure; B is Not yet', () => {
    const now = w3 + 2 * D;
    const lane = [lot({ id: 'a', opensAt: w3 + H, closed: { at: w3 + D, sold: true } }), lot({ id: 'b', opensAt: w3 + 2 * H, closed: { at: w3 + D, sold: false } }), lot({ id: 'c', opensAt: w3 - D })];
    const money: Money = { payouts: [], sales: [], events: [
      { id: '1', type: 'payment.succeeded', kind: 'deposit', amountUsd: 250, lotId: null, buyer: 'b1', at: w3 + H },
      { id: '2', type: 'payment.succeeded', kind: 'deposit', amountUsd: 250, lotId: null, buyer: 'b2', at: w3 - D },
      { id: '3', type: 'payment.succeeded', kind: 'balance', amountUsd: 5000, lotId: 'a', buyer: 'b1', at: w3 + H },
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
  it('names money events in plain words', () => {
    expect(typeWord({ type: 'payment.succeeded', kind: 'deposit' })).toBe('Deposit in');
    expect(typeWord({ type: 'refund.created', kind: null })).toBe('Refunded');
    expect(typeWord({ type: 'dispute.created', kind: null })).toBe('Disputed');
  });
});
