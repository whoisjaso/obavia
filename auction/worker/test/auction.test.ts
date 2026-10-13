import { env, SELF, applyD1Migrations, runDurableObjectAlarm, listDurableObjectIds } from 'cloudflare:test';
import worker from '../src/index';
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
const TERMS = '2026-10-13';   // decisions §9 D10; the app sends it with the first bid
const bid = (id: string, tok: string, amount: number, max = amount, key = crypto.randomUUID(), extra: Record<string, unknown> = { terms: TERMS }) =>
  SELF.fetch(`${base}/lots/${id}/bids`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount, max, key, ...extra }) });

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
    const t = await signIn('buyer-l5');   // one buyer per lot from here: a buyer leading four lots is at the win cap (D15)
    await bid('l5', t, 5000);                 // refills to 2:00, so the hammer waits
    const ids = await listDurableObjectIds(env.AUCTION);
    expect(ids.length).toBeGreaterThan(0);
    // bring the close forward as the dealer, then fire the alarm
    await SELF.fetch(`${base}/lots/l5/close`, { method: 'POST', headers: DEALER });
    const stub = env.AUCTION.get(env.AUCTION.idFromName('l5'));
    await runDurableObjectAlarm(stub);            // false if the runtime already fired it: a past time fires at once
    await new Promise(r => setTimeout(r, 60));
    const lot = await (await SELF.fetch(`${base}/lots/l5`)).json<any>();
    expect(lot.closed?.sold).toBe(true);
    const late = await (await bid('l5', t, 6000)).json<any>();
    expect(late.ok).toBe(false); expect(late.reason).toBe('closed'); expect(late.lateByMs).toBeGreaterThanOrEqual(0);
  });
  it('a standing ceiling beats a lower challenger and says outbid', async () => {
    await open('l6', 10 * 60_000);
    const b = await signIn('buyer-b'), a = await signIn('buyer-l6');
    await bid('l6', a, 4900, 6000);
    const r = await (await bid('l6', b, 5000, 5200)).json<any>();
    expect(r.ok).toBe(false); expect(r.reason).toBe('outbid');
    expect(r.lot.leader).toBe('buyer-l6'); expect(r.lot.high).toBe(5450);
  });
  it('the copy in D1 follows the object', async () => {
    await open('l7', 10 * 60_000);
    await bid('l7', await signIn('buyer-l7'), 5000);
    await new Promise(r => setTimeout(r, 50));
    const row = await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind('l7').first<{ lot: string }>();
    expect(JSON.parse(row!.lot).high).toBe(5000);
    const lane = await (await SELF.fetch(`${base}/lots`)).json<any[]>();
    expect(lane.find((l: any) => l.id === 'l7')?.max).toBeUndefined();
  });
});

describe('whop', () => {
  it('the deposit checkout says so plainly when Whop is not configured', async () => {
    expect(env.WHOP_API_KEY).toBeUndefined();   // the test env carries no key; the shape { checkoutId, url } is typed in whop.ts
    expect((await SELF.fetch(`${base}/me/deposit/checkout`, { method: 'POST', body: '{}' })).status).toBe(401);
    const r = await SELF.fetch(`${base}/me/deposit/checkout`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ redirectUrl: 'obavia://deposit' }) });
    expect(r.status).toBe(503);
    expect(await r.text()).toBe('payments not configured');
  });
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
    await bid('p3', await signIn('buyer-p3'), 5000);
    await SELF.fetch(`${base}/lots/p3/close`, { method: 'POST', headers: DEALER });
    const stub = env.AUCTION.get(env.AUCTION.idFromName('p3'));
    await runDurableObjectAlarm(stub); await new Promise(r => setTimeout(r, 60));
    const lot = await (await SELF.fetch(`${base}/lots/p3`)).json<any>();
    expect(lot.sale?.buyer).toBe('buyer-p3'); expect(lot.sale.deadlineAt - lot.sale.wonAt).toBe(48 * 3_600_000);
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
    await bid('c2', await signIn('buyer-c2'), 5000);
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
    await bid('c3', await signIn('buyer-c3'), 4500);
    const after = await SELF.fetch(`${base}/lots/c3/car`, { method: 'POST', headers: DEALER, body: JSON.stringify({ collateral: { title: { status: 'hand' }, floor: 4000, insured: true } }) });
    expect(after.status).toBe(409);
  });
});

