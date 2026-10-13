/* The sale after the hammer: who may touch it, what each step requires, where the $250 goes.
   Wave 1-A. Every rule here is in src/auction.ts. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import { payBy } from '../src/push';
import { PAY_WINDOW_MS } from '../src/auction';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const H = 3_600_000;
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Sale Test Motors', city: 'Houston', street: '200 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });
// hammer 5,000: tax 312.50, title 33, registration 75, plate 10, doc 150 = 5,580.50; less the deposit = 5,330.50, shown "$5,331"
const BALANCE = '$5,331';

/** runInDurableObject, typed loosely: its generic recurses on this Env (TS2589). */
const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
/** The object directly, for routes the Worker does not forward yet (POST /forfeit) and /copy. */
const direct = (id: string, path: string, dealer: string | null, body: unknown = {}) =>
  stub(id).fetch(`https://auction/lots/${id}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(dealer !== null ? { 'x-dealer': dealer } : {}) }, body: JSON.stringify(body) });

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}` });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Sale Buyer', state: 'TX' });
  const { token } = await r.json<{ token: string }>();
  expect((await post('/me/phone', as(token), { phone: PHONE })).status).toBe(200);
  expect((await post('/me/phone/verify', as(token), { code: '000000' })).status).toBe(200);
  expect((await post('/me/deposit', as(token))).status).toBe(200);
  await env.DB.prepare('UPDATE buyers SET push_token = ?2 WHERE id = ?1').bind(id, `ExponentPushToken[${id.replace(/[^A-Za-z0-9]/g, '').slice(0, 20).padEnd(8, 'x')}]`).run();
  return token;
}
/** Edit the object's stored lot in place (time travel for the clocks), keeping its cached copy in step. */
async function edit(id: string, f: (lot: any) => void) {
  await runInDurableObject(stub(id), async (inst: any, state) => {
    const lot = await state.storage.get<any>('lot'); f(lot);
    await state.storage.put('lot', lot); inst.lot = lot;
  });
}
/** Open, bid, and drop the hammer now. The dealer's /close is refused inside the soft close, so the clock is moved in the object. */
async function sold(id: string, dealerToken: string, gdn: string, buyerId: string) {
  const o = await post(`/lots/${id}/open`, as(dealerToken), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: car(gdn) });
  expect(o.status).toBe(200);
  const t = await buyer(buyerId);
  expect((await post(`/lots/${id}/bids`, as(t), { amount: 5000, max: 5000, key: crypto.randomUUID(), terms: TERMS })).status).toBe(200);
  await edit(id, l => { l.closesAt = Date.now() - 1; });
  await runInDurableObject(stub(id), (_i, state) => state.storage.setAlarm(Date.now()));
  await runDurableObjectAlarm(stub(id)); await settle();
  const lot = await (await SELF.fetch(`${base}/lots/${id}`)).json<any>();
  expect(lot.sale?.buyer).toBe(buyerId);
  return t;
}
const lotOf = async (id: string) => (await SELF.fetch(`${base}/lots/${id}`)).json<any>();
const payoutRow = (id: string) => env.DB.prepare('SELECT reason, state, amount, held, transfer_id, dealer FROM dealer_payouts WHERE lot_id = ?1').bind(id).first<any>();
const depositOf = async (id: string) => (await env.DB.prepare('SELECT deposit_status FROM buyers WHERE id = ?1').bind(id).first<{ deposit_status: string }>())?.deposit_status;
const event = (id: string) => env.DB.prepare('SELECT type, body FROM money_events WHERE id = ?1').bind(id).first<{ type: string; body: string }>();

/** Every outbound fetch the object makes: Expo pushes are recorded, Whop transfers answered, anything else passed through. */
type Call = { url: string; headers: Record<string, string>; body: any };
let calls: Call[] = [];
const realFetch = globalThis.fetch;
function intercept(transfer: () => Response = () => Response.json({ id: 'tr_test_1' })) {
  calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://exp.host/') || url.startsWith('https://whop.test/')) {
      calls.push({ url, headers: Object.fromEntries(new Headers(init?.headers).entries()), body: init?.body ? JSON.parse(String(init.body)) : null });
      return url.startsWith('https://whop.test/') ? transfer() : Response.json({ data: { status: 'ok' } });
    }
    return realFetch(input as RequestInfo, init);
  });
}
const pushes = () => calls.filter(c => c.url.startsWith('https://exp.host/')).map(c => ({ to: c.body.to, line: `${c.body.title} · ${c.body.body}`, screen: c.body.data?.screen }));
const transfers = () => calls.filter(c => c.url.startsWith('https://whop.test/'));
/** Whop configured inside the object only (a sandbox base that the interceptor answers). The key never leaves the test. */
const whopOn = (id: string) => runInDurableObject(stub(id), (inst: any) => { inst.env = { ...inst.env, WHOP_API_KEY: 'test-whop-key', WHOP_API_BASE: 'https://whop.test/api/v1' }; });

