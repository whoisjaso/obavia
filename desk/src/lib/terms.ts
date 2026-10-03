/* Financing terms, solved from what was agreed (Handle A Sale SOP, Financing):
   they agreed on the payment, the number of payments, or both, and the rest is
   computed. The APR is held to the Texas Finance Code ch. 348 ceiling the owner
   confirms for the vehicle's class, never below the 18% optional ceiling
   (Fin. Code §303.009). When the agreed figures imply more than the ceiling,
   the rate comes down to it and the payment is recomputed. No class ceiling
   is encoded here: until the owner confirms one, 18% holds. */
import { payment } from './paperwork';

export const RATE_FLOOR = 18;   // percent; the lowest the ceiling can be
export type Agreed = 'payment' | 'count' | 'both';
export type Terms = { rate: number; count: number; payment: number; held: boolean; ceiling: number };

export const ceilingFor = (confirmed?: number | null) => Math.max(RATE_FLOOR, confirmed ?? RATE_FLOOR);

/** The annual rate (percent) a level payment implies. */
export function impliedRate(principal: number, pay: number, count: number, perYear: number) {
  if (principal <= 0 || count <= 0 || pay * count <= principal) return 0;
  let lo = 0, hi = 400;
  for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; payment(principal, mid, count, perYear) > pay ? (hi = mid) : (lo = mid); }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

/** Payments needed at a rate to clear the principal with a set payment (the last one smaller). */
export function countFor(principal: number, pay: number, rate: number, perYear: number) {
  if (principal <= 0) return 0;
  const r = rate / 100 / perYear;
  if (pay <= principal * r) return Infinity;
  const n = r === 0 ? principal / pay : -Math.log(1 - (principal * r) / pay) / Math.log(1 + r);
  return Math.ceil(n - 0.005);   // a remainder of a few cents (from rounding the payment) rides on the last payment, not a new one
}

export function solveTerms(x: { principal: number; perYear: number; agreed: Agreed; payment?: number; count?: number; rate?: number; ceiling?: number | null }): Terms {
  const ceiling = ceilingFor(x.ceiling);
  const held = (rate: number) => rate > ceiling;
  if (x.agreed === 'both') {
    const count = x.count ?? 0, implied = impliedRate(x.principal, x.payment ?? 0, count, x.perYear);
    if (held(implied)) return { rate: ceiling, count, payment: payment(x.principal, ceiling, count, x.perYear), held: true, ceiling };
    return { rate: implied, count, payment: x.payment ?? 0, held: false, ceiling };
  }
  const rate = Math.min(x.rate ?? 0, ceiling), wasHeld = held(x.rate ?? 0);
  if (x.agreed === 'count') { const count = x.count ?? 0; return { rate, count, payment: payment(x.principal, rate, count, x.perYear), held: wasHeld, ceiling }; }
  const count = countFor(x.principal, x.payment ?? 0, rate, x.perYear);
  return { rate, count, payment: x.payment ?? 0, held: wasHeld, ceiling };
}
