import { describe, expect, it } from 'vitest';
import { abaOk, authorization, chargeDay, checkCard, luhn, nextTry, paydayHint, read, signal, timeline, type Attempt, type LoanX } from './autopay';
import { openLoan, takePayment } from './loans';

const D = '2026-10-09';   // a Friday
const loan = (): LoanX => openLoan({ id: 'm', buyer: { name: 'Maria Example', phone: '(832) 410-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: D, openedOn: '2026-10-02' });
const att = (on: string, code: string, n = 1, result: Attempt['result'] = 'declined'): Attempt => ({ on, cents: 12628, n, via: code.startsWith('R') && code.length === 3 ? 'bank' : 'card', result, code });

describe('saving a card or bank account', () => {
  it('checks the number, expiry, and refuses credit, prepaid and blocked issuers', () => {
    expect(luhn('4000 0566 5566 5556')).toBe(true);
    expect(luhn('4000 0566 5566 5557')).toBe(false);
    const card = { number: '4000056655665556', exp: '12/28', funding: 'debit' as const };
    expect(checkCard(card, D)).toEqual({ ok: true });
    expect(checkCard({ ...card, exp: '09/26' }, D)).toEqual({ ok: false, why: 'expired' });
    expect(checkCard({ ...card, funding: 'prepaid' }, D)).toEqual({ ok: false, why: 'prepaid' });
    expect(checkCard({ ...card, funding: 'credit' }, D)).toEqual({ ok: false, why: 'credit' });
    expect(checkCard({ ...card, issuer: 'The Bancorp Bank' }, D, ['bancorp'])).toEqual({ ok: false, why: 'blocked' });
    expect(abaOk('011000015')).toBe(true);
    expect(abaOk('011000016')).toBe(false);
  });
  it('charges on the first payday on or after the due date', () => {
    expect(chargeDay(D)).toBe(D);
    expect(chargeDay(D, 5)).toBe(D);                  // due Friday, paid Friday
    expect(chargeDay('2026-10-12', 5)).toBe('2026-10-16');
    expect(chargeDay('2026-10-12', 1)).toBe('2026-10-12');
  });
  it('writes an authorization that says autopay is optional', () => {
    const t = authorization('Triple J Auto', '(713) 555-0100', loan(), { kind: 'card', brand: 'Visa', last4: '5556', funding: 'debit', exp: '12/28' }, 5);
    expect(t).toContain('Visa debit card ending 5556 $126.28 on the first Friday on or after each due date');
    expect(t).toContain('optional and was not required');
  });
});

describe('reading a failed charge', () => {
  it('tells can’t-pay from won’t-pay', () => {
    expect(read(att(D, '51')).reading).toBe('cant');
    expect(read(att(D, 'R01')).reading).toBe('cant');
    expect(read(att(D, 'R08')).reading).toBe('wont');
    expect(read(att(D, 'R1')).reading).toBe('wont');
    expect(read(att(D, '41')).reading).toBe('wont');
    expect(read(att(D, 'xx', 1, 'charged_back')).label).toBe('Disputed the charge');
    expect(read(att(D, '54')).reading).toBe('fix');
  });
  it('retries only no-money codes, on payday, at most twice per payment', () => {
    expect(nextTry(att(D, '51'), [att(D, '51')], 5)).toBe('2026-10-16');
    expect(nextTry(att(D, '51'), [att(D, '51')])).toBe('2026-10-12');
    expect(nextTry(att(D, 'R08'), [att(D, 'R08')])).toBeNull();
    const three = [att(D, '51'), att('2026-10-12', '51'), att('2026-10-15', '51')];
    expect(nextTry(three[2], three)).toBeNull();
  });
});

describe('what the owner sees', () => {
  it('red for on purpose, amber for short on money, good for clean autopay', () => {
    const l = loan();
    expect(signal(l, D).tone).toBe('none');
    expect(signal({ ...l, autopay: { on: true, history: [] } }, D)).toEqual({ tone: 'good', headline: 'Autopay on' });
    expect(signal({ ...l, attempts: [att(D, '51'), att('2026-10-12', '51')] }, '2026-10-13')).toMatchObject({ tone: 'amber', headline: 'Short on money · 2 declines' });
    expect(signal({ ...l, attempts: [att(D, '51'), att('2026-10-12', 'R08')] }, '2026-10-13')).toMatchObject({ tone: 'red', headline: 'Stopped this payment' });
    expect(signal({ ...l, autopay: { on: false, history: [{ on: D, event: 'removed' }] } }, '2026-10-13')).toMatchObject({ tone: 'red', headline: 'Took their card off autopay' });
    expect(signal({ ...l, attempts: [att(D, 'R08')] }, '2026-12-20').tone).toBe('none');   // old news after 60 days
  });
  it('spots a buyer who always pays a few days late on the same weekday', () => {
    let l: LoanX = { ...loan(), attempts: [att(D, '51', 1), att('2026-10-16', '51', 2)] };
    l = takePayment(takePayment(l, { on: '2026-10-11', cents: 12628, method: 'card' }, 1), { on: '2026-10-18', cents: 12628, method: 'card' }, 2);
    expect(paydayHint(l)).toBe(0);   // Sundays
    expect(timeline(l).map(m => m.tone)).toEqual(['good', 'amber', 'good', 'amber']);
  });
});
