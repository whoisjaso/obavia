import { describe, expect, it } from 'vitest';
import { addDays, amountToAsk, digest, dueDates, installmentCents, openLoan, ownerText, receiptText, reminderPlan, standing, takePayment, today, type Loan } from './loans';

const base = () => openLoan({ id: 'L1', buyer: { name: 'Maria Example', phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });
let r = 0;
const pay = (l: Loan, on: string, cents: number) => takePayment(l, { on, cents, method: 'cash' }, ++r);

describe('schedule', () => {
  it('levels the installment and lays out the due dates', () => {
    expect(installmentCents(600000, 18, 52, 'weekly')).toBe(12628);
    expect(installmentCents(120000, 0, 12, 'monthly')).toBe(10000);
    expect(dueDates('2026-10-09', 3, 'weekly')).toEqual(['2026-10-09', '2026-10-16', '2026-10-23']);
    expect(dueDates('2026-10-09', 3, 'biweekly')).toEqual(['2026-10-09', '2026-10-23', '2026-11-06']);
    expect(dueDates('2026-01-31', 3, 'monthly')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(dueDates('2026-10-01', 4, 'semimonthly')).toEqual(['2026-10-01', '2026-10-16', '2026-11-01', '2026-11-16']);
    expect(dueDates('2026-10-20', 3, 'semimonthly')).toEqual(['2026-10-20', '2026-11-05', '2026-11-20']);
  });
});

describe('standing', () => {
  it('is current before the first due date, and due on it', () => {
    const l = base();
    expect(standing(l, '2026-10-05').status).toBe('current');
    const s = standing(l, '2026-10-09');
    expect(s.status).toBe('due_today');
    expect(amountToAsk(s)).toBe(12628);
  });

  it('pays interest first, then principal, by the day', () => {
    const l = pay(base(), '2026-10-09', 12628);
    const s = standing(l, '2026-10-09');
    // 7 days at 18% on $6,000 = $20.71 interest; the rest goes to principal.
    expect(s.interestPaidCents).toBe(2071);
    expect(s.principalCents).toBe(600000 - (12628 - 2071));
    expect(s.installments[0].state).toBe('paid');
    expect(s.status).toBe('current');
    expect(s.next).toEqual({ n: 2, due: '2026-10-16', cents: 12628 });
  });

  it('counts days late from the oldest unpaid installment', () => {
    const s = standing(base(), '2026-10-19');
    expect(s.status).toBe('late');
    expect(s.daysLate).toBe(10);
    expect(s.pastDueCents).toBe(2 * 12628);
    expect(s.feesOwedCents).toBe(0);                     // not yet past the 15th day
  });

  it('charges 5% once, only after the 15th day (Texas §348.107)', () => {
    expect(standing(base(), '2026-10-24').feesOwedCents).toBe(0);          // day 15
    const s = standing(base(), '2026-10-25');                               // day 16
    expect(s.feesOwedCents).toBe(631);                                      // 5% of $126.28, rounded
    expect(standing(base(), '2026-11-30').installments[0].lateFeeCents).toBe(631); // still once
  });

  it('a late payment pays the late charge first and is marked paid late', () => {
    const l = pay(base(), '2026-10-26', 12628 + 631);
    const s = standing(l, '2026-10-26');
    expect(s.feesPaidCents).toBe(631);
    expect(s.installments[0].state).toBe('paid_late');
    expect(s.installments[1].state).toBe('late');   // the second was due the 16th
  });

  it('a partial payment leaves the installment partial and the rest past due', () => {
    const l = pay(base(), '2026-10-09', 5000);
    const s = standing(l, '2026-10-12');
    expect(s.installments[0].state).toBe('partial');
    expect(s.pastDueCents).toBe(7628);
    expect(s.status).toBe('late');
  });

  it('a payoff closes the note', () => {
    const l0 = base(), s0 = standing(l0, '2026-10-20');
    const l = pay(l0, '2026-10-20', s0.payoffCents);
    const s = standing(l, '2026-10-20');
    expect(s.status).toBe('paid_off');
    expect(s.payoffCents).toBe(0);
    expect(s.next).toBeUndefined();
  });

  it('never pays interest on interest', () => {
    // A tiny payment that does not cover the interest: the unpaid interest carries, the principal does not grow.
    const l = pay(base(), '2026-10-08', 100);
    const s = standing(l, '2026-10-08');
    expect(s.principalCents).toBe(600000);
    expect(s.accruedCents).toBe(Math.round(600000 * 0.18 * 6 / 365) - 100);
    // a week later the carried interest is still owed, and new interest is only on the principal
    expect(standing(l, '2026-10-15').accruedCents).toBe(Math.round(600000 * 0.18 * 6 / 365) - 100 + Math.round(600000 * 0.18 * 7 / 365));
  });

  it('refuses a zero payment', () => {
    expect(() => pay(base(), '2026-10-09', 0)).toThrow();
  });
});

describe('reminders and receipts', () => {
  it('plans at most four texts per installment, from three days before', () => {
    const l = base();
    const plan = reminderPlan(l, standing(l, '2026-10-01'), 'Triple J Auto');
    expect(plan.map(x => [x.on, x.kind])).toEqual([['2026-10-06', 'before'], ['2026-10-09', 'due'], ['2026-10-12', 'late'], ['2026-10-22', 'late_fee']]);
    expect(plan[0].text).toContain('$126.28');
    expect(plan[0].text).toContain('Friday, October 9');
    expect(reminderPlan({ ...l, remindersOn: false }, standing(l, '2026-10-01'), 'X')).toEqual([]);
    // 20 days late: past every step, so one text a week on the weekday it fell due
    const late = reminderPlan(l, standing(l, '2026-10-29'), 'Triple J Auto');
    expect(late.map(x => [x.on, x.kind])).toEqual([['2026-10-30', 'late']]);
    expect(late[0].text).toContain('past due');
  });

  it('writes a receipt for every payment (Texas §348.406)', () => {
    const l = pay(base(), '2026-10-09', 12628), p = l.payments[0];
    const t = receiptText(l, p, standing(l, '2026-10-09'), 'Triple J Auto');
    expect(t).toMatch(/^Triple J Auto receipt #\d+: received \$126\.28 by cash on Friday, October 9 for the 2016 Honda Accord LX\. Balance \$/);
    expect(t).toContain('Next payment $126.28 due Friday, October 16.');
  });

  it('gives the owner a morning digest', () => {
    const late = base(), due = { ...base(), id: 'L2', firstDue: '2026-10-19' }, paid = pay({ ...base(), id: 'L3', firstDue: '2026-10-19' }, '2026-10-19', 12628);
    const d = digest([late, due, paid], '2026-10-19');
    expect(d.late.map(x => x.loan.id)).toEqual(['L1']);
    expect(d.dueToday.map(x => x.loan.id)).toEqual(['L2']);
    expect(d.collectedCents).toBe(12628);
    expect(ownerText(d, 'Triple J Auto')).toBe('Triple J Auto today: 1 due ($126.28), 1 late ($252.56). Collected so far: $126.28.');
  });

  it('reads today in the dealer’s zone, not UTC', () => {
    expect(today('America/Chicago', new Date('2026-10-02T03:00:00Z'))).toBe('2026-10-01');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
});
