import { describe, expect, it } from 'vitest';
import { amountToAsk, noteCents, openLoan, paymentTexts, reminderPlan, standing, type Loan } from './loans';
import { applyPayment, askTotal, extraDue, perPayment, repairLeft, split, type Extra } from './extras';
import { authorization } from './autopay';
import { expected } from './cashday';

// Weekly, $126.28 a payment, first due Friday Oct 9.
const base = (): Loan => openLoan({ id: 'L1', buyer: { name: 'Maria Example', phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });
const gps: Extra = { id: 'gps', kind: 'fee', what: 'GPS service', cents: 1500, on: '2026-10-02' };
const trans: Extra = { id: 'tr', kind: 'repair', what: 'transmission repair', cents: 64000, on: '2026-10-02', perPayment: 4000 };
const tires: Extra = { id: 'ti', kind: 'repair', what: 'tires', cents: 30000, on: '2026-10-02' };

describe('repairs and fees beside the note', () => {
  it('owes a fee with every installment due, and a scheduled repair payment with it', () => {
    const l = { ...base(), extras: [gps, trans, tires] };
    const s = standing(l, '2026-10-16');                       // two installments due
    expect(extraDue(l, gps, s)).toBe(3000);
    expect(extraDue(l, trans, s)).toBe(8000);
    expect(extraDue(l, tires, s)).toBe(0);                     // on its own: owed, not scheduled
    expect(askTotal(l, s)).toBe(amountToAsk(s) + 11000);
    expect(perPayment(l, '2026-10-23')).toBe(5500);
  });

  it('pays the note first, then extras due, and never lets a fee make the buyer late', () => {
    let l: Loan = { ...base(), extras: [gps, trans] };
    l = applyPayment(l, { on: '2026-10-09', cents: 12628 + 5500, method: 'cash' }, 1);
    expect(l.payments[0].toExtras).toEqual({ gps: 1500, tr: 4000 });
    expect(noteCents(l.payments[0])).toBe(12628);
    expect(standing(l, '2026-10-09').status).toBe('current');
    // short: only the note gets paid
    let short: Loan = { ...base(), extras: [gps] };
    short = applyPayment(short, { on: '2026-10-09', cents: 12628, method: 'cash' }, 1);
    expect(short.payments[0].toExtras).toBeUndefined();
    expect(standing(short, '2026-10-09').status).toBe('current');
    expect(extraDue(short, gps, standing(short, '2026-10-09'))).toBe(1500);
  });

  it('can send a payment to one repair, and stops a fee from a day on', () => {
    let l: Loan = { ...base(), extras: [tires, { ...gps, stop: '2026-10-10' }] };
    l = applyPayment(l, { on: '2026-10-05', cents: 10000, method: 'cash' }, 1, 'ti');
    expect(split(l, 50000, '2026-10-05', 'ti')).toEqual({ ti: 20000 });
    expect(repairLeft(l, tires)).toBe(20000);
    expect(extraDue(l, l.extras![1], standing(l, '2026-10-30'))).toBe(1500);   // owed for Oct 9 only
  });

  it('carries the extras into the amount asked, reminders, receipts and the autopay authorization', () => {
    const l = { ...base(), extras: [gps, tires] };
    expect(expected([{ ...l, firstDue: '2026-10-02' }], '2026-10-02')[0].cents).toBe(12628 + 1500);
    expect(reminderPlan(l, standing(l, '2026-10-01'), 'X')[0].text).toContain('$141.28');
    const paid = applyPayment(l, { on: '2026-10-09', cents: 14128, method: 'cash' }, 9);
    expect(paymentTexts('received', paid, 14128, standing(paid, '2026-10-09'), 'X', 9).buyer).toMatch(/Of this payment, \$15\.00 to GPS service\. Repairs balance \$300\.00\.$/);
    const repair = applyPayment(l, { on: '2026-10-05', cents: 30000, method: 'cash' }, 10, 'ti');
    const tx = paymentTexts('received', repair, 30000, standing(repair, '2026-10-05'), 'X', 10);
    expect(tx.buyer).toMatch(/Of this payment, \$300\.00 to tires\. Repairs balance \$0\.00\.$/);
    expect(tx.dealer).toMatch(/^Payment in: \$300\.00 from Maria Example \(\$300\.00 to tires\), /);
    expect(authorization('X', 'Y', l, { kind: 'card', brand: 'Visa', last4: '5556', funding: 'debit', exp: '12/28' }))
      .toContain('$141.28 ($126.28 for the car payment and $15.00 GPS service)');
  });
});
