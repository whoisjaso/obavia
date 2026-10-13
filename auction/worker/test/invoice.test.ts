/* Wave 3-A: the fee gate (growth plan line 88; 43 TAC §215.85), the buyer's balance held on gap table deviation 2, the
   lender-first split held on deviation 5, Whop's invoice and transfer news, and the chargeback evidence. Every rule here
   is in src/fees.ts, src/invoice.ts or src/whop.ts. The routes are called through `invoices()` directly: W3-B mounts them. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import worker from '../src/index';
import { feeFor, feesOwedCents, platformRow, setPlatform } from '../src/fees';
import { balanceCents, invoices, markPaidAtLot, onWebhook, splitFor, uploadEvidence } from '../src/invoice';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
/** Title at a lender, $3,000 payoff, released in 7 days. Hammer 5,000: tax 312.50, title 33, registration 75, plate 10, doc 150 = 5,580.50; less $250 = 5,330.50. */
const car = (gdn: string, payoff = 3000) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'at lender',
  dealer: { name: 'Invoice Test Motors', city: 'Houston', street: '600 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } },
  collateral: { title: { status: 'lender', lienholder: 'Frost Bank', payoff, releaseDays: 7 }, floor: 4900, insured: true } });
const BALANCE_CENTS = 533050;

const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const withEnv = (extra: Partial<WorkerEnv>) => ({ ...env, ...extra }) as WorkerEnv;
const WHOP = withEnv({ WHOP_API_KEY: 'test-whop-key', WHOP_API_BASE: 'https://whop.test/api/v1', WHOP_ACCOUNT_ID: 'biz_obavia' });
const call = (e: WorkerEnv, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  worker.fetch(new Request(`${base}${path}`, { method: init.method ?? 'POST', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) }), e);
/** The /invoices/ routes, as W3-B will mount them. */
const inv = (e: WorkerEnv, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  invoices(new Request(`${base}${path}`, { method: init.method ?? 'GET', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) }), e);

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}` });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Invoice Buyer', state: 'TX' });
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
/** Open, one bid, the hammer: a sale with its deadline. Returns the buyer's token. */
async function sold(id: string, dealerToken: string, gdn: string, buyerId: string, payoff = 3000) {
  expect((await post(`/lots/${id}/open`, as(dealerToken), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: car(gdn, payoff) })).status).toBe(200);
  const t = await buyer(buyerId);
  expect((await post(`/lots/${id}/bids`, as(t), { amount: 5000, max: 5000, key: crypto.randomUUID(), terms: TERMS })).status).toBe(200);
  await edit(id, l => { l.closesAt = Date.now() - 1; });
  await runInDurableObject(stub(id), (_i, state) => state.storage.setAlarm(Date.now()));
  await runDurableObjectAlarm(stub(id)); await settle();
  expect((await lotOf(id)).sale?.buyer).toBe(buyerId);
  return t;
}
/** Paid at the lot and started: the sale is complete. */
async function started(id: string, dealerToken: string) {
  expect((await post(`/lots/${id}/paid`, as(dealerToken))).status).toBe(200);
  expect((await post(`/lots/${id}/pickup`, as(dealerToken), { vin: '1N4AL3AP0EC000001' })).status).toBe(200);
  await settle();
  const l = await lotOf(id);
  expect(l.sale.startedAt).toBeGreaterThan(0);
  return l;
}
const lotOf = async (id: string) => (await SELF.fetch(`${base}/lots/${id}`)).json<any>();
const feeEvents = async () => (await env.DB.prepare("SELECT id, type, body FROM money_events WHERE type LIKE 'fee.%'").all<{ id: string; type: string; body: string }>()).results;
const eventsOf = async (type: string) => (await env.DB.prepare('SELECT id, type, body FROM money_events WHERE type = ?1 ORDER BY received_at, id').bind(type).all<{ id: string; type: string; body: string }>()).results;
const invoiceRows = async (lot: string) => (await env.DB.prepare('SELECT * FROM invoices WHERE lot_id = ?1 ORDER BY kind').bind(lot).all<any>()).results;
const payoutRows = async (lot: string) => (await env.DB.prepare('SELECT id, reason, amount, state, held, note, transfer_id, cleared_at FROM dealer_payouts WHERE lot_id = ?1 ORDER BY id').bind(lot).all<any>()).results;

type Call = { url: string; method: string; headers: Record<string, string>; body: any };
let calls: Call[] = [];
let whopAnswer: (url: string, method: string, body: any) => Response = () => Response.json({ id: 'inv_default', status: 'open', pay_online_url: 'https://whop.test/pay/default' });
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls = []; whopAnswer = () => Response.json({ id: 'inv_default', status: 'open', pay_online_url: 'https://whop.test/pay/default' });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    const known = ['https://exp.host/', 'https://whop.test/', 'https://media.whop.test/', 'https://api.telnyx.com/'].some(p => url.startsWith(p));
    if (!known) return realFetch(input as RequestInfo, init);
    let body: any = null;
    if (init?.body && typeof init.body === 'string') { try { body = JSON.parse(init.body); } catch { body = init.body; } }
    else if (init?.body) body = { bytes: (init.body as Uint8Array).byteLength };
    calls.push({ url, method, headers: Object.fromEntries(new Headers(init?.headers).entries()), body });
    if (url.startsWith('https://exp.host/')) return Response.json({ data: { status: 'ok' } });
    if (url.startsWith('https://api.telnyx.com/')) return Response.json(url.endsWith('/verifications/sms') ? { data: { id: 'v1' } } : { data: { response_code: 'accepted' } });
    return whopAnswer(url, method, body);
  });
});
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });
const whopCalls = () => calls.filter(c => c.url.startsWith('https://whop.test/') || c.url.startsWith('https://media.whop.test/'));

describe('1. The fee gate (growth plan line 88; 43 TAC §215.85): no platform row, no fee', () => {
  it('a hammer, a start and a simulated invoice.paid with no platform row leave zero rows WHERE type LIKE fee.%, no fee invoice, and feeFor null', async () => {
    const d = await dealer('P910001');
    await sold('iv1', d, 'P910001', 'iv-b1');
    const lot = await started('iv1', d);
    expect(await platformRow(env)).toBeNull();
    expect(await feeFor(lot, WHOP)).toBeNull();
    expect(await onWebhook('invoice.paid', { id: 'inv_nobody', status: 'paid', payment: { id: 'pay_x' } }, WHOP)).toEqual({ handled: false, reason: 'unknown_invoice' });
    expect(await feeEvents()).toEqual([]);
    expect((await invoiceRows('iv1')).filter(r => r.kind === 'fee')).toEqual([]);
    expect(await feesOwedCents(env)).toBe(0);
    expect(whopCalls()).toHaveLength(0);
  });

  it('a car started before the GDN issued carries no fee; neither does a car not started', async () => {
    const d = await dealer('P910002');
    await sold('iv2', d, 'P910002', 'iv-b2');
    const unstarted = await lotOf('iv2');
    await setPlatform(env, { gdnIssuedAt: Date.now() + 86_400_000, feePerCarCents: 19900, feeMonthlyCents: 29900 });   // the GDN "issues" tomorrow
    expect(await feeFor(unstarted, WHOP)).toBeNull();
    const lot = await started('iv2', d);
    expect(await feeFor(lot, WHOP)).toBeNull();   // started before gdn_issued_at
    expect(await feeEvents()).toEqual([]);
    expect((await invoiceRows('iv2')).filter(r => r.kind === 'fee')).toEqual([]);
    await setPlatform(env, { gdnIssuedAt: null });   // back to not issued for the next test
    expect((await platformRow(env))?.gdnIssuedAt).toBeNull();
    expect(await feeFor(lot, WHOP)).toBeNull();
    expect(await feeEvents()).toEqual([]);
  });
});

describe('2. The fee once the GDN issues: one invoice to the dealer on Obavia\'s account, one fee row', () => {
  it('with the platform row set (DEV=1) and the dealer\'s billing email known: one fee invoice, one fee.invoiced row, Whop asked once, idempotent', async () => {
    const d = await dealer('P910011');
    await sold('iv11', d, 'P910011', 'iv-b11');
    await setPlatform(env, { gdnIssuedAt: Date.now() - 86_400_000, feePerCarCents: 19900, feeMonthlyCents: 29900 });   // the numbers are typed here, as the owner would on the admin page; never in src/
    const lot = await started('iv11', d);
    await env.DB.prepare('UPDATE dealers SET billing_email = ?2 WHERE gdn = ?1').bind('P910011', 'books@invoicetest.example').run();
    whopAnswer = () => Response.json({ id: 'inv_fee11', status: 'open', number: '#0007', pay_online_url: 'https://whop.test/pay/fee11', payment: null });
    const row = await feeFor(lot, WHOP);
    expect(row).toMatchObject({ id: 'fee:iv11', lot_id: 'iv11', kind: 'fee', payer: 'P910011', payee: 'biz_obavia', whop_id: 'inv_fee11', state: 'open', amount_cents: 19900, pay_url: 'https://whop.test/pay/fee11', error: null });
    const w = whopCalls();
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ method: 'POST', url: 'https://whop.test/api/v1/invoices' });
    expect(w[0].headers['idempotency-key']).toBe('fee:iv11');
    expect(w[0].body).toMatchObject({ account_id: 'biz_obavia', collection_method: 'send_invoice', email_address: 'books@invoicetest.example', customer_name: 'Dealer P910011', charge_buyer_fee: false,
      plan: { plan_type: 'one_time', initial_price: 199, currency: 'usd' }, product: { title: 'Obavia seller fee' }, line_items: [{ label: 'Seller fee · 2014 Nissan Altima', quantity: 1, unit_price: 199 }] });
    expect(typeof w[0].body.due_date).toBe('string');
    const fees = await feeEvents();
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ id: 'invoice:fee:iv11', type: 'fee.invoiced' });
    expect(JSON.parse(fees[0].body)).toMatchObject({ lotId: 'iv11', dealer: 'P910011', kind: 'fee', invoiceId: 'fee:iv11', whopId: 'inv_fee11', amountCents: 19900, amount: 199, actor: 'lane' });
    expect(fees[0].body).not.toContain('books@invoicetest.example');
    // again: the same row, Whop not asked twice, still one fee row
    calls = [];
    expect((await feeFor(lot, WHOP))?.whop_id).toBe('inv_fee11');
    expect(whopCalls()).toHaveLength(0);
    expect(await feeEvents()).toHaveLength(1);
    expect(await feesOwedCents(env)).toBe(19900);
    // the fee is never on the buyer's balance: the balance row of the same lot is the out-the-door total less the deposit, nothing more
    expect(balanceCents(lot)).toBe(BALANCE_CENTS);
    // Whop says the fee is paid: the row settles, fees owed drop, one invoice.settled row, a replay writes nothing
    expect(await onWebhook('invoice.paid', { id: 'inv_fee11', status: 'paid', payment: { id: 'pay_fee11' } }, WHOP)).toEqual({ handled: true, kind: 'fee', lotId: 'iv11' });
    expect((await invoiceRows('iv11')).find(r => r.kind === 'fee')).toMatchObject({ state: 'paid', payment_ref: 'pay_fee11' });
    expect(await feesOwedCents(env)).toBe(0);
    expect(await onWebhook('invoice.paid', { id: 'inv_fee11', status: 'paid', payment: { id: 'pay_fee11' } }, WHOP)).toEqual({ handled: true, replay: true, kind: 'fee', lotId: 'iv11' });
    expect((await eventsOf('invoice.settled')).filter(e => e.id === 'settled:fee:iv11')).toHaveLength(1);
  });

  it('without the dealer\'s billing email the fee row is held with the reason and no fee row is written; the email set, the next call opens it', async () => {
    const d = await dealer('P910012');
    await sold('iv12', d, 'P910012', 'iv-b12');
    const lot = await started('iv12', d);
    const held = await feeFor(lot, WHOP);
    expect(held).toMatchObject({ id: 'fee:iv12', state: 'held', whop_id: null, payee: null, error: 'billing_email_unknown', amount_cents: 19900 });
    expect(whopCalls()).toHaveLength(0);
    expect((await feeEvents()).filter(e => e.id.endsWith(':iv12'))).toEqual([]);
    // without Whop configured at all: held too, and nothing leaves
    expect((await feeFor(lot, env))?.error).toBe('whop_unavailable');
    expect(whopCalls()).toHaveLength(0);
    await env.DB.prepare('UPDATE dealers SET billing_email = ?2 WHERE gdn = ?1').bind('P910012', 'books12@invoicetest.example').run();
    whopAnswer = () => Response.json({ id: 'inv_fee12', status: 'open', pay_online_url: 'https://whop.test/pay/fee12' });
    expect(await feeFor(lot, WHOP)).toMatchObject({ state: 'open', whop_id: 'inv_fee12', error: null });
    expect(whopCalls()).toHaveLength(1);
    expect((await feeEvents()).filter(e => e.id.endsWith(':iv12'))).toHaveLength(1);
  });

  it('a Whop answer that is not an invoice, or a Whop refusal, stores nothing: the row stays held with the reason, no whop id, no fee row', async () => {
    const d = await dealer('P910013');
    await sold('iv13', d, 'P910013', 'iv-b13');
    const lot = await started('iv13', d);
    await env.DB.prepare('UPDATE dealers SET billing_email = ?2 WHERE gdn = ?1').bind('P910013', 'books13@invoicetest.example').run();
    whopAnswer = () => Response.json({ id: 'abc', status: 'open' });
    expect(await feeFor(lot, WHOP)).toMatchObject({ state: 'held', whop_id: null, payee: null, pay_url: null, error: 'whop_bad_invoice' });
    whopAnswer = () => Response.json({ id: 'inv_ok', status: 'surprise' });
    expect(await feeFor(lot, WHOP)).toMatchObject({ state: 'held', whop_id: null, error: 'whop_bad_invoice' });
    whopAnswer = () => Response.json({ id: 'inv_ok', status: 'open', pay_online_url: 'javascript:alert(1)' });
    expect(await feeFor(lot, WHOP)).toMatchObject({ state: 'held', whop_id: null, error: 'whop_bad_invoice' });
    whopAnswer = () => new Response('{"error":{"type":"invalid_request_error","message":"email books13@invoicetest.example rejected"}}', { status: 422 });
    const refused = await feeFor(lot, WHOP);
    expect(refused).toMatchObject({ state: 'held', whop_id: null });
    expect(refused!.error).toContain('422');
    expect(refused!.error).not.toContain('test-whop-key');
    expect((await feeEvents()).filter(e => e.id.endsWith(':iv13'))).toEqual([]);
    expect(whopCalls()).toHaveLength(4);
    // then Whop answers: one row, once
    whopAnswer = () => Response.json({ id: 'inv_fee13', status: 'open', pay_online_url: 'https://whop.test/pay/fee13' });
    expect(await feeFor(lot, WHOP)).toMatchObject({ state: 'open', whop_id: 'inv_fee13', error: null });
    expect((await feeEvents()).filter(e => e.id.endsWith(':iv13'))).toHaveLength(1);
  });

  it('setPlatform refuses bad numbers and writes nothing', async () => {
    const before = await platformRow(env);
    for (const bad of [{ feePerCarCents: -1 }, { feePerCarCents: 1.5 }, { gdnIssuedAt: 0 }, { balancePayee: 'obavia' as any }, { feeMonthlyCents: 'x' as any }]) {
      await expect(setPlatform(env, bad)).rejects.toThrow('bad_platform');
    }
    expect(await platformRow(env)).toEqual(before);
  });
});

describe('3. The balance: the lane\'s row at the hammer, held on deviation 2; the routes', () => {
  it('POST /invoices/:lot after the hammer writes the balance row (the total less the deposit) and asks Whop nothing while the payee is unnamed, even with keys and an email', async () => {
    await setPlatform(env, { balancePayee: null });
    const d = await dealer('P910021');
    const t = await sold('iv21', d, 'P910021', 'iv-b21');
    const r = await inv(WHOP, '/invoices/iv21', { method: 'POST', headers: as(d), body: { email: 'buyer21@example.com' } });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: 'balance:iv21', lotId: 'iv21', kind: 'balance', state: 'held', amountCents: BALANCE_CENTS, amountUsd: 5330.5, payUrl: null, whopId: null, held: 'payee_unnamed' });
    expect(whopCalls()).toHaveLength(0);
    expect(await eventsOf('balance.invoiced')).toEqual([]);
    // who may read: the sale's buyer sees the balance and never the fee; the dealer and the admin see both; strangers 403
    const asBuyer = await inv(WHOP, '/invoices/iv21', { headers: as(t) });
    expect(asBuyer.status).toBe(200);
    expect(await asBuyer.json()).toMatchObject({ lotId: 'iv21', balance: { state: 'held', amountCents: BALANCE_CENTS }, fee: null });
    expect((await (await inv(WHOP, '/invoices/iv21', { headers: as(d) })).json<any>()).balance.id).toBe('balance:iv21');
    expect((await inv(WHOP, '/invoices/iv21', { headers: ADMIN })).status).toBe(200);
    const other = await dealer('P910022');
    expect((await inv(WHOP, '/invoices/iv21', { headers: as(other) })).status).toBe(403);
    const stranger = await buyer('iv-b21x');
    expect((await inv(WHOP, '/invoices/iv21', { headers: as(stranger) })).status).toBe(403);
    expect((await inv(WHOP, '/invoices/iv21')).status).toBe(403);
    expect((await inv(WHOP, '/invoices/iv21', { method: 'POST', headers: as(d), body: { email: 'not an email' } })).status).toBe(400);
    expect((await inv(WHOP, '/invoices/no-such-lot', { headers: ADMIN })).status).toBe(404);
    // no sale yet: 409
    expect((await post('/lots/iv21o/open', as(d), { id: 'iv21o', dealer: 'P910021', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P910021') })).status).toBe(200);
    await settle();
    expect((await inv(WHOP, '/invoices/iv21o', { method: 'POST', headers: as(d) })).status).toBe(409);
    expect((await invoiceRows('iv21o'))).toEqual([]);
  });

  it('with the owner\'s line written (balance_payee = dealer) and the dealer\'s connected account: the invoice is created on the dealer\'s account, due at the pay deadline; without an email it stays held', async () => {
    const d = await dealer('P910023');
    const t = await sold('iv23', d, 'P910023', 'iv-b23');
    await setPlatform(env, { balancePayee: 'dealer' });
    // the dealer has no connected account yet: held, with the reason
    const noAcct = await (await inv(WHOP, '/invoices/iv23', { method: 'POST', headers: as(t), body: { email: 'buyer23@example.com' } })).json<any>();
    expect(noAcct).toMatchObject({ state: 'held', held: 'dealer_account_unknown' });
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P910023', 'biz_dealer23').run();
    const noEmail = await (await inv(WHOP, '/invoices/iv23', { method: 'POST', headers: as(d) })).json<any>();
    expect(noEmail).toMatchObject({ state: 'held', held: 'email_unknown' });
    expect(whopCalls()).toHaveLength(0);
    whopAnswer = () => Response.json({ id: 'inv_bal23', status: 'open', number: '#0012', pay_online_url: 'https://whop.test/pay/bal23', payment: null, payment_processing: false });
    const r = await inv(WHOP, '/invoices/iv23', { method: 'POST', headers: as(t), body: { email: 'buyer23@example.com' } });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ state: 'open', whopId: 'inv_bal23', payUrl: 'https://whop.test/pay/bal23', amountCents: BALANCE_CENTS, held: null });
    const lot = await lotOf('iv23');
    const w = whopCalls();
    expect(w).toHaveLength(1);
    expect(w[0].headers['idempotency-key']).toBe('balance:iv23');
    expect(w[0].body).toMatchObject({ account_id: 'biz_dealer23', collection_method: 'send_invoice', email_address: 'buyer23@example.com', customer_name: 'Invoice Buyer', due_date: new Date(lot.sale.deadlineAt).toISOString(),
      plan: { plan_type: 'one_time', initial_price: 5330.5, currency: 'usd' }, line_items: [{ label: 'Balance · 2014 Nissan Altima · less the $250 deposit', quantity: 1, unit_price: 5330.5 }] });
    expect(w[0].body.account_id).not.toBe('biz_obavia');   // never Obavia's account (decisions §9 D5)
    const ev = await eventsOf('balance.invoiced');
    expect(ev).toHaveLength(1);
    expect(JSON.parse(ev[0].body)).toMatchObject({ lotId: 'iv23', dealer: 'P910023', buyer: 'iv-b23', whopId: 'inv_bal23', amountCents: BALANCE_CENTS, actor: 'lane' });
    expect(ev[0].body).not.toContain('buyer23@example.com');
    expect((await invoiceRows('iv23')).find(x => x.kind === 'balance')).toMatchObject({ payee: 'biz_dealer23', whop_id: 'inv_bal23' });
    // again: the same row, Whop not asked twice
    calls = [];
    expect((await (await inv(WHOP, '/invoices/iv23', { method: 'POST', headers: as(d), body: { email: 'other@example.com' } })).json<any>()).whopId).toBe('inv_bal23');
    expect(whopCalls()).toHaveLength(0);
    await setPlatform(env, { balancePayee: null });
  });
});

describe('4. Paid at the lot, invoice.paid, and the lender-first split (held on deviation 5)', () => {
  it('POST /invoices/:lot/paid: the row paid_at_lot, the open Whop invoice voided, invoice.settled once; two payout rows (lender, applied_net) owed and not held; the retry sends neither; once', async () => {
    const d = await dealer('P910031');
    const t = await sold('iv31', d, 'P910031', 'iv-b31');
    await setPlatform(env, { balancePayee: 'dealer' });
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P910031', 'biz_dealer31').run();
    whopAnswer = () => Response.json({ id: 'inv_bal31', status: 'open', pay_online_url: 'https://whop.test/pay/bal31' });
    expect((await (await inv(WHOP, '/invoices/iv31', { method: 'POST', headers: as(t), body: { email: 'buyer31@example.com' } })).json<any>()).state).toBe('open');
    await setPlatform(env, { balancePayee: null });
    calls = [];
    expect((await inv(WHOP, '/invoices/iv31/paid', { method: 'POST', headers: as(t) })).status).toBe(403);   // the buyer does not say the dealer was paid
    whopAnswer = () => Response.json({ id: 'inv_bal31', status: 'void' });
    const r = await inv(WHOP, '/invoices/iv31/paid', { method: 'POST', headers: as(d) });
    expect(r.status).toBe(200);
    const out = await r.json<any>();
    expect(out).toMatchObject({ state: 'paid_at_lot', whopId: 'inv_bal31' });
    expect(out.paidAt).toBeGreaterThan(0);
    const w = whopCalls();
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ method: 'POST', url: 'https://whop.test/api/v1/invoices/inv_bal31/void' });
    const settled = (await eventsOf('invoice.settled')).filter(e => e.id === 'settled:balance:iv31');
    expect(settled).toHaveLength(1);
    expect(JSON.parse(settled[0].body)).toMatchObject({ lotId: 'iv31', dealer: 'P910031', buyer: 'iv-b31', kind: 'balance', how: 'at_lot', whopId: 'inv_bal31', amountCents: BALANCE_CENTS, actor: 'dealer' });
    // the split: the lienholder first, then the net; both owed, neither held (nothing is transferred until deviation 5 has its line)
    expect(await payoutRows('iv31')).toEqual([
      { id: 'applied_net:iv31', reason: 'applied_net', amount: 1750, state: 'owed', held: 0, note: null, transfer_id: null, cleared_at: null },
      { id: 'lender:iv31', reason: 'lender', amount: 3000, state: 'owed', held: 0, note: 'Frost Bank', transfer_id: null, cleared_at: null },
    ]);
    const split = await eventsOf('payout.split');
    expect(split.filter(e => e.id === 'split:iv31')).toHaveLength(1);
    expect(JSON.parse(split.find(e => e.id === 'split:iv31')!.body)).toMatchObject({ lotId: 'iv31', dealer: 'P910031', hammer: 5000, lender: 3000, net: 1750, deposit: 250, lienholder: 'Frost Bank' });
    // the admin's retry (POST /dealers/account) transfers nothing for either row
    calls = [];
    whopAnswer = () => Response.json({ id: 'tr_should_not_happen' });
    const retry = await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P910031', account: 'biz_dealer31' } });
    expect(retry.status).toBe(200);
    expect(whopCalls().filter(c => c.url.endsWith('/transfers'))).toHaveLength(0);
    expect((await payoutRows('iv31')).every(p => p.state === 'owed')).toBe(true);
    // once: a second /paid answers the same row and writes nothing new
    calls = [];
    expect((await (await inv(WHOP, '/invoices/iv31/paid', { method: 'POST', headers: as(d) })).json<any>()).state).toBe('paid_at_lot');
    expect(whopCalls()).toHaveLength(0);
    expect(await payoutRows('iv31')).toHaveLength(2);
    expect((await eventsOf('invoice.settled')).filter(e => e.id === 'settled:balance:iv31')).toHaveLength(1);
    // a refused void still settles the row (the money is the dealer's own); the refusal is kept, never the key
    const d2 = await dealer('P910032');
    const t2 = await sold('iv32', d2, 'P910032', 'iv-b32');
    await setPlatform(env, { balancePayee: 'dealer' });
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P910032', 'biz_dealer32').run();
    whopAnswer = () => Response.json({ id: 'inv_bal32', status: 'open', pay_online_url: 'https://whop.test/pay/bal32' });
    await inv(WHOP, '/invoices/iv32', { method: 'POST', headers: as(t2), body: { email: 'buyer32@example.com' } });
    await setPlatform(env, { balancePayee: null });
    whopAnswer = () => new Response('{"error":{"type":"invalid_request_error","message":"already paid"}}', { status: 422 });
    const row32 = await markPaidAtLot('iv32', WHOP);
    expect(row32).toMatchObject({ state: 'paid_at_lot', whop_id: 'inv_bal32' });
    expect(row32!.error).toContain('422');
    expect(row32!.error).not.toContain('test-whop-key');
  });

  it('a lot with the title in hand splits into the net alone; markPaidAtLot writes the balance row when the hammer never did', async () => {
    const d = await dealer('P910033');
    await sold('iv33', d, 'P910033', 'iv-b33', 0);
    // W3-B's index.ts may already write the balance row at the hammer (held); with or without it, markPaidAtLot ends on the same row
    expect((await invoiceRows('iv33')).every(r => r.id === 'balance:iv33' && r.state === 'held')).toBe(true);
    const row = await markPaidAtLot('iv33', env);
    expect(row).toMatchObject({ id: 'balance:iv33', state: 'paid_at_lot', whop_id: null, amount_cents: BALANCE_CENTS });
    expect(await payoutRows('iv33')).toEqual([{ id: 'applied_net:iv33', reason: 'applied_net', amount: 4750, state: 'owed', held: 0, note: null, transfer_id: null, cleared_at: null }]);
    expect(await markPaidAtLot('no-such-lot', env)).toBeNull();
    expect(await splitFor({ id: 'iv33' } as any, env)).toBeNull();   // no sale on the object given: nothing
  });

  it('invoice.paid on an open balance: the row paid with the payment, the lot learns paidAt, the split is written; a replay, an unknown id and a bad shape write nothing', async () => {
    const d = await dealer('P910034');
    const t = await sold('iv34', d, 'P910034', 'iv-b34');
    await setPlatform(env, { balancePayee: 'dealer' });
    await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind('P910034', 'biz_dealer34').run();
    whopAnswer = () => Response.json({ id: 'inv_bal34', status: 'open', pay_online_url: 'https://whop.test/pay/bal34' });
    expect((await (await inv(WHOP, '/invoices/iv34', { method: 'POST', headers: as(t), body: { email: 'buyer34@example.com' } })).json<any>()).state).toBe('open');
    await setPlatform(env, { balancePayee: null });
    expect((await lotOf('iv34')).sale.paidAt).toBeUndefined();
    const before = (await env.DB.prepare('SELECT COUNT(*) AS n FROM money_events').first<{ n: number }>())!.n;
    expect(await onWebhook('invoice.paid', { id: 'inv_bal34', status: 'paid', payment: { id: 'pay_bal34' }, pay_online_url: 'https://whop.test/pay/bal34' }, WHOP)).toEqual({ handled: true, kind: 'balance', lotId: 'iv34' });
    expect((await invoiceRows('iv34')).find(x => x.kind === 'balance')).toMatchObject({ state: 'paid', payment_ref: 'pay_bal34', error: null });
    await settle();
    expect((await lotOf('iv34')).sale.paidAt).toBeGreaterThan(0);
    expect(await payoutRows('iv34')).toMatchObject([{ id: 'applied_net:iv34', amount: 1750, held: 0 }, { id: 'lender:iv34', amount: 3000, held: 0 }]);
    const settled = (await eventsOf('invoice.settled')).find(e => e.id === 'settled:balance:iv34');
    expect(JSON.parse(settled!.body)).toMatchObject({ kind: 'balance', how: 'whop', paymentRef: 'pay_bal34', actor: 'whop' });
    const after = (await env.DB.prepare('SELECT COUNT(*) AS n FROM money_events').first<{ n: number }>())!.n;
    // replay, unknown, bad shapes: nothing more is written
    expect(await onWebhook('invoice.paid', { id: 'inv_bal34', status: 'paid', payment: { id: 'pay_bal34' } }, WHOP)).toEqual({ handled: true, replay: true, kind: 'balance', lotId: 'iv34' });
    expect(await onWebhook('invoice.paid', { id: 'inv_unknown', status: 'paid' }, WHOP)).toEqual({ handled: false, reason: 'unknown_invoice' });
    expect(await onWebhook('invoice.paid', { id: 42 }, WHOP)).toEqual({ handled: false, reason: 'bad_shape' });
    expect(await onWebhook('invoice.paid', null, WHOP)).toEqual({ handled: false, reason: 'bad_shape' });
    expect(await onWebhook('invoice.paid', { id: 'inv_bal34; DROP TABLE invoices', status: 'paid' }, WHOP)).toEqual({ handled: false, reason: 'bad_shape' });
    expect(await onWebhook('payment.succeeded', { id: 'pay_x' }, WHOP)).toEqual({ handled: false, reason: 'ignored' });
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM money_events').first<{ n: number }>())!.n).toBe(after);
    expect(after - before).toBe(3);   // invoice.settled, payout.split, and the object's own balance.paid_at_lot row (src/auction.ts POST /paid; the type is W3-B's to rename)
    expect(await payoutRows('iv34')).toHaveLength(2);
    // invoice.voided on a paid row changes nothing; on an open row it voids
    expect(await onWebhook('invoice.voided', { id: 'inv_bal34', status: 'void' }, WHOP)).toEqual({ handled: true, replay: true, kind: 'balance', lotId: 'iv34' });
    expect((await invoiceRows('iv34')).find(x => x.kind === 'balance')!.state).toBe('paid');
  });

  it('transfer.completed on a sent payout: cleared_at and payout.cleared once; by the transfer id or the key; unknown and bad shapes write nothing', async () => {
    const d = await dealer('P910035');
    await sold('iv35', d, 'P910035', 'iv-b35');
    await started('iv35', d);   // applied:<lot> owed
    whopAnswer = () => Response.json({ id: 'tr_35' });
    expect((await call(WHOP, '/dealers/account', { headers: ADMIN, body: { gdn: 'P910035', account: 'biz_dealer35' } })).status).toBe(200);
    expect((await payoutRows('iv35')).find(p => p.id === 'applied:iv35')).toMatchObject({ state: 'sent', transfer_id: 'tr_35', cleared_at: null });
    expect(await onWebhook('transfer.completed', { id: 'tr_35', status: 'succeeded', amount: 250, metadata: { key: 'applied:iv35' } }, WHOP)).toEqual({ handled: true, kind: 'payout', lotId: 'iv35' });
    const row = (await payoutRows('iv35')).find(p => p.id === 'applied:iv35');
    expect(row.cleared_at).toBeGreaterThan(0);
    const cleared = await eventsOf('payout.cleared');
    expect(cleared.filter(e => e.id === 'cleared:tr_35')).toHaveLength(1);
    expect(JSON.parse(cleared.find(e => e.id === 'cleared:tr_35')!.body)).toMatchObject({ lotId: 'iv35', dealer: 'P910035', amount: 250, payoutId: 'applied:iv35', transferId: 'tr_35', actor: 'whop' });
    expect(await onWebhook('transfer.completed', { id: 'tr_35' }, WHOP)).toEqual({ handled: true, replay: true, kind: 'payout', lotId: 'iv35' });
    expect(await onWebhook('transfer.completed', { id: 'tr_nobody' }, WHOP)).toEqual({ handled: false, reason: 'unknown_transfer' });
    expect(await onWebhook('transfer.completed', { metadata: { key: 'applied:iv35' } }, WHOP)).toEqual({ handled: false, reason: 'bad_shape' });
    expect(await onWebhook('transfer.completed', 'tr_35', WHOP)).toEqual({ handled: false, reason: 'bad_shape' });
    expect(cleared).toHaveLength((await eventsOf('payout.cleared')).length);
  });
});

describe('5. The chargeback evidence onto the dispute', () => {
  const bytes = new TextEncoder().encode('%PDF-1.4 evidence pack stand-in');
  it('without WHOP_API_KEY: not sent, nothing leaves, nothing written', async () => {
    expect(await uploadEvidence('dspt_1', bytes, env)).toEqual({ sent: false, reason: 'whop_unavailable' });
    expect(calls).toHaveLength(0);
    expect(await eventsOf('dispute.evidence')).toEqual([]);
    expect(await uploadEvidence('bad id!', bytes, WHOP)).toEqual({ sent: false, reason: 'bad_dispute_id' });
    expect(await uploadEvidence('dspt_1', new Uint8Array(0), WHOP)).toEqual({ sent: false, reason: 'bad_size' });
    expect(calls).toHaveLength(0);
  });

  it('with keys: the file record, the bytes to the presigned URL with its headers, the pack on the dispute\'s uncategorized slot; one dispute.evidence row; attach only, never submit', async () => {
    whopAnswer = (url, method) => {
      if (url === 'https://whop.test/api/v1/files' && method === 'POST') return Response.json({ id: 'file_ev1', upload_url: 'https://media.whop.test/u/ev1', upload_headers: { 'x-amz-acl': 'private' }, upload_status: 'pending', url: null });
      if (url.startsWith('https://media.whop.test/')) return new Response(null, { status: 200 });
      if (url === 'https://whop.test/api/v1/disputes/dspt_2' && method === 'PATCH') return Response.json({ id: 'dspt_2' });
      return new Response('unexpected', { status: 500 });
    };
    const r = await uploadEvidence('dspt_2', bytes, WHOP);
    expect(r).toMatchObject({ sent: true, fileId: 'file_ev1' });
    const w = whopCalls();
    expect(w.map(c => `${c.method} ${c.url}`)).toEqual(['POST https://whop.test/api/v1/files', 'PUT https://media.whop.test/u/ev1', 'PATCH https://whop.test/api/v1/disputes/dspt_2']);
    expect(w[0].body).toEqual({ filename: 'obavia-evidence-dspt_2.pdf', visibility: 'private' });
    expect(w[1].headers).toMatchObject({ 'x-amz-acl': 'private', 'content-type': 'application/pdf' });
    expect(w[1].body).toEqual({ bytes: bytes.byteLength });
    expect(w[2].body).toMatchObject({ evidence: { uncategorized_attachment: { id: 'file_ev1' } } });
    expect(typeof w[2].body.evidence.notes).toBe('string');
    expect(w.some(c => c.url.includes('submit_evidence'))).toBe(false);
    const ev = await eventsOf('dispute.evidence');
    expect(ev).toHaveLength(1);
    expect(JSON.parse(ev[0].body)).toEqual({ disputeId: 'dspt_2', fileId: 'file_ev1', bytes: bytes.byteLength, actor: 'lane' });
  });

  it('a file answer that is not a file stores nothing and uploads nothing; a failed upload attaches nothing', async () => {
    whopAnswer = () => Response.json({ id: 'nope', upload_url: 'https://media.whop.test/u/x' });
    expect(await uploadEvidence('dspt_3', bytes, WHOP)).toEqual({ sent: false, reason: 'whop_bad_file' });
    expect(whopCalls()).toHaveLength(1);
    whopAnswer = (url) => url.startsWith('https://media.whop.test/') ? new Response(null, { status: 403 }) : Response.json({ id: 'file_ev3', upload_url: 'https://media.whop.test/u/ev3', upload_headers: {} });
    const r = await uploadEvidence('dspt_3', bytes, WHOP);
    expect(r.sent).toBe(false);
    expect((r as { reason: string }).reason).toContain('403');
    expect(whopCalls().some(c => c.method === 'PATCH')).toBe(false);
    expect((await eventsOf('dispute.evidence')).filter(e => e.id === 'evidence:dspt_3')).toEqual([]);
  });
});
