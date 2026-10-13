/* The Desk's side of the auction: the Worker's dealer routes, the dealer's
   key, which cars are on the lane, and the arithmetic the Floor screen shows.
   With no VITE_AUCTION_API the module is inert and every call says so. */
import type { DealerConfig, Fees } from './config';
import type { Vehicle } from './sale';
import { payByWords } from '../../../auction/src/engine/time';
import { outTheDoor } from '../../../auction/src/engine/money';

export const AUCTION_API = (import.meta.env.VITE_AUCTION_API ?? '').replace(/\/$/, '');
export const auctionLive = !!AUCTION_API;

const KEY = 'obavia.desk.auction.key';
const LOTS = 'obavia.desk.auction.lots';
export const dealerKey = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (k: string) => { try { localStorage.setItem(KEY, k.trim()); } catch { /* private mode */ } },
};

/** A dealer key's shape: d:<who>.<signature>. The paste field and the link take the same shape. */
export const KEY_SHAPE = /^d:[^.]+\.[A-Za-z0-9_-]+$/;

/* ---------- Open The Desk (legibility audit D2) ----------
   The application's key screen links to the Desk with the key in the fragment:
   <desk>#/auction/setup?key=<token>. A fragment is never sent to a server, so the key is in no
   request line or server log. Read once, before the first render: the key is kept exactly as a
   pasted key is kept (dealerKey.set), then replaceState takes it out of the address bar and out of
   this tab's history entry, and the Desk lands on Let It Go. A link with no usable key lands on the
   key page, where the paste field is the fallback. Returns null when the address is not such a link. */
let arrived = false;
type Loc = Pick<Location, 'hash' | 'pathname' | 'search'>;
type Hist = Pick<History, 'replaceState' | 'state'>;
export function takeKeyFromLink(loc: Loc = location, hist: Hist = history): 'kept' | 'bad' | null {
  const m = /^#\/auction\/setup\?(.*)$/.exec(loc.hash);
  if (!m) return null;
  const k = (new URLSearchParams(m[1]).get('key') ?? '').trim();
  const ok = KEY_SHAPE.test(k);
  if (ok) { dealerKey.set(k); arrived = true; }
  hist.replaceState(hist.state, '', `${loc.pathname}${loc.search}${ok ? '#/auction/go' : '#/auction/setup'}`);
  return ok ? 'kept' : 'bad';
}
/** True once, on the first Let It Go after the link kept a key: that screen plays the landed moment. */
export function takeArrival() { const a = arrived; arrived = false; return a; }

/** The lane as the Desk remembers it: one lot per car it let go. */
export type LotLink = { lotId: string; vehicleId: string; openedAt: string; closesAt: number; floor: number; days: number;
  soldOn?: string;      // the hammer's date in the dealer's zone: the lane title and tax clocks run from it
  unwound?: boolean;    // voided or forfeited: no sale, no clock
  unsold?: boolean;     // closed with no bids: the car is still the dealer's
  titleTo?: string;     // the day title reached the buyer
  taxSent?: string;     // the day the tax went to the county
};
export function lotLinks(): LotLink[] { try { return JSON.parse(localStorage.getItem(LOTS) ?? '[]'); } catch { return []; } }
export function rememberLot(l: LotLink) { const all = lotLinks().filter(x => x.lotId !== l.lotId); try { localStorage.setItem(LOTS, JSON.stringify([l, ...all])); } catch { /* ignore */ } }
/** A lot the car has left: unwound (voided, forfeited) or unsold (closed, no bids). The car may go again. */
export const relistable = (l: Pick<LotLink, 'unwound' | 'unsold'>) => !!l.unwound || !!l.unsold;
/** The cars on the lane now: every remembered lot the car has not left. Let It Go keeps these out of "Which car goes?". */
export const onLane = (links: LotLink[] = lotLinks()) => new Set(links.filter(l => !relistable(l)).map(l => l.vehicleId));

