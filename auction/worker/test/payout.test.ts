/* The dealer's $250 after the object: the lot's sale.payout follows a payout paid by hand or sent by the retry (the object's
   POST /payout, Worker-internal), and the dealer's own Whop account (POST /dealers/account/start, GET /dealers/me), whose id
   only ever comes from Whop's own answer. Every rule here is in src/index.ts or src/auction.ts. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import worker from '../src/index';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Payout Test Motors', city: 'Houston', street: '400 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });

const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const get = (path: string, headers: Record<string, string> = {}) => SELF.fetch(`${base}${path}`, { headers });
const withEnv = (extra: Partial<WorkerEnv>) => ({ ...env, ...extra }) as WorkerEnv;
const call = (e: WorkerEnv, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  worker.fetch(new Request(`${base}${path}`, { method: init.method ?? 'POST', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) }), e);
const WHOP = withEnv({ WHOP_API_KEY: 'test-whop-key', WHOP_API_BASE: 'https://whop.test/api/v1', WHOP_ACCOUNT_ID: 'biz_obavia' });
/** The object directly, as the Worker calls it: no x-dealer is the admin. */
const direct = (id: string, path: string, dealer: string | null, body: unknown = {}) =>
  stub(id).fetch(`https://auction/lots/${id}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(dealer !== null ? { 'x-dealer': dealer } : {}) }, body: JSON.stringify(body) });

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}` });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Payout Buyer', state: 'TX' });
  const { token } = await r.json<{ token: string }>();
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
/** Open, one bid, the hammer, then the admin forfeits: a $250 payout owed to the dealer (no Whop on the object's env). */
async function forfeited(id: string, dealerToken: string, gdn: string, buyerId: string) {
  expect((await post(`/lots/${id}/open`, as(dealerToken), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: car(gdn) })).status).toBe(200);
  const t = await buyer(buyerId);
  expect((await post(`/lots/${id}/bids`, as(t), { amount: 5000, max: 5000, key: crypto.randomUUID(), terms: TERMS })).status).toBe(200);
  await edit(id, l => { l.closesAt = Date.now() - 1; });
  await runInDurableObject(stub(id), (_i, state) => state.storage.setAlarm(Date.now()));
  await runDurableObjectAlarm(stub(id)); await settle();
  expect((await post(`/admin/lots/${id}/forfeit`, ADMIN, { reason: 'no pay' })).status).toBe(200);
  await settle();
  expect((await lotOf(id)).sale.payout).toEqual({ state: 'owed' });
}
const lotOf = async (id: string) => (await get(`/lots/${id}`)).json<any>();
const accountOf = async (gdn: string) => (await env.DB.prepare('SELECT whop_account FROM dealers WHERE gdn = ?1').bind(gdn).first<{ whop_account: string | null }>())?.whop_account;

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
const whopCalls = () => calls.filter(c => c.url.startsWith('https://whop.test/'));
/** Whop answering account creation with `account` and every transfer with `transfer`. */
const whopWith = (account: () => Response, transfer: () => Response = () => Response.json({ id: 'tr_po' })) => {
  whopAnswer = (url, method) => method === 'POST' && url === 'https://whop.test/api/v1/accounts' ? account() : transfer();
};