beforeEach(() => { intercept(); });   // no test reaches Expo or Whop for real
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });

describe('ownership on every dealer route, whatever the lot state', () => {
  it('another dealer gets 403 not_your_lot on a closed, sold lot: paid, pickup, void, close, lower floor, forfeit, copy', async () => {
    const own = await dealer('P700001'), other = await dealer('P700002');
    await sold('o1', own, 'P700001', 'sale-o1');
    for (const [path, body] of [['/paid', {}], ['/pickup', { vin: '000001' }], ['/void', { reason: 'x' }], ['/close', {}], ['/car', { collateral: { title: { status: 'hand' }, floor: 4000, insured: true } }], ['/open', { id: 'o1', dealer: 'P700002', start: 1, retail: 1, closesAt: Date.now() + 60_000 }]] as const) {
      const r = await post(`/lots/o1${path}`, as(other), body);
      expect(r.status, path).toBe(403); expect(await r.text()).toBe('not_your_lot');
    }
    for (const path of ['/forfeit', '/copy']) {
      const r = await direct('o1', path, 'P700002');
      expect(r.status, path).toBe(403); expect(await r.text()).toBe('not_your_lot');
    }
    const l = await lotOf('o1');
    expect(l.sale.paidAt).toBeUndefined(); expect(l.sale.voidedAt).toBeUndefined();
    // the lot's own dealer and the admin pass the check
    expect((await post('/lots/o1/paid', as(own))).status).toBe(200);
    expect((await direct('o1', '/copy', '')).status).toBe(200);   // the admin and the nightly reconciliation send no x-dealer
  });
  it('another dealer cannot lower the floor on an open lot', async () => {
    const own = await dealer('P700003'), other = await dealer('P700004');
    expect((await post('/lots/o2/open', as(own), { id: 'o2', dealer: 'P700003', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P700003') })).status).toBe(200);
    const r = await post('/lots/o2/car', as(other), { collateral: { title: { status: 'hand' }, floor: 4000, insured: true } });
    expect(r.status).toBe(403); expect(await r.text()).toBe('not_your_lot');
    expect((await lotOf('o2')).start).toBe(4900);
  });
});

describe('paid and pickup', () => {
  it('/paid refuses a voided sale; the balance paid at the lot and the release on void are money events', async () => {
    const d = await dealer('P700010');
    await sold('pv', d, 'P700010', 'sale-pv');
    const v = await post('/lots/pv/void', as(d), { reason: 'sold on the lot' });
    expect(v.status).toBe(200);
    const r = await post('/lots/pv/paid', as(d));
    expect(r.status).toBe(409); expect(await r.text()).toBe('sale_voided');
    const rel = await event('release:pv');
    expect(rel?.type).toBe('deposit.released'); expect(JSON.parse(rel!.body)).toMatchObject({ amount: 250, to: 'buyer', kind: 'non_delivery' });
    expect((await post('/lots/pv/void', as(d), { reason: 'again' })).status).toBe(409);   // once
    await sold('pp', d, 'P700010', 'sale-pp');
    expect((await post('/lots/pp/paid', as(d))).status).toBe(200);
    const paid = await event('paid:pp');
    expect(paid?.type).toBe('balance.paid_at_lot'); expect(JSON.parse(paid!.body)).toMatchObject({ hammer: 5000, balance: 5330.5 });
  });
  it('/pickup needs the six VIN characters and the payment, refuses a voided sale, and writes every refusal', async () => {
    const d = await dealer('P700011');
    await sold('pk', d, 'P700011', 'sale-pk');
    const noVin = await post('/lots/pk/pickup', as(d), {});
    expect(noVin.status).toBe(409); expect(await noVin.text()).toBe('vin_required');
    const short = await post('/lots/pk/pickup', as(d), { vin: '0001' });
    expect(await short.text()).toBe('vin_required');
    const unpaid = await post('/lots/pk/pickup', as(d), { vin: '000001' });
    expect(unpaid.status).toBe(409); expect(await unpaid.text()).toBe('not_paid');
    await post('/lots/pk/paid', as(d));
    const wrong = await post('/lots/pk/pickup', as(d), { vin: '999999' });
    expect(wrong.status).toBe(409); expect(await wrong.text()).toBe('wrong car');
    const rows = (await env.DB.prepare('SELECT reason, presented FROM pickup_refusals WHERE lot_id = ?1 ORDER BY id').bind('pk').all()).results;
    expect(rows).toEqual([{ reason: 'vin_required', presented: null }, { reason: 'vin_required', presented: '0001' }, { reason: 'not_paid', presented: '000001' }, { reason: 'wrong car', presented: '999999' }]);
    await sold('pz', d, 'P700011', 'sale-pz');
    await post('/lots/pz/void', as(d), { reason: 'It did not start' });
    const after = await post('/lots/pz/pickup', as(d), { vin: '000001' });
    expect(after.status).toBe(409); expect(await after.text()).toBe('sale_voided');
    const inc = await env.DB.prepare('SELECT kind, note FROM incidents WHERE lot_id = ?1').bind('pz').first();
    expect(inc).toEqual({ kind: 'no_start', note: 'It did not start' });
  });
});

describe('the deposit at the engine start', () => {
  it('becomes applied: a payout owed to the dealer, a deposit.applied event, and the release is refused after', async () => {
    const d = await dealer('P700020');
    const t = await sold('ap', d, 'P700020', 'sale-ap');
    await post('/lots/ap/paid', as(d));
    const r = await post('/lots/ap/pickup', as(d), { vin: '1N4AL3AP0EC000001' });
    expect(r.status).toBe(200);
    const l = await r.json<any>();
    expect(l.sale.startedAt).toBeGreaterThan(0); expect(l.sale.deposit).toBe('applied');
    expect(l.sale.payout).toEqual({ state: 'owed' });
    expect(await depositOf('sale-ap')).toBe('applied');
    expect(await payoutRow('ap')).toMatchObject({ reason: 'applied', state: 'owed', amount: 250, held: 1, transfer_id: null, dealer: 'P700020' });
    expect((await event('applied:ap'))?.type).toBe('deposit.applied');
    const rel = await post('/me/deposit/release', as(t));
    expect(rel.status).toBe(409);
    expect(await depositOf('sale-ap')).toBe('applied');
    expect((await post('/lots/ap/pickup', as(d), { vin: '000001' })).status).toBe(409);   // started once
    expect((await post('/lots/ap/void', as(d), { reason: 'x' })).status).toBe(409);     // a started sale is not voided
  });
});

describe('forfeit', () => {
  it('without a connected account: the payout is written and stays owed; nothing goes to Whop; the buyer and the dealer are told', async () => {
    const d = await dealer('P700030');
    await sold('f1', d, 'P700030', 'sale-f1');
    const early = await direct('f1', '/forfeit', 'P700030', { reason: 'buyer walked' });
    expect(early.status).toBe(409); expect(await early.text()).toBe('before_deadline');   // the dealer waits for the deadline
    await env.DB.prepare('UPDATE dealers SET push_token = ?2 WHERE gdn = ?1').bind('P700030', 'ExponentPushToken[deskP700030]').run();
    await whopOn('f1');   // Whop is ready, but this dealer has no connected account
    intercept();
    const r = await direct('f1', '/forfeit', '', { reason: 'buyer said no in writing' });   // the admin, any time
    expect(r.status).toBe(200);
    const l = await r.json<any>();
    expect(l.sale.forfeitedAt).toBeGreaterThan(0); expect(l.sale.deposit).toBe('to_dealer'); expect(l.sale.payout).toEqual({ state: 'owed' });
    expect(await payoutRow('f1')).toMatchObject({ reason: 'forfeit', state: 'owed', held: 1, transfer_id: null });
    expect(await depositOf('sale-f1')).toBe('forfeited');
    expect(JSON.parse((await event('forfeit:f1'))!.body)).toMatchObject({ reason: 'forfeit', to: 'dealer', amount: 250 });
    await settle();
    expect(transfers()).toEqual([]);
    expect(pushes()).toEqual([
      { to: 'ExponentPushToken[salef1xx]', line: 'Deposit forfeited · 2014 Nissan Altima', screen: 'me' },
      { to: 'ExponentPushToken[deskP700030]', line: 'Deposit forfeited · 2014 Nissan Altima · $250 is yours', screen: 'sold' },
    ]);
    const again = await direct('f1', '/forfeit', '', {});
    expect(again.status).toBe(409); expect(await again.text()).toBe('already_forfeited');
    expect((await post('/lots/f1/paid', as(d))).status).toBe(409);
  });
  it('with a connected account: a Whop transfer keyed forfeit:<lot>, the transfer id recorded, the payout sent', async () => {
    const d = await dealer('P700031');
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P700031', 'biz_dealer31').run();
    await sold('f2', d, 'P700031', 'sale-f2');
    await whopOn('f2');
    intercept();
    const r = await direct('f2', '/forfeit', '', { reason: 'no answer' });
    expect(r.status).toBe(200);
    expect((await r.json<any>()).sale.payout).toEqual({ state: 'sent', transferId: 'tr_test_1' });
    const [t] = transfers();
    expect(t.url).toBe('https://whop.test/api/v1/transfers');
    expect(t.headers['idempotency-key']).toBe('forfeit:f2');
    expect(t.body).toMatchObject({ amount: 250, currency: 'usd', destination_id: 'biz_dealer31', idempotence_key: 'forfeit:f2' });
    expect(await payoutRow('f2')).toMatchObject({ reason: 'forfeit', state: 'sent', transfer_id: 'tr_test_1' });
    expect((await event('payout:forfeit:f2'))?.type).toBe('payout.sent');
    expect((await lotOf('f2')).sale.payout).toEqual({ state: 'sent', transferId: 'tr_test_1' });
  });
  it('a refused transfer leaves the payout owed with the error, never the key', async () => {
    const d = await dealer('P700032');
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P700032', 'biz_dealer32').run();
    await sold('f3', d, 'P700032', 'sale-f3');
    await whopOn('f3');
    intercept(() => new Response('insufficient balance', { status: 422 }));
    expect((await (await direct('f3', '/forfeit', '', {})).json<any>()).sale.payout).toEqual({ state: 'owed' });
    const row = await env.DB.prepare('SELECT state, error FROM dealer_payouts WHERE lot_id = ?1').bind('f3').first<{ state: string; error: string }>();
    expect(row?.state).toBe('owed'); expect(row?.error).toContain('422'); expect(row?.error).not.toContain('test-whop-key');
  });
});

describe('the pay window', () => {
  it('Yours carries the deadline; pay-by at 24 h and 6 h before it; the no-pay forfeit at it', async () => {
    const d = await dealer('P700040');
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P700040', 'biz_dealer40').run();
    intercept();
    await sold('a1', d, 'P700040', 'sale-a1');
    const l = await lotOf('a1');
    expect(l.sale.deadlineAt - l.sale.wonAt).toBe(PAY_WINDOW_MS); expect(PAY_WINDOW_MS).toBe(48 * H);
    const by = payBy(l.sale.deadlineAt);
    expect(by).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2}(:\d{2})? (am|pm)$/);
    expect(pushes().at(-1)).toMatchObject({ line: `Yours · $5,000 · 2014 Nissan Altima · Pay by ${by}`, screen: 'won' });
    // the next alarm is 24 h before the deadline
    expect(await runInDurableObject(stub('a1'), (_i, s) => s.storage.getAlarm())).toBe(l.sale.deadlineAt - 24 * H);

    calls = [];
    let deadline = Date.now() + 24 * H - 1_000;
    deadline = deadline - (deadline % H) + 37 * 60_000 - (deadline % H < 37 * 60_000 ? H : 0);   // a deadline at :37 past the hour, still inside 24 h
    await edit('a1', x => { x.sale.deadlineAt = deadline; });
    await runDurableObjectAlarm(stub('a1')); await settle();
    expect(pushes()).toEqual([{ to: 'ExponentPushToken[salea1xx]', line: `Pay by ${payBy(deadline)} · ${BALANCE} · 24 h left`, screen: 'won' }]);
    expect(payBy(deadline)).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2}:37 (am|pm)$/);   // the minutes, as the Pay screen says them (CP9)
    expect(await runInDurableObject(stub('a1'), (_i, s) => s.storage.getAlarm())).toBe(deadline - 6 * H);

    calls = [];
    deadline = Date.now() + 6 * H - 1_000; await edit('a1', x => { x.sale.deadlineAt = deadline; });
    await runDurableObjectAlarm(stub('a1')); await settle();
    expect(pushes()).toEqual([{ to: 'ExponentPushToken[salea1xx]', line: `Pay by ${payBy(deadline)} · ${BALANCE} · 6 h left`, screen: 'won' }]);
    expect(await runInDurableObject(stub('a1'), (_i, s) => s.storage.getAlarm())).toBe(deadline);

    // at the deadline with no payment: the same forfeit path, reason no_pay, sent on Whop when Whop is configured
    calls = [];
    await whopOn('a1');
    await edit('a1', x => { x.sale.deadlineAt = Date.now() - 1; });
    await runDurableObjectAlarm(stub('a1')); await settle();
    const after = await lotOf('a1');
    expect(after.sale.forfeitedAt).toBeGreaterThan(0); expect(after.sale.deposit).toBe('to_dealer');
    expect(after.sale.payout).toEqual({ state: 'sent', transferId: 'tr_test_1' });
    expect(await payoutRow('a1')).toMatchObject({ reason: 'no_pay', state: 'sent' });
    expect(JSON.parse((await event('forfeit:a1'))!.body)).toMatchObject({ reason: 'no_pay' });
    expect(transfers()[0].headers['idempotency-key']).toBe('forfeit:a1');
    expect(pushes()).toEqual([{ to: 'ExponentPushToken[salea1xx]', line: 'Deposit forfeited · 2014 Nissan Altima', screen: 'me' }]);
  });
  it('a paid sale gets no reminder and never forfeits', async () => {
    const d = await dealer('P700041');
    intercept();
    await sold('a2', d, 'P700041', 'sale-a2');
    await post('/lots/a2/paid', as(d));
    calls = [];
    await edit('a2', x => { x.sale.deadlineAt = Date.now() - 1; });
    await runInDurableObject(stub('a2'), (_i, s) => s.storage.setAlarm(Date.now()));
    await runDurableObjectAlarm(stub('a2')); await settle();
    const l = await lotOf('a2');
    expect(l.sale.forfeitedAt).toBeUndefined(); expect(pushes()).toEqual([]);
    expect(await payoutRow('a2')).toBeNull();
  });
});

