import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEPOSIT_USD, INVOICE_WORDS, LISTING_URL_MAX, OFFER_WORDS, PAYOUT_PAGE_WORDS, PLATES_WORDS, RELEASE_MAX_DAYS, SAID, accountWords, collateralRefusal, collect, depositWords, dial, emailOk, keepContact, listingUrlOk, offerLeft, offerState, onLane, payBy, payoutPageState, payoutSplit, platesKickback, platesVerb, relistable, releaseRefusal, said, type Collateral, type Lot, type LotLink, type Offer, type PlatesState } from './auction';
import { laneTitleStep } from './filed';
import { payByWords } from '../../../auction/src/engine/time';
import { outTheDoor } from '../../../auction/src/engine/money';
import { HOURS, defaultSettings, laneReady, lotFields } from './dealer-settings';
import { today } from './loans';

describe('the lender\'s release fits the 21-day title clock', () => {
  const at = (releaseDays: number): Collateral => ({ title: { status: 'lender', lienholder: 'NextGear', payoff: 2000, releaseDays }, floor: 4000, insured: true });
  it('takes 14 days and refuses 15', () => {
    expect(RELEASE_MAX_DAYS).toBe(14);
    expect(collateralRefusal(at(14))).toBeNull();
    expect(collateralRefusal(at(15))).toBe('release past day 14');
    expect(releaseRefusal(10)).toBeNull();
  });
  it('says why in the dealer\'s words', () => {
    expect(said(collateralRefusal(at(15))!)).toBe('Release must land inside 14 days so title reaches the buyer before day 21.');
    expect(said('not insured')).toBe('Insure it first.');
    expect(said('something the lane invented')).toBe('something the lane invented');
  });
  it('a title in hand has no release clock', () => { expect(collateralRefusal({ title: { status: 'hand' }, floor: 4000, insured: true })).toBeNull(); });
});

describe('every refusal the Worker gives a dealer route is said in four words or fewer (DOCTRINE §4.7)', () => {
  /* auction/worker/README.md, the routes table, read 2026-10-13; plus the two bid refusals of commit 4ff3183 */
  const WORKER = ['already open', 'sale_exists', 'dealer suspended', 'not_your_lot', 'bids placed', 'floor only lowers', 'no lot', 'closed', 'soft_close',
    'no sale', 'sale_voided', 'sale_forfeited', 'no sale to void', 'already_started', 'vin_required', 'not_paid', 'vin_unknown', 'wrong car',
    'before_deadline', 'already_forfeited', 'sale_started', 'sale_paid', 'not_started', 'plates_order', 'bad_state', 'no_payout', 'wrong_payout', 'payout_settled', 'already_paid', 'not_held',
    'account_exists', 'bad_email', 'whop_refused', 'whop_bad_account', 'whop_unavailable', 'account_from_whop_only', 'no_such_dealer',
    'too_many_bids', 'one_open_bid', 'seller_cannot_bid', 'low', 'outbid',
    /* Wave 3: /car's listing link (auction.ts listingUrlOf), /invoices (invoice.ts), the offer (auction.ts POST /offer/accept) */
    'bad_listing', 'fees_unknown', 'not_yours', 'no_offer', 'offer_expired', 'buyer not read'];
  it.each(WORKER)('%s', reason => {
    expect(SAID[reason], `${reason} is not in SAID`).toBeDefined();
    expect(SAID[reason].split(/\s+/).length).toBeLessThanOrEqual(4);
    expect(SAID[reason]).not.toMatch(/[\u2013\u2014]/);
  });
  it('the Desk\'s own refusals too', () => {
    for (const r of ['offline', 'no key', 'lane settings missing']) expect(said(r).split(/\s+/).length).toBeLessThanOrEqual(4);
  });
});

describe('CP9: the Sold page says the deadline in the push\'s words', () => {
  it('is the engine\'s one formatter, Central time', () => {
    for (const t of [Date.UTC(2026, 9, 15, 21, 0), Date.UTC(2026, 9, 17, 1, 14), Date.UTC(2026, 11, 20, 14, 30)]) expect(payBy(t)).toBe(payByWords(t));
    expect(payBy(Date.UTC(2026, 9, 15, 21, 0))).toBe('Thu 4 pm');          // 21:00 UTC is 4 pm CDT
    expect(payBy(Date.UTC(2026, 9, 17, 1, 14))).toBe('Fri 8:14 pm');       // the minutes stay (ops runbook rule 2)
  });
});

