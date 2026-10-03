import { describe, expect, it } from 'vitest';
import { openLoan, takePayment, type Loan } from './loans';
import { maxReceipt, mergeNote } from './sync';

const note = (): Loan => openLoan({ id: 'n1', buyer: { name: 'Maria Example', phone: '(832) 410-7788' }, vehicle: 'Car', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });

describe('merging the Desk and the server', () => {
  it('keeps payments from both, once each, and the server’s status wins', () => {
    const desk = takePayment(note(), { on: '2026-10-09', cents: 12628, method: 'cash' }, 1001);
    let server = takePayment(note(), { on: '2026-10-16', cents: 12628, method: 'ach', processorId: 'pnm-1', status: 'clearing' }, 1002);
    const deskSawIt = takePayment(desk, { on: '2026-10-16', cents: 12628, method: 'ach', processorId: 'pnm-1', status: 'clearing' }, 1002);
    server = { ...server, payments: server.payments.map(p => ({ ...p, status: 'returned' as const })) };
    const m = mergeNote(server, deskSawIt);
    expect(m.payments.map(p => [p.receipt, p.status ?? 'cleared'])).toEqual([[1001, 'cleared'], [1002, 'returned']]);
    expect(mergeNote(null, desk)).toBe(desk);
    expect(maxReceipt([m])).toBe(1002);
  });
  it('keeps failed charges and complaints the server or Desk recorded', () => {
    const server: Loan = { ...note(), attempts: [{ on: '2026-10-16', cents: 12628, n: 2, via: 'card', result: 'declined', code: '51' }] };
    const desk: Loan = { ...note(), service: [{ on: '2026-10-12', miles: null, what: 'AC warm', kind: 'complaint' }] };
    const m = mergeNote(server, desk);
    expect(m.attempts).toHaveLength(1);
    expect(m.service).toHaveLength(1);
  });
});
