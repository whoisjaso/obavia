/* The sale after the hammer: what the buyer has done, in order. One object,
   one store, no navigation state anywhere else. The pay-by is the server's
   (the lot's sale.deadlineAt, 48 h from the hammer). The plates timeline is
   the dealer's and the county's: with a Worker the ring follows the server's
   sale state and nothing else; only the local fixtures (no Worker) run the
   demo cadence that stands in for the Desk's 130-U filing events. */
import { useSyncExternalStore } from 'react';
import type { Signature } from './screens/Paper';
import { feel } from './feel';

/** The documents the buyer draws a signature on: the Buyers Guide acknowledgement and the bill of sale. The title
    is never drawn (D8, D9): a Texas licence signs it through webDEALER at pickup, any other licence gets paper. */
export type Doc = 'guide' | 'bill';
export type Plates = 'none' | 'filed' | 'approved' | 'mailed' | 'kickback';
/** A licence as the frame read it and the buyer confirmed it, fact by fact. */
export type Licence = { name: string; dob: string; address: string; licence: string; state: string; confirmed: boolean };
export type Sale = {
  lotId: string; hammer: number; total: number; wonAt: number;
  deadlineAt?: number;          // pay by: the server's, from the lot's sale; never computed on the glass with a Worker
  forWhom?: 'me' | 'other';
  id?: Licence;
  insured?: boolean;
  signed: Partial<Record<Doc, Signature>>;
  pay?: 'ach' | 'wire' | 'cash';
  slot?: string;
  arrived?: boolean;            // geofence at the lot
  pickedUp?: boolean;           // VIN scanned, engine started, QR green
  plates: Plates;
};

let sale: Sale | null = null;
const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };

export function useSale() {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => sale, () => sale);
}
/** The sale outside React (the Lane's sync with the server's sale states). */
export const peekSale = () => sale;
export const setSale = (patch: Partial<Sale>) => { if (sale) { sale = { ...sale, ...patch }; emit(); } };
export const clearSale = () => { sale = null; emit(); };
export function openSale(init: Pick<Sale, 'lotId' | 'hammer' | 'total'> & { wonAt?: number; deadlineAt?: number }) {
  sale = { ...init, wonAt: init.wonAt ?? Date.now(), signed: {}, plates: 'none' };
  emit();
}

/** Out-of-state licence: the plates come from the buyer's state; the tile relabels to Title. */
export const outOfState = (s: Sale | null) => !!s?.id?.confirmed && s.id.state !== 'TX';

/** Sign is done when both drawn documents carry a signature. */
export const signedAll = (s: Sale) => !!(s.signed.guide && s.signed.bill);

/** Which tile is next. The next one lifts; the ones before are ticked. */
export type Tile = 'id' | 'insure' | 'sign' | 'plates';
export function nextTile(s: Sale): Tile | null {
  if (!s.id?.confirmed) return 'id';
  if (!s.insured) return 'insure';
  if (!signedAll(s)) return 'sign';
  if (!s.pickedUp || (s.plates !== 'mailed' && !outOfState(s))) return 'plates';
  return null;
}

/** A Worker is configured (EXPO_PUBLIC_AUCTION_URL, inlined at build time): the server owns the sale. */
export const WORKER = !!(process.env.EXPO_PUBLIC_AUCTION_URL ?? '').trim();

/** The pay window the Worker sets (worker/src/auction.ts PAY_WINDOW_MS). Used only by the local fixtures. */
export const PAY_WINDOW_MS = 48 * 3_600_000;

/** The pay-by instant. With a Worker, the server's deadlineAt or nothing yet (the line waits for it);
    without one, the local fixtures' hammer plus the same 48 hours. */
export function payDeadline(s: Pick<Sale, 'wonAt' | 'deadlineAt'>, worker = WORKER): number | null {
  if (typeof s.deadlineAt === 'number' && Number.isFinite(s.deadlineAt)) return s.deadlineAt;
  return worker ? null : s.wonAt + PAY_WINDOW_MS;
}

/** The deadline as the buyer reads it: "Thu 4 pm", "Thu 4:37 pm", in the pilot's zone (America/Chicago) unless
    another is passed. One function for the page, the push and the Desk (DOCTRINE CP9): engine/time.ts. */
export { payByWords } from './engine/time';

/** The server's sale as the glass follows it: the pay-by, the hammer time, the dealer's scan and, once the
    Worker carries them, the plates states. The Lane calls this on every lot change for the sale I hold. */
export type ServerSale = { wonAt: number; deadlineAt: number; startedAt?: number; plates?: Plates };
export function followServer(server: ServerSale) {
  const cur = sale; if (!cur) return;
  const patch: Partial<Sale> = {};
  if (cur.wonAt !== server.wonAt) patch.wonAt = server.wonAt;   // the server's hammer time, so the pass matches the Desk's
  if (cur.deadlineAt !== server.deadlineAt) patch.deadlineAt = server.deadlineAt;
  if (server.startedAt && !cur.pickedUp) patch.pickedUp = true;   // the dealer's VIN scan
  if (server.plates && server.plates !== cur.plates) patch.plates = server.plates;
  if (Object.keys(patch).length) setSale(patch);
}

/** When to pick the car up: the dealer's own hours from the lot, as the choices, with the after-hours
    line under them to call; no hours on the lot, one line to call and the number. Dashes are set as
    hyphens (no en dash on the glass: the Desk may type "Sat 10\u20132"); a closed day is not a choice. */
export type PickupWhen =
  | { kind: 'slots'; slots: string[]; call: string }
  | { kind: 'call'; call: string };
export function pickupWhen(car: { hours?: string[]; dealer: { phone: string; afterHours: string } }): PickupWhen {
  const slots = [...new Set((car.hours ?? []).map(h => h.replace(/[\u2012-\u2015]/g, '-').replace(/\s+/g, ' ').trim()).filter(h => h && !/\bclosed\b/i.test(h)))];   // "Sun closed" is not a time to come
  if (slots.length) return { kind: 'slots', slots, call: car.dealer.afterHours || car.dealer.phone };
  return { kind: 'call', call: car.dealer.phone || car.dealer.afterHours };
}

/** Pickup: at the lot the dealer scans the VIN and the car starts; the QR turns green.
    Local fixtures only: a short wait stands in for the dealer's scan. With a Worker the scan is the
    Desk's (sale.startedAt over the socket) and arriving only marks the arrival. */
export function arriveAtLot(worker = WORKER) {
  setSale({ arrived: true }); feel.heartbeat();
  if (worker) return;
  setTimeout(() => {
    setSale({ pickedUp: true }); feel.done();
    if (!outOfState(sale)) runPlates(worker);
  }, 1800);
}

/** Filed, Approved, Mailed, each a tick on the ring; Mailed gets the heartbeat twice.
    Demo cadence for the local fixtures; with a Worker it never runs (followServer carries the states). */
export function runPlates(worker = WORKER) {
  if (worker) return;
  const step = (p: Plates, after: number) => setTimeout(() => {
    if (!sale) return;
    setSale({ plates: p });
    if (p === 'mailed') { feel.heartbeat(); setTimeout(feel.heartbeat, 1000); } else feel.tick();
  }, after);
  step('filed', 4000); step('approved', 9000); step('mailed', 14000);
}
