/* Cash at the counter: the one payment with no signal.
   It goes in with one tap, then three checks verify it without anyone
   touching it:
   1. the buyer's receipt text (cash taken and not recorded means no receipt, and a call);
   2. the drawer count at close, against one number;
   3. the bank deposit, matched to that day's cash, which marks the day banked.
   A day still not banked after BANK_WITHIN days is flagged. */
import { addDays, daysBetween, standing, type Loan, type Payment } from './loans';
import { askTotal } from './extras';
import type { Money } from './match';

export const BANK_WITHIN = 3;          // days after close before an unbanked day is flagged
const MATCH_WINDOW = 10;               // how far after a cash day its deposit may arrive

export type CashDay = { date: string; countedCents: number; closedAt: string; countedBy?: string; bankedBy?: string; bankedOn?: string };
export type DayState = 'open' | 'counted' | 'short' | 'over' | 'banked' | 'not_banked';

/** Counter cash only: paid in cash, taken at the desk (not cash at a 7-Eleven through the processor). */
export const isCounterCash = (p: Payment) => p.method === 'cash' && (!p.via || p.via === 'desk') && (!p.status || p.status === 'cleared');

export function cashOn(loans: Loan[], date: string) {
  const items = loans.flatMap(l => l.payments.filter(p => p.on === date && isCounterCash(p)).map(p => ({ loan: l, p })));
  return { cents: items.reduce((t, x) => t + x.p.cents, 0), items: items.sort((a, b) => a.p.receipt - b.p.receipt) };
}

/** Who might walk in today: everyone due today or behind, most behind first, with what to ask for. */
export function expected(loans: Loan[], asOf: string) {
  return loans.map(l => ({ loan: l, s: standing(l, asOf) }))
    .filter(x => x.s.status === 'due_today' || x.s.status === 'late')
    .filter(x => !x.loan.payments.some(p => p.on === asOf))       // already paid today: off the list
    .map(x => ({ loan: x.loan, cents: askTotal(x.loan, x.s), late: x.s.status === 'late', daysLate: x.s.daysLate }))
    .sort((a, b) => b.daysLate - a.daysLate || a.loan.buyer.name.localeCompare(b.loan.buyer.name));
}

export function dayState(loans: Loan[], d: CashDay | undefined, date: string, asOf: string): DayState {
  if (!d) return 'open';
  if (d.bankedBy) return 'banked';
  const expectedCents = cashOn(loans, date).cents;
  if (d.countedCents < expectedCents) return 'short';
  if (d.countedCents > expectedCents) return 'over';
  return daysBetween(date, asOf) > BANK_WITHIN ? 'not_banked' : 'counted';
}

/** A cash deposit in the bank feed that equals a closed day's count banks that day. Each deposit banks one day, the oldest that fits. */
export function bankDays(money: Money[], days: Record<string, CashDay>): Record<string, { date: string; on: string }> {
  const out: Record<string, { date: string; on: string }> = {};
  const open = Object.values(days).filter(d => !d.bankedBy && d.countedCents > 0).sort((a, b) => a.date.localeCompare(b.date));
  const used = new Set<string>();
  for (const m of [...money].sort((a, b) => a.on.localeCompare(b.on))) {
    if (m.source !== 'bank' || m.pending || m.cents <= 0 || !/CASH DEP|BRANCH|TELLER|ATM DEP|DEPOSIT/i.test(m.text) || /MOBILE|REMOTE/i.test(m.text)) continue;
    const d = open.find(x => !used.has(x.date) && x.countedCents === m.cents && m.on >= x.date && m.on <= addDays(x.date, MATCH_WINDOW));
    if (d) { used.add(d.date); out[m.id] = { date: d.date, on: m.on }; }
  }
  return out;
}

/** The cash days with banking filled in from the bank feed, and the deposit ids that banked them (kept out of To Match). */
export function withBanking(days: Record<string, CashDay>, money: Money[]) {
  const by = bankDays(money, days), out: Record<string, CashDay> = { ...days };
  for (const [id, b] of Object.entries(by)) out[b.date] = { ...out[b.date], bankedBy: id, bankedOn: b.on };
  return { days: out, deposits: by };
}
