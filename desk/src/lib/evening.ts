/* The owner's one text each evening: what came in today, and the few things
   that need them. Nothing else. Built from the same records the Desk shows,
   so the text and the screens always agree. */
import { cashOn, type DayState } from './cashday';
import { counts, money, type Loan } from './loans';
import { signal } from './autopay';

export type EveningFacts = {
  dealerName: string; date: string; loans: Loan[];
  toMatch: number;                  // payments waiting for the owner in To Match
  cashState: DayState;              // today's cash day
  flaggedDays: number;              // earlier cash days short or not banked
};
export type Evening = { cents: number; count: number; parts: string[]; needs: string[]; text: string };

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const first = (name: string) => name.split(' ')[0];

export function evening(f: EveningFacts): Evening {
  const today = f.loans.flatMap(l => l.payments.filter(p => p.on === f.date && counts(p)));
  const cents = today.reduce((t, p) => t + p.cents, 0);
  const n = (test: (p: (typeof today)[number]) => boolean) => today.filter(test).length;
  const parts = [
    [n(p => p.via === 'autopay'), 'autopay'], [n(p => p.via === 'text_link' || p.via === 'portal' || p.via === 'retail_cash'), 'by text link'],
    [n(p => p.via === 'matched'), 'matched from the bank'], [n(p => p.method === 'cash' && (!p.via || p.via === 'desk')), 'cash at the counter'],
  ].filter(([k]) => (k as number) > 0).map(([k, w]) => `${k} ${w}`);
  const counted = parts.reduce((t, s) => t + parseInt(s), 0);
  if (today.length > counted) parts.push(`${today.length - counted} other`);

  const needs: string[] = [];
  for (const l of f.loans) {
    const s = signal(l, f.date), fresh = (l.attempts ?? []).some(a => a.on === f.date) || (l.autopay?.history ?? []).some(h => h.on === f.date && h.event !== 'added');
    if (s.tone === 'red' && fresh) needs.push(`${first(l.buyer.name)}: ${s.headline.toLowerCase()}`);
    else if (s.tone === 'amber' && fresh) needs.push(`${first(l.buyer.name)}: ${s.headline.split(' · ')[0].toLowerCase()}`);
  }
  if (f.toMatch) needs.push(`${plural(f.toMatch, 'payment')} to match`);
  const cashToday = cashOn(f.loans, f.date).cents;
  if (f.cashState === 'open' && cashToday > 0) needs.push(`close the drawer (${money(cashToday)} cash)`);
  if (f.cashState === 'short') needs.push('today’s cash is short');
  if (f.flaggedDays) needs.push(`${plural(f.flaggedDays, 'cash day')} to look at`);

  const head = `${f.dealerName} today: ${money(cents)} in from ${plural(today.length, 'payment')}${parts.length ? ` (${parts.join(', ')})` : ''}.`;
  const shown = needs.slice(0, 3), more = needs.length - shown.length;
  const tail = needs.length ? ` ${needs.length === 1 ? '1 thing needs' : `${needs.length} things need`} you: ${shown.join('; ')}${more ? `; and ${more} more` : ''}.` : ' Nothing needs you.';
  return { cents, count: today.length, parts, needs, text: head + tail };
}

/** 19 -> "7:00 PM" */
export const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;