describe('1. POST /payout: the lot follows dealer_payouts', () => {
  it('paid by hand moves sale.payout to paid with the method and the time; the same news again changes nothing; other news is refused', async () => {
    const own = await dealer('P900001');
    await forfeited('po1', own, 'P900001', 'po-b1');
    const before = Date.now();
    const r = await post(`/admin/payouts/${encodeURIComponent('forfeit:po1')}/paid`, ADMIN, { method: 'check', note: 'check 1041' });
    expect(r.status).toBe(200);
    const p = (await lotOf('po1')).sale.payout;
    expect(p).toMatchObject({ state: 'paid', method: 'check' });
    expect(p.at).toBeGreaterThanOrEqual(before);
    expect(p.transferId).toBeUndefined();
    // the admin route a second time: refused by the row, the lot unchanged
    expect((await post(`/admin/payouts/${encodeURIComponent('forfeit:po1')}/paid`, ADMIN, { method: 'wire' })).status).toBe(409);
    expect((await lotOf('po1')).sale.payout).toEqual(p);
    // the object itself: the same news is idempotent, different news is refused
    expect((await direct('po1', '/payout', null, { id: 'forfeit:po1', state: 'paid', method: 'check', at: p.at })).status).toBe(200);
    expect((await direct('po1', '/payout', null, { id: 'forfeit:po1', state: 'paid', method: 'wire', at: p.at })).status).toBe(409);
    expect((await direct('po1', '/payout', null, { id: 'forfeit:po1', state: 'sent', transferId: 'tr_x', at: p.at })).status).toBe(409);
    expect((await lotOf('po1')).sale.payout).toEqual(p);
  });

  it('is Worker-internal: never forwarded from outside, refused to a dealer key on the object, and checks the payout id and shape', async () => {
    const own = await dealer('P900002');
    await forfeited('po2', own, 'P900002', 'po-b2');
    expect((await post('/lots/po2/payout', ADMIN, { id: 'forfeit:po2', state: 'paid', method: 'cash', at: Date.now() })).status).toBe(404);
    expect((await post('/lots/po2/payout', as(own), { id: 'forfeit:po2', state: 'paid', method: 'cash', at: Date.now() })).status).toBe(404);
    expect((await direct('po2', '/payout', 'P900002', { id: 'forfeit:po2', state: 'paid', method: 'cash', at: Date.now() })).status).toBe(403);
    expect((await direct('po2', '/payout', null, { id: 'applied:po2', state: 'paid', method: 'cash', at: Date.now() })).status).toBe(409);
    expect((await direct('po2', '/payout', null, { id: 'forfeit:po2', state: 'paid', method: 'venmo', at: Date.now() })).status).toBe(400);
    expect((await direct('po2', '/payout', null, { id: 'forfeit:po2', state: 'sent', at: Date.now() })).status).toBe(400);
    expect((await direct('po2', '/payout', null, { id: 'forfeit:po2', state: 'paid', method: 'cash' })).status).toBe(400);
    expect((await direct('po-none', '/payout', null, { id: 'forfeit:po-none', state: 'paid', method: 'cash', at: Date.now() })).status).toBe(409);
    expect((await lotOf('po2')).sale.payout).toEqual({ state: 'owed' });
  });

  it('the retry (POST /dealers/account, admin) moves sale.payout to sent with the transfer id', async () => {
    const own = await dealer('P900003');
    await forfeited('po3', own, 'P900003', 'po-b3');
    whopAnswer = () => Response.json({ id: 'tr_po3' });
    const r = await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P900003', account: 'biz_dealer903' } });
    expect(await r.json()).toMatchObject({ payouts: { sent: 1, owed: 0 } });
    expect((await lotOf('po3')).sale.payout).toMatchObject({ state: 'sent', transferId: 'tr_po3' });
  });
});

