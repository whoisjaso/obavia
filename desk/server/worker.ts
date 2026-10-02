/* The Desk API on Cloudflare Workers: dealer verification at onboarding,
   sending texts for the Desk, and the Telnyx webhook.
     POST /api/verify/start   {licence, channel}        -> {ok, sentTo} | {ok:false, reason}
     POST /api/verify/check   {licence, channel, code}  -> {ok, token}  | {ok:false, reason}
     POST /api/messages       Bearer INTERNAL_API_TOKEN, SendRequest -> SendOutcome
     POST /webhooks/telnyx    signed by Telnyx
     POST /webhooks/paynearme signed by PayNearMe: payments, declines, returns, chargebacks
     POST /api/desk/sync      Bearer session token from verify; {notes, facts, evening} -> {ok, notes, refused}
     GET|POST /b/<note>.<sig> the buyer's own page (signed link); POST saves a new insurance card
   Hourly (cron): reminders due today and tonight's text, per dealer time zone (server/jobs.ts).
   Config in server/wrangler.toml; secrets with `wrangler secret put`. */
import { PostingAgent } from './posting/service';
import { D1PostStore, R2PhotoStore, CloudflareBrowser } from './posting/cloudflare';
import { FacebookPagePublisher, InstagramPublisher } from './posting/meta';
import type { Post } from '../src/lib/post';
import type { Vehicle } from '../src/lib/sale';
type R2Put = { put(key: string, value: ArrayBuffer | Uint8Array, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };
import { FakeProvider } from './messaging/fake';
import { Telnyx } from './messaging/telnyx';
import type { MessagingProvider } from './messaging/types';
import { Messenger, ResendEmail, Verifier, readToken, type Channel, type Contact, type ContactBook, type EmailSender, type SendRequest } from './service';
import { D1Store, type D1 } from './store';
import { PaymentDesk } from './payments/desk';
import { ack, parseCallback, verifySignature } from './payments/paynearme';
import { D1NoteStore } from './payments/d1';
import { runJobs } from './jobs';
import { MAX_PAGE_POST, buyerRoute, pagePath, type BuyerPages } from './buyer';
import type { Loan } from '../src/lib/loans';
import type { SyncBody } from '../src/lib/sync';

type R2Object = { json<T>(): Promise<T> };
type R2 = { get(key: string): Promise<R2Object | null> };

export type Env = {
  DB: D1; DEALERS: R2;
  PHOTOS?: R2Put; PHOTOS_URL?: string;       // Reach posting: the photo bucket and its public address; posting is off until both are set
  BROWSER?: unknown;                         // Cloudflare Browser Rendering binding: the posting agent's cloud browser
  MESSAGING_PROVIDER?: string;              // 'telnyx' (default) or 'fake' for local runs only
  TELNYX_API_KEY?: string; TELNYX_MESSAGING_PROFILE_ID?: string; TELNYX_VERIFY_PROFILE_ID?: string; TELNYX_PUBLIC_KEY?: string;
  PUBLIC_URL?: string;                      // e.g. https://api.obavia.co, for delivery webhooks
  RESEND_API_KEY?: string; EMAIL_FROM?: string;
  PAYNEARME_CALLBACK_SECRET?: string;       // turns on /webhooks/paynearme
  SESSION_SECRET: string; INTERNAL_API_TOKEN: string;
  ALLOWED_ORIGIN?: string;                  // comma-separated
};

/* ---------- the dealer contact book, from the nightly TxDMV job ---------- */

type ContactsFile = { v: number; asOf: string; contacts: Record<string, Contact> };
const CACHE_MS = 10 * 60 * 1000;
let cached: { at: number; file: ContactsFile } | null = null;

export class R2ContactBook implements ContactBook {
  constructor(private bucket: R2, private key = 'tx/contacts.json', private now = () => Date.now()) {}
  async get(licence: string) {
    if (!cached || this.now() - cached.at > CACHE_MS) {
      const o = await this.bucket.get(this.key);
      if (!o) return null;
      cached = { at: this.now(), file: await o.json<ContactsFile>() };
    }
    return cached.file.contacts[licence] ?? null;
  }
}

/* ---------- the app, independent of where its parts come from ---------- */

export type DeskSync = { upsert(dealerId: string, notes: Loan[], facts?: SyncBody['facts'], evening?: SyncBody['evening']): Promise<{ notes: Loan[]; refused: string[] }> };
export type App = { posting?: { agent: PostingAgent; secret: string }; messenger: Messenger; verifier: Verifier; internalToken: string; allowedOrigins: string[]; payments?: { desk: PaymentDesk; secret: string }; desk?: { sync: DeskSync; secret: string; pageBase?: string }; buyer?: BuyerPages };
const MAX_SYNC = 900 * 1024;

const MAX_BODY = 64 * 1024;
const MAX_POST = 12 * 1024 * 1024;   // a post carries its photos (the Desk sends each one at 1600px JPEG)
const LICENCE = /^[A-Z]\d{4,7}$/;

function cors(req: Request, allowed: string[]): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !allowed.includes(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

const sameToken = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

export async function route(req: Request, app: App): Promise<Response> {
  const url = new URL(req.url), h = cors(req, app.allowedOrigins);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method === 'GET' && url.pathname === '/health') return json({ ok: true }, 200, h);
  // The buyer's own page: a signed link, plain HTML, no session.
  if (url.pathname.startsWith('/b/') && app.buyer) {
    if (Number(req.headers.get('content-length') ?? 0) > MAX_PAGE_POST) return new Response('Too large', { status: 413 });
    const r = await buyerRoute(req, url.pathname, app.buyer);
    if (r) return r;
  }
  if (req.method !== 'POST') return json({ ok: false, reason: 'not_found' }, 404, h);
  const limit = url.pathname === '/api/posts' ? MAX_POST : url.pathname === '/api/desk/sync' ? MAX_SYNC : MAX_BODY;
  if (Number(req.headers.get('content-length') ?? 0) > limit) return json({ ok: false, reason: 'too_large' }, 413, h);
  const raw = await req.text();
  if (raw.length > limit) return json({ ok: false, reason: 'too_large' }, 413, h);

  // The webhook must see the exact bytes Telnyx signed, so it is handled before any parsing.
  if (url.pathname === '/webhooks/telnyx') return new Response(null, { status: await app.messenger.webhook(raw, req.headers) });
  // PayNearMe: verify, apply to the note, text both sides, then acknowledge so it isn't re-sent.
  if (url.pathname === '/webhooks/paynearme') {
    if (!app.payments || !(await verifySignature(raw, req.headers, app.payments.secret))) return new Response(null, { status: 403 });
    const u = parseCallback(raw);
    if (!u) return json({ ok: false, reason: 'bad_request' }, 400);
    await app.payments.desk.apply(u);
    return json(ack(u), 200);
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, reason: 'bad_request' }, 400, h); }

  if (url.pathname === '/api/verify/start' || url.pathname === '/api/verify/check') {
    const licence = String(body.licence ?? '').trim().toUpperCase(), channel = body.channel as Channel;
    if (!LICENCE.test(licence) || (channel !== 'sms' && channel !== 'email')) return json({ ok: false, reason: 'bad_request' }, 400, h);
    const r = url.pathname.endsWith('start') ? await app.verifier.start(licence, channel) : await app.verifier.check(licence, channel, String(body.code ?? ''));
    return json(r, r.ok ? 200 : r.reason === 'rate_limited' || r.reason === 'too_many_attempts' ? 429 : r.reason === 'unknown_licence' ? 404 : 422, h);
  }

  if (url.pathname === '/api/desk/sync') {
    const claims = app.desk ? await readToken(app.desk.secret, (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')) : null;
    if (!app.desk || !claims) return json({ ok: false, reason: 'unauthorised' }, 401, h);
    const b = body as Partial<SyncBody>;
    if (!Array.isArray(b.notes) || b.notes.some(n => typeof n?.id !== 'string' || !Array.isArray(n.payments))) return json({ ok: false, reason: 'bad_request' }, 400, h);
    const r = await app.desk.sync.upsert(claims.licence, b.notes, b.facts, b.evening);
    // each note comes back with the link to the buyer's own page, when the API has a public address
    const base = app.desk.pageBase, pages = app.buyer && base ? await Promise.all(r.notes.map(async n => ({ ...n, page: base + await pagePath(app.buyer!.secret, n.id) }))) : r.notes;
    return json({ ok: true, ...r, notes: pages }, 200, h);
  }

  // Reach: post one car to every channel turned on. The posting agent publishes
  // through official APIs and prepares the hand-off channels; see posting/service.ts.
  if (url.pathname === '/api/posts') {
    const claims = app.posting ? await readToken(app.posting.secret, (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')) : null;
    if (!app.posting || !claims) return json({ ok: false, reason: 'unauthorised' }, 401, h);
    const p = body.post as Post | undefined, v = body.vehicle as Vehicle | undefined;
    if (!p || typeof p.id !== 'string' || !Array.isArray(p.photos) || !Array.isArray(p.channels) || !v || typeof v.vin !== 'string') return json({ ok: false, reason: 'bad_request' }, 400, h);
    const r = await app.posting.agent.run(claims.licence, { ...p, deliveries: Array.isArray(p.deliveries) ? p.deliveries : [] }, v);
    return json({ ok: true, ...r }, 200, h);
  }

  if (url.pathname === '/api/messages') {
    const auth = req.headers.get('authorization') ?? '';
    if (!app.internalToken || !sameToken(auth, `Bearer ${app.internalToken}`)) return json({ ok: false, reason: 'unauthorised' }, 401);
    const r = await app.messenger.send(body as unknown as SendRequest);
    return json(r, r.ok ? 200 : 422);
  }

  return json({ ok: false, reason: 'not_found' }, 404, h);
}

/* ---------- wiring for Cloudflare ---------- */

const logEmail: EmailSender = { async send(to, subject) { console.log('[email:preview]', to.replace(/^(.).*@/, '$1…@'), subject); } };

export function build(env: Env): App {
  const store = new D1Store(env.DB);
  let provider: MessagingProvider;
  if (env.MESSAGING_PROVIDER === 'fake') {
    const f = new FakeProvider(); f.nextCode = '000000'; provider = f;   // local runs only: every code is 000000
  } else {
    for (const k of ['TELNYX_API_KEY', 'TELNYX_MESSAGING_PROFILE_ID', 'TELNYX_VERIFY_PROFILE_ID', 'TELNYX_PUBLIC_KEY'] as const) if (!env[k]) throw new Error(`${k} is not set`);
    provider = new Telnyx({
      apiKey: env.TELNYX_API_KEY!, messagingProfileId: env.TELNYX_MESSAGING_PROFILE_ID!, verifyProfileId: env.TELNYX_VERIFY_PROFILE_ID!,
      publicKey: env.TELNYX_PUBLIC_KEY!, webhookUrl: env.PUBLIC_URL ? `${env.PUBLIC_URL.replace(/\/$/, '')}/webhooks/telnyx` : undefined,
    });
  }
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const email = env.RESEND_API_KEY && env.EMAIL_FROM ? new ResendEmail(env.RESEND_API_KEY, env.EMAIL_FROM) : logEmail;
  const messenger = new Messenger(provider, store);
  const notes = new D1NoteStore(env.DB);
  const posting = env.PHOTOS && env.PHOTOS_URL ? {
    agent: new PostingAgent(new D1PostStore(env.DB, env.SESSION_SECRET, env.PHOTOS, env.PHOTOS_URL), new R2PhotoStore(env.PHOTOS, env.PHOTOS_URL),
      [new FacebookPagePublisher(), new InstagramPublisher()], env.BROWSER ? new CloudflareBrowser(env.BROWSER) : undefined),
    secret: env.SESSION_SECRET,
  } : undefined;
  return {
    posting,
    messenger,
    desk: { sync: notes, secret: env.SESSION_SECRET, pageBase: env.PUBLIC_URL?.replace(/\/$/, '') },
    buyer: { notes, messenger, secret: env.SESSION_SECRET },
    payments: env.PAYNEARME_CALLBACK_SECRET ? { desk: new PaymentDesk(notes, messenger, n => notes.dealerFor(n)), secret: env.PAYNEARME_CALLBACK_SECRET } : undefined,
    verifier: new Verifier(provider, store, new R2ContactBook(env.DEALERS), email, env.SESSION_SECRET),
    internalToken: env.INTERNAL_API_TOKEN ?? '',
    allowedOrigins: (env.ALLOWED_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean),
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try { return await route(req, build(env)); }
    catch (e) { console.error('[desk-api]', e instanceof Error ? e.message : e); return json({ ok: false, reason: 'server_error' }, 500); }
  },
  /** Hourly: reminders and tonight's text (see wrangler.toml [triggers]). */
  async scheduled(_ev: unknown, env: Env): Promise<void> {
    const app = build(env), notes = new D1NoteStore(env.DB);
    const done = await runJobs(notes, app.messenger);
    console.log('[desk-jobs]', JSON.stringify(done));
  },
};
