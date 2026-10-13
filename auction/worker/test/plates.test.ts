/* The plates clock on a started sale (phases.md Phase 2 Paperwork: filed, approved, mailed, kickback): who may mark it,
   the order it moves in, the socket frame, the D1 copy and the event row, the public shape, and the one push (mailed).
   Every rule is in src/auction.ts POST /plates. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import { PLATES_NEXT } from '../src/auction';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const VIN = '1N4AL3AP0EC000001';
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: VIN, photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Plates Test Motors', city: 'Houston', street: '200 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });

const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const plates = (id: string, tok: string, state: string, note?: string) => post(`/lots/${id}/plates`, as(tok), note === undefined ? { state } : { state, note });
const lotOf = async (id: string) => (await SELF.fetch(`${base}/lots/${id}`)).json<any>();

async function dealer(gdn: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}` });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Plates Buyer', state: 'TX' });
  const { token } = await r.json<{ token: string }>();
  expect((await post('/me/phone', as(token), { phone: PHONE })).status).toBe(200);
  expect((await post('/me/phone/verify', as(token), { code: '000000' })).status).toBe(200);
  expect((await post('/me/deposit', as(token))).status).toBe(200);
  await env.DB.prepare('UPDATE buyers SET push_token = ?2 WHERE id = ?1').bind(id, `ExponentPushToken[${id.replace(/[^A-Za-z0-9]/g, '').slice(0, 20).padEnd(8, 'x')}]`).run();
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
/** Sold, paid at the lot, VIN scanned: the sale has started. The pushes before this point are dropped. */
async function started(id: string, dealerToken: string, gdn: string, buyerId: string) {
  const t = await sold(id, dealerToken, gdn, buyerId);
  expect((await post(`/lots/${id}/paid`, as(dealerToken))).status).toBe(200);
  expect((await post(`/lots/${id}/pickup`, as(dealerToken), { vin: VIN.slice(-6) })).status).toBe(200);
  await settle(); calls = [];
  return t;
}

type Call = { url: string; body: any };
let calls: Call[] = [];
const realFetch = globalThis.fetch;
function intercept() {
  calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://exp.host/') || url.startsWith('https://whop.test/')) {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
      return Response.json({ data: { status: 'ok' } });
    }
    return realFetch(input as RequestInfo, init);
  });
}
const pushes = () => calls.filter(c => c.url.startsWith('https://exp.host/')).map(c => ({ to: c.body.to, line: `${c.body.title} · ${c.body.body}`, screen: c.body.data?.screen, lotId: c.body.data?.lotId }));
const events = (id: string) => env.DB.prepare("SELECT id, type, body FROM money_events WHERE type = 'sale.plates' AND json_extract(body, '$.lotId') = ?1 ORDER BY received_at, id").bind(id).all<{ id: string; type: string; body: string }>().then(r => r.results.map(x => ({ id: x.id, type: x.type, ...JSON.parse(x.body) })));
const copyOf = (id: string) => env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind(id).first<{ lot: string }>().then(r => JSON.parse(r!.lot));

beforeEach(() => { intercept(); });
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });

describe('who may mark the plates', () => {
  it('no key, a buyer token and another dealer are refused; the lot\'s dealer and the admin pass', async () => {
    const own = await dealer('P900001'), other = await dealer('P900002');
    const t = await started('pl1', own, 'P900001', 'plates-b1');
    let r = await post('/lots/pl1/plates', { 'content-type': 'application/json' }, { state: 'filed' });
    expect(r.status).toBe(403); expect(await r.text()).toBe('dealer only');
    r = await plates('pl1', t, 'filed');
    expect(r.status).toBe(403); expect(await r.text()).toBe('dealer only');
    r = await plates('pl1', other, 'filed');
    expect(r.status).toBe(403); expect(await r.text()).toBe('not_your_lot');
    expect((await lotOf('pl1')).sale.plates).toBeUndefined();
    r = await plates('pl1', own, 'filed');
    expect(r.status).toBe(200);
    expect((await r.json<any>()).sale.plates).toMatchObject({ state: 'filed' });
    r = await post('/lots/pl1/plates', ADMIN, { state: 'approved' });   // the admin key passes every dealer route
    expect(r.status).toBe(200);
    expect((await lotOf('pl1')).sale.plates.state).toBe('approved');
  });
});

