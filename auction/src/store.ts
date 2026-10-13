/* The app's one connection to the auction. With EXPO_PUBLIC_AUCTION_URL set
   it is the Worker and its Durable Objects (worker/); without it, a local
   stand-in with the same surface, so the screens never know which. */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { carFromLot, cars as seeded, seedLots, type Car } from './data/cars';
import { RemoteAuctionServer, Refused, TERMS_VERSION, type PhoneAnswer, type Profile, type Session } from './engine/client';
import { LocalAuctionServer, type Ack, type BidRequest, type Event, type Lot } from './engine/server';
import { depositStanding, type DepositStanding } from './depositLine';
import { kv } from './kv';
import { go, isScreen, peekIntent, subscribeIntent, type Intent, type Screen } from './nav';
import type { Licence } from './sale';

export const DEPOSIT = 250;
export const AUCTION_URL = (process.env.EXPO_PUBLIC_AUCTION_URL ?? '').replace(/\/$/, '');

/** The buyer's id on the server; locally, just "me". */
export let ME = 'me';
let token: string | null = null;
export const buyerToken = () => token;

export type AuctionServer = {
  subscribe(fn: (e: Event) => void): () => void;
  get(id: string): Lot; all(): Lot[];
  bid(req: BidRequest): Promise<Ack>;
};

/* Where the buyer's id and token live: secure storage on a phone, localStorage on the web (./kv). */
const SESSION_KEY = 'obavia.buyer', PROFILE_KEY = 'obavia.profile', OPENED_KEY = 'obavia.opened';
function readJSON<T>(k: string): T | null { try { const v = kv.get(k); return v ? JSON.parse(v) as T : null; } catch { return null; } }

/** D15 (decisions §9): four wins a calendar year. The Worker's number decides; this is the local stand-in's. */
export const WINS_PER_YEAR = 4;

/** The buyer as the Worker last read them. `lost`: the stored token was refused (rotated or bumped away);
    nothing here makes a new buyer to replace it. `termsCurrent` false: the next bid is the first under the terms.
    `phone`: the verified number as its last four, the only form the phone ever holds; `phoneVerified` false or
    unknown: the next Bid opens the Phone page first. `name`: the licence read's name or the one the buyer typed
    on Me; absent until one of the two, and then the Worker holds none and the Desk shows "Buyer". */
export type Buyer = {
  lost: boolean; winsLeft?: number; winsPerYear: number; termsCurrent?: boolean; phone?: string | null; phoneVerified?: boolean; name?: string;
  /** sim 03 (worker/README.md, Who may bid): `openBids` is the lots led plus the sales owed, what the one-open-bid
      gate counts; `paidCars` lifts that gate for good. From GET /me, and the gate's own 409 updates `openBids`. */
  openBids?: number; paidCars?: number;
  /** Where the $250 stands, in the Worker's word (GET /me `deposit_status`, through depositStanding): held, applied
      (it went to the car at the engine start), released, forfeited, disputed, none. Absent on the local stand-in and
      until the first GET /me; Me then reads `once.deposit` and its own sale. `once.deposit` stays the bid path's flag. */
  deposit?: DepositStanding;
};

/* The local stand-in's buyer (no Worker) wears a fixture name so the demo reads; `?name=none` previews the
   empty field, `?data=worst` the longest name break-ui uses. Never on the Worker's sign-in path. */
const query = () => (globalThis as { location?: { search?: string } }).location?.search ?? '';
const localName = () => (/[?&]name=none/.test(query()) ? undefined : /[?&]data=worst/.test(query()) ? 'Maximiliano Echeverría-Ortiz' : 'Marisol Treviño');
const savedName = () => readJSON<Profile>(PROFILE_KEY)?.name?.trim() || undefined;