describe('dealer standing', () => {
  it('the owner suspends a dealer: open is refused; restored, open works; the exposure lists him', async () => {
    const t = (await (await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: DEALER, body: JSON.stringify({ gdn: 'P222222', name: 'Standing Motors' }) })).json<{ token: string }>()).token;
    const h = { authorization: `Bearer ${t}`, 'content-type': 'application/json' };
    expect((await SELF.fetch(`${base}/dealers/P222222/suspend`, { method: 'POST', headers: h })).status).toBe(403);   // a dealer cannot suspend
    const s = await SELF.fetch(`${base}/dealers/P222222/suspend`, { method: 'POST', headers: DEALER });
    expect(s.status).toBe(200); expect((await s.json<any>()).suspended).toBe(true);
    const refused = await open('s1', 10 * 60_000, 4900, h);
    expect(refused.status).toBe(403); expect(await refused.text()).toBe('dealer suspended');
    const list = await (await SELF.fetch(`${base}/dealers`, { headers: DEALER })).json<any[]>();
    expect(list.find(d => d.gdn === 'P222222')).toMatchObject({ name: 'Standing Motors', suspended: true, incidents: 0 });
    expect((await SELF.fetch(`${base}/dealers/P222222/restore`, { method: 'POST', headers: DEALER })).status).toBe(200);
    expect((await open('s1', 10 * 60_000, 4900, h)).status).toBe(200);
    const x = await (await SELF.fetch(`${base}/admin/exposure`, { headers: DEALER })).json<any>();
    expect(x.dealers.find((d: any) => d.gdn === 'P222222')).toMatchObject({ suspended: false, suspended_at: null });
    expect((await SELF.fetch(`${base}/dealers/P999999/suspend`, { method: 'POST', headers: DEALER })).status).toBe(404);
    expect((await SELF.fetch(`${base}/dealers`, { headers: h })).status).toBe(403);
  });
});

