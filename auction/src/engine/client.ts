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
  /** sim 03: `openBids` is what the one-open-bid gate counts (lots led plus sales owed); `paidCars` lifts it for good */
  openBids?: number; paidCars?: number;
  /** the verified number as its last four ("(•••) •••-0142"), null until a code proved it */
  phone?: string | null; phoneVerified?: boolean;
  /** W4: this buyer's own referral code (the Share sheet's ?r=) and how many buyers claimed it. Never a reward:
      the Worker waives nothing and the glass says nothing about one. */
  referralCode?: string; referred?: number;
};
/** GET /terms: the arbitration clause behind its flag (D13; phases.md amendment of October 13, 2026: the mechanism
    is built, the words are counsel's and marked draft until then). Null when the flag is off. */
export type Clause = { version: string; text: string; requiresScrollToEnd: true };
export type TermsRead = { clause: Clause | null };
/** What POST /me/referral/claim answers: ok, or the Worker's code (409 already_claimed, 404 no_such_code). */
export type ClaimAnswer = { ok: true } | { ok: false; code: string };
/** What the phone routes answer: the masked number on success, the Worker's code and its Retry-After otherwise. */
export type PhoneAnswer = { ok: true; phone: string | null } | { ok: false; code: string; retryAfter?: number };
/** What POST /me/recover/verify answers (W3-B, recovery by phone): the proved number's buyer, moved to this phone
    under a fresh token (the old install's epoch bumped), or the Worker's code. */
export type RecoverAnswer = { ok: true; session: Session; phone: string | null } | { ok: false; code: string; retryAfter?: number };

/** A request the Worker refused, by its code: `not_yours` (sign-in with a dead token), `sign_in` (401 elsewhere),
    `phone_required` (409, no number proved by a code), `deposit` (402), `terms_required` (409), `win_cap`, `seller_cannot_bid`, `not_a_buyer` (403),
    `too_many_bids` (429, with `retryAfter`), `one_open_bid` (409, with `open`), `clause_required` (409: the clause is
    on and this buyer has not agreed to its current version), or `http_<status>`. */
export interface Refused {
  /** `too_many_bids` (429): the Worker's Retry-After, whole seconds; absent on every other refusal. */
  readonly retryAfter?: number;
  /** `one_open_bid` (409): the body's `open`, the lots led plus the sales owed, other than this lot. */
  readonly open?: number;
}
// the two fields above are declared on the interface, not the class, so Babel emits no own property for them
// and every other refusal keeps its old shape (code and status, nothing more)
export class Refused extends Error {
  readonly code: string; readonly status: number;
  constructor(code: string, status: number, more: { retryAfter?: number; open?: number } = {}) {
    super(code); this.code = code; this.status = status;
    // set only when present, so every other refusal keeps its old shape (code and status, nothing more)
    if (more.retryAfter !== undefined) Object.defineProperty(this, 'retryAfter', { value: more.retryAfter, enumerable: true });
    if (more.open !== undefined) Object.defineProperty(this, 'open', { value: more.open, enumerable: true });
  }
}

/** The refusal in a response: the JSON `error` when there is one, else a code from the status. A 429 keeps
    its Retry-After (seconds; an HTTP date is read as seconds from now); a one_open_bid keeps its `open`. */
async function refusal(r: Response): Promise<Refused> {
  let code = '', open: number | undefined;
  try {
    const b = await r.clone().json() as { error?: unknown; open?: unknown };
    if (typeof b?.error === 'string') code = b.error;
    if (typeof b?.open === 'number' && Number.isFinite(b.open)) open = b.open;
  } catch { /* text body */ }
  if (!code) code = r.status === 401 ? 'sign_in' : r.status === 402 ? 'deposit' : `http_${r.status}`;
  const retryAfter = r.status === 429 ? retryAfterSeconds(r.headers.get('retry-after')) : undefined;
  return new Refused(code, r.status, { ...(retryAfter !== undefined ? { retryAfter } : {}), ...(open !== undefined ? { open } : {}) });
}

/** Retry-After as whole seconds: a number as it is (never below 1), an HTTP date as the seconds until it,
    anything else undefined. */
export function retryAfterSeconds(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const h = header.trim();
  if (/^\d+$/.test(h)) return Math.max(1, Number(h));
  const at = Date.parse(h);
  return Number.isNaN(at) ? undefined : Math.max(1, Math.ceil((at - now) / 1000));
}

/** What the Bid sheet's stamp says for a refusal that keeps the sheet open (DOCTRINE §4.7: why, in four
    words or fewer). Codes that open a page instead (phone, terms, deposit) are not here. `win_cap` is the
    one older sentence the sheet already carried. `too_many_bids`: the seconds left count down beside the
    words. `one_open_bid`: the car the buyer already leads sits beside the words and is the tap. */
export const SAID = {
  win_cap: 'Four wins a year. Next January.',
  too_many_bids: 'Too fast',
  one_open_bid: 'One at a time',
  not_sent: 'Not sent',
} as const;
export type Said = keyof typeof SAID;
export const said = (code: string): string | null => (code in SAID ? SAID[code as Said] : null);

/** Google Wallet's save link: the signed generic-pass JWT after it (Google Wallet API, "Add to Google Wallet"
    link, read 2026-10-13). */
export const WALLET_SAVE = 'https://pay.google.com/gp/v/save/';

