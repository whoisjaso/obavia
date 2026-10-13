/* Wave 4-A (gap table §4; phases.md amendment 2026-10-13: Phase 4 and 5 code behind flags, no deploy, no money, no keys):
   audio and video on the car, per-dealer settings, the three exports, referrals, and the arbitration clause behind
   ARBITRATION=1. The closed lane and the roles are in auction.test.ts and routes.test.ts. */
import { env, SELF, applyD1Migrations } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import worker, { CLAUSE_TEXT, CLAUSE_VERSION, REFERRAL_CODE } from '../src/index';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }
const base = 'https://auction.test';
const ADMIN = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const PHONE = '+12145550142';
const TERMS = '2026-10-13';
const car = (gdn: string, make = 'Nissan', model = 'Altima') => ({ year: 2014, make, model, miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Wave Four Motors', city: 'Houston', street: '400 Example St', gdn, phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } });
const as = (tok: string) => ({ authorization: `Bearer ${tok}`, 'content-type': 'application/json' });
const post = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const put = (path: string, headers: Record<string, string>, body: unknown = {}) => SELF.fetch(`${base}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
const get = (path: string, headers: Record<string, string> = {}) => SELF.fetch(`${base}${path}`, { headers });
const settle = () => new Promise(r => setTimeout(r, 80));
const withEnv = (extra: Partial<WorkerEnv>) => ({ ...env, ...extra }) as WorkerEnv;
const call = (e: WorkerEnv, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  worker.fetch(new Request(`${base}${path}`, { method: init.method ?? 'GET', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) }), e);

async function dealer(gdn: string, role?: string) {
  const r = await post('/dealers', ADMIN, { gdn, name: `Dealer ${gdn}`, ...(role ? { role } : {}) });
  expect(r.status).toBe(200);
  return (await r.json<{ token: string }>()).token;
}
async function signIn(id: string) {
  const r = await post('/me', { 'content-type': 'application/json' }, { id, name: 'Wave Buyer', state: 'TX' });
  return (await r.json<{ token: string }>()).token;
}
async function buyer(id: string) {
  const token = await signIn(id);
  expect((await post('/me/phone', as(token), { phone: PHONE })).status).toBe(200);
  expect((await post('/me/phone/verify', as(token), { code: '000000' })).status).toBe(200);
  expect((await post('/me/deposit', as(token))).status).toBe(200);
  return token;
}
const openLot = (id: string, dealerToken: string, gdn: string, carMeta: Record<string, unknown> = car(gdn)) =>
  post(`/lots/${id}/open`, as(dealerToken), { id, dealer: gdn, start: 4900, retail: 7995, closesAt: Date.now() + 10 * 60_000, car: carMeta });
const bid = (id: string, t: string, amount: number, max = amount) => post(`/lots/${id}/bids`, as(t), { amount, max, key: crypto.randomUUID(), terms: TERMS });
const putMedia = (id: string, kind: 'audio' | 'video', tok: string, type: string, bytes: Uint8Array) =>
  SELF.fetch(`${base}/lots/${id}/${kind}`, { method: 'PUT', headers: { authorization: `Bearer ${tok}`, 'content-type': type }, body: bytes });

beforeAll(async () => { await applyD1Migrations(env.DB, env.TEST_MIGRATIONS); });

describe('2. audio and video on the car (PUT and GET /lots/:id/audio and /video)', () => {
  it('put then get, with the right type, the key on the car and the lane; a buyer token and a stranger cannot put', async () => {
    const d = await dealer('P940001');
    expect((await openLot('av1', d, 'P940001')).status).toBe(200);
    const audio = new Uint8Array(1200).fill(7);
    const r = await putMedia('av1', 'audio', d, 'audio/mp4', audio);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ audioKey: 'lots/av1/audio.mp4', url: '/lots/av1/audio', bytes: 1200, contentType: 'audio/mp4' });
    const g = await get('/lots/av1/audio');
    expect(g.status).toBe(200);
    expect(g.headers.get('content-type')).toBe('audio/mp4');
    expect(g.headers.get('cache-control')).toBe('private, max-age=300');
    expect(new Uint8Array(await g.arrayBuffer())).toEqual(audio);
    const video = new Uint8Array(5000).fill(9);
    const v = await putMedia('av1', 'video', d, 'video/webm', video);
    expect(r.status).toBe(200); expect((await v.json<any>()).videoKey).toBe('lots/av1/video.webm');
    const gv = await get('/lots/av1/video');
    expect(gv.headers.get('content-type')).toBe('video/webm'); expect((await gv.arrayBuffer()).byteLength).toBe(5000);
    const lot = await (await get('/lots/av1')).json<any>();
    expect(lot.car.audioKey).toBe('lots/av1/audio.mp4'); expect(lot.car.videoKey).toBe('lots/av1/video.webm');
    await settle();
    expect((await (await get('/lots')).json<any[]>()).find(l => l.id === 'av1').car.audioKey).toBe('lots/av1/audio.mp4');
    // a second put with the other type replaces the key and the file
    expect((await putMedia('av1', 'audio', d, 'audio/webm', new Uint8Array(10))).status).toBe(200);
    expect((await (await get('/lots/av1')).json<any>()).car.audioKey).toBe('lots/av1/audio.webm');
    expect(await env.FILES.get('lots/av1/audio.mp4')).toBeNull();
    expect((await get('/lots/av1/audio')).headers.get('content-type')).toBe('audio/webm');
    // who may not
    const b = await buyer('buyer-av-1');
    expect((await putMedia('av1', 'audio', b, 'audio/mp4', audio)).status).toBe(403);
    expect((await SELF.fetch(`${base}/lots/av1/audio`, { method: 'PUT', headers: { 'content-type': 'audio/mp4' }, body: audio })).status).toBe(403);
    const other = await dealer('P940002');
    const notYours = await putMedia('av1', 'audio', other, 'audio/mp4', audio);
    expect(notYours.status).toBe(403); expect(await notYours.json()).toEqual({ error: 'not_your_lot' });
    // the wrong type, a lot that does not exist, nothing to read
    expect((await putMedia('av1', 'audio', d, 'audio/mpeg', audio)).status).toBe(415);
    expect((await putMedia('av1', 'video', d, 'video/quicktime', audio)).status).toBe(415);
    expect((await putMedia('av-none', 'audio', d, 'audio/mp4', audio)).status).toBe(404);
    expect((await get('/lots/av-none/audio')).status).toBe(404);
    expect((await openLot('av2', d, 'P940001')).status).toBe(200);
    expect((await get('/lots/av2/video')).status).toBe(404);
  });

  it('the caps: 8 MB on audio, 60 MB on video, refused 413 before any byte lands', async () => {
    const d = await dealer('P940003');
    expect((await openLot('av3', d, 'P940003')).status).toBe(200);
    const big = await putMedia('av3', 'audio', d, 'audio/mp4', new Uint8Array(8_000_001));
    expect(big.status).toBe(413); expect(await big.json()).toEqual({ error: 'too_big' });
    expect(await env.FILES.get('lots/av3/audio.mp4')).toBeNull();
    expect((await putMedia('av3', 'audio', d, 'audio/mp4', new Uint8Array(8_000_000))).status).toBe(200);
    const bigVideo = await putMedia('av3', 'video', d, 'video/mp4', new Uint8Array(60_000_001));
    expect(bigVideo.status).toBe(413);
    expect(await env.FILES.get('lots/av3/video.mp4')).toBeNull();
    expect((await get('/lots/av3/video')).status).toBe(404);
    // a key may not be set by hand through open or /car
    const keyed = await openLot('av4', d, 'P940003', { ...car('P940003'), audioKey: 'lots/av3/audio.mp4' });
    expect(keyed.status).toBe(400); expect(await keyed.text()).toBe('bad_media_key');
  });
});

describe('4. per-dealer settings on the Worker (GET and PUT /dealers/settings)', () => {
  it('put, get; the shapes are opaque JSON; the lot role and the admin key are refused; a bad body is 400', async () => {
    const d = await dealer('P940010');
    const before = await get('/dealers/settings', as(d));
    expect(before.status).toBe(200);
    expect(await before.json()).toEqual({ gdn: 'P940010', hours: [], pickupAddress: null, afterHoursPhone: null, laneOn: true, updatedAt: null });
    const body = { hours: ['Mon-Fri 9 am-6 pm', 'Sat 9 am-6 pm'], pickupAddress: { street: '400 Example St', city: 'Houston', state: 'TX', zip: '77002' }, afterHoursPhone: '+12145550142', laneOn: false };
    const w = await put('/dealers/settings', as(d), body);
    expect(w.status).toBe(200);
    const written = await w.json<any>();
    expect(written).toMatchObject({ gdn: 'P940010', ...body }); expect(typeof written.updatedAt).toBe('number');
    const read = await (await get('/dealers/settings', as(d))).json<any>();
    expect(read).toEqual(written);
    const manager = await dealer('P940010', 'manager');
    expect((await put('/dealers/settings', as(manager), { ...body, laneOn: true })).status).toBe(403);   // the manager may read, not write (the brief: owner or manager key on the route; the role list keeps PUT /dealers/settings for the owner)
    expect((await get('/dealers/settings', as(manager))).status).toBe(200);
    const lot = await dealer('P940010', 'lot');
    const refused = await get('/dealers/settings', as(lot));
    expect(refused.status).toBe(403); expect(await refused.json()).toEqual({ error: 'role_denied', role: 'lot' });
    expect((await put('/dealers/settings', as(lot), body)).status).toBe(403);
    expect((await get('/dealers/settings', ADMIN)).status).toBe(403);
    expect((await put('/dealers/settings', as(d), { hours: 'Mon' })).status).toBe(400);
    expect((await put('/dealers/settings', as(d), { laneOn: 'yes' })).status).toBe(400);
    expect((await put('/dealers/settings', as(d), { afterHoursPhone: 'x'.repeat(40) })).status).toBe(400);
    // a string address is as good as an object: the Desk decides the shape
    const s = await put('/dealers/settings', as(d), { hours: [], pickupAddress: '400 Example St, Houston, TX 77002', afterHoursPhone: null, laneOn: true });
    expect(await s.json()).toMatchObject({ hours: [], pickupAddress: '400 Example St, Houston, TX 77002', afterHoursPhone: null, laneOn: true });
  });
});

describe('5. exports (GET /admin/export.csv?what=sales|money|lots)', () => {
  const parse = (t: string) => {   // RFC 4180 reader for the test: quoted fields, doubled quotes, CRLF rows
    const rows: string[][] = []; let row: string[] = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\r' && t[i + 1] === '\n') { row.push(f); rows.push(row); row = []; f = ''; i++; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  };
  it('the three exports: a header row, the file name, the buyer id only; a dealer key refused; a comma and a quote in a car name escaped', async () => {
    const d = await dealer('P940020');
    expect((await openLot('ex1', d, 'P940020', car('P940020', 'Ram, Inc.', '1500 "Big Horn"'))).status).toBe(200);
    const b = await buyer('buyer-ex-1');
    expect((await bid('ex1', b, 5000)).status).toBe(200);
    await settle();
    expect((await get('/admin/export.csv?what=lots', as(d))).status).toBe(403);
    expect((await get('/admin/export.csv?what=lots', as(b))).status).toBe(403);
    expect((await get('/admin/export.csv?what=lots')).status).toBe(403);
    expect((await get('/admin/export.csv?what=buyers', ADMIN)).status).toBe(400);
    const today = new Date().toISOString().slice(0, 10);
    for (const what of ['sales', 'money', 'lots'] as const) {
      const r = await get(`/admin/export.csv?what=${what}`, ADMIN);
      expect(r.status, what).toBe(200);
      expect(r.headers.get('content-type')).toBe('text/csv; charset=utf-8');
      expect(r.headers.get('content-disposition')).toBe(`attachment; filename="obavia-${what}-${today}.csv"`);
      const text = await r.text();
      expect(text.endsWith('\r\n')).toBe(true);
      expect(text).not.toContain('5550142'); expect(text).not.toContain('Wave Buyer');
      const rows = parse(text);
      expect(rows[0][0]).toBe(what === 'money' ? 'id' : 'lotId');
      for (const row of rows.slice(1)) expect(row.length, what).toBe(rows[0].length);
    }
    const lots = parse(await (await get('/admin/export.csv?what=lots', ADMIN)).text());
    const ex1 = lots.find(r => r[0] === 'ex1')!;
    const col = (name: string) => ex1[lots[0].indexOf(name)];
    expect(col('make')).toBe('Ram, Inc.'); expect(col('model')).toBe('1500 "Big Horn"'); expect(col('lane')).toBe('public'); expect(col('high')).toBe('5000');
    const raw = await (await get('/admin/export.csv?what=lots', ADMIN)).text();
    expect(raw).toContain('"Ram, Inc.","1500 ""Big Horn"""');
    const money = parse(await (await get('/admin/export.csv?what=money', ADMIN)).text());
    expect(money[0]).toEqual(['id', 'type', 'kind', 'amountUsd', 'lotId', 'buyerId', 'actor', 'reason', 'at']);
    expect(money.some(r => r[1] === 'deposit.captured' && r[5] === 'buyer-ex-1')).toBe(true);
    const sales = parse(await (await get('/admin/export.csv?what=sales', ADMIN)).text());
    expect(sales[0].slice(0, 6)).toEqual(['lotId', 'dealer', 'buyerId', 'buyerGdn', 'sellerGdn', 'state']);
    expect(sales[0]).not.toContain('phone'); expect(sales[0]).not.toContain('name');
  });
});

describe('6. referrals', () => {
  it('every buyer gets a code on the first GET /me, eight characters with no vowels and no 0, O, 1, I; the same code after', async () => {
    const t = await signIn('buyer-ref-1');
    const me = await (await get('/me', as(t))).json<any>();
    expect(me.referralCode).toMatch(REFERRAL_CODE);
    expect(me.referralCode).toMatch(/^[^AEIOU01]{8}$/);
    expect(me.referred).toBe(0);
    expect((await (await get('/me', as(t))).json<any>()).referralCode).toBe(me.referralCode);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM referrals WHERE buyer_id = ?1').bind('buyer-ref-1').first<{ n: number }>())?.n).toBe(1);
  });
  it('a claim once per buyer, never their own code; 404 no_such_code, 409 already_claimed; the count on the referrer', async () => {
    const a = await signIn('buyer-ref-a'), b = await signIn('buyer-ref-b'), c = await signIn('buyer-ref-c');
    const code = (await (await get('/me', as(a))).json<any>()).referralCode as string;
    const own = await post('/me/referral/claim', as(a), { code });
    expect(own.status).toBe(409); expect(await own.json()).toEqual({ error: 'own_code' });
    const none = await post('/me/referral/claim', as(b), { code: 'BBBBBBBB' });
    expect(none.status).toBe(404); expect(await none.json()).toEqual({ error: 'no_such_code' });
    expect((await post('/me/referral/claim', as(b), { code: 'abc' })).status).toBe(400);
    expect((await post('/me/referral/claim', { 'content-type': 'application/json' }, { code })).status).toBe(401);
    const ok = await post('/me/referral/claim', as(b), { code: code.toLowerCase() });
    expect(ok.status).toBe(200); expect(await ok.json()).toEqual({ claimed: code });
    const again = await post('/me/referral/claim', as(b), { code });
    expect(again.status).toBe(409); expect(await again.json()).toEqual({ error: 'already_claimed' });
    const otherCode = (await (await get('/me', as(c))).json<any>()).referralCode as string;
    const second = await post('/me/referral/claim', as(b), { code: otherCode });
    expect(second.status).toBe(409); expect(await second.json()).toEqual({ error: 'already_claimed' });
    expect((await post('/me/referral/claim', as(c), { code })).status).toBe(200);
    expect((await (await get('/me', as(a))).json<any>()).referred).toBe(2);
    expect((await (await get('/me', as(b))).json<any>()).referred).toBe(0);
    // no money moved on any of it
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM money_events WHERE type LIKE 'referral%' OR type LIKE 'buyer.referral%'").first<{ n: number }>())?.n).toBe(0);
  });
  it('the dealer application keeps a referral on the dealer row with a ledger row dealer.referral that waives nothing', async () => {
    const r = await post('/dealers', ADMIN, { gdn: 'P940030', name: 'Referred Motors', referral: 'BCDFGHJK' });
    expect(r.status).toBe(200);
    expect((await env.DB.prepare('SELECT referral FROM dealers WHERE gdn = ?1').bind('P940030').first<{ referral: string }>())?.referral).toBe('BCDFGHJK');
    const ev = await env.DB.prepare("SELECT body FROM money_events WHERE type = 'dealer.referral' AND json_extract(body, '$.dealer') = 'P940030'").first<{ body: string }>();
    expect(JSON.parse(ev!.body)).toMatchObject({ dealer: 'P940030', referral: 'BCDFGHJK', waives: 'nothing' });
    expect((await post('/dealers', ADMIN, { gdn: 'P940031', name: 'x', referral: 'y'.repeat(65) })).status).toBe(400);
    expect((await post('/dealers', ADMIN, { gdn: 'P940030', name: 'Referred Motors' })).status).toBe(200);   // a second mint keeps it
    expect((await env.DB.prepare('SELECT referral FROM dealers WHERE gdn = ?1').bind('P940030').first<{ referral: string }>())?.referral).toBe('BCDFGHJK');
    expect((await (await get('/dealers', ADMIN)).json<any[]>()).find(x => x.gdn === 'P940030').referral).toBe('BCDFGHJK');
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM dealer_payouts WHERE dealer = 'P940030'").first<{ n: number }>())?.n).toBe(0);
  });
});

describe('7. the arbitration clause behind ARBITRATION (D13, draft; counsel pending)', () => {
  const ON = withEnv({ ARBITRATION: '1' });
  it('GET /terms: clause null when off (unset or 0); the draft clause when 1', async () => {
    const off = await (await get('/terms')).json<any>();
    expect(off).toEqual({ version: TERMS, terms: ['with reserve unless marked no reserve', 'neither the seller nor Obavia bids', 'bids are irrevocable', 'the sale completes at the VIN scan and engine start'], clause: null });
    expect((await (await call(withEnv({ ARBITRATION: '0' }), '/terms')).json<any>()).clause).toBeNull();
    const on = await (await call(ON, '/terms')).json<any>();
    expect(on.clause).toEqual({ version: 'D13-draft-2026-10-13', text: CLAUSE_TEXT, requiresScrollToEnd: true });
    expect(CLAUSE_VERSION).toBe('D13-draft-2026-10-13');
    expect(on.clause.text.startsWith('DRAFT, counsel review pending: ')).toBe(true);
    expect(on.clause.text).toContain('FAA-governed'); expect(on.clause.text).toContain('no DTPA waiver'); expect(on.clause.text).toContain('small-claims carve-out');
  });
  it('off: a bid needs no clause and GET /me says so; on: 409 clause_required until POST /me/clause, recorded once', async () => {
    const d = await dealer('P940040');
    expect((await openLot('ar1', d, 'P940040')).status).toBe(200);
    const t = await buyer('buyer-ar-1');
    const meOff = await (await get('/me', as(t))).json<any>();
    expect(meOff).toMatchObject({ clauseVersion: null, clauseAt: null, clauseCurrent: null, clauseRequired: false });
    const meOn = await (await call(ON, '/me', { headers: as(t) })).json<any>();
    expect(meOn).toMatchObject({ clauseVersion: null, clauseAt: null, clauseCurrent: CLAUSE_VERSION, clauseRequired: true });
    const body = { amount: 5000, max: 5000, key: crypto.randomUUID(), terms: TERMS };
    const refused = await call(ON, '/lots/ar1/bids', { method: 'POST', headers: as(t), body });
    expect(refused.status).toBe(409); expect(await refused.json()).toEqual({ error: 'clause_required', version: CLAUSE_VERSION });
    expect((await (await get('/lots/ar1')).json<any>()).bids).toBe(0);
    expect((await call(ON, '/me/clause', { method: 'POST', headers: as(t), body: { version: 'D13-draft-2000-01-01' } })).status).toBe(400);
    const acc = await call(ON, '/me/clause', { method: 'POST', headers: as(t), body: { version: CLAUSE_VERSION } });
    expect(acc.status).toBe(200);
    const rec = await acc.json<any>();
    expect(rec.clauseVersion).toBe(CLAUSE_VERSION); expect(typeof rec.clauseAt).toBe('number');
    const again = await (await call(ON, '/me/clause', { method: 'POST', headers: as(t), body: { version: CLAUSE_VERSION } })).json<any>();
    expect(again).toEqual(rec);   // once: the first acceptance stands
    expect(await env.DB.prepare('SELECT clause_version, clause_at FROM buyers WHERE id = ?1').bind('buyer-ar-1').first()).toEqual({ clause_version: CLAUSE_VERSION, clause_at: rec.clauseAt });
    const ok = await call(ON, '/lots/ar1/bids', { method: 'POST', headers: as(t), body: { ...body, key: crypto.randomUUID() } });
    expect(ok.status).toBe(200); expect((await ok.json<any>()).ok).toBe(true);
    expect((await (await call(ON, '/me', { headers: as(t) })).json<any>()).clauseRequired).toBe(false);
    // off: a second buyer with no clause bids as before
    const u = await buyer('buyer-ar-2');
    expect((await bid('ar1', u, 5100)).status).toBe(200);
  });
});
