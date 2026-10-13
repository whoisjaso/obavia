/* The Worker. Routes to one Auction object per lot. Buyers carry a signed
   token and must hold a captured deposit before a bid is forwarded; the Desk
   carries a dealer token and opens, closes, marks paid and scans pickup.
   Photos and documents live in R2. Reads of the lane come from D1, the copy;
   everything live comes from the object. */
import { bearerOf, buyerClaim, buyerFrom, claimOf, dealerClaim, dealerFrom, mintBuyerToken, mintDealerToken, roleOf, secretMatches, type DealerRole } from './auth';
import type { Env } from './env';
import type { BidRequest } from '../../src/engine/server';
import { viewerHtml } from './view';
import { equalNights, lastReconciliations, reconcile, reserveRatio } from './reconcile';
import { Whop } from './whop';
import { BIDS_PER_MINUTE, BID_WINDOW_MS, COUNT_SQL, TERMS, TERMS_VERSION, WINS_PER_YEAR, committed, oneOpenBidRefuses, openBids, phoneDigits, winsLeft, yearStart, type Counts } from './bidders';
import { LANES, type BidIn, type Lane, type PayMethod, type PayoutNews } from './auction';
import { maskPhone, sendCode, sendRecoveryCode, verifiedForReal, verifyCode, verifyRecovery } from './phone';
import { passSix, passValue } from '../../src/pass';
import { invoices, markPaidAtLot, onWebhook, uploadEvidence } from './invoice';
import { feeFor, feesOwedCents, platformRow, setPlatform } from './fees';
import { buyerPhoneOf, clientOf, record as recordMarketing, recordPurchase, summary as marketingSummary, type Client } from './marketing';
export { Auction } from './auction';
import { CLAUSE_TEXT, CLAUSE_VERSION, CODE_ALPHABET, REFERRAL_CODE } from './wave4';

const DEPOSIT_USD = 250;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, x-photo-size', 'access-control-allow-methods': 'GET, POST, PUT' };
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json', ...CORS } });
const text = (t: string, status: number) => new Response(t, { status, headers: CORS });
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MINT_IDEMPOTENT_MS = 30 * 60_000;   // the same GDN twice inside this window: 409, no key
const MINT_WINDOW_MS = 3_600_000, MINT_PER_WINDOW = 20;   // every lane mint together
const fail = (error: string, status: number, extra: Record<string, string> = {}) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', ...extra, ...CORS } });
const PUSH_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,64}\]$/;
const PAY_METHODS: unknown[] = ['wire', 'check', 'cash'];   // a payout paid by hand (desk/src/lib/admin-api.ts PayMethod)
const WHOP_BIZ = /^biz_[A-Za-z0-9]{4,60}$/;   // a Whop connected account id
/** biz_••••ab12: enough for the dealer to recognise it, never the whole id. */
const maskAccount = (a: string) => `biz_••••${a.slice(-4)}`;
/** Every deposit state, so the admin's byStatus shows a zero rather than leaving a state out. */
const DEPOSIT_STATES = { none: 0, captured: 0, applied: 0, forfeited: 0, refunded: 0, disputed: 0 };
/** An admin's reason: one plain line, 1 to 200 characters (admin-api.ts reasonOf). */
const reasonOf = (v: unknown) => typeof v === 'string' ? plain(v, 200) : null;
/** A JSON object body, or {} for none or anything else. */
const body = async (req: Request): Promise<Record<string, unknown>> => { try { const raw = await req.text(); const b = raw ? JSON.parse(raw) : {}; return b && typeof b === 'object' && !Array.isArray(b) ? b : {}; } catch { return {}; } };
const plain = (v: unknown, max: number) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= max && !/[\u0000-\u001f\u007f]/.test(v) ? v.trim().replace(/\s+/g, ' ') : null;
const GDN = /^[A-Z0-9]{5,12}$/;
/* ---- Wave 4 (gap table §4 W4-A; phases.md amendment 2026-10-13: Phase 4 and 5 code behind flags, no deploy, no money, no keys) */
/** The clause and the referral code's shape live in src/wave4.ts: the entry module exports only handlers and classes. */
const arbitrationOn = (env: Env) => env.ARBITRATION === '1';
/** Audio and video on the car (phases.md Phase 5 Frontend: engine idle recordings, the walkaround): the types and caps. */
const MEDIA = { audio: { types: ['audio/mp4', 'audio/webm'], cap: 8_000_000 }, video: { types: ['video/mp4', 'video/webm'], cap: 60_000_000 } } as const;
const extOf = (ct: string) => ct.endsWith('/webm') ? 'webm' : 'mp4';
function referralCode(): string {
  let out = '';
  while (out.length < 8) { const [b] = crypto.getRandomValues(new Uint8Array(1)); if (b < 232) out += CODE_ALPHABET[b % CODE_ALPHABET.length]; }   // 232 = 8 x 29: no bias
  return out;
}
/** What a role may not call (phases.md Phase 5 Admin: owner, manager, lot). The owner: everything. The manager: everything but the
    Whop account start, the settings and key minting. The lot key: GET routes, and the three taps at the lot (pickup, paid, plates).
    Decided once here, before any route; a refusal is 403 role_denied with the role named. The admin key is an owner. */
