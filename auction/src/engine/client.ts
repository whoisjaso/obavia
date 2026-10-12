/* The real server, over the Worker. Same surface as LocalAuctionServer so
   the store and the screens do not know which one they have. */
import type { Ack, Event, Lot } from './server';

export class RemoteAuctionServer {
  private lots = new Map<string, Lot>();
  private subs = new Set<(e: Event) => void>();
  private sockets = new Map<string, WebSocket>();
  private timer?: ReturnType<typeof setInterval>;

  constructor(private base: string, private token: () => string | null) {}

  start() {
    void this.refresh();
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const l of this.lots.values()) if (!l.closed && now >= l.closesAt) { l.closed = { at: l.closesAt, sold: l.bids > 0 }; this.emit({ lotId: l.id, lot: { ...l }, kind: 'close' }); }   // read-time close; the object confirms
      this.emit({ lotId: '*', lot: undefined as unknown as Lot, kind: 'tick' });
    }, 250);
    return this;
  }
  stop() { if (this.timer) clearInterval(this.timer); for (const ws of this.sockets.values()) ws.close(); }

  subscribe(fn: (e: Event) => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit(e: Event) { for (const s of this.subs) s(e); }

  get(id: string): Lot { const l = this.lots.get(id); if (!l) throw new Error(`no lot ${id}`); return { ...l }; }
  all(): Lot[] { return [...this.lots.values()].map(l => ({ ...l })); }

  /** The lane from the copy, then a live socket per lot. */
  async refresh() {
    const r = await fetch(`${this.base}/lots`);
    const lots = await r.json() as Lot[];
    for (const l of lots) { this.lots.set(l.id, l); this.emit({ lotId: l.id, lot: l, kind: 'bid' }); this.live(l.id); }
  }

  private live(id: string) {
    if (this.sockets.has(id)) return;
    const t = this.token(); if (!t) return;
    const url = `${this.base.replace(/^http/, 'ws')}/lots/${id}/live?token=${encodeURIComponent(t)}`;
    const ws = new WebSocket(url);
    ws.addEventListener('message', (m: { data: unknown }) => { const e = JSON.parse(String(m.data)) as Event; this.lots.set(e.lotId, e.lot); this.emit(e); });
    ws.addEventListener('close', () => { this.sockets.delete(id); setTimeout(() => this.live(id), 2000 + Math.random() * 3000); });
    this.sockets.set(id, ws);
  }

  /** One request, one key, one ack. A retry carries the same key and gets the same ack. */
  async bid(req: { lotId: string; bidder: string; amount: number; max: number; key: string }): Promise<Ack> {
    const t = this.token(); if (!t) throw new Error('sign in');
    const r = await fetch(`${this.base}/lots/${req.lotId}/bids`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount: req.amount, max: req.max, key: req.key }) });
    if (r.status === 402) throw new Error('deposit');
    if (!r.ok) throw new Error(await r.text());
    const ack = await r.json() as Ack;
    this.lots.set(ack.lot.id, ack.lot);
    return ack;
  }

  async watch(id: string, on: boolean) {
    const t = this.token(); if (!t) return;
    await fetch(`${this.base}/lots/${id}/watch?delta=${on ? 1 : -1}`, { method: 'POST', headers: { authorization: `Bearer ${t}` } });
  }

  /** The buyer: a token after the licence is read; the deposit once captured. */
  static async signIn(base: string, id: string, name?: string, state?: string): Promise<string> {
    const r = await fetch(`${base}/me`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, name, state }) });
    return (await r.json() as { token: string }).token;
  }
  static async deposit(base: string, token: string, paymentIntent?: string): Promise<boolean> {
    const r = await fetch(`${base}/me/deposit`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ paymentIntent }) });
    return r.ok;
  }
}