describe('the lane mint', () => {
  const MINT = 'test-mint-secret-0123456789abcdefghij';
  const mint = (body: unknown, secret = MINT) =>
    SELF.fetch(`${base}/dealers/mint`, { method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const laneMints = async () => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM dealer_mints WHERE source = 'lane' AND minted_at > ?1`).bind(Date.now() - 3_600_000).first<{ n: number }>())!.n;
  const direct = async (over: Partial<WorkerEnv>) => {
    return worker.fetch(new Request(`${base}/dealers/mint`, { method: 'POST', headers: { authorization: `Bearer ${MINT}`, 'content-type': 'application/json' }, body: JSON.stringify({ gdn: 'P300009', name: 'Unset Motors LLC', city: 'Waco' }) }), { ...env, ...over } as WorkerEnv);
  };

  it('mints one Desk key for a GDN, records the lane as the source, and the key opens a lot', async () => {
    const r = await mint({ gdn: 'P300001', name: 'Lane Motors LLC', city: 'Houston' });
    expect(r.status).toBe(200);
    const body = await r.json<Record<string, unknown>>();
    expect(Object.keys(body)).toEqual(['token']);
    expect(body.token).toMatch(/^d:P300001\.[A-Za-z0-9_-]{20,}$/);
    const row = await env.DB.prepare('SELECT gdn, name, city, source FROM dealer_mints WHERE gdn = ?1').bind('P300001').first();
    expect(row).toEqual({ gdn: 'P300001', name: 'Lane Motors LLC', city: 'Houston', source: 'lane' });
    expect(await env.DB.prepare('SELECT name FROM dealers WHERE gdn = ?1').bind('P300001').first()).toEqual({ name: 'Lane Motors LLC' });
    const h = { authorization: `Bearer ${body.token}`, 'content-type': 'application/json' };
    expect((await open('m1', 10 * 60_000, 4900, h)).status).toBe(200);
  });
  it('the same GDN again within 30 minutes is 409 already_minted with no key; after 30 minutes it mints again', async () => {
    const r = await mint({ gdn: 'P300001', name: 'Lane Motors LLC', city: 'Houston' });
    expect(r.status).toBe(409);
    const body = await r.text();
    expect(JSON.parse(body)).toEqual({ error: 'already_minted' });
    expect(body).not.toContain('d:P300001');
    await env.DB.prepare(`UPDATE dealer_mints SET minted_at = minted_at - 1800001 WHERE gdn = 'P300001'`).run();
    expect((await mint({ gdn: 'P300001', name: 'Lane Motors LLC', city: 'Houston' })).status).toBe(200);
  });
  it('leaves an existing dealer as the admin made him: name and standing', async () => {
    await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: DEALER, body: JSON.stringify({ gdn: 'P300002', name: 'Admin Name' }) });
    await SELF.fetch(`${base}/dealers/P300002/suspend`, { method: 'POST', headers: DEALER });
    expect((await mint({ gdn: 'P300002', name: 'Other Name LLC', city: 'Dallas' })).status).toBe(200);
    expect(await env.DB.prepare('SELECT name, suspended_at IS NOT NULL AS s FROM dealers WHERE gdn = ?1').bind('P300002').first()).toEqual({ name: 'Admin Name', s: 1 });
  });
  it('refuses a wrong secret, the admin secret, a dealer key, a query-string secret and a bad body; the mint secret is not admin', async () => {
    const before = await laneMints();
    expect((await mint({ gdn: 'P300003', name: 'X LLC', city: 'Y' }, 'wrong-secret-wrong-secret-wrong-secret')).status).toBe(403);
    expect((await mint({ gdn: 'P300003', name: 'X LLC', city: 'Y' }, 'test-dealer-secret')).status).toBe(403);
    expect((await mint({ gdn: 'P300003', name: 'X LLC', city: 'Y' }, MINT.slice(0, -1))).status).toBe(403);
    const q = await SELF.fetch(`${base}/dealers/mint?token=${MINT}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gdn: 'P300003', name: 'X LLC', city: 'Y' }) });
    expect(q.status).toBe(403);
    expect((await mint({ gdn: 'p300003', name: 'X LLC', city: 'Y' })).status).toBe(400);
    expect((await mint({ gdn: 'P300003', name: '', city: 'Y' })).status).toBe(400);
    expect((await mint({ gdn: 'P300003', name: 'X LLC' })).status).toBe(400);
    expect((await mint({ gdn: 'P300003', name: 'X\nLLC', city: 'Y' })).status).toBe(400);
    expect(await laneMints()).toBe(before);
    const asAdmin = { authorization: `Bearer ${MINT}`, 'content-type': 'application/json' };
    expect((await SELF.fetch(`${base}/dealers`, { headers: asAdmin })).status).toBe(403);
    expect((await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: asAdmin, body: JSON.stringify({ gdn: 'P300003', name: 'X' }) })).status).toBe(403);
    expect((await SELF.fetch(`${base}/dealers/P300001/suspend`, { method: 'POST', headers: asAdmin })).status).toBe(403);
    expect((await SELF.fetch(`${base}/admin/exposure`, { headers: asAdmin })).status).toBe(403);
    expect((await SELF.fetch(`${base}/dealers/mint`, { headers: asAdmin })).status).toBe(404);
  });
  it('answers 503 when MINT_SECRET is unset, short, or the same as DEALER_SECRET', async () => {
    for (const over of [{ MINT_SECRET: undefined }, { MINT_SECRET: 'short' }, { MINT_SECRET: 'test-mint-secret-0123456789abcdefghij', DEALER_SECRET: 'test-mint-secret-0123456789abcdefghij' }]) {
      const r = await direct(over);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ error: 'mint_unavailable' });
    }
    expect(await env.DB.prepare(`SELECT 1 FROM dealer_mints WHERE gdn = 'P300009'`).first()).toBeNull();
  });
  it('stops at 20 lane mints an hour with a Retry-After, and opens again as the hour rolls', async () => {
    let n = 0, refused: Response | null = null;
    while (!refused && n < 40) {
      const r = await mint({ gdn: `P4${String(n).padStart(5, '0')}`, name: 'Rate Motors LLC', city: 'Austin' });
      if (r.status === 429) refused = r; else expect(r.status).toBe(200);
      n++;
    }
    expect(refused).not.toBeNull();
    expect(await refused!.json()).toEqual({ error: 'rate_limited' });
    expect(Number(refused!.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await laneMints()).toBe(20);
    await env.DB.prepare(`UPDATE dealer_mints SET minted_at = minted_at - 3600001`).run();
    expect((await mint({ gdn: 'P499999', name: 'Rate Motors LLC', city: 'Austin' })).status).toBe(200);
  });
});

