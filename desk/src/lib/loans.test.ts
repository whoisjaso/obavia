import { describe, expect, it } from 'vitest';
import { addDays, amountToAsk, digest, dueDates, installmentCents, openLoan, ownerText, paymentTexts, receiptText, reminderPlan, standing, takePayment, today, updatePayment, type Loan } from './loans';

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

describe('payments through a processor', () => {
  const online = (l: Loan, on: string, cents: number, status: 'clearing' | 'cleared', id: string) => takePayment(l, { on, cents, method: 'ach', status, processorId: id, via: 'text_link' }, ++r);

  it('a clearing bank payment counts, and a returned one stops counting', () => {
    let l = online(base(), '2026-10-09', 12628, 'clearing', 'pnm-1');
    expect(standing(l, '2026-10-09').installments[0].state).toBe('paid');
    l = updatePayment(l, 'pnm-1', 'returned', { on: '2026-10-13', code: 'R01', reason: 'Insufficient Funds' });
    const s = standing(l, '2026-10-13');
    expect(s.installments[0].state).toBe('late');
    expect(s.pastDueCents).toBe(12628);
    expect(l.payments[0].reverse?.code).toBe('R01');
    expect(updatePayment(l, 'nope', 'cleared')).toEqual(l);
  });

  it('texts the buyer and the dealership on every change', () => {
    const l = online(base(), '2026-10-09', 12628, 'cleared', 'pnm-2'), s = standing(l, '2026-10-09');
    const got = paymentTexts('received', l, 12628, s, 'Triple J Auto', 1201);
    expect(got.buyer).toMatch(/^Triple J Auto: we received your \$126\.28 payment \(receipt #1201\)\. Balance \$[\d,.]+\. Next payment \$126\.28 due Friday, October 16\.$/);
    expect(got.dealer).toBe(`Payment in: $126.28 from Maria Example, 2016 Honda Accord LX. Balance ${'$' + (s.payoffCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
    const back = paymentTexts('returned', l, 12628, standing(updatePayment(l, 'pnm-2', 'returned'), '2026-10-13'), 'Triple J Auto', undefined, 'Insufficient Funds');
    expect(back.buyer).toContain('came back from your bank (insufficient funds)');
    expect(back.dealer).toContain('Payment returned: $126.28 from Maria Example');
    expect(paymentTexts('charged_back', l, 12628, s, 'X').buyer).toBeUndefined();
    expect(paymentTexts('clearing', l, 12628, s, 'Triple J Auto').buyer).toContain('3 to 4 business days');
  });
});

describe('a buyer in Spanish', () => {
  const es = (): Loan => ({ ...base(), language: 'es' });
  it('gets every reminder in Spanish, with Spanish dates', () => {
    const plan = reminderPlan(es(), standing(es(), '2026-10-01'), 'Triple J Auto');
    expect(plan[0].text).toBe('Hola Maria, un recordatorio de Triple J Auto: su pago de $126.28 vence el viernes, 9 de octubre.');
    expect(plan.map(r => r.text).join(' ')).not.toMatch(/\bHi\b|payment/);
  });
  it('gets receipts and payment texts in Spanish, while the dealership’s copy stays English', () => {
    const l = pay(es(), '2026-10-09', 12628), s = standing(l, '2026-10-09');
    expect(receiptText(l, l.payments[0], s, 'Triple J Auto')).toMatch(/^Triple J Auto recibo #\d+: recibimos \$126\.28 en efectivo el viernes, 9 de octubre por el 2016 Honda Accord LX\./);
    const t = paymentTexts('received', l, 12628, s, 'Triple J Auto', 1201);
    expect(t.buyer).toMatch(/^Triple J Auto: recibimos su pago de \$126\.28 \(recibo #1201\)\. Saldo /);
    expect(t.dealer).toMatch(/^Payment in: \$126\.28 from Maria Example/);
    expect(paymentTexts('charged_back', l, 12628, s, 'X').buyer).toBeUndefined();
  });
});

