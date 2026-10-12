/* The app's one connection to the auction. Today a local stand-in for the
   Durable Object; the hook's shape is the Worker's shape. */
import { useEffect, useState } from 'react';
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
