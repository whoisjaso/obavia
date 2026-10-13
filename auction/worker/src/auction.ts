/* One Durable Object per lot. The same rules the app runs locally
   (src/engine/auction.ts) run here, with the authority: a bid is one
   transaction that writes the price, the close time and the ack together;
   the ack is what the glass thumps on. The close is an alarm plus a read-time
   check. After the hammer the same alarm carries the buyer's 48-hour deadline:
   a pay-by push at 24 h and at 6 h before it, then the no-pay forfeit at it.
   Every connected phone gets the lot on every change over a hibernating
   WebSocket. D1 gets a copy. */
import { DurableObject } from 'cloudflare:workers';
import { closeAfterBid, proxy, type Proxy } from '../../src/engine/auction';
import { collateralRefusal, type CarMeta } from '../../src/engine/meta';
import type { Ack, BidRequest, Event, Lot } from '../../src/engine/server';
import type { Env } from './env';
import { outTheDoor, dollars } from '../../src/engine/money';
import type { Payout, SaleState } from '../../src/engine/meta';
import { payBy, push, pushDealer } from './push';
import { shillMatch, type Who } from './bidders';
import { Whop } from './whop';

export type OpenRequest = { id: string; dealer: string; start: number; retail: number; opensAt?: number; closesAt: number; car?: CarMeta };
export type { Payout, SaleState };
/** The dealer's $250 as the lot keeps it: owed, sent by a Whop transfer, or paid by hand (wire, check, cash). Wider than the
    engine's Payout (src/engine/meta.ts, 'owed' | 'sent'), which does not yet carry 'paid', the method or the time. */
export type LotPayout = { state: 'owed' | 'sent' | 'paid'; transferId?: string; method?: PayMethod; at?: number };
export type PayMethod = 'wire' | 'check' | 'cash';
/** POST /payout, Worker-internal: the dealer_payouts row moved outside the object (paid by hand, or sent by the retry). */
export type PayoutNews = { id: string; state: 'sent' | 'paid'; transferId?: string; method?: PayMethod; at: number };
type StoredSale = Omit<SaleState, 'payout'> & { payout?: LotPayout };
type Stored = Omit<Lot, 'sale'> & { sale?: StoredSale; dealer: string; reminded?: number[] };   // reminded: the pay-by pushes sent, in hours before the deadline
type PayoutReason = 'applied' | 'forfeit' | 'no_pay';
/** The bid as the Worker forwards it: the engine's request plus what the Worker knows of the bidder (D11). */
export type BidIn = BidRequest & { who?: Who };

/** The pay window: 48 h from the hammer. The standing value: decisions §7 (open for the owner until Fri Oct 30, 2026; §1 says 72 h),
    growth plan §5 changelog 2026-10-12 ("The owner resolves it by Fri Oct 16 or 48 hours stands"), phases Phase 1 Payments, collateral.md §2. */
export const PAY_WINDOW_MS = 48 * 3_600_000;
/** The pay-by pushes, in hours before the deadline. */
export const REMIND_HOURS = [24, 6] as const;
export const DEPOSIT_USD = 250;
/** The soft close (decisions §2 #8): Sell It Now is refused inside the last two minutes of a lot with bids. */
export const SOFT_CLOSE_MS = 120_000;
const DEALER_ROUTES = ['/open', '/close', '/paid', '/pickup', '/car', '/void', '/forfeit', '/copy'];

