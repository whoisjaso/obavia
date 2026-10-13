/* The real server, over the Worker. Same surface as LocalAuctionServer so
   the store and the screens do not know which one they have. */
import type { Ack, BidRequest, Event, Lot } from './server';

/** D10 (decisions §4 and §9): the four auction terms, stated once on the first bid ever, and the version the
    first bid carries. The same words as worker/src/bidders.ts TERMS; client.test.ts fails if they drift. */
export const TERMS_VERSION = '2026-10-13';
export const TERMS = [
  'with reserve unless marked no reserve',
  'neither the seller nor Obavia bids',
  'bids are irrevocable',
  'the sale completes at the VIN scan and engine start',
] as const;

/** The buyer on this phone: the id the Worker made and its current token (migration 0009). */
export type Session = { id: string; token: string };
/** What the buyer gave us, sent on POST /me. `phone` and `address` feed the Worker's shill check (D11); omitted when unknown. */
export type Profile = { name?: string; state?: string; phone?: string; address?: string };
/** What GET /me says. `termsCurrent` false means the next bid is the first under the current terms. */
export type MeRead = {
  id: string; name?: string; state?: string; deposit_status?: string;
  wins?: number; winsLeft?: number; winsPerYear?: number; termsVersion?: string | null; termsCurrent?: boolean;
  /** the verified number as its last four ("(•••) •••-0142"), null until a code proved it */
  phone?: string | null; phoneVerified?: boolean;
};
/** What the phone routes answer: the masked number on success, the Worker's code and its Retry-After otherwise. */
export type PhoneAnswer = { ok: true; phone: string | null } | { ok: false; code: string; retryAfter?: number };

/** A request the Worker refused, by its code: `not_yours` (sign-in with a dead token), `sign_in` (401 elsewhere),
    `phone_required` (409, no number proved by a code), `deposit` (402), `terms_required` (409), `win_cap`, `seller_cannot_bid`, `not_a_buyer` (403), or `http_<status>`. */
export class Refused extends Error {
  readonly code: string; readonly status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

/** The refusal in a response: the JSON `error` when there is one, else a code from the status. */
async function refusal(r: Response): Promise<Refused> {
  let code = '';
  try { const b = await r.clone().json() as { error?: unknown }; if (typeof b?.error === 'string') code = b.error; } catch { /* text body */ }
  if (!code) code = r.status === 401 ? 'sign_in' : r.status === 402 ? 'deposit' : `http_${r.status}`;
  return new Refused(code, r.status);
}

/** The profile without empty fields, so an unknown phone or address is omitted, never sent blank. */
function present(p: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  return out;
}

export class RemoteAuctionServer {
  private lots = new Map<string, Lot>();
  private subs = new Set<(e: Event) => void>();
  private sockets = new Map<string, WebSocket>();
  private timer?: ReturnType<typeof setInterval>;

  constructor(private base: string, private token: () => string | null) {}

