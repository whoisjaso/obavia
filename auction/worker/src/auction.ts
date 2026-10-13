/* One Durable Object per lot. The same rules the app runs locally
   (src/engine/auction.ts) run here, with the authority: a bid is one
   transaction that writes the price, the close time and the ack together;
   the ack is what the glass thumps on. The close is an alarm plus a read-time
   check. After the hammer the same alarm carries the buyer's 48-hour deadline:
   a pay-by push at 24 h and at 6 h before it, then the no-pay forfeit at it,
   then the under-bidder's 12-hour second-chance offer and its expiry
   (decisions §2 row 9). Every connected phone gets the lot on every change
   over a hibernating WebSocket. D1 gets a copy. */
import { DurableObject } from 'cloudflare:workers';
import { closeAfterBid, proxy, type Proxy } from '../../src/engine/auction';
import { collateralRefusal, type CarMeta } from '../../src/engine/meta';
import type { Ack, BidRequest, Event, Lot } from '../../src/engine/server';
import type { Env } from './env';
import { outTheDoor, dollars } from '../../src/engine/money';
import type { Payout, Plates, PlatesState, SaleState } from '../../src/engine/meta';
import { payBy, push, pushDealer } from './push';
import { shillMatch, type Who } from './bidders';
import { Whop } from './whop';

/** The lane a lot runs on (Wave 4, phases.md Phase 4 Server): public (every phone, buyer tokens bid) or closed (dealer keys bid,
    buyer tokens are refused, no Buyers Guide, both GDNs on the sale). Absent is public. */
export type Lane = 'public' | 'closed';
export const LANES: readonly Lane[] = ['public', 'closed'];
/** The car as the lane carries it: the engine's CarMeta plus what Wave 4 adds. `lane`; `audioKey` and `videoKey`, the R2 keys
    PUT /lots/:id/audio and /video wrote (lots/<id>/audio.mp4 or .webm, lots/<id>/video.mp4 or .webm), which GET /lots/:id/audio
    and /video stream. The engine's meta.ts does not carry them yet (the phone agent adds them there, as with form130U). */
export type LaneCarMeta = CarMeta & { lane?: Lane; audioKey?: string; videoKey?: string };
export type OpenRequest = { id: string; dealer: string; start: number; retail: number; opensAt?: number; closesAt: number; car?: LaneCarMeta };
export type { Payout, Plates, PlatesState, SaleState };   // LotPlates and Form130U below: the plates with the Desk's Filed mark
/** The dealer's $250 as the lot keeps it: owed, sent by a Whop transfer, or paid by hand (wire, check, cash). Wider than the
    engine's Payout (src/engine/meta.ts, 'owed' | 'sent'), which does not yet carry 'paid', the method or the time. */
export type LotPayout = { state: 'owed' | 'sent' | 'paid'; transferId?: string; method?: PayMethod; at?: number };
export type PayMethod = 'wire' | 'check' | 'cash';
/** POST /payout, Worker-internal: the dealer_payouts row moved outside the object (paid by hand, or sent by the retry). */
export type PayoutNews = { id: string; state: 'sent' | 'paid'; transferId?: string; method?: PayMethod; at: number };
/** The second-chance offer (decisions §2 row 9): at a no-pay forfeit the under-bidder is offered the car at their own
    ceiling for twelve hours. `buyer` is the under-bidder, `amount` their max; accepted writes the new sale, the alarm
    expires it. The engine's SaleState (src/engine/meta.ts) does not carry it yet: W3-D adds `offer` there. */
export type Offer = { buyer: string; amount: number; madeAt: number; expiresAt: number; acceptedAt?: number; expiredAt?: number };
/** On a closed lot's sale the two licences (Wave 4): the bidding dealer's GDN (the leader is `d:<gdn>`) and the selling dealer's. */
type StoredSale = Omit<SaleState, 'payout'> & { payout?: LotPayout; offer?: Offer; buyerGdn?: string; sellerGdn?: string };
/** `under`: the standing under-bidder and their ceiling, kept only here (never on the wire), for the offer.
    `prior`: sales this lot carried before the current one (a forfeit whose offer was taken), kept whole. */
