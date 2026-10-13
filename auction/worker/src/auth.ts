/* Who is calling. A buyer token is `${id}.${hmac}` at epoch 0 and
   `${id}.${epoch}.${hmac}` after a rotation, signed with BUYER_SECRET over
   everything before the last dot. The id is made by the Worker on the first
   POST /me; the epoch is `buyers.token_epoch`, so a rotation or an admin bump
   cuts off every token minted before it. A dealer token is `d:${gdn}.${hmac}`
   signed with DEALER_SECRET, minted once for the Desk by an admin call that
   carries the secret itself. No sessions; a buyer request costs one D1 read of
   the epoch, and the bid path folds it into the admission read it already makes.
   Wave 4 (phases.md Phase 5 Admin, roles): a dealer token may carry a role,
   `d:${gdn}:${role}.${hmac}` for manager and lot; the bare form `d:${gdn}.${hmac}`
   stays valid and is the owner. What each role may call is decided once in
   src/index.ts (roleRefusal), never per route. */

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
/** The three roles a Desk key can carry (phases.md Phase 5 Admin: "a manager runs a dealer without the owner"). The owner's key
    is the bare form (every key minted before Wave 4 is an owner key); manager and lot are named in the signed part. */
export type DealerRole = 'owner' | 'manager' | 'lot';
export const DEALER_ROLES: readonly DealerRole[] = ['owner', 'manager', 'lot'];
export const roleOf = (v: unknown): DealerRole | null => v === undefined || v === null ? 'owner' : DEALER_ROLES.includes(v as DealerRole) ? v as DealerRole : null;
const dealerPayload = (gdn: string, role: DealerRole) => role === 'owner' ? `d:${gdn}` : `d:${gdn}:${role}`;
export async function mintDealerToken(secret: string, gdn: string, role: DealerRole = 'owner'): Promise<string> {
  const p = dealerPayload(gdn, role);
  return `${p}.${await hmac(secret, p)}`;
}

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

export type DealerClaim = { gdn: string; role: DealerRole };

/** What a dealer token says: the GDN and the role, or `{ gdn: '*', role: 'owner' }` for the master secret (admin, tests, the
    first Desk). A token naming a role other than manager or lot (or naming owner in the long form) is no token. */
export async function dealerClaim(req: Request, secret: string): Promise<DealerClaim | null> {
  if (!secret) return null;
  const t = bearer(req);
  if (t && same(t, secret)) return { gdn: '*', role: 'owner' };
  const id = await verify(t, secret);
  if (!id?.startsWith('d:')) return null;
  const body = id.slice(2), colon = body.indexOf(':');
  if (colon < 0) return { gdn: body, role: 'owner' };
  const role = body.slice(colon + 1);
  return role === 'manager' || role === 'lot' ? { gdn: body.slice(0, colon), role } : null;
}

/** The dealer's GDN: from a dealer token (any role), or "*" for the master secret. */
export async function dealerFrom(req: Request, secret: string): Promise<string | null> {
  return (await dealerClaim(req, secret))?.gdn ?? null;
}
