/* The messaging service: every text goes out through the gate, every
   webhook is verified, every STOP is honoured, and dealer verification at
   onboarding sends the code to the contact on the TxDMV licence record. */
import { gate, helpReply, keyword, keywordLang, startReply, stopReply, toE164 } from './messaging/core';
import type { MessageKind, MessagingProvider, ProviderEvent } from './messaging/types';
import type { Store } from './store';

/* ---------- sending and receiving ---------- */

export type SendRequest = { dealerId: string; from: string; to: string; text: string; kind: MessageKind; mediaUrls?: string[]; recipientTimeZone?: string };
export type SendOutcome = { ok: true; providerId: string; parts: number } | { ok: false; reason: string };

export class Messenger {
  constructor(private p: MessagingProvider, private store: Store, private clock: () => Date = () => new Date()) {}

  async send(r: SendRequest): Promise<SendOutcome> {
    const to = toE164(r.to), now = this.clock();
    if (!to) return { ok: false, reason: 'bad_number' };
    const decision = gate(r.kind, to, r.text, {
      suppressed: await this.store.isSuppressed(r.dealerId, to),
      marketingConsent: r.kind === 'marketing' ? await this.store.hasMarketingConsent(r.dealerId, to) : false,
      now, recipientTimeZone: r.recipientTimeZone ?? 'America/Chicago',
    });
    if (!decision.ok) return { ok: false, reason: decision.reason };
    const res = await this.p.send({ dealerId: r.dealerId, from: r.from, to, text: decision.text, mediaUrls: r.mediaUrls, kind: r.kind });
    await this.store.logMessage({ dealerId: r.dealerId, direction: 'out', providerId: res.providerId, from: r.from, to, kind: r.kind, text: decision.text, parts: res.parts, status: res.status, error: res.error, at: now.toISOString() });
    return res.status === 'failed' ? { ok: false, reason: res.error ?? 'provider_failed' } : { ok: true, providerId: res.providerId, parts: res.parts };
  }

  /** Verify, parse and act on a provider webhook. Returns the HTTP status to answer with. */
  async webhook(rawBody: string, headers: Headers): Promise<number> {
    if (!(await this.p.verifyWebhook(rawBody, headers, this.clock()))) return 403;
    const ev = this.p.parseWebhook(rawBody);
    if (!ev) return 200;                       // an event type we don't use: acknowledge so it isn't retried
    await this.handle(ev);
    return 200;
  }

  private async handle(ev: ProviderEvent) {
    if (ev.type === 'status') { await this.store.updateStatus(ev.providerId, ev.status, ev.error); return; }
    const line = await this.store.dealerByNumber(ev.to);
    const from = toE164(ev.from) ?? ev.from;
    if (!line) return;                         // not one of our dealer numbers
    await this.store.logMessage({ dealerId: line.dealerId, direction: 'in', providerId: ev.providerId, from, to: ev.to, kind: 'inbound', text: ev.text, parts: 0, status: 'received', at: ev.at });
    const k = keyword(ev.text);
    if (!k) return;                            // a real conversation: Reach takes it from here
    // Keyword replies go straight to the provider: the confirmation of a STOP is the one text allowed after it.
    if (k === 'stop') await this.store.suppress(line.dealerId, from, ev.at, 'keyword');
    if (k === 'start') await this.store.unsuppress(line.dealerId, from);
    const lang = keywordLang(ev.text);
    const text = k === 'stop' ? stopReply(line.displayName, lang) : k === 'start' ? startReply(line.displayName, lang) : helpReply(line.displayName, line.helpPhone, lang);
    const res = await this.p.send({ dealerId: line.dealerId, from: line.number, to: from, text, kind: 'care' });
    await this.store.logMessage({ dealerId: line.dealerId, direction: 'out', providerId: res.providerId, from: line.number, to: from, kind: 'keyword-reply', text, parts: res.parts, status: res.status, error: res.error, at: this.clock().toISOString() });
  }
}

/* ---------- dealer verification at onboarding ---------- */

export type Contact = { phone?: string; email?: string; name: string; street?: string; city?: string; zip?: string };
/** What a dealer gets back about themselves once they've proved they hold the licence contact. */
export type Profile = { phone?: string; email?: string; street?: string; city?: string; zip?: string };
export interface ContactBook { get(licence: string): Promise<Contact | null> }
export interface EmailSender { send(to: string, subject: string, text: string): Promise<void> }

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
const same = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

const EMAIL_WINDOW_S = 600;
async function emailCode(secret: string, licence: string, email: string, window: number) {
  const h = await hmac(secret, `email-code|${licence}|${email.toLowerCase()}|${window}`);
  const n = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, '0');
}