function roleRefusal(role: DealerRole, method: string, path: string): boolean {
  if (role === 'owner') return false;
  if (role === 'manager') return (method === 'POST' && (path === '/dealers/account/start' || path === '/dealers' || path === '/dealers/mint' || path === '/dealers/keys/mint')) || (method === 'PUT' && path === '/dealers/settings');
  if (method === 'GET') return false;
  return !(method === 'POST' && /^\/lots\/[A-Za-z0-9_-]{1,64}\/(pickup|paid|plates)$/.test(path));
}
/** RFC 4180: a field is quoted when it carries a comma, a quote, a CR or an LF; a quote inside is doubled; rows end CRLF. */
const csvField = (v: unknown): string => { const t = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const csv = (header: string[], rows: unknown[][]) => [header, ...rows].map(r => r.map(csvField).join(',')).join('\r\n') + '\r\n';
/** The lot's dealer and lane from the copy, for admission before a bid is forwarded (the copy carries both from the open). */
const laneOf = (env: Env, id: string) => env.DB.prepare("SELECT dealer, json_extract(lot, '$.car.lane') AS lane FROM lots WHERE id = ?1").bind(id).first<{ dealer: string; lane: Lane | null }>();

/** Every response leaves with the CORS headers, the Durable Object's included (a WebSocket upgrade is passed through untouched). */
function withCors(r: Response): Response {
  if (r.status === 101 || r.webSocket) return r;
  const h = new Headers(r.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> { return withCors(await handle(req, env)); },
  // nightly: payouts left owed go out first (a dealer connected since), then the reconciliation reads the result
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> { ctx.waitUntil(sendAllOwed(env).catch(() => {}).then(() => reconcile(env)).then(() => {})); },
} satisfies ExportedHandler<Env>;

async function handle(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    // a dealer key with a role (Wave 4): what the role may not call is refused here, once, before any route sees it
    const role = await dealerClaim(req, env.DEALER_SECRET);
    if (role && roleRefusal(role.role, req.method, url.pathname)) return json({ error: 'role_denied', role: role.role }, 403);
    // the four auction terms (D10) and, behind ARBITRATION=1, the arbitration clause (D13, draft): what the phone shows before the first bid
    if (req.method === 'GET' && url.pathname === '/terms') {
      return json({ version: TERMS_VERSION, terms: TERMS, clause: arbitrationOn(env) ? { version: CLAUSE_VERSION, text: CLAUSE_TEXT, requiresScrollToEnd: true } : null });
    }
    // signing on the lane (src/sign.ts, Wave 2-A): /sales/:lot/... ; withCors wraps it like every route
    if (url.pathname.startsWith('/sales/')) return (await import('./sign')).sales(req, env);
    // the balance and fee invoices (src/invoice.ts, Wave 3-A): /invoices/:lot, /invoices/:lot/paid
    if (url.pathname.startsWith('/invoices/')) return invoices(req, env);
    const whop = new Whop(env);

    // the lane: every open lot, from the copy
    if (req.method === 'GET' && url.pathname === '/lots') {
      const rows = await env.DB.prepare("SELECT lot FROM lots WHERE json_extract(lot, '$.car.lane') IS NOT 'closed' ORDER BY updated_at DESC LIMIT 200").all<{ lot: string }>();   // the closed lane is never on the public list
      return json(rows.results.map(r => { const l = JSON.parse(r.lot); delete l.max; delete l.dealer; return l; }).filter(l => !l.closed || Date.now() - (l.closed.at ?? 0) < 3 * 86_400_000));
    }
    // the closed lane (Wave 4): every closed lot, for a dealer key (any role) or the admin; the same shape as /lots
    if (req.method === 'GET' && url.pathname === '/lots/closed') {
      if (!(await dealerFrom(req, env.DEALER_SECRET))) return text('dealer only', 403);
      const rows = await env.DB.prepare("SELECT lot FROM lots WHERE json_extract(lot, '$.car.lane') = 'closed' ORDER BY updated_at DESC LIMIT 200").all<{ lot: string }>();
      return json(rows.results.map(r => { const l = JSON.parse(r.lot); delete l.max; delete l.dealer; return l; }).filter(l => !l.closed || Date.now() - (l.closed.at ?? 0) < 3 * 86_400_000));
    }

    // photos and documents, from R2
    const file = url.pathname.match(/^\/(photos|documents)\/([A-Za-z0-9_-]{1,64})\/([A-Za-z0-9_.-]{1,64})$/);
    if (file && req.method === 'GET') {
      const [, kind, lotId, name] = file;
      if (kind === 'documents' && !(await buyerFrom(req, env)) && !(await dealerFrom(req, env.DEALER_SECRET))) return text('sign in', 401);
      const obj = await env.FILES.get(`${kind}/${lotId}/${name}`);
      if (!obj) return text('not found', 404);
      return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': kind === 'photos' ? 'public, max-age=31536000, immutable' : 'private, max-age=60', ...CORS } });
    }
    // pdf.js for the document page, served from here (wrangler assets, pinned by package.json): no third-party script at the moment of signature
    if (req.method === 'GET' && url.pathname.startsWith('/pdfjs/')) return env.ASSETS.fetch(req);
    // the document page the phone shows inside a WebView
    if (req.method === 'GET' && url.pathname === '/view') {
      const u = url.searchParams.get('u') ?? '';
      if (!u.startsWith('/documents/')) return text('bad document', 400);
      const token = url.searchParams.get('token') ?? '';
      return new Response(viewerHtml(`${url.origin}${u}?token=${encodeURIComponent(token)}`), { headers: { 'content-type': 'text/html; charset=utf-8', ...CORS } });
    }

    const m = url.pathname.match(/^\/lots\/([A-Za-z0-9_-]{1,64})(\/.*)?$/);
    if (m) {
      const [, id, rest = '/'] = m;
      const stub = env.AUCTION.get(env.AUCTION.idFromName(id));
      const toObject = (init: RequestInit & { dealer?: string }) => stub.fetch(new Request(req.url, { ...init, headers: { 'content-type': 'application/json', ...(init.dealer ? { 'x-dealer': init.dealer } : {}) } }));

      // a test aid, never product: on a DEV=1 Worker the lot's dealer or the admin moves the clocks and re-arms the alarm; 404 everywhere else
      if (rest === '/dev/clock') {
        if (env.DEV !== '1' || req.method !== 'POST') return text('not found', 404);
        const dealer = await dealerFrom(req, env.DEALER_SECRET);
        if (!dealer) return text('dealer only', 403);
        return toObject({ method: 'POST', body: await req.text(), dealer: dealer === '*' ? '' : dealer });
      }
      // audio and video on the car (Wave 4): public reads, streamed from R2 with the type the dealer sent; the lot is public, so is its sound
      if ((rest === '/audio' || rest === '/video') && req.method === 'GET') {
        const kind = rest.slice(1) as 'audio' | 'video';
        const row = await env.DB.prepare(`SELECT json_extract(lot, '$.car.${kind}Key') AS key FROM lots WHERE id = ?1`).bind(id).first<{ key: string | null }>();
        const obj = row?.key ? await env.FILES.get(row.key) : null;
        if (!obj) return text('not found', 404);
        return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? MEDIA[kind].types[0], 'content-length': String(obj.size), 'cache-control': 'private, max-age=300', ...CORS } });
      }
      // dealer: open, close, paid, pickup, car, void, forfeit, plates, photos, documents, audio, video
      if (['/open', '/close', '/paid', '/pickup', '/car', '/void', '/forfeit', '/plates', '/audio', '/video'].includes(rest) || rest.startsWith('/photos/') || rest.startsWith('/documents/')) {
        const dealer = await dealerFrom(req, env.DEALER_SECRET);
        if (!dealer) return text('dealer only', 403);
        if (rest === '/audio' || rest === '/video') {   // PUT only: the bytes to R2 under the lot, then the key on the car through the object (which checks the lot is this dealer's)
          if (req.method !== 'PUT') return text('not found', 404);
          const kind = rest.slice(1) as 'audio' | 'video';
          const ct = (req.headers.get('content-type') ?? '').split(';')[0].trim();
          if (!(MEDIA[kind].types as readonly string[]).includes(ct)) return fail('bad_type', 415);
          const declared = Number(req.headers.get('content-length') ?? 0);
          if (declared > MEDIA[kind].cap) return fail('too_big', 413);
          const own = await env.DB.prepare('SELECT dealer FROM lots WHERE id = ?1').bind(id).first<{ dealer: string }>();
          if (!own) return fail('no_lot', 404);
          if (dealer !== '*' && own.dealer !== dealer) return fail('not_your_lot', 403);
          const bytes = await req.arrayBuffer();
          if (bytes.byteLength > MEDIA[kind].cap) return fail('too_big', 413);
          if (!bytes.byteLength) return fail('empty', 400);
          const key = `lots/${id}/${kind}.${extOf(ct)}`;
          await env.FILES.put(key, bytes, { httpMetadata: { contentType: ct } });
          const patched = await stub.fetch(new Request(`https://auction/lots/${id}/car`, { method: 'POST', headers: { 'content-type': 'application/json', ...(dealer === '*' ? {} : { 'x-dealer': dealer }) }, body: JSON.stringify({ [`${kind}Key`]: key }) }));
          if (patched.status !== 200) { await env.FILES.delete(key).catch(() => {}); return fail((await patched.text()).trim() || 'refused', patched.status); }
          const other = `lots/${id}/${kind}.${extOf(ct) === 'mp4' ? 'webm' : 'mp4'}`;   // the one key per kind: the other type's file, if any, goes
          await env.FILES.delete(other).catch(() => {});
          return json({ [`${kind}Key`]: key, url: `/lots/${id}/${kind}`, bytes: bytes.byteLength, contentType: ct });
        }
        if (req.method === 'PUT' && (rest.startsWith('/photos/') || rest.startsWith('/documents/'))) {
          const name = rest.split('/')[2] ?? '';
          if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) return text('bad name', 400);
          const kind = rest.startsWith('/photos/') ? 'photos' : 'documents';
          const ct = req.headers.get('content-type') ?? '';
          if (kind === 'photos' && !/^image\/(jpeg|webp)$/.test(ct)) return text('jpeg or webp', 415);
          if (kind === 'documents' && ct !== 'application/pdf') return text('pdf', 415);
          const body = await req.arrayBuffer();
          if (body.byteLength > 12_000_000) return text('too big', 413);
          await env.FILES.put(`${kind}/${id}/${name}`, body, { httpMetadata: { contentType: ct } });
          return json({ url: `/${kind}/${id}/${name}` });
        }
        if (req.method !== 'POST') return text('not found', 404);
        if (rest === '/open' && dealer !== '*') {   // a suspended dealer opens nothing; the master is never suspended
          const s = await env.DB.prepare('SELECT suspended_at FROM dealers WHERE gdn = ?1').bind(dealer).first<{ suspended_at: number | null }>();
          if (s?.suspended_at) return text('dealer suspended', 403);
        }
        const body = await req.text();
        if (rest === '/open') {   // the closed lane (Wave 4): only a dealer whose row carries the wholesale GDN; a public lot needs the Guide only under GUIDE_REQUIRED=1
          let o: { dealer?: unknown; car?: { lane?: unknown; documents?: { guide?: unknown } } };
          try { o = JSON.parse(body || '{}'); } catch { return text('bad body', 400); }
          const lane = o?.car?.lane;
          if (lane !== undefined && !LANES.includes(lane as Lane)) return fail('bad_lane', 400);
          const who = dealer === '*' ? (typeof o?.dealer === 'string' ? o.dealer : '') : dealer;
          if (lane === 'closed') {
            const d = who ? await env.DB.prepare('SELECT wholesale_gdn FROM dealers WHERE gdn = ?1').bind(who).first<{ wholesale_gdn: string | null }>() : null;
            if (!d?.wholesale_gdn) return fail('wholesale_required', 403);
          } else if (env.GUIDE_REQUIRED === '1' && !o?.car?.documents?.guide) return fail('guide_required', 422);
        }
        const answered = await toObject({ method: 'POST', body, dealer: dealer === '*' ? (rest === '/open' ? (JSON.parse(body || '{}').dealer ?? '*') : '') : dealer });
        if (rest === '/pickup' && answered.status === 200) {   // the car started: Purchase with the hammer as value (AD3), recorded, sent only with the Meta keys
          const lot = await answered.clone().json<{ id?: unknown; sale?: { startedAt?: unknown; hammer?: unknown; buyer?: unknown } | null }>().catch(() => null);
          if (lot) await recordPurchase(env, lot);
          // the seller-side fee, once per started car, only after the GDN issued (src/fees.ts feeFor: null and nothing written while platform.gdn_issued_at is null)
          if (lot && typeof lot.id === 'string') await feeFor(lot as Parameters<typeof feeFor>[0], env).catch(() => null);
        }
        if (rest === '/paid' && answered.status === 200) await markPaidAtLot(id, env).catch(() => null);   // the balance row paid_at_lot, the open Whop invoice voided, the split (src/invoice.ts)
        return withContact(answered, env, id, dealer);
      }
      // the Desk's Live: the lot's own dealer key, or the admin key, opens the same socket a buyer does (the token in ?token=)
      if (rest === '/live' && req.method === 'GET') {
        const desk = await dealerFrom(req, env.DEALER_SECRET);
        if (desk) {
          if (desk !== '*') {
            const own = await env.DB.prepare('SELECT dealer FROM lots WHERE id = ?1').bind(id).first<{ dealer: string }>();
            if (own?.dealer !== desk) return text('not_your_lot', 403);
          }
          return stub.fetch(req);
        }
      }
      // buyer: the second-chance offer taken (decisions §2 row 9). The Worker admits the buyer as the bid path does (the
      // epoch, a captured deposit, the win cap); the object checks the offer is theirs and still open and writes the new sale
      if (rest === '/offer/accept' && req.method === 'POST') {
        const claim = await buyerClaim(req, env.BUYER_SECRET);
        if (!claim) return text('sign in', 401);
        const row = await env.DB.prepare(`SELECT b.token_epoch, b.deposit_status, c.wins, c.owed, c.leading, c.paid FROM buyers b, (${COUNT_SQL}) c WHERE b.id = ?1`)
          .bind(claim.id, yearStart(Date.now()), id).first<{ token_epoch: number; deposit_status: string } & Counts>();
        if (row?.token_epoch !== claim.epoch) return text('sign in', 401);
        if (row.deposit_status !== 'captured') return fail('deposit_first', 402);
        const count = committed(row);
        if (count >= WINS_PER_YEAR) { await refuse(env, id, claim.id, 'win_cap', String(count)); return json({ error: 'win_cap', count, cap: WINS_PER_YEAR }, 403); }
        const r = await stub.fetch(new Request(req.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-buyer': claim.id } }));
        if (r.status !== 200) return fail((await r.text()).trim() || 'refused', r.status);
        return r;
      }
      // buyer: the pickup pass for Google Wallet (Phase 2 Frontend; gap table deviation 10): signed only with both keys
      if (rest === '/pass' && req.method === 'GET') {
        const buyer = await buyerFrom(req, env);
        if (!buyer) return text('sign in', 401);
        if (!env.GOOGLE_WALLET_ISSUER_ID || !env.GOOGLE_WALLET_SERVICE_ACCOUNT) return fail('pass_unavailable', 503);
        const r = await stub.fetch(new Request(req.url.replace(/\/pass(\?.*)?$/, ''), { method: 'GET' }));
        if (r.status !== 200) return fail('no_lot', 404);
        const lot = await r.json<{ id: string; sale?: { buyer: string; wonAt: number; startedAt?: number; voidedAt?: number; forfeitedAt?: number } | null; car?: { year?: number; make?: string; model?: string; vin?: string; dealer?: { name?: string; street?: string; city?: string } } }>();
        if (!lot.sale || lot.sale.buyer !== buyer) return fail('not_yours', 403);
        if (lot.sale.voidedAt || lot.sale.forfeitedAt) return fail('no_sale', 409);
        if (!lot.car?.vin) return fail('vin_unknown', 409);
        try { return json(await walletPass(env, { lotId: lot.id, buyer, vin: lot.car.vin, wonAt: lot.sale.wonAt, car: `${lot.car.year ?? ''} ${lot.car.make ?? ''} ${lot.car.model ?? ''}`.trim(), dealer: lot.car.dealer?.name ?? '', where: [lot.car.dealer?.street, lot.car.dealer?.city].filter(Boolean).join(', '), started: !!lot.sale.startedAt })); }
        catch { return fail('pass_unavailable', 503); }   // a key that does not parse or sign: the same answer, nothing said about the key
      }
      // buyer: bid, watch, live
      if (rest === '/bids' || rest === '/watch' || rest === '/live') {
        if (rest === '/bids' && req.method === 'POST') {   // a Desk or admin key never bids on a public lot (D11); on the closed lane (Wave 4) another dealer's key does
          const desk = await dealerFrom(req, env.DEALER_SECRET);
          if (desk) {
            const lane = await laneOf(env, id);
            if (lane?.lane !== 'closed' || desk === '*') {
              await refuse(env, id, desk === '*' ? 'admin' : `dealer:${desk}`, 'not_a_buyer', null);
              return fail('not_a_buyer', 403);
            }
            if (lane.dealer === desk) { await refuse(env, id, `dealer:${desk}`, 'seller_cannot_bid', 'gdn'); return fail('seller_cannot_bid', 403); }   // D11 on the closed lane: the seller's own licence
            const st = await env.DB.prepare('SELECT suspended_at FROM dealers WHERE gdn = ?1').bind(desk).first<{ suspended_at: number | null }>();
            if (!st) return fail('no_such_dealer', 404);
            if (st.suspended_at) return text('dealer suspended', 403);
            const body = await req.json<Omit<BidRequest, 'bidder' | 'lotId'>>().catch(() => null);
            if (!body || !(body.amount > 0) || !(body.max >= body.amount) || !body.key || body.key.length > 128) return text('bad bid', 400);
            const bidder = `d:${desk}`, key = `${bidder}:${body.key}`;   // the dealer's licence is the bidder; no deposit, no terms line, no win cap: those are the buyer's gates
            const wait = await attempt(env, bidder, id, key);
            if (wait) { await refuse(env, id, bidder, 'too_many_bids', String(wait)); return fail('too_many_bids', 429, { 'retry-after': String(wait) }); }
            const fwd: BidIn = { lotId: id, bidder, amount: Math.round(body.amount), max: Math.round(body.max), key };
            return toObject({ method: 'POST', body: JSON.stringify(fwd) });
          }
        }
        const claim = await buyerClaim(req, env.BUYER_SECRET);
        if (!claim) return text('sign in', 401);
        const buyer = claim.id;
        if (rest === '/bids') {
          // one read of the copy admits the buyer: the token's epoch, deposit, terms, the year's count, and what the shill check compares
          const row = await env.DB.prepare(`SELECT b.token_epoch, b.deposit_status, b.terms_at, b.clause_at, b.name, b.phone, b.phone_verified_at, b.phone_verified_via, b.address, c.wins, c.owed, c.leading, c.paid,
              (SELECT json_extract(l.lot, '$.car.lane') FROM lots l WHERE l.id = ?3) AS lane FROM buyers b, (${COUNT_SQL}) c WHERE b.id = ?1`)
            .bind(buyer, yearStart(Date.now()), id).first<{ token_epoch: number; deposit_status: string; terms_at: number | null; clause_at: number | null; name: string | null; phone: string | null; phone_verified_at: number | null; phone_verified_via: string | null; address: string | null; lane: Lane | null } & Counts>();
          if (row?.token_epoch !== claim.epoch) return text('sign in', 401);   // rotated or bumped away
          if (row.lane === 'closed') { await refuse(env, id, buyer, 'dealers_only', null); return fail('dealers_only', 403); }   // the closed lane (Wave 4): dealer keys only
          const body = await req.json<Omit<BidRequest, 'bidder' | 'lotId'> & { terms?: string }>();
          if (!(body.amount > 0) || !(body.max >= body.amount) || !body.key || body.key.length > 128) return text('bad bid', 400);
          // sign-in by phone, the first page of the first-bid chain (phone, licence, deposit): no verified number, no bid
          const verifiedPhone = verifiedForReal(env, row.phone_verified_at, row.phone_verified_via) ? row.phone : null;
          if (!verifiedPhone) return json({ error: 'phone_required' }, 409);
          if (row.deposit_status !== 'captured') return text('deposit first', 402);
          const firstBid = row.terms_at == null;
          if (firstBid && body.terms !== TERMS_VERSION) return json({ error: 'terms_required', version: TERMS_VERSION }, 409);
          if (arbitrationOn(env) && row.clause_at == null) return json({ error: 'clause_required', version: CLAUSE_VERSION }, 409);   // D13 behind the flag: the clause once, scrolled to the end, before any bid
          // the rate limit (Wave 2-E): at most BIDS_PER_MINUTE attempts a rolling minute across every lot, counted here in the
          // Worker because a lot's object sees one lot; D1 runs the conditional insert as one atomic statement, so parallel
          // requests cannot all pass (the lane mint's pattern). A retried key finds its own row and goes through
          const key = `${buyer}:${body.key}`;
          const wait = await attempt(env, buyer, id, key);
          if (wait) {
            await refuse(env, id, buyer, 'too_many_bids', String(wait));
            return fail('too_many_bids', 429, { 'retry-after': String(wait) });
          }
          const count = committed(row);
          if (count >= WINS_PER_YEAR) {   // D15: a bid that could become a fifth win this year is refused
            await refuse(env, id, buyer, 'win_cap', String(count));
            return json({ error: 'win_cap', count, cap: WINS_PER_YEAR }, 403);
          }
          if (oneOpenBidRefuses(row)) {   // sim 03: one open bid across every lot until the first car is paid; raising on the lot led is not a second
            await refuse(env, id, buyer, 'one_open_bid', String(openBids(row)));
            return json({ error: 'one_open_bid', open: openBids(row) }, 409);
          }
          const fwd: BidIn = { lotId: id, bidder: buyer, amount: Math.round(body.amount), max: Math.round(body.max), key, who: { phone: verifiedPhone, address: row.address, name: row.name } };   // D11 compares the verified phone only
          const res = await toObject({ method: 'POST', body: JSON.stringify(fwd) });
          if (firstBid && res.status === 200) {   // D10: the first bid placed carries the terms; stamped once
            await env.DB.prepare('UPDATE buyers SET terms_version = ?2, terms_at = ?3 WHERE id = ?1 AND terms_at IS NULL').bind(buyer, TERMS_VERSION, Date.now()).run();
          }
          return res;
        }
        if (!(await buyerFrom(req, env))) return text('sign in', 401);   // the epoch, for watch and live
        return stub.fetch(req);   // watch; or the WebSocket upgrade for /live
      }
      if (rest === '/' && req.method === 'GET') {   // the lot's own dealer (and the admin) also get the winner's name and number (CF9: the call within the hour)
        const desk = await dealerFrom(req, env.DEALER_SECRET);
        const r = await stub.fetch(req);
        return desk ? withContact(r, env, id, desk) : r;
      }
      return text('not found', 404);
    }

    // every dealer with standing: incidents counted, suspended or not (collateral.md §6)
    const dealerRows = async () => (await env.DB.prepare('SELECT d.gdn, d.name, d.created_at, d.suspended_at, d.wholesale_gdn, d.referral, (SELECT COUNT(*) FROM incidents i WHERE i.dealer = d.gdn) AS incidents FROM dealers d ORDER BY d.created_at').all<{ gdn: string; name: string; created_at: number; suspended_at: number | null; wholesale_gdn: string | null; referral: string | null; incidents: number }>()).results
      .map(d => ({ ...d, suspended: d.suspended_at != null, wholesaleGdn: d.wholesale_gdn, wholesale_gdn: undefined, referral: d.referral }));

    // the public results page (obavia.co/results; growth plan CP5): aggregate, dated counts from the copy, the ledger and the
    // last reconciliation, no key. No name, no GDN, no lot id, no dollar amount per lot, no fee (43 TAC §215.85). The reserve
    // ratio is the last reconciliation's or null (never a hard-coded 1.00); a sold car is a hammer not voided and not forfeited;
    // the disputes are the deposit.disputed rows the webhook wrote. Cached ten minutes at the edge and in the browser.
    if (req.method === 'GET' && url.pathname === '/results') {
      const count = (sql: string) => env.DB.prepare(sql);
      const [lotsOpened, carsSold, carsStarted, depositsRefunded, disputes] = (await env.DB.batch<{ n: number }>([
        count('SELECT COUNT(*) AS n FROM lots'),
        count("SELECT COUNT(*) AS n FROM lots WHERE json_extract(lot, '$.closed.sold') = 1 AND json_extract(lot, '$.sale.voidedAt') IS NULL AND json_extract(lot, '$.sale.forfeitedAt') IS NULL"),
        count("SELECT COUNT(*) AS n FROM lots WHERE json_extract(lot, '$.sale.startedAt') IS NOT NULL"),
        count("SELECT COUNT(*) AS n FROM money_events WHERE type = 'deposit.released'"),
        count("SELECT COUNT(*) AS n FROM money_events WHERE type = 'deposit.disputed'"),
      ])).map(r => r.results[0]?.n ?? 0);
      const recs = await lastReconciliations(env, 100);
      const out = { lotsOpened, carsSold, carsStarted, depositsRefunded, reserveRatio: reserveRatio(recs[0]), disputes, nightsEqual: equalNights(recs), reconciledAt: recs[0]?.ran_at ?? null, readAt: Date.now() };
      return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600', ...CORS } });
    }

    // the owner's view: every dollar and every risk, now (collateral.md §5)
    if (req.method === 'GET' && url.pathname === '/admin/exposure') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const dep = await env.DB.prepare('SELECT deposit_status AS s, COUNT(*) AS n FROM buyers GROUP BY deposit_status').all<{ s: string; n: number }>();
      const lots = (await env.DB.prepare('SELECT lot FROM lots').all<{ lot: string }>()).results.map(r => JSON.parse(r.lot));
      const incidents = await env.DB.prepare('SELECT dealer, COUNT(*) AS n FROM incidents GROUP BY dealer').all<{ dealer: string; n: number }>();
      const held = dep.results.find(d => d.s === 'captured')?.n ?? 0;
      const refusals = await env.DB.prepare('SELECT reason, COUNT(*) AS n FROM bid_refusals GROUP BY reason').all<{ reason: string; n: number }>();
      const recentRefusals = await env.DB.prepare('SELECT lot_id AS lotId, who, reason, matched, at FROM bid_refusals ORDER BY at DESC, id DESC LIMIT 50').all();
      const tokenRefusals = await env.DB.prepare('SELECT presented, COUNT(*) AS n FROM token_refusals GROUP BY presented').all<{ presented: string; n: number }>();
      const recentTokenRefusals = await env.DB.prepare('SELECT claimed, reason, presented, known, at FROM token_refusals ORDER BY at DESC, id DESC LIMIT 50').all();
      const winners = new Map((await env.DB.prepare(`SELECT id, name, phone, phone_verified_at, phone_verified_via FROM buyers WHERE id IN (SELECT json_extract(lot, '$.sale.buyer') FROM lots WHERE json_extract(lot, '$.sale.buyer') IS NOT NULL)`)
        .all<ContactRow & { id: string }>()).results.map(b => [b.id, contactOf(env, b)]));
      const payoutRows = (await env.DB.prepare('SELECT * FROM dealer_payouts').all<PayoutRow>()).results;
      const payoutOfLot = new Map(payoutRows.map(p => [p.lot_id, payoutOut(p).state]));
      const sales = lots.filter(l => l.sale).map(l => ({ lotId: l.id, dealer: l.dealer, state: saleState(l.sale), deposit: l.sale.deposit, hammer: l.sale.hammer, deadlineAt: l.sale.deadlineAt,
        wonAt: l.sale.wonAt ?? null, startedAt: l.sale.startedAt ?? null,   // days to pickup on the Desk's Home: startedAt less wonAt (W3-E)
        offer: l.sale.offer ? { buyer: l.sale.offer.buyer, amount: l.sale.offer.amount, expiresAt: l.sale.offer.expiresAt, state: l.sale.offer.acceptedAt ? 'accepted' : l.sale.offer.expiredAt ? 'expired' : 'open' } : null,
        payout: payoutOfLot.get(l.id) ?? null,   // dealer_payouts, the record: the object's sale.payout does not see a payout paid by hand or retried
        buyer: winners.get(l.sale.buyer) ?? { name: null, phone: null } }));   // the desk person's one call (CF9); admin only
      const recs = await lastReconciliations(env, 7);
      const pickupRefusals = await env.DB.prepare('SELECT lot_id AS lotId, dealer, reason, presented, at FROM pickup_refusals ORDER BY at DESC, id DESC LIMIT 20').all();
      // B on the scorecard: distinct buyers whose bid was placed (it led, or a standing ceiling beat it), per closed lot
      // with the hammer and the floor per closed lot (hammer over floor on the Desk's Home, W3-E): hammer null when unsold
      const bidders = (await env.DB.prepare(`SELECT l.id AS lotId, l.dealer AS dealer, json_extract(l.lot, '$.closed.at') AS closedAt, json_extract(l.lot, '$.closed.sold') AS sold,
          json_extract(l.lot, '$.sale.hammer') AS hammer, json_extract(l.lot, '$.car.collateral.floor') AS floor,
          (SELECT COUNT(DISTINCT b.bidder) FROM bids b WHERE b.lot_id = l.id AND (b.ok = 1 OR b.reason = 'outbid')) AS bidders
        FROM lots l WHERE json_extract(l.lot, '$.closed') IS NOT NULL ORDER BY closedAt DESC LIMIT 500`).all<{ lotId: string; dealer: string; closedAt: number; sold: number; hammer: number | null; floor: number | null; bidders: number }>()).results
        .map(b => ({ ...b, sold: !!b.sold }));
      // watchers per open lot (the Desk's Home, W3-E): the object's count as the copy carries it
      const watchers = lots.filter(l => !l.closed).map(l => ({ lotId: l.id, dealer: l.dealer, watching: l.watching ?? 0 }));
      const platform = await platformRow(env);   // W3-A's row (0016): null until the owner's POST /admin/gdn
      return json({
        // the reserve ratio is the last reconciliation's: Whop's settled balance over the deposits held plus the payouts owed; null when never read
        deposits: { heldCount: held, heldUsd: held * DEPOSIT_USD, byStatus: { ...DEPOSIT_STATES, ...Object.fromEntries(dep.results.map(d => [d.s, d.n])) }, reserveRatio: reserveRatio(recs[0]), reserveReadAt: recs[0]?.whop_balance_cents == null ? null : recs[0].ran_at },
        payouts: payoutSums(payoutRows),
        pickupRefusals: pickupRefusals.results,
        bidders,
        watchers,
        lots: { open: lots.filter(l => !l.closed).length, atLender: lots.filter(l => !l.closed && l.car?.collateral?.title?.status === 'lender').length, floorBelowPayoff: lots.filter(l => !l.closed && (l.car?.collateral?.title?.payoff ?? 0) > (l.car?.collateral?.floor ?? Infinity)).length },
        sales,
        incidentsByDealer: Object.fromEntries(incidents.results.map(i => [i.dealer, i.n])),
        bidRefusals: { byReason: Object.fromEntries(refusals.results.map(r => [r.reason, r.n])), recent: recentRefusals.results },   // D11 and D15
        tokenRefusals: { byPresented: Object.fromEntries(tokenRefusals.results.map(r => [r.presented, r.n])), recent: recentTokenRefusals.results },   // POST /me not_yours
        dealers: await dealerRows(),
        obaviaFeesOwed: (await feesOwedCents(env)) / 100,   // zero by construction until the GDN issues (43 TAC §215.85): no fee row can exist before platform.gdn_issued_at (src/fees.ts)
        platform: platform ? { gdnIssuedAt: platform.gdnIssuedAt, feePerCarCents: platform.feePerCarCents, feeMonthlyCents: platform.feeMonthlyCents, balancePayee: platform.balancePayee, updatedAt: platform.updatedAt } : null,   // null until the owner's POST /admin/gdn
        reconciliations: recs,   // the nightly D1 vs object and Whop vs deposits and payouts report
      });
    }
    // the GDN issued (growth plan line 88; 43 TAC §215.85): the owner types the date and the two fee numbers here, never in code.
    // Writes W3-A's platform row (migration 0016) and the ledger row admin.gdn; 503 while that table is not applied
    if (req.method === 'POST' && url.pathname === '/admin/gdn') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const b = await body(req);
      const now = Date.now();
      const issuedAt = typeof b.issuedAt === 'number' && Number.isFinite(b.issuedAt) && b.issuedAt > 0 && b.issuedAt <= now + 86_400_000 ? Math.round(b.issuedAt) : null;   // never a date in the future
      const cents = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100_000_000 ? v : null;
      const feePerCarCents = cents(b.feePerCarCents), feeMonthlyCents = cents(b.feeMonthlyCents);
      if (!issuedAt) return fail('bad_issued_at', 400);
      if (feePerCarCents == null || feeMonthlyCents == null) return fail('bad_fee', 400);
      let before: Awaited<ReturnType<typeof platformRow>>;
      try {
        before = await platformRow(env);
        await setPlatform(env, { gdnIssuedAt: issuedAt, feePerCarCents, feeMonthlyCents }, now);   // src/fees.ts: the one row, id 1; balance_payee untouched (deviation 2)
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        return fail(/no such table/i.test(msg) ? 'platform_unavailable' : msg === 'bad_platform' ? 'bad_platform' : 'platform_write_failed', /bad_platform/.test(msg) ? 400 : 503);
      }
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(`gdn:${now}`, 'admin.gdn', JSON.stringify({ actor: 'admin', issuedAt, feePerCarCents, feeMonthlyCents, before: before ? { issuedAt: before.gdnIssuedAt, feePerCarCents: before.feePerCarCents, feeMonthlyCents: before.feeMonthlyCents } : null }), now).run();
      return json({ gdnIssuedAt: issuedAt, feePerCarCents, feeMonthlyCents });
    }
    // the closed lane's gate (Wave 4): the admin types the dealer's Wholesale Motor Vehicle Auction GDN; null clears it. Ledger row dealer.wholesale (no money)
    const wholesale = url.pathname.match(/^\/admin\/dealers\/([A-Z0-9]{5,12})\/wholesale$/);
    if (req.method === 'POST' && wholesale) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const b = await body(req);
      const w = b.wholesaleGdn === null ? null : typeof b.wholesaleGdn === 'string' && GDN.test(b.wholesaleGdn) ? b.wholesaleGdn : undefined;
      if (w === undefined) return fail('bad_wholesale_gdn', 400);
      const r = await env.DB.prepare('UPDATE dealers SET wholesale_gdn = ?2 WHERE gdn = ?1').bind(wholesale[1], w).run();
      if (!r.meta.changes) return fail('no_such_dealer', 404);
      const now = Date.now();
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(`wholesale:${wholesale[1]}:${now}`, 'dealer.wholesale', JSON.stringify({ dealer: wholesale[1], wholesaleGdn: w, actor: 'admin' }), now).run();
      return json({ gdn: wholesale[1], wholesaleGdn: w });
    }
    // Wave 4: the admin reads one dealer's settings (the Desk admin's dealer row), read-only; the same shape as GET /dealers/settings
    const adminSettings = url.pathname.match(/^\/admin\/dealers\/([A-Z0-9]{5,12})\/settings$/);
    if (req.method === 'GET' && adminSettings) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const gdn = adminSettings[1];
      if (!(await env.DB.prepare('SELECT 1 AS x FROM dealers WHERE gdn = ?1').bind(gdn).first())) return fail('no_such_dealer', 404);
      const r = await env.DB.prepare('SELECT hours_json, pickup_address_json, after_hours_phone, lane_on, updated_at FROM dealer_settings WHERE gdn = ?1').bind(gdn)
        .first<{ hours_json: string; pickup_address_json: string | null; after_hours_phone: string | null; lane_on: number; updated_at: number }>();
      const parse = (t: string | null) => { if (t == null) return null; try { return JSON.parse(t); } catch { return null; } };
      return json({ gdn, hours: (parse(r?.hours_json ?? null) as unknown[] | null) ?? [], pickupAddress: parse(r?.pickup_address_json ?? null), afterHoursPhone: r?.after_hours_phone ?? null, laneOn: r ? r.lane_on === 1 : true, updatedAt: r?.updated_at ?? null });
    }
    // exports (Wave 4, phases.md Phase 5 Admin): one CSV per what, RFC 4180, the buyer's id only (no name, no phone, no address in any export)
    if (req.method === 'GET' && url.pathname === '/admin/export.csv') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const what = url.searchParams.get('what');
      if (what !== 'sales' && what !== 'money' && what !== 'lots') return fail('bad_what', 400);
      const out = await exportCsv(env, what);
      return new Response(out, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="obavia-${what}-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'private, no-store', ...CORS } });
    }
    // one lot's audit log (phases.md Phase 3 Admin): every row the lane kept about it, in time order, for the Desk's lot page (W3-E)
    const lotLog = url.pathname.match(/^\/admin\/lots\/([A-Za-z0-9_-]{1,64})\/log$/);
    if (req.method === 'GET' && lotLog) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      return json(await lotLogOf(env, lotLog[1]));
    }
    // run the nightly reconciliation now (admin); the cron runs it at 03:00 Central
    if (req.method === 'POST' && url.pathname === '/admin/reconcile') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      return json(await reconcile(env));
    }
    // the nightly rows, newest first, and the streak: "the nightly report says equal seven nights running" (phases.md Phase 2 Server exit)
    if (req.method === 'GET' && url.pathname === '/admin/reconcile') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const n = Math.max(1, Math.min(Number(url.searchParams.get('n')) || 7, 100));
      const rows = await lastReconciliations(env, Math.max(n, 7));
      const streak = equalNights(rows);
      return json({
        equalNights: streak, sevenEqual: streak >= 7,
        latest: rows[0] ? { id: rows[0].id, ranAt: rows[0].ran_at, equal: rows[0].equal === 1 } : null,
        nights: rows.slice(0, n).map(r => ({ id: r.id, ranAt: r.ran_at, equal: r.equal === 1, lotsChecked: r.lots_checked, lotsDiffering: r.lots_differing, differing: r.differing, differences: r.differences,
          depositsHeld: r.deposits_held, payoutsOwed: r.payouts_owed, payoutsOwedCents: r.payouts_owed_cents, whopBalanceCents: r.whop_balance_cents, reserveRatio: reserveRatio(r), note: r.note,
          lotsPastClose: r.lots_past_close ?? 0, salesPastDeadline: r.sales_past_deadline ?? 0 })),   // the alarm audit (deviation 7)
      });
    }

    // the four standard Meta events over the last thirty days (src/marketing.ts): recorded and sent per event, and AD3's started ratio
    if (req.method === 'GET' && url.pathname === '/admin/marketing') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const days = Math.max(1, Math.min(Number(url.searchParams.get('days')) || 30, 365));
      return json(await marketingSummary(env, days));
    }
    // the admin's money page (desk/src/lib/admin-api.ts): every event newest first, every payout, every sale with its buyer
    if (req.method === 'GET' && url.pathname === '/admin/money') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const events = (await env.DB.prepare('SELECT id, type, body, received_at FROM money_events ORDER BY received_at DESC, id DESC LIMIT 500').all<EventRow>()).results.map(moneyEvent);
      const payouts = (await env.DB.prepare('SELECT * FROM dealer_payouts ORDER BY created_at DESC LIMIT 500').all<PayoutRow>()).results.map(payoutOut);
      const lots = (await env.DB.prepare(`SELECT lot FROM lots WHERE json_extract(lot, '$.sale') IS NOT NULL ORDER BY updated_at DESC LIMIT 500`).all<{ lot: string }>()).results.map(r => JSON.parse(r.lot));
      const names = new Map((await env.DB.prepare(`SELECT id, name FROM buyers WHERE id IN (SELECT json_extract(lot, '$.sale.buyer') FROM lots WHERE json_extract(lot, '$.sale.buyer') IS NOT NULL)`).all<{ id: string; name: string | null }>()).results.map(b => [b.id, b.name]));
      const sales = lots.map(l => ({ lotId: l.id, dealer: l.dealer ?? null, buyer: l.sale.buyer ?? null, buyerName: names.get(l.sale.buyer) ?? null, state: saleState(l.sale), hammer: l.sale.hammer, deadlineAt: l.sale.deadlineAt, deposit: l.sale.deposit ?? null }));
      // the Desk's Invoices section (admin-api.ts readMoney: id, lotId, kind, whopId, state, amountCents, createdAt) and its Disputed rows (readPack)
      const invoiceRows = (await env.DB.prepare('SELECT id, lot_id, kind, payer, payee, whop_id, state, amount_cents, currency, payment_ref, error, created_at, paid_at, updated_at FROM invoices ORDER BY created_at DESC LIMIT 500').all<InvoiceRow>()).results.map(invoiceOut);
      const evidencePacks = (await env.DB.prepare('SELECT id, lot_id, buyer, dispute_id, key, sha256, bytes, at, uploaded_at, upload_ref, upload_error FROM evidence_packs ORDER BY at DESC LIMIT 500').all<PackRow>()).results.map(packOut);
      return json({ events, payouts, sales, invoices: invoiceRows, evidencePacks });
    }
    // a payout settled outside Whop (wire, check, cash): the row is paid, the ledger says who and how. Only an owed row with the deposit held
    const paidBy = url.pathname.match(/^\/admin\/payouts\/([^/]{1,200})\/paid$/);
    if (req.method === 'POST' && paidBy) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      let pid = '';
      try { pid = decodeURIComponent(paidBy[1]); } catch { return fail('no_such_payout', 404); }
      if (!/^(applied|forfeit):[A-Za-z0-9_-]{1,64}$/.test(pid)) return fail('no_such_payout', 404);
      const b = await body(req);
      const method = typeof b.method === 'string' && PAY_METHODS.includes(b.method) ? b.method : null;
      if (!method) return fail('bad_method', 400);
      const note = b.note == null || b.note === '' ? null : plain(b.note, 200);
      if (b.note != null && b.note !== '' && !note) return fail('bad_note', 400);
      const p = await env.DB.prepare('SELECT * FROM dealer_payouts WHERE id = ?1').bind(pid).first<PayoutRow>();
      if (!p) return fail('no_such_payout', 404);
      if (p.state !== 'owed') return fail('already_paid', 409);
      if (!p.held) return fail('not_held', 409);   // the deposit was never captured: Obavia holds nothing to pay it from
      const now = Date.now();
      const ev = { lotId: p.lot_id, dealer: p.dealer, buyer: p.buyer, amount: p.amount, payout: p.reason, method, reason: note ?? `paid by ${method}`, actor: 'admin' };
      // the ledger row and the state move together, or neither: one id per payout (payout:<key>), shared with a Whop transfer's
      const [, moved] = await env.DB.batch([
        env.DB.prepare(`INSERT INTO money_events (id, type, body, received_at) SELECT ?1, 'payout.by_hand', ?2, ?3 WHERE EXISTS (SELECT 1 FROM dealer_payouts WHERE id = ?4 AND state = 'owed' AND held = 1) ON CONFLICT(id) DO NOTHING`)
          .bind(`payout:${pid}`, JSON.stringify(ev), now, pid),
        env.DB.prepare(`UPDATE dealer_payouts SET state = 'paid', method = ?2, paid_note = ?3, sent_at = ?4, error = NULL WHERE id = ?1 AND state = 'owed' AND held = 1`).bind(pid, method, note, now),
      ]);
      if (!moved.meta.changes) return fail('already_paid', 409);
      await tellLot(env, p.lot_id, { id: pid, state: 'paid', method: method as PayMethod, at: now });   // the Desk's Sold follows the row
      return json(payoutOut((await env.DB.prepare('SELECT * FROM dealer_payouts WHERE id = ?1').bind(pid).first<PayoutRow>())!));
    }
    // the admin gives a buyer's deposit back, with a reason: refused when it is applied to a car, forfeited, or backs a bid or a sale
    const adminRelease = url.pathname.match(/^\/admin\/buyers\/([A-Za-z0-9_-]{1,64})\/release$/);
    if (req.method === 'POST' && adminRelease) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const buyer = adminRelease[1];
      const b = await body(req);
      const reason = reasonOf(b.reason);
      if (!reason) return fail('no_reason', 400);
      const lotId = b.lotId == null ? null : typeof b.lotId === 'string' && ID.test(b.lotId) ? b.lotId : undefined;
      if (lotId === undefined) return fail('bad_lot', 400);
      const row = await env.DB.prepare('SELECT deposit_status, deposit_ref FROM buyers WHERE id = ?1').bind(buyer).first<{ deposit_status: string; deposit_ref: string | null }>();
      if (!row) return fail('no_such_buyer', 404);
      if (row.deposit_status === 'applied') return fail('deposit_applied', 409);
      if (row.deposit_status === 'forfeited') return fail('deposit_forfeited', 409);
      if (row.deposit_status !== 'captured') return fail('nothing_held', 409);
      const busy = await busyOf(env, buyer);   // a sale's deposit leaves by its void (POST /lots/:id/void), never around it
      if (busy) return fail(busy, 409);
      const refused = await releaseDeposit(env, whop, buyer, row.deposit_ref, { via: 'admin', actor: 'admin', reason, lotId });
      if (refused) return refused;
      return json({ id: buyer, deposit: 'refunded' });
    }
    // the admin forfeits a sale's deposit to the dealer, any time before payment or start, with a reason; the lot's object decides
    const adminForfeit = url.pathname.match(/^\/admin\/lots\/([A-Za-z0-9_-]{1,64})\/forfeit$/);
    if (req.method === 'POST' && adminForfeit) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const lotId = adminForfeit[1];
      const reason = reasonOf((await body(req)).reason);
      if (!reason) return fail('no_reason', 400);
      const r = await env.AUCTION.get(env.AUCTION.idFromName(lotId)).fetch(new Request(`https://auction/lots/${lotId}/forfeit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) }));   // no x-dealer: the admin
      const out = await r.text();
      if (r.status !== 200) return fail(out.trim() || 'refused', r.status);
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(`admin:forfeit:${lotId}`, 'admin.forfeit', JSON.stringify({ lotId, actor: 'admin', reason }), Date.now()).run();
      return new Response(out, { status: 200, headers: { 'content-type': 'application/json', ...CORS } });
    }

    // a buyer's tokens cut off: the epoch moves, every token minted before stops working. With no proof but the token
    // (a Whop-verified email or phone is Phase 2), the buyer cannot sign back in: this is a suspension until then.
    const bump = url.pathname.match(/^\/admin\/buyers\/([A-Za-z0-9_-]{1,64})\/bump$/);
    if (req.method === 'POST' && bump) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const r = await env.DB.prepare('UPDATE buyers SET token_epoch = token_epoch + 1 WHERE id = ?1 RETURNING token_epoch').bind(bump[1]).first<{ token_epoch: number }>();
      if (!r) return text('no such buyer', 404);
      return json({ id: bump[1], epoch: r.token_epoch });
    }

    // dealers: the lane on obavia.co mints one Desk key for a verified GDN, and can do nothing else
    if (url.pathname === '/dealers/mint') {
      if (req.method !== 'POST') return text('not found', 404);
      return mint(req, env);
    }
    // dealers: an admin with the secret mints a Desk's token once
    if (req.method === 'POST' && url.pathname === '/dealers') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const b = await req.json<{ gdn: string; name: string; role?: unknown; referral?: unknown }>();
      if (!/^[A-Z0-9]{5,12}$/.test(b.gdn ?? '') || !b.name) return text('bad dealer', 400);
      const role = roleOf(b.role);   // Wave 4: owner (default), manager or lot
      if (!role) return fail('bad_role', 400);
      const referral = b.referral === undefined || b.referral === null || b.referral === '' ? null : plain(b.referral, 64);   // Wave 4: the application's referral, kept as typed; waives nothing
      if (b.referral != null && b.referral !== '' && !referral) return fail('bad_referral', 400);
      const now = Date.now();
      await env.DB.prepare('INSERT INTO dealers (gdn, name, referral, created_at) VALUES (?1, ?2, ?4, ?3) ON CONFLICT(gdn) DO UPDATE SET name = ?2, referral = COALESCE(?4, referral)').bind(b.gdn, b.name, now, referral).run();
      if (referral) await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(`referral:${b.gdn}:${now}`, 'dealer.referral', JSON.stringify({ dealer: b.gdn, referral, actor: 'admin', waives: 'nothing' }), now).run();
      return json({ token: await mintDealerToken(env.DEALER_SECRET, b.gdn, role), role });
    }
    // Wave 4: the owner's key mints a manager or lot key for its own GDN (and an owner key for a second phone); the admin names the GDN
    if (req.method === 'POST' && url.pathname === '/dealers/keys/mint') {
      const c = await dealerClaim(req, env.DEALER_SECRET);
      if (!c) return text('dealer only', 403);
      const b = await body(req);
      const role = roleOf(b.role);
      if (!role) return fail('bad_role', 400);
      const gdn = c.gdn === '*' ? (typeof b.gdn === 'string' && GDN.test(b.gdn) ? b.gdn : null) : c.gdn;
      if (!gdn) return fail('bad_dealer', 400);
      const d = await env.DB.prepare('SELECT suspended_at FROM dealers WHERE gdn = ?1').bind(gdn).first<{ suspended_at: number | null }>();
      if (!d) return fail('no_such_dealer', 404);
      if (d.suspended_at) return text('dealer suspended', 403);
      await env.DB.prepare('INSERT INTO dealer_mints (gdn, name, city, source, minted_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(gdn, `role:${role}`, '', c.gdn === '*' ? 'admin' : 'owner', Date.now()).run().catch(() => {});
      return json({ token: await mintDealerToken(env.DEALER_SECRET, gdn, role), gdn, role });
    }
    // Wave 4: per-dealer settings on the Worker. The Desk's shapes (desk/src/lib/dealer-settings.ts) as opaque JSON; owner or manager key
    if (url.pathname === '/dealers/settings' && (req.method === 'GET' || req.method === 'PUT')) {
      const c = await dealerClaim(req, env.DEALER_SECRET);
      if (!c || c.gdn === '*') return text('dealer only', 403);
      if (c.role === 'lot') return json({ error: 'role_denied', role: c.role }, 403);
      type SettingsRow = { gdn: string; hours_json: string; pickup_address_json: string | null; after_hours_phone: string | null; lane_on: number; updated_at: number };
      const parse = (t: string | null) => { if (t == null) return null; try { return JSON.parse(t); } catch { return null; } };
      const out = (r: SettingsRow | null) => ({ gdn: c.gdn, hours: (parse(r?.hours_json ?? null) as unknown[] | null) ?? [], pickupAddress: parse(r?.pickup_address_json ?? null), afterHoursPhone: r?.after_hours_phone ?? null, laneOn: r ? r.lane_on === 1 : true, updatedAt: r?.updated_at ?? null });
      if (req.method === 'GET') return json(out(await env.DB.prepare('SELECT * FROM dealer_settings WHERE gdn = ?1').bind(c.gdn).first<SettingsRow>()));
      const b = await body(req);
      const hours = b.hours === undefined ? [] : Array.isArray(b.hours) && b.hours.length <= 14 && b.hours.every(h => typeof h === 'string' && h.trim() && h.length <= 80) ? b.hours.map(h => (h as string).trim()) : null;
      if (!hours) return fail('bad_hours', 400);
      const addr = b.pickupAddress === undefined ? null : b.pickupAddress;
      const addrJson = addr === null ? null : JSON.stringify(addr);
      if (addrJson !== null && (addrJson.length > 2000 || /[\u0000-\u001f\u007f]/.test(addrJson))) return fail('bad_address', 400);
      const phone = b.afterHoursPhone === undefined || b.afterHoursPhone === null || b.afterHoursPhone === '' ? null : plain(b.afterHoursPhone, 32);
      if (b.afterHoursPhone != null && b.afterHoursPhone !== '' && !phone) return fail('bad_phone', 400);
      if (b.laneOn !== undefined && typeof b.laneOn !== 'boolean') return fail('bad_lane_on', 400);
      const laneOn = b.laneOn === undefined ? true : b.laneOn;
      if (!(await env.DB.prepare('SELECT 1 AS x FROM dealers WHERE gdn = ?1').bind(c.gdn).first())) return fail('no_such_dealer', 404);
      const now = Date.now();
      await env.DB.prepare('INSERT INTO dealer_settings (gdn, hours_json, pickup_address_json, after_hours_phone, lane_on, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(gdn) DO UPDATE SET hours_json = ?2, pickup_address_json = ?3, after_hours_phone = ?4, lane_on = ?5, updated_at = ?6')
        .bind(c.gdn, JSON.stringify(hours), addrJson, phone, laneOn ? 1 : 0, now).run();
      return json(out(await env.DB.prepare('SELECT * FROM dealer_settings WHERE gdn = ?1').bind(c.gdn).first<SettingsRow>()));
    }
    if (req.method === 'GET' && url.pathname === '/dealers') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      return json(await dealerRows());
    }
    // the Desk's push token, so a forfeit reaches the dealer (src/push.ts pushDealer). The dealer's own key only
    if (req.method === 'POST' && url.pathname === '/dealers/push') {
      const gdn = await dealerFrom(req, env.DEALER_SECRET);
      if (!gdn || gdn === '*') return text('dealer only', 403);
      const b = await body(req);
      if (typeof b.token !== 'string' || !PUSH_TOKEN.test(b.token)) return text('bad token', 400);
      const r = await env.DB.prepare('UPDATE dealers SET push_token = ?2 WHERE gdn = ?1').bind(gdn, b.token).run();
      if (!r.meta.changes) return fail('no_such_dealer', 404);
      return json({ ok: true });
    }
    // the dealer's Whop connected account (biz_…), set by the admin; every payout left owed for him goes out now, each with its own key.
    // Admin only: a dealer key that could point the $250 at any account would let a leaked key take the money.
    if (req.method === 'POST' && url.pathname === '/dealers/account') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const b = await body(req);
      const gdn = typeof b.gdn === 'string' && /^[A-Z0-9]{5,12}$/.test(b.gdn) ? b.gdn : null;
      const account = typeof b.account === 'string' && WHOP_BIZ.test(b.account) ? b.account : null;
      if (!gdn || !account) return fail('bad_account', 400);
      const r = await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1').bind(gdn, account).run();
      if (!r.meta.changes) return fail('no_such_dealer', 404);
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(`account:${gdn}:${Date.now()}`, 'dealer.account', JSON.stringify({ dealer: gdn, account, actor: 'admin' }), Date.now()).run();
      return json({ gdn, account, payouts: await sendOwed(env, gdn) });
    }
    // the dealer's own Whop account: the dealer's key asks, Whop creates the connected account (and runs the identity checks), and
    // only the id in Whop's own answer is stored. Nothing the client sends can name the account. A dealer key sets it once;
    // replacing it is the admin's (POST /dealers/account), so a leaked key cannot move the $250 to another account.
    if (req.method === 'POST' && url.pathname === '/dealers/account/start') {
      const gdn = await dealerFrom(req, env.DEALER_SECRET);
      if (!gdn || gdn === '*') return text('dealer only', 403);
      const b = await body(req);
      if (['account', 'whopAccount', 'whop_account', 'id'].some(k => k in b)) return fail('account_from_whop_only', 400);
      const whop = new Whop(env);
      if (!whop.ready) return fail('whop_unavailable', 503);
      const email = typeof b.email === 'string' && b.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()) ? b.email.trim() : null;
      if (!email) return fail('bad_email', 400);
      const d = await env.DB.prepare('SELECT name, whop_account FROM dealers WHERE gdn = ?1').bind(gdn).first<{ name: string; whop_account: string | null }>();
      if (!d) return fail('no_such_dealer', 404);
      if (d.whop_account) return fail('account_exists', 409);
      let made: { id?: unknown };
      try { made = await whop.createDealerAccount(email, d.name, gdn); } catch { return fail('whop_refused', 502); }   // Whop's words are not echoed: they may carry the email
      const account = typeof made?.id === 'string' && WHOP_BIZ.test(made.id) ? made.id : null;
      if (!account) return fail('whop_bad_account', 502);
      const now = Date.now();
      const r = await env.DB.prepare('UPDATE dealers SET whop_account = ?2 WHERE gdn = ?1 AND whop_account IS NULL').bind(gdn, account).run();
      if (!r.meta.changes) {   // a second tap won the race: this Whop account is left unused, on the ledger for the admin
        await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
          .bind(`account:${gdn}:${now}:unused`, 'dealer.account_unused', JSON.stringify({ dealer: gdn, account, actor: 'dealer', via: 'whop' }), now).run();
        return fail('account_exists', 409);
      }
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(`account:${gdn}:${now}`, 'dealer.account', JSON.stringify({ dealer: gdn, account, actor: 'dealer', via: 'whop' }), now).run();
      return json({ gdn, whopAccount: maskAccount(account), payouts: await sendOwed(env, gdn) });
    }
    // the Desk's settings row: Connected or Not yet. The dealer's own key only; the account masked
    if (req.method === 'GET' && url.pathname === '/dealers/me') {
      const gdn = await dealerFrom(req, env.DEALER_SECRET);
      if (!gdn || gdn === '*') return text('dealer only', 403);
      const d = await env.DB.prepare(`SELECT d.gdn, d.name, d.whop_account, d.whop_account_verified_at, (SELECT COALESCE(SUM(p.amount), 0) FROM dealer_payouts p WHERE p.dealer = d.gdn AND p.state = 'owed' AND p.held = 1) AS owed FROM dealers d WHERE d.gdn = ?1`)
        .bind(gdn).first<{ gdn: string; name: string; whop_account: string | null; whop_account_verified_at: number | null; owed: number }>();
      if (!d) return fail('no_such_dealer', 404);
      // the key kept in the Desk, by the link or the paste: the Desk's first call with it is this one (CompleteRegistration, AD1; once per GDN)
      await recordMarketing(env, { event: 'CompleteRegistration', sourceId: gdn, client: clientOf(req), sourceUrl: req.headers.get('origin') ?? undefined });
      // whopAccountVerifiedAt: when Whop's account.updated marked the connected account verified (0017); null until then. The Desk's
      // settings row reads it (desk/src/lib/auction.ts accountWords: "Whop checking" while null beside a Connected account)
      return json({ gdn: d.gdn, name: d.name, whopAccount: d.whop_account ? maskAccount(d.whop_account) : null, whopAccountVerifiedAt: d.whop_account_verified_at ?? null, payoutsOwed: d.owed });
    }
    // standing: the owner suspends or restores a dealer; a suspended dealer cannot open a lot
    const standing = url.pathname.match(/^\/dealers\/([A-Z0-9]{5,12})\/(suspend|restore)$/);
    if (req.method === 'POST' && standing) {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      const [, gdn, verb] = standing;
      const r = await env.DB.prepare('UPDATE dealers SET suspended_at = ?2 WHERE gdn = ?1').bind(gdn, verb === 'suspend' ? Date.now() : null).run();
      if (!r.meta.changes) return text('no such dealer', 404);
      return json((await dealerRows()).find(d => d.gdn === gdn));
    }

    // the buyer: a token once the licence is read; the deposit; the push token
    if (req.method === 'POST' && url.pathname === '/me') return signIn(req, env);
    // a new token for the old one; the old one, and every token before it, stops working
    if (req.method === 'POST' && url.pathname === '/me/rotate') {
      const c = await claimOf(bearerOf(req), env.BUYER_SECRET);
      if (!c) return text('sign in', 401);
      const r = await env.DB.prepare('UPDATE buyers SET token_epoch = token_epoch + 1 WHERE id = ?1 AND token_epoch = ?2 RETURNING token_epoch').bind(c.id, c.epoch).first<{ token_epoch: number }>();
      if (!r) return text('sign in', 401);
      return json({ id: c.id, token: await mintBuyerToken(env.BUYER_SECRET, c.id, r.token_epoch) });
    }
    // sign-in by phone (src/phone.ts): a code to a US number, then the code; the verified number is the one the shill check reads
    if (req.method === 'POST' && (url.pathname === '/me/phone' || url.pathname === '/me/phone/verify')) {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      if (url.pathname === '/me/phone') return sendCode(req, env, buyer, CORS);
      // a number proved by Telnyx proves one buyer (migration 0013's unique index): the second buyer to prove it is refused
      // after the code is accepted, so the answer says nothing about a number the caller has not proved
      try { return await verifyCode(req, env, buyer, CORS); }
      catch (e) { if (/UNIQUE constraint failed: buyers\.phone/.test(String((e as Error)?.message ?? e))) return fail('phone_in_use', 409); throw e; }
    }
    // recovery by phone (Phase 2 Onboarding (buyer); W3-B): no token. A code to the number, then the code with the number:
    // the buyer that number proves moves to a fresh token and every old token stops. The app's "This is a new phone" path (W3-D)
    if (req.method === 'POST' && url.pathname === '/me/recover') return sendRecoveryCode(req, env, CORS);
    if (req.method === 'POST' && url.pathname === '/me/recover/verify') return verifyRecovery(req, env, CORS, (id, epoch) => mintBuyerToken(env.BUYER_SECRET, id, epoch));
    if (req.method === 'POST' && url.pathname === '/me/push') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const b = await req.json<{ token?: string }>();
      if (!PUSH_TOKEN.test(b.token ?? '')) return text('bad token', 400);
      await env.DB.prepare('UPDATE buyers SET push_token = ?2 WHERE id = ?1').bind(buyer, b.token).run();
      return json({ ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/me') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const row = await env.DB.prepare(`SELECT b.name, b.state, b.deposit_status, b.terms_version, b.terms_at, b.clause_version, b.clause_at, b.phone, b.phone_verified_at, b.phone_verified_via, c.wins, c.owed, c.leading, c.paid FROM buyers b, (${COUNT_SQL}) c WHERE b.id = ?1`)
        .bind(buyer, yearStart(Date.now()), '').first<{ name: string | null; state: string | null; deposit_status: string; terms_version: string | null; terms_at: number | null; clause_version: string | null; clause_at: number | null; phone: string | null; phone_verified_at: number | null; phone_verified_via: string | null } & Counts>();
      if (!row) return json({ id: buyer, phone: null, phoneVerified: false });
      const { wins, owed, leading, paid, terms_version, terms_at, clause_version, clause_at, phone, phone_verified_at, phone_verified_via, ...rest } = row;
      // Wave 4: the referral code, made on the first read and kept; `referred` is how many claimed it. The clause (D13) as recorded, and whether a bid needs it now
      const referralCode = await referralFor(env, buyer);
      const referred = (await env.DB.prepare('SELECT COUNT(*) AS n FROM referral_claims WHERE code = ?1').bind(referralCode).first<{ n: number }>())?.n ?? 0;
      const clause = { clauseVersion: clause_version, clauseAt: clause_at, clauseCurrent: arbitrationOn(env) ? CLAUSE_VERSION : null, clauseRequired: arbitrationOn(env) && clause_at == null };
      // the number leaves only as its last four, and only once a code proved it
      const phoneVerified = verifiedForReal(env, phone_verified_at, phone_verified_via);
      // D15: winsLeft is the one number the Me screen shows; wins are cars started this calendar year
      // sim 03: openBids is what the one-open-bid gate counts; paidCars lifts it (the Me screen shows winsLeft alone)
      return json({ id: buyer, ...rest, phone: phoneVerified ? maskPhone(phone) : null, phoneVerified, wins, winsLeft: winsLeft({ wins, owed, leading, paid }), winsPerYear: WINS_PER_YEAR, openBids: openBids({ owed, leading }), paidCars: paid, termsVersion: terms_version, termsAt: terms_at, termsCurrent: TERMS_VERSION, referralCode, referred, ...clause });
    }
    // Wave 4: a referral claimed once per buyer, never their own code; waives nothing, moves no money, counts on the referrer's GET /me
    if (req.method === 'POST' && url.pathname === '/me/referral/claim') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const b = await body(req);
      const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
      if (!REFERRAL_CODE.test(code)) return fail('bad_code', 400);
      const owner = await env.DB.prepare('SELECT buyer_id FROM referrals WHERE code = ?1').bind(code).first<{ buyer_id: string }>();
      if (!owner) return fail('no_such_code', 404);
      if (owner.buyer_id === buyer) return fail('own_code', 409);
      const r = await env.DB.prepare('INSERT OR IGNORE INTO referral_claims (referred_id, code, at) VALUES (?1, ?2, ?3)').bind(buyer, code, Date.now()).run();
      if (!r.meta.changes) return fail('already_claimed', 409);
      return json({ claimed: code });
    }
    // Wave 4: the arbitration clause accepted (D13: shown once, scroll-to-end; the phone posts after the end is reached). Recorded once; the same version again is the same answer
    if (req.method === 'POST' && url.pathname === '/me/clause') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const b = await body(req);
      if (b.version !== CLAUSE_VERSION) return json({ error: 'bad_version', version: CLAUSE_VERSION }, 400);
      const now = Date.now();
      await env.DB.prepare('UPDATE buyers SET clause_version = ?2, clause_at = ?3 WHERE id = ?1 AND clause_at IS NULL').bind(buyer, CLAUSE_VERSION, now).run();
      const row = await env.DB.prepare('SELECT clause_version, clause_at FROM buyers WHERE id = ?1').bind(buyer).first<{ clause_version: string; clause_at: number }>();
      return json({ clauseVersion: row?.clause_version ?? CLAUSE_VERSION, clauseAt: row?.clause_at ?? now });
    }
    if (req.method === 'POST' && url.pathname === '/me/deposit/checkout') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      if (!whop.ready && env.DEV === '1') {   // wrangler dev and tests: no Whop, so the glass gets the DEV capture here, the same row POST /me/deposit writes
        const got = await capture(env, buyer, 'dev', 'verify', clientOf(req));
        if (got === 'used') return fail('payment_used', 409);
        if (got === 'duplicate') return fail('already_held', 409);
        return json({ deposit: 'captured', dev: true });   // no checkoutId, no url: the phone tells it from a checkout and opens no browser
      }
      if (!whop.ready) return text('payments not configured', 503);   // deployed (DEV unset): never a deposit without Whop
      const b = await req.json<{ redirectUrl?: string }>();
      const c = await whop.createDepositCheckout(buyer, DEPOSIT_USD, b.redirectUrl ?? 'obavia://deposit');
      return json({ checkoutId: c.id, url: c.purchase_url });
    }
    if (req.method === 'POST' && url.pathname === '/me/deposit') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const b = await req.json<{ paymentId?: string }>();
      let ref: string | null = null;
      if (whop.ready && b.paymentId) {
        const p = await whop.verifyDeposit(b.paymentId, buyer, DEPOSIT_USD).catch(() => null);
        if (p) ref = p.id;
      } else if (env.DEV === '1') {
        ref = 'dev';   // wrangler dev and tests only
      }
      if (!ref) return text('not captured', 402);
      const got = await capture(env, buyer, ref, 'verify', clientOf(req));
      if (got === 'used') return fail('payment_used', 409);   // this payment was a deposit before (applied, forfeited, refunded): it captures once
      if (got === 'duplicate') return fail('already_held', 409);   // a second payment while one is held: kept in the ledger for the admin to refund
      return json({ deposit: 'captured' });
    }
    // the deposit back: only while the buyer leads nothing and owes nothing
    if (req.method === 'POST' && url.pathname === '/me/deposit/release') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const row = await env.DB.prepare('SELECT deposit_status, deposit_ref FROM buyers WHERE id = ?1').bind(buyer).first<{ deposit_status: string; deposit_ref: string | null }>();
      if (row?.deposit_status !== 'captured') return text('nothing held', 409);   // applied to a car, forfeited, refunded, disputed or never paid
      if (await busyOf(env, buyer)) return text('you lead a car or owe one', 409);   // a voided sale owes nothing: the dealer could not deliver
      const refused = await releaseDeposit(env, whop, buyer, row.deposit_ref, { via: 'buyer', actor: 'buyer' });
      if (refused) return refused;
      return json({ deposit: 'refunded' });
    }
    // Whop tells us when money moved; the signature is the only admission
    if (req.method === 'POST' && url.pathname === '/webhooks/whop') {
      const raw = await req.text();
      if (!(await whop.verifyWebhook(req, raw))) return text('bad signature', 401);
      let e: { type?: string; action?: string; data?: WhopData };
      try { e = JSON.parse(raw); } catch { return text('bad body', 400); }
      const type = String(e?.type ?? e?.action ?? '');
      const d: WhopData = e?.data && typeof e.data === 'object' ? e.data : {};
      // every event kept as received, by its type (payment.failed and dispute.created included), before anything moves; a replay is a no-op on the id
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)').bind(req.headers.get('webhook-id') ?? crypto.randomUUID(), type, raw, Date.now()).run();
      if (type === 'payment.succeeded' && d.metadata?.kind === 'deposit' && typeof d.metadata.buyer === 'string' && typeof d.id === 'string') {
        await capture(env, d.metadata.buyer, d.id, 'webhook');
      }
      // refunds and disputes name the payment; the deposit is found by its payment id (buyers.deposit_ref), never by metadata
      const ref = typeof d.payment_id === 'string' ? d.payment_id : typeof d.payment?.id === 'string' ? d.payment.id : null;
      if (ref && (type.startsWith('refund.') || type === 'dispute.created')) {
        const status = String(d.status ?? '').toLowerCase();
        const owner = await env.DB.prepare('SELECT id, deposit_status FROM buyers WHERE deposit_ref = ?1').bind(ref).first<{ id: string; deposit_status: string }>();
        const money = (id: string, t: string, b: Record<string, unknown>) => env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)').bind(id, t, JSON.stringify(b), Date.now()).run();
        if (owner && type.startsWith('refund.') && !['failed', 'canceled', 'cancelled'].includes(status)) {
          if (owner.deposit_status === 'captured') {
            await money(`refund:${ref}`, 'deposit.released', { buyer: owner.id, amount: DEPOSIT_USD, ref, to: 'buyer', via: 'webhook', actor: 'whop' });
            await env.DB.prepare("UPDATE buyers SET deposit_status = 'refunded' WHERE id = ?1 AND deposit_status = 'captured' AND deposit_ref = ?2").bind(owner.id, ref).run();
          } else if (owner.deposit_status === 'applied' || owner.deposit_status === 'forfeited') {
            // the deposit is the dealer's (applied to the car, or forfeited): the status stays, the admin sees the money that left
            await money(`refund_conflict:${ref}`, 'deposit.refund_conflict', { buyer: owner.id, amount: DEPOSIT_USD, ref, status: owner.deposit_status, actor: 'whop' });
          }
        }
        if (owner && type === 'dispute.created' && owner.deposit_status === 'captured') {
          // a disputed deposit backs no bid: the status leaves captured, so the bid path refuses (402) and release is refused
          await money(`dispute:${ref}`, 'deposit.disputed', { buyer: owner.id, amount: DEPOSIT_USD, ref, actor: 'whop' });
          await env.DB.prepare("UPDATE buyers SET deposit_status = 'disputed' WHERE id = ?1 AND deposit_status = 'captured' AND deposit_ref = ?2").bind(owner.id, ref).run();
        }
        if (owner && type === 'dispute.created') await evidenceFor(env, owner.id, ref, typeof d.id === 'string' ? d.id : ref);   // the pack (W3-F) and the upload (W3-A), the result on the ledger
      }
      // Whop finished (or changed) its checks on a dealer's connected account: the verified time on the dealer, then the owed-payout retry.
      // Whop's account.updated shape is UNVERIFIED (README "Not yet"): `id` is the biz_ account; verified is read from
      // `verified`, `status` or `verification.status` (verified, active, approved, enabled, completed)
      if (type === 'account.updated' && typeof d.id === 'string' && WHOP_BIZ.test(d.id)) {
        const dd = d as Record<string, unknown>;
        const status = String(dd.status ?? dd.verification_status ?? (dd.verification as Record<string, unknown> | undefined)?.status ?? '').toLowerCase();
        const verified = dd.verified === true || ['verified', 'active', 'approved', 'enabled', 'completed'].includes(status);
        const row = await env.DB.prepare('SELECT gdn, whop_account_verified_at FROM dealers WHERE whop_account = ?1').bind(d.id).first<{ gdn: string; whop_account_verified_at: number | null }>();
        if (row && verified) {
          const now = Date.now();
          if (!row.whop_account_verified_at) {
            await env.DB.prepare('UPDATE dealers SET whop_account_verified_at = ?2 WHERE gdn = ?1 AND whop_account_verified_at IS NULL').bind(row.gdn, now).run();
            await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
              .bind(`account_verified:${row.gdn}`, 'dealer.account_verified', JSON.stringify({ dealer: row.gdn, account: d.id, actor: 'whop' }), now).run();
          }
          await sendOwed(env, row.gdn);   // every payout left owed to him goes out now, each with its own key
        }
      }
      // the balance and fee invoices and the dealer transfers are W3-A's (src/invoice.ts onWebhook, never throws): invoice.* and transfer.* go there;
      // what it could not match is kept beside the raw event so the admin can see a webhook that named nothing of ours
      if (type.startsWith('invoice.') || type.startsWith('transfer.')) {
        const r = await onWebhook(type, d, env);
        if (!r.handled && r.reason !== 'ignored') await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
          .bind(`unhandled:${req.headers.get('webhook-id') ?? crypto.randomUUID()}`, 'webhook.unhandled', JSON.stringify({ type, reason: r.reason ?? null, actor: 'lane' }), Date.now()).run();
      }
      return json({ ok: true });
    }

    return text('not found', 404);
}

/* POST /me. The Worker makes every buyer id: no id and no token is a new buyer,
   a random id returned once with its token. Any later call names the buyer by
   its token (Bearer), with or without the id; an id without its current token
   is 401 not_yours and a row in token_refusals. A Whop-verified email or phone
   as a second proof is Phase 2. DEV=1 keeps the old path: any id, no credential
   (wrangler dev, the app's local fixtures, tests). */
async function signIn(req: Request, env: Env): Promise<Response> {
  let b: { id?: unknown; name?: string; state?: string; phone?: string; address?: string };
  try { const raw = await req.text(); b = raw ? JSON.parse(raw) : {}; } catch { return text('bad body', 400); }
  if (b == null || typeof b !== 'object') return text('bad body', 400);
  if (b.id != null && (typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(b.id))) return text('bad id', 400);
  const phone = b.phone == null ? null : phoneDigits(b.phone), address = b.address == null ? null : plain(b.address, 160);
  if ((b.phone != null && !phone) || (b.address != null && !address)) return text('bad contact', 400);

  const presentedToken = bearerOf(req);
  const claim = presentedToken ? await claimOf(presentedToken, env.BUYER_SECRET) : null;
  const asked = typeof b.id === 'string' ? b.id : null;
  let id: string;
  if (env.DEV === '1' && asked) {
    id = asked;   // the old path, development only
  } else if (asked || presentedToken) {
    id = asked ?? claim?.id ?? '';
    const row = id ? await env.DB.prepare('SELECT token_epoch FROM buyers WHERE id = ?1').bind(id).first<{ token_epoch: number }>() : null;
    const presented = !presentedToken ? 'none' : !claim ? 'forged' : claim.id !== id ? 'other' : row?.token_epoch !== claim.epoch ? 'stale' : null;
    if (presented) {
      await env.DB.prepare('INSERT INTO token_refusals (claimed, reason, presented, known, at) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind((id || '?').slice(0, 64), 'not_yours', presented, row ? 1 : 0, Date.now()).run().catch(() => {});
      return fail('not_yours', 401);
    }
  } else {
    id = `b_${randomId()}`;   // a new buyer: the only place a buyer id is made
  }
  const r = await env.DB.prepare('INSERT INTO buyers (id, name, state, phone, address, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(id) DO UPDATE SET name = COALESCE(?2, name), state = COALESCE(?3, state), phone = CASE WHEN phone_verified_at IS NULL THEN COALESCE(?4, phone) ELSE phone END, address = COALESCE(?5, address) RETURNING token_epoch')
    .bind(id, b.name ?? null, b.state ?? null, phone, address, Date.now()).first<{ token_epoch: number }>();
  return json({ id, token: await mintBuyerToken(env.BUYER_SECRET, id, r?.token_epoch ?? 0) });
}

/* The winner, for the people who call them: the name and the verified number in full (+1 and ten digits),
   only on what a dealer key reads for its own lot and on the admin's exposure. Never on a buyer-facing payload
   (the lane, GET /lots/:id without a dealer key, the live socket). */
type ContactRow = { name: string | null; phone: string | null; phone_verified_at: number | null; phone_verified_via: string | null };
const contactOf = (env: Env, b: ContactRow | null) => ({ name: b?.name ?? null, phone: b && b.phone && verifiedForReal(env, b.phone_verified_at, b.phone_verified_via) ? `+1${b.phone}` : null });

/** The lot a dealer key reads, with `sale.contact` when the key is this lot's dealer (or the admin) and there is a winner. */
async function withContact(res: Response, env: Env, lotId: string, dealer: string): Promise<Response> {
  if (res.status !== 200) return res;
  if (dealer !== '*') {   // the object strips the dealer from what it returns: the copy says whose lot it is
    const own = await env.DB.prepare('SELECT dealer FROM lots WHERE id = ?1').bind(lotId).first<{ dealer: string }>();
    if (own?.dealer !== dealer) return res;
  }
  // read once and rebuilt: a tee of the object's stream left a branch unread and held the object (its alarm with it)
  const raw = await res.text();
  const same = () => new Response(raw, { status: res.status, headers: res.headers });
  let lot: { sale?: { buyer?: string; contact?: unknown } } | null = null;
  try { lot = JSON.parse(raw); } catch { return same(); }
  if (!lot?.sale?.buyer) return same();
  const b = await env.DB.prepare('SELECT name, phone, phone_verified_at, phone_verified_via FROM buyers WHERE id = ?1').bind(lot.sale.buyer).first<ContactRow>();
  lot.sale.contact = contactOf(env, b);
  return json(lot);
}

/** 128 random bits, base64url: 22 characters. */
function randomId(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A bid refused for who the bidder is (D11, D15) or how fast (Wave 2-E): one row for the admin's exposure view. */
async function refuse(env: Env, lotId: string, who: string, reason: 'seller_cannot_bid' | 'not_a_buyer' | 'win_cap' | 'one_open_bid' | 'too_many_bids' | 'dealers_only', matched: string | null) {
  await env.DB.prepare('INSERT INTO bid_refusals (lot_id, who, reason, matched, at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(lotId, who.slice(0, 80), reason, matched, Date.now()).run().catch(() => {});
}

/** The bids-per-buyer rate limit (migration 0014 bid_attempts): one conditional insert is the lock. Returns 0 when the attempt
    is admitted (a new row, or a retry of a key already seen), else the seconds to wait for the oldest attempt in the window
    to age out. Rows older than ten minutes are pruned in the same batch. */
async function attempt(env: Env, buyer: string, lotId: string, key: string): Promise<number> {
  const now = Date.now();
  const [, ins] = await env.DB.batch<{ id: number }>([
    env.DB.prepare('DELETE FROM bid_attempts WHERE at < ?1').bind(now - 10 * BID_WINDOW_MS),
    env.DB.prepare(`INSERT OR IGNORE INTO bid_attempts (buyer, lot_id, key, at) SELECT ?1, ?2, ?3, ?4
      WHERE (SELECT COUNT(*) FROM bid_attempts WHERE buyer = ?1 AND at > ?4 - ?5) < ?6 RETURNING id`).bind(buyer, lotId, key, now, BID_WINDOW_MS, BIDS_PER_MINUTE),
  ]);
  if (ins.results.length === 1) return 0;
  if (await env.DB.prepare('SELECT 1 AS x FROM bid_attempts WHERE key = ?1').bind(key).first()) return 0;   // a retry: the object answers the same ack
  const oldest = await env.DB.prepare('SELECT MIN(at) AS at FROM (SELECT at FROM bid_attempts WHERE buyer = ?1 AND at > ?2 ORDER BY at DESC LIMIT ?3)').bind(buyer, now - BID_WINDOW_MS, BIDS_PER_MINUTE).first<{ at: number | null }>();
  return Math.max(1, Math.ceil(((oldest?.at ?? now) + BID_WINDOW_MS - now) / 1000));
}

/* POST /dealers/mint. Bearer MINT_SECRET, never DEALER_SECRET. One key for one
   GDN with the dealer's legal name and city; the same GDN again within 30
   minutes is 409 already_minted with no key; at most 20 lane mints an hour in
   all. It lists nothing, suspends nothing and returns nothing but the key.
   An existing dealer row is left as it is (name and standing). Nothing here
   logs the secret or the key. */
async function mint(req: Request, env: Env): Promise<Response> {
  const secret = env.MINT_SECRET ?? '';
  if (secret.length < 32 || !env.DEALER_SECRET || secret === env.DEALER_SECRET) return fail('mint_unavailable', 503);
  if (!(await secretMatches(bearerOf(req), secret))) return fail('forbidden', 403);
  const raw = await req.text();
  if (raw.length > 2048) return fail('too_big', 413);
  let b: { gdn?: unknown; name?: unknown; city?: unknown; referral?: unknown };
  try { b = JSON.parse(raw); } catch { return fail('bad_dealer', 400); }
  const gdn = typeof b?.gdn === 'string' && /^[A-Z0-9]{5,12}$/.test(b.gdn) ? b.gdn : null;
  const name = plain(b?.name, 160), city = plain(b?.city, 80);
  if (!gdn || !name || !city) return fail('bad_dealer', 400);
  const referral = b?.referral == null || b.referral === '' ? null : plain(b.referral, 64);   // Wave 4: the application's referral, as typed; waives nothing
  if (b?.referral != null && b.referral !== '' && !referral) return fail('bad_referral', 400);
  const now = Date.now();
  // One statement decides: no lane mint for this GDN in 30 minutes and fewer than 20 lane mints in the hour.
  const [minted] = await env.DB.batch<{ id: number }>([
    env.DB.prepare(`INSERT INTO dealer_mints (gdn, name, city, source, minted_at)
      SELECT ?1, ?2, ?3, 'lane', ?4
      WHERE NOT EXISTS (SELECT 1 FROM dealer_mints WHERE gdn = ?1 AND source = 'lane' AND minted_at > ?4 - ?5)
        AND (SELECT COUNT(*) FROM dealer_mints WHERE source = 'lane' AND minted_at > ?4 - ?6) < ?7
      RETURNING id`).bind(gdn, name, city, now, MINT_IDEMPOTENT_MS, MINT_WINDOW_MS, MINT_PER_WINDOW),
    env.DB.prepare(`INSERT OR IGNORE INTO dealers (gdn, name, created_at)
      SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM dealer_mints WHERE gdn = ?1 AND source = 'lane' AND minted_at = ?3)`).bind(gdn, name, now),
  ]);
  if (minted.results.length !== 1) {
    const again = await env.DB.prepare(`SELECT 1 AS x FROM dealer_mints WHERE gdn = ?1 AND source = 'lane' AND minted_at > ?2`).bind(gdn, now - MINT_IDEMPOTENT_MS).first();
    if (again) return fail('already_minted', 409);
    const oldest = await env.DB.prepare(`SELECT MIN(minted_at) AS at FROM (SELECT minted_at FROM dealer_mints WHERE source = 'lane' AND minted_at > ?1 ORDER BY minted_at DESC LIMIT ?2)`).bind(now - MINT_WINDOW_MS, MINT_PER_WINDOW).first<{ at: number | null }>();
    const wait = Math.max(1, Math.ceil(((oldest?.at ?? now) + MINT_WINDOW_MS - now) / 1000));
    return fail('rate_limited', 429, { 'retry-after': String(wait) });
  }
  if (referral) {   // kept on the row (the first referral stands) and on the ledger as dealer.referral, as POST /dealers writes it
    await env.DB.prepare('UPDATE dealers SET referral = COALESCE(referral, ?2) WHERE gdn = ?1').bind(gdn, referral).run();
    await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(`referral:${gdn}:${now}`, 'dealer.referral', JSON.stringify({ dealer: gdn, referral, actor: 'lane', waives: 'nothing' }), now).run();
  }
  return json({ token: await mintDealerToken(env.DEALER_SECRET, gdn) });
}

/** The buyer's referral code, made once (eight characters, no vowels, no 0, O, 1, I) and kept; a second request finds the row. */
async function referralFor(env: Env, buyer: string): Promise<string> {
  const have = await env.DB.prepare('SELECT code FROM referrals WHERE buyer_id = ?1').bind(buyer).first<{ code: string }>();
  if (have) return have.code;
  for (let i = 0; i < 8; i++) {
    const code = referralCode();
    const r = await env.DB.prepare('INSERT OR IGNORE INTO referrals (code, buyer_id, created_at) VALUES (?1, ?2, ?3)').bind(code, buyer, Date.now()).run();
    if (r.meta.changes) return code;
    const again = await env.DB.prepare('SELECT code FROM referrals WHERE buyer_id = ?1').bind(buyer).first<{ code: string }>();   // a parallel first read won the unique index
    if (again) return again.code;
  }
  throw new Error('referral code');
}

/** GET /admin/export.csv: the three exports. Columns are fixed here, so no phone, name or address can reach a file: sales and money
    carry the buyer's id only; lots carry the car and the money on it, never a person. */
async function exportCsv(env: Env, what: 'sales' | 'money' | 'lots'): Promise<string> {
  const lots = (await env.DB.prepare('SELECT id, dealer, lot, updated_at FROM lots ORDER BY updated_at DESC LIMIT 5000').all<{ id: string; dealer: string; lot: string; updated_at: number }>()).results
    .map(r => ({ id: r.id, dealer: r.dealer, updatedAt: r.updated_at, l: JSON.parse(r.lot) }));
  if (what === 'lots') {
    return csv(['lotId', 'dealer', 'lane', 'year', 'make', 'model', 'vin', 'miles', 'start', 'retail', 'high', 'bids', 'watching', 'floor', 'titleStatus', 'opensAt', 'closesAt', 'closedAt', 'sold', 'updatedAt'],
      lots.map(({ id, dealer, updatedAt, l }) => [id, dealer, l.car?.lane ?? 'public', l.car?.year, l.car?.make, l.car?.model, l.car?.vin, l.car?.miles, l.start, l.retail, l.high, l.bids, l.watching, l.car?.collateral?.floor, l.car?.collateral?.title?.status, l.opensAt, l.closesAt, l.closed?.at ?? null, l.closed ? (l.closed.sold ? 1 : 0) : null, updatedAt]));
  }
  if (what === 'sales') {
    const payouts = new Map((await env.DB.prepare('SELECT lot_id, state, reason FROM dealer_payouts').all<{ lot_id: string; state: string; reason: string }>()).results.map(p => [p.lot_id, p]));
    return csv(['lotId', 'dealer', 'buyerId', 'buyerGdn', 'sellerGdn', 'state', 'hammer', 'wonAt', 'deadlineAt', 'paidAt', 'startedAt', 'voidedAt', 'forfeitedAt', 'deposit', 'payoutState', 'payoutReason', 'platesState', 'year', 'make', 'model', 'vin'],
      lots.filter(x => x.l.sale).map(({ id, dealer, l }) => { const s = l.sale, p = payouts.get(id); return [id, dealer, s.buyer, s.buyerGdn ?? null, s.sellerGdn ?? null, saleState(s), s.hammer, s.wonAt, s.deadlineAt, s.paidAt ?? null, s.startedAt ?? null, s.voidedAt ?? null, s.forfeitedAt ?? null, s.deposit ?? null, p?.state ?? null, p?.reason ?? null, s.plates?.state ?? null, l.car?.year, l.car?.make, l.car?.model, l.car?.vin]; }));
  }
  const events = (await env.DB.prepare('SELECT id, type, body, received_at FROM money_events ORDER BY received_at DESC, id DESC LIMIT 5000').all<EventRow>()).results.map(moneyEvent);
  return csv(['id', 'type', 'kind', 'amountUsd', 'lotId', 'buyerId', 'actor', 'reason', 'at'], events.map(e => [e.id, e.type, e.kind, e.amountUsd, e.lotId, e.buyer, e.actor, e.reason, e.at]));
}

/* ---------------------------------------------------------------- money */

type WhopData = { id?: unknown; status?: unknown; payment_id?: unknown; payment?: { id?: unknown } | null; metadata?: Record<string, unknown> | null; usd_total?: unknown; total?: unknown; amount?: unknown };
type EventRow = { id: string; type: string; body: string; received_at: number };
type PayoutRow = { id: string; lot_id: string; dealer: string; buyer: string; amount: number; reason: string; note: string | null; held: number; state: string; transfer_id: string | null; error: string | null; created_at: number; sent_at: number | null; method: string | null; paid_note: string | null };
type SaleLike = { startedAt?: number; voidedAt?: number; forfeitedAt?: number; paidAt?: number };
type InvoiceRow = { id: string; lot_id: string; kind: string; payer: string; payee: string | null; whop_id: string | null; state: string; amount_cents: number; currency: string; payment_ref: string | null; error: string | null; created_at: number; paid_at: number | null; updated_at: number };
type PackRow = { id: number; lot_id: string; buyer: string | null; dispute_id: string | null; key: string; sha256: string; bytes: number; at: number; uploaded_at: number | null; upload_ref: string | null; upload_error: string | null };

const saleState = (s: SaleLike) => s.startedAt ? 'started' : s.voidedAt ? 'voided' : s.forfeitedAt ? 'forfeited' : s.paidAt ? 'paid' : 'owed';
const str = (v: unknown): string | null => typeof v === 'string' && v ? v : null;
const num = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;

/** One money_events row as the admin's money page reads it (admin-api.ts MoneyEvent), plus who acted and why. */
function moneyEvent(r: EventRow) {
  let b: Record<string, any> = {};
  try { const x = JSON.parse(r.body); if (x && typeof x === 'object') b = x; } catch { /* kept as received */ }
  if (b.data && typeof b.data === 'object') {   // a Whop webhook, as received
    const d = b.data as WhopData, md = (d.metadata ?? {}) as Record<string, unknown>;
    return { id: r.id, type: r.type, kind: str(md.kind), amountUsd: num(d.usd_total) ?? num(d.total) ?? num(d.amount), lotId: str(md.lot), buyer: str(md.buyer), at: r.received_at, actor: 'whop', reason: null };
  }
  const kind = r.type.startsWith('deposit.') ? 'deposit' : r.type.startsWith('payout.') ? 'payout' : r.type.startsWith('balance.') ? 'balance' : null;
  const reason = str(b.reason) ?? (r.type === 'deposit.released' ? str(b.kind) : null);   // a void's release names no_start or non_delivery as its kind
  return { id: r.id, type: r.type, kind, amountUsd: num(b.amount) ?? num(b.balance), lotId: str(b.lotId), buyer: str(b.buyer), at: r.received_at, actor: str(b.actor) ?? 'lane', reason };
}

/** A dealer_payouts row as the admin reads it (admin-api.ts Payout): sent on Whop or paid by hand are both 'paid'; `via` says which. */
function payoutOut(p: PayoutRow) {
  const out = p.state !== 'owed';
  return { id: p.id, lotId: p.lot_id, dealer: p.dealer, buyer: p.buyer, amountUsd: p.amount, state: out ? 'paid' as const : 'owed' as const, via: p.state === 'sent' ? 'whop' : p.state === 'paid' ? 'hand' : null,
    paidAt: out ? p.sent_at : null, method: p.method, note: p.state === 'paid' ? p.paid_note : p.note, reason: p.reason, held: !!p.held, transferId: p.transfer_id, error: p.error, createdAt: p.created_at };
}

/** An invoices row (0016) as the admin's money page reads it (admin-api.ts Invoice): the amount in cents, never a pay URL or a key. */
function invoiceOut(i: InvoiceRow) {
  return { id: i.id, lotId: i.lot_id, kind: i.kind, payer: i.payer, payee: i.payee, whopId: i.whop_id, state: i.state, amountCents: i.amount_cents, amountUsd: i.amount_cents / 100, currency: i.currency, paymentRef: i.payment_ref, error: i.error, createdAt: i.created_at, at: i.created_at, paidAt: i.paid_at, updatedAt: i.updated_at };
}
/** An evidence_packs row (0018) as the admin's Disputed rows read it (admin-api.ts readPack): the upload state is uploadedAt or uploadError. */
function packOut(p: PackRow) {
  return { id: p.id, lotId: p.lot_id, buyer: p.buyer, disputeId: p.dispute_id, key: p.key, sha256: p.sha256, bytes: p.bytes, at: p.at, createdAt: p.at, uploadedAt: p.uploaded_at, uploadRef: p.upload_ref, uploadError: p.upload_error,
    upload: p.uploaded_at ? 'sent' as const : p.upload_error ? 'refused' as const : 'not_sent' as const };
}

/** Owed and sent, in dollars, in all and by dealer. Rows with held = 0 are counted apart: nothing came in, nothing goes out. */
function payoutSums(rows: PayoutRow[]) {
  const byDealer: Record<string, { owedUsd: number; sentUsd: number; owed: number; sent: number }> = {};
  let owedUsd = 0, sentUsd = 0, notHeld = 0;
  for (const p of rows) {
    if (!p.held) { notHeld += 1; continue; }
    const d = byDealer[p.dealer] ??= { owedUsd: 0, sentUsd: 0, owed: 0, sent: 0 };
    if (p.state === 'owed') { d.owedUsd += p.amount; d.owed += 1; owedUsd += p.amount; }
    else { d.sentUsd += p.amount; d.sent += 1; sentUsd += p.amount; }
  }
  return { owedUsd, sentUsd, notHeld, byDealer };
}

/** Whether a buyer's deposit backs something now: a lot they lead, or a sale they won and have not finished. */
async function busyOf(env: Env, buyer: string): Promise<'leads_a_lot' | 'owes_a_sale' | null> {
  const r = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM lots WHERE json_extract(lot, '$.closed') IS NULL AND json_extract(lot, '$.leader') = ?1) AS leads,
      (SELECT COUNT(*) FROM lots WHERE json_extract(lot, '$.sale.buyer') = ?1 AND json_extract(lot, '$.sale.startedAt') IS NULL
         AND json_extract(lot, '$.sale.voidedAt') IS NULL AND json_extract(lot, '$.sale.forfeitedAt') IS NULL) AS owes`).bind(buyer).first<{ leads: number; owes: number }>();
  return r?.leads ? 'leads_a_lot' : r?.owes ? 'owes_a_sale' : null;
}

