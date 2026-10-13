/* Repair balances and recurring fees: money owed beside the car note.

   - A repair: "Transmission work, $640." It is paid off either a set amount
     with each payment ("$40 more each payment") or on its own whenever the
     buyer brings it.
   - A recurring fee: "GPS service, $15 each payment." Owed with every
     installment from the day it starts until it's stopped. Only a fee the
     contract allows belongs here; counsel confirms which.

   These never enter the note's interest or late-charge math. A payment pays
   the car note first (what's due, then late charges), then fees and repair
   payments due, oldest first; anything beyond goes to the note's principal.
   Paying the note first means a fee can never make a buyer late on the car. */

import { amountToAsk, counts, standing, takePayment, type Loan, type Payment, type Standing } from './loans';

export type Extra = { id: string; kind: 'repair' | 'fee'; what: string; cents: number; on: string; perPayment?: number; stop?: string };

const usd = (c: number) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Paid toward one extra so far. */
export const paidTo = (l: Loan, id: string) => l.payments.filter(counts).reduce((t, p) => t + (p.toExtras?.[id] ?? 0), 0);

/** Installments that fall due while an extra applies, up to a day. */
const dueCount = (e: Extra, s: Standing) => s.installments.filter(i => i.due >= e.on && i.due <= s.asOf && (!e.stop || i.due < e.stop)).length;

/** What is owed on one extra right now: fees for each installment due since it started, or the scheduled part of a repair. */
export function extraDue(l: Loan, e: Extra, s: Standing) {
  const paid = paidTo(l, e.id), n = dueCount(e, s);
  if (e.kind === 'fee') return Math.max(0, n * e.cents - paid);
  return e.perPayment ? Math.max(0, Math.min(e.cents, n * e.perPayment) - paid) : 0;
}
/** What is left on a repair, scheduled or not. */
export const repairLeft = (l: Loan, e: Extra) => (e.kind === 'repair' ? Math.max(0, e.cents - paidTo(l, e.id)) : 0);
export const repairsLeft = (l: Loan) => (l.extras ?? []).reduce((t, e) => t + repairLeft(l, e), 0);

export const extrasDue = (l: Loan, s: Standing) => (l.extras ?? []).reduce((t, e) => t + extraDue(l, e, s), 0);
/** Everything to ask for at the counter: the note, plus fees and repair payments due. */
export const askTotal = (l: Loan, s: Standing) => amountToAsk(s) + extrasDue(l, s);

/** What each payment carries on top of the note, as of a due date: active fees, plus scheduled repair payments still owed. */
export function perPayment(l: Loan, on: string) {
  return (l.extras ?? []).reduce((t, e) => {
    if (e.kind === 'fee') return t + (e.on <= on && (!e.stop || on < e.stop) ? e.cents : 0);
    return t + (e.perPayment && e.on <= on ? Math.min(e.perPayment, repairLeft(l, e)) : 0);
  }, 0);
}

/** How a payment divides: the note first, then extras due (oldest first), then the note again. `prefer` sends it to one repair instead. */
export function split(l: Loan, cents: number, on: string, prefer?: string): Record<string, number> {
  const out: Record<string, number> = {}, s = standing(l, on);
  if (prefer) { const e = l.extras?.find(x => x.id === prefer); if (e) { const c = Math.min(cents, repairLeft(l, e) || extraDue(l, e, s)); if (c > 0) out[e.id] = c; } return out; }
  let left = cents - Math.min(cents, amountToAsk(s));
  for (const e of [...(l.extras ?? [])].sort((a, b) => a.on.localeCompare(b.on) || (a.kind === 'fee' ? -1 : 1))) {
    if (left <= 0) break;
    const c = Math.min(left, extraDue(l, e, s)); if (c > 0) { out[e.id] = c; left -= c; }
  }
  // the note is paid off: what's left can only go to a repair still owed
  if (left > 0 && s.status === 'paid_off') for (const e of l.extras ?? []) { const c = Math.min(left, repairLeft(l, e) - (out[e.id] ?? 0)); if (c > 0) { out[e.id] = (out[e.id] ?? 0) + c; left -= c; } }
  return out;
}

/** Takes a payment and divides it between the note and the extras. */
export function applyPayment(l: Loan, p: Omit<Payment, 'id' | 'receipt' | 'toExtras'>, receipt: number, prefer?: string): Loan {
  const toExtras = l.extras?.length ? split(l, p.cents, p.on, prefer) : {};
  return takePayment(l, Object.keys(toExtras).length ? { ...p, toExtras } : p, receipt);
}

/** "$40.00 GPS service" lines for the account, the receipt and the authorization. */
export function extrasLine(l: Loan, s: Standing) {
  return (l.extras ?? []).map(e => ({ e, due: extraDue(l, e, s) })).filter(x => x.due > 0).map(x => `${usd(x.due)} ${x.e.what}`).join(', ');
}
