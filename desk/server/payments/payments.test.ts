import { describe, expect, it } from 'vitest';
import { openLoan, standing } from '../../src/lib/loans';
import { FakeProvider } from '../messaging/fake';
import { Messenger } from '../service';
import { MemoryStore } from '../store';
import { MemoryNoteStore, PaymentDesk } from './desk';
import { ack, parseCallback, verifySignature, SIGNATURE_HEADER } from './paynearme';

const NOTE = () => openLoan({ id: 'note-1', buyer: { name: 'Maria Example', phone: '(832) 410-7788' }, vehicle: '2016 Honda Accord LX · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });
const DEALER = { dealerId: 'P171632', name: 'Triple J Auto', textFrom: '+17135550100', alertTo: ['+17134883602'], timeZone: 'America/Chicago' };
const NOW = () => new Date('2026-10-09T17:00:00Z');

function setup() {
  const p = new FakeProvider(), s = new MemoryStore(), notes = new MemoryNoteStore();
  notes.notes.set('note-1', NOTE());
  const desk = new PaymentDesk(notes, new Messenger(p, s, NOW), async () => DEALER, NOW);
  return { p, s, notes, desk };
}
const form = (o: Record<string, string>) => new URLSearchParams(o).toString();

describe('PayNearMe callbacks', () => {
  it('reads a card payment, a bank payment, a decline and a bank return', () => {
    expect(parseCallback(form({ pnm_order_identifier: '800', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'debit', status: 'payment', pnm_processing_fee: '1.95' })))
      .toMatchObject({ kind: 'payment', processorId: '800', customerId: 'note-1', cents: 12628, method: 'debit', feeCents: 195, status: 'cleared' });
    expect(parseCallback(JSON.stringify({ confirmation: { pnm_order_identifier: '801', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'ach', status: 'payment' } })))
      .toMatchObject({ status: 'clearing', method: 'ach' });
    expect(parseCallback(form({ pnm_order_identifier: '802', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'credit', status: 'decline' }))).toMatchObject({ kind: 'decline', status: 'declined' });
    expect(parseCallback(form({ pnm_order_identifier: '801', site_customer_identifier: 'note-1', payment_amount: '126.28', reverse_type: 'Bank Return', reverse_code: 'R01', reverse_reason: 'Insufficient Funds' })))
      .toMatchObject({ kind: 'reverse', status: 'returned', code: 'R01', reason: 'Insufficient Funds' });
    expect(parseCallback(form({ pnm_order_identifier: '800', reverse_type: 'Chargeback' }))).toMatchObject({ status: 'charged_back' });
    expect(parseCallback('nonsense')).toBeNull();
  });

  it('answers with the acknowledgement PayNearMe documents', () => {
    const u = parseCallback(form({ pnm_order_identifier: '800', status: 'payment', payment_amount: '1' }))!;
    expect(ack(u)).toEqual({ payment_confirmation_response: { version: '3.0', confirmation: { pnm_order_identifier: '800' } } });
  });

  it('checks the HMAC-SHA256 signature over the raw body', async () => {
    const body = form({ pnm_order_identifier: '800' }), secret = 's3cret';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map(b => b.toString(16).padStart(2, '0')).join('');
    expect(await verifySignature(body, new Headers({ [SIGNATURE_HEADER]: sig }), secret)).toBe(true);
    expect(await verifySignature(body + 'x', new Headers({ [SIGNATURE_HEADER]: sig }), secret)).toBe(false);
    expect(await verifySignature(body, new Headers(), secret)).toBe(false);
  });
});

describe('PaymentDesk', () => {
  it('posts a card payment and texts the buyer and the dealership', async () => {
    const { p, notes, desk } = setup();
    const r = await desk.apply(parseCallback(form({ pnm_order_identifier: '800', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'debit', status: 'payment' }))!);
    expect(r).toEqual({ ok: true, event: 'received' });
    expect(standing((await notes.get('note-1'))!, '2026-10-09').installments[0].state).toBe('paid');
    expect(p.sent.map(m => m.to)).toEqual(['+18324107788', '+17134883602']);
    expect(p.sent[0].text).toMatch(/^Triple J Auto: we received your \$126\.28 payment \(receipt #1001\)/);
    expect(p.sent[1].text).toMatch(/^Payment in: \$126\.28 from Maria Example, 2016 Honda Accord LX\./);
  });

  it('ignores a callback sent twice', async () => {
    const { p, notes, desk } = setup();
    const u = parseCallback(form({ pnm_order_identifier: '800', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'debit', status: 'payment' }))!;
    await desk.apply(u); await desk.apply(u);
    expect((await notes.get('note-1'))!.payments).toHaveLength(1);
    expect(p.sent).toHaveLength(2);
  });

  it('a bank payment clears in time, or comes back and both sides hear it', async () => {
    const { p, notes, desk } = setup();
    await desk.apply(parseCallback(form({ pnm_order_identifier: '801', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'ach', status: 'payment' }))!);
    expect(p.sent[0].text).toContain('3 to 4 business days');
    expect((await notes.get('note-1'))!.payments[0].status).toBe('clearing');
    const r = await desk.apply(parseCallback(form({ pnm_order_identifier: '801', site_customer_identifier: 'note-1', payment_amount: '126.28', reverse_type: 'Bank Return', reverse_code: 'R01', reverse_reason: 'Insufficient Funds' }))!);
    expect(r.event).toBe('returned');
    expect((await notes.get('note-1'))!.payments[0]).toMatchObject({ status: 'returned', reverse: { code: 'R01' } });
    expect(p.sent[2].text).toContain('came back from your bank (insufficient funds)');
    expect(p.sent[3].text).toContain('Payment returned: $126.28 from Maria Example');
  });

  it('tells both sides about a decline without touching the ledger', async () => {
    const { p, notes, desk } = setup();
    await desk.apply(parseCallback(form({ pnm_order_identifier: '802', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'credit', status: 'decline' }))!);
    expect((await notes.get('note-1'))!.payments).toHaveLength(0);
    expect(p.sent[0].text).toContain("didn't go through");
  });

  it('never texts a buyer who sent STOP, but still tells the dealership', async () => {
    const { p, s, desk } = setup();
    await s.suppress('P171632', '+18324107788', '2026-10-01', 'keyword');
    await desk.apply(parseCallback(form({ pnm_order_identifier: '800', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'debit', status: 'payment' }))!);
    expect(p.sent.map(m => m.to)).toEqual(['+17134883602']);
  });

  it('refuses an unknown note', async () => {
    const { desk } = setup();
    expect(await desk.apply({ kind: 'payment', processorId: '9', customerId: 'nope', cents: 1, status: 'cleared' })).toEqual({ ok: false, reason: 'unknown_note' });
  });
});