type Stored = Omit<Lot, 'sale' | 'car'> & { car?: LaneCarMeta; sale?: StoredSale; dealer: string; reminded?: number[]; under?: { bidder: string; max: number }; prior?: StoredSale[] };   // reminded: the pay-by pushes sent, in hours before the deadline
type PayoutReason = 'applied' | 'forfeit' | 'no_pay';
/** The Desk's patch of the car: CarMeta, plus the dealer's own Marketplace listing URL (deviation 6; W3-C sends it, the lane carries it). */
type CarPatch = Partial<LaneCarMeta> & { listingUrl?: unknown };
/** What the nightly alarm audit reads (src/reconcile.ts): the lot's clocks and state, read without dropping the hammer. */
export type Audit = { id: string; closesAt: number; closed: boolean; sale: null | { deadlineAt: number; settled: boolean; offerExpiresAt: number | null; offerSettled: boolean } };
/** The bid as the Worker forwards it: the engine's request plus what the Worker knows of the bidder (D11). */
export type BidIn = BidRequest & { who?: Who };

/** The pay window: 48 h from the hammer. The standing value: decisions §7 (open for the owner until Fri Oct 30, 2026; §1 says 72 h),
    growth plan §5 changelog 2026-10-12 ("The owner resolves it by Fri Oct 16 or 48 hours stands"), phases Phase 1 Payments, collateral.md §2. */
export const PAY_WINDOW_MS = 48 * 3_600_000;
/** The pay-by pushes, in hours before the deadline. */
export const REMIND_HOURS = [24, 6] as const;
/** The second-chance offer's window: 12 hours from the no-pay forfeit (decisions §2 row 9; gap table deviation 8 keeps it). */
export const OFFER_WINDOW_MS = 12 * 3_600_000;
/** A Marketplace listing URL the lane will carry: https, at most 300 characters, no control characters. */
export const LISTING_URL_MAX = 300;
export const listingUrlOf = (v: unknown): string | null => typeof v === 'string' && v.length <= LISTING_URL_MAX && /^https:\/\/[^\s\u0000-\u001f\u007f]+$/.test(v) ? v : null;
export const DEPOSIT_USD = 250;
/** The soft close (decisions §2 #8): Sell It Now is refused inside the last two minutes of a lot with bids. */
export const SOFT_CLOSE_MS = 120_000;
const DEALER_ROUTES = ['/open', '/close', '/paid', '/pickup', '/car', '/void', '/forfeit', '/plates', '/copy', '/audit', '/dev/clock'];
/** The plates clock, forward only (phases.md Phase 2 Paperwork: filed, approved, mailed, kickback): what may follow each state.
    A kickback follows filed and is followed by filed again (the Desk fixed the 130-U and refiled). Nothing follows mailed. */
export const PLATES_NEXT: Record<'none' | PlatesState, readonly PlatesState[]> = {
  none: ['filed'], filed: ['approved', 'kickback'], kickback: ['filed'], approved: ['mailed'], mailed: [],
};
const PLATES_STATES: readonly PlatesState[] = ['filed', 'approved', 'mailed', 'kickback'];
/** The filed 130-U the Desk's Filed mark names (desk/src/lib/filed.ts FiledMark; gap table W3-F "the Desk's Filed mark carries the
    filed 130-U's hash"): the SHA-256 of the bytes that went to the county, the business date it was filed on (YYYY-MM-DD) and the
    agent on its seller line. Kept on sale.plates.form130U from the filed tap that carried it; wider than the engine's Plates
    (src/engine/meta.ts), as LotPayout is wider than Payout. */
