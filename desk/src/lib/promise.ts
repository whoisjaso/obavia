/* Promise to pay: "I can't make Friday, I'll be in Monday with $250."
   The account then works from the promise, not the due date: no late texts
   while the promise stands (only a reminder the morning it's due), and a
   promise that passes unpaid goes to the top of the owner's list. Two
   broken promises in 60 days reads like won't-pay. */
import { addDays, counts, daysBetween, type Loan } from './loans';

export type PayPromise = { id: string; made: string; on: string; cents: number; by?: string; note?: string };
export type PromiseState = 'waiting' | 'today' | 'kept' | 'partly' | 'broken';

/** Paid toward a promise: every counted payment from the day it was made through the promised day. */
export const paidToward = (l: Loan, p: PayPromise) =>
  l.payments.filter(x => counts(x) && x.on >= p.made && x.on <= p.on).reduce((t, x) => t + x.cents, 0);

export function promiseState(l: Loan, p: PayPromise, asOf: string): PromiseState {
  const paid = paidToward(l, p);
  if (paid >= p.cents) return 'kept';
  if (asOf < p.on) return 'waiting';
  if (asOf === p.on) return 'today';
  return paid > 0 ? 'partly' : 'broken';
}

/** The promise that governs the account now: the latest one still waiting or due today. */
export function openPromise(l: Loan, asOf: string): PayPromise | undefined {
  return [...(l.promises ?? [])].sort((a, b) => b.made.localeCompare(a.made) || b.on.localeCompare(a.on))
    .find(p => ['waiting', 'today'].includes(promiseState(l, p, asOf)));
}

/** Promises that passed without the money (or with only part of it), newest first. */
export const brokenPromises = (l: Loan, asOf: string, withinDays = 60) =>
  (l.promises ?? []).filter(p => p.on < asOf && daysBetween(p.on, asOf) <= withinDays && ['broken', 'partly'].includes(promiseState(l, p, asOf)))
    .sort((a, b) => b.on.localeCompare(a.on));

/** The days a buyer is likely to name: today, tomorrow, the next Friday and Monday, and their payday if known. */
export function promiseDays(asOf: string, payday?: number) {
  const dow = new Date(asOf + 'T12:00:00Z').getUTCDay();
  const next = (d: number) => addDays(asOf, ((d - dow + 7) % 7) || 7);
  const days = [asOf, addDays(asOf, 1), next(5), next(1)];
  if (payday !== undefined) days.push(next(payday));
  return [...new Set(days)].sort();
}

/** The one text the morning a promise is due, in the buyer's language. */
export function promiseReminder(l: Loan, p: PayPromise, dealerName: string) {
  const first = l.buyer.name.split(' ')[0], amt = '$' + (p.cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return l.language === 'es'
    ? `Hola ${first}, le recordamos de ${dealerName}: hoy es el día que acordamos para su pago de ${amt}. Gracias.`
    : `Hi ${first}, a reminder from ${dealerName}: today is the day we agreed for your ${amt} payment. Thank you.`;
}
