/* The Worker. Routes to one Auction object per lot. Buyers carry a signed
   token and must hold a captured deposit before a bid is forwarded; the Desk
   carries a dealer token and opens, closes, marks paid and scans pickup.
   Photos and documents live in R2. Reads of the lane come from D1, the copy;
   everything live comes from the object. */
import { bearerOf, buyerFrom, dealerFrom, mintBuyerToken, mintDealerToken, secretMatches } from './auth';
import type { Env } from './env';
import type { BidRequest } from '../../src/engine/server';
import { viewerHtml } from './view';
import { lastReconciliations, reconcile } from './reconcile';
import { Whop } from './whop';
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
      if (kind === 'documents' && !(await buyerFrom(req, env.BUYER_SECRET)) && !(await dealerFrom(req, env.DEALER_SECRET))) return text('sign in', 401);
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
        return toObject({ method: 'POST', body, dealer: dealer === '*' ? (rest === '/open' ? (JSON.parse(body || '{}').dealer ?? '*') : '') : dealer });
      }
      // buyer: bid, watch, live
      if (rest === '/bids' || rest === '/watch' || rest === '/live') {
        const buyer = await buyerFrom(req, env.BUYER_SECRET);
        if (!buyer) return text('sign in', 401);
        if (rest === '/bids') {
          const body = await req.json<Omit<BidRequest, 'bidder' | 'lotId'>>();
          if (!(body.amount > 0) || !(body.max >= body.amount) || !body.key || body.key.length > 128) return text('bad bid', 400);
          const admitted = await env.DB.prepare('SELECT deposit_status FROM buyers WHERE id = ?1').bind(buyer).first<{ deposit_status: string }>();
          if (admitted?.deposit_status !== 'captured') return text('deposit first', 402);
          const fwd: BidRequest = { lotId: id, bidder: buyer, amount: Math.round(body.amount), max: Math.round(body.max), key: `${buyer}:${body.key}` };
          return toObject({ method: 'POST', body: JSON.stringify(fwd) });
        }
        return stub.fetch(req);   // watch; or the WebSocket upgrade for /live
      }
      if (rest === '/' && req.method === 'GET') return stub.fetch(req);
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
      const sales = lots.filter(l => l.sale).map(l => ({ lotId: l.id, dealer: l.dealer, state: l.sale.startedAt ? 'started' : l.sale.voidedAt ? 'voided' : l.sale.forfeitedAt ? 'forfeited' : l.sale.paidAt ? 'paid' : 'owed', deposit: l.sale.deposit, hammer: l.sale.hammer, deadlineAt: l.sale.deadlineAt }));
      return json({
        deposits: { heldCount: held, heldUsd: held * DEPOSIT_USD, byStatus: Object.fromEntries(dep.results.map(d => [d.s, d.n])), reserveRatio: 1 },   // every held deposit sits in the Whop balance; nothing is spent
        lots: { open: lots.filter(l => !l.closed).length, atLender: lots.filter(l => !l.closed && l.car?.collateral?.title?.status === 'lender').length, floorBelowPayoff: lots.filter(l => !l.closed && (l.car?.collateral?.title?.payoff ?? 0) > (l.car?.collateral?.floor ?? Infinity)).length },
        sales,
        incidentsByDealer: Object.fromEntries(incidents.results.map(i => [i.dealer, i.n])),
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
    if (req.method === 'POST' && url.pathname === '/me') {
      const b = await req.json<{ id: string; name?: string; state?: string }>();
      if (!/^[A-Za-z0-9_-]{4,64}$/.test(b.id ?? '')) return text('bad id', 400);
      await env.DB.prepare('INSERT INTO buyers (id, name, state, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET name = COALESCE(?2, name), state = COALESCE(?3, state)')
        .bind(b.id, b.name ?? null, b.state ?? null, Date.now()).run();
      return json({ token: await mintBuyerToken(env.BUYER_SECRET, b.id) });
    }
    if (req.method === 'POST' && url.pathname === '/me/push') {
      const buyer = await buyerFrom(req, env.BUYER_SECRET);
      if (!buyer) return text('sign in', 401);
      const b = await req.json<{ token?: string }>();
      if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,64}\]$/.test(b.token ?? '')) return text('bad token', 400);
      await env.DB.prepare('UPDATE buyers SET push_token = ?2 WHERE id = ?1').bind(buyer, b.token).run();
      return json({ ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/me') {
      const buyer = await buyerFrom(req, env.BUYER_SECRET);
      if (!buyer) return text('sign in', 401);
      const row = await env.DB.prepare('SELECT name, state, deposit_status FROM buyers WHERE id = ?1').bind(buyer).first();
      return json({ id: buyer, ...row });
    }
    if (req.method === 'POST' && url.pathname === '/me/deposit/checkout') {
      const buyer = await buyerFrom(req, env.BUYER_SECRET);
      if (!buyer) return text('sign in', 401);
      if (!whop.ready) return text('payments not configured', 503);
      const b = await req.json<{ redirectUrl?: string }>();
      const c = await whop.createDepositCheckout(buyer, DEPOSIT_USD, b.redirectUrl ?? 'obavia://deposit');
      return json({ checkoutId: c.id, url: c.purchase_url });
    }
    if (req.method === 'POST' && url.pathname === '/me/deposit') {
      const buyer = await buyerFrom(req, env.BUYER_SECRET);
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
      const buyer = await buyerFrom(req, env.BUYER_SECRET);
      if (!buyer) return text('sign in', 401);
      const row = await env.DB.prepare('SELECT deposit_status, deposit_ref FROM buyers WHERE id = ?1').bind(buyer).first<{ deposit_status: string; deposit_ref: string | null }>();
      if (row?.deposit_status !== 'captured') return text('nothing held', 409);
      const open = await env.DB.prepare('SELECT lot FROM lots').all<{ lot: string }>();
      const busy = open.results.some(r => { const l = JSON.parse(r.lot); return (!l.closed && l.leader === buyer) || (l.sale && l.sale.buyer === buyer && !l.sale.startedAt && !l.sale.forfeitedAt); });
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