describe('close and reopen', () => {
  it('Sell It Now is refused inside the last two minutes of a lot with bids', async () => {
    const d = await dealer('P700050');
    expect((await post('/lots/c1/open', as(d), { id: 'c1', dealer: 'P700050', start: 4900, retail: 7995, closesAt: Date.now() + 60_000, car: car('P700050') })).status).toBe(200);
    expect((await post('/lots/c1/bids', as(await buyer('sale-c1')), { amount: 5000, max: 5000, key: 'k1', terms: TERMS })).status).toBe(200);
    const r = await post('/lots/c1/close', as(d));
    expect(r.status).toBe(409); expect(await r.text()).toBe('soft_close');
    expect((await post('/lots/c0/open', as(d), { id: 'c0', dealer: 'P700050', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P700050') })).status).toBe(200);
    expect((await post('/lots/c0/close', as(d))).status).toBe(200);   // no bids: Sell It Now ends it
  });
  it('re-opening an id that carries a sale is 409; an unsold closed id reopens', async () => {
    const d = await dealer('P700051');
    await sold('r1', d, 'P700051', 'sale-r1');
    const r = await post('/lots/r1/open', as(d), { id: 'r1', dealer: 'P700051', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P700051') });
    expect(r.status).toBe(409); expect(await r.text()).toBe('sale_exists');
    const a = await post('/lots/r1/open', ADMIN, { id: 'r1', dealer: 'P700051', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P700051') });
    expect(a.status).toBe(409);   // the admin too
    expect((await lotOf('r1')).sale.buyer).toBe('sale-r1');
    expect((await post('/lots/r2/open', as(d), { id: 'r2', dealer: 'P700051', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P700051') })).status).toBe(200);
    expect((await post('/lots/r2/close', as(d))).status).toBe(200);
    await runDurableObjectAlarm(stub('r2')); await settle();
    expect((await lotOf('r2')).closed?.sold).toBe(false);
    expect((await post('/lots/r2/open', as(d), { id: 'r2', dealer: 'P700051', start: 4500, retail: 7995, closesAt: Date.now() + 600_000, car: car('P700051') })).status).toBe(200);
  });
});
