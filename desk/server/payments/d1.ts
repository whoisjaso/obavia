/* In-house notes on Cloudflare D1. A note is stored whole (JSON) with its
   dealer; the ledger logic lives in src/lib/loans.ts and is shared with the Desk. */
import type { Loan } from '../../src/lib/loans';
import { maxReceipt, mergeNote, type DeskFacts, type EveningSetting } from '../../src/lib/sync';
import type { JobDealer, JobStore } from '../jobs';
import type { D1 } from '../store';
import type { DealerContact, NoteStore } from './desk';

type All = { all<T>(): Promise<{ results: T[] }> };

export class D1NoteStore implements NoteStore, JobStore {
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
    return r ? { dealerId: r.dealer_id, name: r.display_name, textFrom: r.number, timeZone: r.time_zone, alertTo: split(r.alert_to) } : null;
  }

  /* ---------- the Desk's sync ---------- */
  async notes(dealerId: string): Promise<Loan[]> {
    const r = await (this.db.prepare('SELECT body FROM note WHERE dealer_id=?').bind(dealerId) as unknown as All).all<{ body: string }>();
    return r.results.map(x => JSON.parse(x.body) as Loan);
  }
  /** Merge the Desk's notes in. A note id owned by another dealer is refused. Returns the merged notes. */
  async upsert(dealerId: string, desk: Loan[], facts?: DeskFacts, evening?: EveningSetting): Promise<{ notes: Loan[]; refused: string[] }> {
    const refused: string[] = [];
    for (const n of desk) {
      const row = await this.db.prepare('SELECT dealer_id, body FROM note WHERE id=?').bind(n.id).first<{ dealer_id: string; body: string }>();
      if (row && row.dealer_id !== dealerId) { refused.push(n.id); continue; }
      const merged = mergeNote(row ? JSON.parse(row.body) as Loan : null, n);
      await this.db.prepare('INSERT INTO note (id, dealer_id, body, updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body, updated_at=excluded.updated_at')
        .bind(n.id, dealerId, JSON.stringify(merged), new Date().toISOString()).run();
    }
    const all = await this.notes(dealerId), top = maxReceipt(all);
    if (top) await this.db.prepare('INSERT INTO receipt_counter (dealer_id, last) VALUES (?, ?) ON CONFLICT(dealer_id) DO UPDATE SET last = MAX(last, excluded.last)').bind(dealerId, top).run();
    if (facts || evening) await this.db.prepare(`INSERT INTO dealer_setting (dealer_id, evening_on, evening_hour, facts) VALUES (?,?,?,?)
      ON CONFLICT(dealer_id) DO UPDATE SET evening_on=COALESCE(?, evening_on), evening_hour=COALESCE(?, evening_hour), facts=COALESCE(?, facts)`)
      .bind(dealerId, evening?.on ? 1 : 0, evening?.hour ?? 19, facts ? JSON.stringify(facts) : null,
        evening ? (evening.on ? 1 : 0) : null, evening?.hour ?? null, facts ? JSON.stringify(facts) : null).run();
    return { notes: all, refused };
  }

  /* ---------- the hourly job ---------- */
  async dealers(): Promise<JobDealer[]> {
    const r = await (this.db.prepare('SELECT d.dealer_id, d.display_name, d.number, d.time_zone, d.alert_to, s.evening_on, s.evening_hour, s.facts FROM dealer_line d LEFT JOIN dealer_setting s ON s.dealer_id = d.dealer_id') as unknown as All)
      .all<{ dealer_id: string; display_name: string; number: string; time_zone: string; alert_to: string | null; evening_on: number | null; evening_hour: number | null; facts: string | null }>();
    return r.results.map(x => ({ dealerId: x.dealer_id, name: x.display_name, textFrom: x.number, timeZone: x.time_zone, alertTo: split(x.alert_to),
      evening: x.evening_on != null ? { on: !!x.evening_on, hour: x.evening_hour ?? 19 } : undefined, facts: x.facts ? JSON.parse(x.facts) as DeskFacts : undefined }));
  }
  async claim(key: string, at: string) {
    const r = await this.db.prepare('INSERT INTO sent_job (key, at) VALUES (?, ?) ON CONFLICT(key) DO NOTHING RETURNING key').bind(key, at).first<{ key: string }>();
    return !!r;
  }
}
const split = (s: string | null) => (s ?? '').split(',').map(x => x.trim()).filter(Boolean);
