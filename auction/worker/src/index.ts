/* The Worker. Routes to one Auction object per lot. Buyers carry a signed
   token and must hold a captured deposit before a bid is forwarded; the Desk
   opens and closes lots with the dealer secret. Reads of the lane come from
   D1, the copy; everything live comes from the object. */
import { buyerFrom, isDealer, mintBuyerToken } from './auth';
import type { Env } from './env';
import type { BidRequest } from '../../src/engine/server';
export { Auction } from './auction';

const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
const text = (t: string, status: number) => new Response(t, { status, headers: { 'access-control-allow-origin': '*' } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST' } });

    // the lane: every open lot, from the copy
    if (req.method === 'GET' && url.pathname === '/lots') {
      const rows = await env.DB.prepare('SELECT lot FROM lots ORDER BY updated_at DESC LIMIT 200').all<{ lot: string }>();
      return json(rows.results.map(r => { const l = JSON.parse(r.lot); delete l.max; delete l.dealer; return l; }));
    }

    const m = url.pathname.match(/^\/lots\/([A-Za-z0-9_-]{1,64})(\/.*)?$/);
    if (m) {
      const [, id, rest = '/'] = m;
      const stub = env.AUCTION.get(env.AUCTION.idFromName(id));
      // dealer: open, close
      if (rest === '/open' || rest === '/close') {
        if (!isDealer(req, env.DEALER_SECRET)) return text('dealer only', 403);
        return stub.fetch(req);
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
          return stub.fetch(new Request(req.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fwd) }));
        }
        if (rest === '/live') return stub.fetch(req);   // WebSocket upgrade passes through
        return stub.fetch(req);
      }
      if (rest === '/' && req.method === 'GET') return stub.fetch(req);
      return text('not found', 404);
    }

    // the buyer: a token once the licence is read; the deposit once Stripe captured it
    if (req.method === 'POST' && url.pathname === '/me') {
      const b = await req.json<{ id: string; name?: string; state?: string }>();
      if (!/^[A-Za-z0-9_-]{4,64}$/.test(b.id ?? '')) return text('bad id', 400);
      await env.DB.prepare('INSERT INTO buyers (id, name, state, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET name = COALESCE(?2, name), state = COALESCE(?3, state)')
        .bind(b.id, b.name ?? null, b.state ?? null, Date.now()).run();
      return json({ token: await mintBuyerToken(env.BUYER_SECRET, b.id) });
    }
    if (req.method === 'POST' && url.pathname === '/me/deposit') {
      const buyer = await buyerFrom(req, env.BUYER_SECRET);
      if (!buyer) return text('sign in', 401);
      const b = await req.json<{ paymentIntent?: string }>();
      let captured = false;
      if (env.STRIPE_SECRET && b.paymentIntent) {
        const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(b.paymentIntent)}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET}` } });
        const pi = await r.json<{ status?: string; amount?: number }>();
        captured = r.ok && pi.status === 'succeeded' && (pi.amount ?? 0) >= 25000;
      } else if (env.DEV === '1') {
        captured = true;   // wrangler dev and tests only
      }
      if (!captured) return text('not captured', 402);
      await env.DB.prepare('UPDATE buyers SET deposit_status = ?2, deposit_ref = ?3 WHERE id = ?1').bind(buyer, 'captured', b.paymentIntent ?? 'dev').run();
      return json({ deposit: 'captured' });
    }

    return text('not found', 404);
  },
} satisfies ExportedHandler<Env>;
