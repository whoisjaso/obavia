/* The four standard Meta events (src/marketing.ts, migration 0015): the no-op without the keys, the row every time, the
   SHA-256 of the phone and the email, Purchase with the hammer as value in USD, and that nothing leaves the Worker
   without META_PIXEL_ID and META_CAPI_TOKEN. Every rule here is in src/marketing.ts or src/index.ts. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import worker from '../src/index';
import { ACTION_SOURCE, GRAPH_BASE, GRAPH_VERSION, META_EVENTS, eventIdOf, metaPayload, metaReady, normalizeEmail, normalizePhone, record, sha256Hex, summary, userDataOf } from '../src/marketing';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Marketing Test Motors', city: 'Houston', street: '500 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });

const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const get = (path: string, headers: Record<string, string> = {}) => SELF.fetch(`${base}${path}`, { headers });
const withEnv = (extra: Partial<WorkerEnv>) => ({ ...env, ...extra }) as WorkerEnv;
const call = (e: WorkerEnv, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  worker.fetch(new Request(`${base}${path}`, { method: init.method ?? 'POST', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) }), e);
const META = { META_PIXEL_ID: '123456789', META_CAPI_TOKEN: 'EAAtest-token', META_TEST_EVENT_CODE: 'TEST4242' };
const WITH_META = withEnv(META);
const EVENTS_URL = `${GRAPH_BASE}/${GRAPH_VERSION}/123456789/events`;

type Row = { event: string; source_id: string; event_id: string; at: number; value: number | null; currency: string | null; sent: number; sent_at: number | null; error: string | null };
const rows = async (event?: string) => (await env.DB.prepare(`SELECT * FROM marketing_events ${event ? 'WHERE event = ?1' : ''} ORDER BY id`).bind(...(event ? [event] : [])).all<Row>()).results;

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}` });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
/** A buyer signed in with a proved number; the deposit is the caller's. */
async function signIn(id: string, phone = PHONE) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Marketing Buyer', state: 'TX' });
  const { token } = await r.json<{ token: string }>();
  expect((await post('/me/phone', as(token), { phone })).status).toBe(200);
  expect((await post('/me/phone/verify', as(token), { code: '000000' })).status).toBe(200);
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
/** Open, one bid at `amount`, the hammer, paid: a sale ready for pickup. */
async function readyForPickup(id: string, gdn: string, buyerId: string, amount: number, phone = PHONE) {
  const own = await dealer(gdn);
  expect((await post(`/lots/${id}/open`, as(own), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: car(gdn) })).status).toBe(200);
  const t = await signIn(buyerId, phone);
  expect((await post('/me/deposit', as(t))).status).toBe(200);
  expect((await post(`/lots/${id}/bids`, as(t), { amount, max: amount, key: crypto.randomUUID(), terms: TERMS })).status).toBe(200);
  await hammer(id);
  expect((await post(`/lots/${id}/paid`, as(own))).status).toBe(200);
  return own;
}

type Call = { url: string; method: string; headers: Record<string, string>; body: any };
let calls: Call[] = [];
let metaAnswer: () => Response = () => Response.json({ events_received: 1, fbtrace_id: 'x' });
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls = []; metaAnswer = () => Response.json({ events_received: 1, fbtrace_id: 'x' });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const known = ['https://exp.host/', 'https://graph.facebook.com/'].some(p => url.startsWith(p));
    if (!known) return realFetch(input as RequestInfo, init);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers).entries()), body });
    if (url.startsWith('https://exp.host/')) return Response.json({ data: { status: 'ok' } });
    return metaAnswer();
  });
});
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });
const metaCalls = () => calls.filter(c => c.url.startsWith('https://graph.facebook.com/'));

