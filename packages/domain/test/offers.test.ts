import { describe, expect, it } from 'vitest';
import { loadOffers } from '../src/seeds';
import {
  BLANK_PRICE_NOTE,
  EMPTY_OFFER_STATUS_MAP,
  OFFER_STATUS_STORAGE_KEY,
  OfferStatusMap,
  PRICE_NOT_SET_NAME,
  applyOfferStatuses,
  assertOfferEditable,
  canQuotePrice,
  canTransitionOffer,
  editOffer,
  formatMoney,
  formatPrice,
  isApprovedForQuoting,
  liveOffers,
  nextOfferStatus,
  practiceOffers,
  quotedPriceSentence,
  statusGlyph,
  transitionOffer,
  withStoredStatus,
} from '../src/offers';

const seed = loadOffers();
const offers = seed.offer_versions;
const draft = offers.find((o) => o.id === 'draft-research-offer-v0')!;
const fictional = offers.find((o) => o.id === 'fictional-demo-inquiry-pilot')!;

describe('offers seed', () => {
  it('is real content with the draft research offer and the fictional pilot', () => {
    expect(seed._status).toBeUndefined();
    expect(offers).toHaveLength(2);
    expect(draft.status).toBe('draft');
    expect(draft.fictional).toBe(false);
    expect(draft.pillars).toHaveLength(3);
    expect(draft.supported_proof).toEqual([]);
    expect(draft.supported_proof_note).toMatch(/none yet/);
    expect(draft.approved_claims).toEqual([]);
    expect(draft.price.setup_minor_units).toBeNull();
    expect(draft.price.recurring_minor_units).toBeNull();
    expect(draft.timing.estimated).not.toBe(draft.timing.committed);
    expect(draft.exclusions.join(' ')).toMatch(/lender/i);
    expect(draft.exclusions.join(' ')).toMatch(/DMS/);
    expect(draft.exclusions.join(' ')).toMatch(/guarantee/i);
    expect(draft.exclusions.join(' ')).toMatch(/every dealer/i);
  });

  it('fictional pilot carries the banner, the practice flag and the fixture price', () => {
    expect(fictional.fictional).toBe(true);
    expect(fictional.practice_only).toBe(true);
    expect(fictional.fictional_banner).toBe('FICTIONAL TRAINING OFFER\nNOT A REAL QUOTE');
    expect(fictional.price).toMatchObject({ setup_minor_units: 75000, recurring_minor_units: 15000, currency: 'USD' });
    expect(fictional.exclusions.join(' ')).toMatch(/auto-renewal/i);
    expect(fictional.acceptance_criteria.join(' ')).toMatch(/10 synthetic inquiries/);
  });
});

describe('live vs practice', () => {
  it('fictional / practice-only offers are excluded from liveOffers structurally', () => {
    expect(liveOffers(offers).map((o) => o.id)).toEqual(['draft-research-offer-v0']);
    expect(practiceOffers(offers).map((o) => o.id)).toEqual(['fictional-demo-inquiry-pilot']);
    // Even if someone flipped `fictional` off, practice_only still keeps it out.
    expect(liveOffers([{ ...fictional, fictional: false, fictional_banner: undefined }])).toEqual([]);
  });
});

describe('money', () => {
  it('formatMoney(null) is "Not set" — never $0', () => {
    expect(formatMoney(null, 'USD')).toBe('Not set');
    expect(formatMoney(undefined, 'USD')).toBe('Not set');
    expect(formatMoney(0, 'USD')).toBe('$0.00'); // an explicit zero is a real value, distinct from null
    expect(formatMoney(75000, 'USD')).toBe('$750.00');
    expect(formatMoney(15000, 'XXX')).toMatch(/150\.00/);
    expect(BLANK_PRICE_NOTE).toMatch(/not \$0/);
  });
  it('formatPrice flags completeness', () => {
    expect(formatPrice(draft.price)).toMatchObject({ setup: 'Not set', recurring: 'Not set', complete: false });
    expect(formatPrice(fictional.price)).toMatchObject({ setup: '$750.00', recurring: '$150.00', complete: true });
  });
  it('canQuotePrice is false for null prices and for fictional offers; approval needs published', () => {
    expect(canQuotePrice(draft)).toBe(false);
    expect(canQuotePrice(fictional)).toBe(false);
    expect(quotedPriceSentence(fictional)).toBeNull();
    const priced = { ...draft, price: { ...draft.price, setup_minor_units: 100000, recurring_minor_units: 20000 } };
    expect(canQuotePrice(priced)).toBe(true);
    expect(isApprovedForQuoting(priced)).toBe(false);
    expect(isApprovedForQuoting({ ...priced, status: 'published' })).toBe(true);
    expect(quotedPriceSentence({ ...priced, status: 'published' })).toContain('$1,000.00');
  });
});

