/* When money moves, the ledger changes and both sides hear about it:
   the buyer gets a receipt or a heads-up, the dealership gets the same news.
   Texts go through the Messenger, so STOP, the compliance gate and the log
   all apply. Payment texts are first-party account messages (the dealer
   about its own note), never third-party collection. */
import { paymentTexts, standing, takePayment, today, updatePayment, type Loan, type Method, type PaymentEvent } from '../../src/lib/loans';
import type { Messenger } from '../service';
import type { PaymentUpdate } from './paynearme';

export interface NoteStore {
  get(noteId: string): Promise<Loan | null>;
  save(note: Loan): Promise<void>;
  nextReceipt(dealerId: string): Promise<number>;
}
export type DealerContact = { dealerId: string; name: string; textFrom: string; alertTo: string[]; timeZone: string };

const METHOD: Record<NonNullable<PaymentUpdate['method']>, Method> = { ach: 'ach', cash: 'cash', cash_app: 'cash_app', credit: 'card', debit: 'card', paypal: 'paypal', other: 'other' };

export class PaymentDesk {
  constructor(private notes: NoteStore, private messenger: Messenger, private dealerOf: (note: Loan) => Promise<DealerContact | null>, private clock: () => Date = () => new Date()) {}

  /** Apply one processor update. Returns what changed, for the log. */
  async apply(u: PaymentUpdate): Promise<{ ok: boolean; event?: PaymentEvent; reason?: string }> {
    const note = await this.notes.get(u.customerId);
    if (!note) return { ok: false, reason: 'unknown_note' };
    const dealer = await this.dealerOf(note);
    if (!dealer) return { ok: false, reason: 'unknown_dealer' };
    const t = today(dealer.timeZone, this.clock());
    let next = note, event: PaymentEvent, receipt: number | undefined;

    if (u.kind === 'payment') {
      if (note.payments.some(p => p.processorId === u.processorId)) return { ok: true };   // a re-sent callback
      receipt = await this.notes.nextReceipt(dealer.dealerId);
      next = takePayment(note, { on: u.at ? today(dealer.timeZone, new Date(u.at)) : t, cents: u.cents, method: METHOD[u.method ?? 'other'], status: u.status === 'clearing' ? 'clearing' : 'cleared', processorId: u.processorId, via: 'text_link' }, receipt);
      event = u.status === 'clearing' ? 'clearing' : 'received';
    } else if (u.kind === 'decline') {
      event = 'declined';
    } else {
      const was = note.payments.find(p => p.processorId === u.processorId);
      if (!was) return { ok: false, reason: 'unknown_payment' };
      if (was.status === u.status) return { ok: true };                                   // already applied
      next = updatePayment(note, u.processorId, u.status as 'returned' | 'refunded' | 'charged_back', { on: t, code: u.code, reason: u.reason });
      event = u.status === 'charged_back' ? 'charged_back' : u.status === 'refunded' ? 'refunded' : 'returned';
    }

    if (next !== note) await this.notes.save(next);
    const texts = paymentTexts(event, next, u.cents, standing(next, t), dealer.name, receipt, u.reason);
    if (texts.buyer) await this.messenger.send({ dealerId: dealer.dealerId, from: dealer.textFrom, to: next.buyer.phone, text: texts.buyer, kind: 'care' });
    for (const to of dealer.alertTo) await this.messenger.send({ dealerId: dealer.dealerId, from: dealer.textFrom, to, text: texts.dealer, kind: 'care' });
    return { ok: true, event };
  }

  /** A clearing bank payment that was not returned in time becomes cleared, quietly. */
  async settle(noteId: string, processorId: string) {
    const note = await this.notes.get(noteId); if (!note) return;
    await this.notes.save(updatePayment(note, processorId, 'cleared'));
  }
}

export class MemoryNoteStore implements NoteStore {
  notes = new Map<string, Loan>(); receipts = new Map<string, number>();
  async get(id: string) { return this.notes.get(id) ?? null; }
  async save(n: Loan) { this.notes.set(n.id, n); }
  async nextReceipt(d: string) { const n = (this.receipts.get(d) ?? 1000) + 1; this.receipts.set(d, n); return n; }
}
