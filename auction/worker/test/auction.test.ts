import { env, SELF, applyD1Migrations, runDurableObjectAlarm, listDurableObjectIds } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';

const DEALER = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const base = 'https://auction.test';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
let token = '';

async function signIn(id: string) {
  const r = await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id, name: 'Test', state: 'TX' }) });
  const { token } = await r.json<{ token: string }>();
  const d = await SELF.fetch(`${base}/me/deposit`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: '{}' });
  expect(d.status).toBe(200);
  return token;
}
const open = (id: string, closesIn: number, start = 4900) =>
  SELF.fetch(`${base}/lots/${id}/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id, dealer: 'P000000', start, retail: 7995, closesAt: Date.now() + closesIn }) });
const bid = (id: string, tok: string, amount: number, max = amount, key = crypto.randomUUID()) =>
  SELF.fetch(`${base}/lots/${id}/bids`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount, max, key }) });

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  token = await signIn('buyer-a');
});

describe('admission', () => {
  it('no token, no bid', async () => {
    await open('l0', 60_000);
    const r = await SELF.fetch(`${base}/lots/l0/bids`, { method: 'POST', body: JSON.stringify({ amount: 5000, max: 5000, key: 'x' }) });
    expect(r.status).toBe(401);
  });
  it('no deposit, no bid', async () => {
    const r = await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id: 'buyer-nodep' }) });
    const { token: t } = await r.json<{ token: string }>();
    expect((await bid('l0', t, 5000)).status).toBe(402);
  });
  it('a forged token is refused', async () => {
    const r = await bid('l0', 'buyer-a.notasignature', 5000);
    expect(r.status).toBe(401);
  });
  it('only the dealer opens a lot', async () => {
    const r = await SELF.fetch(`${base}/lots/l1/open`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(r.status).toBe(403);
  });
});

describe('the object', () => {
  it('acks a bid with the price the buyer named and the lead', async () => {
    await open('l2', 10 * 60_000);
    const r = await bid('l2', token, 5100, 5600);
    const a = await r.json<any>();
    expect(a.ok).toBe(true); expect(a.youLead).toBe(true);
    expect(a.lot.high).toBe(5100); expect(a.lot.bids).toBe(1);
    expect(a.lot.max).toBeUndefined();          // the ceiling never leaves the object
  });
  it('is idempotent on the key', async () => {
    await open('l3', 10 * 60_000);
    const key = 'same-key';
    const a = await (await bid('l3', token, 5000, 5000, key)).json<any>();
    const b = await (await bid('l3', token, 5000, 5000, key)).json<any>();
    expect(b).toEqual(a);
    expect((await (await SELF.fetch(`${base}/lots/l3`)).json<any>()).bids).toBe(1);
  });
  it('a bid in the last two minutes refills the close to exactly 2:00', async () => {
    await open('l4', 30_000);
    const before = Date.now();
    const a = await (await bid('l4', token, 5000)).json<any>();
    expect(a.lot.closesAt - before).toBeGreaterThanOrEqual(119_000);
    expect(a.lot.closesAt - before).toBeLessThanOrEqual(121_000);
  });
  it('the alarm drops the hammer and a late bid is stamped', async () => {
    await open('l5', 5_000);
    await bid('l5', token, 5000);                 // refills to 2:00, so the hammer waits
    const ids = await listDurableObjectIds(env.AUCTION);
    expect(ids.length).toBeGreaterThan(0);
    // bring the close forward as the dealer, then fire the alarm
    await SELF.fetch(`${base}/lots/l5/close`, { method: 'POST', headers: DEALER });
    const stub = env.AUCTION.get(env.AUCTION.idFromName('l5'));
    await runDurableObjectAlarm(stub);            // false if the runtime already fired it: a past time fires at once
    await new Promise(r => setTimeout(r, 60));
    const lot = await (await SELF.fetch(`${base}/lots/l5`)).json<any>();
    expect(lot.closed?.sold).toBe(true);
    const late = await (await bid('l5', token, 6000)).json<any>();
    expect(late.ok).toBe(false); expect(late.reason).toBe('closed'); expect(late.lateByMs).toBeGreaterThanOrEqual(0);
  });
  it('a standing ceiling beats a lower challenger and says outbid', async () => {
    await open('l6', 10 * 60_000);
    const b = await signIn('buyer-b');
    await bid('l6', token, 4900, 6000);
    const r = await (await bid('l6', b, 5000, 5200)).json<any>();
    expect(r.ok).toBe(false); expect(r.reason).toBe('outbid');
    expect(r.lot.leader).toBe('buyer-a'); expect(r.lot.high).toBe(5450);
  });
  it('the copy in D1 follows the object', async () => {
    await open('l7', 10 * 60_000);
    await bid('l7', token, 5000);
    await new Promise(r => setTimeout(r, 50));
    const row = await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind('l7').first<{ lot: string }>();
    expect(JSON.parse(row!.lot).high).toBe(5000);
    const lane = await (await SELF.fetch(`${base}/lots`)).json<any[]>();
    expect(lane.find((l: any) => l.id === 'l7')?.max).toBeUndefined();
  });
});