describe('status guard', () => {
  it('allows only draft→reviewed→published→retired', () => {
    expect(canTransitionOffer('draft', 'reviewed')).toBe(true);
    expect(canTransitionOffer('reviewed', 'published')).toBe(true);
    expect(canTransitionOffer('published', 'retired')).toBe(true);
    expect(canTransitionOffer('draft', 'published')).toBe(false);
    expect(canTransitionOffer('published', 'draft')).toBe(false);
    expect(canTransitionOffer('retired', 'published')).toBe(false);
    expect(nextOfferStatus('draft')).toBe('reviewed');
    expect(nextOfferStatus('retired')).toBeNull();
  });
  it('transitionOffer returns a copy and throws on illegal moves; published is read-only', () => {
    const reviewed = transitionOffer(draft, 'reviewed');
    expect(reviewed.status).toBe('reviewed');
    expect(draft.status).toBe('draft');
    expect(() => transitionOffer(draft, 'published')).toThrow(/Illegal/);
    const published = transitionOffer(reviewed, 'published');
    expect(() => assertOfferEditable(published)).toThrow(/immutable/);
    expect(() => editOffer(published, { name: 'x' })).toThrow(/immutable/);
    expect(editOffer(draft, { name: 'Renamed' }).name).toBe('Renamed');
  });
});

describe('B-12 — one store of truth for offer status', () => {
  it('the Studio key is shared and the map schema accepts only legal statuses', () => {
    expect(OFFER_STATUS_STORAGE_KEY).toBe('offers.status');
    expect(OfferStatusMap.safeParse({ [draft.id]: 'reviewed' }).success).toBe(true);
    expect(OfferStatusMap.safeParse({ [draft.id]: 'approved' }).success).toBe(false);
    expect(EMPTY_OFFER_STATUS_MAP).toEqual({});
  });
  it('a stored forward status wins; backwards, unknown and fixture statuses are ignored', () => {
    expect(withStoredStatus(draft, { [draft.id]: 'published' }).status).toBe('published');
    expect(withStoredStatus(draft, { [draft.id]: 'reviewed' }).status).toBe('reviewed');
    expect(withStoredStatus({ ...draft, status: 'published' }, { [draft.id]: 'draft' }).status).toBe('published');
    expect(withStoredStatus(draft, {}).status).toBe('draft');
    expect(withStoredStatus(fictional, { [fictional.id]: 'published' }).status).toBe('draft');
    expect(applyOfferStatuses(offers, { [draft.id]: 'published' }).map((o) => o.status)).toEqual(['published', 'draft']);
    // Publishing through the store does not invent a price.
    const published = withStoredStatus(draft, { [draft.id]: 'published' });
    expect(canQuotePrice(published)).toBe(false);
    expect(quotedPriceSentence(published)).toBeNull();
  });
  it('status glyphs carry the whole truth and the blank price has an accessible name', () => {
    expect(statusGlyph('draft')).toMatchObject({ glyph: '◔', word: 'Draft' });
    expect(statusGlyph('draft').name).toMatch(/never live/);
    expect(statusGlyph('published').name).toMatch(/frozen/);
    expect(PRICE_NOT_SET_NAME).toBe('Price not set: a blank price is not $0');
  });
});