describe('when the plates may move', () => {
  it('409 no sale on an open lot, and 409 not_started on a sale won, then paid, until the VIN scan', async () => {
    const own = await dealer('P900003');
    expect((await post('/lots/pl2/open', as(own), { id: 'pl2', dealer: 'P900003', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: car('P900003') })).status).toBe(200);
    let r = await plates('pl2', own, 'filed');
    expect(r.status).toBe(409); expect(await r.text()).toBe('no sale');
    await edit('pl2', l => { l.closesAt = Date.now() - 1; });   // closes unsold: still no sale
    await runInDurableObject(stub('pl2'), (_i, state) => state.storage.setAlarm(Date.now()));
    await runDurableObjectAlarm(stub('pl2')); await settle();
    r = await plates('pl2', own, 'filed');
    expect(r.status).toBe(409); expect(await r.text()).toBe('no sale');

    await sold('pl3', own, 'P900003', 'plates-b3');
    r = await plates('pl3', own, 'filed');
    expect(r.status).toBe(409); expect(await r.text()).toBe('not_started');
    expect((await post('/lots/pl3/paid', as(own))).status).toBe(200);
    r = await plates('pl3', own, 'filed');
    expect(r.status).toBe(409); expect(await r.text()).toBe('not_started');
    expect((await post('/lots/pl3/pickup', as(own), { vin: VIN.slice(-6) })).status).toBe(200);
    r = await plates('pl3', own, 'filed');
    expect(r.status).toBe(200);
    expect((await lotOf('pl3')).sale.plates.state).toBe('filed');
  });
  it('a voided sale is 409 sale_voided', async () => {
    const own = await dealer('P900004');
    await sold('pl4', own, 'P900004', 'plates-b4');
    expect((await post('/lots/pl4/void', as(own), { reason: 'It did not start' })).status).toBe(200);
    const r = await plates('pl4', own, 'filed');
    expect(r.status).toBe(409); expect(await r.text()).toBe('sale_voided');
  });
  it('a forfeited sale is 409 sale_forfeited', async () => {
    const own = await dealer('P900005');
    await sold('pl5', own, 'P900005', 'plates-b5');
    expect((await post('/admin/lots/pl5/forfeit', ADMIN, { reason: 'no show' })).status).toBe(200);
    const r = await plates('pl5', own, 'filed');
    expect(r.status).toBe(409); expect(await r.text()).toBe('sale_forfeited');
  });
});

describe('the order', () => {
  it('filed, approved, mailed, forward only; a bad word is 400; the same word again changes nothing; nothing follows mailed', async () => {
    const own = await dealer('P900006');
    await started('pl6', own, 'P900006', 'plates-b6');
    for (const state of ['approved', 'mailed', 'kickback']) {   // nothing but filed comes first
      const r = await plates('pl6', own, state);
      expect(r.status, state).toBe(409); expect(await r.text()).toBe('plates_order');
    }
    let r = await plates('pl6', own, 'shipped');
    expect(r.status).toBe(400); expect(await r.text()).toBe('bad_state');
    r = await plates('pl6', own, 'filed'); expect(r.status).toBe(200);
    const filedAt = (await r.json<any>()).sale.plates.at;
    expect(filedAt).toBeGreaterThan(0);
    r = await plates('pl6', own, 'filed'); expect(r.status).toBe(200);   // a retried tap
    expect((await lotOf('pl6')).sale.plates).toEqual({ state: 'filed', at: filedAt });
    r = await plates('pl6', own, 'mailed');   // not before approved
    expect(r.status).toBe(409); expect(await r.text()).toBe('plates_order');
    r = await plates('pl6', own, 'approved'); expect(r.status).toBe(200);
    for (const state of ['filed', 'kickback']) {   // no way back from approved
      r = await plates('pl6', own, state);
      expect(r.status, state).toBe(409); expect(await r.text()).toBe('plates_order');
    }
    r = await plates('pl6', own, 'mailed'); expect(r.status).toBe(200);
    for (const state of ['filed', 'approved', 'kickback']) {
      r = await plates('pl6', own, state);
      expect(r.status, state).toBe(409); expect(await r.text()).toBe('plates_order');
    }
    expect((await lotOf('pl6')).sale.plates.state).toBe('mailed');
    expect((await events('pl6')).map(e => e.state)).toEqual(['filed', 'approved', 'mailed']);   // the retried tap wrote no row
  });
  it('a kickback follows filed, carries the county\'s note, and is followed by filed again, then approved', async () => {
    const own = await dealer('P900007');
    await started('pl7', own, 'P900007', 'plates-b7');
    expect((await plates('pl7', own, 'filed')).status).toBe(200);
    let r = await plates('pl7', own, 'kickback', '  Odometer reading missing on the 130-U  ');
    expect(r.status).toBe(200);
    expect((await r.json<any>()).sale.plates).toMatchObject({ state: 'kickback', note: 'Odometer reading missing on the 130-U' });
    for (const state of ['approved', 'mailed']) {
      r = await plates('pl7', own, state);
      expect(r.status, state).toBe(409); expect(await r.text()).toBe('plates_order');
    }
    r = await plates('pl7', own, 'filed'); expect(r.status).toBe(200);
    const again = (await r.json<any>()).sale.plates;
    expect(again.state).toBe('filed'); expect(again.note).toBeUndefined();   // the note belongs to the kickback, not the refiling
    expect((await plates('pl7', own, 'approved')).status).toBe(200);
    expect((await events('pl7')).map(e => [e.from, e.state, e.note])).toEqual([[null, 'filed', null], ['filed', 'kickback', 'Odometer reading missing on the 130-U'], ['kickback', 'filed', null], ['filed', 'approved', null]]);
  });
  it('the table says the same', () => {
    expect(PLATES_NEXT).toEqual({ none: ['filed'], filed: ['approved', 'kickback'], kickback: ['filed'], approved: ['mailed'], mailed: [] });
  });
});

