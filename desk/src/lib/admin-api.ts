/* Every admin call the Desk makes, in one file, typed (the owner's cockpit, #/auction/admin).
   The routes are the Worker's (auction/worker/src/index.ts, README "Routes"). Four are new in
   Wave 1-B and are coded here against the shapes below; until the Worker carries one, its 404
   reads as NOT_YET and the page says "Not yet", never an error.

     GET  /admin/money               -> Money (events newest first, payouts owed and paid, sales with the buyer)
     POST /admin/payouts/:id/paid    { method: 'wire' | 'check' | 'cash', note } -> Payout
     POST /admin/buyers/:id/release  { reason, lotId? } -> { id, deposit: 'refunded' }
     POST /admin/lots/:id/forfeit    { reason } -> the lot
     GET  /admin/reconcile?n=        -> Streak (the nightly rows newest first and "equal seven nights running")

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
/** One field of one lot where the D1 copy and the object disagreed (auction/worker/src/reconcile.ts Difference);
 *  `field: 'object'` with `object: null` when the object is gone. */
export type Difference = { lot: string; field: string; copy: unknown; object: unknown };
/** One nightly row as GET /admin/reconcile gives it: `equal` is a boolean here. */
export type Night = {
  id: string; ranAt: number; equal: boolean; lotsChecked: number; lotsDiffering: number; differing: string[]; differences: Difference[];
  depositsHeld: number; payoutsOwed: number; payoutsOwedCents: number; whopBalanceCents: number | null; reserveRatio: number | null; note: string;
};
/** The streak: `equalNights` counts nights running from the latest that said equal (0 when the latest did not);
 *  `sevenEqual` is the Phase 2 Server exit (phases.md: "the nightly report says equal seven nights running"). */