describe('the hashing', () => {
  it('SHA-256 as Meta wants it: the email lower-cased and trimmed, the phone as digits with the country code and no plus', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(normalizeEmail('  Ana@Lot.COM ')).toBe('ana@lot.com');
    expect(normalizePhone('+1 (214) 555-0142')).toBe('12145550142');
    expect(normalizePhone('2145550142')).toBe('12145550142');   // buyers.phone holds the ten digits
    const u = await userDataOf({ email: 'Ana@Lot.com', phone: PHONE, client: { ip: '203.0.113.7', userAgent: 'Desk/1' } });
    expect(u).toEqual({ em: [await sha256Hex('ana@lot.com')], ph: [await sha256Hex('12145550142')], client_ip_address: '203.0.113.7', client_user_agent: 'Desk/1' });
    expect(JSON.stringify(u)).not.toContain('2145550142');
    expect(JSON.stringify(u)).not.toContain('ana@');
    expect(await userDataOf({})).toEqual({});
  });
  it('the payload: the four names exactly, the id Meta deduplicates on, the source, the test code while set, and no name or address field', async () => {
    expect([...META_EVENTS]).toEqual(['Lead', 'CompleteRegistration', 'AddPaymentInfo', 'Purchase']);
    const p = await metaPayload({ META_TEST_EVENT_CODE: 'TEST4242' }, { event: 'Purchase', sourceId: 'lot-1', at: 1_800_000_000_123, value: 5400, currency: 'USD', phone: PHONE });
    expect(p.test_event_code).toBe('TEST4242');
    const d = (p.data as any[])[0];
    expect(d).toEqual({ event_name: 'Purchase', event_time: 1_800_000_000, event_id: await eventIdOf('Purchase', 'lot-1'), action_source: 'physical_store', user_data: { ph: [await sha256Hex('12145550142')] }, custom_data: { value: 5400, currency: 'USD' } });
    expect(Object.keys(d.user_data)).not.toContain('fn'); expect(Object.keys(d.user_data)).not.toContain('ln'); expect(Object.keys(d.user_data)).not.toContain('st');
    const q = await metaPayload({}, { event: 'Lead', sourceId: 'em:x', email: 'a@b.co', sourceUrl: 'https://obavia.co/#apply' });
    expect(q.test_event_code).toBeUndefined();
    expect((q.data as any[])[0].event_source_url).toBe('https://obavia.co/#apply');
    expect((q.data as any[])[0].custom_data).toBeUndefined();
    expect(ACTION_SOURCE).toEqual({ Lead: 'website', CompleteRegistration: 'website', AddPaymentInfo: 'website', Purchase: 'physical_store' });
    expect(await eventIdOf('AddPaymentInfo', 'capture:pay_1')).toBe(`AddPaymentInfo:${(await sha256Hex('capture:pay_1')).slice(0, 32)}`);   // the payment id never leaves in the clear
  });
});

describe('the sender', () => {
  it('without the keys it is a no-op that still records: a row with sent = 0, and nothing leaves', async () => {
    expect(metaReady(env)).toBe(false);
    expect(metaReady({ META_PIXEL_ID: '1' })).toBe(false);
    expect(metaReady({ META_CAPI_TOKEN: 't' })).toBe(false);
    expect(metaReady({ META_PIXEL_ID: ' ', META_CAPI_TOKEN: 't' })).toBe(false);
    const r = await record(env, { event: 'Lead', sourceId: 'unit-lead-1', at: 1_800_000_000_000, email: 'a@b.co' });
    expect(r).toEqual({ recorded: true, sent: false });
    const [row] = (await rows('Lead')).filter(x => x.source_id === 'unit-lead-1');
    expect(row).toMatchObject({ event: 'Lead', source_id: 'unit-lead-1', event_id: await eventIdOf('Lead', 'unit-lead-1'), at: 1_800_000_000_000, value: null, currency: null, sent: 0, sent_at: null, error: null });
    expect(metaCalls()).toHaveLength(0);
    // once per event and source: the second time records nothing and sends nothing, even with the keys
    expect(await record(WITH_META, { event: 'Lead', sourceId: 'unit-lead-1', email: 'a@b.co' })).toEqual({ recorded: false, sent: false });
    expect(metaCalls()).toHaveLength(0);
    expect((await rows('Lead')).filter(x => x.source_id === 'unit-lead-1')).toHaveLength(1);
  });
  it('with the keys it posts to the Conversions API with the token, the hashed identifiers and the test code, and the row says sent', async () => {
    const r = await record(WITH_META, { event: 'AddPaymentInfo', sourceId: 'unit-capture-1', at: 1_800_000_000_000, value: 250, currency: 'USD', phone: PHONE, client: { ip: '203.0.113.7', userAgent: 'App/1' } });
    expect(r).toEqual({ recorded: true, sent: true });
    expect(metaCalls()).toHaveLength(1);
    const c = metaCalls()[0];
    expect(c.url).toBe(EVENTS_URL); expect(c.method).toBe('POST');
    expect(c.headers.authorization).toBe('Bearer EAAtest-token');
    expect(c.body.test_event_code).toBe('TEST4242');
    expect(c.body.data[0]).toMatchObject({ event_name: 'AddPaymentInfo', event_id: await eventIdOf('AddPaymentInfo', 'unit-capture-1'), action_source: 'website', custom_data: { value: 250, currency: 'USD' }, user_data: { ph: [await sha256Hex('12145550142')], client_ip_address: '203.0.113.7', client_user_agent: 'App/1' } });
    expect(JSON.stringify(c.body)).not.toContain('2145550142');
    const [row] = (await rows('AddPaymentInfo')).filter(x => x.source_id === 'unit-capture-1');
    expect(row).toMatchObject({ sent: 1, value: 250, currency: 'USD', error: null }); expect(row.sent_at).toBeGreaterThan(0);
  });
  it('a refusal from Meta or a network error leaves the row with sent = 0 and the error, and never throws', async () => {
    metaAnswer = () => new Response('{"error":{"message":"Invalid OAuth access token"}}', { status: 400 });
    expect(await record(WITH_META, { event: 'Lead', sourceId: 'unit-lead-refused', email: 'a@b.co' })).toMatchObject({ recorded: true, sent: false, error: expect.stringContaining('meta 400') });
    let [row] = (await rows('Lead')).filter(x => x.source_id === 'unit-lead-refused');
    expect(row.sent).toBe(0); expect(row.error).toContain('meta 400');
    metaAnswer = () => { throw new Error('connection reset'); };
    expect(await record(WITH_META, { event: 'Lead', sourceId: 'unit-lead-down', email: 'a@b.co' })).toMatchObject({ recorded: true, sent: false, error: 'connection reset' });
    [row] = (await rows('Lead')).filter(x => x.source_id === 'unit-lead-down');
    expect(row.sent).toBe(0); expect(row.error).toBe('connection reset');
    expect(await record(WITH_META, { event: 'Checkout' as any, sourceId: 'x' })).toEqual({ recorded: false, sent: false, error: 'not_a_standard_event' });
    expect((await rows()).some(x => x.event === 'Checkout')).toBe(false);
  });
});

