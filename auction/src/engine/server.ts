/* A local stand-in for the auction Durable Object. Same contract the Worker
   will expose: one bid, one idempotency key, one ack. Latency and rival
   bidders are simulated so the glass behaves like the real thing, including
   the one failure that must never be silent: a bid that lands after close. */
import { closeAfterBid, nextBid, proxy, type Proxy } from './auction';
import type { CarMeta, SaleState } from './meta';

export type Lot = {
  id: string;
  start: number;                 // opening ask, whole dollars
  retail: number;                // the dealer's retail ask, for the Retail bar
  opensAt: number; closesAt: number;
  high: number; leader?: string; max?: number;
  bids: number; watching: number;
  closed?: { at: number; sold: boolean };
  car?: CarMeta;                 // from the Desk at Go; absent on the local stand-in's seeded lots
  sale?: SaleState;              // after the hammer
};

/** `terms` is the auction terms version, sent with the buyer's first bid ever only (decisions §9 D10). */
export type BidRequest = { lotId: string; bidder: string; amount: number; max: number; key: string; terms?: string };

export type Ack =
  | { ok: true; lot: Lot; youLead: boolean; stampedAt: number }
  | { ok: false; reason: 'closed'; lot: Lot; lateByMs: number; stampedAt: number }
  | { ok: false; reason: 'outbid'; lot: Lot; stampedAt: number }     // your ceiling was under the leader's
  | { ok: false; reason: 'low'; lot: Lot; stampedAt: number };       // under the asking price

export type Event = { lotId: string; lot: Lot; kind: 'bid' | 'close' | 'tick' | 'sale' };

export class LocalAuctionServer {
  private lots = new Map<string, Lot>();
  private seen = new Map<string, Ack>();
  private subs = new Set<(e: Event) => void>();
  private timer?: ReturnType<typeof setInterval>;
  private rivals: Array<{ lotId: string; at: number; max: number; id: string }> = [];

  constructor(lots: Lot[], private clock: () => number = () => Date.now(), private latencyMs: () => number = () => 200 + Math.random() * 400) {
    for (const l of lots) this.lots.set(l.id, { ...l });
  }

  /** Server-side close is an alarm plus a read-time check; here, one interval. */
  start() {
    this.timer = setInterval(() => {
      const now = this.clock();
      for (const l of this.lots.values()) {
        if (!l.closed && now >= l.closesAt) {
          l.closed = { at: l.closesAt, sold: l.bids > 0 };
          this.emit({ lotId: l.id, lot: { ...l }, kind: 'close' });
        }
      }
      for (const r of [...this.rivals]) {
        if (now >= r.at) {
          this.rivals.splice(this.rivals.indexOf(r), 1);
          this.apply({ lotId: r.lotId, bidder: r.id, amount: nextBid(this.lots.get(r.lotId)!.high, this.lots.get(r.lotId)!.bids > 0), max: r.max, key: `rival-${r.id}-${r.at}` }, now);
        }
      }
      this.emit({ lotId: '*', lot: undefined as unknown as Lot, kind: 'tick' });
    }, 250);
    return this;
  }
  stop() { if (this.timer) clearInterval(this.timer); }

  subscribe(fn: (e: Event) => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit(e: Event) { for (const s of this.subs) s(e); }

  get(id: string): Lot { const l = this.lots.get(id); if (!l) throw new Error(`no lot ${id}`); return { ...l }; }
  all(): Lot[] { return [...this.lots.values()].map(l => ({ ...l })); }

  /** Preview only: bring a lot's close forward so the hammer can be watched. */
  closeSoon(lotId: string, inMs: number) { const l = this.lots.get(lotId); if (l && !l.closed) l.closesAt = Math.min(l.closesAt, this.clock() + inMs); }

  /** A rival who will bid at a given time; makes the lane feel alive in the demo. */
  scheduleRival(lotId: string, inMs: number, max: number, id = `r${Math.random().toString(36).slice(2, 6)}`) {
    this.rivals.push({ lotId, at: this.clock() + inMs, max, id });
  }

  /** The network: resolve after latency with a server-stamped ack. Idempotent on `key`. */
  bid(req: BidRequest): Promise<Ack> {
    const sentAt = this.clock();
    return new Promise(resolve => {
      setTimeout(() => {
        // the request "arrives" after half the latency; the ack takes the other half
        const arrivedAt = sentAt + this.latencyMs() / 2;
        resolve(this.apply(req, Math.max(arrivedAt, this.clock())));
      }, this.latencyMs());
    });
  }

  /** The transaction: read, decide, write price and close time together, then ack. */
  apply(req: BidRequest, now: number): Ack {
    const prior = this.seen.get(req.key);
    if (prior) return prior;
    const l = this.lots.get(req.lotId);
    if (!l) throw new Error(`no lot ${req.lotId}`);
    let ack: Ack;
    if (l.closed || now >= l.closesAt) {
      if (!l.closed) l.closed = { at: l.closesAt, sold: l.bids > 0 };
      ack = { ok: false, reason: 'closed', lot: { ...l }, lateByMs: now - l.closesAt, stampedAt: now };
    } else {
      const before: Proxy = { high: l.high, leader: l.leader, max: l.max };
      const after = proxy(before, { id: req.bidder, amount: req.amount, max: req.max }, l.bids > 0);
      if (after === before) {
        ack = { ok: false, reason: 'low', lot: { ...l }, stampedAt: now };
      } else {
        l.high = after.high; l.leader = after.leader; l.max = after.max;
        l.bids += 1;
        l.closesAt = closeAfterBid(l.closesAt, now);
        const youLead = l.leader === req.bidder;
        ack = youLead
          ? { ok: true, lot: { ...l }, youLead: true, stampedAt: now }
          : { ok: false, reason: 'outbid', lot: { ...l }, stampedAt: now };
        this.emit({ lotId: l.id, lot: { ...l }, kind: 'bid' });
      }
    }
    this.seen.set(req.key, ack);
    return ack;
  }
}
