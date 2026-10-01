import { describe, expect, it } from 'vitest';
import { addDays, openLoan, reminderPlan, scheduleDates, standing, takePayment, type Loan } from './loans';
import { activePause, pauseText, pausedDates, previewPause, type Pause } from './pause';
import { extraDue } from './extras';

// Weekly from Friday Oct 9; 52 payments of $126.28.
const base = (): Loan => openLoan({ id: 'L1', buyer: { name: 'Maria Example', phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });
const pause = (from: string, count: number, made = '2026-10-12'): Pause => ({ id: 'p' + from, made, from, count });

describe('pausing payments', () => {
  it('moves the paused payments to the end of the note', () => {
    const l = { ...base(), pauses: [pause('2026-10-16', 2)] };
    const d = scheduleDates(l);
    expect(d.slice(0, 3)).toEqual(['2026-10-09', '2026-10-30', '2026-11-06']);
    expect(d).toHaveLength(52);
    expect(d[51]).toBe(addDays(scheduleDates(base())[51], 14));   // two weeks longer
    expect(pausedDates(l, l.pauses[0])).toEqual(['2026-10-16', '2026-10-23']);
  });

  it('can lift a late payment, so the buyer is current again', () => {
    const paid = takePayment(base(), { on: '2026-10-09', cents: 12628, method: 'cash' }, 1);
    expect(standing(paid, '2026-10-20').status).toBe('late');
    const l = { ...paid, pauses: [pause('2026-10-16', 2, '2026-10-20')] };
    expect(standing(l, '2026-10-20').status).toBe('current');
    expect(standing(l, '2026-10-20').next?.due).toBe('2026-10-30');
  });

  it('sends nothing and charges no fee while paused, and says when payments start again', () => {
    const l: Loan = { ...takePayment(base(), { on: '2026-10-09', cents: 12628, method: 'cash' }, 1), pauses: [pause('2026-10-16', 2)],
      extras: [{ id: 'g', kind: 'fee', what: 'GPS service', cents: 1500, on: '2026-10-10' }] };
    expect(reminderPlan(l, standing(l, '2026-10-12'), 'X').every(r => r.on >= '2026-10-27')).toBe(true);
    expect(extraDue(l, l.extras![0], standing(l, '2026-10-28'))).toBe(0);
    expect(activePause(l, '2026-10-20')?.resume).toBe('2026-10-30');
    expect(activePause(l, '2026-10-30')).toBeUndefined();
    expect(pauseText(l, '2026-10-30', 'Triple J Auto')).toBe('Hi Maria, Triple J Auto has paused your payments. Your next payment is due Friday, October 30. Call us with any questions.');
    expect(pauseText({ ...l, language: 'es' }, '2026-10-30', 'X')).toMatch(/^Hola Maria, X pausó sus pagos\. Su próximo pago vence el viernes, 30 de octubre\./);
  });

  it('shows what a pause costs at the end before it is saved', () => {
    const p = previewPause(base(), '2026-10-16', 2, '2026-10-12');
    expect(p.resume).toBe('2026-10-30');
    expect(p.lastAfter > p.lastBefore).toBe(true);
    expect(p.extraAtEnd).toBeGreaterThan(0);
    expect(p.pausesThisYear).toBe(0);
    const behind = takePayment(base(), { on: '2026-10-09', cents: 12628, method: 'cash' }, 1);
    expect(previewPause(behind, '2026-10-16', 2, '2026-10-20').extraAtEnd).toBeGreaterThan(0);   // already-paid installments aren't paid twice
  });
});
