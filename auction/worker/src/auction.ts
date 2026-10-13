/* One Durable Object per lot. The same rules the app runs locally
   (src/engine/auction.ts) run here, with the authority: a bid is one
   transaction that writes the price, the close time and the ack together;
   the ack is what the glass thumps on. The close is an alarm plus a read-time
   check. After the hammer the same alarm carries the buyer's 48-hour deadline.
   Every connected phone gets the lot on every change over a hibernating
   WebSocket. D1 gets a copy. */
import { DurableObject } from 'cloudflare:workers';
import { closeAfterBid, proxy, type Proxy } from '../../src/engine/auction';
import { collateralRefusal, type CarMeta } from '../../src/engine/meta';
import type { Ack, BidRequest, Event, Lot } from '../../src/engine/server';
import type { Env } from './env';
import { push } from './push';
import { shillMatch, type Who } from './bidders';

export type OpenRequest = { id: string; dealer: string; start: number; retail: number; opensAt?: number; closesAt: number; car?: CarMeta };
type Stored = Lot & { dealer: string };
/** The bid as the Worker forwards it: the engine's request plus what the Worker knows of the bidder (D11). */
export type BidIn = BidRequest & { who?: Who };

export const PAY_WINDOW_MS = 48 * 3_600_000;

export class Auction extends DurableObject<Env> {
  private lot: Stored | null = null;

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/lots\/[^/]+/, '') || '/';
    if (req.headers.get('upgrade') === 'websocket') return this.openSocket();
    const lot = await this.load();
    const dealer = req.headers.get('x-dealer') ?? '';   // set by the Worker after it checked the dealer's token
    if (lot && dealer && ['/open', '/close', '/paid', '/pickup', '/car', '/void'].includes(path) && lot.dealer !== dealer && !lot.closed) return text('not your lot', 403);
    switch (`${req.method} ${path}`) {
      case 'GET /': return lot ? json(this.publicLot(lot)) : text('no lot', 404);
      case 'POST /open': return this.open(await req.json<OpenRequest>(), dealer);
      case 'POST /car': {   // the Desk updates photos, documents, hours after Go
        if (!lot) return text('no lot', 404);
        const patch = await req.json<Partial<CarMeta>>();
        if (patch.collateral) {   // the floor can move only while nobody has bid, only down, and only on collateral the lane still accepts
          const why = collateralRefusal(patch.collateral); if (why) return text(why, 422);
          if (lot.bids > 0 && patch.collateral.floor !== lot.car?.collateral.floor) return text('bids placed', 409);
          if (patch.collateral.floor > (lot.car?.collateral.floor ?? lot.start)) return text('floor only lowers', 409);
          lot.start = patch.collateral.floor; lot.high = patch.collateral.floor;
        }
        lot.car = { ...(lot.car as CarMeta), ...patch } as CarMeta;
        await this.save(lot); this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' }); return json(this.publicLot(lot));
      }
      case 'POST /copy': {   // the nightly reconciliation: the object rewrites its own D1 copy (not routed by the Worker)
        if (!lot) return text('no lot', 404);
        await this.copy(lot); return json(this.publicLot(lot));
      }
      case 'POST /bids': return this.bid(await req.json<BidIn>(), Date.now());
      case 'POST /watch': return this.watch(Number(url.searchParams.get('delta') ?? 1));
      case 'POST /close': {   // the dealer ends it now; never earlier than a live bid's refill
        if (!lot || lot.closed) return text('closed', 409);
        lot.closesAt = Math.min(lot.closesAt, Date.now()); await this.save(lot); await this.ctx.storage.setAlarm(lot.closesAt); return json(this.publicLot(lot));
      }
      case 'POST /paid': {   // the dealer saw the money (cash at the lot) or Whop said so
        if (!lot?.sale || lot.sale.forfeitedAt) return text('no sale', 409);
        lot.sale.paidAt = Date.now(); await this.save(lot);
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        return json(this.publicLot(lot));
      }
      case 'POST /void': {   // the dealer cannot deliver: the sale ends, the buyer's deposit is released, the incident counts against the dealer
        if (!lot?.sale || lot.sale.startedAt) return text('no sale to void', 409);
        const b = await req.json<{ reason?: string }>();
        lot.sale.voidedAt = Date.now(); lot.sale.deposit = 'released'; await this.save(lot);
        await this.env.DB.prepare('INSERT INTO incidents (id, dealer, lot_id, kind, note, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(`void:${lot.id}:${Date.now()}`, lot.dealer, lot.id, 'non_delivery', (b.reason ?? '').slice(0, 240), Date.now()).run().catch(() => {});
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        this.ctx.waitUntil(push(this.env, lot.sale.buyer, 'The dealer could not deliver', 'Your deposit is yours again.', { lotId: lot.id, screen: 'me' }));
        return json(this.publicLot(lot));
      }
      case 'POST /pickup': {   // the dealer scanned the VIN and the car started: the sale completes
        if (!lot?.sale || lot.sale.forfeitedAt) return text('no sale', 409);
        const b = await req.json<{ vin?: string }>();
        if (lot.car?.vin && b.vin && !lot.car.vin.toUpperCase().endsWith(b.vin.toUpperCase().slice(-6))) return text('wrong car', 409);
        lot.sale.startedAt = Date.now(); await this.save(lot);
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        this.ctx.waitUntil(push(this.env, lot.sale.buyer, `${lot.car?.year ?? ''} ${lot.car?.make ?? ''} ${lot.car?.model ?? ''}`.trim() || 'Your car', 'Started. It is yours.', { lotId: lot.id, screen: 'pickup' }));
        return json(this.publicLot(lot));
      }
      default: return text('not found', 404);
    }
  }

  /** The alarm: the hammer, then the deadline. */
  async alarm(): Promise<void> {
    const lot = await this.load(); if (!lot) return;
    const now = Date.now();
    if (!lot.closed) {
      if (now < lot.closesAt) { await this.ctx.storage.setAlarm(lot.closesAt); return; }   // a refill moved it
      lot.closed = { at: lot.closesAt, sold: lot.bids > 0 && !!lot.leader };
      if (lot.closed.sold && lot.leader) {
        lot.sale = { buyer: lot.leader, hammer: lot.high, wonAt: lot.closesAt, deadlineAt: lot.closesAt + PAY_WINDOW_MS, deposit: 'held' };
        await this.ctx.storage.setAlarm(lot.sale.deadlineAt);
        this.ctx.waitUntil(push(this.env, lot.leader, 'Yours', `$${lot.high.toLocaleString('en-US')} · ${lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id}`, { lotId: lot.id, screen: 'won' }));
      }
      await this.save(lot);
      this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'close' });
      return;
    }
    if (lot.sale && !lot.sale.paidAt && !lot.sale.forfeitedAt && now >= lot.sale.deadlineAt) {
      lot.sale.forfeitedAt = now; lot.sale.deposit = 'to_dealer';   // the deposit is the dealer's: holding cost and relist (collateral.md §2)
      await this.save(lot);
      await this.env.DB.prepare('UPDATE buyers SET deposit_status = ?2 WHERE id = ?1 AND deposit_status = ?3').bind(lot.sale.buyer, 'forfeited', 'captured').run().catch(() => {});
      await this.env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)').bind(`forfeit:${lot.id}`, 'deposit.forfeited', JSON.stringify({ lotId: lot.id, buyer: lot.sale.buyer, dealer: lot.dealer, amount: 250, to: 'dealer' }), now).run().catch(() => {});
      this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
    }
  }

  private async open(o: OpenRequest, dealer: string): Promise<Response> {
    const existing = await this.load();
    if (existing && !existing.closed) return text('already open', 409);
    if (o.car) { const why = collateralRefusal(o.car.collateral); if (why) return text(why, 422); }   // docs/plan/collateral.md §5
    const lot: Stored = { id: o.id, dealer: dealer || o.dealer, start: o.start, retail: o.retail, opensAt: o.opensAt ?? Date.now(), closesAt: o.closesAt, high: o.start, bids: 0, watching: 0, car: o.car };
    await this.ctx.storage.deleteAll();
    await this.save(lot);
    await this.ctx.storage.setAlarm(lot.closesAt);
    return json(this.publicLot(lot));
  }

  /** The transaction. Idempotent on the key: the same ack comes back for a retried request. */
  private async bid(req: BidIn, now: number): Promise<Response> {
    const lot = await this.load();
    if (!lot) return text('no lot', 404);
    // D11 (Bus. & Com. Code §2.328(d)): the seller does not bid on his own car. Checked on every bid, retries included.
    const shill = shillMatch(req.who, lot.car?.dealer);
    if (shill.matched) {
      this.ctx.waitUntil(this.env.DB.prepare('INSERT INTO bid_refusals (lot_id, who, reason, matched, at) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(lot.id, req.bidder, 'seller_cannot_bid', shill.matched, now).run().catch(() => {}));
      return json({ error: 'seller_cannot_bid' }, 403);
    }
    const prior = await this.ctx.storage.get<Ack>(`ack:${req.key}`);
    if (prior) return json(prior);
    let ack: Ack; let outbid: string | undefined;
    if (lot.closed || now >= lot.closesAt) {
      if (!lot.closed) lot.closed = { at: lot.closesAt, sold: lot.bids > 0 };
      ack = { ok: false, reason: 'closed', lot: this.publicLot(lot), lateByMs: now - lot.closesAt, stampedAt: now };
    } else {
      const before: Proxy = { high: lot.high, leader: lot.leader, max: lot.max };
      const after = proxy(before, { id: req.bidder, amount: req.amount, max: req.max }, lot.bids > 0);
      if (after === before) {
        ack = { ok: false, reason: 'low', lot: this.publicLot(lot), stampedAt: now };
      } else {
        if (lot.leader && lot.leader !== after.leader && lot.leader !== req.bidder) outbid = lot.leader;
        lot.high = after.high; lot.leader = after.leader; lot.max = after.max; lot.bids += 1;
        const was = lot.closesAt; lot.closesAt = closeAfterBid(lot.closesAt, now);
        if (lot.closesAt !== was) await this.ctx.storage.setAlarm(lot.closesAt);
        ack = lot.leader === req.bidder
          ? { ok: true, lot: this.publicLot(lot), youLead: true, stampedAt: now }
          : { ok: false, reason: 'outbid', lot: this.publicLot(lot), stampedAt: now };
      }
    }
    // price, close time and ack in one write; the copy and the bid log after
    await this.ctx.storage.put({ lot, [`ack:${req.key}`]: ack });
    this.lot = lot;
    this.ctx.waitUntil(this.copy(lot, req, ack, shill.checked));
    if (ack.ok || ack.reason === 'outbid') this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' });
    if (outbid) {   // the push carries the words and the time left; the app stays silent
      const left = Math.max(0, lot.closesAt - now), m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
      const when = left >= 3_600_000 ? `${Math.floor(left / 3_600_000)} h left` : `${m}:${String(sec).padStart(2, '0')} left`;
      this.ctx.waitUntil(push(this.env, outbid, 'Outbid', `$${lot.high.toLocaleString('en-US')} · ${when}`, { lotId: lot.id, screen: 'lane' }));
    }
    return json(ack);
  }

  private async watch(delta: number): Promise<Response> {
    const lot = await this.load(); if (!lot) return text('no lot', 404);
    lot.watching = Math.max(0, lot.watching + (delta >= 0 ? 1 : -1));
    await this.save(lot);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' });
    return json(this.publicLot(lot));
  }

  /** The live lane: a hibernating socket per phone; the lot on connect, then every change. */
  private async openSocket(): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    const lot = await this.load();
    if (lot) pair[1].send(JSON.stringify({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' } satisfies Event));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) { if (msg === 'ping') ws.send('pong'); }
  async webSocketClose(ws: WebSocket) { try { ws.close(); } catch {} }
  private broadcast(e: Event) {
    const s = JSON.stringify(e);
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(s); } catch {} }
  }

  private async load(): Promise<Stored | null> {
    if (this.lot) return this.lot;
    this.lot = (await this.ctx.storage.get<Stored>('lot')) ?? null;
    return this.lot;
  }
  private async save(lot: Stored) { this.lot = lot; await this.ctx.storage.put('lot', lot); this.ctx.waitUntil(this.copy(lot)); }
  /** What leaves the object: never the ceiling, never the dealer's name on the wire beyond the car's own dealer block. */
  private publicLot(lot: Stored): Lot { const { dealer: _d, max: _m, ...pub } = lot; return { ...pub, max: undefined }; }

  /** D1: the copy, compared nightly; never read on the bid path. */
  private async copy(lot: Stored, req?: BidRequest, ack?: Ack, shillCheck = '') {
    try {
      await this.env.DB.prepare('INSERT INTO lots (id, dealer, lot, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET lot = ?3, updated_at = ?4')
        .bind(lot.id, lot.dealer, JSON.stringify(lot), Date.now()).run();
      if (req && ack) {
        await this.env.DB.prepare('INSERT OR IGNORE INTO bids (key, lot_id, bidder, amount, max, ok, reason, stamped_at, shill_check) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
          .bind(req.key, lot.id, req.bidder, req.amount, req.max, ack.ok ? 1 : 0, ack.ok ? null : ack.reason, ack.stampedAt, shillCheck).run();
      }
    } catch { /* the object is the truth; the copy catches up */ }
  }
}

const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
const text = (t: string, status: number) => new Response(t, { status });