let buyer: Buyer = { lost: false, winsPerYear: WINS_PER_YEAR, termsCurrent: AUCTION_URL ? undefined : false, name: savedName() ?? (AUCTION_URL ? undefined : localName()) };
const buyerSubs = new Set<() => void>();
export const peekBuyer = () => buyer;
export function setBuyer(patch: Partial<Buyer>) { buyer = { ...buyer, ...patch }; for (const f of buyerSubs) f(); }
export function useBuyer(): Buyer {
  return useSyncExternalStore(f => { buyerSubs.add(f); return () => { buyerSubs.delete(f); }; }, () => buyer, () => buyer);
}

function adopt(s: Session) { ME = s.id; token = s.token; kv.set(SESSION_KEY, JSON.stringify(s)); }

/** What sign-in sends: the state and whatever the buyer gave on this phone (a name from the licence read or
    typed on Me, a street, a phone). No name until there is one; client.ts drops empty fields. */
export function signInProfile(): Profile {
  return { state: 'TX', ...readJSON<Profile>(PROFILE_KEY) };
}

/** Sign-in at launch (worker/README.md, Buyer tokens): nothing stored, the profile alone and the Worker makes
    the buyer; stored, the token with the id. A refused token marks the buyer lost and stops there. */
async function signIn() {
  const stored = readJSON<Session>(SESSION_KEY);
  const profile = signInProfile();
  try {
    adopt(await RemoteAuctionServer.signIn(AUCTION_URL, stored, profile));
  } catch (e) {
    if (e instanceof Refused && e.code === 'not_yours') { token = null; setBuyer({ lost: true }); return; }
    if (!stored) return;          // no answer and nothing stored: no buyer yet; the next launch tries again
    adopt(stored);                // no answer: the stored token is still the one the Worker knows
  }
  await refreshMe();
}

/** GET /me into the store: the deposit, the wins left this year, whether the terms were accepted. */
export async function refreshMe(): Promise<void> {
  if (!AUCTION_URL || !token) return;
  const m = await RemoteAuctionServer.me(AUCTION_URL, token);
  if (!m) return;
  once.deposit = m.deposit_status === 'captured';
  setBuyer({
    winsLeft: m.winsLeft, winsPerYear: m.winsPerYear ?? WINS_PER_YEAR, termsCurrent: m.termsCurrent, phone: m.phone ?? null, phoneVerified: m.phoneVerified === true, name: m.name?.trim() || savedName(),
    deposit: depositStanding(m.deposit_status),
    ...(typeof m.openBids === 'number' ? { openBids: m.openBids } : {}), ...(typeof m.paidCars === 'number' ? { paidCars: m.paidCars } : {}),
  });
}

/** The number as the phone shows it once proved: the last four. The Worker's mask, made here for the stand-in. */
export const maskPhone = (e164: string) => `(•••) •••-${e164.replace(/\D/g, '').slice(-4)}`;

/** Sign-in by phone: a code to `e164` (+1 and ten digits). Locally the stand-in plays the Worker's fake: any
    number is sent, 000000 proves it, the 30 s gap holds. Nothing here logs the number or the code. */
let localSentAt = 0, localPhone = '';
export async function sendPhoneCode(e164: string): Promise<PhoneAnswer> {
  if (AUCTION_URL) {
    if (!token) return { ok: false, code: 'sign_in' };
    return RemoteAuctionServer.sendPhone(AUCTION_URL, token, e164);
  }
  const wait = localSentAt + 30_000 - Date.now();
  if (wait > 0) return { ok: false, code: 'rate_limited', retryAfter: Math.ceil(wait / 1000) };
  localSentAt = Date.now(); localPhone = e164;
  return { ok: true, phone: maskPhone(e164) };
}
/** The six digits. On success the store holds the masked number and phoneVerified, and every screen hears it. */
export async function verifyPhoneCode(code: string): Promise<PhoneAnswer> {
  let r: PhoneAnswer;
  if (AUCTION_URL) r = token ? await RemoteAuctionServer.verifyPhone(AUCTION_URL, token, code) : { ok: false, code: 'sign_in' };
  else r = !localPhone ? { ok: false, code: 'code_expired' } : code === '000000' ? { ok: true, phone: maskPhone(localPhone) } : { ok: false, code: 'wrong_code' };
  if (r.ok) setBuyer({ phone: r.phone, phoneVerified: true });
  return r;
}

