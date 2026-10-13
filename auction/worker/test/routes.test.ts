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
