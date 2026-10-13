import { describe, expect, it } from 'vitest';
import { addDays, openLoan, standing, takePayment, type Loan } from './loans';
import { LANE_TITLE_DAYS, TITLE_DAYS, addWorkingDays, laneTitleWatch, nextReport, periodOf, suggestFiling, taxEvents, taxOn, taxRemitDue, taxRemitWatch, taxSent, titleWatch } from './tax';
import { daysBetween } from './loans';

// The Comptroller's example: a $5,000 car, $312.50 of tax, 36 monthly payments, so $8.68 a payment.
const note = (x: Partial<Loan['tax']> = {}): Loan => ({ ...openLoan({ id: 'L1', buyer: { name: 'Maria Example', phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord · Stock 104',
  principalCents: 500000, apr: 0, count: 36, frequency: 'monthly', firstDue: '2026-02-01', openedOn: '2026-01-02' }), tax: { totalCents: taxOn(500000), deferred: true, titleFiled: '2026-01-20', ...x } });
const pay = (l: Loan, on: string, n: number, cents = l.paymentCents) => takePayment(l, { on, cents, method: 'cash' }, n);

describe('Texas tax as payments come in', () => {
  it('sends an even share with each payment, and a part with a part payment', () => {
    let l = note();
    expect(l.tax!.totalCents).toBe(31250);
    l = pay(pay(l, '2026-02-01', 1), '2026-03-01', 2);
    expect(taxEvents(l, '2026-03-31').map(e => e.cents)).toEqual([868, 868]);   // $17.36 after two payments
    l = pay(l, '2026-04-01', 3, Math.round(l.paymentCents / 2));
    expect(taxEvents(l, '2026-04-30')[2].cents).toBe(434);
  });

  it('makes the rest due at once when the title is not filed by day 60, the note is sold, or it is paid off', () => {
    const late = pay(note({ titleFiled: undefined }), '2026-02-01', 1);
    expect(taxEvents(late, '2026-03-02').map(e => [e.on, e.why, e.cents])).toEqual([['2026-02-01', 'payment', 868]]);
    expect(taxEvents(late, '2026-03-04').at(-1)).toEqual({ on: '2026-03-04', cents: 31250 - 868, why: 'title_late' });
    expect(taxSent(late, '2026-12-31')).toBe(31250);
    const sold = pay({ ...note(), tax: { ...note().tax!, transfer: { on: '2026-03-10', toRfc: false } } }, '2026-02-01', 1);
    expect(taxEvents(sold, '2026-03-31').at(-1)).toMatchObject({ why: 'sold', cents: 31250 - 868 });
    const rfc = pay({ ...note(), tax: { ...note().tax!, transfer: { on: '2026-03-10', toRfc: true } } }, '2026-02-01', 1);
    expect(taxSent(rfc, '2026-03-31')).toBe(868);                                // a related finance company changes nothing
    const withRate: Loan = { ...note(), apr: 18, paymentCents: 18076 };          // payoff is less than the payments left, so the rest comes due
    const one = pay(withRate, '2026-02-01', 1), off = pay(one, '2026-02-20', 2, standing(one, '2026-02-20').payoffCents);
    expect(taxEvents(off, '2026-02-28').at(-1)).toMatchObject({ why: 'paid_off', on: '2026-02-20' });
    expect(taxSent(off, '2026-02-28')).toBe(31250);
  });

  it('stops at a repossession: no more tax and no bad-debt deduction', () => {
    const l = { ...pay(pay(note(), '2026-02-01', 1), '2026-03-01', 2), tax: { ...note().tax!, repossessed: '2026-04-15' } };
    expect(taxSent(l, '2026-12-31')).toBe(1736);
  });

  it('never taxes the part of a payment that paid a late charge', () => {
    const l = pay(note(), '2026-03-01', 1, 13889 + 694);                        // February's payment plus its late charge
    expect(taxEvents(l, '2026-03-31')[0].cents).toBe(868);
  });

  it('watches the 45-day title application and the 60-day line', () => {
    const l = note({ titleFiled: undefined });
    expect(titleWatch(l, '2026-01-10')).toMatchObject({ state: 'open', due45: '2026-02-16', left: 37 });
    expect(titleWatch(l, '2026-02-08')?.state).toBe('soon');
    expect(titleWatch(l, '2026-02-20')).toMatchObject({ state: 'overdue', left: 11 });
    expect(titleWatch(l, '2026-03-04')?.state).toBe('accelerated');
    expect(titleWatch(note(), '2026-02-20')?.state).toBe('filed');
  });

  it('builds the report due on the 20th, keeps 0.5% on time, and carries changes to filed months', () => {
    expect(periodOf('2026-02-14', 'monthly')).toMatchObject({ key: '2026-02', due: '2026-03-20', label: 'February 2026' });
    expect(periodOf('2026-11-03', 'quarterly')).toMatchObject({ key: '2026-Q4', to: '2026-12-31', due: '2027-01-20' });
    const l = pay(pay(note(), '2026-02-01', 1), '2026-03-01', 2);
    const r = nextReport([l], '2026-03-05', 'monthly')!;
    expect(r).toMatchObject({ key: '2026-02', cents: 868, ended: true, keep: 4, notes: 1 });
    expect(nextReport([l], '2026-03-25', 'monthly')!.late).toEqual({ penalty: 43, fee: 5000 });
    const next = nextReport([l], '2026-03-05', 'monthly', { '2026-02': { on: '2026-03-04', cents: 800 } })!;
    expect(next).toMatchObject({ key: '2026-03', fromEvents: 868, adjust: 68, cents: 936, ended: false });
    expect(suggestFiling([l], '2026-03-05')).toBe('quarterly');
  });

  it('does nothing for a note whose tax went to the county with the title', () => {
    expect(taxEvents(pay(note({ deferred: false }), '2026-02-01', 1), '2026-12-31')).toEqual([]);
    expect(addDays('2026-01-02', 45)).toBe('2026-02-16');
  });
});

describe('a lane sale: title before day 21, distinct from the 45-day note clock', () => {
  const sold = '2026-10-13';   // a Tuesday
  it('is 21 days, not 45', () => { expect(LANE_TITLE_DAYS).toBe(21); expect(TITLE_DAYS).toBe(45); });
  it('day 20 is the last day; flagged from day 15; overdue on day 21', () => {
    expect(laneTitleWatch(sold, '2026-10-27')).toMatchObject({ state: 'open', day: 14, due: '2026-11-02', left: 6 });
    expect(laneTitleWatch(sold, '2026-10-28')).toMatchObject({ state: 'soon', day: 15, left: 5 });
    expect(laneTitleWatch(sold, '2026-11-02')).toMatchObject({ state: 'soon', day: 20, left: 0 });
    expect(laneTitleWatch(sold, '2026-11-03')).toMatchObject({ state: 'overdue', day: 21 });
  });
  it('stops when the title reaches the buyer', () => {
    expect(laneTitleWatch(sold, '2026-10-30', '2026-10-29').state).toBe('done');
    expect(laneTitleWatch(sold, '2026-10-28', '2026-10-29').state).toBe('soon');
  });
});

describe('tax remittance on a lane sale: the earlier of 20 working days and 30 calendar days', () => {
  it('counts Monday to Friday, no holidays', () => {
    expect(addWorkingDays('2026-10-13', 1)).toBe('2026-10-14');
    expect(addWorkingDays('2026-10-16', 1)).toBe('2026-10-19');   // Friday to Monday
    expect(addWorkingDays('2026-10-13', 20)).toBe('2026-11-10');
    expect(addWorkingDays('2026-10-17', 20)).toBe('2026-11-13');   // a Saturday sale
  });
  it('takes the earlier date, never past day 30', () => {
    expect(taxRemitDue('2026-10-13')).toBe('2026-11-10');
    for (let d = 0; d < 7; d++) { const on = `2026-10-${String(12 + d).padStart(2, '0')}`; expect(daysBetween(on, taxRemitDue(on))).toBeLessThanOrEqual(30); }
  });
  it('flags from day 15 and stops when sent', () => {
    expect(taxRemitWatch('2026-10-13', '2026-10-27').state).toBe('open');
    expect(taxRemitWatch('2026-10-13', '2026-10-28').state).toBe('soon');
    expect(taxRemitWatch('2026-10-13', '2026-11-11').state).toBe('overdue');
    expect(taxRemitWatch('2026-10-13', '2026-11-11', '2026-11-09').state).toBe('done');
  });
});