describe('the viewer', () => {
  it('serves the document page with the tokened PDF and posts to a parent frame', async () => {
    const r = await SELF.fetch(`${base}/view?u=${encodeURIComponent('/documents/x/guide.pdf')}&token=${encodeURIComponent(token)}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
    const html = await r.text();
    expect(html).toContain('parent.postMessage');
    expect(html).toContain(`${base}/documents/x/guide.pdf?token=${encodeURIComponent(token)}`);
  });
});

describe('who may bid (decisions §9 D10, D11, D15)', () => {
  const asBuyer = async (id: string, extra: Record<string, string> = {}) => {
    const r = await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id, name: 'Test', state: 'TX', ...extra }) });
    expect(r.status).toBe(200);
    const t = (await r.json<{ token: string }>()).token;
    expect((await SELF.fetch(`${base}/me/deposit`, { method: 'POST', headers: { authorization: `Bearer ${t}` }, body: '{}' })).status).toBe(200);
    return t;
  };
  const me = async (t: string) => (await SELF.fetch(`${base}/me`, { headers: { authorization: `Bearer ${t}` } })).json<any>();
  const SELLER = { ...CAR, dealer: { ...CAR.dealer, phone: '(713) 555-0100', afterHours: '713.555.0199' } };
  const openSeller = (id: string) => SELF.fetch(`${base}/lots/${id}/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id, dealer: 'P000000', start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: SELLER }) });

  it('D10: the first bid ever needs the terms (409 terms_required); it stamps the buyer; later bids need nothing', async () => {
    const t = await asBuyer('buyer-terms');
    await open('w1', 10 * 60_000);
    const none = await bid('w1', t, 5000, 5000, undefined, {});
    expect(none.status).toBe(409); expect(await none.json()).toEqual({ error: 'terms_required', version: TERMS });
    const old = await bid('w1', t, 5000, 5000, undefined, { terms: '2026-01-01' });
    expect(old.status).toBe(409);
    expect(await env.DB.prepare('SELECT terms_at FROM buyers WHERE id = ?1').bind('buyer-terms').first()).toEqual({ terms_at: null });
    const before = Date.now();
    const first = await bid('w1', t, 5000);
    expect(first.status).toBe(200); expect((await first.json<any>()).ok).toBe(true);
    const row = await env.DB.prepare('SELECT terms_version, terms_at FROM buyers WHERE id = ?1').bind('buyer-terms').first<{ terms_version: string; terms_at: number }>();
    expect(row?.terms_version).toBe(TERMS); expect(row!.terms_at).toBeGreaterThanOrEqual(before);
    const later = await bid('w1', t, 5250, 5250, undefined, {});
    expect(later.status).toBe(200); expect((await later.json<any>()).ok).toBe(true);
    const m = await me(t);
    expect(m.termsVersion).toBe(TERMS); expect(m.termsAt).toBe(row!.terms_at); expect(m.termsCurrent).toBe(TERMS);
  });

  it('D11: a Desk key or the admin secret never bids, on any lot (403 not_a_buyer), and the attempt is logged', async () => {
    const d = (await (await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: DEALER, body: JSON.stringify({ gdn: 'P000000', name: 'Triple J Auto' }) })).json<{ token: string }>()).token;
    await open('w2', 10 * 60_000);
    const asDealer = await bid('w2', d, 5000);
    expect(asDealer.status).toBe(403); expect(await asDealer.json()).toEqual({ error: 'not_a_buyer' });
    const other = (await (await SELF.fetch(`${base}/dealers`, { method: 'POST', headers: DEALER, body: JSON.stringify({ gdn: 'P555555', name: 'Elsewhere Motors' }) })).json<{ token: string }>()).token;
    expect((await bid('w2', other, 5000)).status).toBe(403);   // not his lot either: still no
    expect((await bid('w2', 'test-dealer-secret', 5000)).status).toBe(403);
    expect((await (await SELF.fetch(`${base}/lots/w2`)).json<any>()).bids).toBe(0);
    const rows = (await env.DB.prepare(`SELECT who, reason FROM bid_refusals WHERE lot_id = 'w2' ORDER BY id`).all()).results;
    expect(rows).toEqual([{ who: 'dealer:P000000', reason: 'not_a_buyer' }, { who: 'dealer:P555555', reason: 'not_a_buyer' }, { who: 'admin', reason: 'not_a_buyer' }]);
  });

  it('D11: a buyer sharing the seller\'s phone, address or name is refused (403 seller_cannot_bid); the check is logged with every bid', async () => {
    expect((await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id: 'buyer-badphone', phone: '555-01' }) })).status).toBe(400);
    const byPhone = await asBuyer('buyer-shill-phone', { phone: '+1 713 555 0100' });
    const byAfterHours = await asBuyer('buyer-shill-after', { phone: '7135550199' });
    const byAddress = await asBuyer('buyer-shill-street', { address: '100 Example St.' });
    const byName = await asBuyer('buyer-shill-name', { name: 'TRIPLE J AUTO' });
    const clean = await asBuyer('buyer-clean', { phone: '214-555-0123', address: '9 Other Rd' });
    await openSeller('w3');
    for (const [t, field] of [[byPhone, 'phone'], [byAfterHours, 'phone'], [byAddress, 'address'], [byName, 'name']] as const) {
      const r = await bid('w3', t, 5000);
      expect(r.status).toBe(403); expect(await r.json()).toEqual({ error: 'seller_cannot_bid' });
      await new Promise(r => setTimeout(r, 20));
      const last = await env.DB.prepare(`SELECT who, reason, matched FROM bid_refusals WHERE lot_id = 'w3' ORDER BY id DESC LIMIT 1`).first<{ who: string; reason: string; matched: string }>();
      expect(last?.reason).toBe('seller_cannot_bid'); expect(last?.matched).toBe(field);
    }
    expect((await SELF.fetch(`${base}/me`, { headers: { authorization: `Bearer ${byPhone}` } }).then(r => r.json<any>())).termsAt).toBeNull();   // a refused bid stamps nothing
    const ok = await bid('w3', clean, 5000);
    expect(ok.status).toBe(200); expect((await ok.json<any>()).ok).toBe(true);
    await new Promise(r => setTimeout(r, 60));
    const logged = await env.DB.prepare(`SELECT shill_check FROM bids WHERE lot_id = 'w3' AND bidder = 'buyer-clean'`).first<{ shill_check: string }>();
    expect(logged?.shill_check).toBe('phone,address,name');
    expect((await (await SELF.fetch(`${base}/lots/w3`)).json<any>()).bids).toBe(1);
    const x = await (await SELF.fetch(`${base}/admin/exposure`, { headers: DEALER })).json<any>();
    expect(x.bidRefusals.byReason.seller_cannot_bid).toBe(4);
    expect(x.bidRefusals.byReason.not_a_buyer).toBe(3);
    expect(x.bidRefusals.recent.find((r: any) => r.who === 'buyer-shill-street')).toMatchObject({ lotId: 'w3', reason: 'seller_cannot_bid', matched: 'address' });
  });

  it('D15: four wins a calendar year; a bid that could make a fifth is refused (403 win_cap) and /me says how many are left', async () => {
    const t = await asBuyer('buyer-cap');
    expect(await me(t)).toMatchObject({ wins: 0, winsLeft: 4, winsPerYear: 4 });
    const now = Date.now(), lastYear = Date.UTC(new Date(now).getUTCFullYear() - 1, 5, 1);
    const seed = (id: string, sale: Record<string, unknown>) => env.DB.prepare('INSERT INTO lots (id, dealer, lot, updated_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(id, 'P000000', JSON.stringify({ id, high: 5000, bids: 1, closesAt: now - 1, leader: 'buyer-cap', closed: { at: now - 1, sold: true }, sale: { buyer: 'buyer-cap', hammer: 5000, wonAt: now - 1, deadlineAt: now, deposit: 'held', ...sale } }), now).run();
    await seed('cap1', { startedAt: now - 3000 }); await seed('cap2', { startedAt: now - 2000 }); await seed('cap3', { startedAt: now - 1000 });
    await seed('capOld', { startedAt: lastYear });                       // last calendar year: does not count
    await seed('capVoid', { voidedAt: now - 500 });                      // voided: not a win
    await seed('capOwed', {});                                           // won, not started: counts, it becomes a win
    expect(await me(t)).toMatchObject({ wins: 3, winsLeft: 0 });
    await open('w4', 10 * 60_000);
    const capped = await bid('w4', t, 5000);
    expect(capped.status).toBe(403); expect(await capped.json()).toEqual({ error: 'win_cap', count: 4, cap: 4 });
    expect((await env.DB.prepare(`SELECT reason, matched FROM bid_refusals WHERE who = 'buyer-cap'`).first())).toEqual({ reason: 'win_cap', matched: '4' });

    await env.DB.prepare(`UPDATE lots SET lot = json_set(lot, '$.sale.forfeitedAt', ?1) WHERE id = 'capOwed'`).bind(now).run();   // forfeited: no longer a win
    expect(await me(t)).toMatchObject({ wins: 3, winsLeft: 1 });
    const fourth = await bid('w4', t, 5000);
    expect(fourth.status).toBe(200); expect((await fourth.json<any>()).youLead).toBe(true);
    await new Promise(r => setTimeout(r, 60));
    expect(await me(t)).toMatchObject({ wins: 3, winsLeft: 0 });           // leading w4 can become the fourth
    expect((await bid('w4', t, 5200, 5600)).status).toBe(200);             // raising on the lot it leads is not a fifth
    await open('w5', 10 * 60_000);
    const fifth = await bid('w5', t, 5000);
    expect(fifth.status).toBe(403); expect((await fifth.json<any>()).count).toBe(4);

    await env.DB.prepare(`DELETE FROM lots WHERE id IN ('cap1', 'cap2', 'cap3', 'capOld', 'capVoid', 'capOwed')`).run();   // no objects behind them: keep the reconciliation honest
  });
});

