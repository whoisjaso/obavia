/* The Worker. Routes to one Auction object per lot. Buyers carry a signed
   token and must hold a captured deposit before a bid is forwarded; the Desk
   carries a dealer token and opens, closes, marks paid and scans pickup.
   Photos and documents live in R2. Reads of the lane come from D1, the copy;
   everything live comes from the object. */
import { bearerOf, buyerClaim, buyerFrom, claimOf, dealerFrom, mintBuyerToken, mintDealerToken, secretMatches } from './auth';
import type { Env } from './env';
import type { BidRequest } from '../../src/engine/server';
import { viewerHtml } from './view';
import { lastReconciliations, reconcile } from './reconcile';
import { Whop } from './whop';
import { COUNT_SQL, TERMS_VERSION, WINS_PER_YEAR, committed, phoneDigits, winsLeft, yearStart, type Counts } from './bidders';
import type { BidIn } from './auction';
import { maskPhone, sendCode, verifiedForReal, verifyCode } from './phone';
export { Auction } from './auction';

const DEPOSIT_USD = 250;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, x-photo-size', 'access-control-allow-methods': 'GET, POST, PUT' };
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json', ...CORS } });
const text = (t: string, status: number) => new Response(t, { status, headers: CORS });
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MINT_IDEMPOTENT_MS = 30 * 60_000;   // the same GDN twice inside this window: 409, no key
const MINT_WINDOW_MS = 3_600_000, MINT_PER_WINDOW = 20;   // every lane mint together
const fail = (error: string, status: number, extra: Record<string, string> = {}) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', ...extra, ...CORS } });
const plain = (v: unknown, max: number) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= max && !/[\u0000-\u001f\u007f]/.test(v) ? v.trim().replace(/\s+/g, ' ') : null;