/** A deposit captured, by the verify path or the webhook: the ledger row (deposit.captured, id capture:<payment>) and the
    buyer's state move together in one batch, and only when this request wrote the row. A payment id captures once, ever:
    a replayed webhook or a reused payment after the deposit was applied, forfeited or refunded is 'used' and moves nothing.
    A second payment while one is held is kept as deposit.duplicate for the admin to refund. */
async function capture(env: Env, buyer: string, ref: string, via: 'verify' | 'webhook', client?: Client): Promise<'captured' | 'used' | 'duplicate' | 'unknown'> {
  const row = await env.DB.prepare('SELECT deposit_status, deposit_ref FROM buyers WHERE id = ?1').bind(buyer).first<{ deposit_status: string; deposit_ref: string | null }>();
  if (!row) return 'unknown';
  if (row.deposit_status === 'captured' && row.deposit_ref === ref) return 'captured';   // the verify path and the webhook for the same payment
  const now = Date.now(), nonce = crypto.randomUUID();
  const id = ref === 'dev' ? `capture:dev:${buyer}:${now}` : `capture:${ref}`;
  const type = row.deposit_status === 'captured' ? 'deposit.duplicate' : 'deposit.captured';
  const [, moved] = await env.DB.batch([
    env.DB.prepare('INSERT INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO NOTHING')
      .bind(id, type, JSON.stringify({ buyer, amount: DEPOSIT_USD, ref, via, actor: via === 'webhook' ? 'whop' : 'buyer', nonce }), now),
    env.DB.prepare(`UPDATE buyers SET deposit_status = 'captured', deposit_ref = ?2 WHERE id = ?1 AND deposit_status != 'captured'
      AND EXISTS (SELECT 1 FROM money_events WHERE id = ?3 AND json_extract(body, '$.nonce') = ?4)`).bind(buyer, ref, id, nonce),
  ]);
  if (moved.meta.changes) {   // the deposit is held: AddPaymentInfo (AD1; refundable, so never Purchase), keyed on the ledger row, sent only with the Meta keys
    await recordMarketing(env, { event: 'AddPaymentInfo', sourceId: id, at: now, value: DEPOSIT_USD, currency: 'USD', phone: await buyerPhoneOf(env, buyer), client });
    return 'captured';
  }
  const mine = await env.DB.prepare(`SELECT 1 AS x FROM money_events WHERE id = ?1 AND json_extract(body, '$.nonce') = ?2`).bind(id, nonce).first();
  return mine ? 'duplicate' : 'used';
}

