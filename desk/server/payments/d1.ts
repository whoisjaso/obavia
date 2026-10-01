/* In-house notes on Cloudflare D1. A note is stored whole (JSON) with its
   dealer; the ledger logic lives in src/lib/loans.ts and is shared with the Desk. */
import type { Loan } from '../../src/lib/loans';
import type { D1 } from '../store';
import type { DealerContact, NoteStore } from './desk';

export class D1NoteStore implements NoteStore {
  constructor(private db: D1) {}
  async get(id: string) {
    const r = await this.db.prepare('SELECT body FROM note WHERE id=?').bind(id).first<{ body: string }>();
    return r ? (JSON.parse(r.body) as Loan) : null;
  }
  async save(n: Loan) { await this.db.prepare('UPDATE note SET body=?, updated_at=? WHERE id=?').bind(JSON.stringify(n), new Date().toISOString(), n.id).run(); }
  async nextReceipt(dealerId: string) {
    await this.db.prepare('INSERT INTO receipt_counter (dealer_id, last) VALUES (?, 1001) ON CONFLICT(dealer_id) DO UPDATE SET last = last + 1').bind(dealerId).run();
    const r = await this.db.prepare('SELECT last FROM receipt_counter WHERE dealer_id=?').bind(dealerId).first<{ last: number }>();
    return r?.last ?? 1001;
  }
  /** Who the note belongs to, and who at the dealership hears about its payments. */
  async dealerFor(n: Loan): Promise<DealerContact | null> {
    const r = await this.db.prepare('SELECT d.dealer_id, d.display_name, d.number, d.time_zone, d.alert_to FROM note n JOIN dealer_line d ON d.dealer_id = n.dealer_id WHERE n.id=?').bind(n.id)
      .first<{ dealer_id: string; display_name: string; number: string; time_zone: string; alert_to: string | null }>();
    return r ? { dealerId: r.dealer_id, name: r.display_name, textFrom: r.number, timeZone: r.time_zone, alertTo: (r.alert_to ?? '').split(',').map(s => s.trim()).filter(Boolean) } : null;
  }
}
