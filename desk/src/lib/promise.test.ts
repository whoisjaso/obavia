import { describe, expect, it } from 'vitest';
import { openLoan, reminderPlan, standing, takePayment, type Loan } from './loans';
import { brokenPromises, openPromise, promiseDays, promiseState, type PayPromise } from './promise';
import { signal } from './autopay';
import { evening } from './evening';

const base = (): Loan => openLoan({ id: 'L1', buyer: { name: 'Maria Example', phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });
const promise = (made: string, on: string, cents = 25000, id = 'p' + on): PayPromise => ({ id, made, on, cents });
const pay = (l: Loan, on: string, cents: number, r = 1) => takePayment(l, { on, cents, method: 'cash' }, r);

describe('promise to pay', () => {
  it('waits, falls due, and is kept by money paid between the promise and the day', () => {
    const l = { ...base(), promises: [promise('2026-10-09', '2026-10-12')] };
    expect(promiseState(l, l.promises[0], '2026-10-10')).toBe('waiting');
    expect(promiseState(l, l.promises[0], '2026-10-12')).toBe('today');
    expect(promiseState(l, l.promises[0], '2026-10-13')).toBe('broken');
    expect(promiseState(pay(l, '2026-10-12', 10000), l.promises[0], '2026-10-13')).toBe('partly');
    expect(promiseState(pay(l, '2026-10-11', 25000), l.promises[0], '2026-10-11')).toBe('kept');
    expect(promiseState(pay(l, '2026-10-08', 25000), l.promises[0], '2026-10-13')).toBe('broken');   // paid before the promise was made: not toward it
  });

  it('holds the late texts while a promise stands, with one reminder the morning it is due', () => {
    const late = { ...base(), firstDue: '2026-10-02' };
    const asOf = '2026-10-03', s = standing(late, asOf);
    expect(reminderPlan(late, s, 'Triple J Auto').some(r => r.kind === 'late')).toBe(true);
    const l = { ...late, promises: [promise('2026-10-03', '2026-10-09')] };
    const plan = reminderPlan(l, standing(l, asOf), 'Triple J Auto');
    expect(plan.some(r => r.kind === 'late')).toBe(false);
    expect(plan.find(r => r.kind === 'promise')).toMatchObject({ on: '2026-10-09', text: 'Hi Maria, a reminder from Triple J Auto: today is the day we agreed for your $250.00 payment. Thank you.' });
    expect(reminderPlan({ ...l, language: 'es' }, standing(l, asOf), 'X').find(r => r.kind === 'promise')!.text).toMatch(/^Hola Maria/);
    expect(openPromise(l, '2026-10-10')).toBeUndefined();   // passed: the normal texts resume
  });

  it('a broken promise flags amber, two in 60 days flag red, and the evening text says so the next day', () => {
    const one = { ...base(), promises: [promise('2026-10-05', '2026-10-09')] };
    expect(signal(one, '2026-10-10')).toMatchObject({ tone: 'amber', headline: 'Broke a promise' });
    const two = { ...one, promises: [...one.promises, promise('2026-10-12', '2026-10-16')] };
    expect(brokenPromises(two, '2026-10-17')).toHaveLength(2);
    expect(signal(two, '2026-10-17')).toMatchObject({ tone: 'red', headline: 'Broke 2 promises' });
    expect(evening({ dealerName: 'X', date: '2026-10-17', loans: [two], toMatch: 0, cashState: 'counted', flaggedDays: 0 }).needs[0]).toBe('Maria: broke a promise');
  });

  it('offers the days a buyer names: today, tomorrow, Friday, Monday and their payday', () => {
    expect(promiseDays('2026-10-07')).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12']);   // a Wednesday
    expect(promiseDays('2026-10-07', 4)).toContain('2026-10-08');
  });
});
