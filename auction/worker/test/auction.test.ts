import { env, SELF, applyD1Migrations, runDurableObjectAlarm, listDurableObjectIds } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';

const DEALER = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const base = 'https://auction.test';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const CAR = { year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Triple J Auto', city: 'Houston', street: '100 Example St', gdn: 'P000000', phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } };
let token = '';

async function signIn(id: string) {
  const r = await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id, name: 'Test', state: 'TX' }) });
  const { token } = await r.json<{ token: string }>();
  const d = await SELF.fetch(`${base}/me/deposit`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: '{}' });
  expect(d.status).toBe(200);
  return token;
}
const open = (id: string, closesIn: number, start = 4900, headers: Record<string, string> = DEALER) =>
  SELF.fetch(`${base}/lots/${id}/open`, { method: 'POST', headers, body: JSON.stringify({ id, dealer: 'P000000', start, retail: 7995, closesAt: Date.now() + closesIn, car: CAR }) });
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

describe('whop', () => {
  it('a webhook without a valid signature is refused', async () => {
    const r = await SELF.fetch(`${base}/webhooks/whop`, { method: 'POST', headers: { 'webhook-id': 'msg_1', 'webhook-timestamp': String(Math.floor(Date.now() / 1000)), 'webhook-signature': 'v1,bad' }, body: '{}' });
    expect(r.status).toBe(401);
  });
  it('a signed payment.succeeded captures the deposit by metadata', async () => {
    const r0 = await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id: 'buyer-whop' }) });
    expect(r0.status).toBe(200);
    const body = JSON.stringify({ type: 'payment.succeeded', data: { id: 'pay_1', status: 'paid', usd_total: 250, metadata: { kind: 'deposit', buyer: 'buyer-whop' } } });
    const id = 'msg_2', ts = String(Math.floor(Date.now() / 1000));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('test-whop-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
    const sig = 'v1,' + btoa(String.fromCharCode(...mac));
    const r = await SELF.fetch(`${base}/webhooks/whop`, { method: 'POST', headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sig, 'content-type': 'application/json' }, body });
    expect(r.status).toBe(200);
    const row = await env.DB.prepare('SELECT deposit_status, deposit_ref FROM buyers WHERE id = ?1').bind('buyer-whop').first<{ deposit_status: string; deposit_ref: string }>();
    expect(row?.deposit_status).toBe('captured'); expect(row?.deposit_ref).toBe('pay_1');
    // and the same delivery again is a no-op
    const r2 = await SELF.fetch(`${base}/webhooks/whop`, { method: 'POST', headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sig, 'content-type': 'application/json' }, body });
    expect(r2.status).toBe(200);
  });
});

describe('the pilot', () => {
  let dealerToken = '';
  it('an admin mints a dealer token; the dealer opens with it; another dealer cannot touch the lot', async () => {
    const r = await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: DEALER, body: JSON.stringify({ gdn: 'P000000', name: 'Triple J Auto' }) });
    expect(r.status).toBe(200); dealerToken = (await r.json<{ token: string }>()).token;
    const h = { authorization: `Bearer ${dealerToken}`, 'content-type': 'application/json' };
    expect((await open('p1', 10 * 60_000, 4900, h)).status).toBe(200);
    const other = (await (await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: DEALER, body: JSON.stringify({ gdn: 'P111111', name: 'Other' }) })).json<{ token: string }>()).token;
    const c = await SELF.fetch(`${base}/lots/p1/close`, { method: 'POST', headers: { authorization: `Bearer ${other}`, 'content-type': 'application/json' } });
    expect(c.status).toBe(403);
    const forged = await open('p2', 10 * 60_000, 4900, { authorization: 'Bearer d:P000000.nope', 'content-type': 'application/json' });
    expect(forged.status).toBe(403);
  });
  it('photos and documents go to R2 and come back; documents need a token', async () => {
    const h = { authorization: `Bearer ${dealerToken}` };
    const p = await SELF.fetch(`${base}/lots/p1/photos/1.jpg`, { method: 'PUT', headers: { ...h, 'content-type': 'image/jpeg' }, body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) });
    expect(p.status).toBe(200); expect((await p.json<{ url: string }>()).url).toBe('/photos/p1/1.jpg');
    expect((await SELF.fetch(`${base}/photos/p1/1.jpg`)).status).toBe(200);
    const d = await SELF.fetch(`${base}/lots/p1/documents/guide.pdf`, { method: 'PUT', headers: { ...h, 'content-type': 'application/pdf' }, body: '%PDF-1.4' });
    expect(d.status).toBe(200);
    expect((await SELF.fetch(`${base}/documents/p1/guide.pdf`)).status).toBe(401);
    expect((await SELF.fetch(`${base}/documents/p1/guide.pdf`, { headers: { authorization: `Bearer ${token}` } })).status).toBe(200);
    const v = await SELF.fetch(`${base}/view?u=/documents/p1/guide.pdf&token=${encodeURIComponent(token)}`);
    expect(v.status).toBe(200); expect((await v.text())).toContain('pdfjs');
  });
  it('the hammer opens a sale with a 48 h deadline; pickup with the wrong VIN is refused; the right one starts the car', async () => {
    await open('p3', 5_000);
    await bid('p3', token, 5000);
    await SELF.fetch(`${base}/lots/p3/close`, { method: 'POST', headers: DEALER });
    const stub = env.AUCTION.get(env.AUCTION.idFromName('p3'));
    await runDurableObjectAlarm(stub); await new Promise(r => setTimeout(r, 60));
    const lot = await (await SELF.fetch(`${base}/lots/p3`)).json<any>();
    expect(lot.sale?.buyer).toBe('buyer-a'); expect(lot.sale.deadlineAt - lot.sale.wonAt).toBe(48 * 3_600_000);
    const wrong = await SELF.fetch(`${base}/lots/p3/pickup`, { method: 'POST', headers: DEALER, body: JSON.stringify({ vin: '999999' }) });
    expect(wrong.status).toBe(409);
    const right = await SELF.fetch(`${base}/lots/p3/pickup`, { method: 'POST', headers: DEALER, body: JSON.stringify({ vin: '000001' }) });
    expect(right.status).toBe(200); expect((await right.json<any>()).sale.startedAt).toBeGreaterThan(0);
  });
  it('a push token is kept; a bad one is refused', async () => {
    const bad = await SELF.fetch(`${base}/me/push`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ token: 'nope' }) });
    expect(bad.status).toBe(400);
    const ok = await SELF.fetch(`${base}/me/push`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ token: 'ExponentPushToken[abcdefghijklmnop]' }) });
    expect(ok.status).toBe(200);
  });
  it('the deposit comes back only when the buyer leads nothing', async () => {
    const c = await signIn('buyer-c');
    await open('p4', 10 * 60_000);
    await bid('p4', c, 5000);
    await new Promise(r => setTimeout(r, 60));
    expect((await SELF.fetch(`${base}/me/deposit/release`, { method: 'POST', headers: { authorization: `Bearer ${c}` } })).status).toBe(409);
    const d = await signIn('buyer-d');
    const r = await SELF.fetch(`${base}/me/deposit/release`, { method: 'POST', headers: { authorization: `Bearer ${d}` } });
    expect(r.status).toBe(200);
    const row = await env.DB.prepare('SELECT deposit_status FROM buyers WHERE id = ?1').bind('buyer-d').first<{ deposit_status: string }>();
    expect(row?.deposit_status).toBe('refunded');
  });
});

