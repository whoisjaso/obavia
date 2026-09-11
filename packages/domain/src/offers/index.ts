/**
 * Offer Studio engine — owning module agent: M-script.
 *
 * Rules implemented here (brief §5, CONVENTIONS §8):
 * - A blank price is `null`, rendered as "Not set" — never $0, never an invented default.
 * - Fictional / practice-only offers never populate the live offer list.
 * - Status moves draft → reviewed → published → retired; a published offer is immutable.
 * - Only a published, non-fictional offer with a complete price may be quoted.
 */
import { z } from 'zod';
import { ApprovalStatus } from '../schemas/scripts';
import type { OfferPrice, OfferVersion } from '../schemas/offers';

export const MODULE = 'offers' as const;

/** Status chain in order. */
export const OFFER_STATUS_ORDER: readonly ApprovalStatus[] = ['draft', 'reviewed', 'published', 'retired'];

/** Live offers: structurally excludes fictional and practice-only fixtures. */
export function liveOffers(offers: readonly OfferVersion[]): OfferVersion[] {
  return offers.filter((o) => !o.fictional && !o.practice_only);
}

/** Practice fixtures: fictional or practice-only offers, for the Practice fixtures tab only. */
export function practiceOffers(offers: readonly OfferVersion[]): OfferVersion[] {
  return offers.filter((o) => o.fictional || o.practice_only === true);
}

export const NOT_SET = 'Not set' as const;

/**
 * Format a minor-unit amount. `null` → "Not set" (never "$0.00").
 * Uses Intl when the currency is known to it; otherwise a plain "<amount> <code>" fallback.
 */
