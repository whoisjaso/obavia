import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RELEASE_MAX_DAYS, SAID, collateralRefusal, collect, depositWords, dial, onLane, payBy, relistable, releaseRefusal, said, type Collateral, type LotLink } from './auction';
import { payByWords } from '../../../auction/src/engine/time';
import { outTheDoor } from '../../../auction/src/engine/money';
import { HOURS, defaultSettings, laneReady, lotFields } from './dealer-settings';

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
    'before_deadline', 'already_forfeited', 'sale_started', 'sale_paid', 'no_payout', 'wrong_payout', 'payout_settled', 'already_paid', 'not_held',
    'account_exists', 'bad_email', 'whop_refused', 'whop_bad_account', 'whop_unavailable', 'account_from_whop_only', 'no_such_dealer',
    'too_many_bids', 'one_open_bid', 'seller_cannot_bid', 'low', 'outbid'];
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
