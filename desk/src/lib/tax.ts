/* Texas motor vehicle tax on a note the dealer carries (34 TAC §3.74; Tax Code §152.047;
   Comptroller Motor Vehicle Tax Manual, ch. 7 "Seller-Financed Sales").

   - The tax is 6.25% of the total consideration: not the interest, not separately stated
     document, title or registration fees, service contracts or insurance.
   - A dealer with a Seller-Financed Sales Tax Permit may send it to the Comptroller as the
     payments come in, instead of all at once to the county with the title application.
   - Each payment carries an even share: the Comptroller's own example is $312.50 of tax on a
     36-payment note, so $8.68 with each payment. A part payment carries its part.
   - The title application (Form 130-U) is due to the county by the 45th day after delivery.
     Not filed by the 60th day: every unsent dollar of the tax is due at once.
   - Selling or assigning the note to anyone but a registered related finance company: also
     due at once, with no discount for a discounted sale. To a related finance company: no change.
   - Paid off early, or traded back in to us toward another car: the rest is due then.
   - Repossessed: nothing more is due, and no bad-debt deduction is taken.
   - Reports go in by the 20th of the month after each period: monthly, or quarterly for a
     dealer sending less than $1,500 a quarter. On time keeps 0.5% of the tax; late forfeits
     it, adds 5% (10% after 30 days) and $50 for the late report. */
import { addDays, counts, daysBetween, noteCents, standing, type Loan } from './loans';
import { TEXAS } from './config';

export const TX_RATE = TEXAS.taxRate;
export const TITLE_DAYS = 45, ACCELERATE_AFTER = 60;
export const QUARTERLY_UNDER = 150000;   // cents a quarter

export type NoteTax = {
  totalCents: number;               // 6.25% of the total consideration
  atSaleCents?: number;             // the part paid with the down payment, reported for the month of sale
  deferred: boolean;                // false: all of it went to the county with the title application
  titleFiled?: string;              // the day Form 130-U went to the county
  transfer?: { on: string; toRfc: boolean };   // the note was sold or assigned
  traded?: string;                  // traded back in to us toward another car
  repossessed?: string;             // nothing more is due after this day
};
export type TaxFiling = 'monthly' | 'quarterly';
export type TaxEvent = { on: string; cents: number; why: 'down' | 'payment' | 'paid_off' | 'title_late' | 'sold' | 'traded'; receipt?: number };

export const taxOn = (cents: number) => Math.round(cents * TX_RATE);

/** When everything unsent becomes due at once, and why. Repossession stops the tax instead. */
function accelerates(l: Loan): { on: string; why: TaxEvent['why'] } | undefined {
  const t = l.tax!, out: { on: string; why: TaxEvent['why'] }[] = [];
  const late = addDays(l.openedOn, ACCELERATE_AFTER + 1);
  if (!t.titleFiled || t.titleFiled >= late) out.push({ on: late, why: 'title_late' });
  if (t.transfer && !t.transfer.toRfc) out.push({ on: t.transfer.on, why: 'sold' });
  if (t.traded) out.push({ on: t.traded, why: 'traded' });
  return out.sort((a, b) => a.on.localeCompare(b.on))[0];
}

/** Every amount of tax that became due on this note, through a day. */
export function taxEvents(l: Loan, asOf: string): TaxEvent[] {
  const t = l.tax;
  if (!t || !t.deferred || t.totalCents <= 0) return [];
  const atSale = Math.min(t.atSaleCents ?? 0, t.totalCents), spread = t.totalCents - atSale, ofPayments = l.paymentCents * l.count;
  const ev: TaxEvent[] = [];
  if (atSale > 0 && l.openedOn <= asOf) ev.push({ on: l.openedOn, cents: atSale, why: 'down' });
  const acc = accelerates(l), stop = [acc?.on, t.repossessed && addDays(t.repossessed, 1)].filter(Boolean).sort()[0] as string | undefined;
  const s = standing(l, asOf), fees = s.feesByReceipt;
  let sent = 0;
  for (const p of [...l.payments].filter(p => counts(p) && p.on <= asOf && (!stop || p.on < stop)).sort((a, b) => a.on.localeCompare(b.on) || a.receipt - b.receipt)) {
    const share = Math.min(spread - sent, Math.round(Math.max(0, noteCents(p) - (fees[p.receipt] ?? 0)) * spread / ofPayments));
    if (share > 0) { ev.push({ on: p.on, cents: share, why: 'payment', receipt: p.receipt }); sent += share; }
  }
  const rest = spread - sent;
  if (rest > 0) {
    if (acc && acc.on <= asOf && (!t.repossessed || acc.on <= t.repossessed)) ev.push({ on: acc.on, cents: rest, why: acc.why });
    else if (s.status === 'paid_off' && !t.repossessed) {
      const last = [...l.payments].filter(p => counts(p) && p.on <= asOf).map(p => p.on).sort().pop();
      if (last) ev.push({ on: last, cents: rest, why: 'paid_off' });
    }
  }
  return ev;
}
export const taxSent = (l: Loan, asOf: string) => taxEvents(l, asOf).reduce((a, e) => a + e.cents, 0);

