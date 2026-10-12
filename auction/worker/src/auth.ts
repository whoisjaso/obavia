/* Who is calling. A buyer token is `${id}.${hmac}` signed with BUYER_SECRET,
   minted when the licence is read and the deposit captured. A dealer token is
   `d:${gdn}.${hmac}` signed with DEALER_SECRET, minted once for the Desk by an
   admin call that carries the secret itself. No sessions, no database read on
   the hot path. */

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

export const mintBuyerToken = async (secret: string, buyerId: string) => `${buyerId}.${await hmac(secret, buyerId)}`;
export const mintDealerToken = async (secret: string, gdn: string) => `d:${gdn}.${await hmac(secret, `d:${gdn}`)}`;

/** The buyer id, or null. */
export async function buyerFrom(req: Request, secret: string): Promise<string | null> {
  const id = await verify(bearer(req), secret);
  return id && !id.startsWith('d:') ? id : null;
}

/** The dealer's GDN: from a dealer token, or "*" for the master secret (admin, tests, the first Desk). */
export async function dealerFrom(req: Request, secret: string): Promise<string | null> {
  if (!secret) return null;
  const t = bearer(req);
  if (t && same(t, secret)) return '*';
  const id = await verify(t, secret);
  return id?.startsWith('d:') ? id.slice(2) : null;
}
