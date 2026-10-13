// Tests for the dealer application steps (deploy/site/lane/) and, when the
// gitignored obavia-waitlist bundle deploy/site/live-worker.js is present, for
// the bundle itself: the legacy waitlist body, storage, the outbox, and that its
// lane sections are verbatim copies of deploy/site/lane. No dependencies:
//   node --test deploy/site/live-worker.test.mjs
// D1 is stood in for by node:sqlite (Node 22.5+). The legacy tables below are
// reconstructed from the SQL in live-worker.js, since their migrations live
// with the private worker; the lane tables come from lane/0001_lane_application.sql.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as lane from './lane/lane.mjs';
import { renderLaneConfirmation } from './lane/template-v9.mjs';
import { renderWaitlistV10, waitlistTemplateVersion, BUYER_TEMPLATE_VERSION } from './lane/template-v10.mjs';
import { serveSiteAsset, siteAssetType, SITE_ASSET_FOLDERS } from './lane/assets.mjs';
import { syncBundle } from './lane/sync-bundle.mjs';

const BUNDLE_URL = new URL('./live-worker.js', import.meta.url);
const bundle = existsSync(BUNDLE_URL) ? await import(BUNDLE_URL.href) : null;
const SKIP = bundle ? false : 'deploy/site/live-worker.js is absent (gitignored private bundle); bundle cases skipped';
if (SKIP) console.log(`# ${SKIP}`);
const btest = (name, fn) => (SKIP ? test.skip(`${name} [${SKIP}]`, fn) : test(name, fn));

const LEGACY_SCHEMA = `
CREATE TABLE waitlist_entries (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, first_name TEXT, full_name TEXT);
CREATE TABLE confirmation_outbox (id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL, template_version TEXT NOT NULL, created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL, greeting_name TEXT, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT, lease_until INTEGER, first_attempt_at INTEGER, dedup_until INTEGER, sender TEXT, ambiguous INTEGER NOT NULL DEFAULT 0,
  last_error TEXT, provider_id TEXT, accepted_at INTEGER);
CREATE TABLE waitlist_global_limit (id INTEGER PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL, last_request TEXT);
CREATE TABLE waitlist_client_limit (client_key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL, last_request TEXT);
CREATE TABLE waitlist_email_limit (email TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL, last_request TEXT);`;
const LANE_SCHEMA = readFileSync(new URL('./lane/0001_lane_application.sql', import.meta.url), 'utf8');

