// Affordability engine. Pure arithmetic over self-reported inputs.
// Every output is an ESTIMATE. Nothing here is a credit decision, an offer,
// or a prequalification (never-list NL-3). Rates are illustrative used-car
// bands; the real number comes from a lender the buyer applies to.

export type CreditBand = "deep_subprime" | "subprime" | "near_prime" | "prime" | "super_prime";

export interface BuyerProfile {
  creditScore?: number; // self-reported
  creditBand?: CreditBand; // derived or self-described ("bad", "fair", "good")
  downPayment?: number; // dollars
  monthlyBudget?: number; // dollars per month, if stated
  monthlyIncome?: number; // dollars per month, if stated
  termMonths?: number; // default 60
  desiredVehicle?: string; // free text as stated
  city?: string; // default Houston
}

export interface RateBand {
  band: CreditBand;
  label: string;
  labelEs: string;
  minScore: number;
  maxScore: number;
  aprLow: number; // percent
  aprHigh: number; // percent
}

// Used-vehicle APR bands, illustrative. Source note for the UI: broad industry
// ranges for used-car retail loans by score band; not a quote.
export const RATE_BANDS: RateBand[] = [
  { band: "super_prime", label: "excellent", labelEs: "excelente", minScore: 781, maxScore: 850, aprLow: 5.5, aprHigh: 7.5 },
  { band: "prime", label: "good", labelEs: "bueno", minScore: 661, maxScore: 780, aprLow: 7.0, aprHigh: 10.0 },
  { band: "near_prime", label: "fair", labelEs: "regular", minScore: 601, maxScore: 660, aprLow: 10.5, aprHigh: 15.5 },
  { band: "subprime", label: "below-average", labelEs: "bajo", minScore: 501, maxScore: 600, aprLow: 15.0, aprHigh: 21.0 },
  { band: "deep_subprime", label: "challenged", labelEs: "limitado", minScore: 300, maxScore: 500, aprLow: 20.0, aprHigh: 26.0 },
];

export function bandForScore(score: number): RateBand {
  const s = Math.max(300, Math.min(850, Math.round(score)));
  return RATE_BANDS.find((b) => s >= b.minScore && s <= b.maxScore) ?? RATE_BANDS[2];
}

export function bandByKey(key: CreditBand): RateBand {
  return RATE_BANDS.find((b) => b.band === key) ?? RATE_BANDS[2];
}

// Texas-specific costs on top of the negotiated price. Illustrative and
// labeled as such in the UI.
export const TEXAS_SALES_TAX = 0.0625;
export const TITLE_REG_ESTIMATE = 250; // title, registration, inspection, plates; varies by county
export const DOC_FEE_ESTIMATE = 150; // dealer documentary fee; varies by dealer

export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  if (principal <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function principalForPayment(payment: number, aprPercent: number, months: number): number {
  if (payment <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return payment * months;
  return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

export function outTheDoor(price: number): number {
  return price + price * TEXAS_SALES_TAX + TITLE_REG_ESTIMATE + DOC_FEE_ESTIMATE;
}

export interface PaymentEstimate {
  price: number;
  outTheDoor: number;
  financed: number;
  termMonths: number;
  aprLow: number;
  aprHigh: number;
  paymentLow: number;
  paymentHigh: number;
}

export function estimatePayment(price: number, down: number, band: RateBand, termMonths: number): PaymentEstimate {
  const otd = outTheDoor(price);
  const financed = Math.max(0, otd - down);
  return {
    price,
    outTheDoor: Math.round(otd),
    financed: Math.round(financed),
    termMonths,
    aprLow: band.aprLow,
    aprHigh: band.aprHigh,
    paymentLow: Math.round(monthlyPayment(financed, band.aprLow, termMonths)),
    paymentHigh: Math.round(monthlyPayment(financed, band.aprHigh, termMonths)),
  };
}

// Highest sticker price whose high-APR payment fits the monthly budget.
export function maxPriceForBudget(monthly: number, down: number, band: RateBand, termMonths: number): number {
  const financed = principalForPayment(monthly, band.aprHigh, termMonths);
  const otd = financed + down;
  // invert outTheDoor: otd = p(1+tax) + fixed
  const p = (otd - TITLE_REG_ESTIMATE - DOC_FEE_ESTIMATE) / (1 + TEXAS_SALES_TAX);
  return Math.max(0, Math.floor(p / 100) * 100);
}

export type Fit = "likely" | "stretch" | "unlikely";

export interface FitAssessment {
  fit: Fit;
  reasons: string[]; // plain-language, EN; UI localizes headline
  paymentToBudgetRatio?: number; // paymentHigh / monthlyBudget
  paymentToIncomeRatio?: number; // paymentHigh / monthlyIncome
  downPaymentRatio: number; // down / outTheDoor
  ltv: number; // financed / price
}

// Rules of thumb used by many used-car lenders: payment ≤ ~15% of gross
// monthly income, LTV ≤ ~120-130% of value (on used retail, ~115% is
// conservative), down ≥ ~10% in lower bands. These are heuristics for an
// estimate, not underwriting.
export function assessFit(est: PaymentEstimate, profile: BuyerProfile, band: RateBand): FitAssessment {
  const reasons: string[] = [];
  let score = 0;
  const down = profile.downPayment ?? 0;
  const downRatio = est.outTheDoor > 0 ? down / est.outTheDoor : 0;
  const ltv = est.price > 0 ? est.financed / est.price : 0;
  let pib: number | undefined;
  let pti: number | undefined;

  if (profile.monthlyBudget) {
    pib = est.paymentHigh / profile.monthlyBudget;
    if (pib <= 1) { score += 2; reasons.push("The estimated payment fits inside the monthly amount you gave."); }
    else if (pib <= 1.2) { score += 0; reasons.push("The estimated payment runs a little above the monthly amount you gave."); }
    else { score -= 2; reasons.push("The estimated payment is well above the monthly amount you gave."); }
  }
  if (profile.monthlyIncome) {
    pti = est.paymentHigh / profile.monthlyIncome;
    if (pti <= 0.15) score += 1;
    else if (pti > 0.2) { score -= 2; reasons.push("The payment would be a large share of the monthly income you gave; lenders usually want it under about 15 to 20 percent."); }
  }
  if (ltv > 1.3) { score -= 2; reasons.push("With this down payment the loan would exceed about 130 percent of the vehicle price, which most lenders will not fund on a used car."); }
  else if (ltv > 1.15) { score -= 1; reasons.push("The loan-to-value is on the high side; a larger down payment would help."); }
  else { score += 1; }

  const lowBand = band.band === "subprime" || band.band === "deep_subprime";
  if (lowBand && downRatio < 0.1) { score -= 1; reasons.push("In your credit band lenders usually look for at least about 10 percent down."); }
  if (lowBand && est.price > 25000) { score -= 1; reasons.push("Higher-priced vehicles are harder to finance in this credit band."); }

  const fit: Fit = score >= 2 ? "likely" : score >= 0 ? "stretch" : "unlikely";
  if (fit === "likely" && reasons.length === 0) reasons.push("The numbers line up with what lenders commonly fund.");
  return { fit, reasons, paymentToBudgetRatio: pib, paymentToIncomeRatio: pti, downPaymentRatio: downRatio, ltv };
}

export function downPaymentToReach(targetMonthly: number, price: number, band: RateBand, termMonths: number): number {
  const financedMax = principalForPayment(targetMonthly, band.aprHigh, termMonths);
  const need = outTheDoor(price) - financedMax;
  return Math.max(0, Math.ceil(need / 100) * 100);
}
