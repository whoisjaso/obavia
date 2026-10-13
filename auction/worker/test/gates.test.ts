/* Wave 2-E (phases.md Phase 2, Server row): the bids-per-buyer rate limit, the one-open-bid gate from sim 03, and the
   nightly report read as a streak. Every rule here is in src/index.ts, src/bidders.ts or src/reconcile.ts. */
import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject as runIn } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import { BIDS_PER_MINUTE, BID_WINDOW_MS, OPEN_BIDS_UNTIL_PAID, oneOpenBidRefuses, openBids } from '../src/bidders';
import { equalNights, reconcile } from '../src/reconcile';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const car = (gdn: string) => ({ year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Gates Test Motors', city: 'Houston', street: '400 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });
const runInDurableObject = runIn as unknown as <R>(s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => R | Promise<R>) => Promise<R>;
const stub = (id: string): DurableObjectStub => env.AUCTION.get(env.AUCTION.idFromName(id)) as unknown as DurableObjectStub;
const settle = () => new Promise(r => setTimeout(r, 80));
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const get = (path: string, headers: Record<string, string> = {}) => SELF.fetch(`${base}${path}`, { headers });
const GDN = 'P800001';

async function buyer(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Gates Buyer', state: 'TX' });
  const token = (await r.json<{ token: string }>()).token;
  expect((await post('/me/phone', as(token), { phone: PHONE })).status).toBe(200);
  expect((await post('/me/phone/verify', as(token), { code: '000000' })).status).toBe(200);
  expect((await post('/me/deposit', as(token))).status).toBe(200);
  return token;
}
const openLot = (id: string, closesIn = 10 * 60_000) => post(`/lots/${id}/open`, ADMIN, { id, dealer: GDN, start: 4900, retail: 7995, closesAt: Date.now() + closesIn, car: car(GDN) });
const bid = (id: string, t: string, amount: number, max = amount, key = crypto.randomUUID()) => post(`/lots/${id}/bids`, as(t), { amount, max, key, terms: TERMS });
const me = async (t: string) => (await get('/me', as(t))).json<any>();
async function hammer(id: string) {
  await runInDurableObject(stub(id), async (inst: any, state) => {
    const lot = await state.storage.get<any>('lot'); lot.closesAt = Date.now() - 1;
    await state.storage.put('lot', lot); inst.lot = lot; await state.storage.setAlarm(Date.now());
  });
  await runDurableObjectAlarm(stub(id)); await settle();
}
const refusals = async (who: string) => (await env.DB.prepare('SELECT lot_id AS lotId, reason, matched FROM bid_refusals WHERE who = ?1 ORDER BY id').bind(who).all()).results;

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await post('/dealers', ADMIN, { gdn: GDN, name: 'Gates Test Motors' });
});