/* ---------- what the Worker holds ---------- */
export type RemotePhoto = { url: string; w: number; h: number };
export type CarMeta = {
  year: number; make: string; model: string; miles: number; vin: string;
  photos: RemotePhoto[];
  grade: [number, number, number, number, number, number];
  title: 'in hand' | 'at lender';
  dealer: { name: string; city: string; street: string; gdn: string; phone: string; afterHours: string; fees: Pick<Fees, 'taxRate' | 'title' | 'registration' | 'doc' | 'plate' | 'database'> };
  documents?: { guide?: string; bill?: string; title?: string };
  hours?: string[];
  collateral: Collateral;
};
/** What the dealer puts behind the lot. The lane refuses without it. docs/plan/collateral.md. */
export type Collateral = {
  title: { status: 'hand' | 'lender' | 'repo' | 'unknown'; lienholder?: string; payoff?: number; releaseDays?: number };
  floor: number;
  payoffAcknowledged?: boolean;
  insured: boolean;
};
/** The lender's release leaves a week for the county: title reaches the buyer before day 21 on a lane sale
    (Transp. Code §503.039(b), read 2026-10-13; decisions §9 D2). The engine's meta.ts holds the same line. */
export const RELEASE_MAX_DAYS = 14;
/** The refusals in the dealer's words (DOCTRINE §4.7: four words or fewer). Every reason the Worker gives
    a dealer route (auction/worker/README.md, the routes table) is here; anything not here prints as the lane's own reason. */
