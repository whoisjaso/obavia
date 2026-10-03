/* What the messaging layer remembers. MemoryStore for tests and local runs;
   D1Store for Cloudflare (schema in server/schema.sql). The STOP list and
   consent records are the compliance record: they are never cleaned up. */

export type Direction = 'out' | 'in';
export type MessageRow = {
  dealerId: string; direction: Direction; providerId: string; from: string; to: string;
  kind: string; text: string; parts: number; status: string; error?: string; at: string;
};
export type ConsentRow = { dealerId: string; phone: string; kind: 'marketing'; wording: string; method: string; at: string };
export type DealerLine = { dealerId: string; number: string; displayName: string; helpPhone: string; timeZone: string };

export interface Store {
  isSuppressed(dealerId: string, phone: string): Promise<boolean>;
  suppress(dealerId: string, phone: string, at: string, source: string): Promise<void>;
  unsuppress(dealerId: string, phone: string): Promise<void>;
  hasMarketingConsent(dealerId: string, phone: string): Promise<boolean>;
  recordConsent(c: ConsentRow): Promise<void>;
  logMessage(m: MessageRow): Promise<void>;
  updateStatus(providerId: string, status: string, error?: string): Promise<void>;
  dealerByNumber(number: string): Promise<DealerLine | null>;
  /** True if under the limit (and counts this hit). */
  hit(key: string, windowSec: number, max: number, now: Date): Promise<boolean>;
}

export class MemoryStore implements Store {
  suppressed = new Map<string, { at: string; source: string }>();
  consents: ConsentRow[] = [];
  messages: MessageRow[] = [];
  lines: DealerLine[] = [];
  private hits = new Map<string, number[]>();
  private k = (d: string, p: string) => `${d}|${p}`;

  async isSuppressed(d: string, p: string) { return this.suppressed.has(this.k(d, p)); }
  async suppress(d: string, p: string, at: string, source: string) { this.suppressed.set(this.k(d, p), { at, source }); }
  async unsuppress(d: string, p: string) { this.suppressed.delete(this.k(d, p)); }
  async hasMarketingConsent(d: string, p: string) { return this.consents.some(c => c.dealerId === d && c.phone === p && c.kind === 'marketing'); }
  async recordConsent(c: ConsentRow) { this.consents.push(c); }
  async logMessage(m: MessageRow) { this.messages.push(m); }
  async updateStatus(id: string, status: string, error?: string) { for (const m of this.messages) if (m.providerId === id) { m.status = status; if (error) m.error = error; } }
  async dealerByNumber(n: string) { return this.lines.find(l => l.number === n) ?? null; }
  async hit(key: string, windowSec: number, max: number, now: Date) {
    const t = now.getTime(), list = (this.hits.get(key) ?? []).filter(x => t - x < windowSec * 1000);
    if (list.length >= max) { this.hits.set(key, list); return false; }
    list.push(t); this.hits.set(key, list); return true;
  }
}

/* ---------- Cloudflare D1 ---------- */

type D1Stmt = { bind(...v: unknown[]): D1Stmt; run(): Promise<unknown>; first<T = Record<string, unknown>>(): Promise<T | null> };
export type D1 = { prepare(sql: string): D1Stmt };

export class D1Store implements Store {
  constructor(private db: D1) {}
  async isSuppressed(d: string, p: string) { return !!(await this.db.prepare('SELECT 1 FROM suppression WHERE dealer_id=? AND phone=?').bind(d, p).first()); }
  async suppress(d: string, p: string, at: string, source: string) {
    await this.db.prepare('INSERT INTO suppression (dealer_id, phone, at, source) VALUES (?,?,?,?) ON CONFLICT(dealer_id, phone) DO UPDATE SET at=excluded.at, source=excluded.source').bind(d, p, at, source).run();
    await this.db.prepare('INSERT INTO suppression_log (dealer_id, phone, action, at, source) VALUES (?,?,?,?,?)').bind(d, p, 'stop', at, source).run();
  }
  async unsuppress(d: string, p: string) {
    await this.db.prepare('DELETE FROM suppression WHERE dealer_id=? AND phone=?').bind(d, p).run();
    await this.db.prepare('INSERT INTO suppression_log (dealer_id, phone, action, at, source) VALUES (?,?,?,?,?)').bind(d, p, 'start', new Date().toISOString(), 'keyword').run();
  }
  async hasMarketingConsent(d: string, p: string) { return !!(await this.db.prepare("SELECT 1 FROM consent WHERE dealer_id=? AND phone=? AND kind='marketing'").bind(d, p).first()); }
  async recordConsent(c: ConsentRow) { await this.db.prepare('INSERT INTO consent (dealer_id, phone, kind, wording, method, at) VALUES (?,?,?,?,?,?)').bind(c.dealerId, c.phone, c.kind, c.wording, c.method, c.at).run(); }
  async logMessage(m: MessageRow) {
    await this.db.prepare('INSERT INTO message (dealer_id, direction, provider_id, from_number, to_number, kind, body, parts, status, error, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(m.dealerId, m.direction, m.providerId, m.from, m.to, m.kind, m.text, m.parts, m.status, m.error ?? null, m.at).run();
  }
  async updateStatus(id: string, status: string, error?: string) { await this.db.prepare('UPDATE message SET status=?, error=COALESCE(?, error) WHERE provider_id=?').bind(status, error ?? null, id).run(); }
  async dealerByNumber(n: string) {
    const r = await this.db.prepare('SELECT dealer_id, number, display_name, help_phone, time_zone FROM dealer_line WHERE number=?').bind(n).first<{ dealer_id: string; number: string; display_name: string; help_phone: string; time_zone: string }>();
    return r ? { dealerId: r.dealer_id, number: r.number, displayName: r.display_name, helpPhone: r.help_phone, timeZone: r.time_zone } : null;
  }
  async hit(key: string, windowSec: number, max: number, now: Date) {
    const since = new Date(now.getTime() - windowSec * 1000).toISOString();
    const r = await this.db.prepare('SELECT COUNT(*) AS n FROM rate_hit WHERE key=? AND at>?').bind(key, since).first<{ n: number }>();
    if ((r?.n ?? 0) >= max) return false;
    await this.db.prepare('INSERT INTO rate_hit (key, at) VALUES (?,?)').bind(key, now.toISOString()).run();
    return true;
  }
}
