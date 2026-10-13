/* The sale after the hammer: what the buyer has done, in order. One object,
   one store, no navigation state anywhere else. The plates timeline is the
   dealer's and the county's; here a demo cadence stands in for the Desk's
   130-U filing events until the Worker carries them. */
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
export function openSale(init: Pick<Sale, 'lotId' | 'hammer' | 'total'> & { wonAt?: number }) {
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

/** Pickup: at the lot the dealer scans the VIN and the car starts; the QR turns green.
    Demo: a short wait stands in for the dealer's scan. */
export function arriveAtLot() {
  setSale({ arrived: true }); feel.heartbeat();
  setTimeout(() => {
    setSale({ pickedUp: true }); feel.done();
    if (!outOfState(sale)) runPlates();
  }, 1800);
}

/** Filed → Approved → Mailed, each a tick on the ring; Mailed gets the heartbeat twice.
    Demo cadence; the real events are the Desk's 130-U filing and the county's answer. */
function runPlates() {
  const step = (p: Plates, after: number) => setTimeout(() => {
    if (!sale) return;
    setSale({ plates: p });
    if (p === 'mailed') { feel.heartbeat(); setTimeout(feel.heartbeat, 1000); } else feel.tick();
  }, after);
  step('filed', 4000); step('approved', 9000); step('mailed', 14000);
}