/* ---------- the title application: 45 days, and the 60-day line ---------- */
export type TitleWatch = { state: 'filed' | 'open' | 'soon' | 'overdue' | 'accelerated'; day: number; due45: string; due60: string; left: number };
export function titleWatch(l: Loan, asOf: string): TitleWatch | undefined {
  if (!l.tax) return undefined;
  const due45 = addDays(l.openedOn, TITLE_DAYS), due60 = addDays(l.openedOn, ACCELERATE_AFTER), day = daysBetween(l.openedOn, asOf);
  const filed = l.tax.titleFiled && l.tax.titleFiled <= asOf;
  const state: TitleWatch['state'] = filed ? 'filed' : asOf > due60 ? 'accelerated' : asOf > due45 ? 'overdue' : daysBetween(asOf, due45) <= 10 ? 'soon' : 'open';
  return { state, day, due45, due60, left: state === 'overdue' ? daysBetween(asOf, due60) : daysBetween(asOf, due45) };
}

/* ---------- the report to the Comptroller ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export type Period = { key: string; label: string; from: string; to: string; due: string };
export function periodOf(d: string, f: TaxFiling): Period {
  const [y, m] = d.split('-').map(Number);
  const first = f === 'monthly' ? m : Math.floor((m - 1) / 3) * 3 + 1, last = f === 'monthly' ? m : first + 2;
  const ny = last === 12 ? y + 1 : y, nm = last === 12 ? 1 : last + 1;
  const name = new Date(Date.UTC(y, first - 1, 1)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long' });
  return { key: f === 'monthly' ? `${y}-${pad(m)}` : `${y}-Q${(first + 2) / 3}`, label: f === 'monthly' ? `${name} ${y}` : `${name} to ${new Date(Date.UTC(y, last - 1, 1)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long' })} ${y}`,
    from: `${y}-${pad(first)}-01`, to: `${y}-${pad(last)}-${pad(lastDay(y, last))}`, due: `${ny}-${pad(nm)}-20` };
}
export type Filed = Record<string, { on: string; cents: number }>;
export type TaxReport = Period & {
  cents: number;                     // to send for this period, with any change to earlier reports
  fromEvents: number; adjust: number;  // the period's own tax, and the change to periods already filed
  notes: number; ended: boolean;
  keep: number;                      // the 0.5% kept for filing on time
  late?: { penalty: number; fee: number };
  lines: { loanId: string; name: string; cents: number; why: TaxEvent['why'][] }[];
};
/** The report to send next: the oldest period that has ended and isn't filed, or the one running now. */
export function nextReport(loans: Loan[], asOf: string, f: TaxFiling, filed: Filed = {}): TaxReport | undefined {
  const all = loans.flatMap(l => taxEvents(l, asOf).map(e => ({ ...e, l, p: periodOf(e.on, f) })));
  if (!all.length) return undefined;
  const open = [...new Set(all.map(e => e.p.key))].filter(k => !filed[k]).map(k => all.find(e => e.p.key === k)!.p).sort((a, b) => a.from.localeCompare(b.from));
  const now = periodOf(asOf, f), p = open.find(x => x.to < asOf) ?? (filed[now.key] ? undefined : now);
  if (!p) return undefined;
  const mine = all.filter(e => e.p.key === p.key), fromEvents = mine.reduce((a, e) => a + e.cents, 0);
  const adjust = Object.entries(filed).reduce((a, [k, v]) => a + all.filter(e => e.p.key === k).reduce((x, e) => x + e.cents, 0) - v.cents, 0);
  const cents = Math.max(0, fromEvents + adjust), ended = p.to < asOf, overdue = asOf > p.due;
  const lines = [...new Set(mine.map(e => e.l.id))].map(id => { const es = mine.filter(e => e.l.id === id); return { loanId: id, name: es[0].l.buyer.name, cents: es.reduce((a, e) => a + e.cents, 0), why: [...new Set(es.map(e => e.why))] }; })
    .sort((a, b) => b.cents - a.cents);
  const days = daysBetween(p.due, asOf);
  return { ...p, cents, fromEvents, adjust, notes: lines.length, ended, keep: overdue ? 0 : Math.round(cents * 0.005), lines,
    late: overdue ? { penalty: Math.round(cents * (days > 30 ? 0.1 : 0.05)), fee: 5000 } : undefined };
}
/** Monthly once a quarter's tax reaches $1,500; quarterly below that. */
export function suggestFiling(loans: Loan[], asOf: string): TaxFiling {
  const q = new Map<string, number>();
  for (const l of loans) for (const e of taxEvents(l, asOf)) { const k = periodOf(e.on, 'quarterly').key; q.set(k, (q.get(k) ?? 0) + e.cents); }
  return [...q.values()].some(c => c >= QUARTERLY_UNDER) ? 'monthly' : 'quarterly';
}
