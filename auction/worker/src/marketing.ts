/* The four standard Meta events, server side (growth plan AD1, AD3; docs/DOCTRINE.md AD 1 and 3): Lead,
   CompleteRegistration, AddPaymentInfo, Purchase. Never a custom conversion. Every event is written to
   marketing_events first (migration 0015), then sent to the Conversions API only when META_PIXEL_ID and
   META_CAPI_TOKEN are set; without them the sender is a no-op that still keeps the row, so the count is
   readable from D1 (GET /admin/marketing) before any key exists. Meta gets the buyer's phone or the dealer's
   email hashed with SHA-256, the caller's IP and user agent when the request is the person's own, and
   nothing else: no name, no licence number, no address. A failure here never fails the money path:
   record() catches everything and answers { recorded, sent }. */
import type { Env } from './env';
import { verifiedForReal } from './phone';

export const META_EVENTS = ['Lead', 'CompleteRegistration', 'AddPaymentInfo', 'Purchase'] as const;
export type MetaEvent = (typeof META_EVENTS)[number];
export const GRAPH_VERSION = 'v21.0';
export const GRAPH_BASE = 'https://graph.facebook.com';
const SEND_TIMEOUT_MS = 5_000;

/** Where each event happens, as Meta's action_source names it: the application and the Desk are web pages; the deposit is paid on
    Whop's hosted checkout page; the car starts at the dealer's lot. Marketing changes a word here, nothing else moves. */
export const ACTION_SOURCE: Record<MetaEvent, 'website' | 'physical_store'> = { Lead: 'website', CompleteRegistration: 'website', AddPaymentInfo: 'website', Purchase: 'physical_store' };

export type MarketingEnv = Pick<Env, 'DB' | 'META_PIXEL_ID' | 'META_CAPI_TOKEN' | 'META_TEST_EVENT_CODE'>;
export type Client = { ip?: string | null; userAgent?: string | null };
export type EventIn = {
  event: MetaEvent;
  sourceId: string;            // the row it came from: capture:<payment>, the lot id, the GDN
  at?: number;                 // when it happened, ms; now when absent
  email?: string | null;       // hashed before it leaves
  phone?: string | null;       // E.164; hashed before it leaves
  value?: number | null;       // whole dollars
  currency?: 'USD';
  client?: Client;             // the person's own request only, never a webhook's
  sourceUrl?: string;          // event_source_url for website events
};
export type Recorded = { recorded: boolean; sent: boolean; error?: string };

/** The keys are both set: events leave. Anything less is the no-op. */
export const metaReady = (env: Pick<MarketingEnv, 'META_PIXEL_ID' | 'META_CAPI_TOKEN'>): boolean => !!env.META_PIXEL_ID?.trim() && !!env.META_CAPI_TOKEN?.trim();

