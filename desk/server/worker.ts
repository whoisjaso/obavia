/* The Desk API on Cloudflare Workers: dealer verification at onboarding,
   sending texts for the Desk, and the Telnyx webhook.
     POST /api/verify/start   {licence, channel}        -> {ok, sentTo} | {ok:false, reason}
     POST /api/verify/check   {licence, channel, code}  -> {ok, token}  | {ok:false, reason}
     POST /api/messages       Bearer INTERNAL_API_TOKEN, SendRequest -> SendOutcome
     POST /webhooks/telnyx    signed by Telnyx
     POST /webhooks/paynearme signed by PayNearMe: payments, declines, returns, chargebacks
   Config in server/wrangler.toml; secrets with `wrangler secret put`. */
import { FakeProvider } from './messaging/fake';
import { Telnyx } from './messaging/telnyx';
import type { MessagingProvider } from './messaging/types';
import { Messenger, ResendEmail, Verifier, type Channel, type Contact, type ContactBook, type EmailSender, type SendRequest } from './service';
import { D1Store, type D1 } from './store';
import { PaymentDesk } from './payments/desk';
import { ack, parseCallback, verifySignature } from './payments/paynearme';
import { D1NoteStore } from './payments/d1';

type R2Object = { json<T>(): Promise<T> };
type R2 = { get(key: string): Promise<R2Object | null> };

export type Env = {
  DB: D1; DEALERS: R2;
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

export type App = { messenger: Messenger; verifier: Verifier; internalToken: string; allowedOrigins: string[]; payments?: { desk: PaymentDesk; secret: string } };

const MAX_BODY = 64 * 1024;
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
  if (req.method !== 'POST') return json({ ok: false, reason: 'not_found' }, 404, h);
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return json({ ok: false, reason: 'too_large' }, 413, h);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ ok: false, reason: 'too_large' }, 413, h);

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
  return {
    messenger,
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
};