describe('the nightly reconciliation', () => {
  it('finds a copy that differs from the object, repairs it from the object, and says equal the next night', async () => {
    await open('r1', 10 * 60_000);
    await bid('r1', await signIn('buyer-r1'), 5200, 5800);
    await new Promise(r => setTimeout(r, 60));
    const row = await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind('r1').first<{ lot: string }>();
    const good = JSON.parse(row!.lot);
    expect(good.high).toBe(5200);
    await env.DB.prepare('UPDATE lots SET lot = ?2 WHERE id = ?1').bind('r1', JSON.stringify({ ...good, high: 9999 })).run();

    expect((await SELF.fetch(`${base}/admin/reconcile`, { method: 'POST', headers: { authorization: `Bearer ${token}` } })).status).toBe(403);
    const first = await (await SELF.fetch(`${base}/admin/reconcile`, { method: 'POST', headers: DEALER })).json<any>();
    expect(first.lots_differing).toBe(1);
    expect(first.differing).toEqual(['r1']);
    expect(first.equal).toBe(0);
    expect(first.whop_balance_cents).toBeNull();          // no Whop key in tests: the balance is not read, and the note says so
    expect(first.note).toMatch(/Whop not configured/);
    expect(first.deposits_held).toBeGreaterThanOrEqual(1);

    const fixed = JSON.parse((await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind('r1').first<{ lot: string }>())!.lot);
    expect(fixed.high).toBe(5200);
    expect(fixed.max).toBe(5800);                          // the object rewrote its own copy: the ceiling and the dealer stay in D1
    expect(fixed.dealer).toBe('P000000');

    const second = await (await SELF.fetch(`${base}/admin/reconcile`, { method: 'POST', headers: DEALER })).json<any>();
    expect(second.lots_differing).toBe(0);
    expect(second.equal).toBe(1);
    expect(second.lots_checked).toBe(first.lots_checked);

    const x = await (await SELF.fetch(`${base}/admin/exposure`, { headers: DEALER })).json<any>();
    expect(x.reconciliations.length).toBeGreaterThanOrEqual(2);
    expect(x.reconciliations[0].id).toBe(second.id);
    expect(x.reconciliations[1].differing).toEqual(['r1']);
  });
});