export const SAID: Record<string, string> = {
  'release past day 14': 'Release must land inside 14 days so title reaches the buyer before day 21.',
  /* the Desk's own */
  offline: 'Lane out of reach.', 'no key': 'Paste your key first.', 'lane settings missing': 'Set the after-hours line.',
  /* /open */
  'collateral missing': 'The lane needs collateral.', 'title in repossession': 'Finish the repossession first.', 'title location unknown': 'Say where the title is.',
  'lender release time missing': 'Say the release days.', 'floor below payoff without acknowledgement': 'Say you bring it.', 'not insured': 'Insure it first.',
  'already open': 'Already on the lane.', sale_exists: 'This lot already sold.', 'dealer suspended': 'Lane closed to you.', not_your_lot: 'Not your lot.',
  /* /car */
  'bids placed': 'Bids placed. Floor stays.', 'floor only lowers': 'The floor only lowers.', 'no lot': 'No such lot.',
  /* /close */
  closed: 'Already closed.', soft_close: 'Last two minutes. Wait.',
  /* /paid, /pickup, /void, /forfeit */
  'no sale': 'There is no sale.', sale_voided: 'This sale was voided.', sale_forfeited: 'The buyer walked.', 'no sale to void': 'Nothing to void now.',
  already_started: 'Already picked up.', vin_required: 'Type the six.', not_paid: 'Mark it paid first.', vin_unknown: 'No VIN on file.', 'wrong car': 'Not this car.',
  before_deadline: 'Wait for the deadline.', already_forfeited: 'Already forfeited.', sale_started: 'Already picked up.', sale_paid: 'Already paid.',
  /* the payout and the account */
  no_payout: 'No payout on this.', wrong_payout: 'Not this payout.', payout_settled: 'Payout already settled.', already_paid: 'Already paid.', not_held: 'No deposit was held.',
  account_exists: 'Already connected.', bad_email: 'Check the email.', whop_refused: 'Whop said no.', whop_bad_account: 'Whop gave no account.', whop_unavailable: 'Whop is not connected.', account_from_whop_only: 'Whop sets the account.',
  no_such_dealer: 'Unknown dealer key.', 'dealer only': 'Dealer key only.', 'admin only': 'Admin only.',
  /* a buyer's refusals, should Live ever show one */
  too_many_bids: 'Too many bids. Wait.', one_open_bid: 'One open bid.', low: 'Under the high bid.', outbid: 'Outbid.', seller_cannot_bid: 'Seller cannot bid.',
};
export const said = (reason: string) => SAID[reason] ?? reason;
/** The release days alone, for the page that asks them. */
export const releaseRefusal = (days: number) => (days > RELEASE_MAX_DAYS ? 'release past day 14' : null);
/** The same refusals the Worker gives at /open, so the Desk never sends a lot the lane will bounce. */
export function collateralRefusal(c: Collateral | undefined): string | null {
  if (!c) return 'collateral missing';
  if (c.title.status === 'repo') return 'title in repossession';
  if (c.title.status === 'unknown') return 'title location unknown';
  if (c.title.status === 'lender' && !((c.title.releaseDays ?? 0) > 0)) return 'lender release time missing';
  if (c.title.status === 'lender') { const r = releaseRefusal(c.title.releaseDays ?? 0); if (r) return r; }
  if ((c.title.payoff ?? 0) > c.floor && !c.payoffAcknowledged) return 'floor below payoff without acknowledgement';
  if (!c.insured) return 'not insured';
  return null;
}
export type Lot = {
  id: string; start: number; retail: number; opensAt: number; closesAt: number;
  high: number; leader?: string; bids: number; watching: number;
  closed?: { at: number; sold: boolean };
  car?: CarMeta;
  sale?: { buyer: string; hammer: number; wonAt: number; deadlineAt: number; paidAt?: number; startedAt?: number; forfeitedAt?: number; voidedAt?: number; deposit?: 'held' | 'applied' | 'to_dealer' | 'released';
    payout?: Payout;      // the dealer's $250 on an applied or forfeited sale (worker/src/auction.ts LotPayout)
    contact?: Contact };  // the winner, only on what this lot's dealer key reads (index.ts withContact)
};
/** The dealer's $250: owed until Whop sends it or the owner pays it by hand. */
export type Payout = { state: 'owed' | 'sent' | 'paid'; transferId?: string; method?: 'wire' | 'check' | 'cash'; at?: number };
/** The winner for the desk person's one call within the hour (CF9). Null name: the Worker has none; the glass says "Buyer". */
export type Contact = { name: string | null; phone: string | null };
/** The deadline in the words every surface uses (CP9): the Worker's push, the phone's Won page and the Desk's Sold row share this one function. */
export const payBy = (deadlineAt: number) => payByWords(deadlineAt);
/** The deposit's words on the Sold page, from the sale's payout state. Before a payout exists Obavia holds it for the buyer. */
export function depositWords(s: { deposit?: string; payout?: Payout }): string {
  const p = s.payout;
  if (p?.state === 'paid') return `Paid by ${p.method ?? 'hand'}`;
  if (p?.state === 'sent') return 'Sent';
  if (p?.state === 'owed' || s.deposit === 'applied' || s.deposit === 'to_dealer') return 'Obavia owes you';
  return s.deposit === 'released' ? 'Released to the buyer' : 'Held by Obavia for the buyer';
}
/** What the buyer brings to the lot: the out-the-door total less the $250 deposit, the Worker's own balance (auction.ts balance()). */
export const DEPOSIT_USD = 250;
export const collect = (hammer: number, fees: Fees) => Math.max(0, outTheDoor(hammer, fees).total - DEPOSIT_USD);
/** A phone the Worker proved, as the desk person dials it: (214) 555-0142. */
export const dial = (e164: string) => { const d = e164.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164; };

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
async function call<T>(method: string, path: string, body?: BodyInit | object, type?: string): Promise<Result<T>> {
  const key = dealerKey.get();
  if (!auctionLive) return { ok: false, reason: 'offline' };
  if (!key) return { ok: false, reason: 'no key' };
  try {
    const isJson = body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body === 'object';
    const r = await fetch(`${AUCTION_API}${path}`, { method, headers: { Authorization: `Bearer ${key}`, ...(type ? { 'Content-Type': type } : isJson ? { 'Content-Type': 'application/json' } : {}) }, body: isJson ? JSON.stringify(body) : (body as BodyInit | undefined) });
    if (!r.ok) return { ok: false, reason: (await r.text()) || `http ${r.status}` };
    return { ok: true, value: await r.json() as T };
  } catch { return { ok: false, reason: 'offline' }; }
}

export const lotId = (v: Vehicle) => `${v.vin.slice(-8).toLowerCase()}-${Date.now().toString(36).slice(-4)}`;