describe('1. one open bid per buyer until the first car is paid (sim 03)', () => {
  it('the rule, as numbers: one slot; raising on the lot led is not a second; a paid car lifts it', () => {
    expect(OPEN_BIDS_UNTIL_PAID).toBe(1);
    expect(openBids({ owed: 0, leading: 0 })).toBe(0);
    expect(oneOpenBidRefuses({ wins: 0, owed: 0, leading: 0, paid: 0 })).toBe(false);
    expect(oneOpenBidRefuses({ wins: 0, owed: 0, leading: 1, paid: 0 })).toBe(true);
    expect(oneOpenBidRefuses({ wins: 0, owed: 1, leading: 0, paid: 0 })).toBe(true);
    expect(oneOpenBidRefuses({ wins: 0, owed: 1, leading: 1, paid: 1 })).toBe(false);
  });

  it('a second lead on another lot is 409 one_open_bid and logged; a raise on the lot led goes; being outbid frees the slot', async () => {
    await openLot('g1'); await openLot('g2');
    const a = await buyer('gate-a'), b = await buyer('gate-b');
    expect((await bid('g1', a, 5000)).status).toBe(200); await settle();
    expect(await me(a)).toMatchObject({ openBids: 1, paidCars: 0 });
    const second = await bid('g2', a, 5000);
    expect(second.status).toBe(409); expect(await second.json()).toEqual({ error: 'one_open_bid', open: 1 });
    expect(await refusals('gate-a')).toEqual([{ lotId: 'g2', reason: 'one_open_bid', matched: '1' }]);
    expect((await (await get('/lots/g2')).json<any>()).bids).toBe(0);
    expect(await me(a)).toMatchObject({ termsAt: expect.any(Number) });   // the first bid was placed; the refusal stamped nothing new
    const raise = await bid('g1', a, 5250, 5500);   // one increment up ($250 from $5,000)
    expect(raise.status).toBe(200); expect((await raise.json<any>()).youLead).toBe(true);
    // b takes g1: a's slot is free, a leads g2
    expect((await (await bid('g1', b, 6000, 6000)).json<any>()).youLead).toBe(true); await settle();
    expect(await me(a)).toMatchObject({ openBids: 0 });
    const now = await bid('g2', a, 5000);
    expect(now.status).toBe(200); expect((await now.json<any>()).youLead).toBe(true); await settle();
    // b now leads g1 and holds no paid car: b cannot take g2 as well
    const bToo = await bid('g2', b, 5200);
    expect(bToo.status).toBe(409); expect((await bToo.json<any>()).error).toBe('one_open_bid');
    const x = await (await get('/admin/exposure', ADMIN)).json<any>();
    expect(x.bidRefusals.byReason.one_open_bid).toBeGreaterThanOrEqual(2);
  });

  it('a sale won and not yet paid holds the slot; the dealer marking it paid lifts the gate for good; a void frees the slot without lifting it', async () => {
    await openLot('g3', 5_000); await openLot('g4'); await openLot('g5');
    const c = await buyer('gate-c');
    expect((await bid('g3', c, 5000)).status).toBe(200);
    await hammer('g3');
    expect((await (await get('/lots/g3')).json<any>()).sale?.buyer).toBe('gate-c');
    expect(await me(c)).toMatchObject({ openBids: 1, paidCars: 0 });   // owed: won, not paid
    const owed = await bid('g4', c, 5000);
    expect(owed.status).toBe(409); expect((await owed.json<any>()).error).toBe('one_open_bid');
    expect((await post('/lots/g3/paid', ADMIN)).status).toBe(200); await settle();
    expect(await me(c)).toMatchObject({ paidCars: 1 });
    expect((await (await bid('g4', c, 5000)).json<any>()).youLead).toBe(true); await settle();
    expect((await (await bid('g5', c, 5000)).json<any>()).youLead).toBe(true);   // lifted: two leads at once, the win cap is the only ceiling now
    // a void after payment: the dealer could not deliver; the buyer showed the money, the paid car still counts
    expect((await post('/lots/g3/void', ADMIN, { reason: 'sold on the lot' })).status).toBe(200); await settle();
    expect(await me(c)).toMatchObject({ paidCars: 0, openBids: 2 });   // voided: not a paid car any more (conservative: the dealer's failure is not the buyer's record)
    // a void before payment frees the slot and lifts nothing
    await openLot('g6', 5_000); await openLot('g7');
    const d = await buyer('gate-d');
    expect((await bid('g6', d, 5000)).status).toBe(200);
    await hammer('g6');
    expect((await bid('g7', d, 5000)).status).toBe(409);
    expect((await post('/lots/g6/void', ADMIN, { reason: 'It did not start' })).status).toBe(200); await settle();
    expect(await me(d)).toMatchObject({ openBids: 0, paidCars: 0 });
    expect((await (await bid('g7', d, 5000)).json<any>()).youLead).toBe(true);
  });
});

describe('2. bids per buyer: at most 20 a minute across every lot', () => {
  it('the number: 20 a rolling minute', () => { expect(BIDS_PER_MINUTE).toBe(20); expect(BID_WINDOW_MS).toBe(60_000); });

  it('the 21st attempt in a minute is 429 too_many_bids with Retry-After and a log row; a retried key is not an attempt; the minute rolls', async () => {
    await openLot('rl1');
    const t = await buyer('gate-rl');
    // the first bid leads; every bid after is a raise on the lot led by one increment ($250 from $5,000: src/engine/auction.ts), so
    // each lands in the object (one_open_bid does not fire on the lot led); each attempt counts whatever its answer
    for (let i = 0; i < BIDS_PER_MINUTE; i++) { const r = await bid('rl1', t, 5000 + i * 250, 5000 + i * 250); expect(r.status).toBe(200); expect((await r.json<any>()).ok).toBe(true); }
    const over = await bid('rl1', t, 20000, 20000);
    expect(over.status).toBe(429); expect(await over.json()).toEqual({ error: 'too_many_bids' });
    const wait = Number(over.headers.get('retry-after'));
    expect(wait).toBeGreaterThanOrEqual(1); expect(wait).toBeLessThanOrEqual(60);
    await settle();
    const logged = await refusals('gate-rl');
    expect(logged).toEqual([{ lotId: 'rl1', reason: 'too_many_bids', matched: String(wait) }]);
    expect((await (await get('/lots/rl1')).json<any>()).bids).toBe(BIDS_PER_MINUTE);   // the 21st never reached the object
    // the same key again is a retry: forwarded, the object answers the same ack, nothing counted
    const key = (await env.DB.prepare("SELECT key FROM bid_attempts WHERE buyer = 'gate-rl' ORDER BY id LIMIT 1").first<{ key: string }>())!.key.replace(/^gate-rl:/, '');
    const retry = await bid('rl1', t, 5000, 5000, key);
    expect(retry.status).toBe(200); expect((await retry.json<any>()).lot.high).toBe(5000);   // the first ack, as stored
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM bid_attempts WHERE buyer = 'gate-rl'").first<{ n: number }>())!.n).toBe(BIDS_PER_MINUTE);
    // the window rolls: age every attempt past the minute and the next bid goes
    await env.DB.prepare("UPDATE bid_attempts SET at = at - ?1 WHERE buyer = 'gate-rl'").bind(BID_WINDOW_MS + 1000).run();
    const again = await bid('rl1', t, 20000, 20000);
    expect(again.status).toBe(200); expect((await again.json<any>()).ok).toBe(true);
    expect((await (await get('/lots/rl1')).json<any>()).bids).toBe(BIDS_PER_MINUTE + 1);
    // a stranger's attempts are his own: another buyer is not slowed by this one
    await openLot('rl2');
    expect((await bid('rl2', await buyer('gate-rl2'), 5000)).status).toBe(200);
  });

  it('a burst of parallel attempts admits exactly 20: the conditional insert is the lock', async () => {
    await openLot('rl3');
    const t = await buyer('gate-burst');
    const answers = await Promise.all(Array.from({ length: BIDS_PER_MINUTE + 10 }, (_, i) => bid('rl3', t, 5000 + i * 25, 5000 + i * 25)));
    const codes = answers.map(r => r.status);
    expect(codes.filter(c => c === 429).length).toBe(10);
    expect(codes.filter(c => c !== 429).length).toBe(BIDS_PER_MINUTE);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM bid_attempts WHERE buyer = 'gate-burst'").first<{ n: number }>())!.n).toBe(BIDS_PER_MINUTE);
  });

  it('an attempt is counted only for a signed-in buyer with a proved phone and a deposit: a stranger fills nothing', async () => {
    await openLot('rl4');
    const r = await post('/me', { 'content-type': 'application/json' }, { id: 'gate-nodep', name: 'No Deposit', state: 'TX' });
    const t = (await r.json<{ token: string }>()).token;
    for (let i = 0; i < 3; i++) expect((await bid('rl4', t, 5000)).status).toBe(409);   // phone_required
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM bid_attempts WHERE buyer = 'gate-nodep'").first<{ n: number }>())!.n).toBe(0);
  });
});

