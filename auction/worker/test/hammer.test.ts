/* The hammer at read time. The alarm can run tens of seconds after closesAt on a loaded box (the Phase 1 walk on the
   real Worker saw about 90 s); before this, a read in that window showed closed.sold with no sale, so the Desk showed
   Done with no Sold and the phone opened Won with no deadline. Now every read past the close writes the sale the alarm
   would have written, once, and the alarm after it is a no-op. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import { PAY_WINDOW_MS } from '../src/auction';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const DEALER = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const base = 'https://auction.test';
const TERMS = '2026-10-13';
const CAR = { year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Triple J Auto', city: 'Houston', street: '100 Example St', gdn: 'P000000', phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } };

beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });

const stub = (id: string) => env.AUCTION.get(env.AUCTION.idFromName(id));
const lotOf = async (id: string) => (await SELF.fetch(`${base}/lots/${id}`)).json<any>();
const open = (id: string) => SELF.fetch(`${base}/lots/${id}/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id, dealer: 'P000000', start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: CAR }) });
async function buyer(id: string, phone: string) {
  const t = (await (await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id, name: 'Test', state: 'TX' }) })).json<{ token: string }>()).token;
  const h = { authorization: `Bearer ${t}`, 'content-type': 'application/json' };
  expect((await SELF.fetch(`${base}/me/phone`, { method: 'POST', headers: h, body: JSON.stringify({ phone }) })).status).toBe(200);
  expect((await SELF.fetch(`${base}/me/phone/verify`, { method: 'POST', headers: h, body: JSON.stringify({ code: '000000' }) })).status).toBe(200);
  expect((await SELF.fetch(`${base}/me/deposit`, { method: 'POST', headers: h, body: '{}' })).status).toBe(200);
  return t;
}
const bid = (id: string, t: string, amount: number) => SELF.fetch(`${base}/lots/${id}/bids`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount, max: amount, key: crypto.randomUUID(), terms: TERMS }) });
/** The close deadline passes with no alarm: the window the walk saw, held open deliberately. */
async function pastCloseNoAlarm(id: string) {
  const run = runInDurableObject as unknown as (s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => Promise<void>) => Promise<void>;
  await run(stub(id) as unknown as DurableObjectStub, async (inst, state) => {
    const lot = await state.storage.get<any>('lot'); lot.closesAt = Date.now() - 1;
    await state.storage.put('lot', lot); inst.lot = lot; await state.storage.deleteAlarm();
  });
}
const alarmAt = async (id: string) => {
  const run = runInDurableObject as unknown as (s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => Promise<number | null>) => Promise<number | null>;
  return run(stub(id) as unknown as DurableObjectStub, async (_i, state) => state.storage.getAlarm());
};
const yoursPushes = async (id: string) => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM money_events WHERE type = 'deposit.captured' AND json_extract(body, '$.lotId') = ?1`).bind(id).first<{ n: number }>())?.n ?? 0;

describe('the hammer at read time', () => {
  it('a read after the close deadline returns the sale with its deadlineAt in the same response; the alarm after it changes nothing', async () => {
    expect((await open('h1')).status).toBe(200);
    const t = await buyer('hammer-b1', '+12145550161');
    expect((await bid('h1', t, 5000)).status).toBe(200);
    await pastCloseNoAlarm('h1');
    expect(await alarmAt('h1')).toBeNull();   // the window: closesAt is past and nothing has fired
    const lot = await lotOf('h1');
    expect(lot.closed).toEqual({ at: lot.closesAt, sold: true });
    expect(lot.sale).toMatchObject({ buyer: 'hammer-b1', hammer: 5000, wonAt: lot.closesAt, deposit: 'held' });
    expect(lot.sale.deadlineAt).toBe(lot.closed.at + PAY_WINDOW_MS);   // the deadline the Won screen and the Desk show, in the same read
    expect(await alarmAt('h1')).toBe(lot.sale.deadlineAt - 24 * 3_600_000);   // the read scheduled the pay-by pushes, as the alarm would have
    // the alarm now: a no-op on the hammer (the sale is not rewritten, the deadline does not move)
    await runDurableObjectAlarm(stub('h1')); await new Promise(r => setTimeout(r, 60));
    const after = await lotOf('h1');
    expect(after.sale).toEqual(lot.sale); expect(after.closed).toEqual(lot.closed);
    expect(await alarmAt('h1')).toBe(lot.sale.deadlineAt - 24 * 3_600_000);
    // the copy followed the read, not the alarm
    const row = await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind('h1').first<{ lot: string }>();
    expect(JSON.parse(row!.lot).sale.deadlineAt).toBe(lot.sale.deadlineAt);
    expect(await yoursPushes('h1')).toBe(0);   // nothing on the money ledger for a hammer: the deposit stays captured until the start
  });
  it('a late bid finds the lot sold with its sale in the ack', async () => {
    expect((await open('h2')).status).toBe(200);
    const a = await buyer('hammer-b2', '+12145550162'), b = await buyer('hammer-b3', '+12145550163');
    expect((await bid('h2', a, 5000)).status).toBe(200);
    await pastCloseNoAlarm('h2');
    const late = await (await bid('h2', b, 6000)).json<any>();
    expect(late.ok).toBe(false); expect(late.reason).toBe('closed'); expect(late.lateByMs).toBeGreaterThanOrEqual(0);
    expect(late.lot.closed.sold).toBe(true);
    expect(late.lot.sale).toMatchObject({ buyer: 'hammer-b2', hammer: 5000 });
    expect(late.lot.sale.deadlineAt).toBe(late.lot.closed.at + PAY_WINDOW_MS);
  });
  it('a read past the close of a lot with no bids closes it unsold, no sale, as the alarm does; before the close a read changes nothing', async () => {
    expect((await open('h3')).status).toBe(200);
    const before = await lotOf('h3');
    expect(before.closed).toBeUndefined(); expect(before.sale).toBeUndefined();
    await pastCloseNoAlarm('h3');
    const lot = await lotOf('h3');
    expect(lot.closed).toEqual({ at: lot.closesAt, sold: false }); expect(lot.sale).toBeUndefined();
    expect(await alarmAt('h3')).toBeNull();   // nothing to schedule without a sale
  });
  it('the live socket\'s first frame carries the sale past the close', async () => {
    expect((await open('h4')).status).toBe(200);
    const t = await buyer('hammer-b4', '+12145550164');
    expect((await bid('h4', t, 5000)).status).toBe(200);
    await pastCloseNoAlarm('h4');
    const r = await SELF.fetch(`${base}/lots/h4/live?token=${encodeURIComponent(t)}`, { headers: { upgrade: 'websocket' } });
    expect(r.status).toBe(101);
    const ws = r.webSocket!; ws.accept();
    const first = await new Promise<any>(res => ws.addEventListener('message', e => res(JSON.parse(String(e.data))), { once: true }));
    ws.close();
    expect(first.lot.closed.sold).toBe(true);
    expect(first.lot.sale.deadlineAt).toBe(first.lot.closed.at + PAY_WINDOW_MS);
  });
});