describe('the money rows', () => {
  const fees = { taxRate: 0.0625, title: 33, registration: 75, doc: 292, plate: 10 };
  it('Collect is the Worker\'s balance: the out-the-door total less $250', () => {
    expect(collect(5400, fees)).toBe(outTheDoor(5400, fees).total - 250);
    expect(collect(5400, fees)).toBe(5897.5);
    expect(collect(100, fees)).toBe(Math.max(0, outTheDoor(100, fees).total - 250));
  });
  it('the deposit\'s words follow the payout', () => {
    expect(depositWords({ deposit: 'held' })).toBe('Held by Obavia for the buyer');
    expect(depositWords({ deposit: 'released' })).toBe('Released to the buyer');
    expect(depositWords({ deposit: 'applied', payout: { state: 'owed' } })).toBe('Obavia owes you');
    expect(depositWords({ deposit: 'to_dealer' })).toBe('Obavia owes you');
    expect(depositWords({ deposit: 'to_dealer', payout: { state: 'sent', transferId: 'tr_1', at: 1 } })).toBe('Sent');
    expect(depositWords({ deposit: 'applied', payout: { state: 'paid', method: 'wire', at: 1 } })).toBe('Paid by wire');
  });
  it('dials the verified number the Worker sends', () => {
    expect(dial('+12145550142')).toBe('(214) 555-0142');
    expect(dial('2145550142')).toBe('(214) 555-0142');
    expect(dial('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });
});

describe('relist: unwound and unsold lots leave the lane', () => {
  const L = (p: Partial<LotLink>): LotLink => ({ lotId: 'l', vehicleId: 'v', openedAt: '2026-10-13T00:00:00Z', closesAt: 0, floor: 4900, days: 7, ...p });
  it('a car on an open or sold lot stays out of Which car goes; a voided, forfeited or unsold one may go again', () => {
    expect(relistable(L({}))).toBe(false);
    expect(relistable(L({ unwound: true }))).toBe(true);
    expect(relistable(L({ unsold: true }))).toBe(true);
    const on = onLane([L({ lotId: 'a', vehicleId: 'v1' }), L({ lotId: 'b', vehicleId: 'v2', unwound: true }), L({ lotId: 'c', vehicleId: 'v3', unsold: true })]);
    expect([...on]).toEqual(['v1']);
  });
});

describe('Go sends the dealer\'s lane settings with the lot', () => {
  const dealer = { street: '100 Example Street', city: 'Houston', state: 'TX', zip: '77002', phone: '(555) 010-0000' };
  it('hours, the after-hours number and the address, from the three choices', () => {
    const s = { ...defaultSettings(dealer, true), hours: [...HOURS.saturday.hours], afterHours: '+12145550142' };
    expect(laneReady(s)).toBe(true);
    expect(lotFields(s)).toEqual({ hours: ['Mon-Fri 9 am-6 pm', 'Sat 9 am-6 pm'], afterHours: '(214) 555-0142', address: '100 Example Street, Houston, TX 77002' });
    expect(lotFields({ ...s, hours: [...HOURS.call.hours] }).hours).toEqual([]);
  });
});

describe('the plates row: one verb at a time, in the Worker\'s order (worker/src/auction.ts PLATES_NEXT)', () => {
  it('Filed, then Approved, then Mailed, then nothing; Filed again after a kickback', () => {
    expect(platesVerb(undefined)).toBe('filed');
    expect(platesVerb('filed')).toBe('approved');
    expect(platesVerb('approved')).toBe('mailed');
    expect(platesVerb('mailed')).toBeNull();
    expect(platesVerb('kickback')).toBe('filed');
  });
  it('the faint word Kickback only while filed', () => {
    for (const st of [undefined, 'approved', 'mailed', 'kickback'] as (PlatesState | undefined)[]) expect(platesKickback(st)).toBe(false);
    expect(platesKickback('filed')).toBe(true);
  });
  it('the Desk says the phone\'s words (auction/src/sale.ts PLATES_WORDS, CP9), the verbs in one word each', () => {
    expect(PLATES_WORDS).toEqual({ filed: 'Filed', approved: 'Approved', mailed: 'Mailed', kickback: 'Dealer fixing' });
    for (const v of ['filed', 'approved', 'mailed'] as const) expect(PLATES_WORDS[v].split(/\s+/).length).toBe(1);
    expect(said('not_started')).toBe('Not started yet.');
    expect(said('plates_order')).toBe('Out of order.');
  });
  it('every reason the Worker gives POST /lots/:id/plates (README, the routes table) is said in a person\'s words, four or fewer', () => {
    for (const r of ['no sale', 'sale_voided', 'sale_forfeited', 'not_started', 'bad_state', 'bad_mark', 'plates_order', 'not_your_lot']) {
      expect(SAID[r], r).toBeDefined();
      expect(said(r)).not.toBe(r);   // never the raw code on Sold's stamp
      expect(said(r).split(/\s+/).length).toBeLessThanOrEqual(4);
      expect(said(r)).not.toMatch(/[\u2013\u2014]/);
    }
    expect(said('bad_mark')).toBe('Mark not whole.');
  });
});

describe('Live: the socket first, polling at 15 s only after it fails', () => {
  type Sock = { url: string; onmessage: ((m: { data: string }) => void) | null; onerror: (() => void) | null; onclose: (() => void) | null; close: () => void };
  let socks: Sock[];
  beforeEach(() => {
    vi.resetModules();   // the module reads VITE_AUCTION_API once, at import: stub it, then import afresh
    vi.useFakeTimers();
    vi.stubEnv('VITE_AUCTION_API', 'http://lane.test');
    socks = [];
    vi.stubGlobal('WebSocket', class { url: string; onmessage = null; onerror = null; onclose = null; close = vi.fn(); constructor(url: string) { this.url = url; socks.push(this as unknown as Sock); } });
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'obavia.desk.auction.key' ? 'd:P000000.test' : null), setItem: () => {} });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'l', bids: 1, high: 5000 }), { status: 200, headers: { 'content-type': 'application/json' } })));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });
  it('opens the socket with the dealer key and never polls while it holds', async () => {
    const { watchLot, POLL_MS } = await import('./auction');
    const got: unknown[] = [];
    const stop = watchLot('l', l => got.push(l));
    expect(socks).toHaveLength(1);
    expect(socks[0].url).toBe('ws://lane.test/lots/l/live?token=d%3AP000000.test');
    socks[0].onmessage!({ data: JSON.stringify({ lotId: 'l', lot: { id: 'l', bids: 2 }, kind: 'bid' }) });
    expect(got).toEqual([{ id: 'l', bids: 2 }]);
    await vi.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(fetch).not.toHaveBeenCalled();
    stop();
    expect(socks[0].close).toHaveBeenCalled();
  });
  it('polls every 15 s once the socket fails, with the dealer key on the read', async () => {
    const { watchLot, POLL_MS } = await import('./auction');
    const got: unknown[] = [];
    const stop = watchLot('l', l => got.push(l));
    socks[0].onerror!();
    await vi.advanceTimersByTimeAsync(POLL_MS - 1);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('http://lane.test/lots/l');
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer d:P000000.test' } });
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(POLL_MS).toBe(15_000);
    stop();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('markPlates posts { state } with the dealer key, and the trimmed note (240 at most) on a kickback only', async () => {
    const { markPlates } = await import('./auction');
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    await markPlates('l', 'filed');
    expect(f.mock.calls[0][0]).toBe('http://lane.test/lots/l/plates');
    expect(f.mock.calls[0][1].method).toBe('POST');
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer d:P000000.test');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ state: 'filed' });
    await markPlates('l', 'kickback', '  Wrong county code on the 130-U.  ');
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ state: 'kickback', note: 'Wrong county code on the 130-U.' });
    await markPlates('l', 'kickback', 'x'.repeat(300));
    expect(JSON.parse(f.mock.calls[2][1].body).note).toHaveLength(240);
    await markPlates('l', 'approved', '   ');
    expect(JSON.parse(f.mock.calls[3][1].body)).toEqual({ state: 'approved' });
    /* W3-F's Filed mark rides beside state: 'filed' only (filed.ts filedMark; the Worker ignores it today, README) */
    const mark = { sha256: 'ab'.repeat(32), filedOn: '2026-10-13', agent: 'Sam' };
    await markPlates('l', 'filed', undefined, mark);
    expect(JSON.parse(f.mock.calls[4][1].body)).toEqual({ state: 'filed', form130U: mark });
    await markPlates('l', 'approved', undefined, mark);
    expect(JSON.parse(f.mock.calls[5][1].body)).toEqual({ state: 'approved' });
  });
  it('a socket closed by the lane starts the poll; one the watcher closed does not', async () => {
    const { watchLot, POLL_MS } = await import('./auction');
    const stop = watchLot('l', () => {});
    socks[0].onclose!();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(fetch).toHaveBeenCalledTimes(1);
    stop();
    const stop2 = watchLot('l', () => {});
    stop2();
    expect(socks[1].onclose).toBeNull();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('Sold keeps the winner\'s number across socket frames (the socket never carries sale.contact)', () => {
  const contact = { name: 'Marisol Treviño', phone: '+12145550142' };
  const sale = { buyer: 'b_1', hammer: 5100, wonAt: 1, deadlineAt: 2 };
  const read = { id: 'l1', start: 4000, retail: 8900, opensAt: 0, closesAt: 1, high: 5100, bids: 3, watching: 0, sale: { ...sale, contact } } as Lot;
  it('a frame with a sale and no contact keeps the last contact read with the dealer key', () => {
    const frame = { ...read, bids: 4, sale: { ...sale, paidAt: 3 } } as Lot;
    const kept = keepContact(read, frame);
    expect(kept.sale?.contact).toEqual(contact);
    expect(kept.sale?.paidAt).toBe(3);
    expect(kept.bids).toBe(4);
    expect(frame.sale?.contact).toBeUndefined();   // the frame itself is left alone
  });
  it('a frame that brings a contact wins; a frame with no sale carries none; another lot\'s contact never crosses', () => {
    const fresh = { name: 'Ana', phone: '+12145550199' };
    expect(keepContact(read, { ...read, sale: { ...sale, contact: fresh } } as Lot).sale?.contact).toEqual(fresh);
    const live = { ...read, sale: undefined } as Lot;
    expect(keepContact(read, live)).toBe(live);
    expect(keepContact(read, { ...read, id: 'l2', sale: { ...sale } } as Lot).sale?.contact).toBeUndefined();
    const first = { ...read, sale: { ...sale } } as Lot;
    expect(keepContact(null, first)).toBe(first);
  });
  it('the paper\'s four refusals at Go are said in four words or fewer', () => {
    for (const r of ['guide pdf failed', 'bill pdf failed', 'guide fields failed', 'bill fields failed']) {
      expect(SAID[r], r).toBeDefined();
      expect(said(r).split(/\s+/).length).toBeLessThanOrEqual(4);
      expect(said(r)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});

describe('the lane home\'s line for a started car (desk/src/Auction.tsx startedLine): "Picked up" until the first filing, then the plates word with its date', () => {
  /* Auction.tsx cannot load under vitest (its module graph times out), so this mirrors its one line: PLATES_WORDS[state], a space, the
     month and day in the dealer's zone, the same words the Sold row stacks (CP9: one piece, the same everywhere). */
  const monthDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const line = (plates: { state: PlatesState; at: number } | undefined, tz: string) => (plates ? `${PLATES_WORDS[plates.state]} ${monthDay(today(tz, new Date(plates.at)))}` : 'Picked up');
  const at = Date.UTC(2026, 9, 14, 3, 0);   // 10 PM Oct 13 in Chicago, already Oct 14 in UTC
  it('says Picked up with no plates', () => { expect(line(undefined, 'America/Chicago')).toBe('Picked up'); });
  it.each([['filed', 'Filed Oct 13'], ['approved', 'Approved Oct 13'], ['mailed', 'Mailed Oct 13'], ['kickback', 'Dealer fixing Oct 13']] as [PlatesState, string][])('%s reads "%s" in the dealer\'s zone', (state, want) => {
    expect(line({ state, at }, 'America/Chicago')).toBe(want);
  });
  it('the date is the dealer\'s day, not UTC\'s', () => { expect(line({ state: 'filed', at }, 'UTC')).toBe('Filed Oct 14'); });
});

/* ---------- Wave 3-C: the Whop page, the payout page, the second chance, the listing link, the acknowledgment row ---------- */
describe('the second-chance offer on Sold and the lane home (decisions §2 row 9; worker/src/auction.ts Offer)', () => {
  const made = Date.UTC(2026, 9, 14, 12, 0);
  const o: Offer = { buyer: 'b2', amount: 4800, madeAt: made, expiresAt: made + 12 * 3_600_000 };
  it('is open until the Worker marks it or the clock passes; accepted and expired are the Worker\'s marks', () => {
    expect(offerState(undefined)).toBeNull();
    expect(offerState(o, made + 1)).toBe('open');
    expect(offerState(o, made + 12 * 3_600_000)).toBe('expired');
    expect(offerState({ ...o, expiredAt: made + 5 }, made + 6)).toBe('expired');
    expect(offerState({ ...o, acceptedAt: made + 5 }, made + 6)).toBe('accepted');
  });
  it('the clock beside it: what is left of the twelve hours, never below zero', () => {
    expect(offerLeft(o, made)).toBe('12h 00m');
    expect(offerLeft(o, made + 18 * 60_000)).toBe('11h 42m');
    expect(offerLeft(o, made + 13 * 3_600_000)).toBe('0h 00m');
  });
  it('the words are the push\'s pair (CP9: "Second chance · <car> · $X · 12 h"), four words or fewer a line, no dashes', () => {
    expect(OFFER_WORDS.open).toBe('Second chance');
    for (const w of Object.values(OFFER_WORDS)) { expect(w.split(/\s+/).length).toBeLessThanOrEqual(4); expect(w).not.toMatch(/[\u2013\u2014]/); }
  });
});

describe('the payout page (#/auction/:lot/payout): one state word, one row per piece of the money', () => {
  it('pending until the engine starts; owed once the $250 is applied or forfeited; cleared when Whop sent it or the owner paid it', () => {
    expect(payoutPageState(undefined)).toBe('pending');
    expect(payoutPageState({ deposit: 'held' })).toBe('pending');
    expect(payoutPageState({ deposit: 'applied' })).toBe('owed');
    expect(payoutPageState({ deposit: 'to_dealer', payout: { state: 'owed' } })).toBe('owed');
    expect(payoutPageState({ deposit: 'applied', payout: { state: 'sent', transferId: 'tr_1', at: 1 } })).toBe('cleared');
    expect(payoutPageState({ deposit: 'applied', payout: { state: 'paid', method: 'wire', at: 1 } })).toBe('cleared');
    expect(payoutPageState({ deposit: 'released' })).toBe('pending');
  });
  it('the lender-first split is W3-A\'s arithmetic (invoice.ts splitFor): the payoff first, capped at the hammer; the net less the $250', () => {
    const lender = (payoff: number): Collateral => ({ title: { status: 'lender', lienholder: 'NextGear', payoff, releaseDays: 5 }, floor: 4000, insured: true });
    expect(payoutSplit(5100, lender(2000))).toEqual({ lender: { name: 'NextGear', amount: 2000 }, net: 5100 - 2000 - DEPOSIT_USD });
    expect(payoutSplit(5100, lender(6000))).toEqual({ lender: { name: 'NextGear', amount: 5100 }, net: 0 });
    expect(payoutSplit(5100, { title: { status: 'hand' }, floor: 4000, insured: true })).toEqual({ lender: null, net: 4850 });
    expect(payoutSplit(5100, undefined).lender).toBeNull();
    expect(payoutSplit(5100, { ...lender(2000), title: { status: 'lender', payoff: 2000 } }).lender?.name).toBe('The lender');
  });
  it('the words on the glass are four or fewer a line and carry no dash', () => {
    for (const w of [...Object.values(PAYOUT_PAGE_WORDS), ...Object.values(INVOICE_WORDS)]) { expect(w.split(/\s+/).length).toBeLessThanOrEqual(4); expect(w).not.toMatch(/[\u2013\u2014]/); }
  });
});

describe('the Whop page and the settings row (POST /dealers/account/start; GET /dealers/me)', () => {
  it('Not yet; Connected with the masked id; then Whop\'s checks only once the Worker sends the field (dealers.whop_account_verified_at, 0017)', () => {
    expect(accountWords(null)).toEqual({ line: 'Not yet', checks: null });
    expect(accountWords({ whopAccount: null })).toEqual({ line: 'Not yet', checks: null });
    expect(accountWords({ whopAccount: 'biz_••••ab12' })).toEqual({ line: 'Connected · biz_••••ab12', checks: null });
    expect(accountWords({ whopAccount: 'biz_••••ab12', whopAccountVerifiedAt: null })).toEqual({ line: 'Connected · biz_••••ab12', checks: 'Whop checking' });
    expect(accountWords({ whopAccount: 'biz_••••ab12', whopAccountVerifiedAt: 1 })).toEqual({ line: 'Connected · biz_••••ab12', checks: 'Verified by Whop' });
  });
  it('an email the Worker takes (README: 400 bad_email otherwise)', () => {
    for (const e of ['sam@triplej.com', ' sam@triplej.com ', 'a.b+c@lot.co']) expect(emailOk(e)).toBe(true);
    for (const e of ['', 'sam', 'sam@', '@lot.com', 'sam@lot', 'sam lot@x.com']) expect(emailOk(e)).toBe(false);
  });
});

describe('the Marketplace listing link on the lot (deviation 6; worker/src/auction.ts listingUrlOf)', () => {
  it('https only, 300 characters at most, no spaces or control characters', () => {
    expect(LISTING_URL_MAX).toBe(300);
    expect(listingUrlOk('https://www.facebook.com/marketplace/item/123456789')).toBe(true);
    expect(listingUrlOk('  https://www.facebook.com/marketplace/item/1  ')).toBe(true);
    expect(listingUrlOk('http://www.facebook.com/marketplace/item/1')).toBe(false);
    expect(listingUrlOk('https://x.com/a b')).toBe(false);
    expect(listingUrlOk('https://x.com/' + 'a'.repeat(300))).toBe(false);
    expect(listingUrlOk('')).toBe(false);
  });
});

describe('the Buyer Acknowledgment row on Sold reads W3-F\'s words (filed.ts laneTitleStep; decisions §9 D8, D9)', () => {
  /* The row is placed by W3-C and worded by W3-F. The words expected here are the fallback the Desk is coded to; a change in
     filed.ts shows up here first. */
  it('a Texas licence, or none yet, is the Buyer Acknowledgment in webDEALER; four words or fewer a line', () => {
    const tx = laneTitleStep('TX');
    expect(tx.kind).toBe('acknowledgment');
    expect(tx.lines[0]).toBe('Buyer Acknowledgment in webDEALER');
    expect(laneTitleStep(undefined).kind).toBe('acknowledgment');
    expect(laneTitleStep(null).kind).toBe('acknowledgment');
    for (const l of [tx.title, ...tx.lines]) { expect(l.split(/\s+/).length).toBeLessThanOrEqual(4); expect(l).not.toMatch(/[\u2013\u2014]/); }
  });
  it('any other licence is the paper packet with the green 60-day plate', () => {
    const la = laneTitleStep('LA');
    expect(la.kind).toBe('packet');
    expect(la.lines.join(' ')).toMatch(/14-312/);
    expect(la.lines.join(' ')).toMatch(/60-day/);
  });
});

describe('the Desk\'s calls for Wave 3 carry the dealer key to the Worker\'s routes', () => {
  beforeEach(() => {
    vi.resetModules(); vi.stubEnv('VITE_AUCTION_API', 'http://lane.test');
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'obavia.desk.auction.key' ? 'd:P000000.test' : null), setItem: () => {} });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ gdn: 'P000000', whopAccount: 'biz_••••ab12', payouts: { sent: 0, owed: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });
  it('accountStart posts { email } only to /dealers/account/start (README: a body naming an account is 400)', async () => {
    const { accountStart } = await import('./auction');
    const r = await accountStart('  sam@triplej.com ');
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(f.mock.calls[0][0]).toBe('http://lane.test/dealers/account/start');
    expect(f.mock.calls[0][1].method).toBe('POST');
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer d:P000000.test');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ email: 'sam@triplej.com' });
    expect(r.ok && r.value.whopAccount).toBe('biz_••••ab12');
  });
  it('setListingUrl posts { listingUrl } to /lots/:id/car, trimmed; null clears it', async () => {
    const { setListingUrl } = await import('./auction');
    await setListingUrl('l', ' https://www.facebook.com/marketplace/item/1 ');
    await setListingUrl('l', null);
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(f.mock.calls[0][0]).toBe('http://lane.test/lots/l/car');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ listingUrl: 'https://www.facebook.com/marketplace/item/1' });
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ listingUrl: null });
  });
  it('getInvoices reads /invoices/:lot (W3-A) with the key', async () => {
    const { getInvoices } = await import('./auction');
    await getInvoices('lot 1');
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(f.mock.calls[0][0]).toBe('http://lane.test/invoices/lot%201');
    expect(f.mock.calls[0][1].method).toBe('GET');
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer d:P000000.test');
  });
});