export async function sha256Hex(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** Meta's normalisation before the hash: email lower-cased and trimmed; phone as digits only with the country code, no plus.
    buyers.phone holds the ten US digits (src/phone.ts keeps the number without its +1), so ten digits get the 1 back. */
export const normalizeEmail = (e: string): string => e.trim().toLowerCase();
export const normalizePhone = (p: string): string => { const d = p.replace(/\D/g, ''); return d.length === 10 ? `1${d}` : d; };
/** What Meta deduplicates on: the event and the SHA-256 of the source row's id, so a GDN, a payment id or a lot id never leaves in the clear. */
export const eventIdOf = async (event: MetaEvent, sourceId: string): Promise<string> => `${event}:${(await sha256Hex(sourceId)).slice(0, 32)}`;
/** The caller's IP and user agent, for a request the person made themselves (the Desk, the app); nothing for a webhook. */
export const clientOf = (req: Request): Client => ({ ip: req.headers.get('cf-connecting-ip'), userAgent: req.headers.get('user-agent') });

/** The user_data block: hashed identifiers only, plus the IP and user agent when the request was the person's own. */
export async function userDataOf(e: Pick<EventIn, 'email' | 'phone' | 'client'>): Promise<Record<string, string[] | string>> {
  const out: Record<string, string[] | string> = {};
  if (e.email?.trim()) out.em = [await sha256Hex(normalizeEmail(e.email))];
  if (e.phone && normalizePhone(e.phone)) out.ph = [await sha256Hex(normalizePhone(e.phone))];
  if (e.client?.ip) out.client_ip_address = e.client.ip;
  if (e.client?.userAgent) out.client_user_agent = e.client.userAgent.slice(0, 512);
  return out;
}

/** The Conversions API body for one event. test_event_code rides along while META_TEST_EVENT_CODE is set, so Events Manager's
    Test events tab shows it; marketing removes the code before the first dollar. */
export async function metaPayload(env: Pick<MarketingEnv, 'META_TEST_EVENT_CODE'>, e: EventIn): Promise<Record<string, unknown>> {
  const at = e.at ?? Date.now();
  const data: Record<string, unknown> = {
    event_name: e.event,
    event_time: Math.floor(at / 1000),
    event_id: await eventIdOf(e.event, e.sourceId),
    action_source: ACTION_SOURCE[e.event],
    user_data: await userDataOf(e),
  };
  if (e.sourceUrl && ACTION_SOURCE[e.event] === 'website') data.event_source_url = e.sourceUrl;
  if (e.value != null && Number.isFinite(e.value)) data.custom_data = { value: e.value, currency: e.currency ?? 'USD' };
  const body: Record<string, unknown> = { data: [data] };
  if (env.META_TEST_EVENT_CODE?.trim()) body.test_event_code = env.META_TEST_EVENT_CODE.trim();
  return body;
}

/** One event: the row first (once per event and source; a repeat records nothing and sends nothing), then the send when the
    keys are set. The row says sent = 1 only on Meta's 2xx; a refusal or a network error stays sent = 0 with the error. */
export async function record(env: MarketingEnv, e: EventIn, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<Recorded> {
  try {
    if (!META_EVENTS.includes(e.event)) return { recorded: false, sent: false, error: 'not_a_standard_event' };
    const at = e.at ?? Date.now();
    const value = e.value != null && Number.isFinite(e.value) ? Math.round(e.value) : null;
    const row = await env.DB.prepare(`INSERT INTO marketing_events (event, source_id, event_id, at, value, currency, sent) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)
      ON CONFLICT (event, source_id) DO NOTHING RETURNING id`).bind(e.event, e.sourceId, await eventIdOf(e.event, e.sourceId), at, value, value == null ? null : (e.currency ?? 'USD')).first<{ id: number }>();
    if (!row) return { recorded: false, sent: false };   // already there: never twice
    if (!metaReady(env)) return { recorded: true, sent: false };
    let error: string | null = null;
    try {
      const res = await fetchImpl(`${GRAPH_BASE}/${GRAPH_VERSION}/${encodeURIComponent(env.META_PIXEL_ID!.trim())}/events`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${env.META_CAPI_TOKEN!.trim()}` },
        body: JSON.stringify(await metaPayload(env, { ...e, at, value })),
      });
      if (!res.ok) error = `meta ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`;
    } catch (x) { error = String((x as Error)?.message ?? x).slice(0, 240); }
    if (error) {
      await env.DB.prepare('UPDATE marketing_events SET error = ?2 WHERE id = ?1').bind(row.id, error.slice(0, 240)).run();
      return { recorded: true, sent: false, error };
    }
    await env.DB.prepare('UPDATE marketing_events SET sent = 1, sent_at = ?2, error = NULL WHERE id = ?1').bind(row.id, Date.now()).run();
    return { recorded: true, sent: true };
  } catch (x) {
    return { recorded: false, sent: false, error: String((x as Error)?.message ?? x).slice(0, 240) };
  }
}

/** The buyer's proved number, for the hash; null when no code proved it (a fake proof counts only on a DEV=1 Worker). */
export async function buyerPhoneOf(env: Pick<Env, 'DB' | 'DEV'>, buyer: string): Promise<string | null> {
  const b = await env.DB.prepare('SELECT phone, phone_verified_at, phone_verified_via FROM buyers WHERE id = ?1').bind(buyer).first<{ phone: string | null; phone_verified_at: number | null; phone_verified_via: string | null }>();
  return b && verifiedForReal(env, b.phone_verified_at, b.phone_verified_via) ? b.phone : null;
}

/** Purchase, at the engine start (AD3): the lot the object just returned from POST /pickup, with sale.startedAt set. The hammer is the value. */
export async function recordPurchase(env: MarketingEnv & Pick<Env, 'DEV'>, lot: { id?: unknown; sale?: { startedAt?: unknown; hammer?: unknown; buyer?: unknown } | null }, fetchImpl?: typeof fetch): Promise<Recorded> {
  const id = typeof lot?.id === 'string' ? lot.id : null;
  const s = lot?.sale;
  if (!id || !s || typeof s.startedAt !== 'number' || !(s.startedAt > 0)) return { recorded: false, sent: false, error: 'not_started' };
  const phone = typeof s.buyer === 'string' ? await buyerPhoneOf(env, s.buyer).catch(() => null) : null;
  return record(env, { event: 'Purchase', sourceId: id, at: s.startedAt, value: typeof s.hammer === 'number' ? s.hammer : null, currency: 'USD', phone }, fetchImpl);
}

export type Summary = {
  since: number; days: number; ready: boolean; testEventCode: boolean;
  events: Record<MetaEvent, { recorded: number; sent: number }>;
  started: { rows: number; sent: number; ratio: number | null };   // AD3: started events sent over started rows in D1, 1 when every start went out
};
/** GET /admin/marketing: counts per event, recorded and sent, over the last `days`, and AD3's ratio. */
export async function summary(env: MarketingEnv, days = 30, now = Date.now()): Promise<Summary> {
  const since = now - days * 86_400_000;
  const rows = (await env.DB.prepare('SELECT event, COUNT(*) AS recorded, COALESCE(SUM(sent), 0) AS sent FROM marketing_events WHERE at >= ?1 GROUP BY event').bind(since).all<{ event: string; recorded: number; sent: number }>()).results;
  const events = Object.fromEntries(META_EVENTS.map(e => [e, { recorded: 0, sent: 0 }])) as Summary['events'];
  for (const r of rows) if ((META_EVENTS as readonly string[]).includes(r.event)) events[r.event as MetaEvent] = { recorded: r.recorded, sent: r.sent };
  const started = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM lots WHERE json_extract(lot, '$.sale.startedAt') >= ?1`).bind(since).first<{ n: number }>())?.n ?? 0;
  const sent = events.Purchase.sent;
  return { since, days, ready: metaReady(env), testEventCode: !!env.META_TEST_EVENT_CODE?.trim(), events, started: { rows: started, sent, ratio: started ? Math.round((sent / started) * 100) / 100 : null } };
}