/** A deposit given back (the buyer, or the admin with a reason): the ledger row first (deposit.released, id refund:<payment>, the
    same id the refund webhook writes), then the Whop refund, then the state. A refund Whop refuses takes its row back out: 502. */
async function releaseDeposit(env: Env, whop: Whop, buyer: string, ref: string | null, extra: Record<string, unknown>): Promise<Response | null> {
  const now = Date.now(), nonce = crypto.randomUUID();
  const real = !!ref && ref !== 'dev';
  const id = real ? `refund:${ref}` : `refund:dev:${buyer}:${now}`;
  await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(id, 'deposit.released', JSON.stringify({ buyer, amount: DEPOSIT_USD, ref, to: 'buyer', ...extra, nonce }), now).run();
  if (whop.ready && real) {
    try { await whop.refund(ref!); }
    catch {
      await env.DB.prepare(`DELETE FROM money_events WHERE id = ?1 AND json_extract(body, '$.nonce') = ?2`).bind(id, nonce).run().catch(() => {});
      return fail('refund_failed', 502);
    }
  }
  await env.DB.prepare(`UPDATE buyers SET deposit_status = 'refunded' WHERE id = ?1 AND deposit_status = 'captured'`).bind(buyer).run();
  return null;
}

/** Every payout left owed for a dealer, sent now when the dealer has a connected account and Whop is configured. Each transfer
    carries the payout's own id as its idempotency key (applied:<lot> or forfeit:<lot>, as the lot's object sent it), so a payout
    the object already sent is never sent twice. A refusal stays owed with its error. dealer_payouts is the record; the lot's
    sale.payout follows it through the object's POST /payout. */