describe('AddPaymentInfo: the deposit captured', () => {
  it('POST /me/deposit records one row keyed on the ledger row, $250 USD, and sends nothing without the keys', async () => {
    const t = await signIn('mk-buyer-dep', '+12145550143');
    expect((await post('/me/deposit', as(t))).status).toBe(200);
    const ledger = await env.DB.prepare(`SELECT id FROM money_events WHERE type = 'deposit.captured' AND json_extract(body, '$.buyer') = ?1`).bind('mk-buyer-dep').first<{ id: string }>();
    expect(ledger?.id).toMatch(/^capture:dev:mk-buyer-dep:/);
    const mine = (await rows('AddPaymentInfo')).filter(r => r.source_id === ledger!.id);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ event_id: await eventIdOf('AddPaymentInfo', ledger!.id), value: 250, currency: 'USD', sent: 0 });
    expect(metaCalls()).toHaveLength(0);
    // never Purchase for a deposit
    expect((await rows('Purchase')).some(r => r.source_id === ledger!.id)).toBe(false);
  });
  it('with the keys the capture sends AddPaymentInfo with the buyer\'s number hashed and the caller\'s IP, never the number itself', async () => {
    const t = await signIn('mk-buyer-dep2', '+12145550144');
    const r = await call(WITH_META, '/me/deposit', { headers: { ...as(t), 'cf-connecting-ip': '198.51.100.9', 'user-agent': 'Obavia/1 (iPhone)' }, body: {} });
    expect(r.status).toBe(200);
    expect(metaCalls()).toHaveLength(1);
    const d = metaCalls()[0].body.data[0];
    expect(d.event_name).toBe('AddPaymentInfo');
    expect(d.custom_data).toEqual({ value: 250, currency: 'USD' });
    expect(d.user_data).toEqual({ ph: [await sha256Hex('12145550144')], client_ip_address: '198.51.100.9', client_user_agent: 'Obavia/1 (iPhone)' });
    expect(JSON.stringify(metaCalls()[0].body)).not.toContain('5550144');
    expect(JSON.stringify(metaCalls()[0].body)).not.toContain('Marketing Buyer');
    const ledger = await env.DB.prepare(`SELECT id FROM money_events WHERE type = 'deposit.captured' AND json_extract(body, '$.buyer') = ?1`).bind('mk-buyer-dep2').first<{ id: string }>();
    expect((await rows('AddPaymentInfo')).find(x => x.source_id === ledger!.id)?.sent).toBe(1);
  });
});