describe('collateral', () => {
  it('a lot without collateral the lane can see is refused', async () => {
    const r = await SELF.fetch(`${base}/lots/c1/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id: 'c1', dealer: 'P000000', start: 4900, retail: 7995, closesAt: Date.now() + 60_000, car: { ...CAR, collateral: { title: { status: 'repo' }, floor: 4900, insured: true } } }) });
    expect(r.status).toBe(422); expect(await r.text()).toMatch(/repossession/);
    const r2 = await SELF.fetch(`${base}/lots/c1/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id: 'c1', dealer: 'P000000', start: 4900, retail: 7995, closesAt: Date.now() + 60_000, car: { ...CAR, collateral: { title: { status: 'lender', payoff: 6000, releaseDays: 5 }, floor: 4900, insured: true } } }) });
    expect(r2.status).toBe(422); expect(await r2.text()).toMatch(/payoff/);
  });
  it('a void releases the deposit and counts against the dealer; the owner sees it in the exposure', async () => {
    await open('c2', 5_000);
    await bid('c2', token, 5000);
    await SELF.fetch(`${base}/lots/c2/close`, { method: 'POST', headers: DEALER });
    await runDurableObjectAlarm(env.AUCTION.get(env.AUCTION.idFromName('c2'))); await new Promise(r => setTimeout(r, 60));
    const v = await SELF.fetch(`${base}/lots/c2/void`, { method: 'POST', headers: DEALER, body: JSON.stringify({ reason: 'sold on the lot' }) });
    expect(v.status).toBe(200); expect((await v.json<any>()).sale.deposit).toBe('released');
    await new Promise(r => setTimeout(r, 60));
    const x = await (await SELF.fetch(`${base}/admin/exposure`, { headers: DEALER })).json<any>();
    expect(x.incidentsByDealer['P000000']).toBeGreaterThanOrEqual(1);
    expect(x.sales.find((s: any) => s.lotId === 'c2')?.state).toBe('voided');
    expect(x.deposits.reserveRatio).toBe(1); expect(x.obaviaFeesOwed).toBe(0);
    expect((await SELF.fetch(`${base}/admin/exposure`, { headers: { authorization: `Bearer ${token}` } })).status).toBe(403);
  });
  it('the floor only lowers, only before a bid, and moves the opening price with it', async () => {
    await open('c3', 5_000);
    const up = await SELF.fetch(`${base}/lots/c3/car`, { method: 'POST', headers: DEALER, body: JSON.stringify({ collateral: { title: { status: 'hand' }, floor: 5200, insured: true } }) });
    expect(up.status).toBe(409);
    const down = await SELF.fetch(`${base}/lots/c3/car`, { method: 'POST', headers: DEALER, body: JSON.stringify({ collateral: { title: { status: 'hand' }, floor: 4500, insured: true } }) });
    expect(down.status).toBe(200);
    const lot = await down.json<any>(); expect(lot.start).toBe(4500); expect(lot.high).toBe(4500); expect(lot.car.collateral.floor).toBe(4500);
    await bid('c3', token, 4500);
    const after = await SELF.fetch(`${base}/lots/c3/car`, { method: 'POST', headers: DEALER, body: JSON.stringify({ collateral: { title: { status: 'hand' }, floor: 4000, insured: true } }) });
    expect(after.status).toBe(409);
  });
});
