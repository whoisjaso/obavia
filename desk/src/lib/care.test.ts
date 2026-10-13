import { describe, expect, it } from 'vitest';
import { addDays, openLoan, reminderPlan, standing, takePayment, type Loan } from './loans';
import { nextCar, readyForNext } from './nextcar';
import { insuranceState } from './insurance';
import { buyerPage } from './buyerpage';
import { creditFile, creditRow, statusCode } from './credit';
import { find } from './find';
import { mergeNote } from './sync';
import type { Sale } from './sale';

const T = '2026-10-02';
const weekly = (id: string, name: string, weeksAgo: number, paidWeeks: number, late = false): Loan => {
  let l = openLoan({ id, buyer: { name, phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 78, frequency: 'weekly', firstDue: addDays(T, -7 * weeksAgo), openedOn: addDays(T, -7 * weeksAgo - 7) });
  for (let k = 0; k < paidWeeks; k++) l = takePayment(l, { on: addDays(l.firstDue, 7 * k + (late && k === 3 ? 20 : 0)), cents: l.paymentCents, method: 'cash' }, 100 + k);
  return l;
};

describe('ready for the next car', () => {
  it('lists a year of on-time payments, best first, and leaves out late or new buyers', () => {
    const good = weekly('a', 'Sam Example', 56, 57), young = weekly('b', 'Ann New', 10, 11), behind = weekly('c', 'Lee Late', 56, 50);
    expect(nextCar(good, T)).toMatchObject({ paid: 57, of: 78, onTime: 1, why: 'Never late' });
    expect(nextCar(young, T)).toBeUndefined();
    expect(nextCar(behind, T)).toBeUndefined();
    const equity = { ...weekly('d', 'Eve Equity', 56, 57), worthCents: 400000 };
    expect(readyForNext([good, young, behind, equity], T).map(x => x.loan.id)).toEqual(['d', 'a']);
    expect(nextCar(equity, T)!.equityCents).toBe(400000 - standing(equity, T).payoffCents);
  });
});

describe('insurance on the car', () => {
  it('knows soon and ended, and texts ten days before and the day after, in their language', () => {
    const l: Loan = { ...weekly('a', 'Maria Example', 4, 5), insurance: { company: 'Progressive', expires: '2026-10-20', updated: T, by: 'desk' } };
    expect(insuranceState(l, T)).toEqual({ state: 'ok', days: 18 });
    expect(insuranceState(l, '2026-10-10').state).toBe('soon');
    expect(insuranceState(l, '2026-10-21').state).toBe('lapsed');
    const ins = reminderPlan(l, standing(l, T), 'Triple J Auto').filter(r => r.kind === 'insurance');
    expect(ins.map(r => r.on)).toEqual(['2026-10-10', '2026-10-21']);
    expect(ins[0].text).toBe('Hi Maria, a reminder from Triple J Auto: the insurance on your 2016 Honda Accord LX ends Tuesday, October 20. Please send us your new insurance card by replying with a photo or from your account page.');
    expect(reminderPlan({ ...l, language: 'es' }, standing(l, T), 'X').find(r => r.kind === 'insurance')!.text).toMatch(/^Hola Maria, X le recuerda: el seguro de su 2016 Honda Accord LX vence el martes, 20 de octubre\./);
    expect(reminderPlan({ ...l, remindersOn: false }, standing(l, T), 'X')).toEqual([]);
  });

  it('keeps the newer card when the buyer sent one from their page', () => {
    const desk: Loan = { ...weekly('a', 'Maria Example', 4, 5), insurance: { company: 'GEICO', expires: '2026-10-05', updated: '2026-09-01', by: 'desk' } };
    const server: Loan = { ...desk, insurance: { company: 'Progressive', expires: '2027-04-05', updated: '2026-10-01', by: 'buyer' }, page: 'https://api.obavia.co/b/a.x' };
    expect(mergeNote(server, desk)).toMatchObject({ insurance: { company: 'Progressive', by: 'buyer' }, page: 'https://api.obavia.co/b/a.x' });
  });
});

describe("the buyer's page", () => {
  it('shows what they owe, their payments and insurance, escaped, in their language', () => {
    const l: Loan = { ...weekly('a', 'Maria <b>Example', 4, 5), language: 'es' };
    const html = buyerPage(l, T, { name: 'Triple J Auto', phone: '(713) 555-0100' }, { action: '/b/a.sig' });
    expect(html).toContain('Hola Maria &lt;b&gt;Example'.split(' ')[0]);
    expect(html).not.toContain('<b>Example');
    expect(html).toContain('Próximo pago');
    expect(html).toContain('Recibo #104');
    expect(html).toContain('action="/b/a.sig"');
    expect(html).toContain('No tenemos seguro registrado.');
    expect(buyerPage(l, T, { name: 'X' }, { sent: true })).toContain('Recibimos su tarjeta de seguro');
  });
});

describe('credit reporting', () => {
  it('maps days past due to Metro 2 codes and builds a 24-month history', () => {
    expect([0, 29, 30, 60, 90, 120, 150, 180].map(statusCode)).toEqual(['11', '11', '71', '78', '80', '82', '83', '84']);
    const good = weekly('a', 'Sam Example', 56, 57);
    const r = creditRow(good, T);
    expect(r.fields).toMatchObject({ 'Account Status': '11', 'Terms Frequency': 'W', 'Portfolio Type': 'I', 'Account Type': '00', 'Surname': 'Example', 'First Name': 'Sam' });
    expect(String(r.fields['Payment History Profile'])).toMatch(/^0{14}B{10}$/);
    expect(r.fields['Scheduled Monthly Payment Amount']).toBe(Math.round(good.paymentCents * 52 / 12 / 100));
    const behind = creditRow(weekly('c', 'Lee Late', 10, 4), T);
    expect(behind.status).toBe('71');
    expect(behind.fields['Date of First Delinquency']).not.toBe('');
    const f = creditFile([good], T);
    expect(f.csv.split('\n')[0]).toContain('Consumer Account Number,Portfolio Type');
    expect(f.rows[0].missing).toContain('Social Security number');
  });
});

describe('find anything', () => {
  it('finds a note by name, phone, receipt or stock, and a sale by VIN', () => {
    const l = weekly('a', 'María Example', 4, 5);
    const sale = { id: 's1', status: 'completed', language: 'en', vehicle: { id: 'v', stock: '220', vin: '1HGCM82633A004352', year: 2019, make: 'Honda', model: 'Civic', bodyStyle: '', price: 0, mileage: 0, emptyWeight: 0, color: '', titleStatus: 'clean' }, buyer: { fullName: 'Jo Buyer', phone: '5550109999' }, step: {}, documents: {}, createdAt: T } as unknown as Sale;
    expect(find('maria', [l], [], [])[0].to).toBe('/payments/a');
    expect(find('7788', [l], [], [])[0].label).toBe('María Example');
    expect(find('#104', [l], [], [])[0].gloss).toBe('Receipt #104');
    expect(find('104', [l], [], [])[0].label).toBe('María Example');
    expect(find('A004352', [l], [sale], [])[0]).toMatchObject({ kind: 'sale', to: '/sale/s1' });
    expect(find('zzz', [l], [sale], [])).toEqual([]);
  });
});
