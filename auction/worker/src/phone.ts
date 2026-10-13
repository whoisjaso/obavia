/* Buyer sign-in by phone: the first of the three Phase 2 pages (obavia-auction-phases.md, Onboarding (buyer)).
   POST /me/phone sends a code; POST /me/phone/verify proves it and marks buyers.phone and phone_verified_at.
   The verification client is the lane's (deploy/site/lane/lane.mjs createTelnyxVerify, fakeVerify,
   laneProvider), the same shape and the same limits: Telnyx Verify when TELNYX_API_KEY and
   TELNYX_VERIFY_PROFILE_ID are set; the fake only when MESSAGING_PROVIDER=fake, where every code is 000000
   and the verification is recorded as 'fake', which admits a bid only on a DEV=1 Worker (it never marks a
   buyer verified for real). Nothing here logs a phone number or a code. */
import type { Env } from './env';

export const CODE_GAP_MS = 30_000;          // one send per 30 s per buyer
export const CODE_WINDOW_MS = 3_600_000;    // five sends an hour per buyer
export const CODE_SENDS = 5;
export const CODE_TTL_MS = 10 * 60_000;     // a code lives ten minutes
export const CODE_ATTEMPTS = 5;             // five tries on one code
export const SENDS_PER_HOUR_ALL = 100;      // every buyer together (the lane's codeAll)

export type VerifyResult = 'accepted' | 'rejected' | 'expired' | 'too_many_attempts';
export type PhoneProvider = { name: 'telnyx' | 'fake'; startVerification(phone: string): Promise<{ id: string }>; checkVerification(phone: string, code: string): Promise<VerifyResult> };

