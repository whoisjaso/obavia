/* Every admin call the Desk makes, in one file, typed (the owner's cockpit, #/auction/admin).
   The routes are the Worker's (auction/worker/src/index.ts, README "Routes"). Four are new in
   Wave 1-B and are coded here against the shapes below; until the Worker carries one, its 404
   reads as NOT_YET and the page says "Not yet", never an error.

     GET  /admin/money               -> Money (events newest first, payouts owed and paid, sales with the buyer)
     POST /admin/payouts/:id/paid    { method: 'wire' | 'check' | 'cash', note } -> Payout
     POST /admin/buyers/:id/release  { reason, lotId? } -> { id, deposit: 'refunded' }
     POST /admin/lots/:id/forfeit    { reason } -> the lot

   The arithmetic the admin home shows (the scorecard's five numbers, the bottleneck line, the last
   reconciliation, the refusals) is here too, as pure functions, so the tests read it without a page.
   Sources: docs/plan/growth/obavia-growth-plan.md §2 (the floors) and §3 (the definitions and the
   bottleneck rule); docs/plan/collateral.md §5 (the exposure). */
import { AUCTION_API, dealerKey, type DealerRow, type Lot, type SaleState } from './auction';

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
/** The reason a call gives when the Worker does not carry the route yet. */
export const NOT_YET = 'not yet';

/* ---------- the shapes ---------- */
export type Reconciliation = {
  id: string; ran_at: number; lots_checked: number; lots_differing: number; differing: string[];
  deposits_held: number; whop_balance_cents: number | null; equal: 0 | 1; note: string;
};
export type BidRefusal = { lotId: string; who: string; reason: string; matched: string | null; at: number };
export type TokenRefusal = { claimed: string; reason: string; presented: string; known: number; at: number };
export type ExposureSale = { lotId: string; dealer?: string; state: SaleState; deposit?: string; hammer: number; deadlineAt: number };
export type AdminExposure = {
  /** reserveRatio is null when the Whop balance was not read: the page says "Not read", never 1.00. */
  deposits: { heldCount: number; heldUsd: number; byStatus: Record<string, number>; reserveRatio: number | null };
  lots: { open: number; atLender: number; floorBelowPayoff: number };
  sales: ExposureSale[];
  incidentsByDealer: Record<string, number>;
  bidRefusals?: { byReason: Record<string, number>; recent: BidRefusal[] };
  tokenRefusals?: { byPresented: Record<string, number>; recent: TokenRefusal[] };
  dealers: DealerRow[];
  obaviaFeesOwed: number;
  reconciliations?: Reconciliation[];
};
export type PayMethod = 'wire' | 'check' | 'cash';
export const PAY_METHODS: PayMethod[] = ['wire', 'check', 'cash'];
/** One row of `money_events`: what Whop said, or what the admin did by hand. */
export type MoneyEvent = { id: string; type: string; kind: string | null; amountUsd: number | null; lotId: string | null; buyer: string | null; at: number };
/** What a dealer is owed for a sale, and whether it went out. */
export type Payout = { id: string; lotId: string; dealer: string; amountUsd: number; state: 'owed' | 'paid'; paidAt: number | null; method: PayMethod | null; note: string | null };
export type MoneySale = { lotId: string; dealer: string | null; buyer: string | null; state: SaleState; hammer: number; deadlineAt: number; deposit: string | null };
export type Money = { events: MoneyEvent[]; payouts: Payout[]; sales: MoneySale[] };