/** POST /me/rotate: a fresh token, the old one dead. Called once after a deposit capture. */
export async function rotateToken(): Promise<boolean> {
  if (!AUCTION_URL || !token) return false;
  const s = await RemoteAuctionServer.rotate(AUCTION_URL, token);
  if (!s || s.id !== ME) return false;
  adopt(s);
  return true;
}

/** What the buyer gave (the licence read's name and street line, a name typed on Me, a phone): the name for the
    paperwork and the Desk, the rest for the Worker's shill check (D11). Kept on the phone for every later
    sign-in, and sent now when signed in. Empty fields are dropped, never sent blank. */
export function saveProfile(p: Pick<Profile, 'phone' | 'address' | 'name'>) {
  const keep: Profile = { ...readJSON<Profile>(PROFILE_KEY) };
  if (p.phone?.trim()) keep.phone = p.phone.trim();
  if (p.address?.trim()) keep.address = p.address.trim();
  const name = p.name?.trim().replace(/\s+/g, ' ');
  if (name) { keep.name = name; setBuyer({ name }); }
  kv.set(PROFILE_KEY, JSON.stringify(keep));
  if (!AUCTION_URL || !token || buyer.lost) return;
  RemoteAuctionServer.signIn(AUCTION_URL, { id: ME, token }, keep).then(adopt, e => {
    if (e instanceof Refused && e.code === 'not_yours') { token = null; setBuyer({ lost: true }); }
  });
}

/** The name typed on Me (one field, Save). The licence read sets it the same way, through saveProfile. */
export function saveName(name: string): boolean {
  if (!name.trim()) return false;
  saveProfile({ name });
  return true;
}

/** The one phone number (ops-runbook.md, Rule 1): for the pilot, Triple J's phone as it is set in the Desk.
    A build can carry it (EXPO_PUBLIC_SUPPORT_PHONE); until the Worker supplies it, the dealer's phone the Desk
    sends with every car (carMeta) is that same number. Empty when neither is known: then no number is shown. */
export const SUPPORT_PHONE = (process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '').trim();
export const supportPhone = (cars: { dealer: { phone: string } }[]): string => SUPPORT_PHONE || cars.find(c => c.dealer.phone.trim())?.dealer.phone.trim() || '';

/** Local stand-in for D15: wins taken this year (`?wins=N`, preview only) plus closed lots I won plus open lots I
    lead, other than `except`. The Worker counts the same three things. */
const previewWins = () => Number((globalThis as { location?: { search?: string } }).location?.search?.match(/[?&]wins=(\d)/)?.[1] ?? 0);
export function localCommitted(lots: Lot[], except?: string): number {
  return previewWins() + lots.filter(l => l.leader === ME && l.id !== except && (l.closed ? l.closed.sold : true)).length;
}

/** The one car the buyer already holds (sim 03), other than `except`: an open lot they lead, else a sale won and not
    yet paid, voided or forfeited. The one_open_bid stamp's tap goes here. Null when the lane does not know it. */
export function heldLot(lots: Lot[], me: string, except?: string): { lot: Lot; screen: 'lane' | 'won' } | null {
  const open = lots.find(l => l.id !== except && !l.closed && l.leader === me);
  if (open) return { lot: open, screen: 'lane' };
  const owed = lots.find(l => l.id !== except && l.closed && l.sale?.buyer === me && !l.sale.paidAt && !l.sale.startedAt && !l.sale.voidedAt && !l.sale.forfeitedAt);
  return owed ? { lot: owed, screen: 'won' } : null;
}
/** The car's name as the stamp sets it: the model the Desk wrote on the lot, or the seeded car's. */
export function lotName(lot: Lot): string | undefined {
  return lot.car?.model ?? seeded.find(c => c.id === lot.id)?.model;
}
/** Local stand-in for sim 03: the open lots I lead other than `except`. A won lot never reaches `sale` locally
    (the local server writes none), so the owed half of the Worker's count is the Worker's alone. */
