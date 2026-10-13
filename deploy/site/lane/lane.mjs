// The dealer application on obavia.co (docs/plan/growth/application.md) posts
// {step} bodies to POST /api/waitlist. Contract: the comment above
// <section id="apply"> in obavia-co/index.html, and deploy/site/lane/README.md.
// The license phone is read from the private TxDMV contacts file the nightly
// job writes to R2 and never leaves this worker; only its last four digits are
// returned. Nothing here logs a phone number or a code.
//
// Standalone ES module with no imports. The obavia-waitlist bundle
// (deploy/site/live-worker.js) carries a verbatim copy, written by
// deploy/site/lane/sync-bundle.mjs.

export const LANE_TEMPLATE_VERSION = "waitlist-confirmation-v9";
export const LANE_MAX_BYTES = 4096;
const LANE_CODE_GAP_MS = 30 * 1e3;
const LANE_CODE_WINDOW_MS = 36e5;
const LANE_CODE_SENDS = 5;
const LANE_CODE_TTL_MS = 10 * 6e4;
const LANE_CODE_ATTEMPTS = 5;
const LANE_VERIFIED_TTL_MS = 30 * 6e4;
const LANE_DEALER_TTL_MS = 15 * 6e4;
const LANE_LIMITS = Object.freeze({ lookup: [120, 36e5], code: [10, 36e5], codeAll: [100, 36e5], verify: [30, 36e5] });
const LANE_CHOICES = Object.freeze({ gdnHeld: ["yes", "not_yet"], lotSize: ["1-10", "11-30", "31-75", "76+"], agedOver60: ["0", "1-2", "3-5", "6-10", "11+"], floorplan: ["yes", "no"] });
const laneDealerCache = new WeakMap();

export function laneGdn(value) {
  if (typeof value !== "string" || value.length > 32) return null;
  const t = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const gdn = /^\d/.test(t) ? "P" + t : t;
  return /^P\d{5,7}[A-Z]{0,2}$/.test(gdn) ? gdn : null;
}

// desk/server/messaging/core.ts toE164, in plain JS.
export function laneE164(raw) {
  const d = String(raw ?? "").replace(/\D/g, "");
  const ten = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  if (ten.length !== 10 || !/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) return null;
  return `+1${ten}`;
}

function laneText(value, max) {
  if (typeof value !== "string") return "";
  const t = value.normalize("NFC").replace(/[\p{Cc}\p{Cs}\p{Zl}\p{Zp}؜‎-‏‪-‮⁦-⁩]/gu, " ").trim().replace(/\s+/gu, " ");
  return [...t].slice(0, max).join("");
}

export function laneApplication(raw) {
  const out = { v: 1 };
  for (const [key, allowed] of Object.entries(LANE_CHOICES)) out[key] = typeof raw[key] === "string" && allowed.includes(raw[key]) ? raw[key] : null;
  out.losingCar = laneText(raw.losingCar, 140);
  out.gdn = laneGdn(raw.gdn);
  out.dealerNameTyped = laneText(raw.dealerName, 160);
  out.dealerCityTyped = laneText(raw.dealerCity, 80);
  out.phoneVerifiedClaimed = raw.phoneVerified === true;
  return out;
}

// The TxDMV list from R2: tx/index.json decides which licences are active,
// tx/contacts.json supplies the phone. Cached per isolate for 15 minutes.
export function createDealerBook(bucket, { now = Date.now } = {}) {
  if (!bucket || typeof bucket.get !== "function") return null;
  async function load() {
    const [index, contacts] = await Promise.all([bucket.get("tx/index.json"), bucket.get("tx/contacts.json")]);
    if (!index && !contacts) throw Error("dealer list missing");
    const map = new Map();
    if (index) {
      const raw = await index.json(), f = Array.isArray(raw?.fields) ? raw.fields : [];
      const L = f.indexOf("licence"), N = f.indexOf("name"), C = f.indexOf("city");
      if (L < 0 || N < 0 || !Array.isArray(raw.rows)) throw Error("dealer index unreadable");
      for (const r of raw.rows) map.set(String(r[L]).toUpperCase(), { name: String(r[N] ?? ""), city: C < 0 ? "" : String(r[C] ?? ""), phone: "" });
    }
    if (contacts) {
      const raw = await contacts.json();
      for (const [licence, c] of Object.entries(raw?.contacts ?? {})) {
        const key = licence.toUpperCase(), had = map.get(key);
        if (had) had.phone = typeof c?.phone === "string" ? c.phone : "";
        else if (!index) map.set(key, { name: String(c?.name ?? ""), city: String(c?.city ?? ""), phone: typeof c?.phone === "string" ? c.phone : "" });
      }
    }
    return map;
  }
  return {
    async get(gdn) {
      const at = now();
      let entry = laneDealerCache.get(bucket);
      if (!entry || at - entry.at > LANE_DEALER_TTL_MS) {
        const promise = load();
        entry = { at, promise };
        laneDealerCache.set(bucket, entry);
        promise.catch(() => {
          if (laneDealerCache.get(bucket) === entry) laneDealerCache.delete(bucket);
        });
      }
      const map = await entry.promise;
      return map.get(gdn) ?? null;
    }
  };
}