/* ---------- the calls ---------- */
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** The admin calls against one Worker, with one key. The page uses `admin` below; the tests make their own. */
export function adminApi(base: string, key: () => string | null, f: Fetch = (i, init) => fetch(i, init)) {
  async function call<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<Result<T>> {
    if (!base) return { ok: false, reason: 'offline' };
    const k = key();
    if (!k) return { ok: false, reason: 'no key' };
    let r: Response;
    try {
      r = await f(`${base}${path}`, { method, headers: { Authorization: `Bearer ${k}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { return { ok: false, reason: 'offline' }; }
    if (r.ok) { try { return { ok: true, value: await r.json() as T }; } catch { return { ok: false, reason: 'bad answer' }; } }
    return { ok: false, reason: await why(r) };
  }
  const id = (s: string) => encodeURIComponent(s);
  return {
    exposure: () => call<AdminExposure>('GET', '/admin/exposure'),
    reconcile: () => call<Reconciliation>('POST', '/admin/reconcile'),
    bump: (buyer: string) => call<{ id: string; epoch: number }>('POST', `/admin/buyers/${id(buyer)}/bump`),
    dealers: () => call<DealerRow[]>('GET', '/dealers'),
    suspend: (gdn: string) => call<DealerRow>('POST', `/dealers/${id(gdn)}/suspend`, {}),
    restore: (gdn: string) => call<DealerRow>('POST', `/dealers/${id(gdn)}/restore`, {}),
    mint: (gdn: string, name: string) => call<{ token: string }>('POST', '/dealers', { gdn, name }),
    /** The lane from the D1 copy: open lots and lots closed in the last three days (index.ts GET /lots). */
    lane: () => call<Lot[]>('GET', '/lots'),
    money: async (): Promise<Result<Money>> => { const r = await call<unknown>('GET', '/admin/money'); return r.ok ? { ok: true, value: readMoney(r.value) } : r; },
    paidByHand: (payout: string, method: PayMethod, note: string) => {
      if (!PAY_METHODS.includes(method)) return Promise.resolve<Result<Payout>>({ ok: false, reason: 'no method' });
      return call<Payout>('POST', `/admin/payouts/${id(payout)}/paid`, { method, note: note.trim().slice(0, 200) });
    },
    release: (buyer: string, reason: string, lotId?: string) => {
      const r = reasonOf(reason);
      if (!r) return Promise.resolve<Result<{ id: string; deposit: string }>>({ ok: false, reason: 'no reason' });
      return call<{ id: string; deposit: string }>('POST', `/admin/buyers/${id(buyer)}/release`, lotId ? { reason: r, lotId } : { reason: r });
    },
    forfeit: (lotId: string, reason: string) => {
      const r = reasonOf(reason);
      if (!r) return Promise.resolve<Result<Lot>>({ ok: false, reason: 'no reason' });
      return call<Lot>('POST', `/admin/lots/${id(lotId)}/forfeit`, { reason: r });
    },
  };
}
export type AdminApi = ReturnType<typeof adminApi>;
/** The Desk's admin calls: the auction Worker, the key pasted under Lane, Key. */
export const admin = adminApi(AUCTION_API, () => dealerKey.get());

/** A reason is one plain line, 1 to 200 characters. */
export const reasonOf = (s: string) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length >= 1 && t.length <= 200 ? t : null; };

/** The Worker's 404 for a route it does not have is the bare text "not found"; a 404 that names a
 *  thing ("no such buyer") is a real answer and is passed on. JSON errors read their `error`. */
async function why(r: Response): Promise<string> {
  let t = '';
  try { t = (await r.text()).trim(); } catch { /* empty */ }
  if (r.status === 404 && (t === '' || t === 'not found')) return NOT_YET;
  try { const j = JSON.parse(t); if (j && typeof j.error === 'string') return j.error; } catch { /* plain text */ }
  return t || `http ${r.status}`;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
/** The money answer, read defensively: a missing list is empty, events are newest first. */
export function readMoney(raw: unknown): Money {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') as Record<string, unknown>[] : []);
  const events: MoneyEvent[] = list(o.events).map(e => ({
    id: String(e.id ?? ''), type: String(e.type ?? ''), kind: str(e.kind), amountUsd: num(e.amountUsd), lotId: str(e.lotId), buyer: str(e.buyer), at: num(e.at) ?? 0,
  })).sort((a, b) => b.at - a.at);
  const payouts: Payout[] = list(o.payouts).map(p => ({
    id: String(p.id ?? p.lotId ?? ''), lotId: String(p.lotId ?? ''), dealer: String(p.dealer ?? ''), amountUsd: num(p.amountUsd) ?? 0,
    state: p.state === 'paid' ? 'paid' : 'owed', paidAt: num(p.paidAt), method: PAY_METHODS.includes(p.method as PayMethod) ? p.method as PayMethod : null, note: str(p.note),
  }));
  const sales: MoneySale[] = list(o.sales).map(s => ({
    lotId: String(s.lotId ?? ''), dealer: str(s.dealer), buyer: str(s.buyer), state: (['owed', 'paid', 'started', 'forfeited', 'voided'].includes(s.state as string) ? s.state : 'owed') as SaleState,
    hammer: num(s.hammer) ?? 0, deadlineAt: num(s.deadlineAt) ?? 0, deposit: str(s.deposit),
  }));
  return { events, payouts, sales };
}

/* ---------- the week, in Central time (the plan's weeks run Monday to Sunday) ---------- */
const DAY = 86_400_000;
const TZ = 'America/Chicago';
const tzOffset = (t: number) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    .formatToParts(t).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
};
/** Midnight in Chicago on a calendar day. */
const midnight = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) - tzOffset(Date.UTC(y, m - 1, d, 12));
/** Monday 00:00 Central of the week holding t. */
export function weekStart(t: number) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(t);
  const g = (k: string) => f.find(x => x.type === k)!.value;
  const back = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(g('weekday'));
  const noon = Date.UTC(+g('year'), +g('month') - 1, +g('day'), 12) - back * DAY;
  const d = new Date(noon);
  return midnight(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}
/** Week 1 is Monday October 12, 2026 (growth plan §2). */
export const WEEK1 = midnight(2026, 10, 12);
export function weekOf(t: number) {
  const start = weekStart(t);
  const end = weekStart(start + 8 * DAY);
  return { n: Math.round((start - WEEK1) / (7 * DAY)) + 1, start, end };
}

/* ---------- the five numbers ---------- */
export type Key = 'L' | 'D' | 'B' | 'S' | 'T';
/** The floors from growth plan §2, weeks 1 to 12. null is the plan's dash: not judged that week. */
export const FLOORS: { L: number; D: number; Dcum: number; B: number | null; S: number | null; T: number | null }[] = [
  { L: 0, D: 0, Dcum: 0, B: null, S: null, T: null },
  { L: 10, D: 10, Dcum: 10, B: null, S: null, T: null },
  { L: 2, D: 3, Dcum: 13, B: 2, S: 0.6, T: 0.9 },
  { L: 3, D: 5, Dcum: 18, B: 2, S: 0.6, T: 0.9 },
  { L: 4, D: 15, Dcum: 33, B: 3, S: 0.6, T: 0.9 },
  { L: 5, D: 17, Dcum: 50, B: 3, S: 0.6, T: 0.9 },
  { L: 3, D: 8, Dcum: 58, B: 3, S: 0.6, T: 0.9 },
  { L: 5, D: 15, Dcum: 73, B: 3, S: 0.6, T: 0.9 },
  { L: 6, D: 15, Dcum: 88, B: 3, S: 0.6, T: 0.9 },
  { L: 6, D: 15, Dcum: 103, B: 3, S: 0.6, T: 0.9 },
  { L: 3, D: 8, Dcum: 111, B: 3, S: 0.6, T: 0.9 },
  { L: 4, D: 10, Dcum: 121, B: 3, S: 0.6, T: 0.9 },
];
export type Number5 = {
  k: Key; label: string;
  /** null: not measurable from what the Worker gives the Desk today. The page says "Not yet". */
  value: number | null;
  shown: string; floor: number | null; floorShown: string;
  /** The one small line under it: where it came from, or why it is missing. */
  from: string;
};
export type Scorecard = { week: number; start: number; end: number; numbers: Number5[]; bottleneck: string };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const LANE_KEEPS = 3 * DAY;   // GET /lots keeps a closed lot three days

/** The scorecard's five numbers for the week holding `now`, from what the Desk can read. A number the
 *  Desk cannot read in full is null, never guessed (CF1: conservative; growth plan §3: never from memory). */
export function scorecard(now: number, x: AdminExposure | null, lane: Lot[] | null, money: Money | null): Scorecard {
  const w = weekOf(now), f = FLOORS[w.n - 1] ?? null;
  const inWeek = (t: number | undefined) => t != null && t >= w.start && t < w.end;
  const laneCovers = now - w.start <= LANE_KEEPS;   // the lane list still holds every lot that closed this week

  let L: Number5;
  if (!lane) L = { k: 'L', label: 'Lots opened', value: null, shown: 'Not yet', floor: f?.L ?? null, floorShown: '', from: 'The lane did not answer' };
  else {
    const n = lane.filter(l => inWeek(l.opensAt)).length;
    L = { k: 'L', label: 'Lots opened', value: n, shown: laneCovers ? String(n) : `${n} or more`, floor: f?.L ?? null, floorShown: '', from: laneCovers ? 'This week, from the lane' : 'Lots closed 3 days ago drop off the lane' };
  }

  let D: Number5;
  const deposits = money?.events.filter(e => e.type === 'payment.succeeded' && e.kind === 'deposit') ?? null;
  if (!deposits) D = { k: 'D', label: 'Deposits captured', value: null, shown: 'Not yet', floor: f?.D ?? null, floorShown: '', from: 'Needs the money list' };
  else {
    const n = deposits.filter(e => inWeek(e.at)).length, cum = deposits.filter(e => e.at < w.end).length;
    D = { k: 'D', label: 'Deposits captured', value: n, shown: `${n} (${cum})`, floor: f?.D ?? null, floorShown: f ? `${f.D} (${f.Dcum})` : '', from: 'This week, from money events' };
  }

  // B needs distinct bidders per closed lot (D1 bids); no route gives the Desk that read yet.
  const B: Number5 = { k: 'B', label: 'Bidders per closed lot', value: null, shown: 'Not yet', floor: f?.B ?? null, floorShown: '', from: 'No route reads bidders yet' };

  let S: Number5;
  const closed = lane?.filter(l => l.closed && inWeek(l.closed.at)) ?? null;
  if (!closed || !laneCovers || !closed.length) S = { k: 'S', label: 'Sold rate', value: null, shown: 'Not yet', floor: f?.S ?? null, floorShown: '', from: !closed ? 'The lane did not answer' : !laneCovers ? 'The lane keeps 3 days; read Monday from D1' : 'No lot closed this week' };
  else { const v = closed.filter(l => l.closed!.sold).length / closed.length; S = { k: 'S', label: 'Sold rate', value: v, shown: pct(v), floor: f?.S ?? null, floorShown: '', from: `${closed.length} closed this week` }; }

  let T: Number5;
  const decided = x?.sales.filter(s => s.state === 'started' || s.state === 'forfeited' || s.state === 'voided') ?? null;
  if (!decided || !decided.length) T = { k: 'T', label: 'Started rate', value: null, shown: 'Not yet', floor: f?.T ?? null, floorShown: '', from: !decided ? 'The exposure did not answer' : 'No sale decided yet' };
  else { const v = decided.filter(s => s.state === 'started').length / decided.length; T = { k: 'T', label: 'Started rate', value: v, shown: pct(v), floor: f?.T ?? null, floorShown: '', from: `${decided.length} ${decided.length === 1 ? 'sale' : 'sales'} decided, all weeks` }; }

  const numbers = [L, D, B, S, T].map(n => ({ ...n, floorShown: n.floorShown || (n.floor == null ? 'Not judged' : n.k === 'S' || n.k === 'T' ? pct(n.floor) : String(n.floor)) }));
  return { week: w.n, start: w.start, end: w.end, numbers, bottleneck: bottleneck(numbers, w.n) };
}

/** Growth plan §3 rule 3: the change that goes with each contracted number. */
export const ACTION: Record<Key, string> = {
  L: 'the dealer page and the application',
  D: 'the ad or the page',
  B: 'the lane’s reach: Marketplace posts and the share sheet',
  S: 'the floor: Live’s watching, not bidding read',
  T: 'the deadline call and the push copy',
};
/** Growth plan §3 rules 1 and 2, in one line. Only measured numbers with a floor above zero are judged. */
export function bottleneck(numbers: Number5[], week: number): string {
  const judged = numbers.filter(n => n.value != null && n.floor != null && n.floor > 0);
  if (!judged.length) return 'Nothing to judge yet. The week stands on its gate.';
  const under = judged.filter(n => n.value! < n.floor!).map(n => ({ n, gap: (n.floor! - n.value!) / n.floor! })).sort((a, b) => b.gap - a.gap);
  if (!under.length) return week >= 5 ? 'Nothing measured is under its floor. Spend G at +10%.' : 'Nothing measured is under its floor.';
  const { n } = under[0];
  return `${n.k} is the bottleneck: ${n.shown} against ${n.floorShown}. Fix ${ACTION[n.k]}.`;
}

/* ---------- the last reconciliation, in one line ---------- */
export const when = (t: number) => new Date(t).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const usdCents = (c: number) => `$${(Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export function reconLine(rows: Reconciliation[] | undefined): string {
  const r = [...(rows ?? [])].sort((a, b) => b.ran_at - a.ran_at)[0];
  if (!r) return 'Never reconciled.';
  const parts: string[] = [];
  if (r.lots_differing) parts.push(`${r.lots_differing} lot ${r.lots_differing === 1 ? 'copy' : 'copies'} differed`);
  if (r.whop_balance_cents == null) parts.push('Whop balance not read');
  else {
    const diff = r.whop_balance_cents - r.deposits_held * 25_000;
    if (diff < 0) parts.push(`Whop ${usdCents(diff)} short of the deposits`);
  }
  const verdict = r.equal && r.whop_balance_cents != null && !r.lots_differing ? 'Equal' : parts.join('; ') || 'Equal';
  return `${when(r.ran_at)}. ${verdict}.`;
}

/* ---------- the refusals ---------- */
export const BID_REASON: Record<string, string> = { seller_cannot_bid: 'Seller bid on own car', not_a_buyer: 'A Desk key tried to bid', win_cap: 'A fifth win this year' };
export const TOKEN_PRESENTED: Record<string, string> = { none: 'Sign-in with no token', forged: 'Sign-in with a forged token', other: 'Sign-in with another buyer’s token', stale: 'Sign-in with an old token' };
export type RefusalRow = { label: string; n: number };
export type RecentRefusal = { label: string; who: string; at: number };
export function refusals(x: AdminExposure | null): { counts: RefusalRow[]; recent: RecentRefusal[]; read: boolean } {
  if (!x || (!x.bidRefusals && !x.tokenRefusals)) return { counts: [], recent: [], read: false };
  const counts = [
    ...Object.entries(x.bidRefusals?.byReason ?? {}).map(([k, n]) => ({ label: BID_REASON[k] ?? k, n })),
    ...Object.entries(x.tokenRefusals?.byPresented ?? {}).map(([k, n]) => ({ label: TOKEN_PRESENTED[k] ?? k, n })),
  ].sort((a, b) => b.n - a.n);
  const recent = [
    ...(x.bidRefusals?.recent ?? []).map(r => ({ label: BID_REASON[r.reason] ?? r.reason, who: `${r.who} on ${r.lotId}`, at: r.at })),
    ...(x.tokenRefusals?.recent ?? []).map(r => ({ label: TOKEN_PRESENTED[r.presented] ?? r.presented, who: `${r.claimed}${r.known ? '' : ', unknown id'}`, at: r.at })),
  ].sort((a, b) => b.at - a.at).slice(0, 10);
  return { counts, recent, read: true };
}

/* ---------- the money list's words ---------- */
/** A money event's type as a word the owner already uses. */
export function typeWord(e: Pick<MoneyEvent, 'type' | 'kind'>): string {
  const t = e.type;
  if (t === 'payment.succeeded') return e.kind === 'deposit' ? 'Deposit in' : e.kind === 'balance' ? 'Balance in' : 'Paid in';
  if (t === 'payment.failed') return 'Payment failed';
  if (t.startsWith('refund.')) return 'Refunded';
  if (t.startsWith('dispute.')) return 'Disputed';
  if (t.startsWith('transfer.')) return 'Sent to dealer';
  if (t === 'payout.paid' || t === 'payout.by_hand') return 'Paid by hand';
  if (t === 'deposit.forfeited' || t === 'forfeit') return 'Forfeited';
  if (t === 'deposit.released' || t === 'release') return 'Released';
  return t || 'Unknown';
}