export type Form130U = { sha256: string; filedOn: string; agent?: string };
export type LotPlates = Plates & { form130U?: Form130U };
const SHA256_HEX = /^[0-9a-f]{64}$/i, DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The mark as sent: undefined when absent, null when malformed (400 bad_mark), else the three fields trimmed. */
function form130UFrom(x: unknown): Form130U | null | undefined {
  if (x === undefined) return undefined;
  if (!x || typeof x !== 'object') return null;
  const m = x as Record<string, unknown>;
  if (typeof m.sha256 !== 'string' || !SHA256_HEX.test(m.sha256)) return null;
  if (typeof m.filedOn !== 'string' || !DAY.test(m.filedOn)) return null;
  const [y, mo, d] = m.filedOn.split('-').map(Number), t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;   // 2026-02-30 is not a day
  if (m.agent !== undefined && typeof m.agent !== 'string') return null;
  const agent = typeof m.agent === 'string' ? m.agent.trim() : '';
  if (agent.length > 60) return null;
  return agent ? { sha256: m.sha256.toLowerCase(), filedOn: m.filedOn, agent } : { sha256: m.sha256.toLowerCase(), filedOn: m.filedOn };
}

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
      case 'GET /': { if (!lot) return text('no lot', 404); await this.hammer(lot, now); return json(this.publicLot(lot)); }   // the read-time close writes the sale too
      case 'POST /open': return this.open(await req.json<OpenRequest>(), dealer);
      case 'POST /car': {   // the Desk updates photos, documents, hours, the listing URL after Go
        if (!lot) return text('no lot', 404);
        const patch = await req.json<CarPatch>();
        if ('listingUrl' in patch && patch.listingUrl != null && !listingUrlOf(patch.listingUrl)) return text('bad_listing', 400);   // https only; null clears it
        if ('lane' in patch && patch.lane !== lot.car?.lane) return text('lane_fixed', 409);   // the lane is set at open and never moves: who may bid does not change under a bidder
        for (const k of ['audioKey', 'videoKey'] as const) if (k in patch && patch[k] !== undefined && !mediaKeyOf(lot.id, k, patch[k])) return text('bad_media_key', 400);   // only the keys the Worker's own PUT writes
        if (patch.collateral) {   // the floor can move only while nobody has bid, only down, and only on collateral the lane still accepts
          const why = collateralRefusal(patch.collateral); if (why) return text(why, 422);
          if (lot.bids > 0 && patch.collateral.floor !== lot.car?.collateral.floor) return text('bids placed', 409);
          if (patch.collateral.floor > (lot.car?.collateral.floor ?? lot.start)) return text('floor only lowers', 409);
          lot.start = patch.collateral.floor; lot.high = patch.collateral.floor;
        }
        lot.car = { ...(lot.car as LaneCarMeta), ...patch } as LaneCarMeta;
        await this.save(lot); this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'bid' }); return json(this.publicLot(lot));
      }
      case 'POST /copy': {   // the nightly reconciliation: the object rewrites its own D1 copy (not routed by the Worker)
        if (!lot) return text('no lot', 404);
        await this.copy(lot); return json(this.publicLot(lot));
      }
      case 'POST /audit': {   // the nightly alarm audit (src/reconcile.ts): the clocks as stored, no hammer, no change (Worker-internal, admin only)
        if (!admin) return text('admin only', 403);
        if (!lot) return text('no lot', 404);
        return json(this.audit(lot));
      }
      case 'POST /offer/accept': {   // the under-bidder takes the second-chance offer: the new sale, its own deadline, its own payout (the Worker checked the token and the deposit)
        if (!lot?.sale?.offer) return text('no_offer', 409);
        const buyer = req.headers.get('x-buyer') ?? '';
        const o = lot.sale.offer;
        if (!buyer || buyer !== o.buyer) return text('not_yours', 403);
        if (o.acceptedAt) return json(this.publicLot(lot));   // once: the same answer again
        if (o.expiredAt || now >= o.expiresAt) return text('offer_expired', 409);
        return this.acceptOffer(lot, now);
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
      case 'POST /plates': {   // the Desk marks the county's clock on a started sale: filed, approved, mailed, or a kickback
        const s = lot?.sale;
        const why = !s ? 'no sale' : s.voidedAt ? 'sale_voided' : s.forfeitedAt ? 'sale_forfeited' : !s.startedAt ? 'not_started' : null;
        if (why || !lot || !s) return text(why ?? 'no sale', 409);
        const b = await req.json<{ state?: unknown; note?: unknown; form130U?: unknown }>().catch(() => ({} as { state?: unknown; note?: unknown; form130U?: unknown }));
        const state = PLATES_STATES.find(x => x === b.state);
        if (!state) return text('bad_state', 400);
        const form130U = form130UFrom(b.form130U);   // the Desk's Filed mark: only beside filed, and whole or not at all
        if (form130U === null || (form130U && state !== 'filed')) return text('bad_mark', 400);
        if (s.plates?.state === state) return json(this.publicLot(lot));   // the same word again (a retried tap) changes nothing, the mark included
        if (!PLATES_NEXT[s.plates?.state ?? 'none'].includes(state)) return text('plates_order', 409);
        const note = typeof b.note === 'string' ? b.note.trim().slice(0, 240) : '';
        const plates: LotPlates = { state, at: now, ...(note ? { note } : {}), ...(form130U ? { form130U } : {}) };
        // the record first, like every sale event; no money moves, so no amount
        await this.money(`plates:${lot.id}:${now}`, 'sale.plates', { lotId: lot.id, buyer: s.buyer, dealer: lot.dealer, state, from: s.plates?.state ?? null, note: note || null, form130U: form130U ?? null, actor: 'dealer' }, now);
        s.plates = plates; await this.save(lot);
        this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
        if (state === 'mailed') this.ctx.waitUntil(push(this.env, s.buyer, 'Plates mailed', carName(lot) || lot.id, { lotId: lot.id, screen: 'won' }));   // the one push: the ring's last tick
        return json(this.publicLot(lot));
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
      case 'POST /dev/clock': {   // test aid (DEV=1 only; the Worker gates it too): move closesAt or the sale's deadlineAt, then re-arm the alarm at the earliest pending time
        if (this.env.DEV !== '1') return text('not found', 404);
        if (!lot) return text('no lot', 404);
        const b = await req.json<{ deadlineAt?: unknown; closesAt?: unknown }>().catch(() => ({} as { deadlineAt?: unknown; closesAt?: unknown }));
        const ms = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
        const closesAt = ms(b.closesAt), deadlineAt = ms(b.deadlineAt);
        if (closesAt == null && deadlineAt == null) return text('bad_clock', 400);
        if (deadlineAt != null && !lot.sale) return text('no sale', 409);
        if (closesAt != null) lot.closesAt = closesAt;
        if (deadlineAt != null && lot.sale) lot.sale.deadlineAt = deadlineAt;
        await this.save(lot);
        await this.rearm(lot, now);
        return json({ ok: true, alarmAt: await this.ctx.storage.getAlarm() });
      }
      default: return text('not found', 404);
    }
  }

  /** The alarm re-armed at the earliest pending time, by the same paths the lane uses: the close, the open offer's expiry, else the sale's pushes and deadline. */
  private async rearm(lot: Stored, now: number): Promise<void> {
    if (!lot.closed) { await this.ctx.storage.setAlarm(lot.closesAt); return; }
    const s = lot.sale; if (!s) return;
    if (s.forfeitedAt && s.offer && !s.offer.acceptedAt && !s.offer.expiredAt) { await this.ctx.storage.setAlarm(s.offer.expiresAt); return; }
    if (s.paidAt || s.startedAt || s.voidedAt || s.forfeitedAt) return;
    await this.scheduleSale(lot, now);
  }

  /** The alarm: the hammer, then the two pay-by pushes, then the deadline. */
  async alarm(): Promise<void> {
    const lot = await this.load(); if (!lot) return;
    const now = Date.now();
    if (!lot.closed) {
      if (now < lot.closesAt) { await this.ctx.storage.setAlarm(lot.closesAt); return; }   // a refill moved it
      await this.hammer(lot, now);   // a read since the close already did this: then the alarm is a no-op here
      return;
    }
    const s = lot.sale;
    if (!s) return;
    if (s.forfeitedAt && s.offer && !s.offer.acceptedAt && !s.offer.expiredAt) {   // the second-chance offer runs out
      if (now < s.offer.expiresAt) { await this.ctx.storage.setAlarm(s.offer.expiresAt); return; }
      await this.money(`offer_expired:${lot.id}`, 'sale.offer_expired', { lotId: lot.id, buyer: s.offer.buyer, dealer: lot.dealer, amount: s.offer.amount, actor: 'lane' }, now);
      s.offer.expiredAt = now; await this.save(lot);
      this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
      return;
    }
    if (s.paidAt || s.startedAt || s.voidedAt || s.forfeitedAt) return;
    if (now >= s.deadlineAt) { await this.forfeit(lot, 'no_pay', '', now); return; }   // throws on a ledger failure: the alarm retries
    const due = REMIND_HOURS.filter(h => now >= s.deadlineAt - h * 3_600_000 && !(lot.reminded ?? []).includes(h));
    if (due.length) {   // one push for the latest due, even if an earlier one was missed; a different pair each time (AD10)
      lot.reminded = [...(lot.reminded ?? []), ...due]; await this.save(lot);
      const h = Math.min(...due), balance = this.balance(lot);
      this.ctx.waitUntil(push(this.env, s.buyer, `Pay by ${payBy(s.deadlineAt)}`, `${balance == null ? '' : `$${dollars(balance)} · `}${h} h left`, { lotId: lot.id, screen: 'won' }));
    }
    await this.scheduleSale(lot, now);
  }

  /** The hammer, once: the lot closes and, with a leader, the sale is written with its deadline, in the same write. Run by the
      alarm and by every read past the close (GET, the socket's first frame, a late bid), so no phone or Desk ever sees a lot
      closed and sold without its sale: the alarm on a loaded box can run tens of seconds after closesAt (the Phase 1 walk saw
      about 90 s), and in that window the Desk showed Done with no Sold and the phone opened Won with no deadline. Idempotent:
      lot.closed is set in memory before the first await, so a second entrant (the alarm after a read, or the reverse) finds it
      set and does nothing. Nothing happens before closesAt. */
  private async hammer(lot: Stored, now: number): Promise<void> {
    if (lot.closed || now < lot.closesAt) return;
    lot.closed = { at: lot.closesAt, sold: lot.bids > 0 && !!lot.leader };
    if (lot.closed.sold && lot.leader) {
      lot.sale = { buyer: lot.leader, hammer: lot.high, wonAt: lot.closesAt, deadlineAt: lot.closesAt + PAY_WINDOW_MS, deposit: 'held' };
      if (lot.car?.lane === 'closed') { lot.sale.buyerGdn = gdnOfBidder(lot.leader) ?? undefined; lot.sale.sellerGdn = lot.dealer; }   // the closed lane: both licences on the sale (Wave 4)
      // the same deadline words as the pay-by pushes, the Won screen and the Desk (CP9)
      this.ctx.waitUntil(push(this.env, lot.leader, 'Yours', `$${dollars(lot.high)} · ${carName(lot) || lot.id} · Pay by ${payBy(lot.sale.deadlineAt)}`, { lotId: lot.id, screen: 'won' }));
    }
    await this.save(lot);
    if (lot.sale) await this.scheduleSale(lot, now);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'close' });
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
    if (reason === 'no_pay') await this.offer(lot, now);   // the under-bidder's second chance (decisions §2 row 9)
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
    const car = carName(lot) || lot.id;
    this.ctx.waitUntil(push(this.env, s.buyer, 'Deposit forfeited', car, { lotId: lot.id, screen: 'me' }));
    this.ctx.waitUntil(pushDealer(this.env, lot.dealer, 'Deposit forfeited', `${car} · $${DEPOSIT_USD} is yours`, { lotId: lot.id, screen: 'sold' }));
  }

  /** The second-chance offer (decisions §2 row 9; gap table W3-B): at a no-pay forfeit, the standing under-bidder (a deposit
      still captured, not the buyer who walked) is offered the car at their own ceiling for twelve hours. The ledger row first,
      then sale.offer, then the alarm at its expiry and the push "Second chance · <car> · $X · 12 h" (screen offer). No
      under-bidder, or one whose deposit is gone: nothing is written and the Desk's Sold shows Relist alone. */
  private async offer(lot: Stored, now: number) {
    const s = lot.sale!, u = lot.under;
    if (!u || u.bidder === s.buyer || !(u.max > 0)) return;
    const row = await this.env.DB.prepare('SELECT deposit_status FROM buyers WHERE id = ?1').bind(u.bidder).first<{ deposit_status: string }>();
    if (row?.deposit_status !== 'captured') return;
    const offer: Offer = { buyer: u.bidder, amount: u.max, madeAt: now, expiresAt: now + OFFER_WINDOW_MS };
    await this.money(`offer:${lot.id}:${now}`, 'sale.offer', { lotId: lot.id, buyer: u.bidder, dealer: lot.dealer, amount: u.max, expiresAt: offer.expiresAt, actor: 'lane' }, now);
    s.offer = offer; await this.save(lot);
    await this.ctx.storage.setAlarm(offer.expiresAt);
    this.ctx.waitUntil(push(this.env, u.bidder, 'Second chance', `${carName(lot) || lot.id} · $${dollars(u.max)} · 12 h`, { lotId: lot.id, screen: 'offer' }));
  }

  /** The offer taken: the forfeited sale is kept whole under `prior`, and the lot carries a new sale for the under-bidder at
      the offer's amount with its own 48-hour deadline, its own pay-by pushes and, at the engine start, its own payout
      (applied:<lot>, apart from the forfeit's forfeit:<lot>). The same "Yours" push as the hammer (CP9: the same words). */
  private async acceptOffer(lot: Stored, now: number): Promise<Response> {
    const old = lot.sale!, o = old.offer!;
    const deadlineAt = now + PAY_WINDOW_MS;
    await this.money(`offer_accepted:${lot.id}:${now}`, 'sale.offer_accepted', { lotId: lot.id, buyer: o.buyer, dealer: lot.dealer, amount: o.amount, hammer: o.amount, deadlineAt, actor: 'buyer' }, now);
    o.acceptedAt = now;
    lot.prior = [...(lot.prior ?? []), old];
    lot.sale = { buyer: o.buyer, hammer: o.amount, wonAt: now, deadlineAt, deposit: 'held' };
    lot.high = o.amount; lot.leader = o.buyer; lot.under = undefined; lot.reminded = [];
    if (lot.closed) lot.closed = { ...lot.closed, sold: true };
    await this.save(lot);
    await this.scheduleSale(lot, now);
    this.broadcast({ lotId: lot.id, lot: this.publicLot(lot), kind: 'sale' });
    const car = carName(lot) || lot.id;
    this.ctx.waitUntil(push(this.env, o.buyer, 'Yours', `$${dollars(o.amount)} · ${car} · Pay by ${payBy(deadlineAt)}`, { lotId: lot.id, screen: 'won' }));
    this.ctx.waitUntil(pushDealer(this.env, lot.dealer, 'Second chance taken', `${car} · $${dollars(o.amount)}`, { lotId: lot.id, screen: 'sold' }));
    return json(this.publicLot(lot));
  }

  /** The clocks as stored, for the nightly alarm audit; nothing here closes, forfeits or expires anything. */
  private audit(lot: Stored): Audit {
    const s = lot.sale;
    return { id: lot.id, closesAt: lot.closesAt, closed: !!lot.closed, sale: !s ? null : {
      deadlineAt: s.deadlineAt, settled: !!(s.paidAt || s.startedAt || s.voidedAt || s.forfeitedAt),
      offerExpiresAt: s.offer?.expiresAt ?? null, offerSettled: !s.offer || !!(s.offer.acceptedAt || s.offer.expiredAt) } };
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
    // the sale that carries this payout: the current one, or a forfeited sale kept under `prior` once its offer was taken
    const keyOf = (x: StoredSale) => `${x.startedAt ? 'applied' : 'forfeit'}:${lot!.id}`;
    const s = lot ? [lot.sale, ...(lot.prior ?? [])].find(x => x?.payout && keyOf(x) === b.id) ?? lot.sale : undefined;
    if (!lot || !s?.payout) return text('no_payout', 409);
    const key = keyOf(s);
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
    if (o.car?.lane !== undefined && !LANES.includes(o.car.lane)) return text('bad_lane', 400);   // public or closed; absent is public (the Worker checked the wholesale GDN for closed)
    if (o.car && (o.car.audioKey !== undefined || o.car.videoKey !== undefined)) return text('bad_media_key', 400);   // the media keys come only from PUT /lots/:id/audio and /video
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
      await this.hammer(lot, now);   // a late bid finds the lot closed and sold with its sale, as a read does
      ack = { ok: false, reason: 'closed', lot: this.publicLot(lot), lateByMs: now - lot.closesAt, stampedAt: now };
    } else {
      const before: Proxy = { high: lot.high, leader: lot.leader, max: lot.max };
      const after = proxy(before, { id: req.bidder, amount: req.amount, max: req.max }, lot.bids > 0);
      if (after === before) {
        ack = { ok: false, reason: 'low', lot: this.publicLot(lot), stampedAt: now };
      } else {
        if (lot.leader && lot.leader !== after.leader && lot.leader !== req.bidder) outbid = lot.leader;
        // the standing under-bidder, for the second-chance offer: the leader just beaten keeps their ceiling; a challenger
        // a standing ceiling beat stands at theirs when it tops the one kept; a leader raising their own changes nothing
        if (outbid && lot.max != null) lot.under = { bidder: outbid, max: lot.max };
        else if (after.leader !== req.bidder && (!lot.under || lot.under.bidder === req.bidder || req.max > lot.under.max)) lot.under = { bidder: req.bidder, max: req.max };
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
    if (lot) await this.hammer(lot, Date.now());   // the first frame never shows a closed, sold lot without its sale
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
  private publicLot(lot: Stored): Lot { const { dealer: _d, max: _m, reminded: _r, under: _u, prior: _p, ...pub } = lot; return { ...pub, max: undefined } as Lot; }   // sale.payout may be 'paid' (LotPayout); sale.offer rides along

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
/** A dealer bidding on the closed lane is `d:<gdn>` in the bid log and as the leader; the GDN back out of it, or null for a buyer id. */
export const gdnOfBidder = (bidder: string | undefined): string | null => { const m = /^d:([A-Z0-9]{5,12})$/.exec(bidder ?? ''); return m ? m[1] : null; };
/** The one R2 key each media kind may carry on a lot: lots/<id>/audio.mp4 or .webm, lots/<id>/video.mp4 or .webm; null clears it. */
export const mediaKeyOf = (lotId: string, kind: 'audioKey' | 'videoKey', v: unknown): boolean => v === null || (typeof v === 'string' && ['mp4', 'webm'].some(ext => v === `lots/${lotId}/${kind === 'audioKey' ? 'audio' : 'video'}.${ext}`));
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
const text = (t: string, status: number) => new Response(t, { status });
