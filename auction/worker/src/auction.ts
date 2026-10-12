/* One Durable Object per lot. The same rules the app runs locally
   (src/engine/auction.ts) run here, with the authority: a bid is one
   transaction that writes the price, the close time and the ack together;
   the ack is what the glass thumps on. The close is an alarm plus a read-time
   check. Every connected phone gets the lot on every change over a hibernating
   WebSocket. D1 gets a copy. */
import { DurableObject } from 'cloudflare:workers';
import { closeAfterBid, nextBid, proxy, type Proxy } from '../../src/engine/auction';
import type { Ack, BidRequest, Lot } from '../../src/engine/server';
import type { Env } from './env';

export type OpenRequest = { id: string; dealer: string; start: number; retail: number; opensAt?: number; closesAt: number };
type Stored = Lot & { dealer: string };

export class Auction extends DurableObject<Env> {
  private lot: Stored | null = null;

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/lots\/[^/]+/, '') || '/';
    if (req.headers.get('upgrade') === 'websocket') return this.openSocket(req);
    const lot = await this.load();
    switch (`${req.method} ${path}`) {
      case 'GET /': return lot ? json(this.publicLot(lot)) : new Response('no lot', { status: 404 });
      case 'POST /open': return this.open(await req.json<OpenRequest>());
      case 'POST /bids': return this.bid(await req.json<BidRequest>(), Date.now());
      case 'POST /watch': return this.watch(Number(url.searchParams.get('delta') ?? 1));
      case 'POST /close': {   // the dealer ends it now; never earlier than a live bid's refill
        if (!lot || lot.closed) return new Response('closed', { status: 409 });
        lot.closesAt = Math.min(lot.closesAt, Date.now()); await this.save(lot); await this.ctx.storage.setAlarm(lot.closesAt); return json(this.publicLot(lot));
      }
      default: return new Response('not found', { status: 404 });
    }
  }

  /** The alarm: the hammer. */
  async alarm(): Promise<void> {
    const lot = await this.load(); if (!lot || lot.closed) return;
    const now = Date.now();
    if (now < lot.closesAt) { await this.ctx.storage.setAlarm(lot.closesAt); return; }   // a refill moved it
    lot.closed = { at: lot.closesAt, sold: lot.bids > 0 };
    await this.save(lot);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'close' });
  }

  private async open(o: OpenRequest): Promise<Response> {
    const existing = await this.load();
    if (existing && !existing.closed) return new Response('already open', { status: 409 });
    const lot: Stored = { id: o.id, dealer: o.dealer, start: o.start, retail: o.retail, opensAt: o.opensAt ?? Date.now(), closesAt: o.closesAt, high: o.start, bids: 0, watching: 0 };
    await this.save(lot);
    await this.ctx.storage.setAlarm(lot.closesAt);
    return json(this.publicLot(lot));
  }

  /** The transaction. Idempotent on the key: the same ack comes back for a retried request. */
  private async bid(req: BidRequest, now: number): Promise<Response> {
    const prior = await this.ctx.storage.get<Ack>(`ack:${req.key}`);
    if (prior) return json(prior);
    const lot = await this.load();
    if (!lot) return new Response('no lot', { status: 404 });
    let ack: Ack;
    if (lot.closed || now >= lot.closesAt) {
      if (!lot.closed) lot.closed = { at: lot.closesAt, sold: lot.bids > 0 };
      ack = { ok: false, reason: 'closed', lot: this.publicLot(lot), lateByMs: now - lot.closesAt, stampedAt: now };
    } else {
      const before: Proxy = { high: lot.high, leader: lot.leader, max: lot.max };
      const after = proxy(before, { id: req.bidder, amount: req.amount, max: req.max }, lot.bids > 0);
      if (after === before) {
        ack = { ok: false, reason: 'low', lot: this.publicLot(lot), stampedAt: now };
      } else {
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
    this.ctx.waitUntil(this.copy(lot, req, ack));
    if (ack.ok || ack.reason === 'outbid') this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' });
    return json(ack);
  }

  private async watch(delta: number): Promise<Response> {
    const lot = await this.load(); if (!lot) return new Response('no lot', { status: 404 });
    lot.watching = Math.max(0, lot.watching + (delta >= 0 ? 1 : -1));
    await this.save(lot);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' });
    return json(this.publicLot(lot));
  }

  /** The live lane: a hibernating socket per phone; the lot on connect, then every change. */
  private async openSocket(req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    const lot = await this.load();
    if (lot) pair[1].send(JSON.stringify({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' }));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) { if (msg === 'ping') ws.send('pong'); }
  async webSocketClose(ws: WebSocket) { try { ws.close(); } catch {} }
  private broadcast(e: unknown) {
    const s = JSON.stringify(e);
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(s); } catch {} }
  }

  private async load(): Promise<Stored | null> {
    if (this.lot) return this.lot;
    this.lot = (await this.ctx.storage.get<Stored>('lot')) ?? null;
    return this.lot;
  }
  private async save(lot: Stored) { this.lot = lot; await this.ctx.storage.put('lot', lot); this.ctx.waitUntil(this.copy(lot)); }
  private publicLot(lot: Stored): Lot { const { dealer: _d, max: _m, ...pub } = lot; return { ...pub, max: undefined }; }   // the ceiling never leaves the object

  /** D1: the copy, compared nightly; never read on the bid path. */
  private async copy(lot: Stored, req?: BidRequest, ack?: Ack) {
    try {
      await this.env.DB.prepare('INSERT INTO lots (id, dealer, lot, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET lot = ?3, updated_at = ?4')
        .bind(lot.id, lot.dealer, JSON.stringify(lot), Date.now()).run();
      if (req && ack) {
        await this.env.DB.prepare('INSERT OR IGNORE INTO bids (key, lot_id, bidder, amount, max, ok, reason, stamped_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
          .bind(req.key, lot.id, req.bidder, req.amount, req.max, ack.ok ? 1 : 0, ack.ok ? null : ack.reason, ack.stampedAt).run();
      }
    } catch { /* the object is the truth; the copy catches up */ }
  }
}

const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
export { nextBid };
