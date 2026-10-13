/* The Worker's routes added in Wave 1-B: the forfeit forwarded, the Desk's socket, the money ledger on every capture and
   release, the reserve ratio as read, the admin's money routes, the Desk's push token, the retry of owed payouts, one
   proved phone per buyer, and owed payouts as liabilities. Every rule here is in src/index.ts or src/reconcile.ts. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import worker from '../src/index';
import { reconcile, reserveRatio } from '../src/reconcile';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Routes Test Motors', city: 'Houston', street: '300 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });

const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const get = (path: string, headers: Record<string, string> = {}) => SELF.fetch(`${base}${path}`, { headers });
/** The Worker with another environment (Whop or Telnyx configured), the same D1, objects and R2. */
const withEnv = (extra: Partial<WorkerEnv>) => ({ ...env, ...extra }) as WorkerEnv;
const call = (e: WorkerEnv, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  worker.fetch(new Request(`${base}${path}`, { method: init.method ?? 'POST', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) }), e);
const WHOP = withEnv({ WHOP_API_KEY: 'test-whop-key', WHOP_API_BASE: 'https://whop.test/api/v1', WHOP_ACCOUNT_ID: 'biz_obavia' });

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}` });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function signIn(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Routes Buyer', state: 'TX' });
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const token = await signIn(id);
  expect((await post('/me/phone', as(token), { phone: PHONE })).status).toBe(200);
  expect((await post('/me/phone/verify', as(token), { code: '000000' })).status).toBe(200);
  expect((await post('/me/deposit', as(token))).status).toBe(200);
  return token;
}
async function edit(id: string, f: (lot: any) => void) {
  await runInDurableObject(stub(id), async (inst: any, state) => {
    const lot = await state.storage.get<any>('lot'); f(lot);
    await state.storage.put('lot', lot); inst.lot = lot;
  });
}
async function hammer(id: string) {
  await edit(id, l => { l.closesAt = Date.now() - 1; });
  await runInDurableObject(stub(id), (_i, state) => state.storage.setAlarm(Date.now()));
  await runDurableObjectAlarm(stub(id)); await settle();
}
const openLot = (id: string, dealerToken: string, gdn: string) =>
  post(`/lots/${id}/open`, as(dealerToken), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: car(gdn) });
const bid = (id: string, t: string, amount: number, max = amount) => post(`/lots/${id}/bids`, as(t), { amount, max, key: crypto.randomUUID(), terms: TERMS });
/** Open, one bid, the hammer: a sale owed by `buyerId`. */
async function sold(id: string, dealerToken: string, gdn: string, buyerId: string) {
  expect((await openLot(id, dealerToken, gdn)).status).toBe(200);
  const t = await buyer(buyerId);
  expect((await bid(id, t, 5000)).status).toBe(200);
  await hammer(id);
  const lot = await (await get(`/lots/${id}`)).json<any>();
  expect(lot.sale?.buyer).toBe(buyerId);
  return t;
}
const depositOf = async (id: string) => (await env.DB.prepare('SELECT deposit_status FROM buyers WHERE id = ?1').bind(id).first<{ deposit_status: string }>())?.deposit_status;
const events = async (type: string, buyerId?: string) => (await env.DB.prepare(`SELECT id, type, body FROM money_events WHERE type = ?1 ${buyerId ? "AND json_extract(body, '$.buyer') = ?2" : ''} ORDER BY received_at`).bind(...(buyerId ? [type, buyerId] : [type])).all<{ id: string; type: string; body: string }>()).results;
const eventById = (id: string) => env.DB.prepare('SELECT type, body FROM money_events WHERE id = ?1').bind(id).first<{ type: string; body: string }>();

/** A signed Whop webhook (Standard Webhooks, the test secret). */
async function webhook(body: unknown, id = `msg_${crypto.randomUUID()}`) {
  const raw = JSON.stringify(body), ts = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('test-whop-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${raw}`)));
  return SELF.fetch(`${base}/webhooks/whop`, { method: 'POST', headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${btoa(String.fromCharCode(...mac))}`, 'content-type': 'application/json' }, body: raw });
}

/* Every outbound fetch: Expo, Whop and Telnyx are answered here and recorded; nothing reaches them for real. */
type Call = { url: string; method: string; headers: Record<string, string>; body: any };
let calls: Call[] = [];
let whopAnswer: (url: string, method: string, body: any) => Response = () => Response.json({ id: 'tr_test' });
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls = []; whopAnswer = () => Response.json({ id: 'tr_test' });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    const known = ['https://exp.host/', 'https://whop.test/', 'https://api.telnyx.com/'].some(p => url.startsWith(p));
    if (!known) return realFetch(input as RequestInfo, init);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method, headers: Object.fromEntries(new Headers(init?.headers).entries()), body });
    if (url.startsWith('https://exp.host/')) return Response.json({ data: { status: 'ok' } });
    if (url.startsWith('https://api.telnyx.com/')) return Response.json(url.endsWith('/verifications/sms') ? { data: { id: 'v1' } } : { data: { response_code: 'accepted' } });
    return whopAnswer(url, method, body);
  });
});
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });
const pushesTo = (to: string) => calls.filter(c => c.url.startsWith('https://exp.host/') && c.body?.to === to).map(c => `${c.body.title} · ${c.body.body}`);
const whopCalls = () => calls.filter(c => c.url.startsWith('https://whop.test/'));

describe('1. POST /lots/:id/forfeit, forwarded to the object', () => {
  it('the dealer at or after the deadline, never before and never another dealer; the admin any time; no key is refused', async () => {
    const own = await dealer('P800001'), other = await dealer('P800002');
    await sold('fw1', own, 'P800001', 'rt-fw1');
    expect((await post('/lots/fw1/forfeit', { 'content-type': 'application/json' }, { reason: 'x' })).status).toBe(403);
    const early = await post('/lots/fw1/forfeit', as(own), { reason: 'no show' });
    expect(early.status).toBe(409); expect(await early.text()).toBe('before_deadline');
    const theirs = await post('/lots/fw1/forfeit', as(other), { reason: 'no show' });
    expect(theirs.status).toBe(403); expect(await theirs.text()).toBe('not_your_lot');
    await edit('fw1', l => { l.sale.deadlineAt = Date.now() - 1; });
    const ok = await post('/lots/fw1/forfeit', as(own), { reason: 'no show' });
    expect(ok.status).toBe(200);
    const lot = await ok.json<any>();
    expect(lot.sale.forfeitedAt).toBeGreaterThan(0); expect(lot.sale.deposit).toBe('to_dealer');
    expect(await depositOf('rt-fw1')).toBe('forfeited');
    await sold('fw2', own, 'P800001', 'rt-fw2');
    expect((await post('/lots/fw2/forfeit', ADMIN, { reason: 'admin' })).status).toBe(200);   // the admin key on the dealer route, before the deadline
  });
});

describe('2. GET /lots/:id/live for the Desk', () => {
  const live = (id: string, token: string) => SELF.fetch(`${base}/lots/${id}/live?token=${encodeURIComponent(token)}`, { headers: { upgrade: 'websocket' } });
  const first = (ws: WebSocket) => new Promise<any>(res => ws.addEventListener('message', e => res(JSON.parse(String(e.data))), { once: true }));
  it('the lot\'s dealer key and the admin key open the socket and get the lot, then every bid; another dealer does not; a buyer still does', async () => {
    const own = await dealer('P800011'), other = await dealer('P800012');
    expect((await openLot('lv1', own, 'P800011')).status).toBe(200);
    await settle();   // the copy says whose lot it is
    const r = await live('lv1', own);
    expect(r.status).toBe(101);
    const ws = r.webSocket!; const hello = first(ws); ws.accept();
    expect((await hello).lot.id).toBe('lv1');
    const next = first(ws);
    const t = await buyer('rt-lv1');
    expect((await bid('lv1', t, 5000)).status).toBe(200);
    const moved = await next;
    expect(moved.lot.high).toBe(5000); expect(moved.lot.dealer).toBeUndefined(); expect(moved.lot.max).toBeUndefined();
    ws.close();
    const admin = await live('lv1', 'test-dealer-secret');
    expect(admin.status).toBe(101); admin.webSocket!.accept(); admin.webSocket!.close();
    const theirs = await live('lv1', other);
    expect(theirs.status).toBe(403); expect(await theirs.text()).toBe('not_your_lot');
    const asBuyer = await live('lv1', t);
    expect(asBuyer.status).toBe(101); asBuyer.webSocket!.accept(); asBuyer.webSocket!.close();
    expect((await SELF.fetch(`${base}/lots/lv1/live`, { headers: { upgrade: 'websocket' } })).status).toBe(401);
  });
});

describe('3. the ledger on every capture and release', () => {
  it('the verify path writes deposit.captured once per payment; the webhook for the same payment adds nothing; a payment captures once, ever', async () => {
    const t = await signIn('rt-cap1');
    whopAnswer = (url, method) => method === 'GET' && url.endsWith('/payments/pay_v1')
      ? Response.json({ id: 'pay_v1', status: 'paid', usd_total: 250, currency: 'usd', metadata: { kind: 'deposit', buyer: 'rt-cap1' } })
      : Response.json({ id: 'rf_1' });
    const r = await call(WHOP, '/me/deposit', { headers: { authorization: `Bearer ${t}` }, body: { paymentId: 'pay_v1' } });
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ deposit: 'captured' });
    const ev = await eventById('capture:pay_v1');
    expect(ev?.type).toBe('deposit.captured'); expect(JSON.parse(ev!.body)).toMatchObject({ buyer: 'rt-cap1', amount: 250, ref: 'pay_v1', via: 'verify' });
    expect((await webhook({ type: 'payment.succeeded', data: { id: 'pay_v1', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'rt-cap1' } } })).status).toBe(200);
    expect(await events('deposit.captured', 'rt-cap1')).toHaveLength(1);
    // the buyer's release: the ledger row (refund:pay_v1), the refund on Whop, the state
    const rel = await call(WHOP, '/me/deposit/release', { headers: { authorization: `Bearer ${t}` } });
    expect(rel.status).toBe(200);
    expect(whopCalls().some(c => c.method === 'POST' && c.url === 'https://whop.test/api/v1/payments/pay_v1/refund')).toBe(true);
    expect((await eventById('refund:pay_v1'))?.type).toBe('deposit.released');
    expect(await depositOf('rt-cap1')).toBe('refunded');
    // Whop's refund webhook for it changes nothing more; the old payment cannot capture again, by either path
    expect((await webhook({ type: 'refund.created', data: { id: 'rf_1', payment_id: 'pay_v1', status: 'succeeded' } })).status).toBe(200);
    expect(await events('deposit.released', 'rt-cap1')).toHaveLength(1);
    const again = await call(WHOP, '/me/deposit', { headers: { authorization: `Bearer ${t}` }, body: { paymentId: 'pay_v1' } });
    expect(again.status).toBe(409); expect(await again.json()).toEqual({ error: 'payment_used' });
    await webhook({ type: 'payment.succeeded', data: { id: 'pay_v1', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'rt-cap1' } } });
    expect(await depositOf('rt-cap1')).toBe('refunded');
  });

  it('the webhook path writes deposit.captured; refunds are matched by the payment id, never by metadata', async () => {
    await signIn('rt-cap2'); await signIn('rt-cap3');
    await webhook({ type: 'payment.succeeded', data: { id: 'pay_w2', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'rt-cap2' } } });
    await webhook({ type: 'payment.succeeded', data: { id: 'pay_w3', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'rt-cap3' } } });
    expect(JSON.parse((await eventById('capture:pay_w2'))!.body)).toMatchObject({ buyer: 'rt-cap2', via: 'webhook', actor: 'whop' });
    expect(await depositOf('rt-cap2')).toBe('captured');
    // a refund naming rt-cap3 in its metadata but paying back rt-cap2's payment releases rt-cap2 only
    await webhook({ type: 'refund.created', data: { id: 'rf_2', payment_id: 'pay_w2', status: 'pending', metadata: { kind: 'deposit', buyer: 'rt-cap3' } } });
    expect(await depositOf('rt-cap2')).toBe('refunded'); expect(await depositOf('rt-cap3')).toBe('captured');
    expect(JSON.parse((await eventById('refund:pay_w2'))!.body)).toMatchObject({ buyer: 'rt-cap2', via: 'webhook' });
    // a refund for a payment that is no deposit moves nothing; a failed refund moves nothing
    await webhook({ type: 'refund.created', data: { id: 'rf_3', payment_id: 'pay_other', metadata: { kind: 'deposit', buyer: 'rt-cap3' } } });
    await webhook({ type: 'refund.updated', data: { id: 'rf_4', payment: { id: 'pay_w3' }, status: 'failed' } });
    expect(await depositOf('rt-cap3')).toBe('captured');
  });

  it('release refuses an applied and a forfeited deposit; a refund webhook on one keeps the state and says so', async () => {
    const own = await dealer('P800021');
    await sold('ap1', own, 'P800021', 'rt-ap1');
    expect((await post('/lots/ap1/paid', as(own))).status).toBe(200);
    expect((await post('/lots/ap1/pickup', as(own), { vin: '000001' })).status).toBe(200);
    expect(await depositOf('rt-ap1')).toBe('applied');
    const t = await signIn('rt-ap1');
    const mine = await post('/me/deposit/release', as(t));
    expect(mine.status).toBe(409); expect(await mine.text()).toBe('nothing held');
    const byAdmin = await post('/admin/buyers/rt-ap1/release', ADMIN, { reason: 'asked' });
    expect(byAdmin.status).toBe(409); expect(await byAdmin.json()).toEqual({ error: 'deposit_applied' });
    await sold('ff1', own, 'P800021', 'rt-ff1');
    expect((await post('/admin/lots/ff1/forfeit', ADMIN, { reason: 'no pay' })).status).toBe(200);
    const ff = await post('/admin/buyers/rt-ff1/release', ADMIN, { reason: 'asked' });
    expect(ff.status).toBe(409); expect(await ff.json()).toEqual({ error: 'deposit_forfeited' });
    // the refund webhook on the applied deposit: the status stays applied, the conflict is in the ledger
    await env.DB.prepare('UPDATE buyers SET deposit_ref = ?2 WHERE id = ?1').bind('rt-ap1', 'pay_ap1').run();
    await webhook({ type: 'refund.created', data: { id: 'rf_ap1', payment_id: 'pay_ap1', status: 'succeeded' } });
    expect(await depositOf('rt-ap1')).toBe('applied');
    expect(JSON.parse((await eventById('refund_conflict:pay_ap1'))!.body)).toMatchObject({ buyer: 'rt-ap1', status: 'applied' });
  });

  it('payment.failed and dispute.created are kept by type; a dispute takes the deposit out of captured', async () => {
    const t = await signIn('rt-dsp');
    await webhook({ type: 'payment.succeeded', data: { id: 'pay_dsp', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'rt-dsp' } } });
    await webhook({ type: 'payment.failed', data: { id: 'pay_fail', status: 'open', metadata: { kind: 'deposit', buyer: 'rt-dsp' } } }, 'msg_failed_1');
    expect((await env.DB.prepare('SELECT type FROM money_events WHERE id = ?1').bind('msg_failed_1').first())).toEqual({ type: 'payment.failed' });
    await webhook({ type: 'dispute.created', data: { id: 'dp_1', payment_id: 'pay_dsp', amount: 250 } }, 'msg_dispute_1');
    expect((await env.DB.prepare('SELECT type FROM money_events WHERE id = ?1').bind('msg_dispute_1').first())).toEqual({ type: 'dispute.created' });
    expect(await depositOf('rt-dsp')).toBe('disputed');
    expect((await eventById('dispute:pay_dsp'))?.type).toBe('deposit.disputed');
    expect((await post('/me/deposit/release', as(t))).status).toBe(409);
    // the admin's money list reads them as Whop said them
    const money = await (await get('/admin/money', ADMIN)).json<any>();
    expect(money.events.find((e: any) => e.id === 'msg_failed_1')).toMatchObject({ type: 'payment.failed', kind: 'deposit', buyer: 'rt-dsp', actor: 'whop' });
    expect(money.events.find((e: any) => e.id === 'msg_dispute_1')).toMatchObject({ type: 'dispute.created', amountUsd: 250 });
  });

  it('a refund Whop refuses is 502 refund_failed: no ledger row, the deposit still held', async () => {
    const t = await signIn('rt-rf');
    await webhook({ type: 'payment.succeeded', data: { id: 'pay_rf', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'rt-rf' } } });
    whopAnswer = () => new Response('no', { status: 500 });
    const r = await call(WHOP, '/me/deposit/release', { headers: { authorization: `Bearer ${t}` } });
    expect(r.status).toBe(502); expect(await r.json()).toEqual({ error: 'refund_failed' });
    expect(await eventById('refund:pay_rf')).toBeNull();
    expect(await depositOf('rt-rf')).toBe('captured');
  });
});

describe('4. /admin/exposure: the reserve ratio as read, payouts, pickup refusals, applied, bidders', () => {
  it('reserveRatio: null with no balance read; the balance over deposits held plus payouts owed, rounded down; 1 with nothing owed', () => {
    expect(reserveRatio(undefined)).toBeNull();
    expect(reserveRatio({ whop_balance_cents: null, deposits_held: 3 })).toBeNull();
    expect(reserveRatio({ whop_balance_cents: 0, deposits_held: 0, payouts_owed_cents: 0 })).toBe(1);
    expect(reserveRatio({ whop_balance_cents: 75_000, deposits_held: 2, payouts_owed_cents: 25_000 })).toBe(1);
    expect(reserveRatio({ whop_balance_cents: 74_700, deposits_held: 2, payouts_owed_cents: 25_000 })).toBe(0.99);   // 0.996: never shown as 1.00
    expect(reserveRatio({ whop_balance_cents: 100_000, deposits_held: 2, payouts_owed_cents: 0 })).toBe(2);
  });

  it('the exposure reads the last reconciliation, sums payouts by dealer, lists pickup refusals, counts applied, and counts bidders per closed lot', async () => {
    const own = await dealer('P800031');
    // pickup refused, then applied: the payout owed and the applied count
    await sold('ex1', own, 'P800031', 'rt-ex1');
    expect((await post('/lots/ex1/pickup', as(own), { vin: '000001' })).status).toBe(409);   // not paid
    expect((await post('/lots/ex1/paid', as(own))).status).toBe(200);
    expect((await post('/lots/ex1/pickup', as(own), { vin: '1N4AL3AP0EC000001' })).status).toBe(200);
    // three buyers on one lot: two bids placed, one too low; the lot closes
    expect((await openLot('ex2', own, 'P800031')).status).toBe(200);
    const [b1, b2, b3] = [await buyer('rt-ex2a'), await buyer('rt-ex2b'), await buyer('rt-ex2c')];
    expect((await bid('ex2', b1, 5000)).status).toBe(200);
    expect((await (await bid('ex2', b2, 5500, 5500)).json<any>()).ok).toBe(true);
    expect((await (await bid('ex2', b3, 4000)).json<any>()).reason).toBe('low');
    await hammer('ex2');
    const before = await (await get('/admin/exposure', ADMIN)).json<any>();
    const lastBefore = before.reconciliations[0];
    expect(before.deposits.reserveRatio).toBe(reserveRatio(lastBefore));
    expect(before.deposits.byStatus.applied).toBeGreaterThanOrEqual(1);
    expect(before.deposits.byStatus).toHaveProperty('disputed');
    expect(before.payouts.byDealer.P800031).toEqual({ owedUsd: 250, sentUsd: 0, owed: 1, sent: 0 });
    expect(before.payouts.owedUsd).toBeGreaterThanOrEqual(250);
    expect(before.pickupRefusals[0]).toMatchObject({ lotId: 'ex1', dealer: 'P800031', reason: 'not_paid', presented: '000001' });
    expect(before.pickupRefusals.length).toBeLessThanOrEqual(20);
    expect(before.bidders.find((b: any) => b.lotId === 'ex2')).toMatchObject({ dealer: 'P800031', sold: true, bidders: 2 });
    expect(before.sales.find((s: any) => s.lotId === 'ex1')).toMatchObject({ state: 'started', deposit: 'applied', payout: 'owed' });
    // a reconciliation that read the balance: the ratio is the balance over deposits held plus payouts owed
    whopAnswer = url => url.includes('/ledger_accounts/') ? Response.json({ balances: [{ currency: 'usd', balance: 100_000, pending_balance: 0, reserve_balance: 0 }] }) : Response.json({});
    const row = await reconcile(WHOP);
    expect(row.whop_balance_cents).toBe(10_000_000);
    const x = await (await get('/admin/exposure', ADMIN)).json<any>();
    expect(x.reconciliations[0].id).toBe(row.id);
    expect(x.deposits.reserveRatio).toBe(Math.floor(10_000_000 / (row.deposits_held * 25_000 + row.payouts_owed_cents) * 100) / 100);
    expect(x.deposits.reserveReadAt).toBe(row.ran_at);
    expect((await get('/admin/exposure', as(own))).status).toBe(403);
  });
});

describe('5. the admin\'s money routes (desk/src/lib/admin-api.ts)', () => {
  it('GET /admin/money: events newest first with kind, amount, lot and buyer; payouts; sales with the buyer. Admin only', async () => {
    const own = await dealer('P800041');
    await sold('mo1', own, 'P800041', 'rt-mo1');
    expect((await post('/admin/lots/mo1/forfeit', ADMIN, { reason: 'did not pay' })).status).toBe(200);
    expect((await get('/admin/money', as(own))).status).toBe(403);
    const m = await (await get('/admin/money', ADMIN)).json<any>();
    expect(Object.keys(m).sort()).toEqual(['events', 'payouts', 'sales']);
    const ats = m.events.map((e: any) => e.at);
    expect(ats).toEqual([...ats].sort((a: number, b: number) => b - a));
    const cap = m.events.find((e: any) => e.type === 'deposit.captured' && e.buyer === 'rt-mo1');
    expect(cap).toMatchObject({ kind: 'deposit', amountUsd: 250, lotId: null, actor: 'buyer' });
    expect(m.events.find((e: any) => e.id === 'forfeit:mo1')).toMatchObject({ type: 'deposit.forfeited', kind: 'deposit', lotId: 'mo1', buyer: 'rt-mo1', amountUsd: 250 });
    expect(m.events.find((e: any) => e.id === 'admin:forfeit:mo1')).toMatchObject({ type: 'admin.forfeit', lotId: 'mo1', actor: 'admin', reason: 'did not pay' });
    expect(m.payouts.find((p: any) => p.id === 'forfeit:mo1')).toMatchObject({ lotId: 'mo1', dealer: 'P800041', amountUsd: 250, state: 'owed', paidAt: null, method: null, held: true });
    expect(m.sales.find((s: any) => s.lotId === 'mo1')).toMatchObject({ dealer: 'P800041', buyer: 'rt-mo1', buyerName: 'Routes Buyer', state: 'forfeited', hammer: 5000, deposit: 'to_dealer' });
    expect(JSON.stringify(m)).not.toContain('2145550142');   // no phone on the money page
  });

  it('POST /admin/payouts/:id/paid { method, note }: owed and held only; once; the ledger names the admin and the reason', async () => {
    const own = await dealer('P800042');
    await sold('pd1', own, 'P800042', 'rt-pd1');
    expect((await post('/admin/lots/pd1/forfeit', ADMIN, { reason: 'gone' })).status).toBe(200);
    const id = encodeURIComponent('forfeit:pd1');
    expect((await post(`/admin/payouts/${id}/paid`, as(own), { method: 'check', note: 'x' })).status).toBe(403);
    const bad = await post(`/admin/payouts/${id}/paid`, ADMIN, { method: 'venmo', note: '' });
    expect(bad.status).toBe(400); expect(await bad.json()).toEqual({ error: 'bad_method' });
    const ok = await post(`/admin/payouts/${id}/paid`, ADMIN, { method: 'check', note: 'Check 1042' });
    expect(ok.status).toBe(200);
    const p = await ok.json<any>();
    expect(p).toMatchObject({ id: 'forfeit:pd1', lotId: 'pd1', dealer: 'P800042', amountUsd: 250, state: 'paid', via: 'hand', method: 'check', note: 'Check 1042' });
    expect(p.paidAt).toBeGreaterThan(0);
    expect(JSON.parse((await eventById('payout:forfeit:pd1'))!.body)).toMatchObject({ actor: 'admin', reason: 'Check 1042', method: 'check', lotId: 'pd1', amount: 250 });
    const twice = await post(`/admin/payouts/${id}/paid`, ADMIN, { method: 'cash', note: '' });
    expect(twice.status).toBe(409); expect(await twice.json()).toEqual({ error: 'already_paid' });
    const none = await post(`/admin/payouts/${encodeURIComponent('forfeit:nope')}/paid`, ADMIN, { method: 'cash', note: '' });
    expect(none.status).toBe(404); expect(await none.json()).toEqual({ error: 'no_such_payout' });
    await env.DB.prepare("INSERT INTO dealer_payouts (id, lot_id, dealer, buyer, amount, reason, held, state, created_at) VALUES ('applied:pd9', 'pd9', 'P800042', 'rt-x', 250, 'applied', 0, 'owed', ?1)").bind(Date.now()).run();
    const unheld = await post(`/admin/payouts/${encodeURIComponent('applied:pd9')}/paid`, ADMIN, { method: 'wire', note: '' });
    expect(unheld.status).toBe(409); expect(await unheld.json()).toEqual({ error: 'not_held' });
  });

  it('POST /admin/buyers/:id/release { reason, lotId? }: needs a reason; refused while the deposit backs a bid; the ledger names the admin', async () => {
    const own = await dealer('P800043');
    const t = await buyer('rt-rl1');
    expect((await post('/admin/buyers/rt-rl1/release', ADMIN, {})).status).toBe(400);
    expect((await post('/admin/buyers/rt-rl1/release', as(own), { reason: 'x' })).status).toBe(403);
    expect((await openLot('rl1', own, 'P800043')).status).toBe(200);
    expect((await bid('rl1', t, 5000)).status).toBe(200); await settle();
    const leads = await post('/admin/buyers/rt-rl1/release', ADMIN, { reason: 'asked by phone' });
    expect(leads.status).toBe(409); expect(await leads.json()).toEqual({ error: 'leads_a_lot' });
    const t2 = await buyer('rt-rl2');
    const r = await post('/admin/buyers/rt-rl2/release', ADMIN, { reason: 'asked by phone', lotId: 'rl1' });
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ id: 'rt-rl2', deposit: 'refunded' });
    expect(await depositOf('rt-rl2')).toBe('refunded');
    const ev = (await events('deposit.released', 'rt-rl2'))[0];
    expect(JSON.parse(ev.body)).toMatchObject({ actor: 'admin', reason: 'asked by phone', lotId: 'rl1', via: 'admin' });
    const again = await post('/admin/buyers/rt-rl2/release', ADMIN, { reason: 'again' });
    expect(again.status).toBe(409); expect(await again.json()).toEqual({ error: 'nothing_held' });
    expect((await post('/admin/buyers/rt-none/release', ADMIN, { reason: 'x' })).status).toBe(404);
    void t2;
  });

  it('POST /admin/lots/:id/forfeit { reason }: needs a reason; the object decides; the ledger names the admin and the reason', async () => {
    const own = await dealer('P800044');
    await sold('af1', own, 'P800044', 'rt-af1');
    const no = await post('/admin/lots/af1/forfeit', ADMIN, { reason: '  ' });
    expect(no.status).toBe(400); expect(await no.json()).toEqual({ error: 'no_reason' });
    expect((await post('/admin/lots/af1/forfeit', as(own), { reason: 'x' })).status).toBe(403);
    const ok = await post('/admin/lots/af1/forfeit', ADMIN, { reason: 'Buyer said he will not pay' });
    expect(ok.status).toBe(200); expect((await ok.json<any>()).sale.deposit).toBe('to_dealer');
    expect(JSON.parse((await eventById('admin:forfeit:af1'))!.body)).toEqual({ lotId: 'af1', actor: 'admin', reason: 'Buyer said he will not pay' });
    expect((await env.DB.prepare('SELECT note FROM dealer_payouts WHERE id = ?1').bind('forfeit:af1').first())).toEqual({ note: 'Buyer said he will not pay' });
    const twice = await post('/admin/lots/af1/forfeit', ADMIN, { reason: 'again' });
    expect(twice.status).toBe(409); expect(await twice.json()).toEqual({ error: 'already_forfeited' });
    const nothing = await post('/admin/lots/af-none/forfeit', ADMIN, { reason: 'x' });
    expect(nothing.status).toBe(409); expect(await nothing.json()).toEqual({ error: 'no sale' });
  });
});

describe('6. POST /dealers/push', () => {
  it('the dealer\'s key registers the Desk\'s token; the forfeit push then reaches the dealer', async () => {
    const own = await dealer('P800051');
    expect((await post('/dealers/push', ADMIN, { token: 'ExponentPushToken[deskdesk01]' })).status).toBe(403);
    expect((await post('/dealers/push', as(own), { token: 'nope' })).status).toBe(400);
    expect((await post('/dealers/push', as(own), { token: 'ExponentPushToken[deskdesk01]' })).status).toBe(200);
    expect((await env.DB.prepare('SELECT push_token FROM dealers WHERE gdn = ?1').bind('P800051').first())).toEqual({ push_token: 'ExponentPushToken[deskdesk01]' });
    await sold('pu1', own, 'P800051', 'rt-pu1');
    expect((await post('/admin/lots/pu1/forfeit', ADMIN, { reason: 'no pay' })).status).toBe(200);
    await settle();
    expect(pushesTo('ExponentPushToken[deskdesk01]')).toEqual(['Deposit forfeited · 2014 Nissan Altima · $250 is yours']);
  });
});

describe('7. POST /dealers/account and the retry of owed payouts', () => {
  it('setting the connected account sends every payout left owed with its own key; a refusal stays owed with its error; an unheld row is never sent', async () => {
    const own = await dealer('P800061');
    await sold('ac1', own, 'P800061', 'rt-ac1');
    expect((await post('/admin/lots/ac1/forfeit', ADMIN, { reason: 'no pay' })).status).toBe(200);
    await env.DB.prepare("INSERT INTO dealer_payouts (id, lot_id, dealer, buyer, amount, reason, held, state, created_at) VALUES ('applied:ac9', 'ac9', 'P800061', 'rt-x', 250, 'applied', 0, 'owed', ?1)").bind(Date.now()).run();
    expect((await call(WHOP, '/dealers/account', { headers: { authorization: `Bearer ${own}` }, body: { gdn: 'P800061', account: 'biz_dealer61' } })).status).toBe(403);
    expect((await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P800061', account: 'acct 1' } })).status).toBe(400);
    whopAnswer = () => new Response('{"error":"not ready"}', { status: 422 });
    const refused = await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P800061', account: 'biz_dealer61' } });
    expect(await refused.json()).toEqual({ gdn: 'P800061', account: 'biz_dealer61', payouts: { sent: 0, owed: 1 } });
    const row = await env.DB.prepare('SELECT state, error FROM dealer_payouts WHERE id = ?1').bind('forfeit:ac1').first<any>();
    expect(row.state).toBe('owed'); expect(row.error).toContain('422'); expect(row.error).not.toContain('test-whop-key');
    whopAnswer = () => Response.json({ id: 'tr_ac1' });
    calls = [];
    const ok = await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P800061', account: 'biz_dealer61' } });
    expect(await ok.json()).toEqual({ gdn: 'P800061', account: 'biz_dealer61', payouts: { sent: 1, owed: 0 } });
    const t = whopCalls();
    expect(t).toHaveLength(1);
    expect(t[0].url).toBe('https://whop.test/api/v1/transfers');
    expect(t[0].headers['idempotency-key']).toBe('forfeit:ac1');
    expect(t[0].body).toMatchObject({ amount: 250, currency: 'usd', destination_id: 'biz_dealer61', idempotence_key: 'forfeit:ac1' });
    expect((await env.DB.prepare('SELECT state, transfer_id, error FROM dealer_payouts WHERE id = ?1').bind('forfeit:ac1').first())).toEqual({ state: 'sent', transfer_id: 'tr_ac1', error: null });
    expect(JSON.parse((await eventById('payout:forfeit:ac1'))!.body)).toMatchObject({ transferId: 'tr_ac1', via: 'retry', dealer: 'P800061' });
    expect((await env.DB.prepare('SELECT state FROM dealer_payouts WHERE id = ?1').bind('applied:ac9').first())).toEqual({ state: 'owed' });
    expect((await events('dealer.account')).some(e => JSON.parse(e.body).dealer === 'P800061')).toBe(true);
    // set again: nothing is owed, nothing is sent twice
    calls = [];
    expect(await (await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P800061', account: 'biz_dealer61' } })).json()).toMatchObject({ payouts: { sent: 0, owed: 0 } });
    expect(whopCalls()).toHaveLength(0);
  });
});

describe('8. one proved phone, one buyer', () => {
  const TELNYX = withEnv({ MESSAGING_PROVIDER: undefined, TELNYX_API_KEY: 'test-telnyx-key', TELNYX_VERIFY_PROFILE_ID: 'vp' });
  const prove = async (token: string, phone: string) => {
    expect((await call(TELNYX, '/me/phone', { headers: { authorization: `Bearer ${token}` }, body: { phone } })).status).toBe(200);
    return call(TELNYX, '/me/phone/verify', { headers: { authorization: `Bearer ${token}` }, body: { code: '123456' } });
  };
  it('a number proved by Telnyx for one buyer is 409 phone_in_use for another, after the code; the first keeps it; a fake proof is not held to it', async () => {
    const a = await signIn('rt-ph-a'), b = await signIn('rt-ph-b'), c = await signIn('rt-ph-c');
    const first = await prove(a, '+12145550177');
    expect(first.status).toBe(200); expect(await first.json()).toEqual({ verified: true, phone: '(•••) •••-0177' });
    const second = await prove(b, '+12145550177');
    expect(second.status).toBe(409); expect(await second.json()).toEqual({ error: 'phone_in_use' });
    expect((await env.DB.prepare('SELECT phone, phone_verified_at FROM buyers WHERE id = ?1').bind('rt-ph-b').first())).toEqual({ phone: null, phone_verified_at: null });
    expect((await env.DB.prepare('SELECT phone, phone_verified_via FROM buyers WHERE id = ?1').bind('rt-ph-a').first())).toEqual({ phone: '2145550177', phone_verified_via: 'telnyx' });
    await env.DB.prepare('UPDATE phone_codes SET sent_at = sent_at - 31000 WHERE buyer_id = ?1').bind('rt-ph-b').run();   // past the 30 s gap
    expect((await prove(b, '+12145550178')).status).toBe(200);   // another number proves b
    // the fake (tests, wrangler dev) is a test number and proves nothing for real: not held to one buyer
    expect((await post('/me/phone', as(c), { phone: '+12145550177' })).status).toBe(200);
    expect((await post('/me/phone/verify', as(c), { code: '000000' })).status).toBe(200);
    // nothing logged the number: no refusal table carries it
    expect(JSON.stringify((await env.DB.prepare('SELECT * FROM token_refusals').all()).results)).not.toContain('2145550177');
  });
});

describe('9. the reconciliation counts owed payouts as liabilities', () => {
  it('a balance that covers the deposits but not the payouts owed is not covered; the row keeps the owed count and cents', async () => {
    const held = (await env.DB.prepare("SELECT COUNT(*) AS n FROM buyers WHERE deposit_status = 'captured'").first<{ n: number }>())!.n;
    const owed = (await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS usd FROM dealer_payouts WHERE state = 'owed' AND held = 1").first<{ n: number; usd: number }>())!;
    expect(owed.n).toBeGreaterThan(0);
    const answer = (dollars: number) => { whopAnswer = url => url.includes('/ledger_accounts/') ? Response.json({ balances: [{ currency: 'usd', balance: dollars }] }) : Response.json({}); };
    answer(held * 250);   // the deposits only
    const short = await reconcile(WHOP);
    expect(short.payouts_owed).toBe(owed.n); expect(short.payouts_owed_cents).toBe(owed.usd * 100);
    expect(short.equal).toBe(0); expect(short.note).toContain('reserve ratio under 1');
    expect(reserveRatio(short)).toBeLessThan(1);
    answer(held * 250 + owed.usd);   // both
    const covered = await reconcile(WHOP);
    expect(covered.note).not.toContain('reserve ratio under 1');
    expect(reserveRatio(covered)).toBe(1);
    const x = await (await get('/admin/exposure', ADMIN)).json<any>();
    expect(x.reconciliations[0]).toMatchObject({ id: covered.id, payouts_owed: owed.n, payouts_owed_cents: owed.usd * 100 });
    expect(x.deposits.reserveRatio).toBe(1);
  });
});

/* ---------------------------------------------------------------- Wave 3-B (gap table §4) */

describe('10. the /invoices/ mount (src/invoice.ts, Wave 3-A), the balance row at the hammer, Paid At The Lot, the fee at the start', () => {
  it('/invoices/ goes to invoice.ts with the CORS headers; the buyer asks for the balance row (held on deviation 2); the dealer\'s Paid At The Lot settles it and writes the split', async () => {
    const r = await get('/invoices/anything', ADMIN);
    expect(r.status).toBe(404); expect(await r.json()).toEqual({ error: 'no_lot' });
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    const d = await dealer('P801001');
    const t = await sold('iv1', d, 'P801001', 'rt-iv1');
    expect(await env.DB.prepare('SELECT id FROM invoices WHERE lot_id = ?1').bind('iv1').first()).toBeNull();   // the hammer writes no row (invoice.test.ts 4: the first call after it does)
    const asked = await post('/invoices/iv1', as(t));
    expect(asked.status).toBe(200);
    expect(await asked.json()).toMatchObject({ id: 'balance:iv1', kind: 'balance', state: 'held', amountCents: 533050, held: 'payee_unnamed' });   // deviation 2: nothing asked of Whop
    const mine = await (await get('/invoices/iv1', as(t))).json<any>();
    expect(mine.balance).toMatchObject({ id: 'balance:iv1', state: 'held', amountUsd: 5330.5 }); expect(mine.fee).toBeNull();
    expect((await post('/lots/iv1/paid', as(d))).status).toBe(200);
    expect((await env.DB.prepare('SELECT state FROM invoices WHERE id = ?1').bind('balance:iv1').first<any>())?.state).toBe('paid_at_lot');
    expect((await eventById('settled:balance:iv1'))?.type).toBe('invoice.settled');
    expect((await env.DB.prepare('SELECT id, reason, held, state FROM dealer_payouts WHERE lot_id = ?1 ORDER BY id').bind('iv1').all<any>()).results).toEqual([{ id: 'applied_net:iv1', reason: 'applied_net', held: 0, state: 'owed' }]);
    expect(whopCalls()).toEqual([]);
  });
  it('the start writes no fee row while the platform row is unset; with the GDN set, one fee row held for the dealer', async () => {
    const d = await dealer('P801002');
    await sold('iv2', d, 'P801002', 'rt-iv2');
    expect((await post('/lots/iv2/paid', as(d))).status).toBe(200);
    expect((await post('/lots/iv2/pickup', as(d), { vin: '000001' })).status).toBe(200);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM invoices WHERE kind = 'fee'").first<{ n: number }>())?.n).toBe(0);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM money_events WHERE type LIKE 'fee.%'").first<{ n: number }>())?.n).toBe(0);
    expect((await post('/admin/gdn', ADMIN, { issuedAt: Date.now() - 86_400_000, feePerCarCents: 19900, feeMonthlyCents: 29900 })).status).toBe(200);
    await sold('iv3', d, 'P801002', 'rt-iv3');
    expect((await post('/lots/iv3/paid', as(d))).status).toBe(200);
    expect((await post('/lots/iv3/pickup', as(d), { vin: '000001' })).status).toBe(200);
    const fee = await env.DB.prepare("SELECT id, payer, state, amount_cents, error FROM invoices WHERE kind = 'fee'").first<any>();
    expect(fee).toEqual({ id: 'fee:iv3', payer: 'P801002', state: 'held', amount_cents: 19900, error: 'whop_unavailable' });   // no Whop key here: held, nothing sent
    expect((await (await get('/admin/exposure', ADMIN)).json<any>()).obaviaFeesOwed).toBe(199);
  });
  it('invoice.paid and transfer.completed go to onWebhook; what it cannot match is kept as webhook.unhandled; the webhook is 200 either way', async () => {
    const r = await webhook({ type: 'invoice.paid', data: { id: 'inv_unknown1', status: 'paid' } }, 'msg_inv_1');
    expect(r.status).toBe(200);
    expect((await eventById('msg_inv_1'))?.type).toBe('invoice.paid');   // kept by type first, like every event
    expect(JSON.parse((await eventById('unhandled:msg_inv_1'))!.body)).toMatchObject({ type: 'invoice.paid', reason: 'unknown_invoice' });
    expect((await webhook({ type: 'transfer.completed', data: { id: 'tr_unknown1' } }, 'msg_tr_1')).status).toBe(200);
    expect(JSON.parse((await eventById('unhandled:msg_tr_1'))!.body)).toMatchObject({ type: 'transfer.completed', reason: 'unknown_transfer' });
  });
});

describe('11. account.updated: the dealer\'s account verified, then the owed-payout retry', () => {
  it('sets dealers.whop_account_verified_at once, writes dealer.account_verified, and sends what was owed; an unverified update sends nothing', async () => {
    const d = await dealer('P801101');
    await sold('au1', d, 'P801101', 'rt-au1');
    await edit('au1', l => { l.sale.deadlineAt = Date.now() - 1; });
    expect((await post('/lots/au1/forfeit', as(d), { reason: 'no show' })).status).toBe(200);   // forfeit:au1 owed, no account yet
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P801101', 'biz_au1001').run();
    // not verified yet: nothing moves
    expect((await webhook({ type: 'account.updated', data: { id: 'biz_au1001', status: 'pending' } })).status).toBe(200);
    expect((await env.DB.prepare('SELECT whop_account_verified_at AS v FROM dealers WHERE gdn = ?1').bind('P801101').first<{ v: number | null }>())?.v).toBeNull();
    // verified: the time lands once, the ledger says so, and the retry runs through the Worker's own environment (Whop keys needed to send)
    calls = [];
    const e = withEnv({ WHOP_API_KEY: 'test-whop-key', WHOP_API_BASE: 'https://whop.test/api/v1', WHOP_ACCOUNT_ID: 'biz_obavia' });
    const raw = JSON.stringify({ type: 'account.updated', data: { id: 'biz_au1001', verified: true } }), ts = String(Math.floor(Date.now() / 1000)), id = 'msg_au1';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('test-whop-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${raw}`)));
    const r = await worker.fetch(new Request(`${base}/webhooks/whop`, { method: 'POST', headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${btoa(String.fromCharCode(...mac))}`, 'content-type': 'application/json' }, body: raw }), e);
    expect(r.status).toBe(200);
    const v = (await env.DB.prepare('SELECT whop_account_verified_at AS v FROM dealers WHERE gdn = ?1').bind('P801101').first<{ v: number | null }>())?.v;
    expect(v).toBeGreaterThan(0);
    expect(JSON.parse((await eventById('account_verified:P801101'))!.body)).toMatchObject({ dealer: 'P801101', account: 'biz_au1001', actor: 'whop' });
    expect(whopCalls().map(c => c.headers['idempotency-key'])).toEqual(['forfeit:au1']);
    expect((await env.DB.prepare('SELECT state FROM dealer_payouts WHERE id = ?1').bind('forfeit:au1').first<{ state: string }>())?.state).toBe('sent');
    // a second verified update keeps the first time
    expect((await webhook({ type: 'account.updated', data: { id: 'biz_au1001', status: 'active' } })).status).toBe(200);
    expect((await env.DB.prepare('SELECT whop_account_verified_at AS v FROM dealers WHERE gdn = ?1').bind('P801101').first<{ v: number | null }>())?.v).toBe(v);
  });
});

describe('12. recovery by phone: POST /me/recover and /me/recover/verify', () => {
  it('a second install proves the same number and gets the first buyer\'s id with a new token; the old token is 401; a row in recoveries', async () => {
    const first = await buyer('rt-rec1');   // proves PHONE with the fake provider (DEV=1 admits it)
    expect((await get('/me', as(first))).status).toBe(200);
    // no token: the code to the number; the answer says nothing about who holds it
    const sent = await post('/me/recover', { 'content-type': 'application/json' }, { phone: PHONE });
    expect(sent.status).toBe(200); expect(await sent.json()).toMatchObject({ sent: true, phone: '(•••) •••-0142' });
    expect((await post('/me/recover', { 'content-type': 'application/json' }, { phone: 'not a number' })).status).toBe(400);
    const wrong = await post('/me/recover/verify', { 'content-type': 'application/json' }, { phone: PHONE, code: '123456' });
    expect(wrong.status).toBe(422); expect(await wrong.json()).toEqual({ error: 'wrong_code' });
    const ok = await post('/me/recover/verify', { 'content-type': 'application/json' }, { phone: PHONE, code: '000000' });
    expect(ok.status).toBe(200);
    const got = await ok.json<{ id: string; token: string; phone: string }>();
    expect(got.id).toBe('rt-rec1'); expect(got.token).not.toBe(first); expect(got.phone).toBe('(•••) •••-0142');
    expect((await get('/me', as(first))).status).toBe(401);   // the old epoch is bumped: every old token stops
    const me = await (await get('/me', as(got.token))).json<any>();
    expect(me.id).toBe('rt-rec1'); expect(me.phoneVerified).toBe(true); expect(me.deposit_status).toBe('captured');
    expect((await env.DB.prepare('SELECT buyer, from_epoch, to_epoch FROM recoveries WHERE buyer = ?1').bind('rt-rec1').first()) ).toEqual({ buyer: 'rt-rec1', from_epoch: 0, to_epoch: 1 });
    // the code proves once
    const again = await post('/me/recover/verify', { 'content-type': 'application/json' }, { phone: PHONE, code: '000000' });
    expect(again.status).toBe(429);
  });
  it('a proved number nobody holds is 404 no_such_phone, and only after the code; the per-number limits hold', async () => {
    const other = '+12145550199';
    expect((await post('/me/recover', { 'content-type': 'application/json' }, { phone: other })).status).toBe(200);
    const gap = await post('/me/recover', { 'content-type': 'application/json' }, { phone: other });
    expect(gap.status).toBe(429); expect(gap.headers.get('retry-after')).toMatch(/^\d+$/);   // one send per 30 s per number
    const r = await post('/me/recover/verify', { 'content-type': 'application/json' }, { phone: other, code: '000000' });
    expect(r.status).toBe(404); expect(await r.json()).toEqual({ error: 'no_such_phone' });
    expect((await post('/me/recover/verify', { 'content-type': 'application/json' }, { phone: other })).status).toBe(400);
  });
  it('a fake proof recovers nothing on a DEV=0 Worker: the number was never proved for real', async () => {
    await buyer('rt-rec3');
    await env.DB.prepare("DELETE FROM phone_codes WHERE buyer_id = 'recover:+12145550142'").run();   // the 30 s gap from the test above
    const e = withEnv({ DEV: '0' });
    expect((await call(e, '/me/recover', { body: { phone: PHONE } })).status).toBe(200);
    const r = await call(e, '/me/recover/verify', { body: { phone: PHONE, code: '000000' } });
    expect(r.status).toBe(404);
  });
});

describe('13. GET /admin/lots/:id/log: one lot, every row, in time order', () => {
  it('lists the bids, the refusals, the money rows (the deposit applied, the plates, the payout), the pickup refusal and the signature rows for that lot alone; admin only', async () => {
    const d = await dealer('P801301');
    const t = await sold('lg1', d, 'P801301', 'rt-lg1');
    await sold('lg2', d, 'P801301', 'rt-lg2');   // another lot: none of its rows below
    expect((await bid('lg1', t, 9000)).status).toBe(200);   // a late bid, stamped closed
    expect((await post('/lots/lg1/paid', as(d))).status).toBe(200);
    expect((await post('/lots/lg1/pickup', as(d), { vin: '999999' })).status).toBe(409);   // wrong car: a pickup refusal
    expect((await post('/lots/lg1/pickup', as(d), { vin: '000001' })).status).toBe(200);
    expect((await post('/lots/lg1/plates', as(d), { state: 'filed' })).status).toBe(200);
    expect((await get('/admin/lots/lg1/log')).status).toBe(403);
    expect((await get('/admin/lots/lg1/log', as(d))).status).toBe(403);
    const log = await (await get('/admin/lots/lg1/log', ADMIN)).json<{ lotId: string; dealer: string; rows: any[] }>();
    expect(log.lotId).toBe('lg1'); expect(log.dealer).toBe('P801301');
    const ats = log.rows.map(r => r.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    expect(log.rows.filter(r => r.kind === 'bid').map(r => [r.bidder, r.amount, r.ok, r.reason])).toEqual([['rt-lg1', 5000, 1, null], ['rt-lg1', 9000, 0, 'closed']]);
    expect(log.rows.filter(r => r.kind === 'pickup_refusal').map(r => [r.reason, r.presented])).toEqual([['wrong car', '999999']]);
    expect(log.rows.filter(r => r.kind === 'money').map(r => r.type)).toEqual(['balance.paid_at_lot', 'invoice.settled', 'payout.split', 'deposit.applied', 'sale.plates']);   // W3-A's rows at Paid At The Lot sit between
    expect(log.rows.filter(r => r.kind === 'payout').map(r => [r.id, r.reason, r.state])).toEqual([['applied_net:lg1', 'applied_net', 'owed'], ['applied:lg1', 'applied', 'owed']]);
    expect(log.rows.filter(r => r.kind === 'invoice').map(r => [r.id, r.state])).toContainEqual(['balance:lg1', 'paid_at_lot']);   // and fee:lg1 held, since section 10 set the GDN in this file
    expect(log.rows.some(r => JSON.stringify(r).includes('lg2'))).toBe(false);
    expect(log.rows.some(r => r.kind === 'money' && r.type === 'deposit.captured')).toBe(false);   // the capture names no lot
  });
});

describe('14. GET /admin/exposure: watchers per open lot, wonAt and startedAt per sale, hammer and floor per closed lot', () => {
  it('the three new fields, from the copy', async () => {
    const d = await dealer('P801401');
    const t = await sold('xw1', d, 'P801401', 'rt-xw1');
    expect((await post('/lots/xw1/paid', as(d))).status).toBe(200);
    expect((await post('/lots/xw1/pickup', as(d), { vin: '000001' })).status).toBe(200);
    expect((await openLot('xw2', d, 'P801401')).status).toBe(200);
    expect((await post('/lots/xw2/watch?delta=1', as(t))).status).toBe(200);
    expect((await post('/lots/xw2/watch?delta=1', as(t))).status).toBe(200);
    await settle();
    const x = await (await get('/admin/exposure', ADMIN)).json<any>();
    expect(x.watchers.find((w: any) => w.lotId === 'xw2')).toEqual({ lotId: 'xw2', dealer: 'P801401', watching: 2 });
    expect(x.watchers.some((w: any) => w.lotId === 'xw1')).toBe(false);   // closed: not an open lot
    const sale = x.sales.find((s: any) => s.lotId === 'xw1');
    expect(sale.wonAt).toBeGreaterThan(0); expect(sale.startedAt).toBeGreaterThanOrEqual(sale.wonAt); expect(sale.offer).toBeNull();
    expect(x.bidders.find((b: any) => b.lotId === 'xw1')).toMatchObject({ sold: true, hammer: 5000, floor: 4900, bidders: 1 });
    expect(x.platform === null || typeof x.platform === 'object').toBe(true);
  });
});

describe('15. POST /admin/gdn: the owner types the date and the fee numbers, never the code', () => {
  it('writes W3-A\'s platform row (0016, src/fees.ts setPlatform) once and the ledger row admin.gdn; bad input 400; admin only', async () => {
    const body = { issuedAt: Date.now() - 86_400_000, feePerCarCents: 19900, feeMonthlyCents: 29900 };
    expect((await post('/admin/gdn', { 'content-type': 'application/json' }, body)).status).toBe(403);
    expect((await post('/admin/gdn', ADMIN, { ...body, issuedAt: Date.now() + 7 * 86_400_000 })).status).toBe(400);   // never a date in the future
    expect((await post('/admin/gdn', ADMIN, { ...body, feePerCarCents: -1 })).status).toBe(400);
    expect((await post('/admin/gdn', ADMIN, { ...body, feeMonthlyCents: 1.5 })).status).toBe(400);
    const r = await post('/admin/gdn', ADMIN, body);
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ gdnIssuedAt: body.issuedAt, feePerCarCents: 19900, feeMonthlyCents: 29900 });
    const row = await env.DB.prepare('SELECT id, gdn_issued_at, fee_per_car_cents, fee_monthly_cents, balance_payee FROM platform').first<any>();
    expect(row).toEqual({ id: 1, gdn_issued_at: body.issuedAt, fee_per_car_cents: 19900, fee_monthly_cents: 29900, balance_payee: null });   // the payee is deviation 2's line, never set here
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM platform').first<{ n: number }>())?.n).toBe(1);
    const ev = await events('admin.gdn');
    expect(ev.length).toBeGreaterThanOrEqual(1);
    expect(JSON.parse(ev.at(-1)!.body)).toMatchObject({ actor: 'admin', issuedAt: body.issuedAt, feePerCarCents: 19900, feeMonthlyCents: 29900 });
    // typed again: still one row, the ledger keeps what it was before
    const again = await post('/admin/gdn', ADMIN, { ...body, feePerCarCents: 20000 });
    expect(again.status).toBe(200);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM platform').first<{ n: number }>())?.n).toBe(1);
    expect(JSON.parse((await events('admin.gdn')).at(-1)!.body).before).toMatchObject({ feePerCarCents: 19900 });
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM money_events WHERE type LIKE ?1').bind('fee.%').first<{ n: number }>())?.n).toBe(0);   // nothing here invoices a fee: W3-A's feeFor does, behind this row
  });
});

describe('16. GET /lots/:id/pass: the Google Wallet pass, signed only with both keys', () => {
  const pem = (b: ArrayBuffer, label: string) => `-----BEGIN ${label}-----\n${btoa(String.fromCharCode(...new Uint8Array(b))).match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----\n`;
  const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
  it('503 pass_unavailable without the two names; with them a JWT whose RS256 signature verifies and whose QR is the app\'s pass; only the sale\'s buyer', async () => {
    const d = await dealer('P801601');
    const t = await sold('gw1', d, 'P801601', 'rt-gw1');
    const stranger = await buyer('rt-gw2');
    const none = await get('/lots/gw1/pass', as(t));
    expect(none.status).toBe(503); expect(await none.json()).toEqual({ error: 'pass_unavailable' });
    expect((await get('/lots/gw1/pass')).status).toBe(401);
    const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const sa = JSON.stringify({ type: 'service_account', client_email: 'wallet@obavia-test.iam.gserviceaccount.com', private_key: pem(await crypto.subtle.exportKey('pkcs8', kp.privateKey) as ArrayBuffer, 'PRIVATE KEY') });
    const half = withEnv({ GOOGLE_WALLET_ISSUER_ID: '3388000000012345678' });
    expect((await call(half, '/lots/gw1/pass', { method: 'GET', headers: as(t) })).status).toBe(503);   // one name is not both
    const e = withEnv({ GOOGLE_WALLET_ISSUER_ID: '3388000000012345678', GOOGLE_WALLET_SERVICE_ACCOUNT: sa });
    const r = await call(e, '/lots/gw1/pass', { method: 'GET', headers: as(t) });
    expect(r.status).toBe(200);
    const out = await r.json<{ url: string; objectId: string; expiresAt: number }>();
    expect(out.url.startsWith('https://pay.google.com/gp/v/save/')).toBe(true);
    expect(out.objectId).toBe('3388000000012345678.gw1-rt-gw1');
    const [h, p, sig] = out.url.slice('https://pay.google.com/gp/v/save/'.length).split('.');
    expect(JSON.parse(new TextDecoder().decode(b64url(h)))).toEqual({ alg: 'RS256', typ: 'JWT' });
    const claims = JSON.parse(new TextDecoder().decode(b64url(p)));
    expect(claims).toMatchObject({ iss: 'wallet@obavia-test.iam.gserviceaccount.com', aud: 'google', typ: 'savetowallet' });
    const obj = claims.payload.genericObjects[0];
    const lot = await (await get('/lots/gw1')).json<any>();
    expect(obj).toMatchObject({ id: out.objectId, classId: '3388000000012345678.obavia_pickup', barcode: { type: 'QR_CODE', value: `obavia:gw1:1N4AL3AP0EC000001:${lot.sale.wonAt}`, alternateText: '000001' } });
    expect(obj.header.defaultValue.value).toBe('2014 Nissan Altima');
    expect(JSON.stringify(obj)).not.toMatch(/\$|5,000|deadline|pay by/i);   // no money and no clock on the pass
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', kp.publicKey, b64url(sig), new TextEncoder().encode(`${h}.${p}`))).toBe(true);
    const theirs = await call(e, '/lots/gw1/pass', { method: 'GET', headers: as(stranger) });
    expect(theirs.status).toBe(403); expect(await theirs.json()).toEqual({ error: 'not_yours' });
    const bad = await call(withEnv({ GOOGLE_WALLET_ISSUER_ID: '1', GOOGLE_WALLET_SERVICE_ACCOUNT: '{"client_email":"x"}' }), '/lots/gw1/pass', { method: 'GET', headers: as(t) });
    expect(bad.status).toBe(503); expect(await bad.json()).toEqual({ error: 'pass_unavailable' });   // a key that cannot sign: the same answer, nothing said about it
  });
});

describe('17. dispute.created: the evidence pack (src/sign.ts, W3-F) and the upload (src/invoice.ts, W3-A), the result on the pack row', () => {
  it('builds the pack for the sale the deposit backs, names the dispute on its row, and without WHOP_API_KEY keeps "not sent" on the row and the ledger; the lot\'s log lists it', async () => {
    const d = await dealer('P801701');
    await sold('dv1', d, 'P801701', 'rt-dv1');
    await env.DB.prepare("UPDATE buyers SET deposit_ref = 'pay_dv1' WHERE id = 'rt-dv1'").run();
    expect((await webhook({ type: 'dispute.created', data: { id: 'dsp_dv1', payment_id: 'pay_dv1' } })).status).toBe(200);
    expect(await depositOf('rt-dv1')).toBe('disputed');
    const row = JSON.parse((await eventById('dispute_pack:pay_dv1'))!.body);
    expect(row).toMatchObject({ buyer: 'rt-dv1', ref: 'pay_dv1', disputeId: 'dsp_dv1', lotId: 'dv1', pack: 'built', upload: 'not_sent', uploadReason: 'whop_unavailable' });
    expect(row.packSha256).toMatch(/^[0-9a-f]{64}$/);
    const pack = await env.DB.prepare('SELECT lot_id, buyer, dispute_id, sha256, uploaded_at, upload_ref, upload_error FROM evidence_packs WHERE id = ?1').bind(row.packId).first<any>();
    expect(pack).toEqual({ lot_id: 'dv1', buyer: 'rt-dv1', dispute_id: 'dsp_dv1', sha256: row.packSha256, uploaded_at: null, upload_ref: null, upload_error: 'whop_unavailable' });
    expect(await env.FILES.get(row.packKey)).not.toBeNull();
    expect(whopCalls()).toEqual([]);
    const log = await (await get('/admin/lots/dv1/log', ADMIN)).json<any>();
    expect(log.rows.filter((r: any) => r.kind === 'evidence_pack').map((r: any) => [r.dispute_id, r.sha256])).toEqual([['dsp_dv1', row.packSha256]]);
    expect(log.rows.filter((r: any) => r.kind === 'money').map((r: any) => r.type)).toContain('dispute.pack');
    // a dispute on a deposit that backs no sale: the ledger says so, no pack
    await buyer('rt-dv2');
    await env.DB.prepare("UPDATE buyers SET deposit_ref = 'pay_dv2' WHERE id = 'rt-dv2'").run();
    expect((await webhook({ type: 'dispute.created', data: { id: 'dsp_dv2', payment_id: 'pay_dv2' } })).status).toBe(200);
    expect(JSON.parse((await eventById('dispute_pack:pay_dv2'))!.body)).toMatchObject({ pack: 'no_sale', upload: 'no_pack', lotId: null });
  });
});

describe('18. POST /lots/:id/car carries the dealer\'s own Marketplace listing URL', () => {
  it('an https URL is kept on the car and the lane carries it; anything else is 400 bad_listing; null clears it', async () => {
    const d = await dealer('P801801');
    expect((await openLot('mk1', d, 'P801801')).status).toBe(200);
    const url = 'https://www.facebook.com/marketplace/item/1234567890/';
    const r = await post('/lots/mk1/car', as(d), { listingUrl: url });
    expect(r.status).toBe(200); expect((await r.json<any>()).car.listingUrl).toBe(url);
    await settle();
    expect((await (await get('/lots')).json<any[]>()).find(l => l.id === 'mk1').car.listingUrl).toBe(url);
    for (const bad of ['http://example.com/x', 'javascript:alert(1)', 'x'.repeat(301), 42]) {
      const b = await post('/lots/mk1/car', as(d), { listingUrl: bad });
      expect(b.status, String(bad).slice(0, 20)).toBe(400); expect(await b.text()).toBe('bad_listing');
    }
    expect((await (await get('/lots/mk1')).json<any>()).car.listingUrl).toBe(url);
    expect((await (await post('/lots/mk1/car', as(d), { listingUrl: null })).json<any>()).car.listingUrl).toBeNull();
  });
});

describe('the /sales/ mount (src/sign.ts)', () => {
  it('the Worker hands /sales/ to sign.ts, with the CORS headers', async () => {
    const r = await get('/sales/nolot/nothing');
    expect(r.status).toBe(404); expect(await r.json()).toEqual({ error: 'not_found' });   // sign.ts's own 404, not the Worker's bare "not found"
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    const papers = await get('/sales/nolot/papers');
    expect(papers.status).not.toBe(404);
    expect(papers.headers.get('access-control-allow-origin')).toBe('*');
  });
});
