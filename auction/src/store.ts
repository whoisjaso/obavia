/* The app's one connection to the auction. With EXPO_PUBLIC_AUCTION_URL set
   it is the Worker and its Durable Objects (worker/); without it, a local
   stand-in with the same surface, so the screens never know which. */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { carFromLot, cars as seeded, seedLots, type Car } from './data/cars';
import { RemoteAuctionServer } from './engine/client';
import { LocalAuctionServer, type Ack, type BidRequest, type Event, type Lot } from './engine/server';

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

let server: AuctionServer | undefined;
export function getServer(): AuctionServer {
  if (!server && AUCTION_URL) {
    // the real thing: sign in with a device-stable id, then the lane and a socket per lot
    ME = `b-${deviceId()}`;
    const remote = new RemoteAuctionServer(AUCTION_URL, buyerToken);
    server = remote;
    RemoteAuctionServer.signIn(AUCTION_URL, ME, me.name, 'TX').then(t => { token = t; remote.start(); }).catch(() => { remote.start(); });
    return server;
  }
  if (!server) {
    const lots = seedLots(Date.now());
    const closeIn = Number((globalThis as { location?: { search?: string } }).location?.search?.match(/closeIn=(\d+)/)?.[1]);
    const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
    const lag = Number(search.match(/lag=(\d+)/)?.[1]);
    if (closeIn > 0) lots[0].closesAt = Date.now() + closeIn;   // preview only: watch a close
    const local = new LocalAuctionServer(lots, undefined, lag > 0 ? () => lag : undefined).start();
    if (/[?&]win=1/.test(search)) {   // preview only: the hammer falls 2.5 s after my first bid
      const off = local.subscribe(e => { if (e.kind === 'bid' && e.lot.leader === ME) { local.closeSoon(e.lotId, 2500); off(); } });
    }
    // rivals so the demo lane breathes: one refill on the Altima, one on the Fusion
    local.scheduleRival('altima', 25_000, 5400, 'r3');
    local.scheduleRival('altima', 55_000, 5700, 'r4');
    local.scheduleRival('fusion', 40_000, 3500, 'r5');
    server = local;
  }
  return server!;
}

/** The deposit: locally a flag; on the server a Whop payment verified by id (DEV admits without one). */
export async function captureDeposit(paymentId?: string): Promise<boolean> {
  if (!AUCTION_URL) { once.deposit = true; return true; }
  if (!token) return false;
  const ok = await RemoteAuctionServer.deposit(AUCTION_URL, token, paymentId);
  if (ok) once.deposit = true;
  return ok;
}

/** A stable id for this install until sign-in exists. */
function deviceId(): string {
  const g = globalThis as { localStorage?: Storage };
  try {
    const k = 'obavia.device';
    let v = g.localStorage?.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); g.localStorage?.setItem(k, v); }
    return v;
  } catch { return Math.random().toString(36).slice(2, 18); }
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

/** Things the buyer has done once, ever. In memory for now; Keychain later. */
export const once = { deposit: false, sawRefill: false };

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
  if (server instanceof RemoteAuctionServer) void server.watch(id, on);
  return on;
}
export const isWatched = (id: string) => watched.includes(id);

/** The buyer, until sign-in exists: the name the licence read, or nothing. */
export const me = { name: 'Marisol Treviño', lastOpened: Date.now() - 26 * 3_600_000 };   // demo: away more than a day, so the first ring gets the heartbeat