export async function sendOwed(env: Env, gdn: string): Promise<{ sent: number; owed: number }> {
  const rows = (await env.DB.prepare(`SELECT * FROM dealer_payouts WHERE dealer = ?1 AND state = 'owed' AND held = 1 ORDER BY created_at`).bind(gdn).all<PayoutRow>()).results;
  const whop = new Whop(env);
  const acct = whop.ready ? (await env.DB.prepare('SELECT whop_account FROM dealers WHERE gdn = ?1').bind(gdn).first<{ whop_account: string | null }>())?.whop_account : null;
  if (!acct) return { sent: 0, owed: rows.length };
  let sent = 0;
  for (const p of rows) {
    try {
      const t = await whop.transferToDealer(acct, p.amount, p.id, `${p.reason} ${p.lot_id}`);
      const now = Date.now();
      const [moved] = await env.DB.batch([
        env.DB.prepare('UPDATE dealer_payouts SET state = ?2, transfer_id = ?3, sent_at = ?4, error = NULL WHERE id = ?1 AND state = ?5').bind(p.id, 'sent', t.id, now, 'owed'),
        env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
          .bind(`payout:${p.id}`, 'payout.sent', JSON.stringify({ lotId: p.lot_id, dealer: gdn, amount: p.amount, reason: p.reason, transferId: t.id, via: 'retry', actor: 'lane' }), now),
      ]);
      sent += 1;
      if (moved.meta.changes) await tellLot(env, p.lot_id, { id: p.id, state: 'sent', transferId: t.id, at: now });
    } catch (e) {
      await env.DB.prepare('UPDATE dealer_payouts SET error = ?2 WHERE id = ?1').bind(p.id, String((e as Error)?.message ?? e).slice(0, 240)).run().catch(() => {});
    }
  }
  return { sent, owed: rows.length - sent };
}