/** The lane's Telnyx Verify client, typed. Throws on a send that Telnyx refuses; a check Telnyx answers 404 or 422 is a wrong code. */
export function createTelnyxVerify({ apiKey, verifyProfileId, fetchImpl, base = 'https://api.telnyx.com/v2' }: { apiKey: string; verifyProfileId: string; fetchImpl: typeof fetch; base?: string }): PhoneProvider {
  async function call(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetchImpl(`${base}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
    if (!res.ok) { const e = new Error(`Telnyx ${res.status}`) as Error & { status?: number }; e.status = res.status; throw e; }
    return json;
  }
  return {
    name: 'telnyx',
    async startVerification(phone) {
      const r = await call('POST', '/verifications/sms', { phone_number: phone, verify_profile_id: verifyProfileId });
      return { id: String(r?.data?.id ?? '') };
    },
    async checkVerification(phone, code) {
      try {
        const r = await call('POST', `/verifications/by_phone_number/${encodeURIComponent(phone)}/actions/verify`, { code, verify_profile_id: verifyProfileId });
        const c = r?.data?.response_code;
        return c === 'accepted' ? 'accepted' : c === 'expired' ? 'expired' : c === 'max_attempts_exceeded' ? 'too_many_attempts' : 'rejected';
      } catch (e) {
        const s = (e as { status?: number })?.status;
        if (s === 404 || s === 422) return 'rejected';
        throw e;
      }
    },
  };
}

export const fakeVerify: PhoneProvider = Object.freeze({
  name: 'fake' as const,
  async startVerification() { return { id: 'fake-verify' }; },
  async checkVerification(_phone: string, code: string): Promise<VerifyResult> { return code === '000000' ? 'accepted' : 'rejected'; },
});

/** The lane's laneProvider: the fake only when asked for by name; Telnyx when both keys are set; otherwise none. */
export function phoneProvider(env: Pick<Env, 'MESSAGING_PROVIDER' | 'TELNYX_API_KEY' | 'TELNYX_VERIFY_PROFILE_ID'>, fetchImpl: typeof fetch = (...a) => fetch(...a)): PhoneProvider | null {
  if (env.MESSAGING_PROVIDER === 'fake') return fakeVerify;
  const ok = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !/[\r\n]/.test(v);
  if (ok(env.TELNYX_API_KEY) && ok(env.TELNYX_VERIFY_PROFILE_ID)) return createTelnyxVerify({ apiKey: env.TELNYX_API_KEY, verifyProfileId: env.TELNYX_VERIFY_PROFILE_ID, fetchImpl });
  return null;
}

/** A US number in E.164, +1 and a valid NANP area code and exchange (the lane's laneE164 rule), or null. */
export const usE164 = (v: unknown): string | null => typeof v === 'string' && /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(v) ? v : null;

/** The number as GET /me shows it: the last four only. */
export const maskPhone = (digits: string | null | undefined): string | null => {
  const d = (digits ?? '').replace(/\D/g, '');
  return d.length >= 4 ? `(•••) •••-${d.slice(-4)}` : null;
};

/** Whether a verification admits a bid: Telnyx always; the fake only on a DEV=1 Worker (tests, wrangler dev). */
export const verifiedForReal = (env: Pick<Env, 'DEV'>, at: number | null | undefined, via: string | null | undefined): boolean =>
  at != null && (via === 'telnyx' || (via === 'fake' && env.DEV === '1'));

type Answer = { status: number; body: Record<string, unknown>; retryAfter?: number };
const answer = ({ status, body, retryAfter }: Answer, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...(retryAfter ? { 'retry-after': String(retryAfter) } : {}), ...headers } });

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try { const raw = await req.text(); if (raw.length > 512) return null; const b = raw ? JSON.parse(raw) : {}; return b && typeof b === 'object' && !Array.isArray(b) ? b : null; } catch { return null; }
}

/** POST /me/phone `{ phone }`: one code to that number, inside the buyer's limits and the hourly ceiling for all. */
export async function sendCode(req: Request, env: Env, buyer: string, headers: Record<string, string>, provider = phoneProvider(env)): Promise<Response> {
  const b = await readJson(req);
  const phone = usE164(b?.phone);
  if (!phone) return answer({ status: 400, body: { error: 'bad_phone' } }, headers);
  if (!provider) return answer({ status: 503, body: { error: 'code_unavailable' } }, headers);
  const at = Date.now();
  // One statement decides: the hourly ceiling for every buyer (in the SELECT, so a first send obeys it too),
  // then this buyer's 30 s gap and five an hour (in the upsert's WHERE). A new send resets the attempts.
  const [sent] = await env.DB.batch<{ buyer_id: string }>([
    env.DB.prepare(`INSERT INTO phone_codes (buyer_id, phone, sent_at, window_start, sends, attempts, via)
      SELECT ?1, ?2, ?3, ?3, 1, 0, ?4 WHERE (SELECT COUNT(*) FROM phone_sends WHERE at > ?3 - ?5) < ?8
      ON CONFLICT(buyer_id) DO UPDATE SET
        window_start = CASE WHEN window_start <= ?3 - ?5 THEN ?3 ELSE window_start END,
        sends = CASE WHEN window_start <= ?3 - ?5 THEN 1 ELSE sends + 1 END,
        sent_at = ?3, attempts = 0, phone = ?2, via = ?4
      WHERE sent_at <= ?3 - ?6 AND (window_start <= ?3 - ?5 OR sends < ?7)
      RETURNING buyer_id`).bind(buyer, phone, at, provider.name, CODE_WINDOW_MS, CODE_GAP_MS, CODE_SENDS, SENDS_PER_HOUR_ALL),
    env.DB.prepare('INSERT INTO phone_sends (at) SELECT ?1 WHERE EXISTS (SELECT 1 FROM phone_codes WHERE buyer_id = ?2 AND sent_at = ?1)').bind(at, buyer),
    env.DB.prepare('DELETE FROM phone_sends WHERE at <= ?1').bind(at - 86_400_000),
  ]);
  if (sent.results.length !== 1) {
    const row = await env.DB.prepare('SELECT sent_at, window_start, sends FROM phone_codes WHERE buyer_id = ?1').bind(buyer).first<{ sent_at: number; window_start: number; sends: number }>();
    const gap = row ? row.sent_at + CODE_GAP_MS - at : 0;
    const hour = row && row.sends >= CODE_SENDS && row.window_start > at - CODE_WINDOW_MS ? row.window_start + CODE_WINDOW_MS - at : 0;
    let wait = Math.max(gap, hour);
    if (wait <= 0) {   // the buyer was inside the limits: the ceiling for all is full
      const oldest = await env.DB.prepare('SELECT MIN(at) AS at FROM phone_sends WHERE at > ?1').bind(at - CODE_WINDOW_MS).first<{ at: number | null }>();
      wait = (oldest?.at ?? at) + CODE_WINDOW_MS - at;
    }
    return answer({ status: 429, body: { error: 'rate_limited' }, retryAfter: Math.max(1, Math.ceil(wait / 1000)) }, headers);
  }
  try { await provider.startVerification(phone); }
  catch { return answer({ status: 502, body: { error: 'code_not_sent' } }, headers); }
  return answer({ status: 200, body: { sent: true, phone: maskPhone(phone), retryIn: CODE_GAP_MS / 1000 } }, headers);
}

/** The code against the pending row under `key` (a buyer id, or `recover:<number>` for recovery by phone): the attempts,
    the ten minutes, the provider's answer. Accepted spends the code and returns the number it proved; anything else is
    the refusal to answer with. Shared by POST /me/phone/verify and POST /me/recover/verify. */
export async function checkCode(env: Env, key: string, code: string, provider: PhoneProvider | null): Promise<{ proved: true; phone: string; via: string } | { proved: false; refusal: Answer }> {
  const at = Date.now();
  const claimed = await env.DB.prepare('UPDATE phone_codes SET attempts = attempts + 1 WHERE buyer_id = ?1 AND sent_at > ?2 AND attempts < ?3 RETURNING phone, via')
    .bind(key, at - CODE_TTL_MS, CODE_ATTEMPTS).first<{ phone: string; via: string }>();
  if (!claimed) {
    const row = await env.DB.prepare('SELECT sent_at FROM phone_codes WHERE buyer_id = ?1').bind(key).first<{ sent_at: number }>();
    if (!row || row.sent_at <= at - CODE_TTL_MS) return { proved: false, refusal: { status: 410, body: { error: 'code_expired' } } };
    return { proved: false, refusal: { status: 429, body: { error: 'too_many_attempts' }, retryAfter: Math.max(1, Math.ceil((row.sent_at + CODE_GAP_MS - at) / 1000)) } };
  }
  if (!provider || claimed.via !== provider.name) return { proved: false, refusal: { status: 410, body: { error: 'code_expired' } } };
  let result: VerifyResult;
  try { result = await provider.checkVerification(claimed.phone, code); }
  catch { return { proved: false, refusal: { status: 502, body: { error: 'verify_unavailable' } } }; }
  if (result === 'expired') return { proved: false, refusal: { status: 410, body: { error: 'code_expired' } } };
  if (result === 'too_many_attempts') return { proved: false, refusal: { status: 429, body: { error: 'too_many_attempts' }, retryAfter: 30 } };
  if (result !== 'accepted') return { proved: false, refusal: { status: 422, body: { error: 'wrong_code' } } };
  await env.DB.prepare('UPDATE phone_codes SET attempts = ?2 WHERE buyer_id = ?1').bind(key, CODE_ATTEMPTS).run();   // spent: no attempts left on it
  return { proved: true, phone: claimed.phone, via: claimed.via };
}

/** POST /me/phone/verify `{ code }`: the code against the number it was sent to; on accepted, buyers.phone is that number. */
export async function verifyCode(req: Request, env: Env, buyer: string, headers: Record<string, string>, provider = phoneProvider(env)): Promise<Response> {
  const b = await readJson(req);
  const code = typeof b?.code === 'string' && /^\d{6}$/.test(b.code) ? b.code : null;
  if (!code) return answer({ status: 400, body: { error: 'bad_code' } }, headers);
  const r = await checkCode(env, buyer, code, provider);
  if (!r.proved) return answer(r.refusal, headers);
  // proved: the number becomes the buyer's
  await env.DB.prepare('UPDATE buyers SET phone = ?2, phone_verified_at = ?3, phone_verified_via = ?4 WHERE id = ?1').bind(buyer, r.phone.slice(2), Date.now(), r.via).run();
  const real = verifiedForReal(env, 1, r.via);
  return answer({ status: 200, body: { verified: real, phone: maskPhone(r.phone) } }, headers);
}

/** Recovery by phone (gap table Phase 2 Onboarding (buyer); W3-B): a new install with no token proves the number again.
    The pending code is kept under `recover:<number>`, so one number has one pending code and the same limits as a buyer
    (one send per 30 s, five an hour) plus the hourly ceiling for all. The send says nothing about whether a buyer holds
    the number: a stranger learns nothing, and the number's owner gets the code either way. */
export const recoverKey = (phone: string) => `recover:${phone}`;
export async function sendRecoveryCode(req: Request, env: Env, headers: Record<string, string>, provider = phoneProvider(env)): Promise<Response> {
  const b = await readJson(req);
  const phone = usE164(b?.phone);
  if (!phone) return answer({ status: 400, body: { error: 'bad_phone' } }, headers);
  const again = new Request(req.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) });
  return sendCode(again, env, recoverKey(phone), headers, provider);
}

/** POST /me/recover/verify `{ phone, code }`: the code proves the number; the buyer that number was proved for (Telnyx, or
    the fake on a DEV=1 Worker) moves to a fresh token: the epoch is bumped (every old token stops, 401 everywhere) and the
    new token is minted at the new epoch. One row in `recoveries`. A proved number nobody holds is 404 no_such_phone: only
    the person who just proved the number hears that, after the code. */
export async function verifyRecovery(req: Request, env: Env, headers: Record<string, string>, mint: (id: string, epoch: number) => Promise<string>, provider = phoneProvider(env)): Promise<Response> {
  const b = await readJson(req);
  const phone = usE164(b?.phone);
  const code = typeof b?.code === 'string' && /^\d{6}$/.test(b.code) ? b.code : null;
  if (!phone) return answer({ status: 400, body: { error: 'bad_phone' } }, headers);
  if (!code) return answer({ status: 400, body: { error: 'bad_code' } }, headers);
  const r = await checkCode(env, recoverKey(phone), code, provider);
  if (!r.proved) return answer(r.refusal, headers);
  // the buyer this number proves: a Telnyx proof always; a fake proof only on a DEV=1 Worker (never for real)
  const via = r.via === 'telnyx' ? ['telnyx'] : env.DEV === '1' ? ['telnyx', 'fake'] : [];
  const rows = (await env.DB.prepare('SELECT id, token_epoch, phone_verified_via FROM buyers WHERE phone = ?1 AND phone_verified_at IS NOT NULL ORDER BY phone_verified_at DESC').bind(r.phone.slice(2)).all<{ id: string; token_epoch: number; phone_verified_via: string }>()).results
    .filter(x => via.includes(x.phone_verified_via));
  const owner = rows[0];
  if (!owner) return answer({ status: 404, body: { error: 'no_such_phone' } }, headers);
  const at = Date.now();
  const moved = await env.DB.prepare('UPDATE buyers SET token_epoch = token_epoch + 1 WHERE id = ?1 AND token_epoch = ?2 RETURNING token_epoch').bind(owner.id, owner.token_epoch).first<{ token_epoch: number }>();
  if (!moved) return answer({ status: 409, body: { error: 'try_again' } }, headers);   // another recovery landed between the read and the bump
  await env.DB.prepare('INSERT INTO recoveries (buyer, from_epoch, to_epoch, at) VALUES (?1, ?2, ?3, ?4)').bind(owner.id, owner.token_epoch, moved.token_epoch, at).run().catch(() => {});
  return answer({ status: 200, body: { id: owner.id, token: await mint(owner.id, moved.token_epoch), phone: maskPhone(r.phone) } }, headers);
}