/** Every response leaves with the CORS headers, the Durable Object's included (a WebSocket upgrade is passed through untouched). */
function withCors(r: Response): Response {
  if (r.status === 101 || r.webSocket) return r;
  const h = new Headers(r.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> { return withCors(await handle(req, env)); },
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> { ctx.waitUntil(reconcile(env).then(() => {})); },
} satisfies ExportedHandler<Env>;

async function handle(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const whop = new Whop(env);

    // the lane: every open lot, from the copy
    if (req.method === 'GET' && url.pathname === '/lots') {
      const rows = await env.DB.prepare('SELECT lot FROM lots ORDER BY updated_at DESC LIMIT 200').all<{ lot: string }>();
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

      // dealer: open, close, paid, pickup, car, photos, documents
      if (['/open', '/close', '/paid', '/pickup', '/car', '/void'].includes(rest) || rest.startsWith('/photos/') || rest.startsWith('/documents/')) {
        const dealer = await dealerFrom(req, env.DEALER_SECRET);
        if (!dealer) return text('dealer only', 403);
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
        return withContact(await toObject({ method: 'POST', body, dealer: dealer === '*' ? (rest === '/open' ? (JSON.parse(body || '{}').dealer ?? '*') : '') : dealer }), env, id, dealer);
      }
      // buyer: bid, watch, live
      if (rest === '/bids' || rest === '/watch' || rest === '/live') {
        if (rest === '/bids' && req.method === 'POST') {   // a Desk or admin key never bids, on any lot (D11)
          const desk = await dealerFrom(req, env.DEALER_SECRET);
          if (desk) {
            await refuse(env, id, desk === '*' ? 'admin' : `dealer:${desk}`, 'not_a_buyer', null);
            return fail('not_a_buyer', 403);
          }
        }
        const claim = await buyerClaim(req, env.BUYER_SECRET);
        if (!claim) return text('sign in', 401);
        const buyer = claim.id;
        if (rest === '/bids') {
          // one read of the copy admits the buyer: the token's epoch, deposit, terms, the year's count, and what the shill check compares
          const row = await env.DB.prepare(`SELECT b.token_epoch, b.deposit_status, b.terms_at, b.name, b.phone, b.phone_verified_at, b.phone_verified_via, b.address, c.wins, c.owed, c.leading FROM buyers b, (${COUNT_SQL}) c WHERE b.id = ?1`)
            .bind(buyer, yearStart(Date.now()), id).first<{ token_epoch: number; deposit_status: string; terms_at: number | null; name: string | null; phone: string | null; phone_verified_at: number | null; phone_verified_via: string | null; address: string | null } & Counts>();
          if (row?.token_epoch !== claim.epoch) return text('sign in', 401);   // rotated or bumped away
          const body = await req.json<Omit<BidRequest, 'bidder' | 'lotId'> & { terms?: string }>();
          if (!(body.amount > 0) || !(body.max >= body.amount) || !body.key || body.key.length > 128) return text('bad bid', 400);
          // sign-in by phone, the first page of the first-bid chain (phone, licence, deposit): no verified number, no bid
          const verifiedPhone = verifiedForReal(env, row.phone_verified_at, row.phone_verified_via) ? row.phone : null;
          if (!verifiedPhone) return json({ error: 'phone_required' }, 409);
          if (row.deposit_status !== 'captured') return text('deposit first', 402);
          const firstBid = row.terms_at == null;
          if (firstBid && body.terms !== TERMS_VERSION) return json({ error: 'terms_required', version: TERMS_VERSION }, 409);
          const count = committed(row);
          if (count >= WINS_PER_YEAR) {   // D15: a bid that could become a fifth win this year is refused
            await refuse(env, id, buyer, 'win_cap', String(count));
            return json({ error: 'win_cap', count, cap: WINS_PER_YEAR }, 403);
          }
          const fwd: BidIn = { lotId: id, bidder: buyer, amount: Math.round(body.amount), max: Math.round(body.max), key: `${buyer}:${body.key}`, who: { phone: verifiedPhone, address: row.address, name: row.name } };   // D11 compares the verified phone only
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
    const dealerRows = async () => (await env.DB.prepare('SELECT d.gdn, d.name, d.created_at, d.suspended_at, (SELECT COUNT(*) FROM incidents i WHERE i.dealer = d.gdn) AS incidents FROM dealers d ORDER BY d.created_at').all<{ gdn: string; name: string; created_at: number; suspended_at: number | null; incidents: number }>()).results
      .map(d => ({ ...d, suspended: d.suspended_at != null }));

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
      const sales = lots.filter(l => l.sale).map(l => ({ lotId: l.id, dealer: l.dealer, state: l.sale.startedAt ? 'started' : l.sale.voidedAt ? 'voided' : l.sale.forfeitedAt ? 'forfeited' : l.sale.paidAt ? 'paid' : 'owed', deposit: l.sale.deposit, hammer: l.sale.hammer, deadlineAt: l.sale.deadlineAt,
        buyer: winners.get(l.sale.buyer) ?? { name: null, phone: null } }));   // the desk person's one call (CF9); admin only
      return json({
        deposits: { heldCount: held, heldUsd: held * DEPOSIT_USD, byStatus: Object.fromEntries(dep.results.map(d => [d.s, d.n])), reserveRatio: 1 },   // every held deposit sits in the Whop balance; nothing is spent
        lots: { open: lots.filter(l => !l.closed).length, atLender: lots.filter(l => !l.closed && l.car?.collateral?.title?.status === 'lender').length, floorBelowPayoff: lots.filter(l => !l.closed && (l.car?.collateral?.title?.payoff ?? 0) > (l.car?.collateral?.floor ?? Infinity)).length },
        sales,
        incidentsByDealer: Object.fromEntries(incidents.results.map(i => [i.dealer, i.n])),
        bidRefusals: { byReason: Object.fromEntries(refusals.results.map(r => [r.reason, r.n])), recent: recentRefusals.results },   // D11 and D15
        tokenRefusals: { byPresented: Object.fromEntries(tokenRefusals.results.map(r => [r.presented, r.n])), recent: recentTokenRefusals.results },   // POST /me not_yours
        dealers: await dealerRows(),
        obaviaFeesOwed: 0,   // none until the GDN issues (43 TAC §215.85)
        reconciliations: await lastReconciliations(env, 7),   // the nightly D1 vs object and Whop vs deposits report
      });
    }
    // run the nightly reconciliation now (admin); the cron runs it at 03:00 Central
    if (req.method === 'POST' && url.pathname === '/admin/reconcile') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      return json(await reconcile(env));
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
      const b = await req.json<{ gdn: string; name: string }>();
      if (!/^[A-Z0-9]{5,12}$/.test(b.gdn ?? '') || !b.name) return text('bad dealer', 400);
      await env.DB.prepare('INSERT INTO dealers (gdn, name, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(gdn) DO UPDATE SET name = ?2').bind(b.gdn, b.name, Date.now()).run();
      return json({ token: await mintDealerToken(env.DEALER_SECRET, b.gdn) });
    }
    if (req.method === 'GET' && url.pathname === '/dealers') {
      if ((await dealerFrom(req, env.DEALER_SECRET)) !== '*') return text('admin only', 403);
      return json(await dealerRows());
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
      return url.pathname === '/me/phone' ? sendCode(req, env, buyer, CORS) : verifyCode(req, env, buyer, CORS);
    }
    if (req.method === 'POST' && url.pathname === '/me/push') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const b = await req.json<{ token?: string }>();
      if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,64}\]$/.test(b.token ?? '')) return text('bad token', 400);
      await env.DB.prepare('UPDATE buyers SET push_token = ?2 WHERE id = ?1').bind(buyer, b.token).run();
      return json({ ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/me') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const row = await env.DB.prepare(`SELECT b.name, b.state, b.deposit_status, b.terms_version, b.terms_at, b.phone, b.phone_verified_at, b.phone_verified_via, c.wins, c.owed, c.leading FROM buyers b, (${COUNT_SQL}) c WHERE b.id = ?1`)
        .bind(buyer, yearStart(Date.now()), '').first<{ name: string | null; state: string | null; deposit_status: string; terms_version: string | null; terms_at: number | null; phone: string | null; phone_verified_at: number | null; phone_verified_via: string | null } & Counts>();
      if (!row) return json({ id: buyer, phone: null, phoneVerified: false });
      const { wins, owed, leading, terms_version, terms_at, phone, phone_verified_at, phone_verified_via, ...rest } = row;
      // the number leaves only as its last four, and only once a code proved it
      const phoneVerified = verifiedForReal(env, phone_verified_at, phone_verified_via);
      // D15: winsLeft is the one number the Me screen shows; wins are cars started this calendar year
      return json({ id: buyer, ...rest, phone: phoneVerified ? maskPhone(phone) : null, phoneVerified, wins, winsLeft: winsLeft({ wins, owed, leading }), winsPerYear: WINS_PER_YEAR, termsVersion: terms_version, termsAt: terms_at, termsCurrent: TERMS_VERSION });
    }
    if (req.method === 'POST' && url.pathname === '/me/deposit/checkout') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      if (!whop.ready) return text('payments not configured', 503);
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
      await env.DB.prepare('UPDATE buyers SET deposit_status = ?2, deposit_ref = ?3 WHERE id = ?1').bind(buyer, 'captured', ref).run();
      return json({ deposit: 'captured' });
    }
    // the deposit back: only while the buyer leads nothing and owes nothing
    if (req.method === 'POST' && url.pathname === '/me/deposit/release') {
      const buyer = await buyerFrom(req, env);
      if (!buyer) return text('sign in', 401);
      const row = await env.DB.prepare('SELECT deposit_status, deposit_ref FROM buyers WHERE id = ?1').bind(buyer).first<{ deposit_status: string; deposit_ref: string | null }>();
      if (row?.deposit_status !== 'captured') return text('nothing held', 409);
      const open = await env.DB.prepare('SELECT lot FROM lots').all<{ lot: string }>();
      const busy = open.results.some(r => { const l = JSON.parse(r.lot); return (!l.closed && l.leader === buyer) || (l.sale && l.sale.buyer === buyer && !l.sale.startedAt && !l.sale.forfeitedAt && !l.sale.voidedAt); });   // a voided sale owes nothing: the dealer could not deliver
      if (busy) return text('you lead a car or owe one', 409);
      if (whop.ready && row.deposit_ref && row.deposit_ref !== 'dev') await whop.refund(row.deposit_ref);
      await env.DB.prepare('UPDATE buyers SET deposit_status = ?2 WHERE id = ?1').bind(buyer, 'refunded').run();
      return json({ deposit: 'refunded' });
    }
    // Whop tells us when money moved; the signature is the only admission
    if (req.method === 'POST' && url.pathname === '/webhooks/whop') {
      const raw = await req.text();
      if (!(await whop.verifyWebhook(req, raw))) return text('bad signature', 401);
      const e = JSON.parse(raw) as { type?: string; action?: string; data?: { id?: string; metadata?: Record<string, string>; status?: string } };
      const type = e.type ?? e.action ?? '';
      const d = e.data ?? {};
      if (type === 'payment.succeeded' && d.metadata?.kind === 'deposit' && d.metadata.buyer && d.id) {
        await env.DB.prepare('UPDATE buyers SET deposit_status = ?2, deposit_ref = ?3 WHERE id = ?1 AND deposit_status != ?2').bind(d.metadata.buyer, 'captured', d.id).run();
      }
      if (type.startsWith('refund.') && d.metadata?.kind === 'deposit' && d.metadata.buyer) {
        await env.DB.prepare('UPDATE buyers SET deposit_status = ?2 WHERE id = ?1').bind(d.metadata.buyer, 'refunded').run();
      }
      await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)').bind(req.headers.get('webhook-id') ?? crypto.randomUUID(), type, raw, Date.now()).run();
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

/** A bid refused for who the bidder is (D11, D15): one row for the admin's exposure view. */
async function refuse(env: Env, lotId: string, who: string, reason: 'seller_cannot_bid' | 'not_a_buyer' | 'win_cap', matched: string | null) {
  await env.DB.prepare('INSERT INTO bid_refusals (lot_id, who, reason, matched, at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(lotId, who.slice(0, 80), reason, matched, Date.now()).run().catch(() => {});
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
  let b: { gdn?: unknown; name?: unknown; city?: unknown };
  try { b = JSON.parse(raw); } catch { return fail('bad_dealer', 400); }
  const gdn = typeof b?.gdn === 'string' && /^[A-Z0-9]{5,12}$/.test(b.gdn) ? b.gdn : null;
  const name = plain(b?.name, 160), city = plain(b?.city, 80);
  if (!gdn || !name || !city) return fail('bad_dealer', 400);
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
  return json({ token: await mintDealerToken(env.DEALER_SECRET, gdn) });
}