describe('what leaves the object', () => {
  const live = (id: string, token: string) => SELF.fetch(`${base}/lots/${id}/live?token=${encodeURIComponent(token)}`, { headers: { upgrade: 'websocket' } });
  const next = (ws: WebSocket) => new Promise<any>(res => ws.addEventListener('message', e => res(JSON.parse(String(e.data))), { once: true }));
  it('the socket frame reaches the buyer and the dealer as kind sale with the plates and nothing secret', async () => {
    const own = await dealer('P900008');
    const t = await started('pl8', own, 'P900008', 'plates-b8');
    const b = await live('pl8', t), d = await live('pl8', own);
    expect(b.status).toBe(101); expect(d.status).toBe(101);
    const bws = b.webSocket!, dws = d.webSocket!;
    const bHello = next(bws), dHello = next(dws); bws.accept(); dws.accept();
    expect((await bHello).lot.sale.plates).toBeUndefined(); expect((await dHello).lot.id).toBe('pl8');
    const bFrame = next(bws), dFrame = next(dws);
    expect((await plates('pl8', own, 'filed')).status).toBe(200);
    for (const f of [await bFrame, await dFrame]) {
      expect(f.kind).toBe('sale'); expect(f.lotId).toBe('pl8');
      expect(f.lot.sale.plates).toMatchObject({ state: 'filed' });
      expect(f.lot.dealer).toBeUndefined(); expect(f.lot.max).toBeUndefined(); expect(f.lot.sale.contact).toBeUndefined();
    }
    bws.close(); dws.close();
  });
  it('the D1 copy and the event row carry the state; the public lot and the lane show it to anyone', async () => {
    const own = await dealer('P900009');
    await started('pl9', own, 'P900009', 'plates-b9');
    expect((await plates('pl9', own, 'filed')).status).toBe(200);
    await settle();
    expect((await copyOf('pl9')).sale.plates).toMatchObject({ state: 'filed' });
    const rows = await events('pl9');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: 'sale.plates', lotId: 'pl9', buyer: 'plates-b9', dealer: 'P900009', state: 'filed', from: null, note: null, actor: 'dealer' });
    expect(rows[0].id).toMatch(/^plates:pl9:\d+$/);
    expect(rows[0].amount).toBeUndefined();   // money-free
    const pub = await lotOf('pl9');   // no key at all
    expect(pub.sale.plates).toMatchObject({ state: 'filed' }); expect(pub.sale.contact).toBeUndefined(); expect(pub.dealer).toBeUndefined();
    const lane = await (await SELF.fetch(`${base}/lots`)).json<any[]>();
    expect(lane.find(l => l.id === 'pl9')?.sale?.plates?.state).toBe('filed');
    // the admin's money page reads the row with no amount
    const money = await (await SELF.fetch(`${base}/admin/money`, { headers: ADMIN })).json<any>();
    const ev = money.events.find((e: any) => e.id === rows[0].id);
    expect(ev).toMatchObject({ type: 'sale.plates', amountUsd: null, lotId: 'pl9', buyer: 'plates-b9', actor: 'dealer' });
  });
});

describe('the one push', () => {
  it('mailed pushes the buyer "Plates mailed" with the car\'s name, to won; filed, kickback and approved push nothing', async () => {
    const own = await dealer('P900010');
    await started('pl10', own, 'P900010', 'plates-b10');
    expect((await plates('pl10', own, 'filed')).status).toBe(200);
    expect((await plates('pl10', own, 'kickback', 'wrong county')).status).toBe(200);
    expect((await plates('pl10', own, 'filed')).status).toBe(200);
    expect((await plates('pl10', own, 'approved')).status).toBe(200);
    await settle();
    expect(pushes()).toEqual([]);
    expect((await plates('pl10', own, 'mailed')).status).toBe(200);
    await settle();
    expect(pushes()).toEqual([{ to: 'ExponentPushToken[platesb10]', line: 'Plates mailed · 2014 Nissan Altima', screen: 'won', lotId: 'pl10' }]);
    expect((await plates('pl10', own, 'mailed')).status).toBe(200);   // the same word again: no second push (AD10)
    await settle();
    expect(pushes()).toHaveLength(1);
  });
});