export function localOpen(lots: Lot[], except?: string): number {
  return lots.filter(l => l.leader === ME && l.id !== except && !l.closed).length;
}

let server: AuctionServer | undefined;
export function getServer(): AuctionServer {
  if (!server && AUCTION_URL) {
    // the real thing: sign in (the stored buyer, or a new one the first time), then the lane and a socket per lot
    const stored = readJSON<Session>(SESSION_KEY);
    if (stored) ME = stored.id;
    const remote = new RemoteAuctionServer(AUCTION_URL, buyerToken);
    server = remote;
    signIn().catch(() => {}).finally(() => { remote.start(); });
    reopen();
    return server;
  }
  if (!server) {
    const lots = seedLots(Date.now());
    reopen();
    const closeIn = Number((globalThis as { location?: { search?: string } }).location?.search?.match(/closeIn=(\d+)/)?.[1]);
    const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
    const lag = Number(search.match(/lag=(\d+)/)?.[1]);
    if (closeIn > 0) lots[0].closesAt = Date.now() + closeIn;   // preview only: watch a close
    const local = new LocalAuctionServer(lots, undefined, lag > 0 ? () => lag : undefined).start();
    if (/[?&]win=1/.test(search)) {   // preview only: the hammer falls 2.5 s after my first bid
      const off = local.subscribe(e => { if (e.kind === 'bid' && e.lot.leader === ME) { local.closeSoon(e.lotId, 2500); off(); } });
    }
    // rivals so the demo lane breathes: one refill on the Altima, one on the Fusion; never under ?win=1, where a
    // rival inside the 2.5 s hammer window would refill the close and take the lead from the walk
    if (lots.length === 3 && lots[0].high < 5400 && !/[?&]win=1/.test(search)) {   // the seeded lane only, not the break-ui fixtures
      local.scheduleRival('altima', 25_000, 5400, 'r3');
      local.scheduleRival('altima', 55_000, 5700, 'r4');
      local.scheduleRival('fusion', 40_000, 3500, 'r5');
    }
    // the Worker's admission rules, played locally so the screens meet the same refusals (D10, D15)
    server = {
      subscribe: f => local.subscribe(f), get: id => local.get(id), all: () => local.all(),
      async bid(req) {
        if (!buyer.phoneVerified) throw new Refused('phone_required', 409);
        if (!buyer.termsCurrent && req.terms !== TERMS_VERSION) throw new Refused('terms_required', 409);
        if (localCommitted(local.all(), req.lotId) >= WINS_PER_YEAR) throw new Refused('win_cap', 403);
        const retry = Number(search.match(/[?&]retry=(\d+)/)?.[1]);   // preview only: the Worker's 429, Retry-After as given
        if (retry > 0) { throw new Refused('too_many_bids', 429, { retryAfter: retry }); }
        const open = localOpen(local.all(), req.lotId);
        if (open >= 1) { setBuyer({ openBids: open }); throw new Refused('one_open_bid', 409, { open }); }
        const ack = await local.bid(req);
        setBuyer({ termsCurrent: true });
        return ack;
      },
    };
  }
  return server!;
}

/** The deposit, taken through ./deposit (Whop on the server, a flag locally). True once it is held. */
export async function captureDeposit(): Promise<boolean> {
  const { takeDeposit } = await import('./deposit');
  const r = await takeDeposit();
  return r === 'captured' || r === 'local';
}

/** Live lots and a 4 Hz clock, from the server's own events. */
export function useLots(): { lots: Record<string, Lot>; now: number } {
  const s = getServer();
  const [lots, setLots] = useState<Record<string, Lot>>(() => Object.fromEntries(s.all().map(l => [l.id, l])));
  const [now, setNow] = useState(Date.now());
  useEffect(() => s.subscribe(e => {
    if (e.kind === 'tick') setNow(Date.now());
    else setLots(prev => ({ ...prev, [e.lotId]: e.lot }));
  }), [s]);
  return { lots, now };
}