export function formatMoney(minorUnits: number | null | undefined, currency: string): string {
  if (minorUnits === null || minorUnits === undefined) return NOT_SET;
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

export interface FormattedPrice {
  setup: string;
  recurring: string;
  schedule: string;
  /** True only when both amounts are set. */
  complete: boolean;
}

export function formatPrice(price: OfferPrice): FormattedPrice {
  return {
    setup: formatMoney(price.setup_minor_units, price.currency),
    recurring: formatMoney(price.recurring_minor_units, price.currency),
    schedule: price.payment_schedule,
    complete: price.setup_minor_units !== null && price.recurring_minor_units !== null,
  };
}

/** False when any price component is null, or the offer is fictional / practice-only. */
export function canQuotePrice(offer: OfferVersion): boolean {
  if (offer.fictional || offer.practice_only) return false;
  return offer.price.setup_minor_units !== null && offer.price.recurring_minor_units !== null;
}

/** A quotable price that is also on a published (approved) offer version. */
export function isApprovedForQuoting(offer: OfferVersion): boolean {
  return canQuotePrice(offer) && offer.status === 'published';
}

/** Human sentence for a quotable price; null when it may not be quoted. */
export function quotedPriceSentence(offer: OfferVersion): string | null {
  if (!isApprovedForQuoting(offer)) return null;
  const p = formatPrice(offer.price);
  return `${p.setup} setup, then ${p.recurring} recurring (${p.schedule})`;
}

export function isOfferImmutable(offer: Pick<OfferVersion, 'status'>): boolean {
  return offer.status === 'published' || offer.status === 'retired';
}

/** Allowed transitions: draft→reviewed, reviewed→published, published→retired. Nothing else. */
export function canTransitionOffer(from: ApprovalStatus, to: ApprovalStatus): boolean {
  const i = OFFER_STATUS_ORDER.indexOf(from);
  const j = OFFER_STATUS_ORDER.indexOf(to);
  return i >= 0 && j === i + 1;
}

export function nextOfferStatus(from: ApprovalStatus): ApprovalStatus | null {
  const i = OFFER_STATUS_ORDER.indexOf(from);
  return OFFER_STATUS_ORDER[i + 1] ?? null;
}

/** Returns a new offer with the status applied; throws on an illegal transition. */
export function transitionOffer(offer: OfferVersion, to: ApprovalStatus): OfferVersion {
  if (!canTransitionOffer(offer.status, to)) {
    throw new Error(`Illegal offer status transition ${offer.status} → ${to}`);
  }
  return { ...offer, status: to };
}

/** Throws when a field edit is attempted on a published/retired offer. */
export function assertOfferEditable(offer: Pick<OfferVersion, 'id' | 'status'>): void {
  if (isOfferImmutable(offer)) {
    throw new Error(`Offer ${offer.id} is ${offer.status} and immutable`);
  }
}

/** Returns a copy with `patch` applied, or throws when the offer is immutable. */
export function editOffer(offer: OfferVersion, patch: Partial<Omit<OfferVersion, 'id' | 'status'>>): OfferVersion {
  assertOfferEditable(offer);
  return { ...offer, ...patch };
}

/** Text shown wherever a blank price appears (CONVENTIONS §8). */
export const BLANK_PRICE_NOTE =
  'A blank price is not $0. Live price and proposal actions are blocked until an offer is approved.' as const;

// ------------------------------------------------------------------ single store of truth for status (B-12)

/**
 * Storage key (namespace added by `useStoredState`) under which the Offer Studio persists status
 * changes. `/scripts` reads the SAME key so the linked offer's status (and therefore the pillar /
 * price slot gate) is never decided by two stores.
 */
export const OFFER_STATUS_STORAGE_KEY = 'offers.status' as const;

/** offer version id → status, as persisted by the Offer Studio. */
export const OfferStatusMap = z.record(z.string(), ApprovalStatus);
export type OfferStatusMap = z.infer<typeof OfferStatusMap>;

export const EMPTY_OFFER_STATUS_MAP: OfferStatusMap = {};

/**
 * The offer as the Studio currently has it: the stored status wins over the seed status when it is
 * a legal forward move (or equal); anything else is ignored so a stale/tampered store cannot move
 * an offer backwards. Fictional / practice-only fixtures never take a stored status.
 */
export function withStoredStatus(offer: OfferVersion, map: Readonly<OfferStatusMap>): OfferVersion {
  if (offer.fictional || offer.practice_only) return offer;
  const stored = map[offer.id];
  if (!stored || stored === offer.status) return offer;
  return OFFER_STATUS_ORDER.indexOf(stored) > OFFER_STATUS_ORDER.indexOf(offer.status) ? { ...offer, status: stored } : offer;
}

export function applyOfferStatuses(offers: readonly OfferVersion[], map: Readonly<OfferStatusMap>): OfferVersion[] {
  return offers.map((o) => withStoredStatus(o, map));
}

// ------------------------------------------------------------------ status glyphs (honesty pills)

export interface StatusGlyph {
  glyph: string;
  /** ≤2 visible words. */
  word: string;
  /** The whole truth, for the accessible name. */
  name: string;
  tone: 'orange' | 'teal' | 'green' | 'neutral';
}

/** Glyph + accessible truth for an approval status, shared by offers and script nodes. */
export function statusGlyph(status: ApprovalStatus): StatusGlyph {
  switch (status) {
    case 'draft':
      return { glyph: '◔', word: 'Draft', name: 'Draft — written, not reviewed; never rendered as approved and never live', tone: 'orange' };
    case 'reviewed':
      return { glyph: '◑', word: 'Reviewed', name: 'Reviewed — the owner accepts the wording as a candidate; still not live', tone: 'teal' };
    case 'published':
      return { glyph: '✓', word: 'Published', name: 'Published — approved for live use and frozen; a change means a new version', tone: 'green' };
    case 'retired':
      return { glyph: '—', word: 'Retired', name: 'Retired — no longer used; kept for history, read-only', tone: 'neutral' };
    default:
      return { glyph: '?', word: String(status), name: `Unknown status ${String(status)}`, tone: 'neutral' };
  }
}

/** Accessible truth behind the `—` shown for an unset price (never $0). */
export const PRICE_NOT_SET_NAME = 'Price not set — a blank price is not $0' as const;