export type Channel = 'sms' | 'email';
export type StartOutcome = { ok: true; sentTo: string } | { ok: false; reason: 'unknown_licence' | 'no_contact' | 'rate_limited' };
export type CheckOutcome = { ok: true; token: string; profile: Profile } | { ok: false; reason: 'rejected' | 'expired' | 'too_many_attempts' | 'unknown_licence' };

/** (713) 488-3602, the way it prints on paperwork. */
export const formatPhone = (p: string) => { const d = p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };
const hintPhone = (p: string) => `(•••) •••-${p.slice(-4)}`;
const hintEmail = (e: string) => { const [u, d] = e.split('@'); return `${u[0]}${'•'.repeat(Math.min(6, Math.max(2, u.length - 1)))}@${d}`; };

export class Verifier {
  constructor(private p: MessagingProvider, private store: Store, private book: ContactBook, private email: EmailSender, private secret: string, private clock: () => Date = () => new Date()) {}

  private async contact(licence: string, channel: Channel) {
    const c = await this.book.get(licence.toUpperCase());
    if (!c) return { error: 'unknown_licence' as const };
    if (channel === 'sms') { const phone = c.phone ? toE164(c.phone) : null; return phone ? { to: phone, name: c.name, record: c } : { error: 'no_contact' as const }; }
    return c.email ? { to: c.email.toLowerCase(), name: c.name, record: c } : { error: 'no_contact' as const };
  }

  async start(licence: string, channel: Channel): Promise<StartOutcome> {
    const now = this.clock(), c = await this.contact(licence, channel);
    if ('error' in c) return { ok: false, reason: c.error! };
    if (!(await this.store.hit(`verify-start|${licence}`, 3600, 5, now))) return { ok: false, reason: 'rate_limited' };
    if (channel === 'sms') { await this.p.startVerification(c.to); return { ok: true, sentTo: hintPhone(c.to) }; }
    const code = await emailCode(this.secret, licence, c.to, Math.floor(now.getTime() / 1000 / EMAIL_WINDOW_S));
    await this.email.send(c.to, `Your Obavia code: ${code}`, `Your code to set up ${c.name} on Obavia is ${code}. It works for 10 minutes. If you didn't ask for it, ignore this email.`);
    return { ok: true, sentTo: hintEmail(c.to) };
  }

  async check(licence: string, channel: Channel, code: string): Promise<CheckOutcome> {
    const now = this.clock(), c = await this.contact(licence, channel);
    if ('error' in c) return { ok: false, reason: 'unknown_licence' };
    if (!(await this.store.hit(`verify-check|${licence}`, 600, 6, now))) return { ok: false, reason: 'too_many_attempts' };
    const clean = (code ?? '').replace(/\D/g, '');
    let result: string;
    if (channel === 'sms') result = await this.p.checkVerification(c.to, clean);
    else {
      const w = Math.floor(now.getTime() / 1000 / EMAIL_WINDOW_S);
      const ok = clean.length === 6 && (same(clean, await emailCode(this.secret, licence, c.to, w)) || same(clean, await emailCode(this.secret, licence, c.to, w - 1)));
      result = ok ? 'accepted' : 'rejected';
    }
    if (result !== 'accepted') return { ok: false, reason: result as 'rejected' | 'expired' | 'too_many_attempts' };
    const { phone, email, street, city, zip } = c.record;
    return { ok: true, token: await issueToken(this.secret, { licence: licence.toUpperCase(), via: channel }, now, SESSION_TTL_S), profile: { phone: phone ? formatPhone(phone) : undefined, email, street, city, zip } };
  }
}

/* ---------- the token a verified dealer carries into setup ---------- */

/** A verified dealer stays signed in on that device for 30 days. */
export const SESSION_TTL_S = 30 * 86400;
export type TokenClaims = { licence: string; via: Channel; iat: number; exp: number };
export async function issueToken(secret: string, c: { licence: string; via: Channel }, now = new Date(), ttlS = 86400) {
  const iat = Math.floor(now.getTime() / 1000);
  const body = b64url(enc.encode(JSON.stringify({ ...c, iat, exp: iat + ttlS })));
  return `${body}.${b64url(await hmac(secret, body))}`;
}
export async function readToken(secret: string, token: string, now = new Date()): Promise<TokenClaims | null> {
  const [body, sig] = (token ?? '').split('.');
  if (!body || !sig || !same(sig, b64url(await hmac(secret, body)))) return null;
  const c = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as TokenClaims;
  return c.exp > now.getTime() / 1000 ? c : null;
}

/* ---------- Resend, for email codes and receipts ---------- */

export class ResendEmail implements EmailSender {
  constructor(private apiKey: string, private from: string, private f: typeof fetch = fetch.bind(globalThis)) {}
  async send(to: string, subject: string, text: string) {
    const r = await this.f('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: this.from, to: [to], subject, text }) });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  }
}
