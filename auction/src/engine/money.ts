/* The two numbers. The hammer is what the buyer bids; the total is what the
   buyer brings. Same rules as the Desk's money.ts (Texas 6.25% on the price,
   the state's title, registration and plate lines, the dealer's own doc fee and,
   only if the dealer charges it, the database fee). There is no buyer's
   premium, ever: see docs/plan/obavia-auction-decisions.md §1. */

export type Fees = { taxRate: number; title: number; registration: number; doc: number;
  plate?: number;        // the dealer-issued metal plate, $10 (decisions §9 D6); a lot opened before it carries TEXAS.plate
  database?: number };   // the dealer's database compliance fee; absent is off; never above $20

/** Texas statutory lines; the doc fee is the dealer's and comes with the car.
    plate: Transp. Code §503.063 as amended by HB 718 (eff. 7/1/2025); TxDMV HB 718 Dealer FAQ (March 2025, read
    2026-10-13): "You cannot charge more than $10."
    registration: $75 is a SEEDED ESTIMATE. Registration runs $64.00 to $98.25 by county (TxDMV); decisions §8.6 says
    the total uses $98.25 labelled "estimate" until per-county values exist. Not yet applied here. */
export const TEXAS = { taxRate: 0.0625, title: 33, registration: 75, plate: 10 } as const;

/** Transp. Code §503.0631(f): "a reasonable fee not to exceed $20". */
export const DATABASE_FEE_MAX = 20;

export const round2 = (x: number) => Math.round(x * 100) / 100;

export type Total = { hammer: number; tax: number; fees: number; total: number };

/** hammer + tax + title + registration + plate + doc (+ database fee if charged). Zero premium. */
export function outTheDoor(hammer: number, fees: Fees): Total {
  const tax = round2(hammer * fees.taxRate);
  const database = Math.min(DATABASE_FEE_MAX, Math.max(0, fees.database ?? 0));
  const f = fees.title + fees.registration + (fees.plate ?? TEXAS.plate) + fees.doc + database;
  return { hammer, tax, fees: f, total: round2(hammer + tax + f) };
}

/** $5,150 → "5,150". Whole dollars only on the glass. */
export const dollars = (n: number) => Math.round(n).toLocaleString('en-US');
