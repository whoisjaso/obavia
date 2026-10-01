import { describe, expect, it } from 'vitest';
import { bankDays, cashOn, dayState, expected, type CashDay } from './cashday';
import { openLoan, takePayment, type Loan } from './loans';
import type { Money } from './match';

const note = (id: string, name: string, firstDue: string) =>
  openLoan({ id, buyer: { name, phone: '(832) 410-7788' }, vehicle: 'Car', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue, openedOn: '2026-10-01' });
const D = '2026-10-09';
let r = 100;
const pay = (l: Loan, on: string, cents: number, extra: object = {}) => takePayment(l, { on, cents, method: 'cash', ...extra }, ++r);

describe('expected today', () => {
  it('lists who is due or behind, most behind first, and drops anyone who already paid today', () => {
    const due = note('a', 'Ana Due', D), late = note('b', 'Ben Late', '2026-10-02'), paid = pay(note('c', 'Cal Paid', D), D, 12628), later = note('d', 'Dee Later', '2026-10-16');
    const x = expected([due, late, paid, later], D);
    expect(x.map(e => e.loan.id)).toEqual(['b', 'a']);
    expect(x[1]).toMatchObject({ cents: 12628, late: false });
    expect(x[0].late).toBe(true);
  });
});

describe('the cash day', () => {
  const loans = [pay(pay(note('a', 'Ana', D), D, 12628), D, 5000), pay(note('b', 'Ben', D), D, 12628, { via: 'retail_cash' }), takePayment(note('c', 'Cal', D), { on: D, cents: 9900, method: 'zelle' }, 999)];
  it('totals counter cash only, not 7-Eleven cash or Zelle', () => {
    expect(cashOn(loans, D)).toMatchObject({ cents: 17628 });
    expect(cashOn(loans, D).items).toHaveLength(2);
  });
  it('knows a day that is open, counted, short, over, banked or overdue at the bank', () => {
    const day = (counted: number, banked?: string): CashDay => ({ date: D, countedCents: counted, closedAt: D, bankedBy: banked });
    expect(dayState(loans, undefined, D, D)).toBe('open');
    expect(dayState(loans, day(17628), D, D)).toBe('counted');
    expect(dayState(loans, day(17000), D, D)).toBe('short');
    expect(dayState(loans, day(18000), D, D)).toBe('over');
    expect(dayState(loans, day(17628, 'plaid:x'), D, D)).toBe('banked');
    expect(dayState(loans, day(17628), D, '2026-10-13')).toBe('not_banked');
  });
  it('banks a day when a cash deposit equals its count, oldest day first, each deposit once', () => {
    const days: Record<string, CashDay> = {
      '2026-10-08': { date: '2026-10-08', countedCents: 17628, closedAt: '2026-10-08' },
      [D]: { date: D, countedCents: 17628, closedAt: D },
    };
    const m = (id: string, text: string, cents: number, on: string): Money => ({ id, source: 'bank', on, cents, text });
    const r = bankDays([m('x', 'BRANCH DEPOSIT', 17628, '2026-10-10'), m('y', 'MOBILE DEPOSIT', 17628, '2026-10-10'), m('z', 'ZELLE FROM ANA', 17628, '2026-10-10'), m('w', 'CASH DEPOSIT', 17628, '2026-10-11')], days);
    expect(r).toEqual({ x: { date: '2026-10-08', on: '2026-10-10' }, w: { date: D, on: '2026-10-11' } });
  });
});