// The verification half of desk/server/messaging (types.ts MessagingProvider:
// startVerification, checkVerification), ported from telnyx.ts. Telnyx when its
// keys are set; the fake only when MESSAGING_PROVIDER=fake, exactly as
// desk/server/worker.ts builds it (every code is 000000). A fake verification
// never earns a key.
export function createTelnyxVerify({ apiKey, verifyProfileId, fetchImpl, base = "https://api.telnyx.com/v2" }) {
  async function call(method, path, body) {
    const res = await fetchImpl(`${base}${path}`, { method, redirect: "error", signal: AbortSignal.timeout(1e4), headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" }, body: body === void 0 ? void 0 : JSON.stringify(body) });
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    if (!res.ok) {
      const error = Error(`Telnyx ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return json;
  }
  return {
    name: "telnyx",
    async startVerification(phone) {
      const r = await call("POST", "/verifications/sms", { phone_number: phone, verify_profile_id: verifyProfileId });
      return { id: String(r?.data?.id ?? "") };
    },
    async checkVerification(phone, code) {
      try {
        const r = await call("POST", `/verifications/by_phone_number/${encodeURIComponent(phone)}/actions/verify`, { code, verify_profile_id: verifyProfileId });
        const c = r?.data?.response_code;
        return c === "accepted" ? "accepted" : c === "expired" ? "expired" : c === "max_attempts_exceeded" ? "too_many_attempts" : "rejected";
      } catch (e) {
        if (e?.status === 404 || e?.status === 422) return "rejected";
        throw e;
      }
    }
  };
}

export const fakeVerify = Object.freeze({
  name: "fake",
  async startVerification() {
    return { id: "fake-verify" };
  },
  async checkVerification(_phone, code) {
    return code === "000000" ? "accepted" : "rejected";
  }
});

export function laneProvider(env, fetchImpl) {
  if (env.MESSAGING_PROVIDER === "fake") return fakeVerify;
  const ok = (v) => typeof v === "string" && v.trim() !== "" && !/[\r\n]/.test(v);
  if (ok(env.TELNYX_API_KEY) && ok(env.TELNYX_VERIFY_PROFILE_ID) && typeof fetchImpl === "function") return createTelnyxVerify({ apiKey: env.TELNYX_API_KEY, verifyProfileId: env.TELNYX_VERIFY_PROFILE_ID, fetchImpl });
  return null;
}

// Keys are admin-only until the plan's gate (application.md section 1, due Mon Nov 16, 2026).
// With ISSUE_KEYS=1 the worker asks auction/worker POST /dealers/mint for the Desk key,
// with MINT_SECRET: a secret that can mint one key for one GDN and do nothing else.
// The same GDN twice within 30 minutes answers 409 already_minted and no key.
export function laneKeyIssuer(env, fetchImpl) {
  if (env.ISSUE_KEYS !== "1" || typeof env.MINT_SECRET !== "string" || env.MINT_SECRET.length < 32 || typeof env.AUCTION_API_URL !== "string" || typeof fetchImpl !== "function") return null;
  let base;
  try {
    base = new URL(env.AUCTION_API_URL);
  } catch {
    return null;
  }
  if (base.protocol !== "https:" || base.username || base.password) return null;
  return async (gdn, name, city) => {
    const res = await fetchImpl(new URL("/dealers/mint", base).href, { method: "POST", redirect: "error", signal: AbortSignal.timeout(1e4), headers: { Authorization: `Bearer ${env.MINT_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ gdn, name, city }) });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.token === "string" && data.token.startsWith(`d:${gdn}.`) && /^d:[A-Z0-9]{5,12}\.[A-Za-z0-9_-]{20,128}$/.test(data.token) ? data.token : null;
  };
}

// The four steps. db is D1 (WAITLIST_DB) with 0001_lane_application.sql applied.
// clientKey() resolves to the HMAC of the caller's IP. join(email, fullName,
// applicationJson) is the waitlist store's join with the v9 template.
export function createLane({ db, dealers, provider, clientKey, join, issueKey = null, now = Date.now }) {
  const clock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0) throw Error("Invalid lane clock");
    return value;
  };
  const statement = (sql, ...params) => db.prepare(sql).bind(...params);
  const first = async (sql, ...params) => (await statement(sql, ...params).all())?.results?.[0] ?? null;
  const ok = (body) => ({ status: 200, body });
  const fail = (status, error, retryAfter) => ({ status, body: { error }, retryAfter });
  async function hit(bucket, [max, windowMs]) {
    const at = clock();
    const results = await db.batch([
      statement(`DELETE FROM lane_limits WHERE bucket IN (SELECT bucket FROM lane_limits WHERE window_start<=?1 ORDER BY window_start LIMIT 100)`, at - 864e5),
      statement(`INSERT INTO lane_limits(bucket,window_start,hits) VALUES(?1,?2,1)
     ON CONFLICT(bucket) DO UPDATE SET
      window_start=CASE WHEN window_start<=?2-?3 THEN ?2 ELSE window_start END,
      hits=CASE WHEN window_start<=?2-?3 THEN 1 ELSE hits+1 END
     WHERE window_start<=?2-?3 OR hits<?4 RETURNING hits`, bucket, at, windowMs, max)
    ]);
    if (results[1]?.results?.length === 1) return 0;
    const row = await first(`SELECT window_start FROM lane_limits WHERE bucket=?1`, bucket);
    return Math.max(1, Math.ceil(((row?.window_start ?? at) + windowMs - at) / 1e3));
  }
  const dealer = async (gdn) => {
    if (!dealers) return void 0;
    try {
      return await dealers.get(gdn);
    } catch {
      return void 0;
    }
  };
  const last4 = (d) => laneE164(d?.phone)?.slice(-4) ?? "";
  return {
    async lookup(gdn) {
      const wait = await hit(`lookup:${await clientKey()}`, LANE_LIMITS.lookup);
      if (wait) return fail(429, "rate_limited", wait);
      const d = await dealer(gdn);
      if (d === void 0) return fail(503, "lookup_unavailable");
      if (!d) return ok({ status: "no_match" });
      return ok({ status: "match", name: d.name, city: d.city, phoneLast4: last4(d) });
    },
    async code(gdn) {
      const client = await clientKey();
      const d = await dealer(gdn);
      if (d === void 0) return fail(503, "lookup_unavailable");
      if (!d) return fail(422, "no_match");
      const phone = laneE164(d.phone);
      if (!phone) return fail(409, "no_phone");
      if (!provider) return fail(503, "code_unavailable");
      const wait = await hit(`code:${client}`, LANE_LIMITS.code) || await hit("code:*", LANE_LIMITS.codeAll);
      if (wait) return fail(429, "rate_limited", wait);
      const at = clock();
      const sent = await statement(`INSERT INTO lane_codes(gdn,sent_at,window_start,sends,attempts,via) VALUES(?1,?2,?2,1,0,?3)
     ON CONFLICT(gdn) DO UPDATE SET
      window_start=CASE WHEN window_start<=?2-?4 THEN ?2 ELSE window_start END,
      sends=CASE WHEN window_start<=?2-?4 THEN 1 ELSE sends+1 END,
      sent_at=?2,attempts=0,via=?3
     WHERE sent_at<=?2-?5 AND (window_start<=?2-?4 OR sends<?6) RETURNING gdn`, gdn, at, provider.name, LANE_CODE_WINDOW_MS, LANE_CODE_GAP_MS, LANE_CODE_SENDS).all();
      if (sent?.results?.length !== 1) {
        const row = await first(`SELECT sent_at,window_start,sends FROM lane_codes WHERE gdn=?1`, gdn);
        const gap = (row?.sent_at ?? at) + LANE_CODE_GAP_MS - at;
        const hour = row && row.sends >= LANE_CODE_SENDS ? row.window_start + LANE_CODE_WINDOW_MS - at : 0;
        return fail(429, "rate_limited", Math.max(1, Math.ceil(Math.max(gap, hour) / 1e3)));
      }
      try {
        await provider.startVerification(phone);
      } catch {
        return fail(502, "code_not_sent");
      }
      return ok({ status: "code_sent", phoneLast4: phone.slice(-4) });
    },
    async verify(gdn, code) {
      const client = await clientKey();
      const wait = await hit(`verify:${client}`, LANE_LIMITS.verify);
      if (wait) return fail(429, "rate_limited", wait);
      const d = await dealer(gdn);
      if (d === void 0) return fail(503, "lookup_unavailable");
      const phone = laneE164(d?.phone);
      if (!d || !phone) return fail(422, "no_match");
      const at = clock();
      const claimed = await first(`UPDATE lane_codes SET attempts=attempts+1 WHERE gdn=?1 AND sent_at>?2 AND attempts<?3 RETURNING via`, gdn, at - LANE_CODE_TTL_MS, LANE_CODE_ATTEMPTS);
      if (!claimed) {
        const row = await first(`SELECT sent_at,attempts FROM lane_codes WHERE gdn=?1`, gdn);
        if (!row || row.sent_at <= at - LANE_CODE_TTL_MS) return fail(410, "code_expired");
        return fail(429, "too_many_attempts", Math.max(1, Math.ceil((row.sent_at + LANE_CODE_GAP_MS - at) / 1e3)));
      }
      if (!provider || claimed.via !== provider.name) return fail(410, "code_expired");
      let result;
      try {
        result = await provider.checkVerification(phone, code);
      } catch {
        return fail(502, "verify_unavailable");
      }
      if (result === "expired") return fail(410, "code_expired");
      if (result === "too_many_attempts") return fail(429, "too_many_attempts", 30);
      if (result !== "accepted") return ok({ status: "wrong_code" });
      await statement(`UPDATE lane_codes SET verified_at=?2,verified_client=?3,consumed_at=NULL WHERE gdn=?1`, gdn, clock(), client).run();
      return ok({ status: "verified" });
    },
    async apply({ fullName, email, application }) {
      const client = await clientKey();
      const record = laneApplication(application);
      const gdn = record.gdn;
      const d = gdn ? await dealer(gdn) : null;
      const at = clock();
      const verified = d ? await first(`SELECT via FROM lane_codes WHERE gdn=?1 AND verified_client=?2 AND verified_at>?3 AND consumed_at IS NULL`, gdn, client, at - LANE_VERIFIED_TTL_MS) : null;
      Object.assign(record, { dealerName: d?.name ?? "", dealerCity: d?.city ?? "", gdnMatched: !!d, gdnChecked: d !== void 0, phoneVerified: !!verified, phoneVerifiedVia: verified?.via ?? null, receivedAt: at });
      const result = await join(email, fullName, JSON.stringify(record));
      if (result === "limited") return fail(429, "rate_limited", 3600);
      if (result !== "accepted") return fail(503, "temporarily_unavailable");
      if (issueKey && d && verified?.via === "telnyx") {
        let key = null;
        try {
          key = await issueKey(gdn, d.name, d.city);
        } catch {
          key = null;
        }
        if (key) {
          await statement(`UPDATE lane_codes SET consumed_at=?2 WHERE gdn=?1 AND verified_client=?3`, gdn, clock(), client).run();
          return ok({ status: "accepted", key });
        }
      }
      return ok({ status: "accepted" });
    }
  };
}