describe('Purchase: the car started at pickup (AD3)', () => {
  it('POST /lots/:id/pickup records Purchase with the hammer as value in USD, keyed on the lot, once; nothing leaves without the keys', async () => {
    const own = await readyForPickup('mk-p1', 'P770001', 'mk-buyer-p1', 5400, '+12145550145');
    expect((await rows('Purchase')).some(r => r.source_id === 'mk-p1')).toBe(false);   // paid is not started
    const wrong = await post('/lots/mk-p1/pickup', as(own), { vin: '999999' });
    expect(wrong.status).toBe(409);
    expect((await rows('Purchase')).some(r => r.source_id === 'mk-p1')).toBe(false);   // a refused pickup is no start
    const right = await post('/lots/mk-p1/pickup', as(own), { vin: '000001' });
    expect(right.status).toBe(200);
    const lot = await right.json<any>();
    expect(lot.sale.startedAt).toBeGreaterThan(0); expect(lot.sale.hammer).toBe(5400);
    const mine = (await rows('Purchase')).filter(r => r.source_id === 'mk-p1');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ event_id: await eventIdOf('Purchase', 'mk-p1'), at: lot.sale.startedAt, value: 5400, currency: 'USD', sent: 0, error: null });
    expect(metaCalls()).toHaveLength(0);
  });
  it('with the keys the start sends Purchase: value the hammer, currency USD, physical_store, the winner\'s number hashed', async () => {
    const own = await readyForPickup('mk-p2', 'P770002', 'mk-buyer-p2', 6100, '+12145550146');
    const r = await call(WITH_META, '/lots/mk-p2/pickup', { headers: as(own), body: { vin: '000001' } });
    expect(r.status).toBe(200);
    const sent = metaCalls().filter(c => c.body.data[0].event_name === 'Purchase');
    expect(sent).toHaveLength(1);
    const d = sent[0].body.data[0];
    expect(d).toMatchObject({ event_id: await eventIdOf('Purchase', 'mk-p2'), action_source: 'physical_store', custom_data: { value: 6100, currency: 'USD' }, user_data: { ph: [await sha256Hex('12145550146')] } });
    expect(d.event_source_url).toBeUndefined();
    expect(JSON.stringify(sent[0].body)).not.toContain('5550146');
    expect(JSON.stringify(sent[0].body)).not.toContain('mk-p2');
    expect((await rows('Purchase')).find(x => x.source_id === 'mk-p2')?.sent).toBe(1);
  });
});

describe('CompleteRegistration: the key kept in the Desk', () => {
  it('the Desk\'s first GET /dealers/me with a dealer key records it once per GDN; the admin key and a second call add nothing', async () => {
    const own = await dealer('P770003');
    expect((await get('/dealers/me', as(own))).status).toBe(200);
    expect((await get('/dealers/me', as(own))).status).toBe(200);
    const mine = (await rows('CompleteRegistration')).filter(r => r.source_id === 'P770003');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ event_id: await eventIdOf('CompleteRegistration', 'P770003'), sent: 0, value: null });
    expect((await get('/dealers/me', ADMIN)).status).toBe(403);
    expect((await rows('CompleteRegistration')).some(r => r.source_id === '*')).toBe(false);
    expect(metaCalls()).toHaveLength(0);
  });
  it('with the keys it sends the website event with the Desk\'s IP and user agent and no identifier of the dealer', async () => {
    const own = await dealer('P770004');
    const r = await call(WITH_META, '/dealers/me', { method: 'GET', headers: { ...as(own), 'cf-connecting-ip': '203.0.113.5', 'user-agent': 'Desk/1', origin: 'https://desk.obavia.co' } });
    expect(r.status).toBe(200);
    expect(metaCalls()).toHaveLength(1);
    const d = metaCalls()[0].body.data[0];
    expect(d).toMatchObject({ event_name: 'CompleteRegistration', event_id: await eventIdOf('CompleteRegistration', 'P770004'), action_source: 'website', event_source_url: 'https://desk.obavia.co', user_data: { client_ip_address: '203.0.113.5', client_user_agent: 'Desk/1' } });
    expect(JSON.stringify(metaCalls()[0].body)).not.toContain('P770004');
    expect(JSON.stringify(metaCalls()[0].body)).not.toContain('Dealer ');
  });
});

describe('GET /admin/marketing', () => {
  it('counts recorded and sent per event over the window, AD3\'s started ratio, and whether the keys are set; admin only', async () => {
    expect((await get('/admin/marketing')).status).toBe(403);
    expect((await get('/admin/marketing', as(await dealer('P770005')))).status).toBe(403);
    const r = await get('/admin/marketing', ADMIN);
    expect(r.status).toBe(200);
    const s = await r.json<any>();
    expect(s.days).toBe(30); expect(s.ready).toBe(false); expect(s.testEventCode).toBe(false);
    expect(Object.keys(s.events)).toEqual(['Lead', 'CompleteRegistration', 'AddPaymentInfo', 'Purchase']);
    for (const e of META_EVENTS) { expect(s.events[e].recorded).toBeGreaterThanOrEqual(s.events[e].sent); }
    expect(s.started.rows).toBeGreaterThanOrEqual(1);
    expect(s.started.sent).toBe(s.events.Purchase.sent);
    expect(s.started.ratio).toBe(Math.round((s.started.sent / s.started.rows) * 100) / 100);
    const narrow = await summary(WITH_META, 1, Date.now() + 2 * 86_400_000);   // a window with nothing in it
    expect(narrow.ready).toBe(true); expect(narrow.testEventCode).toBe(true);
    expect(narrow.events.Purchase).toEqual({ recorded: 0, sent: 0 }); expect(narrow.started).toEqual({ rows: 0, sent: 0, ratio: null });
    expect((await (await get('/admin/marketing?days=7', ADMIN)).json<any>()).days).toBe(7);
  });
});