export class Auction extends DurableObject<Env> {
  private lot: Stored | null = null;

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/lots\/[^/]+/, '') || '/';
    if (req.headers.get('upgrade') === 'websocket') return this.openSocket();
    const lot = await this.load();
    const dealer = req.headers.get('x-dealer') ?? '';   // set by the Worker after it checked the dealer's token
    // The Worker forwards a dealer route only after checking a dealer token, and sends no x-dealer for the admin key
    // (nor does the nightly reconciliation): an empty header, or '*', is the admin. Any other key must be this lot's dealer,
    // whatever the lot's state, closed and sold included.
    const admin = dealer === '' || dealer === '*';
    if (lot && !admin && DEALER_ROUTES.includes(path) && lot.dealer !== dealer) return text('not_your_lot', 403);
    const now = Date.now();
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
        if (lot.bids > 0 && lot.closesAt - now <= SOFT_CLOSE_MS) return text('soft_close', 409);
        lot.closesAt = Math.min(lot.closesAt, Date.now()); await this.save(lot); await this.ctx.storage.setAlarm(lot.closesAt); return json(this.publicLot(lot));
      }
      case 'POST /paid': {   // the dealer saw the money (cash at the lot) or Whop said so
        const why = !lot?.sale ? 'no sale' : lot.sale.voidedAt ? 'sale_voided' : lot.sale.forfeitedAt ? 'sale_forfeited' : null;
        if (why || !lot?.sale) return text(why ?? 'no sale', 409);
        if (lot.sale.paidAt) return json(this.publicLot(lot));   // once
        await this.money(`paid:${lot.id}`, 'balance.paid_at_lot', { lotId: lot.id, buyer: lot.sale.buyer, dealer: lot.dealer, hammer: lot.sale.hammer, balance: this.balance(lot) }, now);
        lot.sale.paidAt = now; await this.save(lot);
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        return json(this.publicLot(lot));
      }
      case 'POST /void': {   // the dealer cannot deliver, or the car did not start: the sale ends, the deposit is released, the incident counts
        const why = !lot?.sale || lot.sale.startedAt ? 'no sale to void' : lot.sale.voidedAt ? 'sale_voided' : lot.sale.forfeitedAt ? 'sale_forfeited' : null;
        if (why || !lot?.sale) return text(why ?? 'no sale to void', 409);
        const b = await req.json<{ reason?: string }>().catch(() => ({} as { reason?: string }));
        const reason = (typeof b.reason === 'string' ? b.reason : '').slice(0, 240);
        const kind = /^no_start$|did not start/i.test(reason) ? 'no_start' : 'non_delivery';   // "It did not start" (decisions §1: starts at pickup or no sale)
        await this.env.DB.prepare('INSERT INTO incidents (id, dealer, lot_id, kind, note, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(`void:${lot.id}:${now}`, lot.dealer, lot.id, kind, reason, now).run();
        await this.money(`release:${lot.id}`, 'deposit.released', { lotId: lot.id, buyer: lot.sale.buyer, dealer: lot.dealer, amount: DEPOSIT_USD, to: 'buyer', kind, paidAt: lot.sale.paidAt ?? null }, now);
        lot.sale.voidedAt = now; lot.sale.deposit = 'released'; await this.save(lot);
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        this.ctx.waitUntil(push(this.env, lot.sale.buyer, kind === 'no_start' ? 'It did not start' : 'The dealer could not deliver', 'Your deposit is yours again.', { lotId: lot.id, screen: 'me' }));
        return json(this.publicLot(lot));
      }
      case 'POST /pickup': {   // the dealer scanned the VIN and the car started: the sale completes, the deposit is applied
        const b = await req.json<{ vin?: string }>().catch(() => ({} as { vin?: string }));
        const six = typeof b.vin === 'string' ? b.vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-6) : '';
        const s = lot?.sale;
        const why = !s ? 'no sale' : s.voidedAt ? 'sale_voided' : s.forfeitedAt ? 'sale_forfeited' : s.startedAt ? 'already_started'
          : six.length !== 6 ? 'vin_required' : !s.paidAt ? 'not_paid' : !lot?.car?.vin ? 'vin_unknown'
          : !lot.car.vin.toUpperCase().endsWith(six) ? 'wrong car' : null;
        if (why || !lot || !s) {
          if (lot) await this.env.DB.prepare('INSERT INTO pickup_refusals (lot_id, dealer, reason, presented, at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(lot.id, lot.dealer, why ?? 'no sale', six || null, now).run().catch(() => {});
          return text(why ?? 'no sale', 409);
        }
        await this.payDealer(lot, 'applied', '', now);   // writes the ledger first; sets startedAt and the payout
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        this.ctx.waitUntil(push(this.env, s.buyer, carName(lot) || 'Your car', 'Started. It is yours.', { lotId: lot.id, screen: 'pickup' }));
        return json(this.publicLot(lot));
      }
      case 'POST /payout': {   // Worker-internal (never forwarded from outside): the dealer_payouts row moved; the Sold page follows it
        if (!admin) return text('admin only', 403);
        const b = await req.json<Partial<PayoutNews>>().catch(() => ({} as Partial<PayoutNews>));
        return this.payoutNews(lot, b);
      }
      case 'POST /forfeit': {   // the buyer did not pay: the deposit is the dealer's (collateral.md §2). The dealer only at the deadline; the admin any time.
        const s = lot?.sale;
        const why = !s ? 'no sale' : s.voidedAt ? 'sale_voided' : s.forfeitedAt ? 'already_forfeited' : s.startedAt ? 'sale_started' : s.paidAt ? 'sale_paid'
          : !admin && now < s.deadlineAt ? 'before_deadline' : null;
        if (why || !lot) return text(why ?? 'no sale', 409);
        const b = await req.json<{ reason?: string }>().catch(() => ({} as { reason?: string }));
        await this.forfeit(lot, 'forfeit', typeof b.reason === 'string' ? b.reason : '', now);
        return json(this.publicLot(lot));
      }
      default: return text('not found', 404);
    }
  }

  /** The alarm: the hammer, then the two pay-by pushes, then the deadline. */
  async alarm(): Promise<void> {
    const lot = await this.load(); if (!lot) return;
    const now = Date.now();
    if (!lot.closed) {
      if (now < lot.closesAt) { await this.ctx.storage.setAlarm(lot.closesAt); return; }   // a refill moved it
      lot.closed = { at: lot.closesAt, sold: lot.bids > 0 && !!lot.leader };
      if (lot.closed.sold && lot.leader) {
        lot.sale = { buyer: lot.leader, hammer: lot.high, wonAt: lot.closesAt, deadlineAt: lot.closesAt + PAY_WINDOW_MS, deposit: 'held' };
        // the same deadline words as the pay-by pushes, the Won screen and the Desk (CP9)
        this.ctx.waitUntil(push(this.env, lot.leader, 'Yours', `$${dollars(lot.high)} · ${carName(lot) || lot.id} · Pay by ${payBy(lot.sale.deadlineAt)}`, { lotId: lot.id, screen: 'won' }));
      }
      await this.save(lot);
      if (lot.sale) await this.scheduleSale(lot, now);
      this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'close' });
      return;
    }
    const s = lot.sale;
    if (!s || s.paidAt || s.startedAt || s.voidedAt || s.forfeitedAt) return;
    if (now >= s.deadlineAt) { await this.forfeit(lot, 'no_pay', '', now); return; }   // throws on a ledger failure: the alarm retries
    const due = REMIND_HOURS.filter(h => now >= s.deadlineAt - h * 3_600_000 && !(lot.reminded ?? []).includes(h));
    if (due.length) {   // one push for the latest due, even if an earlier one was missed; a different pair each time (AD10)
      lot.reminded = [...(lot.reminded ?? []), ...due]; await this.save(lot);
      const h = Math.min(...due), balance = this.balance(lot);
      this.ctx.waitUntil(push(this.env, s.buyer, `Pay by ${payBy(s.deadlineAt)}`, `${balance == null ? '' : `$${dollars(balance)} · `}${h} h left`, { lotId: lot.id, screen: 'won' }));
    }
    await this.scheduleSale(lot, now);
  }

  /** The next sale alarm: the earliest pay-by push not yet sent, else the deadline. */
  private async scheduleSale(lot: Stored, now: number) {
    const s = lot.sale; if (!s) return;
    const next = REMIND_HOURS.map(h => s.deadlineAt - h * 3_600_000).filter((t, i) => t > now && !(lot.reminded ?? []).includes(REMIND_HOURS[i]));
    await this.ctx.storage.setAlarm(Math.min(s.deadlineAt, ...next));
  }

  /** The balance the buyer brings: the out-the-door total less the deposit. Null without the dealer's fees. */
  private balance(lot: Stored): number | null {
    const fees = lot.car?.dealer?.fees; if (!lot.sale || !fees) return null;
    return Math.max(0, outTheDoor(lot.sale.hammer, fees).total - DEPOSIT_USD);
  }

  /** One ledger row, once per id. Throws: the money path never runs ahead of its record. */
  private async money(id: string, type: string, body: Record<string, unknown>, at: number) {
    await this.env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)').bind(id, type, JSON.stringify(body), at).run();
  }

  /** Forfeit (by the dealer or admin, or the deadline alarm): the deposit goes to the dealer by the payout path. */
  private async forfeit(lot: Stored, reason: 'forfeit' | 'no_pay', note: string, now: number) {
    const s = lot.sale!;
    const r = await this.env.DB.prepare('UPDATE buyers SET deposit_status = ?2 WHERE id = ?1 AND deposit_status = ?3').bind(s.buyer, 'forfeited', 'captured').run();
    const held = (r.meta.changes ?? 0) > 0;   // this forfeit took a captured deposit; a second sale by the same buyer finds none
    await this.money(`forfeit:${lot.id}`, 'deposit.forfeited', { lotId: lot.id, buyer: s.buyer, dealer: lot.dealer, amount: DEPOSIT_USD, to: 'dealer', reason, held }, now);
    await this.payDealer(lot, reason, note, now, held);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
    const car = carName(lot) || lot.id;
    this.ctx.waitUntil(push(this.env, s.buyer, 'Deposit forfeited', car, { lotId: lot.id, screen: 'me' }));
    this.ctx.waitUntil(pushDealer(this.env, lot.dealer, 'Deposit forfeited', `${car} · $${DEPOSIT_USD} is yours`, { lotId: lot.id, screen: 'sold' }));
  }

  /** The dealer's $250: a dealer_payouts row (owed), the sale's state, then a Whop transfer when the dealer has a connected
      account. Idempotency key applied:<lot> or forfeit:<lot> (no_pay shares forfeit's). A failed transfer leaves it owed. */
  private async payDealer(lot: Stored, reason: PayoutReason, note: string, now: number, held = true) {
    const s = lot.sale!;
    const key = `${reason === 'applied' ? 'applied' : 'forfeit'}:${lot.id}`;
    if (reason === 'applied') {   // the standing deposit becomes part of the price; release is refused from here on
      const r = await this.env.DB.prepare('UPDATE buyers SET deposit_status = ?2 WHERE id = ?1 AND deposit_status = ?3').bind(s.buyer, 'applied', 'captured').run();
      held = (r.meta.changes ?? 0) > 0;   // not captured at this moment (refunded or disputed): the row says so and nothing is sent
      await this.money(key, 'deposit.applied', { lotId: lot.id, buyer: s.buyer, dealer: lot.dealer, amount: DEPOSIT_USD, held }, now);
    }
    await this.env.DB.prepare('INSERT OR IGNORE INTO dealer_payouts (id, lot_id, dealer, buyer, amount, reason, note, held, state, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)')
      .bind(key, lot.id, lot.dealer, s.buyer, DEPOSIT_USD, reason, note.slice(0, 240) || null, held ? 1 : 0, 'owed', now).run();
    if (reason === 'applied') { s.startedAt = now; s.deposit = 'applied'; } else { s.forfeitedAt = now; s.deposit = 'to_dealer'; }
    s.payout = { state: 'owed' };
    await this.save(lot);
    const whop = new Whop(this.env);
    const acct = held && whop.ready ? (await this.env.DB.prepare('SELECT whop_account FROM dealers WHERE gdn = ?1').bind(lot.dealer).first<{ whop_account: string | null }>())?.whop_account : null;
    if (!acct) return;   // no connected account (or nothing held): owed, for the admin to settle
    try {
      const t = await whop.transferToDealer(acct, DEPOSIT_USD, key, `${reason} ${lot.id}`);
      await this.env.DB.prepare('UPDATE dealer_payouts SET state = ?2, transfer_id = ?3, sent_at = ?4, error = NULL WHERE id = ?1').bind(key, 'sent', t.id, Date.now()).run();
      await this.money(`payout:${key}`, 'payout.sent', { lotId: lot.id, dealer: lot.dealer, amount: DEPOSIT_USD, reason, transferId: t.id }, Date.now());
      s.payout = { state: 'sent', transferId: t.id };
      await this.save(lot);
    } catch (e) {
      await this.env.DB.prepare('UPDATE dealer_payouts SET error = ?2 WHERE id = ?1').bind(key, String((e as Error)?.message ?? e).slice(0, 240)).run().catch(() => {});
    }
  }

  /** The payout as dealer_payouts now says it: sent by the retry (with the transfer id) or paid by hand (with the method).
      Idempotent: the same news twice answers the same lot. A payout already settled another way is 409 `payout_settled`. */
  private async payoutNews(lot: Stored | null, b: Partial<PayoutNews>): Promise<Response> {
    const s = lot?.sale;
    if (!lot || !s?.payout) return text('no_payout', 409);
    const key = `${s.startedAt ? 'applied' : 'forfeit'}:${lot.id}`;
    if (b.id !== key) return text('wrong_payout', 409);
    const at = typeof b.at === 'number' && Number.isFinite(b.at) && b.at > 0 ? b.at : null;
    const next: LotPayout | null = !at ? null
      : b.state === 'sent' && typeof b.transferId === 'string' && b.transferId ? { state: 'sent', transferId: b.transferId.slice(0, 120), at }
      : b.state === 'paid' && (b.method === 'wire' || b.method === 'check' || b.method === 'cash') ? { state: 'paid', method: b.method, at }
      : null;
    if (!next) return text('bad_payout', 400);
    const cur = s.payout;
    if (cur.state !== 'owed') {   // once settled, only the same news again
      const same = cur.state === next.state && (next.state === 'sent' ? cur.transferId === next.transferId : cur.method === next.method);
      return same ? json(this.publicLot(lot)) : text('payout_settled', 409);
    }
    s.payout = next;
    await this.save(lot);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
    return json(this.publicLot(lot));
  }

  private async open(o: OpenRequest, dealer: string): Promise<Response> {
    const existing = await this.load();
    if (existing && !existing.closed) return text('already open', 409);
    if (existing?.sale) return text('sale_exists', 409);   // an id that carries a sale is never reopened: the sale's record stays whole
    if (o.car) { const why = collateralRefusal(o.car.collateral); if (why) return text(why, 422); }   // docs/plan/collateral.md §5
    const lot: Stored = { id: o.id, dealer: (dealer && dealer !== '*') ? dealer : o.dealer, start: o.start, retail: o.retail, opensAt: o.opensAt ?? Date.now(), closesAt: o.closesAt, high: o.start, bids: 0, watching: 0, car: o.car };
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
  private publicLot(lot: Stored): Lot { const { dealer: _d, max: _m, reminded: _r, ...pub } = lot; return { ...pub, max: undefined } as Lot; }   // sale.payout may be 'paid' (LotPayout)

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

const carName = (lot: Stored) => lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : '';
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
const text = (t: string, status: number) => new Response(t, { status });
