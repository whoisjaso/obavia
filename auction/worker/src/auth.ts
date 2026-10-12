/* Who is calling. A buyer token is `${id}.${hmac}` signed with BUYER_SECRET,
   minted when the licence is read and the deposit captured; the Desk calls
   with DEALER_SECRET. No sessions, no database read on the hot path. */

const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function mintBuyerToken(secret: string, buyerId: string): Promise<string> {
  return `${buyerId}.${await hmac(secret, buyerId)}`;
}

/** The buyer id, or null. Constant-time compare on the signature. */
export async function buyerFrom(req: Request, secret: string): Promise<string | null> {
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : new URL(req.url).searchParams.get('token') ?? '';
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot), sig = token.slice(dot + 1);
  const want = await hmac(secret, id);
  if (want.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? id : null;
}

export function isDealer(req: Request, secret: string): boolean {
  const h = req.headers.get('authorization') ?? '';
  return !!secret && h === `Bearer ${secret}`;
}