/* ---------- a D1 stand-in ---------- */
const clean = p => p.map(v => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
class Stmt {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...p) { return new Stmt(this.db, this.sql, p); }
  exec() { return { results: this.db.prepare(this.sql).all(...clean(this.params)), success: true, meta: {} }; }
  async all() { return this.exec(); }
  async run() { return this.exec(); }
  async first() { return this.exec().results[0] ?? null; }
}
function d1(withLane = true) {
  const db = new DatabaseSync(':memory:');
  db.exec(LEGACY_SCHEMA);
  if (withLane) db.exec(LANE_SCHEMA);
  return {
    raw: db,
    prepare: sql => new Stmt(db, sql),
    async batch(stmts) {
      db.exec('BEGIN');
      try { const out = stmts.map(s => s.exec()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}

/* ---------- the TxDMV files the nightly job writes to R2 ---------- */
const PHONE = '9565551234';   // a test number; must never appear in a response
const INDEX = { v: 1, state: 'TX', asOf: '2026-10-12', count: 3, fields: ['licence', 'name', 'dba', 'city', 'county', 'zip', 'franchise', 'types', 'hasPhone', 'emailHint', 'street'],
  rows: [['P000678X', 'Impac Manufacturing, Inc.', '', 'Los Fresnos', 'Cameron', '78566', 0, 'TR', 1, '', ''],
    ['P171632', 'Lone Star Motors LLC', 'Lone Star Cars', 'Houston', 'Harris', '77001', 0, 'MV', 1, '', ''],
    ['P200001', 'No Phone Autos', '', 'Austin', 'Travis', '78701', 0, 'MV', 0, '', '']] };
const CONTACTS = { v: 1, state: 'TX', asOf: '2026-10-12', contacts: { P000678X: { phone: PHONE, name: 'Impac', city: 'Los Fresnos' }, P171632: { phone: '7134883602', name: 'Lone Star Cars', city: 'Houston' }, P999999: { phone: '2145550000', name: 'Gone', city: 'Dallas' } } };
const r2 = (files = { 'tx/index.json': INDEX, 'tx/contacts.json': CONTACTS }) => ({ async get(k) { return k in files ? { json: async () => structuredClone(files[k]) } : null; } });

/* ---------- two harnesses with one interface ----------
   module: deploy/site/lane/lane.mjs alone, join stubbed, stand-in validators.
   bundle: the whole worker (createWorker().fetch), real store and validators. */
const ORIGIN = 'https://obavia.co';
const validators = {   // stand-ins for endpoint.ts emailOf and normalizeFullName, module harness only
  emailOf: v => (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[a-z]{2,63}$/i.test(v.trim()) ? v.trim().toLowerCase() : null),
  normalizeFullName: v => (typeof v === 'string' && v.trim() && v.trim().length <= 160 ? v.trim().replace(/\s+/g, ' ') : null),
};
function base({ env: extra = {}, telnyx = null, auction = null }) {
  const clock = { t: 1_800_000_000_000 };
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://api.telnyx.com/')) return telnyx(String(url), JSON.parse(init.body ?? '{}'));
    if (auction && String(url).startsWith('https://auction.example/')) return auction(String(url), init);
    throw Error('unexpected fetch ' + url);
  };
  const env = { PUBLIC_ORIGIN: ORIGIN, ABUSE_HMAC_KEY: 'k'.repeat(40), DEALERS: r2(), WAITLIST_TEMPLATE_VERSION: 'waitlist-confirmation-v8', ...extra };
  return { clock, calls, fetchImpl, env, advance: ms => { clock.t += ms; } };
}
function moduleHarness(opts = {}) {
  const b = base(opts), db = d1(), joins = [];
  const dealers = lane.createDealerBook(b.env.DEALERS, { now: () => b.clock.t });
  const post = async (body, { ip = '203.0.113.7' } = {}) => {
    const l = lane.createLane({ db, dealers, provider: lane.laneProvider(b.env, b.fetchImpl), clientKey: async () => `client:${ip}`,
      join: async (email, fullName, application) => { joins.push({ email, fullName, application }); return 'accepted'; },
      issueKey: lane.laneKeyIssuer(b.env, b.fetchImpl), now: () => b.clock.t });
    const r = await lane.handleLaneStep(body, l, {}, (status, error) => Response.json({ error }, { status }), validators);
    return { status: r.status, body: await r.json().catch(() => null), retryAfter: r.headers.get('Retry-After') };
  };
  const lastApplication = email => JSON.parse(joins.filter(j => j.email === email).at(-1).application);
  return { ...b, db, post, lastApplication, kind: 'module' };
}
function bundleHarness({ lane: withLane = true, ...opts } = {}) {
  const b = base(opts), db = d1(withLane);
  const env = { ...b.env, WAITLIST_DB: db };
  const worker = bundle.createWorker({ fetchImpl: b.fetchImpl, now: () => b.clock.t });
  const post = async (body, { ip = '203.0.113.7', raw } = {}) => {
    const r = await worker.fetch(new Request(`${ORIGIN}/api/waitlist`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', 'CF-Connecting-IP': ip }, body: raw ?? JSON.stringify(body) }), env);
    return { status: r.status, body: await r.json().catch(() => null), retryAfter: r.headers.get('Retry-After') };
  };
  const lastApplication = email => JSON.parse(db.raw.prepare('SELECT application FROM waitlist_entries WHERE email=?').get(email).application);
  return { ...b, env, db, post, lastApplication, kind: 'bundle' };
}
const both = (name, fn) => { test(`${name} (module)`, () => fn(moduleHarness)); btest(`${name} (bundle)`, () => fn(bundleHarness)); };

const telnyxOk = (code = '482913') => async (url, body) => {
  if (url.endsWith('/verifications/sms')) return Response.json({ data: { id: 'v-1' } });
  return Response.json({ data: { response_code: body.code === code ? 'accepted' : 'rejected' } });
};
const application = (over = {}) => ({ v: 1, gdnHeld: 'yes', lotSize: '11-30', agedOver60: '3-5', floorplan: 'no', losingCar: '2014 Nissan Altima, 90 days', gdn: 'P000678X', dealerName: 'Impac Manufacturing, Inc.', dealerCity: 'Los Fresnos', phoneVerified: true, ...over });
const MINT = 'm'.repeat(40);
const AUCTION_ENV = { TELNYX_API_KEY: 'KEY', TELNYX_VERIFY_PROFILE_ID: 'VP', AUCTION_API_URL: 'https://auction.example', MINT_SECRET: MINT };
const auctionOk = async (url, init) => Response.json({ token: `d:${JSON.parse(init.body).gdn}.${'x'.repeat(43)}` });
const applyBody = (over = {}) => ({ step: 'apply', fullName: 'Ana Ruiz', email: 'ana@lot.com', website: '', application: application(), ...over });
async function verifiedApply(h, over, ip) {
  await h.post({ step: 'code', gdn: 'P000678X' });
  await h.post({ step: 'verify', gdn: 'P000678X', code: '482913' });
  return h.post(applyBody(over), ip ? { ip } : undefined);
}

/* ---------- lookup ---------- */
both('lookup matches against the TxDMV list and returns only the last four', async make => {
  const h = make();
  const r = await h.post({ step: 'lookup', gdn: 'p000678x' });
  assert.deepEqual(r.body, { status: 'match', name: 'Impac Manufacturing, Inc.', city: 'Los Fresnos', phoneLast4: '1234' });
  assert.ok(!JSON.stringify(r.body).includes(PHONE));
  assert.deepEqual((await h.post({ step: 'lookup', gdn: 'P999999' })).body, { status: 'no_match' }, 'contacts alone do not make a licence active');
  assert.deepEqual((await h.post({ step: 'lookup', gdn: 'P200001' })).body, { status: 'match', name: 'No Phone Autos', city: 'Austin', phoneLast4: '' });
  assert.equal((await h.post({ step: 'lookup', gdn: 'nope' })).status, 422);
  assert.equal((await h.post({ step: 'lookup', gdn: 'P000678X', extra: 1 })).status, 422);
});
both('lookup without the dealer list answers 503 so the page falls back to shape only', async make => {
  const h = make({ env: { DEALERS: undefined } });
  const r = await h.post({ step: 'lookup', gdn: 'P000678X' });
  assert.equal(r.status, 503); assert.equal(r.body.error, 'lookup_unavailable');
});
both('lookup is limited per client', async make => {
  const h = make();
  for (let i = 0; i < 120; i++) assert.equal((await h.post({ step: 'lookup', gdn: 'P171632' })).status, 200);
  const r = await h.post({ step: 'lookup', gdn: 'P171632' });
  assert.equal(r.status, 429); assert.ok(Number(r.retryAfter) > 0);
  assert.equal((await h.post({ step: 'lookup', gdn: 'P171632' }, { ip: '198.51.100.9' })).status, 200);
});

/* ---------- code ---------- */
both('code needs a provider: no Telnyx env and no MESSAGING_PROVIDER=fake answers 503', async make => {
  const r = await make().post({ step: 'code', gdn: 'P000678X' });
  assert.equal(r.status, 503); assert.equal(r.body.error, 'code_unavailable');
});
both('code goes out through Telnyx Verify to the license phone, in E.164', async make => {
  const h = make({ env: { TELNYX_API_KEY: 'KEY', TELNYX_VERIFY_PROFILE_ID: 'VP' }, telnyx: telnyxOk() });
  const r = await h.post({ step: 'code', gdn: 'P000678X' });
  assert.deepEqual(r.body, { status: 'code_sent', phoneLast4: '1234' });
  const call = h.calls.find(c => c.url.endsWith('/verifications/sms'));
  assert.deepEqual(JSON.parse(call.init.body), { phone_number: '+1' + PHONE, verify_profile_id: 'VP' });
  assert.equal(call.init.headers.Authorization, 'Bearer KEY');
});
both('code: no match, no phone', async make => {
  const h = make({ env: { MESSAGING_PROVIDER: 'fake' } });
  assert.equal((await h.post({ step: 'code', gdn: 'P999999' })).body.error, 'no_match');
  assert.equal((await h.post({ step: 'code', gdn: 'P200001' })).body.error, 'no_phone');
});
both('code: one per GDN per 30 seconds, five per hour', async make => {
  const h = make({ env: { MESSAGING_PROVIDER: 'fake' } });
  assert.equal((await h.post({ step: 'code', gdn: 'P000678X' })).body.status, 'code_sent');
  const soon = await h.post({ step: 'code', gdn: 'P000678X' }, { ip: '198.51.100.9' });
  assert.equal(soon.status, 429); assert.ok(Number(soon.retryAfter) >= 1 && Number(soon.retryAfter) <= 30);
  for (let i = 2; i <= 5; i++) { h.advance(31_000); assert.equal((await h.post({ step: 'code', gdn: 'P000678X' })).status, 200, `send ${i}`); }
  h.advance(31_000);
  const sixth = await h.post({ step: 'code', gdn: 'P000678X' });
  assert.equal(sixth.status, 429); assert.ok(Number(sixth.retryAfter) > 30, 'waits for the hour, not the 30 seconds');
  h.advance(60 * 60_000);
  assert.equal((await h.post({ step: 'code', gdn: 'P000678X' })).status, 200);
});

/* ---------- verify ---------- */
both('verify: wrong code, then the right one', async make => {
  const h = make({ env: { TELNYX_API_KEY: 'KEY', TELNYX_VERIFY_PROFILE_ID: 'VP' }, telnyx: telnyxOk('482913') });
  await h.post({ step: 'code', gdn: 'P000678X' });
  assert.deepEqual((await h.post({ step: 'verify', gdn: 'P000678X', code: '111111' })).body, { status: 'wrong_code' });
  assert.deepEqual((await h.post({ step: 'verify', gdn: 'P000678X', code: '482913' })).body, { status: 'verified' });
});
both('verify: six digits only', async make => {
  const h = make({ env: { MESSAGING_PROVIDER: 'fake' } });
  for (const code of ['12345', '1234567', 'abcdef', 123456]) assert.equal((await h.post({ step: 'verify', gdn: 'P000678X', code })).body.error, 'invalid_code');
});
both('verify: ten-minute expiry', async make => {
  const h = make({ env: { MESSAGING_PROVIDER: 'fake' } });
  await h.post({ step: 'code', gdn: 'P000678X' });
  h.advance(10 * 60_000 + 1);
  const r = await h.post({ step: 'verify', gdn: 'P000678X', code: '000000' });
  assert.equal(r.status, 410); assert.equal(r.body.error, 'code_expired');
});
both('verify: five attempts per code', async make => {
  const h = make({ env: { MESSAGING_PROVIDER: 'fake' } });
  await h.post({ step: 'code', gdn: 'P000678X' });
  for (let i = 0; i < 5; i++) assert.equal((await h.post({ step: 'verify', gdn: 'P000678X', code: '123456' })).body.status, 'wrong_code');
  const r = await h.post({ step: 'verify', gdn: 'P000678X', code: '000000' });
  assert.equal(r.status, 429); assert.equal(r.body.error, 'too_many_attempts');
  h.advance(31_000);
  await h.post({ step: 'code', gdn: 'P000678X' });
  assert.equal((await h.post({ step: 'verify', gdn: 'P000678X', code: '000000' })).body.status, 'verified', 'a new code resets the attempts');
});
both('verify without a code sent is expired', async make => {
  const h = make({ env: { MESSAGING_PROVIDER: 'fake' } });
  assert.equal((await h.post({ step: 'verify', gdn: 'P000678X', code: '000000' })).body.error, 'code_expired');
});

/* ---------- apply ---------- */
both('apply records the answers with the server-checked fields', async make => {
  const h = make();
  const r = await h.post(applyBody({ application: application({ lotSize: 'lots', extra: 'dropped' }) }));
  assert.deepEqual(r.body, { status: 'accepted' });
  const a = h.lastApplication('ana@lot.com');
  assert.equal(a.gdn, 'P000678X'); assert.equal(a.gdnMatched, true); assert.equal(a.dealerName, 'Impac Manufacturing, Inc.');
  assert.equal(a.phoneVerified, false, 'the server, not the page, says whether the phone was verified');
  assert.equal(a.phoneVerifiedClaimed, true); assert.equal(a.lotSize, null); assert.equal('extra' in a, false);
  assert.ok(!JSON.stringify(a).includes(PHONE));
});
both('apply validation', async make => {
  const h = make();
  assert.equal((await h.post(applyBody({ email: 'bad' }))).body.error, 'invalid_email');
  assert.equal((await h.post(applyBody({ website: 'spam' }))).body.error, 'invalid_email');
  assert.equal((await h.post(applyBody({ fullName: '' }))).body.error, 'invalid_full_name');
  assert.equal((await h.post(applyBody({ application: [] }))).body.error, 'invalid_application');
  assert.equal((await h.post(applyBody({ x: 1 }))).body.error, 'invalid_email');
  assert.equal((await h.post({ step: 'nope' })).body.error, 'invalid_step');
});
both('no key while ISSUE_KEYS is off, even matched and verified', async make => {
  const h = make({ env: AUCTION_ENV, telnyx: telnyxOk(), auction: auctionOk });
  assert.deepEqual((await verifiedApply(h)).body, { status: 'accepted' });
  assert.equal(h.lastApplication('ana@lot.com').phoneVerified, true);
  assert.ok(!h.calls.some(c => c.url.startsWith('https://auction.example/')));
});
both('with ISSUE_KEYS=1 a matched, Telnyx-verified applicant gets the Desk key from POST /dealers/mint with MINT_SECRET', async make => {
  const h = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1' }, telnyx: telnyxOk(), auction: auctionOk });
  const r = await verifiedApply(h);
  assert.equal(r.body.status, 'accepted'); assert.match(r.body.key, /^d:P000678X\./);
  const call = h.calls.find(c => c.url === 'https://auction.example/dealers/mint');
  assert.deepEqual(JSON.parse(call.init.body), { gdn: 'P000678X', name: 'Impac Manufacturing, Inc.', city: 'Los Fresnos' });
  assert.equal(call.init.headers.Authorization, `Bearer ${MINT}`);
  assert.ok(!h.calls.some(c => c.url === 'https://auction.example/dealers'), 'never the admin route');
  assert.deepEqual((await h.post(applyBody())).body, { status: 'accepted' }, 'one verification, one key');
});
both('with ISSUE_KEYS=1: no key without a verified code, from another client, after 30 minutes, from the fake provider, or on a failed mint', async make => {
  const h1 = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1' }, telnyx: telnyxOk(), auction: auctionOk });
  assert.deepEqual((await h1.post(applyBody())).body, { status: 'accepted' });
  const h2 = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1' }, telnyx: telnyxOk(), auction: auctionOk });
  await h2.post({ step: 'code', gdn: 'P000678X' }); await h2.post({ step: 'verify', gdn: 'P000678X', code: '482913' });
  assert.deepEqual((await h2.post(applyBody({ fullName: 'Eve Smith', email: 'eve@x.com' }), { ip: '198.51.100.9' })).body, { status: 'accepted' });
  h2.advance(30 * 60_000 + 1);
  assert.deepEqual((await h2.post(applyBody())).body, { status: 'accepted' });
  const h3 = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1', MESSAGING_PROVIDER: 'fake' }, auction: auctionOk });
  await h3.post({ step: 'code', gdn: 'P000678X' });
  assert.equal((await h3.post({ step: 'verify', gdn: 'P000678X', code: '000000' })).body.status, 'verified');
  assert.deepEqual((await h3.post(applyBody())).body, { status: 'accepted' });
  const h4 = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1' }, telnyx: telnyxOk(), auction: async () => new Response('admin only', { status: 403 }) });
  assert.deepEqual((await verifiedApply(h4)).body, { status: 'accepted' }, 'a failed mint still accepts the application');
  const h5 = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1' }, telnyx: telnyxOk(), auction: async () => Response.json({ error: 'already_minted' }, { status: 409 }) });
  assert.deepEqual((await verifiedApply(h5)).body, { status: 'accepted' }, 'already_minted gives no key');
});
test('the key issuer needs MINT_SECRET of 32 or more characters; DEALER_SECRET alone issues nothing', () => {
  const f = async () => Response.json({});
  assert.equal(lane.laneKeyIssuer({ ISSUE_KEYS: '1', AUCTION_API_URL: 'https://auction.example', DEALER_SECRET: 's'.repeat(40) }, f), null);
  assert.equal(lane.laneKeyIssuer({ ISSUE_KEYS: '1', AUCTION_API_URL: 'https://auction.example', MINT_SECRET: 'm'.repeat(31) }, f), null);
  assert.equal(lane.laneKeyIssuer({ ISSUE_KEYS: '1', AUCTION_API_URL: 'http://auction.example', MINT_SECRET: MINT }, f), null);
  assert.equal(typeof lane.laneKeyIssuer({ ISSUE_KEYS: '1', AUCTION_API_URL: 'https://auction.example', MINT_SECRET: MINT }, f), 'function');
});
both('the whole flow writes nothing to the console', async make => {
  const seen = [], keep = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { keep[k] = console[k]; console[k] = (...a) => seen.push(a.join(' ')); }
  try {
    const h = make({ env: { ...AUCTION_ENV, ISSUE_KEYS: '1' }, telnyx: telnyxOk(), auction: auctionOk });
    await h.post({ step: 'lookup', gdn: 'P000678X' });
    await verifiedApply(h);
    const broken = make({ env: { TELNYX_API_KEY: 'KEY', TELNYX_VERIFY_PROFILE_ID: 'VP' }, telnyx: async () => { throw Error('net ' + PHONE); } });
    assert.equal((await broken.post({ step: 'code', gdn: 'P000678X' })).body.error, 'code_not_sent');
  } finally { Object.assign(console, keep); }
  assert.deepEqual(seen, []);
});

/* ---------- the v9 confirmation ---------- */
test('v9 confirmation: dealer copy, one action, no dashes, no fee, no agency copy', () => {
  const m = renderLaneConfirmation('Ana <Ruiz>');
  assert.equal(m.subject, 'Your Obavia lane application is in');
  assert.ok(m.text.startsWith('Hi Ana <Ruiz>,'));
  assert.ok(m.html.includes('Hi Ana &lt;Ruiz&gt;,'));
  for (const part of [m.subject, m.text, m.html]) {
    assert.ok(!/[\u2013\u2014]/.test(part), 'no en or em dash');
    assert.ok(!/agency|sales team|fee|\$|guarantee|commission|price/i.test(part));
  }
  assert.equal((m.html.match(/<a /g) || []).length, 1, 'one link');
  assert.ok(m.text.includes('TxDMV') && m.text.includes('GDN'));
  assert.ok(renderLaneConfirmation(undefined).text.startsWith('Hello,'));
});
test('the lane modules carry no en or em dash', () => {
  for (const f of ['lane.mjs', 'template-v9.mjs', 'template-v10.mjs', 'assets.mjs', 'sync-bundle.mjs', 'README.md', '0001_lane_application.sql']) {
    const s = readFileSync(new URL(`./lane/${f}`, import.meta.url), 'utf8');
    assert.ok(!/[\u2013\u2014]/.test(s), f);
  }
});

/* ---------- the bundle only ---------- */
btest('the bundle carries verbatim copies of deploy/site/lane', () => {
  const text = readFileSync(BUNDLE_URL, 'utf8');
  assert.equal(syncBundle(text), text, 'run: node deploy/site/lane/sync-bundle.mjs');
  assert.equal(bundle.renderLaneConfirmation('Ana Ruiz').html, renderLaneConfirmation('Ana Ruiz').html);
  assert.deepEqual(bundle.renderWaitlistV10(), renderWaitlistV10());
  assert.equal(bundle.waitlistTemplateVersion({}, 'x'), waitlistTemplateVersion({}, 'x'));
  assert.equal(bundle.serveSiteAsset.toString(), serveSiteAsset.toString());
});
const entry = (h, email) => h.db.raw.prepare('SELECT * FROM waitlist_entries WHERE email=?').get(email);
const outbox = (h, id) => h.db.raw.prepare('SELECT * FROM confirmation_outbox WHERE id=?').get(id);
btest('legacy {fullName, email, website} is accepted exactly as before', async () => {
  const h = bundleHarness();
  const r = await h.post({ fullName: 'Ana Ruiz', email: 'Ana@Example.com', website: '' });
  assert.equal(r.status, 200); assert.deepEqual(r.body, { status: 'accepted' });
  const e = entry(h, 'ana@example.com');
  assert.equal(e.full_name, 'Ana Ruiz'); assert.equal(e.application, null);
  assert.equal(outbox(h, e.id).template_version, 'waitlist-confirmation-v8');
});
btest('legacy body works on a database without the lane migration', async () => {
  assert.equal((await bundleHarness({ lane: false }).post({ fullName: 'Ana Ruiz', email: 'ana@example.com', website: '' })).status, 200);
});
btest('legacy rejections are unchanged', async () => {
  const h = bundleHarness();
  assert.deepEqual((await h.post({ email: 'a@example.com', foo: 1 })).body, { error: 'invalid_email' });
  assert.deepEqual((await h.post({ email: 'a@example.com', website: 'x' })).body, { error: 'invalid_email' });
  assert.deepEqual((await h.post({ email: 'a@example.com', fullName: 'A', firstName: 'A' })).body, { error: 'ambiguous_name' });
  const big = await h.post(null, { raw: JSON.stringify({ email: 'a@example.com', fullName: 'A'.repeat(3000) }) });
  assert.equal(big.status, 413); assert.equal(big.body.error, 'body_too_large');
  assert.equal((await h.post(null, { raw: '{' + ' '.repeat(3000) })).status, 413);
  assert.equal((await h.post(null, { raw: '{' })).status, 400);
});
btest('apply stores beside the waitlist entry and queues the v9 confirmation', async () => {
  const h = bundleHarness();
  await h.post(applyBody({ email: 'Ana@Lot.com' }));
  const e = entry(h, 'ana@lot.com');
  assert.equal(e.full_name, 'Ana Ruiz'); assert.ok(e.application_at > 0);
  const o = outbox(h, e.id);
  assert.equal(o.template_version, 'waitlist-confirmation-v9'); assert.equal(o.greeting_name, 'Ana Ruiz');
});
btest('apply onto an email already on the list keeps the entry and attaches the answers', async () => {
  const h = bundleHarness();
  await h.post({ fullName: 'Ana Ruiz', email: 'ana@lot.com', website: '' });
  const before = entry(h, 'ana@lot.com');
  assert.equal((await h.post(applyBody())).status, 200);
  const after = entry(h, 'ana@lot.com');
  assert.equal(after.id, before.id); assert.equal(after.created_at, before.created_at);
  assert.equal(JSON.parse(after.application).losingCar, '2014 Nissan Altima, 90 days');
  assert.equal(outbox(h, after.id).template_version, 'waitlist-confirmation-v8', 'no second email');
});
btest('apply shares the waitlist email limit', async () => {
  const h = bundleHarness();
  for (let i = 0; i < 5; i++) assert.equal((await h.post(applyBody())).status, 200);
  const r = await h.post(applyBody());
  assert.equal(r.status, 429); assert.equal(r.retryAfter, '3600');
});
btest('the v9 outbox row goes out through the existing delivery path', async () => {
  const h = bundleHarness();
  await h.post(applyBody());
  const sent = [], waits = [];
  const env = { ...h.env, CONFIRMATION_ENABLED: 'true', CONFIRMATION_ACTIVATION_AFTER_MS: '1', WAITLIST_EMAIL_PROVIDER: 'cloudflare', WAITLIST_EMAIL_FROM: 'no-reply@notify.obavia.co',
    CONFIRMATION_EMAIL: { async send(m) { sent.push(m); return { messageId: 'm-1' }; } } };
  await bundle.createWorker().scheduled({}, env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, 'Your Obavia lane application is in');
  assert.deepEqual(sent[0].to, ['ana@lot.com']);
  assert.ok(sent[0].text.startsWith('Hi Ana Ruiz,'));
});

/* ---------- the v10 buyer confirmation and the rule that picks it ---------- */
test('the template rule: application gives v9, no application and no fullName gives v10, anything else the legacy version', () => {
  const LEGACY = 'waitlist-confirmation-v8';
  assert.equal(BUYER_TEMPLATE_VERSION, 'waitlist-confirmation-v10');
  assert.equal(waitlistTemplateVersion({ email: 'a@b.co' }, LEGACY), 'waitlist-confirmation-v10', 'the buyer page body');
  assert.equal(waitlistTemplateVersion({ email: 'a@b.co', website: '' }, LEGACY), 'waitlist-confirmation-v10');
  assert.equal(waitlistTemplateVersion({ email: 'a@b.co', firstName: 'Ana' }, LEGACY), 'waitlist-confirmation-v10', 'no fullName, no application');
  assert.equal(waitlistTemplateVersion({ fullName: undefined }, LEGACY), 'waitlist-confirmation-v10');
  assert.equal(waitlistTemplateVersion({ fullName: 'Ana Ruiz', email: 'a@b.co' }, LEGACY), LEGACY);
  assert.equal(waitlistTemplateVersion({ fullName: 'Ana Ruiz' }, undefined), undefined, 'legacy stays whatever the worker is configured with');
  assert.equal(waitlistTemplateVersion({ fullName: 'Ana Ruiz', application: '{}' }, LEGACY), 'waitlist-confirmation-v9');
  assert.equal(waitlistTemplateVersion({ application: {} }, LEGACY), 'waitlist-confirmation-v9');
  assert.equal(waitlistTemplateVersion(null, LEGACY), 'waitlist-confirmation-v10');
});
test('v10 confirmation: buyer copy, the three pairs, one link, no dashes, no fee, outcome or saving claims', () => {
  const m = renderWaitlistV10();
  assert.equal(m.subject, "You're on the lane");
  assert.ok(m.text.startsWith('Hello,'));
  for (const pair of ['A $250 deposit to bid. Back if you lose.', "A Texas driver's license.", 'A price, a time, a name.']) {
    assert.ok(m.text.includes(pair), pair); assert.ok(m.html.includes(pair), pair);
  }
  for (const part of [m.subject, m.text, m.html]) {
    assert.ok(!/[\u2013\u2014]/.test(part), 'no en or em dash');
    assert.ok(!/agency|sales team|fee|premium|commission|guarantee|promise|save|saving|cheap|discount|below|bargain|deal|profit|win\b|winning|refund within|hour/i.test(part), part.slice(0, 60));
  }
  const links = m.html.match(/<a [^>]*href="([^"]+)"/g) || [];
  assert.equal(links.length, 1, 'one link');
  assert.ok(links[0].includes('https://obavia.co/waitlist.html#deposit'));
  assert.equal((m.text.match(/https:\/\//g) || []).length, 1);
  assert.ok(m.html.includes('>See the lane</a>'), 'one verb');
  const page = readFileSync(new URL('../../obavia-co/waitlist.html', import.meta.url), 'utf8');
  assert.ok(page.includes('id="deposit"'), 'the anchor exists on the buyer page');
  assert.ok(!page.includes('id="how"'), 'waitlist.html has no #how, so the link uses #deposit');
});

btest('the buyer body {email} is accepted and queues the v10 confirmation, which goes out through the delivery path', async () => {
  const h = bundleHarness();
  const r = await h.post({ email: 'Buyer@Example.com' });
  assert.deepEqual(r.body, { status: 'accepted' });
  const e = entry(h, 'buyer@example.com');
  assert.equal(e.full_name, null); assert.equal(e.first_name, null); assert.equal(e.application, null);
  const o = outbox(h, e.id);
  assert.equal(o.template_version, 'waitlist-confirmation-v10'); assert.equal(o.greeting_name, null);
  const sent = [], waits = [];
  const env = { ...h.env, CONFIRMATION_ENABLED: 'true', CONFIRMATION_ACTIVATION_AFTER_MS: '1', WAITLIST_EMAIL_PROVIDER: 'cloudflare', WAITLIST_EMAIL_FROM: 'no-reply@notify.obavia.co',
    CONFIRMATION_EMAIL: { async send(m) { sent.push(m); return { messageId: 'm-1' }; } } };
  await bundle.createWorker().scheduled({}, env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, "You're on the lane");
  assert.deepEqual(sent[0].to, ['buyer@example.com']);
  assert.equal(sent[0].html, renderWaitlistV10().html);
});
btest('fullName bodies keep the legacy template; a buyer who later applies gets no second email', async () => {
  const h = bundleHarness();
  await h.post({ fullName: 'Ana Ruiz', email: 'ana@example.com', website: '' });
  assert.equal(outbox(h, entry(h, 'ana@example.com').id).template_version, 'waitlist-confirmation-v8');
  await h.post({ email: 'ana@lot.com' });
  assert.equal((await h.post(applyBody())).status, 200);
  const e = entry(h, 'ana@lot.com');
  assert.equal(outbox(h, e.id).template_version, 'waitlist-confirmation-v10', 'no second email');
  assert.ok(e.application_at > 0, 'the answers are attached');
});
btest('the store and the outbox accept v10 as they accept v9, and reject an unknown version', async () => {
  const db = d1();
  assert.equal(await bundle.createWorker({ storeFactory: (d, o) => { assert.equal(o.templateVersion, 'waitlist-confirmation-v10'); return { join: async () => 'accepted' }; } })
    .fetch(new Request(`${ORIGIN}/api/waitlist`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' }, body: '{"email":"b@example.com"}' }),
      { ...base({}).env, WAITLIST_DB: db }).then(r => r.status), 200);
  const h = bundleHarness({ env: { WAITLIST_TEMPLATE_VERSION: 'waitlist-confirmation-v11' } });
  assert.equal((await h.post({ fullName: 'Ana Ruiz', email: 'ana@example.com' })).status, 503, 'unknown legacy version still refused');
});
btest('the buyer sign-up and its delivery write no email address to the console', async () => {
  const seen = [], keep = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { keep[k] = console[k]; console[k] = (...a) => seen.push(a.map(String).join(' ')); }
  try {
    const h = bundleHarness();
    await h.post({ email: 'quiet@example.com' });
    const waits = [];
    const env = { ...h.env, CONFIRMATION_ENABLED: 'true', CONFIRMATION_ACTIVATION_AFTER_MS: '1', WAITLIST_EMAIL_PROVIDER: 'cloudflare', WAITLIST_EMAIL_FROM: 'no-reply@notify.obavia.co',
      CONFIRMATION_EMAIL: { async send() { throw Error('provider down for quiet@example.com'); } } };
    await bundle.createWorker().scheduled({}, env, { waitUntil: p => waits.push(p) });
    await Promise.all(waits).catch(() => {});
  } finally { Object.assign(console, keep); }
  assert.ok(!seen.some(line => line.includes('@')), seen.join('\n'));
});

/* ---------- the asset folders ---------- */
const fakeAssets = (status = 200) => {
  const seen = [];
  return { seen, async fetch(req) { seen.push(new URL(req.url).pathname); return new Response(status === 200 ? 'bytes' : 'missing', { status, headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public, max-age=600', ETag: '"e1"' } }); } };
};
const FOLDER_CASES = [
  ['/sky/clouds/far@2x.webp', 'image/webp'],
  ['/sky/paper.png', 'image/png'],
  ['/obavia/sky/w0.webp', 'image/webp'],
  ['/audio/cloud/cloud-touch.wav', 'audio/wav'],
  ['/logos/whop.svg', 'image/svg+xml'],
  ['/connections/zoom-light.svg', 'image/svg+xml'],
  ['/connections/highlevel-light.png', 'image/png'],
  ['/assets/cloud-3d/sky/light/far@2x.webp', 'image/webp'],
  ['/assets/cloud-3d/button/light/320/rest@2x.png', 'image/png'],
  ['/assets/cloud-3d/button/light/320/sheet.json', 'application/json; charset=utf-8'],
  ['/assets/cloud-3d/type/face.woff2', 'font/woff2'],
];
test('asset folders: each folder is served with its content type and the ASSETS cache headers', async () => {
  assert.deepEqual([...SITE_ASSET_FOLDERS], ['sky', 'audio', 'logos', 'connections', 'assets/cloud-3d']);
  for (const [path, type] of FOLDER_CASES) {
    const ASSETS = fakeAssets();
    const r = await serveSiteAsset(new Request(ORIGIN + path), { ASSETS });
    assert.equal(r.status, 200, path); assert.equal(r.headers.get('Content-Type'), type, path);
    assert.equal(r.headers.get('Cache-Control'), 'public, max-age=600', 'the same cache headers as the existing branch: the ASSETS ones');
    assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff'); assert.equal(r.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(await r.text(), 'bytes'); assert.deepEqual(ASSETS.seen, [path]);
  }
  const head = await serveSiteAsset(new Request(ORIGIN + '/sky/paper.png', { method: 'HEAD' }), { ASSETS: fakeAssets() });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  const missing = await serveSiteAsset(new Request(ORIGIN + '/sky/nope.webp'), { ASSETS: fakeAssets(404) });
  assert.equal(missing.status, 404); assert.equal(missing.headers.get('Content-Type'), 'application/octet-stream', 'a miss keeps the ASSETS type');
});
test('asset folders: 404 for anything else in them, null outside them', async () => {
  for (const path of ['/sky/', '/sky/x.exe', '/sky/x.html', '/sky/x.js', '/audio/manifest', '/sky/.hidden.webp', '/logos/a b.svg', '/connections/x.WEBP']) {
    const ASSETS = fakeAssets();
    const r = await serveSiteAsset(new Request(ORIGIN + path), { ASSETS });
    assert.equal(r.status, 404, path); assert.equal(r.headers.get('Cache-Control'), 'private, no-store'); assert.deepEqual(ASSETS.seen, [], path);
  }
  assert.equal(siteAssetType('/sky/a/../b.webp'), null);
  assert.equal(await serveSiteAsset(new Request(ORIGIN + '/sky/%2e%2e/x.webp'), { ASSETS: fakeAssets() }), null, 'the URL parser resolves %2e%2e out of the folder first');
  assert.equal((await serveSiteAsset(new Request(ORIGIN + '/sky/paper.png', { method: 'POST' }), { ASSETS: fakeAssets() })).status, 404);
  assert.equal((await serveSiteAsset(new Request(ORIGIN + '/sky/paper.png'), {})).status, 404, 'no ASSETS binding');
  for (const path of ['/secret/x.webp', '/assets/obavia-clouds.webp', '/index.html', '/skyline/x.webp', '/sky', '/api/waitlist', '/email-assets/waitlist-v4/cloud.png'])
    assert.equal(await serveSiteAsset(new Request(ORIGIN + path), { ASSETS: fakeAssets() }), null, path);
});
test('asset folders: every file the site ships in sky/ and audio/cloud/ has a served type', () => {
  const site = new URL('../../obavia-co/', import.meta.url);
  const walk = rel => readdirSync(new URL(rel, site)).flatMap(n => statSync(new URL(rel + n, site)).isDirectory() ? walk(`${rel}${n}/`) : [rel + n]);
  const files = [...walk('sky/'), ...walk('audio/cloud/')];
  assert.ok(files.length >= 20);
  for (const f of files) assert.ok(siteAssetType('/' + f), f);
});
btest('the bundle serves each asset folder and still 404s anything else', async () => {
  const worker = bundle.createWorker();
  const get = async (path, method = 'GET') => worker.fetch(new Request(ORIGIN + path, { method }), { PUBLIC_ORIGIN: ORIGIN, ASSETS: fakeAssets() });
  for (const [path, type] of FOLDER_CASES) {
    const r = await get(path);
    assert.equal(r.status, 200, path); assert.equal(r.headers.get('Content-Type'), type, path);
  }
  assert.equal((await get('/assets/manrope-400.woff2')).status, 200, 'the existing /assets/ branch is unchanged');
  assert.equal((await get('/favicon.svg')).status, 200, 'top-level files are unchanged');
  for (const path of ['/secret/x.webp', '/sky/x.exe', '/films/x.mp4', '/sky/', '/assets/.env'])
    assert.equal((await get(path)).status, 404, path);
  assert.equal((await get('/sky/paper.png', 'POST')).status, 404);
});
