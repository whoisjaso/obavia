import { describe, expect, it } from 'vitest';
import { evening, hourLabel } from './evening';
import { openLoan, takePayment, type Loan } from './loans';
import { autoPostable, inbox, type Money } from './match';

const D = '2026-10-09';
const note = (id: string, name: string): Loan => openLoan({ id, buyer: { name, phone: '(832) 410-7788' }, vehicle: 'Car', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: D, openedOn: '2026-10-02' });

describe('the evening text', () => {
  it('sums today and names only what needs the owner', () => {
    let a = note('a', 'Ana Paid'); a = takePayment(a, { on: D, cents: 12628, method: 'card', via: 'autopay' }, 1);
    let b = note('b', 'Ben Cash'); b = takePayment(b, { on: D, cents: 12628, method: 'cash' }, 2);
    const c: Loan = { ...note('c', 'Cal Stopped'), attempts: [{ on: D, cents: 12628, n: 1, via: 'bank', result: 'returned', code: 'R08' }] };
    const e = evening({ dealerName: 'Triple J Auto', date: D, loans: [a, b, c], toMatch: 2, cashState: 'open', flaggedDays: 0 });
    expect(e).toMatchObject({ cents: 25256, count: 2, parts: ['1 autopay', '1 cash at the counter'] });
    expect(e.text).toBe('Triple J Auto today: $252.56 in from 2 payments (1 autopay, 1 cash at the counter). 3 things need you: Cal: stopped this payment; 2 payments to match; close the drawer ($126.28 cash).');
  });
  it('says so when nothing needs them, and keeps it short', () => {
    expect(evening({ dealerName: 'Triple J Auto', date: D, loans: [note('a', 'Ana')], toMatch: 0, cashState: 'counted', flaggedDays: 0 }).text)
      .toBe('Triple J Auto today: $0.00 in from 0 payments. Nothing needs you.');
    const many = evening({ dealerName: 'X', date: D, loans: [], toMatch: 4, cashState: 'short', flaggedDays: 2 });
    expect(many.text).toContain('3 things need you: 4 payments to match; today’s cash is short; 2 cash days to look at.');
    expect(hourLabel(19)).toBe('7:00 PM');
  });
});

describe('auto-post', () => {
  it('posts only sure, named payments the owner has not undone', () => {
    const loans = [note('m', 'Maria Example'), note('c', 'Chris Sample')];
    const bank = (id: string, text: string, cents: number): Money => ({ id, source: 'bank', on: D, cents, text });
    const box = inbox([bank('1', 'ZELLE FROM MARIA EXAMPLE', 12628), bank('2', 'ZELLE FROM TIA SAMPLE', 12628), bank('3', 'MOBILE DEPOSIT', 12628)], loans, D, {});
    expect(autoPostable(box).map(s => s.money.id)).toEqual(['1']);
    expect(autoPostable(box, ['1'])).toEqual([]);
  });
});

describe('auto-post in the store', () => {
  it('never posts the same money twice, however often it runs', async () => {
    const store = await import('../store');
    const loans = store.getLoans();
    const l = loans[0], m: Money = { id: 'x1', source: 'bank', on: l.firstDue, cents: l.paymentCents, text: 'ZELLE FROM ' + l.buyer.name.toUpperCase(), from: l.buyer.name.toUpperCase(), rail: 'zelle' };
    const sg = { money: m, best: { loanId: l.id, score: 1, why: [] }, others: [], verdict: 'sure' as const };
    const before = l.payments.length;
    store.runAutoPost([sg]); store.runAutoPost([sg]);
    expect(store.getLoans()[0].payments.length).toBe(before + 1);
    store.undoAutoPost('x1');
    expect(store.getLoans()[0].payments.length).toBe(before);
    store.runAutoPost([sg]);
    expect(store.getLoans()[0].payments.length).toBe(before);   // undone means never auto-posted again
  });
});
