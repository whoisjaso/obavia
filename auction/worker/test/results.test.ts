/* GET /results, the public results page's one read (obavia.co/results; growth plan CP5): aggregate, dated counts only,
   no key, cached ten minutes. The shape, the nulls before anything ran, the counts after a sale and a void, the reserve
   ratio from a stored reconciliation row (never a hard-coded 1.00), and that no personal field or dollar amount leaves.
   Every rule is in src/index.ts (the /results route) and src/reconcile.ts. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const VIN = '1N4AL3AP0EC000001';
const DEALER_NAME = 'Results Test Motors';
const BUYER_NAME = 'Results Buyer';
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: VIN, photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: DEALER_NAME, city: 'Houston', street: '200 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });

const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const results = () => SELF.fetch(`${base}/results`);
const lotOf = async (id: string) => (await SELF.fetch(`${base}/lots/${id}`)).json<any>();

const KEYS = ['lotsOpened', 'carsSold', 'carsStarted', 'depositsRefunded', 'reserveRatio', 'disputes', 'nightsEqual', 'reconciledAt', 'readAt'];

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: DEALER_NAME });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: BUYER_NAME, state: 'TX' });
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
/** Open, bid, and drop the hammer now. */
async function sold(id: string, dealerToken: string, gdn: string, buyerId: string) {
  const o = await post(`/lots/${id}/open`, as(dealerToken), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: car(gdn) });
  expect(o.status).toBe(200);
  const t = await buyer(buyerId);
  expect((await post(`/lots/${id}/bids`, as(t), { amount: 5000, max: 5000, key: crypto.randomUUID(), terms: TERMS })).status).toBe(200);
  await edit(id, l => { l.closesAt = Date.now() - 1; });
  await runInDurableObject(stub(id), (_i, state) => state.storage.setAlarm(Date.now()));
  await runDurableObjectAlarm(stub(id)); await settle();
  expect((await lotOf(id)).sale?.buyer).toBe(buyerId);
  return t;
}

const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://exp.host/') || url.startsWith('https://whop.test/')) return Response.json({ data: { status: 'ok' } });
    return realFetch(input as RequestInfo, init);
  });
});
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });

describe('GET /results', () => {
  it('needs no key, is cached ten minutes, and before anything ran every count is 0 and every read is null', async () => {
    const r = await results();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('public, max-age=600');
    expect(r.headers.get('content-type')).toBe('application/json');
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    const b = await r.json<Record<string, unknown>>();
    expect(Object.keys(b).sort()).toEqual([...KEYS].sort());
    expect(b).toMatchObject({ lotsOpened: 0, carsSold: 0, carsStarted: 0, depositsRefunded: 0, disputes: 0, nightsEqual: 0, reserveRatio: null, reconciledAt: null });
    expect(typeof b.readAt).toBe('number');
  });

  it('counts a listed, sold and started car, and a deposit given back in full on a void; nothing personal leaves', async () => {
    const own = await dealer('P910001');
    await sold('rs1', own, 'P910001', 'results-b1');
    expect((await post('/lots/rs1/paid', as(own))).status).toBe(200);
    expect((await post('/lots/rs1/pickup', as(own), { vin: VIN.slice(-6) })).status).toBe(200);
    await sold('rs2', own, 'P910001', 'results-b2');
    expect((await post('/lots/rs2/void', as(own), { reason: 'It did not start' })).status).toBe(200);
    await settle();
    const r = await results();
    const raw = await r.text();
    const b = JSON.parse(raw);
    expect(b).toMatchObject({ lotsOpened: 2, carsSold: 1, carsStarted: 1, depositsRefunded: 1, disputes: 0 });   // the voided sale is not a sold car
    // no name, no GDN, no lot id, no phone, no hammer price, no fee: every value is a number or null
    for (const k of KEYS) expect(b[k] === null || typeof b[k] === 'number', k).toBe(true);
    for (const word of [DEALER_NAME, BUYER_NAME, 'P910001', 'rs1', 'rs2', PHONE, 'fee', 'hammer', 'buyer', 'dealer', 'gdn', 'name', 'phone', 'lotId']) expect(raw).not.toContain(word);
  });

  it('reads the reserve ratio, the equal nights and the date from stored reconciliation rows; Whop unread stays null', async () => {
    const row = (id: string, ranAt: number, balance: number | null, equal: 0 | 1) => env.DB.prepare('INSERT INTO reconciliations (id, ran_at, lots_checked, lots_differing, differing, deposits_held, whop_balance_cents, equal, note, payouts_owed, payouts_owed_cents, differences) VALUES (?1, ?2, 2, 0, ?3, 2, ?4, ?5, ?6, 0, 0, ?7)')
      .bind(id, ranAt, '[]', balance, equal, 'test', '[]').run();
    // a night Whop was not read: the ratio is null, never 1.00; the night still counts as equal and dates the read
    await row('rec_a', 1_700_000_000_000, null, 1);
    let b = await (await results()).json<any>();
    expect(b.reserveRatio).toBeNull(); expect(b.nightsEqual).toBe(1); expect(b.reconciledAt).toBe(1_700_000_000_000);
    // two deposits held ($500) against $490 settled: 0.98, rounded down, from the newest row
    await row('rec_b', 1_700_000_100_000, 49_000, 0);
    await row('rec_c', 1_700_000_200_000, 50_000, 1);
    b = await (await results()).json<any>();
    expect(b.reserveRatio).toBe(1); expect(b.nightsEqual).toBe(1); expect(b.reconciledAt).toBe(1_700_000_200_000);
    await row('rec_d', 1_700_000_300_000, 49_000, 1);
    b = await (await results()).json<any>();
    expect(b.reserveRatio).toBe(0.98); expect(b.nightsEqual).toBe(2);
    // a disputed deposit is the row the webhook writes
    await env.DB.prepare("INSERT INTO money_events (id, type, body, received_at) VALUES ('dispute:pay_1', 'deposit.disputed', '{}', 1)").run();
    expect((await (await results()).json<any>()).disputes).toBe(1);
  });

  it('is GET only', async () => {
    expect((await post('/results', { 'content-type': 'application/json' })).status).toBe(404);
  });
});
