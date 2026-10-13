/* What a lot carries about its car, written by the Desk at Go and read by the
   phone. Everything the glass shows that is not the price or the clock. */
import type { Fees } from './money';
export type RemotePhoto = { url: string; w: number; h: number };

export type CarMeta = {
  year: number; make: string; model: string;
  miles: number;
  vin: string;
  photos: RemotePhoto[];                 // the first is the lane photo; the three mandatory angles are among them
  grade: [number, number, number, number, number, number]; // paint, glass, tires, lights, A/C, drives: 0..1
  title: 'in hand' | 'at lender';
  dealer: { name: string; city: string; street: string; gdn: string; phone: string; afterHours: string; fees: Fees };
  documents?: { guide?: string; bill?: string; title?: string };   // URLs on the Worker, as the Desk files them
  hours?: string[];                      // pickup windows the dealer offers, e.g. "Sat 10–2"
  collateral: Collateral;                // who holds what before the first bid; the lane refuses without it
};

/** The collateral the dealer puts behind the lot. docs/plan/collateral.md. */
export type Collateral = {
  title: { status: 'hand' | 'lender' | 'repo' | 'unknown'; lienholder?: string; payoff?: number; releaseDays?: number };
  floor: number;                         // the dealer's net; the hammer the buyer sees opens here
  payoffAcknowledged?: boolean;          // the dealer saw "you bring $X" and said OK
  insured: boolean;                      // the car is on the dealer's lot policy until the engine starts
};

/** The lender's release must leave a week for the county: title reaches the buyer before day 21 on a lane sale
    (Transp. Code §503.039(b), read 2026-10-13; decisions §9 D2), so the release lands inside 14 days. */
export const RELEASE_MAX_DAYS = 14;

/** The lane accepts a lot only on collateral it can see. Returns the refusal, or null. */
export function collateralRefusal(c: Collateral | undefined): string | null {
  if (!c) return 'collateral missing';
  if (c.title.status === 'repo') return 'title in repossession';
  if (c.title.status === 'unknown') return 'title location unknown';
  if (c.title.status === 'lender' && !((c.title.releaseDays ?? 0) > 0)) return 'lender release time missing';
  if (c.title.status === 'lender' && (c.title.releaseDays ?? 0) > RELEASE_MAX_DAYS) return 'release past day 14';
  if ((c.title.payoff ?? 0) > c.floor && !c.payoffAcknowledged) return 'floor below payoff without acknowledgement';
  if (!c.insured) return 'not insured';
  return null;
}

/** The sale after the hammer, as the object keeps it. */
export type SaleState = {
  buyer: string; hammer: number; wonAt: number; deadlineAt: number;
  paidAt?: number; startedAt?: number; forfeitedAt?: number; voidedAt?: number;
  deposit?: 'held' | 'to_dealer' | 'released';   // where the buyer's $250 went
};
