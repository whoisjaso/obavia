/* The money model. Two answers (how much, and whether tax and fees are inside
   it) produce every figure on every document. Ported from the Handle A Sale
   SOP; the test vectors in money.test.ts must hold exactly. */
import { totalFees, type Fees } from './config';

export type FundingType = 'cash' | 'inHouse' | 'lender';
export type PriceBasis = 'outTheDoor' | 'vehicleOnly';
export type MoneyAnswers = { amount?: string | null; paidTodayAmount?: string | null; priceBasis?: PriceBasis | null };

export const cents = (x: number) => Math.round(x * 100) / 100;

/** Strip $ , and spaces BEFORE testing for empty: empty is unanswered, a typed 0 is an answer. */
export function parseMoney(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = v.replace(/[$,\s]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type Receipt = {
  salePrice: number; tax: number; title: number; doc: number; registration: number; fees: number;
  tradeIn: number; registrationCost: number; total: number; paidToday: number; balance: number;
};

export function computeMoney(opts: { money?: MoneyAnswers; funding?: FundingType | null; tradeIn?: number; fees: Fees }): Receipt {
  const { money = {}, funding = null, tradeIn = 0, fees } = opts;
  const FEES = totalFees(fees);
  const amount = parseMoney(money.amount);
  const basis = money.priceBasis ?? null;
  const a = amount ?? 0;

  let salePrice: number, tax: number;
  if (basis === 'outTheDoor') {
    const beforeTax = cents(a) - FEES;
    salePrice = cents(beforeTax / (1 + fees.taxRate));
    tax = cents(beforeTax - salePrice);
  } else {
    salePrice = a;
    tax = cents(fees.taxRate * Math.max(0, a - tradeIn));
  }
  const registrationCost = cents(tax + FEES);
  const total = Math.max(0, cents(salePrice - tradeIn + registrationCost));

  let implied: number;
  if (funding === 'lender' || funding === 'inHouse') implied = 0;
  else if (amount === null || basis === null) implied = total;
  else if (basis === 'outTheDoor') implied = total;
  else implied = Math.min(total, salePrice - tradeIn);

  const override = parseMoney(money.paidTodayAmount);
  const paidToday = override !== null ? Math.min(Math.max(override, 0), total) : implied;
  const balance = funding === 'lender' ? 0 : Math.max(0, cents(total - paidToday));

  return { salePrice, tax, title: fees.title, doc: fees.doc, registration: fees.registration, fees: FEES, tradeIn, registrationCost, total, paidToday: cents(paidToday), balance };
}

export const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
