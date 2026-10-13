/* Ready for the next car: Fullpath's equity idea, built from the dealer's own notes.
   A buyer who has paid well for a year, or is most of the way through the note,
   is the best customer the lot has. No ad spend, no outside data: the payment
   history says who, and the payoff says how close they are. When the dealer
   knows roughly what the car is worth, the equity shows too.
   This is a list to call, never a text blast: marketing texts need the buyer's
   prior written consent, and a call from someone they know converts better. */
import { brokenPromises } from './promise';
import { signal } from './autopay';
import { activePause } from './pause';
import { daysBetween, standing, type Loan } from './loans';

export type NextCar = { loan: Loan; paid: number; of: number; onTime: number; months: number; payoffCents: number; equityCents?: number; why: string };

/** On time: paid in full before its late charge would apply. */
export function nextCar(loan: Loan, asOf: string): NextCar | undefined {
  const s = standing(loan, asOf);
  if (s.status === 'late' || s.status === 'paid_off' || activePause(loan, asOf)) return undefined;
  if (signal(loan, asOf).tone === 'red' || signal(loan, asOf).tone === 'amber') return undefined;
  if (brokenPromises(loan, asOf, 180).length) return undefined;
  const due = s.installments.filter(i => i.due <= asOf), paid = s.installments.filter(i => i.state === 'paid' || i.state === 'paid_late').length;
  const onTime = due.length ? due.filter(i => i.state === 'paid').length / due.length : 0;
  const months = Math.floor(daysBetween(loan.openedOn, asOf) / 30.4);
  const share = paid / loan.count;
  if (onTime < 0.9 || !(months >= 12 || share >= 0.5) || due.length < 6) return undefined;
  const equityCents = loan.worthCents !== undefined ? loan.worthCents - s.payoffCents : undefined;
  const why = onTime === 1 ? 'Never late' : `On time ${Math.round(onTime * 100)}% of the time`;
  return { loan, paid, of: loan.count, onTime, months, payoffCents: s.payoffCents, equityCents, why };
}

/** Best first: in equity, then closest to paid off, then the cleanest record. */
export function readyForNext(loans: Loan[], asOf: string): NextCar[] {
  return loans.map(l => nextCar(l, asOf)).filter((x): x is NextCar => !!x)
    .sort((a, b) => Number((b.equityCents ?? -1) > 0) - Number((a.equityCents ?? -1) > 0) || b.paid / b.of - a.paid / a.of || b.onTime - a.onTime);
}