/** Photos first (so the lane photo exists at Go), then the lot opens with them. */
export const putPhoto = (lot: string, n: number, blob: Blob) => call<{ url: string }>('PUT', `/lots/${lot}/photos/${n}.jpg`, blob, 'image/jpeg');
export const putDocument = (lot: string, name: string, pdf: Uint8Array) => call<{ url: string }>('PUT', `/lots/${lot}/documents/${name}.pdf`, new Blob([pdf.slice()], { type: 'application/pdf' }), 'application/pdf');
export const openLot = (lot: string, body: { id: string; dealer: string; start: number; retail: number; closesAt: number; car: CarMeta }) => call<Lot>('POST', `/lots/${lot}/open`, body);
export const updateCar = (lot: string, patch: Partial<CarMeta>) => call<Lot>('POST', `/lots/${lot}/car`, patch);
export const closeLot = (lot: string) => call<Lot>('POST', `/lots/${lot}/close`, {});
export const markPaid = (lot: string) => call<Lot>('POST', `/lots/${lot}/paid`, {});
export const pickup = (lot: string, vin: string) => call<Lot>('POST', `/lots/${lot}/pickup`, { vin });
export const voidSale = (lot: string, reason: string) => call<Lot>('POST', `/lots/${lot}/void`, { reason });
/* ---------- the owner's routes (admin key only) ---------- */
/** The master key is minted for GDN "*": `d:*.<sig>`. Every other key is one dealer's. */
export const isAdminKey = (k: string | null = dealerKey.get()) => !!k && k.trim().startsWith('d:*.');
export type DealerRow = { gdn: string; name: string; created_at: number; suspended_at: number | null; suspended: boolean; incidents: number };
export type SaleState = 'owed' | 'paid' | 'started' | 'forfeited' | 'voided';
export type Exposure = {
  deposits: { heldCount: number; heldUsd: number; byStatus: Record<string, number>; reserveRatio: number };
  lots: { open: number; atLender: number; floorBelowPayoff: number };
  sales: { lotId: string; dealer?: string; state: SaleState; deposit?: string; hammer: number; deadlineAt: number }[];
  incidentsByDealer: Record<string, number>;
  dealers: DealerRow[];
  obaviaFeesOwed: number;
};
export const getExposure = () => call<Exposure>('GET', '/admin/exposure');
export const listDealers = () => call<DealerRow[]>('GET', '/dealers');
export const suspendDealer = (gdn: string) => call<DealerRow>('POST', `/dealers/${encodeURIComponent(gdn)}/suspend`, {});
export const restoreDealer = (gdn: string) => call<DealerRow>('POST', `/dealers/${encodeURIComponent(gdn)}/restore`, {});
export const mintDealer = (gdn: string, name: string) => call<{ token: string }>('POST', '/dealers', { gdn, name });
/** The dealer's settings row: Connected or Not yet, and the $250s owed. The dealer's own key only (the admin key is 403). */
export const getMe = () => call<{ gdn: string; name: string; whopAccount: string | null; payoutsOwed: number }>('GET', '/dealers/me');
/** The lot, read with the dealer key when there is one: the key brings `sale.contact` (the winner's name and number) on the dealer's own lot. */
export async function getLot(lot: string): Promise<Result<Lot>> {
  if (!auctionLive) return { ok: false, reason: 'offline' };
  const key = dealerKey.get();
  try { const r = await fetch(`${AUCTION_API}/lots/${lot}`, key ? { headers: { Authorization: `Bearer ${key}` } } : undefined); return r.ok ? { ok: true, value: await r.json() as Lot } : { ok: false, reason: `http ${r.status}` }; } catch { return { ok: false, reason: 'offline' }; }
}

/** Polling only after the socket fails, and then slowly: the socket carries every bid; a poll is the fallback, not the lane. */
export const POLL_MS = 15_000;
/** The live lane over the Worker's socket (the lot's dealer key is admitted: index.ts /lots/:id/live). The socket first and
    alone; polling every 15 s starts only when the socket cannot open, errors, or closes without the watcher asking. */
