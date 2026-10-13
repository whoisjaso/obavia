import { describe, expect, it } from 'vitest';
import { openLoan, takePayment, type Loan } from './loans';
import { fromReceipt, inbox, kindOf, nameScore, railOf, read, senderOf, suggest, type Money } from './match';

const note = (id: string, name: string, firstDue = '2026-10-09') =>
  openLoan({ id, buyer: { name, phone: '(832) 410-7788' }, vehicle: 'Car', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue, openedOn: '2026-10-02' });
const maria = note('m', 'Maria Example'), chris = note('c', 'Chris Sample'), jordan = note('j', 'Jordan Rivera');
const loans: Loan[] = [maria, chris, jordan];
const ON = '2026-10-09';
const bank = (id: string, text: string, cents: number, on = ON): Money => ({ id, source: 'bank', on, cents, text });

describe('reading a line', () => {
  it('knows the rail and the sender from the bank description', () => {
    expect(read(bank('1', 'ZELLE FROM MARIA EXAMPLE ON 10/09 REF # PNC0A1B2', 12628))).toMatchObject({ rail: 'zelle', from: 'MARIA EXAMPLE' });
    expect(read(bank('2', 'Zelle payment from JORDAN RIVERA Conf# 4h2k', 12628))).toMatchObject({ rail: 'zelle', from: 'JORDAN RIVERA' });
    expect(railOf('MOBILE DEPOSIT REF 0019')).toBe('check');
    expect(railOf('BRANCH CASH DEPOSIT')).toBe('cash');
    expect(senderOf('MOBILE DEPOSIT REF 0019')).toBeUndefined();
  });
  it('reads Cash App and Venmo receipt emails, which name the payer', () => {
    expect(fromReceipt('e1', ON, 'Maria Example sent you $126.28')).toMatchObject({ source: 'email', cents: 12628, from: 'MARIA EXAMPLE' });
    expect(fromReceipt('e2', ON, 'Chris Sample paid you $1,262.80')).toMatchObject({ cents: 126280, from: 'CHRIS SAMPLE' });
    expect(fromReceipt('e3', ON, 'Your weekly summary')).toBeNull();
    expect(fromReceipt('e4', ON, 'Maria Example sent you $126.28', 'cash@square.com')?.rail).toBe('cash_app');
    expect(fromReceipt('e5', ON, 'Maria Example paid you $126.28', 'venmo@venmo.com')?.rail).toBe('venmo');
  });
  it('sets aside lump cash-outs, processor settlements and money going out', () => {
    expect(kindOf(bank('1', 'CASH APP*CASH OUT', 50000))).toBe('cash_out');
    expect(kindOf(bank('2', 'VENMO CASHOUT PPD ID 1234', 30000))).toBe('cash_out');
    expect(kindOf(bank('3', 'PAYNEARME SETTLEMENT', 88000))).toBe('processor');
    expect(kindOf(bank('4', 'AUTO AUCTION PURCHASE', -400000))).toBe('outflow');
    expect(kindOf(bank('5', 'ZELLE FROM MARIA EXAMPLE', 12628))).toBe('payment');
  });
});

describe('matching', () => {
  it('scores names: full, initial and last, last only, first only', () => {
    expect(nameScore('MARIA EXAMPLE', 'Maria Example')).toBe(1);
    expect(nameScore('M EXAMPLE', 'Maria Example')).toBe(0.85);
    expect(nameScore('TIA EXAMPLE', 'Maria Example')).toBe(0.55);
    expect(nameScore('MARIA LOPEZ', 'Maria Example')).toBe(0.3);
  });
  it('is sure of a Zelle from the buyer for the installment', () => {
    const s = suggest(read(bank('1', 'ZELLE FROM MARIA EXAMPLE ON 10/09', 12628)), loans, ON);
    expect(s.verdict).toBe('sure');
    expect(s.best).toMatchObject({ loanId: 'm', why: ['name matches', 'amount is what they owe'] });
  });
  it('is only likely when a relative pays, until the dealer confirms them once', () => {
    const m = read(bank('1', 'ZELLE FROM TIA SAMPLE', 12628));
    expect(suggest(m, loans, ON)).toMatchObject({ verdict: 'likely', best: { loanId: 'c' } });
    expect(suggest(m, loans, ON, { 'TIA SAMPLE': 'c' })).toMatchObject({ verdict: 'sure', best: { loanId: 'c', why: ['paid this note before', 'amount is what they owe'] } });
  });
  it('never claims to be sure of a nameless check', () => {
    const s = suggest(read(bank('1', 'MOBILE DEPOSIT REF 0019', 12628)), loans, ON);
    expect(s.verdict).not.toBe('sure');
    expect(s.others.length + 1).toBe(3);
  });
  it('rules out a note the amount could not belong to', () => {
    let paid = maria;
    for (let i = 0; i < 52; i++) paid = takePayment(paid, { on: ON, cents: 20000, method: 'cash' }, 9000 + i);
    const s = suggest(read(bank('1', 'ZELLE FROM MARIA EXAMPLE', 12628)), [paid, chris], ON);
    expect(s.best?.loanId).not.toBe('m');
  });
});

describe('the inbox', () => {
  it('keeps each payment once, drops lumps and settlements, skips what is matched, sure ones first', () => {
    const all: Money[] = [
      bank('b1', 'MOBILE DEPOSIT REF 0019', 50000),
      bank('b2', 'ZELLE FROM JORDAN RIVERA ON 10/09', 12628),
      fromReceipt('e2', ON, 'Jordan Rivera sent you $126.28 with Zelle')!,   // the same Zelle, seen in the email too
      bank('b3', 'CASH APP*CASH OUT', 25256),
      fromReceipt('e3', ON, 'Maria Example sent you $126.28')!,             // what was inside that Cash App lump
      bank('b4', 'PAYNEARME SETTLEMENT', 12628),
      { ...bank('b5', 'ZELLE FROM CHRIS SAMPLE', 12628), pending: true },
      bank('b6', 'ZELLE FROM CHRIS SAMPLE', 12628, '2026-10-08'),
    ];
    const box = inbox(all, loans, ON, { b6: { loanId: 'c' } });
    expect(box.map(s => s.money.id)).toEqual(['b2', 'e3', 'b1']);
    expect(box.map(s => s.verdict)).toEqual(['sure', 'sure', 'unsure']);
  });
});
