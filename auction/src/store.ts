/* The app's one connection to the auction. Today a local stand-in for the
   Durable Object; the hook's shape is the Worker's shape. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { seedLots } from './data/cars';
import { LocalAuctionServer, type Lot } from './engine/server';

export const ME = 'me';
export const DEPOSIT = 250;

let server: LocalAuctionServer | undefined;
export function getServer() {
  if (!server) {
    const lots = seedLots(Date.now());
    const closeIn = Number((globalThis as { location?: { search?: string } }).location?.search?.match(/closeIn=(\d+)/)?.[1]);
    const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
    const lag = Number(search.match(/lag=(\d+)/)?.[1]);
    if (closeIn > 0) lots[0].closesAt = Date.now() + closeIn;   // preview only: watch a close
    server = new LocalAuctionServer(lots, undefined, lag > 0 ? () => lag : undefined).start();
    if (/[?&]win=1/.test(search)) {   // preview only: the hammer falls 2.5 s after my first bid
      const srv = server;
      const off = srv.subscribe(e => { if (e.kind === 'bid' && e.lot.leader === ME) { srv.closeSoon(e.lotId, 2500); off(); } });
    }
    // rivals so the demo lane breathes: one refill on the Altima, one on the Fusion
    server.scheduleRival('altima', 25_000, 5400, 'r3');
    server.scheduleRival('altima', 55_000, 5700, 'r4');
    server.scheduleRival('fusion', 40_000, 3500, 'r5');
  }
  return server;
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
  return on;
}
export const isWatched = (id: string) => watched.includes(id);

/** The buyer, until sign-in exists: the name the licence read, or nothing. */
export const me = { name: 'Marisol Treviño', lastOpened: Date.now() - 26 * 3_600_000 };   // demo: away more than a day, so the first ring gets the heartbeat
