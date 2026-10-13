/* Who may bid. Three rules from docs/plan/obavia-auction-decisions.md §9:
   D10, the auction terms accepted with the first bid ever; D11, the seller
   never bids on his own car; D15, four wins a calendar year. Two more from
   phases.md Phase 2 (Server row, Wave 2-E): one open bid per buyer until the
   first car is paid (sim 03), and a ceiling on bids per buyer per minute. */
import type { CarMeta } from '../../src/engine/meta';

/** D15 (decisions §9; Transp. Code §503.024(a)(1), read 2026-10-13): a person selling fewer than
    five vehicles in a calendar year needs no GDN, so a buyer wins at most four cars a calendar year. */
export const WINS_PER_YEAR = 4;

/** Sim 03 (phases.md Phase 2 Server row; copart-decoded.md §3.3 #2: "one bid at a time until the first car is paid for").
    A buyer with no paid car holds at most one open bid across every lot: a lot led now, or a sale won and not yet paid.
    A paid car (sale.paidAt, or started, and not voided) lifts the gate for good. Being outbid, or the sale's void or
    forfeit, frees the one slot. */
export const OPEN_BIDS_UNTIL_PAID = 1;

/** The bids-per-buyer rate limit, across every lot, over a rolling minute. 20: the engine moves one increment a bid
    ($25 to $500, src/engine/auction.ts increment) and refills the close to exactly 2:00 on every bid inside the last two
    minutes, so a war between two people on one lot runs at a bid every five to ten seconds per buyer (the push, the
    glance, the tap, the hold above twice the high): six to twelve a minute. Twenty is above the fastest human cadence
    on the glass and below what a script does. A retried request (the same idempotency key) is never counted twice. */
export const BIDS_PER_MINUTE = 20;
export const BID_WINDOW_MS = 60_000;

/** D10 (decisions §4 and §9; Bus. & Com. Code §2.328(b), (c), (d); Transp. Code §501.0234(f), read 2026-10-13).
    The version the app sends with the first bid; a new wording is a new version. Wording goes to counsel (question 4). */
export const TERMS_VERSION = '2026-10-13';
export const TERMS = [
  'with reserve unless marked no reserve',
  'neither the seller nor Obavia bids',
  'bids are irrevocable',
  'the sale completes at the VIN scan and engine start',
] as const;

/** Midnight, January 1, Central time, of the year `now` falls in (Texas; January is always CST, UTC-6).
    El Paso's Mountain time starts an hour later, so this counts a win made in that hour: the stricter side. */
export function yearStart(now: number): number {
  const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric' }).format(now));
  return Date.UTC(y, 0, 1, 6);
}

/** The cars that count against a buyer's year, from the D1 copy, in one statement:
    `wins`, sales started (VIN scanned, engine started) since January 1;
    `committed`, those plus sales won and not yet started, voided or forfeited, plus lots the buyer leads now
    (both other than `lotId`), because each of them can become a win this year. The cap is checked against `committed`.
    The lot being bid on is left out of `owed` as of `leading`: a bid on the lot of a sale the buyer owes is a bid on a
    closed lot, which the object stamps `closed` with the server's time (the record), and it can become no new win.
    `paid`, sales the buyer paid for (paidAt, or started) and the dealer did not void: one lifts the one-open-bid gate.
    `openBids` (below) is `owed` plus `leading`: what the one-open-bid gate counts. */
export const COUNT_SQL = `
  SELECT
    (SELECT COUNT(*) FROM lots WHERE json_extract(lot, '$.sale.buyer') = ?1 AND json_extract(lot, '$.sale.startedAt') >= ?2) AS wins,
    (SELECT COUNT(*) FROM lots WHERE json_extract(lot, '$.sale.buyer') = ?1 AND json_extract(lot, '$.sale.startedAt') IS NULL
       AND json_extract(lot, '$.sale.voidedAt') IS NULL AND json_extract(lot, '$.sale.forfeitedAt') IS NULL AND id != ?3) AS owed,
    (SELECT COUNT(*) FROM lots WHERE json_extract(lot, '$.closed') IS NULL AND json_extract(lot, '$.leader') = ?1 AND id != ?3) AS leading,
    (SELECT COUNT(*) FROM lots WHERE json_extract(lot, '$.sale.buyer') = ?1 AND json_extract(lot, '$.sale.voidedAt') IS NULL
       AND (json_extract(lot, '$.sale.paidAt') IS NOT NULL OR json_extract(lot, '$.sale.startedAt') IS NOT NULL)) AS paid`;

export type Counts = { wins: number; owed: number; leading: number; paid: number };
export const committed = (c: Counts) => c.wins + c.owed + c.leading;
export const winsLeft = (c: Counts) => Math.max(0, WINS_PER_YEAR - committed(c));
/** The open bids the gate counts: lots led now (other than the one being bid on) and sales won, not yet paid, not voided or forfeited. */
export const openBids = (c: Pick<Counts, 'owed' | 'leading'>) => c.owed + c.leading;
/** Sim 03: true when this bid would be a second open bid for a buyer with no paid car. Raising on the lot already led is not a second. */
export const oneOpenBidRefuses = (c: Counts) => c.paid === 0 && openBids(c) >= OPEN_BIDS_UNTIL_PAID;

/** What the Worker knows about a bidder, passed to the lot's object for D11. All of it is self-reported at sign-in. */
export type Who = { phone?: string | null; address?: string | null; name?: string | null };

export function phoneDigits(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  let d = v.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? d : null;
}
const flat = (v: unknown, min: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.toLowerCase().replace(/[^a-z0-9]/g, '');
  return s.length >= min ? s : null;
};

/** D11: the first field the bidder shares with the lot's seller, or null. `checked` names the fields that could be compared. */
export function shillMatch(who: Who | undefined, dealer: CarMeta['dealer'] | undefined): { matched: string | null; checked: string } {
  const checked: string[] = []; let matched: string | null = null;
  if (!who || !dealer) return { matched, checked: '' };
  const phone = phoneDigits(who.phone);
  const dealerPhones = [phoneDigits(dealer.phone), phoneDigits(dealer.afterHours)].filter(Boolean);
  if (phone && dealerPhones.length) { checked.push('phone'); if (dealerPhones.includes(phone)) matched ??= 'phone'; }
  const street = flat(who.address, 6), dealerStreet = flat(dealer.street, 6);
  if (street && dealerStreet) { checked.push('address'); if (street === dealerStreet) matched ??= 'address'; }
  const name = flat(who.name, 4), dealerName = flat(dealer.name, 4);
  if (name && dealerName) { checked.push('name'); if (name === dealerName) matched ??= 'name'; }
  return { matched, checked: checked.join(',') };
}