// Called by handleWaitlist once the body is parsed and the origin, method,
// content type and size checks have passed, for any object body with a "step"
// key. respond(status, error) is handleWaitlist's error responder. emailOf and
// normalizeFullName are the endpoint's own validators, passed in so the email
// and name rules stay in one place.
export async function handleLaneStep(data, lane, headers, respond, { emailOf, normalizeFullName }) {
  const keys = Object.keys(data);
  const only = (...allowed) => keys.every((k) => allowed.includes(k));
  let outcome;
  try {
    if (data.step === "lookup" || data.step === "code") {
      if (!only("step", "gdn")) return respond(422, "invalid_request");
      const gdn = laneGdn(data.gdn);
      if (!gdn) return respond(422, "invalid_gdn");
      outcome = await lane[data.step](gdn);
    } else if (data.step === "verify") {
      if (!only("step", "gdn", "code")) return respond(422, "invalid_request");
      const gdn = laneGdn(data.gdn);
      if (!gdn) return respond(422, "invalid_gdn");
      if (typeof data.code !== "string" || !/^\d{6}$/.test(data.code)) return respond(422, "invalid_code");
      outcome = await lane.verify(gdn, data.code);
    } else if (data.step === "apply") {
      if (!only("step", "fullName", "email", "website", "application")) return respond(422, "invalid_email");
      const email = emailOf(data.email);
      if (!email || data.website !== void 0 && data.website !== "") return respond(422, "invalid_email");
      const fullName = normalizeFullName(data.fullName);
      if (fullName === null) return respond(422, "invalid_full_name");
      const application = data.application;
      if (!application || typeof application !== "object" || Array.isArray(application)) return respond(422, "invalid_application");
      outcome = await lane.apply({ fullName, email, application });
    } else return respond(422, "invalid_step");
  } catch {
    return respond(503, "temporarily_unavailable");
  }
  const extra = outcome.retryAfter ? { "Retry-After": String(outcome.retryAfter) } : {};
  return Response.json(outcome.body, { status: outcome.status, headers: { ...headers, ...extra } });
}
