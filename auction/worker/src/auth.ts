/* Who is calling. A buyer token is `${id}.${hmac}` at epoch 0 and
   `${id}.${epoch}.${hmac}` after a rotation, signed with BUYER_SECRET over
   everything before the last dot. The id is made by the Worker on the first
   POST /me; the epoch is `buyers.token_epoch`, so a rotation or an admin bump
   cuts off every token minted before it. A dealer token is `d:${gdn}.${hmac}`
   signed with DEALER_SECRET, minted once for the Desk by an admin call that
   carries the secret itself. No sessions; a buyer request costs one D1 read of
   the epoch, and the bid path folds it into the admission read it already makes. */

const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bearer(req: Request): string {
  const h = req.headers.get('authorization') ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : new URL(req.url).searchParams.get('token') ?? '';
}

async function verify(token: string, secret: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot), sig = token.slice(dot + 1);
  return same(await hmac(secret, id), sig) ? id : null;
}

/** The signed part of a buyer token: the id alone at epoch 0 (every token minted before 0009 stays valid), `id.epoch` after. */
const buyerPayload = (buyerId: string, epoch: number) => epoch ? `${buyerId}.${epoch}` : buyerId;
export async function mintBuyerToken(secret: string, buyerId: string, epoch = 0): Promise<string> {
  const p = buyerPayload(buyerId, epoch);
  return `${p}.${await hmac(secret, p)}`;
}
export const mintDealerToken = async (secret: string, gdn: string) => `d:${gdn}.${await hmac(secret, `d:${gdn}`)}`;

/** A presented secret against the configured one, in constant time: both are hashed to 32 bytes first, so neither length nor content leaks. */
export async function secretMatches(presented: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([presented, secret].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  return crypto.subtle.timingSafeEqual(a, b);
}

/** The bearer secret on a request, for the mint route. */
export const bearerOf = (req: Request): string => { const h = req.headers.get('authorization') ?? ''; return h.startsWith('Bearer ') ? h.slice(7) : ''; };

export type BuyerClaim = { id: string; epoch: number };

/** What a buyer token says, signature checked, epoch not yet checked against D1; null when it is not a buyer token. */
export async function claimOf(token: string, secret: string): Promise<BuyerClaim | null> {
  const p = await verify(token, secret);
  if (!p || p.startsWith('d:')) return null;
  const dot = p.indexOf('.');
  if (dot < 0) return { id: p, epoch: 0 };
  const e = p.slice(dot + 1);
  return /^[1-9]\d{0,8}$/.test(e) ? { id: p.slice(0, dot), epoch: Number(e) } : null;
}
export const buyerClaim = (req: Request, secret: string) => claimOf(bearer(req), secret);

/** The buyer id, or null: the signature and the epoch D1 holds now (a rotated or bumped token is refused). */
export async function buyerFrom(req: Request, env: { DB: D1Database; BUYER_SECRET: string }): Promise<string | null> {
  const c = await buyerClaim(req, env.BUYER_SECRET);
  if (!c) return null;
  const row = await env.DB.prepare('SELECT token_epoch FROM buyers WHERE id = ?1').bind(c.id).first<{ token_epoch: number }>();
  return row?.token_epoch === c.epoch ? c.id : null;
}

/** The dealer's GDN: from a dealer token, or "*" for the master secret (admin, tests, the first Desk). */
export async function dealerFrom(req: Request, secret: string): Promise<string | null> {
  if (!secret) return null;
  const t = bearer(req);
  if (t && same(t, secret)) return '*';
  const id = await verify(t, secret);
  return id?.startsWith('d:') ? id.slice(2) : null;
}