/** The lot's sale.payout follows a dealer_payouts row moved here (paid by hand, sent by the retry). Called after the D1 write,
    which is the record; a refusal or a failure here leaves the row as it is and the Sold page one step behind. */
async function tellLot(env: Env, lotId: string, news: PayoutNews): Promise<void> {
  try {
    await env.AUCTION.get(env.AUCTION.idFromName(lotId)).fetch(new Request(`https://auction/lots/${lotId}/payout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(news) }));   // no x-dealer: the admin
  } catch { /* the row is the truth */ }
}

/** A dispute on a buyer's deposit (phases.md Phase 3 Admin; collateral.md §2 "After pickup"): the evidence pack for the sale
    that deposit backs (W3-F's evidencePack in src/sign.ts: the terms line, the signed Guide and bill, the pickup row, one PDF in
    R2 with its sha256 and a row in evidence_packs, migration 0018), then the upload onto the Whop dispute (W3-A's uploadEvidence
    in src/invoice.ts: attach only, nothing without WHOP_API_KEY). The result lands on the pack row (dispute_id, uploaded_at and
    upload_ref, or upload_error) and on the ledger as `dispute.pack` (`dispute_pack:<payment>`). The sale: the buyer's latest sale
    not voided; with none, the row says `no_sale` and no pack is built. Nothing here throws into the webhook. */
async function evidenceFor(env: Env, buyer: string, ref: string, disputeId: string): Promise<void> {
  const now = Date.now();
  const out: Record<string, unknown> = { buyer, ref, disputeId, actor: 'lane' };
  try {
    const sale = await env.DB.prepare(`SELECT id FROM lots WHERE json_extract(lot, '$.sale.buyer') = ?1 AND json_extract(lot, '$.sale.voidedAt') IS NULL ORDER BY json_extract(lot, '$.sale.wonAt') DESC LIMIT 1`).bind(buyer).first<{ id: string }>();
    out.lotId = sale?.id ?? null;
    if (!sale) { out.pack = 'no_sale'; out.upload = 'no_pack'; }
    else {
      const { evidencePack } = await import('./sign');
      let pack: Awaited<ReturnType<typeof evidencePack>> = null;
      try { pack = await evidencePack(sale.id, env); out.pack = pack ? 'built' : 'no_lot'; }
      catch (e) { out.pack = 'failed'; out.packError = String((e as Error)?.message ?? e).slice(0, 240); }
      if (pack) {
        out.packId = pack.id; out.packKey = pack.key; out.packSha256 = pack.sha256; out.packBytes = pack.bytes;
        await env.DB.prepare('UPDATE evidence_packs SET dispute_id = ?2 WHERE id = ?1').bind(pack.id, disputeId.slice(0, 120)).run();
        const obj = await env.FILES.get(pack.key);
        const bytes = obj ? new Uint8Array(await obj.arrayBuffer()) : null;
        if (!bytes) { out.upload = 'no_bytes'; await env.DB.prepare('UPDATE evidence_packs SET upload_error = ?2 WHERE id = ?1').bind(pack.id, 'pack bytes not found in R2').run(); }
        else {
          const r = await uploadEvidence(disputeId, bytes, env, now);
          if (r.sent) { out.upload = 'sent'; out.uploadRef = r.fileId; await env.DB.prepare('UPDATE evidence_packs SET uploaded_at = ?2, upload_ref = ?3, upload_error = NULL WHERE id = ?1').bind(pack.id, r.at, r.fileId).run(); }
          else { out.upload = 'not_sent'; out.uploadReason = r.reason; await env.DB.prepare('UPDATE evidence_packs SET upload_error = ?2 WHERE id = ?1').bind(pack.id, r.reason.slice(0, 240)).run(); }
        }
      } else out.upload = 'no_pack';
    }
  } catch (e) { out.error = String((e as Error)?.message ?? e).slice(0, 240); }
  await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)').bind(`dispute_pack:${ref}`, 'dispute.pack', JSON.stringify(out), now).run();
}

/** One lot's log (GET /admin/lots/:id/log): every row the lane kept about it, in time order, newest last. Each row is
    `{ at, kind, ...the row }`; `kind` is the table it came from (bids, bid_refusals, pickup_refusals, signatures, money (every
    money_events row naming the lot: the plates, the payouts, the deposit, the offer, the dispute), incidents, evidence_packs,
    recoveries are not here: they name no lot), invoice (the balance and the fee rows, 0016), evidence_pack (0018). */
async function lotLogOf(env: Env, lotId: string) {
  const rows: Record<string, unknown>[] = [];
  const add = (kind: string, list: Record<string, unknown>[], at: (r: Record<string, unknown>) => number) => { for (const r of list) rows.push({ ...r, at: at(r), kind }); };   // kind last: the table's name, never a column's
  const q = async (sql: string) => { try { return (await env.DB.prepare(sql).bind(lotId).all<Record<string, unknown>>()).results; } catch { return []; } };   // a table not yet applied lists nothing
  add('bid', await q('SELECT key, bidder, amount, ok, reason, stamped_at, shill_check FROM bids WHERE lot_id = ?1 ORDER BY stamped_at'), r => r.stamped_at as number);
  add('bid_refusal', await q('SELECT who, reason, matched, at FROM bid_refusals WHERE lot_id = ?1 ORDER BY at'), r => r.at as number);
  add('pickup_refusal', await q('SELECT dealer, reason, presented, at FROM pickup_refusals WHERE lot_id = ?1 ORDER BY at'), r => r.at as number);
  add('signature', await q('SELECT doc, buyer, at, consent_version, reuse, signed_sha256, original_sha256 FROM signatures WHERE lot_id = ?1 ORDER BY at'), r => r.at as number);
  add('incident', await q('SELECT id, dealer, kind AS incident, note, at FROM incidents WHERE lot_id = ?1 ORDER BY at'), r => r.at as number);
  add('payout', await q('SELECT id, dealer, buyer, amount, reason, note, held, state, transfer_id, method, created_at, sent_at FROM dealer_payouts WHERE lot_id = ?1 ORDER BY created_at'), r => r.created_at as number);
  add('invoice', await q('SELECT id, kind AS invoice_kind, payer, payee, whop_id, state, amount_cents, payment_ref, error, created_at, paid_at FROM invoices WHERE lot_id = ?1 ORDER BY created_at'), r => r.created_at as number);
  add('money', (await q(`SELECT id, type, body, received_at FROM money_events WHERE json_extract(body, '$.lotId') = ?1 OR json_extract(body, '$.data.metadata.lot') = ?1 ORDER BY received_at`)).map(r => { const e = moneyEvent(r as unknown as EventRow); return { id: e.id, type: e.type, amountUsd: e.amountUsd, buyer: e.buyer, actor: e.actor, reason: e.reason, received_at: r.received_at }; }), r => r.received_at as number);
  add('evidence_pack', await q('SELECT id, buyer, dispute_id, key, sha256, bytes, at, terms_version, guide_sha256, bill_sha256, started_at, uploaded_at, upload_ref, upload_error FROM evidence_packs WHERE lot_id = ?1 ORDER BY at'), r => r.at as number);
  rows.sort((a, b) => (a.at as number) - (b.at as number));
  const lot = await env.DB.prepare('SELECT dealer, updated_at FROM lots WHERE id = ?1').bind(lotId).first<{ dealer: string; updated_at: number }>();
  return { lotId, dealer: lot?.dealer ?? null, updatedAt: lot?.updated_at ?? null, rows };
}

/* ---------------------------------------------------------------- the Google Wallet pass */

/** GET /lots/:id/pass: a Google Wallet generic pass as a signed "Save to Google Wallet" JWT (RS256 with the service account's
    key; `iss` its client_email, `aud` google, `typ` savetowallet; Google Wallet API, "Add to Google Wallet" link flow, read
    2026-10-13). The pass is the same pass the phone shows (src/pass.ts): the QR is `obavia:<lot>:<vin>:<wonAt>` and the six
    under it the VIN's last six, so the Desk's scanner and its Type The Pass read the Wallet pass as they read the app's. The
    object id is `<issuer>.<lot>-<buyer>` (one pass per sale), the class `<issuer>.obavia_pickup` (made once in the issuer's
    console). No price, no fee, no deadline on the pass: the car, the dealer, where, and the code. `started` turns the state
    line to "Started"; the pass does not change after it is saved (the Wallet API's object update is not called here). */
export async function walletPass(env: Env, p: { lotId: string; buyer: string; vin: string; wonAt: number; car: string; dealer: string; where: string; started: boolean }): Promise<{ url: string; objectId: string; expiresAt: number }> {
  const sa = JSON.parse(env.GOOGLE_WALLET_SERVICE_ACCOUNT ?? '{}') as { client_email?: unknown; private_key?: unknown };
  if (typeof sa.client_email !== 'string' || typeof sa.private_key !== 'string') throw new Error('bad service account');
  const issuer = env.GOOGLE_WALLET_ISSUER_ID!;
  const objectId = `${issuer}.${p.lotId}-${p.buyer}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const object = {
    id: objectId, classId: `${issuer}.obavia_pickup`, state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'en-US', value: 'Obavia' } },
    header: { defaultValue: { language: 'en-US', value: p.car || 'Your car' } },
    subheader: { defaultValue: { language: 'en-US', value: p.dealer || 'Pickup' } },
    barcode: { type: 'QR_CODE', value: passValue(p.lotId, p.vin, p.wonAt), alternateText: passSix(p.vin) },
    textModulesData: [
      { id: 'six', header: 'Pass', body: passSix(p.vin) },
      ...(p.where ? [{ id: 'where', header: 'Where', body: p.where }] : []),
      { id: 'state', header: 'At the lot', body: p.started ? 'Started' : 'Scan, start' },
    ],
    hexBackgroundColor: '#dfeefb',
  };
  const iat = Math.floor(Date.now() / 1000), exp = iat + 3600;   // the link is good for an hour; the saved pass stays
  const claims = { iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat, exp, origins: [], payload: { genericObjects: [object] } };
  const b64 = (x: ArrayBuffer | string) => (typeof x === 'string' ? btoa(unescape(encodeURIComponent(x))) : btoa(String.fromCharCode(...new Uint8Array(x)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signing = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify(claims))}`;
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signing));
  const jwt = `${signing}.${b64(sig)}`;
  return { url: `https://pay.google.com/gp/v/save/${jwt}`, objectId, expiresAt: exp * 1000 };
}

/** The nightly pass: every dealer with a connected account and a payout owed. */
export async function sendAllOwed(env: Env): Promise<void> {
  if (!new Whop(env).ready) return;
  const dealers = (await env.DB.prepare(`SELECT DISTINCT p.dealer FROM dealer_payouts p JOIN dealers d ON d.gdn = p.dealer WHERE p.state = 'owed' AND p.held = 1 AND d.whop_account IS NOT NULL`).all<{ dealer: string }>()).results;
  for (const d of dealers) await sendOwed(env, d.dealer);
}