describe('3. the nightly row and the streak: GET /admin/reconcile', () => {
  it('admin only; nights newest first with equal as a boolean and the field that differed; equalNights counts from the latest; sevenEqual at seven', async () => {
    expect((await get('/admin/reconcile')).status).toBe(403);
    expect((await get('/admin/reconcile', as(await buyer('gate-rec')))).status).toBe(403);
    await openLot('rc1');
    expect((await bid('rc1', await buyer('gate-rc1'), 5300, 5900)).status).toBe(200); await settle();
    const row = JSON.parse((await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind('rc1').first<{ lot: string }>())!.lot);
    await env.DB.prepare('UPDATE lots SET lot = ?2 WHERE id = ?1').bind('rc1', JSON.stringify({ ...row, high: 9999, leader: 'nobody' })).run();
    const bad = await reconcile(env);
    expect(bad.equal).toBe(0);
    expect(bad.differences).toEqual([{ lot: 'rc1', field: 'high', copy: 9999, object: 5300 }, { lot: 'rc1', field: 'leader', copy: 'nobody', object: 'gate-rc1' }]);
    const a = await (await get('/admin/reconcile', ADMIN)).json<any>();
    expect(a.equalNights).toBe(0); expect(a.sevenEqual).toBe(false);
    expect(a.latest).toEqual({ id: bad.id, ranAt: bad.ran_at, equal: false });
    expect(a.nights[0]).toMatchObject({ id: bad.id, equal: false, lotsDiffering: 1, differing: ['rc1'], differences: bad.differences, reserveRatio: null, whopBalanceCents: null });
    expect(a.nights[0].note).toContain('repaired from the object: 1');
    const stored = await env.DB.prepare('SELECT equal, differences FROM reconciliations WHERE id = ?1').bind(bad.id).first<{ equal: number; differences: string }>();
    expect(stored).toEqual({ equal: 0, differences: JSON.stringify(bad.differences) });
    // six more nights, each equal (the copy was repaired): the streak reads six, then seven
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) { const r = await reconcile(env); expect(r.equal).toBe(1); expect(r.differences).toEqual([]); ids.push(r.id); }
    const six = await (await get('/admin/reconcile', ADMIN)).json<any>();
    expect(six.equalNights).toBe(6); expect(six.sevenEqual).toBe(false);
    expect(six.nights.map((n: any) => n.id)).toEqual([...ids].reverse().concat(bad.id));
    expect(six.nights.every((n: any) => typeof n.equal === 'boolean')).toBe(true);
    const seventh = await reconcile(env);
    expect(seventh.equal).toBe(1);
    const seven = await (await get('/admin/reconcile?n=3', ADMIN)).json<any>();
    expect(seven.equalNights).toBe(7); expect(seven.sevenEqual).toBe(true);
    expect(seven.nights.length).toBe(3);   // n trims the list, never the streak
    expect(seven.latest.id).toBe(seventh.id);
    expect(equalNights([{ equal: 1 }, { equal: 1 }, { equal: 0 }, { equal: 1 }])).toBe(2);
    expect(equalNights([])).toBe(0);
  });
});