describe('2. The dealer\'s own Whop account', () => {
  it('POST /dealers/account/start stores the id from Whop\'s own answer, runs the owed retry, and the lot follows', async () => {
    const own = await dealer('P900011');
    await forfeited('po11', own, 'P900011', 'po-b11');
    const me0 = await call(WHOP, '/dealers/me', { method: 'GET', headers: { authorization: `Bearer ${own}` } });
    expect(await me0.json()).toEqual({ gdn: 'P900011', name: 'Dealer P900011', whopAccount: null, payoutsOwed: 250 });
    whopWith(() => Response.json({ id: 'biz_whopmade11' }), () => Response.json({ id: 'tr_po11' }));
    const r = await call(WHOP, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'desk@example.com' } });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ gdn: 'P900011', whopAccount: 'biz_••••de11', payouts: { sent: 1, owed: 0 } });
    expect(await accountOf('P900011')).toBe('biz_whopmade11');
    const w = whopCalls();
    expect(w[0]).toMatchObject({ method: 'POST', url: 'https://whop.test/api/v1/accounts' });
    expect(w[0].body).toMatchObject({ email: 'desk@example.com', title: 'Dealer P900011', country: 'US', metadata: { external_id: 'P900011' } });
    expect(w[1].url).toBe('https://whop.test/api/v1/transfers');
    expect(w[1].body).toMatchObject({ destination_id: 'biz_whopmade11', amount: 250, idempotence_key: 'forfeit:po11' });
    expect((await lotOf('po11')).sale.payout).toMatchObject({ state: 'sent', transferId: 'tr_po11' });
    const ev = await env.DB.prepare("SELECT body FROM money_events WHERE type = 'dealer.account' AND json_extract(body, '$.dealer') = 'P900011'").first<{ body: string }>();
    expect(JSON.parse(ev!.body)).toEqual({ dealer: 'P900011', account: 'biz_whopmade11', actor: 'dealer', via: 'whop' });
    expect(ev!.body).not.toContain('desk@example.com');
    const me1 = await call(WHOP, '/dealers/me', { method: 'GET', headers: { authorization: `Bearer ${own}` } });
    expect(await me1.json()).toEqual({ gdn: 'P900011', name: 'Dealer P900011', whopAccount: 'biz_••••de11', payoutsOwed: 0 });
    // set once by the dealer: a second start is refused and Whop is not asked
    calls = [];
    const again = await call(WHOP, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'other@example.com' } });
    expect(again.status).toBe(409); expect(await again.json()).toEqual({ error: 'account_exists' });
    expect(whopCalls()).toHaveLength(0);
    expect(await accountOf('P900011')).toBe('biz_whopmade11');
  });

  it('a client-supplied account id is refused: nothing reaches Whop, nothing is stored, nothing is sent', async () => {
    const own = await dealer('P900012');
    await forfeited('po12', own, 'P900012', 'po-b12');
    for (const b of [{ email: 'desk@example.com', account: 'biz_attacker99' }, { email: 'desk@example.com', whopAccount: 'biz_attacker99' }, { email: 'desk@example.com', whop_account: 'biz_attacker99' }, { email: 'desk@example.com', id: 'biz_attacker99' }]) {
      const r = await call(WHOP, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: b });
      expect(r.status).toBe(400); expect(await r.json()).toEqual({ error: 'account_from_whop_only' });
    }
    expect(whopCalls()).toHaveLength(0);
    expect(await accountOf('P900012')).toBeNull();
    expect((await lotOf('po12')).sale.payout).toEqual({ state: 'owed' });
    // and a dealer key still cannot use the admin override
    expect((await call(WHOP, '/dealers/account', { headers: { authorization: `Bearer ${own}` }, body: { gdn: 'P900012', account: 'biz_attacker99' } })).status).toBe(403);
    expect(await accountOf('P900012')).toBeNull();
  });

  it('an answer that is not a Whop account id, or a Whop refusal, stores nothing and echoes nothing', async () => {
    const own = await dealer('P900013');
    whopWith(() => Response.json({ id: 'acct 13' }));
    const bad = await call(WHOP, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'desk@example.com' } });
    expect(bad.status).toBe(502); expect(await bad.json()).toEqual({ error: 'whop_bad_account' });
    whopWith(() => new Response('{"error":"email desk@example.com rejected"}', { status: 422 }));
    const refused = await call(WHOP, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'desk@example.com' } });
    expect(refused.status).toBe(502);
    const text = await refused.text();
    expect(text).toBe('{"error":"whop_refused"}'); expect(text).not.toContain('test-whop-key');
    expect(await accountOf('P900013')).toBeNull();
  });

  it('who may ask, and without Whop keys 503 whop_unavailable', async () => {
    const own = await dealer('P900014');
    expect((await call(env, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'desk@example.com' } })).status).toBe(503);
    expect(await (await call(env, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'desk@example.com' } })).json()).toEqual({ error: 'whop_unavailable' });
    expect((await call(WHOP, '/dealers/account/start', { headers: ADMIN, body: { email: 'desk@example.com' } })).status).toBe(403);
    expect((await call(WHOP, '/dealers/account/start', { body: { email: 'desk@example.com' } })).status).toBe(403);
    expect((await call(WHOP, '/dealers/account/start', { headers: { authorization: `Bearer ${own}` }, body: { email: 'not an email' } })).status).toBe(400);
    expect((await call(WHOP, '/dealers/me', { method: 'GET', headers: ADMIN })).status).toBe(403);
    expect((await call(WHOP, '/dealers/me', { method: 'GET' })).status).toBe(403);
    expect(whopCalls()).toHaveLength(0);
    expect(await accountOf('P900014')).toBeNull();
  });
});