/** The lots in lane order: open ones by closing time, then closed ones I won. */
export function laneCars(lots: Record<string, Lot>, base: string, me: string): Car[] {
  const all = Object.values(lots);
  const open = all.filter(l => !l.closed).sort((a, b) => a.closesAt - b.closesAt);
  const mine = all.filter(l => l.closed && l.sale?.buyer === me).sort((a, b) => a.closesAt - b.closesAt);
  return [...open, ...mine].map(l => carFromLot(l, base)).filter((c): c is Car => c !== null);
}

/** The cars on the glass: the Worker's lots when AUCTION_URL is set, the seeded lane otherwise. */
export function useCars(lots: Record<string, Lot>): Car[] {
  return useMemo(() => (AUCTION_URL ? laneCars(lots, AUCTION_URL, ME) : seeded), [lots]);
}

/** Things the buyer has done once, ever. In memory for now; Keychain later. `licence`: the ID the first bid
    scanned and the buyer confirmed (decisions §3.1, first bid: the licence, then the deposit). It prefills the
    ID step after a win when the car is for the buyer. Never persisted and never sent as is. */
export const once: { deposit: boolean; sawRefill: boolean; licence: Licence | null } = { deposit: false, sawRefill: false, licence: null };

/** Cars the buyer is watching. Double-tap the photo. A column of rings on the Me page. */
let watched: string[] = [];
const watchSubs = new Set<() => void>();
export function useWatched() {
  return useSyncExternalStore(f => { watchSubs.add(f); return () => { watchSubs.delete(f); }; }, () => watched, () => watched);
}
export function toggleWatch(id: string): boolean {
  const on = !watched.includes(id);
  watched = on ? [...watched, id] : watched.filter(w => w !== id);
  for (const f of watchSubs) f();
  if (server instanceof RemoteAuctionServer) {
    void server.watch(id, on);
    if (on) void import('./push').then(p => p.registerPush()).catch(() => false);   // the first Watch asks for push
  }
  return on;
}
export const isWatched = (id: string) => watched.includes(id);

/* Where the app was last opened, kept in kv: `at` for the welcome back on Me (away more than a day), and the
   screen a push sent the buyer to, so a phone that killed the app between the tap and the next launch reopens
   there once. Every intent on the nav bus (push.ts routes taps through go()) is written here as it happens. */
export type Opened = { at: number; screen: Screen; lotId?: string; push?: boolean };
const DAY = 24 * 3_600_000;

export function lastOpened(): Opened | null {
  const o = readJSON<Opened>(OPENED_KEY);
  return o && typeof o.at === 'number' && isScreen(o.screen) ? o : null;
}
export function markOpened(screen: Screen, lotId?: string, push = false) {
  kv.set(OPENED_KEY, JSON.stringify({ at: Date.now(), screen, ...(lotId ? { lotId } : {}), ...(push ? { push: true } : {}) }));
}
/** The screen to reopen at launch: a push's place less than a day old that the buyer never got back to. */
export function reopenIntent(o: Opened | null, now: number): Intent | null {
  if (!o?.push || now - o.at > DAY) return null;
  return o.lotId ? { screen: o.screen, lotId: o.lotId } : { screen: o.screen };
}
/** At launch: reopen once where the last push sent the buyer, unless a push tap already set the place. */
function reopen() {
  const o = lastOpened(), i = reopenIntent(o, Date.now());
  if (!i || peekIntent()) return;
  go(i);
  markOpened(i.screen, i.lotId);   // spent: the next launch opens on the lane
}
subscribeIntent(() => { const i = peekIntent(); if (i) markOpened(i.screen, i.lotId, true); });

/** Away more than a day since the app last opened (the first watched ring gets the heartbeat). With no record:
    the local stand-in says yes so the demo shows it; on the Worker, no. */
export function backAfterADay(now = Date.now()): boolean {
  const o = lastOpened();
  return o ? now - o.at > DAY : !AUCTION_URL;
}
