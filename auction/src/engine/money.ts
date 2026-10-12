/* The two numbers. The hammer is what the buyer bids; the total is what the
   buyer brings. Same rules as the Desk's money.ts (Texas 6.25% on the price,
   the state's title and registration lines, the dealer's own doc fee). There is
   no buyer's premium, ever: see docs/plan/obavia-auction-decisions.md §1. */

export type Fees = { taxRate: number; title: number; registration: number; doc: number };

/** Texas statutory lines; the doc fee is the dealer's and comes with the car. */
export const TEXAS = { taxRate: 0.0625, title: 33, registration: 75 } as const;

export const round2 = (x: number) => Math.round(x * 100) / 100;

export type Total = { hammer: number; tax: number; fees: number; total: number };

/** hammer + tax + title + registration + doc. Zero premium. */
export function outTheDoor(hammer: number, fees: Fees): Total {
  const tax = round2(hammer * fees.taxRate);
  const f = fees.title + fees.registration + fees.doc;
  return { hammer, tax, fees: f, total: round2(hammer + tax + f) };
}

/** $5,150 → "5,150". Whole dollars only on the glass. */
export const dollars = (n: number) => Math.round(n).toLocaleString('en-US');