/** A rolling minute is the longest the Worker can ask; the countdown's fallback when no Retry-After came. */
export const RETRY_MAX_S = 60;
/** When a too_many_bids refusal lifts: Retry-After counted from the refusal (the Worker's whole seconds). */
export const retryUntil = (retryAfter: number | undefined, refusedAt: number): number => refusedAt + Math.min(RETRY_MAX_S, Math.max(1, retryAfter ?? RETRY_MAX_S)) * 1000;
/** Whole seconds left before `until`, never below 0: the number the stamp shows, and 0 is when Bid returns. */
export const secondsLeft = (until: number, now: number): number => Math.max(0, Math.ceil((until - now) / 1000));

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

  /** POST /lots/:id/offer/accept (W3-B): the second chance taken; the lot with its new sale. Refused: the code
      (`offer_expired`, `not_yours`, `sign_in`), as the Bid sheet's refusals are. */
  async acceptOffer(id: string): Promise<Lot> {
    const t = this.token(); if (!t) throw new Refused('sign_in', 401);
    const r = await fetch(`${this.base}/lots/${id}/offer/accept`, { method: 'POST', headers: { authorization: `Bearer ${t}` } });
    if (!r.ok) throw await refusal(r);
    const lot = await r.json() as Lot;
    this.lots.set(lot.id, lot);
    this.emit({ lotId: lot.id, lot, kind: 'sale' });
    return lot;
  }

  /** GET /lots/:id/pass (W3-B): the Google Wallet save link for the buyer's sale, built from the signed JWT the
      Worker answers (`{ jwt }`, or a ready `{ url }`). Null on 503 pass_unavailable (no issuer id or service
      account), on any refusal, or on the network: the Wallet verb is then not on the glass. */
  async walletPass(id: string): Promise<string | null> {
    const t = this.token(); if (!t) return null;
    try {
      const r = await fetch(`${this.base}/lots/${id}/pass`, { headers: { authorization: `Bearer ${t}` } });
      if (!r.ok) return null;
      const b = await r.json() as { url?: unknown; jwt?: unknown };
      if (typeof b.url === 'string' && /^https:\/\//.test(b.url)) return b.url;
      if (typeof b.jwt === 'string' && b.jwt) return `${WALLET_SAVE}${b.jwt}`;
      return null;
    } catch { return null; }
  }

  async watch(id: string, on: boolean) {
    const t = this.token(); if (!t) return;
    await fetch(`${this.base}/lots/${id}/watch?delta=${on ? 1 : -1}`, { method: 'POST', headers: { authorization: `Bearer ${t}` } });
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

  /** Recovery by phone (W3-B, worker/src/phone.ts sendRecoveryCode and verifyRecovery): the number was proved on
      another install (409 phone_in_use on the code), so a new code goes to it (POST /me/recover `{ phone }`) and its
      proof (POST /me/recover/verify `{ phone, code }`) moves that buyer to this phone under a fresh token. No
      Bearer: the number is the claim. The number and the code go in the body and nowhere else. */
  static async recover(base: string, phone: string): Promise<PhoneAnswer> {
    try {
      const r = await fetch(`${base}/me/recover`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) });
      if (!r.ok) { const e = await refusal(r); const after = Number(r.headers.get('retry-after')); return { ok: false, code: e.code, ...(after > 0 ? { retryAfter: after } : {}) }; }
      const b = await r.json() as { phone?: string | null };
      return { ok: true, phone: typeof b.phone === 'string' ? b.phone : null };
    } catch { return { ok: false, code: 'network' }; }
  }
  static async recoverVerify(base: string, phone: string, code: string): Promise<RecoverAnswer> {
    try {
      const r = await fetch(`${base}/me/recover/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, code }) });
      if (!r.ok) { const e = await refusal(r); const after = Number(r.headers.get('retry-after')); return { ok: false, code: e.code, ...(after > 0 ? { retryAfter: after } : {}) }; }
      const b = await r.json() as { id?: unknown; token?: unknown; phone?: unknown };
      if (typeof b.id !== 'string' || typeof b.token !== 'string' || !b.id || !b.token) return { ok: false, code: 'not_verified' };
      return { ok: true, session: { id: b.id, token: b.token }, phone: typeof b.phone === 'string' ? b.phone : null };
    } catch { return { ok: false, code: 'network' }; }
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

  /** GET /terms: the clause behind its flag, or null. Null too on the network: the flag is then read as off until the
      Worker says otherwise, and a bid's 409 clause_required opens the page anyway. */
  static async terms(base: string): Promise<Clause | null> {
    try {
      const r = await fetch(`${base}/terms`);
      if (!r.ok) return null;
      const b = await r.json() as Partial<TermsRead>;
      const c = b.clause;
      if (!c || typeof c !== 'object' || typeof c.version !== 'string' || typeof c.text !== 'string' || !c.version || !c.text) return null;
      return { version: c.version, text: c.text, requiresScrollToEnd: true };
    } catch { return null; }
  }
  /** POST /me/clause { version }: the buyer agreed to the clause as shown. True once the Worker holds it. */
  static async acceptClause(base: string, token: string, version: string): Promise<boolean> {
    try {
      const r = await fetch(`${base}/me/clause`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ version }) });
      return r.ok;
    } catch { return false; }
  }
  /** POST /me/referral/claim { code }: the code the lane link carried, claimed once the phone is proved. The Worker's
      409 already_claimed and 404 no_such_code come back as codes; the network as 'network'. */
  static async claimReferral(base: string, token: string, code: string): Promise<ClaimAnswer> {
    try {
      const r = await fetch(`${base}/me/referral/claim`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
      if (r.ok) return { ok: true };
      return { ok: false, code: (await refusal(r)).code };
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
