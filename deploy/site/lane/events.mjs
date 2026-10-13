// The standard Meta events the obavia-waitlist worker sends server side
// (growth plan AD1; docs/DOCTRINE.md AD 1): Lead, when the dealer application
// is accepted. Never a custom conversion. The event is written to
// marketing_events (0002_marketing_events.sql) first, then sent to the
// Conversions API only when META_PIXEL_ID and META_CAPI_TOKEN are both set;
// without them send() is a no-op that still keeps the row. Meta gets the email
// hashed with SHA-256, the caller's IP and user agent, and nothing else: no
// name, no licence number, no address. A failure here never fails the
// application: send() catches everything and answers { recorded, sent }.
// The same rules live in auction/worker/src/marketing.ts for the Worker's
// events (CompleteRegistration, AddPaymentInfo, Purchase).
//
// Standalone ES module with no imports. The obavia-waitlist bundle
// (deploy/site/live-worker.js) carries a verbatim copy, written by
// deploy/site/lane/sync-bundle.mjs.

export const META_EVENT_NAMES = Object.freeze(["Lead", "CompleteRegistration", "AddPaymentInfo", "Purchase"]);
export const META_GRAPH_VERSION = "v21.0";
export const META_GRAPH_BASE = "https://graph.facebook.com";
const META_SEND_TIMEOUT_MS = 5e3;
const META_ACTION_SOURCE = Object.freeze({ Lead: "website", CompleteRegistration: "website", AddPaymentInfo: "website", Purchase: "physical_store" });

export function metaReady(env) {
  const ok = (v) => typeof v === "string" && v.trim().length > 0;
  return !!env && ok(env.META_PIXEL_ID) && ok(env.META_CAPI_TOKEN);
}

export async function metaSha256(text) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Meta's normalisation before the hash: email lower-cased and trimmed; phone as digits with the country code, no plus.
export const metaNormalizeEmail = (e) => String(e).trim().toLowerCase();
export const metaNormalizePhone = (p) => { const d = String(p).replace(/\D/g, ""); return d.length === 10 ? `1${d}` : d; };
// What Meta deduplicates on: the event and the SHA-256 of the source row's id, so nothing leaves in the clear.
export const metaEventId = async (event, sourceId) => `${event}:${(await metaSha256(sourceId)).slice(0, 32)}`;

// The user_data block: hashed identifiers only, plus the IP and user agent of the person's own request.
export async function metaUserData({ email, phone, ip, userAgent } = {}) {
  const out = {};
  if (typeof email === "string" && email.trim()) out.em = [await metaSha256(metaNormalizeEmail(email))];
  if (typeof phone === "string" && metaNormalizePhone(phone)) out.ph = [await metaSha256(metaNormalizePhone(phone))];
  if (typeof ip === "string" && ip) out.client_ip_address = ip;
  if (typeof userAgent === "string" && userAgent) out.client_user_agent = userAgent.slice(0, 512);
  return out;
}

// One Conversions API body. test_event_code rides along while META_TEST_EVENT_CODE is set, so Events Manager's
// Test events tab shows the event; marketing removes the code before the first dollar.
export async function metaPayload(env, { event, sourceId, at, email, phone, ip, userAgent, value, currency, sourceUrl }) {
  const data = { event_name: event, event_time: Math.floor(at / 1e3), event_id: await metaEventId(event, sourceId), action_source: META_ACTION_SOURCE[event], user_data: await metaUserData({ email, phone, ip, userAgent }) };
  if (typeof sourceUrl === "string" && sourceUrl && META_ACTION_SOURCE[event] === "website") data.event_source_url = sourceUrl;
  if (typeof value === "number" && Number.isFinite(value)) data.custom_data = { value, currency: currency || "USD" };
  const body = { data: [data] };
  const code = typeof env?.META_TEST_EVENT_CODE === "string" ? env.META_TEST_EVENT_CODE.trim() : "";
  if (code) body.test_event_code = code;
  return body;
}

// db is D1 (WAITLIST_DB) with 0002_marketing_events.sql applied, or null (no row, the send alone). client is the
// caller's { ip, userAgent } from the request that caused the event, never a third party's.
export function createMetaEvents(env, fetchImpl, { db = null, now = Date.now, client = {} } = {}) {
  const ready = metaReady(env) && typeof fetchImpl === "function";
  const stmt = (sql, ...params) => db.prepare(sql).bind(...params);
  return {
    ready,
    async send(event, { sourceId, email, phone, value, currency, sourceUrl } = {}) {
      try {
        if (!META_EVENT_NAMES.includes(event)) return { recorded: false, sent: false, error: "not_a_standard_event" };
        const source = typeof sourceId === "string" && sourceId ? sourceId : typeof email === "string" && email.trim() ? `em:${await metaSha256(metaNormalizeEmail(email))}` : null;
        if (!source) return { recorded: false, sent: false, error: "no_source" };
        const at = now();
        const amount = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
        let rowId = null;
        if (db) {
          const r = await stmt(`INSERT INTO marketing_events(event,source_id,event_id,at,value,currency,sent) VALUES(?1,?2,?3,?4,?5,?6,0)
     ON CONFLICT(event,source_id) DO NOTHING RETURNING id`, event, source, await metaEventId(event, source), at, amount, amount == null ? null : currency || "USD").all();
          const row = r?.results?.[0];
          if (!row) return { recorded: false, sent: false };
          rowId = row.id;
        }
        if (!ready) return { recorded: !!db, sent: false };
        let error = null;
        try {
          const res = await fetchImpl(`${META_GRAPH_BASE}/${META_GRAPH_VERSION}/${encodeURIComponent(env.META_PIXEL_ID.trim())}/events`, {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(META_SEND_TIMEOUT_MS),
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.META_CAPI_TOKEN.trim()}` },
            body: JSON.stringify(await metaPayload(env, { event, sourceId: source, at, email, phone, ip: client.ip, userAgent: client.userAgent, value: amount, currency, sourceUrl }))
          });
          if (!res.ok) error = `meta ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`;
        } catch (x) { error = String(x?.message ?? x).slice(0, 240); }
        if (error) {
          if (db && rowId != null) await stmt(`UPDATE marketing_events SET error=?2 WHERE id=?1`, rowId, error.slice(0, 240)).run();
          return { recorded: !!db, sent: false, error };
        }
        if (db && rowId != null) await stmt(`UPDATE marketing_events SET sent=1, sent_at=?2, error=NULL WHERE id=?1`, rowId, now()).run();
        return { recorded: !!db, sent: true };
      } catch (x) {
        return { recorded: false, sent: false, error: String(x?.message ?? x).slice(0, 240) };
      }
    }
  };
}