  start() {
    void this.refresh();
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const l of this.lots.values()) if (!l.closed && now >= l.closesAt) { l.closed = { at: l.closesAt, sold: l.bids > 0 }; this.emit({ lotId: l.id, lot: { ...l }, kind: 'close' }); }   // read-time close; the object confirms
      this.emit({ lotId: '*', lot: undefined as unknown as Lot, kind: 'tick' });
    }, 250);
    return this;
  }
  stop() { if (this.timer) clearInterval(this.timer); for (const ws of this.sockets.values()) ws.close(); }

  subscribe(fn: (e: Event) => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit(e: Event) { for (const s of this.subs) s(e); }

  get(id: string): Lot { const l = this.lots.get(id); if (!l) throw new Error(`no lot ${id}`); return { ...l }; }
  all(): Lot[] { return [...this.lots.values()].map(l => ({ ...l })); }

  /** The lane from the copy, then a live socket per lot. */
  async refresh() {
    const r = await fetch(`${this.base}/lots`);
    const lots = await r.json() as Lot[];
    for (const l of lots) { this.lots.set(l.id, l); this.emit({ lotId: l.id, lot: l, kind: 'bid' }); this.live(l.id); }
  }

  private live(id: string) {
    if (this.sockets.has(id)) return;
    const t = this.token(); if (!t) return;
    const url = `${this.base.replace(/^http/, 'ws')}/lots/${id}/live?token=${encodeURIComponent(t)}`;
    const ws = new WebSocket(url);
    ws.addEventListener('message', (m: { data: unknown }) => { const e = JSON.parse(String(m.data)) as Event; this.lots.set(e.lotId, e.lot); this.emit(e); });
    ws.addEventListener('close', () => { this.sockets.delete(id); setTimeout(() => this.live(id), 2000 + Math.random() * 3000); });
    this.sockets.set(id, ws);
  }

  /** One request, one key, one ack. A retry carries the same key and gets the same ack. */
  async bid(req: BidRequest): Promise<Ack> {
    const t = this.token(); if (!t) throw new Refused('sign_in', 401);
    const body = { amount: req.amount, max: req.max, key: req.key, ...(req.terms ? { terms: req.terms } : {}) };
    const r = await fetch(`${this.base}/lots/${req.lotId}/bids`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw await refusal(r);
    const ack = await r.json() as Ack;
    this.lots.set(ack.lot.id, ack.lot);
    return ack;
  }

  async watch(id: string, on: boolean) {
    const t = this.token(); if (!t) return;
    await fetch(`${this.base}/lots/${id}/watch?delta=${on ? 1 : -1}`, { method: 'POST', headers: { authorization: `Bearer ${t}` } });
  }

  /** The deposit checkout on Whop: the Worker makes it; the app opens it in an in-app browser and returns by deep link. */
  static async depositCheckout(base: string, token: string, redirectUrl: string): Promise<{ checkoutId: string; url: string } | null> {
    try {
      const r = await fetch(`${base}/me/deposit/checkout`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ redirectUrl }) });
      if (!r.ok) return null;
      const b = await r.json() as { checkoutId?: string; url?: string };
      return b.checkoutId && b.url ? { checkoutId: b.checkoutId, url: b.url } : null;
    } catch { return null; }
  }

  /** Sign-in (worker/README.md, Buyer tokens). Nothing stored: the profile with no id and no authorization; the
      Worker makes the buyer and returns `{ id, token }` once. Stored: the token as Bearer with the id; the answer
      is the same id and its token. A 401 throws Refused('not_yours'): the stored token is dead, and the caller
      must not start a new buyer on its own. */
  static async signIn(base: string, stored: Session | null, profile: Profile): Promise<Session> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (stored) headers.authorization = `Bearer ${stored.token}`;
    const body = stored ? { id: stored.id, ...present(profile) } : present(profile);
    const r = await fetch(`${base}/me`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (r.status === 401) throw new Refused('not_yours', 401);
    if (!r.ok) throw await refusal(r);
    const b = await r.json() as Partial<Session>;
    if (typeof b.id !== 'string' || typeof b.token !== 'string' || !b.id || !b.token) throw new Refused('http_bad_body', r.status);
    if (stored && b.id !== stored.id) throw new Refused('not_yours', 401);   // never adopt another id under a stored one
    return { id: b.id, token: b.token };
  }
  /** A new token for the same buyer; every earlier one stops working. Null when the Worker refuses or the network fails. */
  static async rotate(base: string, token: string): Promise<Session | null> {
    try {
      const r = await fetch(`${base}/me/rotate`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const b = await r.json() as Partial<Session>;
      return typeof b.id === 'string' && typeof b.token === 'string' && b.token ? { id: b.id, token: b.token } : null;
    } catch { return null; }
  }
  static async deposit(base: string, token: string, paymentId?: string): Promise<boolean> {
    const r = await fetch(`${base}/me/deposit`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ paymentId }) });
    return r.ok;
  }

  /** Sign-in by phone, the first page of the first bid (worker/README.md, Sign-in by phone). `phone` in E.164.
      Never logged here or anywhere: the number and the code go in the body and nowhere else. */
  static sendPhone(base: string, token: string, phone: string): Promise<PhoneAnswer> { return RemoteAuctionServer.phoneCall(base, token, '/me/phone', { phone }); }
  static verifyPhone(base: string, token: string, code: string): Promise<PhoneAnswer> { return RemoteAuctionServer.phoneCall(base, token, '/me/phone/verify', { code }); }
  private static async phoneCall(base: string, token: string, path: string, body: Record<string, string>): Promise<PhoneAnswer> {
    try {
      const r = await fetch(`${base}${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await refusal(r); const after = Number(r.headers.get('retry-after')); return { ok: false, code: e.code, ...(after > 0 ? { retryAfter: after } : {}) }; }
      const b = await r.json() as { phone?: string | null; verified?: boolean; sent?: boolean };
      if (path.endsWith('/verify') && b.verified !== true) return { ok: false, code: 'not_verified' };   // a fake proof on a deployed Worker
      return { ok: true, phone: typeof b.phone === 'string' ? b.phone : null };
    } catch { return { ok: false, code: 'network' }; }
  }

  /** Who the Worker thinks the buyer is, and where the deposit stands. */
  static async me(base: string, token: string): Promise<MeRead | null> {
    try {
      const r = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${token}` } });
      return r.ok ? await r.json() as MeRead : null;
    } catch { return null; }
  }
  /** The deposit back to the buyer: only while they lead nothing and owe nothing (the Worker answers 409 otherwise). */
  static async releaseDeposit(base: string, token: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      const r = await fetch(`${base}/me/deposit/release`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      return r.ok ? { ok: true } : { ok: false, reason: (await r.text()) || `status ${r.status}` };
    } catch { return { ok: false, reason: 'network' }; }
  }
}