export type Streak = { equalNights: number; sevenEqual: boolean; latest: { id: string; ranAt: number; equal: boolean } | null; nights: Night[] };
export type BidRefusal = { lotId: string; who: string; reason: string; matched: string | null; at: number };
export type TokenRefusal = { claimed: string; reason: string; presented: string; known: number; at: number };
export type ExposureSale = { lotId: string; dealer?: string; state: SaleState; deposit?: string; hammer: number; deadlineAt: number };
/** One closed lot and the distinct buyers whose bid was placed on it (led, or beaten by a standing ceiling). */
export type ClosedLotBidders = { lotId: string; dealer: string; closedAt: number; sold: boolean; bidders: number };
/** A VIN scan the lane refused at pickup: `presented` is the last six scanned, null when nothing was. */
export type PickupRefusal = { lotId: string; dealer: string; reason: string; presented: string | null; at: number };
export type AdminExposure = {
  /** reserveRatio is null when the Whop balance was not read: the page says "Not read", never 1.00.
   *  reserveReadAt is when the last reconciliation read that balance, null when none did. */
  deposits: { heldCount: number; heldUsd: number; byStatus: Record<string, number>; reserveRatio: number | null; reserveReadAt?: number | null };
  /** Every closed lot, newest first (the Worker keeps 500). Absent on a Worker before migration 0013. */
  bidders?: ClosedLotBidders[];
  /** The last 20 pickup refusals, newest first. */
  pickupRefusals?: PickupRefusal[];
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
    /** The nightly rows and the streak. `n` (1 to 100) trims the rows, never the streak. */
    streak: async (n = 7): Promise<Result<Streak>> => { const r = await call<unknown>('GET', `/admin/reconcile?n=${Math.max(1, Math.min(Math.round(n) || 7, 100))}`); return r.ok ? { ok: true, value: readStreak(r.value) } : r; },
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
/** The streak answer, read defensively: a missing list is empty, the streak is never guessed above what the rows say. */
export function readStreak(raw: unknown): Streak {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') as Record<string, unknown>[] : []);
  const nights: Night[] = list(o.nights).map(r => ({
    id: String(r.id ?? ''), ranAt: num(r.ranAt) ?? 0, equal: r.equal === true || r.equal === 1, lotsChecked: num(r.lotsChecked) ?? 0, lotsDiffering: num(r.lotsDiffering) ?? 0,
    differing: Array.isArray(r.differing) ? r.differing.map(String) : [],
    differences: list(r.differences).map(d => ({ lot: String(d.lot ?? ''), field: String(d.field ?? ''), copy: d.copy ?? null, object: d.object ?? null })),
    depositsHeld: num(r.depositsHeld) ?? 0, payoutsOwed: num(r.payoutsOwed) ?? 0, payoutsOwedCents: num(r.payoutsOwedCents) ?? 0,
    whopBalanceCents: num(r.whopBalanceCents), reserveRatio: num(r.reserveRatio), note: String(r.note ?? ''),
  })).sort((a, b) => b.ranAt - a.ranAt);
  const l = (o.latest && typeof o.latest === 'object' ? o.latest : null) as Record<string, unknown> | null;
  const latest = l ? { id: String(l.id ?? ''), ranAt: num(l.ranAt) ?? 0, equal: l.equal === true || l.equal === 1 } : nights[0] ? { id: nights[0].id, ranAt: nights[0].ranAt, equal: nights[0].equal } : null;
  // the Worker's streak stands; without it, count from the rows given (never more than they show)
  let fromRows = 0; for (const n of nights) { if (!n.equal) break; fromRows += 1; }
  const equalNights = Math.max(0, Math.floor(num(o.equalNights) ?? fromRows));
  return { equalNights, sevenEqual: o.sevenEqual === true || equalNights >= 7, latest, nights };
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
/** One decimal place, rounded down (CF1: the shown average never flatters the week). 2.67 is 2.6, 3 is 3. */
const oneDown = (x: number) => { const v = Math.floor(x * 10 + 1e-9) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); };
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

  // D counts the ledger's deposit.captured: the verify path and the webhook both write it, once per payment
  // (README, the deposit ledger). payment.succeeded is Whop's news and also fires for balances and duplicates.
  let D: Number5;
  const deposits = money?.events.filter(e => e.type === 'deposit.captured') ?? null;
  if (!deposits) D = { k: 'D', label: 'Deposits captured', value: null, shown: 'Not yet', floor: f?.D ?? null, floorShown: '', from: 'Needs the money list' };
  else {
    const n = deposits.filter(e => inWeek(e.at)).length, cum = deposits.filter(e => e.at < w.end).length;
    D = { k: 'D', label: 'Deposits captured', value: n, shown: `${n} (${cum})`, floor: f?.D ?? null, floorShown: f ? `${f.D} (${f.Dcum})` : '', from: 'This week, from money events' };
  }

  // B: distinct bidders per lot closed this week, averaged (exposure.bidders, from the D1 bids).
  let B: Number5;
  const closedB = x?.bidders?.filter(b => inWeek(b.closedAt)) ?? null;
  if (!closedB || !closedB.length) B = { k: 'B', label: 'Bidders per closed lot', value: null, shown: 'Not yet', floor: f?.B ?? null, floorShown: '', from: !x ? 'The exposure did not answer' : !x.bidders ? 'The lane does not count bidders yet' : 'No lot closed this week' };
  else {
    const v = closedB.reduce((a, b) => a + b.bidders, 0) / closedB.length;
    B = { k: 'B', label: 'Bidders per closed lot', value: v, shown: oneDown(v), floor: f?.B ?? null, floorShown: '', from: `${closedB.length} closed this week` };
  }

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

/* ---------- the streak: the number touching "nights equal", the gate, the differences ---------- */
/** The Phase 2 Server exit (phases.md): seven nights running. */
export const GATE_NIGHTS = 7;
/** One cell of the differences list: four words or fewer, no sentence. */
export type DiffCell = { lot: string; field: string; copy: string; object: string };
export type StreakRow = { n: number | null; met: boolean; gate: string; differences: DiffCell[] };
/** The field of a lot the reconciliation compares, as the desk says it. */
export const FIELD_WORD: Record<string, string> = { high: 'High bid', bids: 'Bids', closesAt: 'Closes', leader: 'Leader', closed: 'Closed', sale: 'Sale', object: 'Object' };
const shortWhen = (t: number) => new Date(t).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
/** A copy's or an object's value as four words or fewer. */
export function diffWord(field: string, v: unknown): string {
  if (v == null) return field === 'object' ? 'Gone' : field === 'leader' ? 'Nobody' : field === 'closed' ? 'Open' : field === 'sale' ? 'No sale' : 'None';
  if (field === 'object') return 'Copy kept';
  if (field === 'closesAt' && typeof v === 'number') return shortWhen(v);
  if (field === 'high' && typeof v === 'number') return `$${v.toLocaleString('en-US')}`;
  if (field === 'closed' && typeof v === 'object') return (v as { sold?: boolean }).sold ? 'Sold' : 'Not sold';
  if (field === 'sale' && typeof v === 'object') {
    const s = v as { voidedAt?: number; forfeitedAt?: number; startedAt?: number; paidAt?: number; buyer?: string };
    const state = s.voidedAt ? 'voided' : s.forfeitedAt ? 'forfeited' : s.startedAt ? 'started' : s.paidAt ? 'paid' : 'owed';
    return s.buyer ? `${state}, ${s.buyer}` : state;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return v.length > 24 ? `${v.slice(0, 23)}…` : v;
  const j = JSON.stringify(v); return j.length > 24 ? `${j.slice(0, 23)}…` : j;
}
/** The row on the admin home: the streak, the gate, and the latest night's differences when it was not equal. */
export function streakRow(s: Streak | null): StreakRow {
  if (!s) return { n: null, met: false, gate: 'Not read', differences: [] };
  if (!s.latest) return { n: 0, met: false, gate: 'Never reconciled', differences: [] };
  const met = s.sevenEqual || s.equalNights >= GATE_NIGHTS;
  const latest = s.nights.find(n => n.id === s.latest!.id) ?? s.nights[0];
  const differences = !s.latest.equal && latest ? latest.differences.map(d => ({ lot: d.lot, field: FIELD_WORD[d.field] ?? d.field, copy: diffWord(d.field, d.copy), object: diffWord(d.field, d.object) })) : [];
  return { n: s.equalNights, met, gate: met ? 'Phase 2 Server exit, met' : `Phase 2 Server exit at ${GATE_NIGHTS}`, differences };
}

/* ---------- the refusals ---------- */
export const BID_REASON: Record<string, string> = {
  seller_cannot_bid: 'Seller bid on own car', not_a_buyer: 'A Desk key tried to bid', win_cap: 'A fifth win this year',
  too_many_bids: 'Twenty-one bids a minute', one_open_bid: 'A second open bid',
};
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

/* ---------- the reserve's read time ---------- */
/** The line under the reserve ratio: when the Whop balance behind it was read. */
export function reserveLine(x: AdminExposure | null): string {
  if (!x) return 'Not read';
  const at = x.deposits.reserveReadAt;
  return at == null ? 'Never read' : `Read ${when(at)}`;
}

/* ---------- disputed deposits ---------- */
/** Deposits a buyer disputed with the card issuer: the count from the exposure, the buyers from the money events. */
export function disputedDeposits(x: AdminExposure | null, money: Money | null): { n: number | null; buyers: string[] } {
  const n = x ? x.deposits.byStatus.disputed ?? 0 : null;
  const buyers = [...new Set((money?.events ?? []).filter(e => e.type === 'deposit.disputed' && e.buyer).map(e => e.buyer!))];
  return { n, buyers };
}

/* ---------- pickup refusals ---------- */
/** The Worker's pickup refusal reasons (auction/worker/src/auction.ts POST /pickup), as the desk says them. */
export const PICKUP_REASON: Record<string, string> = {
  'wrong car': 'Wrong car', vin_required: 'VIN not read', not_paid: 'Not paid yet', vin_unknown: 'No VIN on the lot',
  already_started: 'Already picked up', sale_voided: 'Sale voided', sale_forfeited: 'Sale forfeited', 'no sale': 'No sale',
};
export type PickupRow = { label: string; lotId: string; dealer: string; six: string; at: number };
export function pickupRefusals(x: AdminExposure | null): { rows: PickupRow[]; read: boolean } {
  if (!x?.pickupRefusals) return { rows: [], read: false };
  const rows = [...x.pickupRefusals].sort((a, b) => b.at - a.at).slice(0, 20)
    .map(r => ({ label: PICKUP_REASON[r.reason] ?? r.reason, lotId: r.lotId, dealer: r.dealer, six: r.presented ? `scanned ${r.presented}` : 'nothing scanned', at: r.at }));
  return { rows, read: true };
}

/* ---------- the money list's words ---------- */
/** Every type the Worker writes to money_events (README, the deposit ledger and the sale), one desk word each. */
export const EVENT_WORD: Record<string, string> = {
  'deposit.captured': 'Deposit held', 'deposit.released': 'Deposit back', 'deposit.applied': 'Deposit to the dealer',
  'deposit.duplicate': 'Second deposit refused', 'deposit.disputed': 'Deposit disputed', 'deposit.refund_conflict': 'Refund conflict',
  'deposit.forfeited': 'Forfeited',
  'payout.sent': 'Payout sent', 'payout.by_hand': 'Paid by hand', 'payout.paid': 'Paid by hand', 'balance.paid_at_lot': 'Paid at the lot',
  'admin.forfeit': 'Forfeited by admin', 'admin.release': 'Released by admin', 'admin.paid': 'Paid by hand', 'dealer.account': 'Dealer account',
};
/** A money event's type as a word the owner already uses. */
export function typeWord(e: Pick<MoneyEvent, 'type' | 'kind'>): string {
  const t = e.type;
  if (EVENT_WORD[t]) return EVENT_WORD[t];
  if (t === 'payment.succeeded') return e.kind === 'deposit' ? 'Deposit in' : e.kind === 'balance' ? 'Balance in' : 'Paid in';
  if (t === 'payment.failed') return 'Payment failed';
  if (t.startsWith('refund.')) return 'Refunded';
  if (t.startsWith('dispute.')) return 'Disputed';
  if (t.startsWith('transfer.')) return 'Sent to dealer';
  if (t === 'forfeit') return 'Forfeited';
  if (t === 'release') return 'Released';
  return t || 'Unknown';
}