export function watchLot(lot: string, onLot: (l: Lot) => void): () => void {
  if (!auctionLive) return () => {};
  let ws: WebSocket | undefined, timer: ReturnType<typeof setInterval> | undefined, stopped = false;
  const poll = () => {
    if (stopped || timer) return;
    timer = setInterval(async () => { if (stopped) return; const r = await getLot(lot); if (r.ok) onLot(r.value); }, POLL_MS);
  };
  const key = dealerKey.get();
  try {
    ws = new WebSocket(`${AUCTION_API.replace(/^http/, 'ws')}/lots/${lot}/live?token=${encodeURIComponent(key ?? '')}`);
    ws.onmessage = m => { try { const e = JSON.parse(String(m.data)); if (e.lot) onLot(e.lot); } catch { /* ignore */ } };
    ws.onerror = () => { poll(); try { ws?.close(); } catch { /* closed */ } };
    ws.onclose = () => { poll(); };
  } catch { poll(); }
  return () => { stopped = true; if (timer) clearInterval(timer); if (ws) { ws.onclose = null; ws.onerror = null; try { ws.close(); } catch { /* closed */ } } };
}

/* ---------- the Floor's arithmetic ---------- */
/** What the lane would likely pay: a band under retail, narrowed by condition. An estimate until the lane has its own history. */
export function wholesaleBand(retail: number, grade: number[]): { low: number; high: number } {
  const g = grade.reduce((a, b) => a + b, 0) / Math.max(1, grade.length);   // 0..1
  const mid = retail * (0.62 + 0.16 * g);
  return { low: Math.round(mid * 0.94 / 50) * 50, high: Math.round(mid * 1.06 / 50) * 50 };
}
/** What one more day on the lot costs on this car: floorplan interest and fees plus the value it loses, about 0.1% of
    the car's value per day (AFC 10-K 18.1% all-in; Manheim index; docs/plan/research/holding-cost.md). The old flat
    $35 a day was a dealership's whole overhead spread over every car, not the marginal cost of one. */
export const HOLDING_RATE_PER_DAY = 0.001;
export const holdingCost = (days: number, value: number, rate = HOLDING_RATE_PER_DAY) => Math.round(days * value * rate);
/** The floor is the net the dealer walks away with; the hammer the buyer sees is the floor plus nothing (zero premium). */
export function youGetYouBring(floor: number, payoff: number) {
  const net = floor - payoff;
  return net >= 0 ? { get: net, bring: 0 } : { get: 0, bring: -net };
}

/** The car as the lane needs it, from the Desk's vehicle and dealer. */
/** The car as the lane needs it, from the Desk's vehicle and dealer. `afterHours`, `hours` and `address` come from the dealer's
    lane settings (dealer-settings.ts lotFields); the address falls back to the dealer's own lot. */
export function carMeta(v: Vehicle, dealer: DealerConfig, photos: RemotePhoto[], grade: CarMeta['grade'], collateral: Collateral, afterHours: string, hours: string[], address?: string): CarMeta {
  return {
    year: v.year, make: v.make, model: v.model, miles: v.mileage ?? 0, vin: v.vin, photos, grade,
    title: collateral.title.status === 'hand' ? 'in hand' : 'at lender',
    dealer: { name: dealer.dba || dealer.legalName, city: dealer.city, street: address?.trim() || `${dealer.street}, ${dealer.city}, ${dealer.state} ${dealer.zip}`, gdn: dealer.licence, phone: dealer.phone, afterHours: afterHours || dealer.phone, fees: dealer.fees },
    hours, collateral,
  };
}

/** A data URL (from shrink) as the JPEG bytes the Worker takes, with its size. */
export async function photoBlob(dataUrl: string): Promise<{ blob: Blob; w: number; h: number }> {
  const blob = await (await fetch(dataUrl)).blob();
  const { w, h } = await new Promise<{ w: number; h: number }>((res, rej) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = rej; i.src = dataUrl; });
  return { blob, w, h };
}

/** m:ss, or the days and hours when the close is far. */
export function timeLeft(closesAt: number, now = Date.now()) {
  const s = Math.max(0, Math.round((closesAt - now) / 1000));
  if (s >= 86_400) return `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h`;
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
