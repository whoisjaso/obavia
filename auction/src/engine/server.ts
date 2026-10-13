/* A local stand-in for the auction Durable Object. Same contract the Worker
   will expose: one bid, one idempotency key, one ack. Latency and rival
   bidders are simulated so the glass behaves like the real thing, including
   the one failure that must never be silent: a bid that lands after close. */
import { closeAfterBid, nextBid, proxy, type Proxy } from './auction';
import type { CarMeta, SaleOffer, SaleState } from './meta';

export type { SaleOffer };
/** The 12 hours the offer stands (decisions §2 row 9), and the pay window the stand-in gives a new sale. */
export const OFFER_MS = 12 * 3_600_000;
export const PAY_WINDOW_MS = 48 * 3_600_000;
/** What the lane carries beyond meta.ts's SaleState (`offer` and `car.listingUrl` live there): `sale.invoiceUrl`, the
    balance invoice on Whop (W3-A invoice.ts), which Pay's Bank and Wire open. */
export type LaneSale = SaleState & { invoiceUrl?: string };
export type LaneCar = CarMeta;

export type Lot = {
  id: string;
  start: number;                 // opening ask, whole dollars
  retail: number;                // the dealer's retail ask, for the Retail bar
  opensAt: number; closesAt: number;
  high: number; leader?: string; max?: number;
  bids: number; watching: number;
  closed?: { at: number; sold: boolean };
  car?: LaneCar;                 // from the Desk at Go; absent on the local stand-in's seeded lots
  sale?: LaneSale;               // after the hammer
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
          // the hammer: the Worker's object writes the sale at the close (worker/src/auction.ts); the stand-in
          // writes the same shape, with the invoice the Worker's Whop invoice would carry (W3-A), as a stand-in URL
          if (l.closed.sold && l.leader && !l.sale) l.sale = saleFor(l.id, l.leader, l.high, l.closesAt);
          this.emit({ lotId: l.id, lot: { ...l }, kind: 'close' });
        }
        // the offer's alarm: at expiresAt it is gone, silently (the push said 12 h; the glass says nothing more)
        if (l.sale?.offer && now >= l.sale.offer.expiresAt) {
          delete l.sale.offer;
          this.emit({ lotId: l.id, lot: { ...l }, kind: 'sale' });
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

  /** POST /lots/:id/offer/accept (W3-B): the under-bidder takes the second chance; the new sale, with its own
      deadline and invoice, replaces the forfeited one; the offer is spent. Refused (null) when there is no
      offer, it is not this buyer's, or it has expired. */
  acceptOffer(lotId: string, buyer: string): Lot | null {
    const l = this.lots.get(lotId);
    const o = l?.sale?.offer;
    if (!l || !o || o.buyer !== buyer || this.clock() >= o.expiresAt) return null;
    l.sale = saleFor(l.id, buyer, o.amount, this.clock());
    this.emit({ lotId: l.id, lot: { ...l }, kind: 'sale' });
    return { ...l };
  }

  /** GET /lots/:id/pass (W3-B): the Google Wallet pass's save link for the buyer's sale; null is the Worker's
      503 pass_unavailable (no issuer id or service account). The stand-in has none to sign, so it answers the
      app's own scheme, which opens nothing: the verb shows, the pass does not. */
  walletPass(lotId: string, buyer: string): string | null {
    const l = this.lots.get(lotId);
    if (!l?.sale || l.sale.buyer !== buyer) return null;
    return `obavia://wallet/${lotId}`;
  }

  /** Preview only: the lot closed to a rival who never paid, forfeited, and the second chance is mine. */
  playOffer(lotId: string, buyer: string, amount: number) {
    const l = this.lots.get(lotId); if (!l) return;
    const now = this.clock();
    l.closesAt = now - PAY_WINDOW_MS - 60_000; l.closed = { at: l.closesAt, sold: true };
    l.sale = { ...saleFor(l.id, l.leader ?? 'r1', l.high, l.closesAt), forfeitedAt: now - 60_000, deposit: 'to_dealer', offer: { buyer, amount, madeAt: now - 60_000, expiresAt: now - 60_000 + OFFER_MS } };
  }

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

/** The sale the stand-in writes at a hammer or an accepted offer: the Worker's shape (meta.ts SaleState) plus the
    balance invoice W3-A creates at the hammer. The stand-in has no Whop, so its invoice URL is the app's own
    scheme: Pay's Bank and Wire show the invoice and open nothing here; on the Worker they open Whop's page. */
function saleFor(lotId: string, buyer: string, hammer: number, wonAt: number): LaneSale {
  return { buyer, hammer, wonAt, deadlineAt: wonAt + PAY_WINDOW_MS, deposit: 'held', invoiceUrl: `obavia://invoice/${lotId}` };
}
