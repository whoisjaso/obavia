import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// the sensory layer loads native modules; the sale only needs to know it was called
vi.mock('./feel', () => ({ feel: { heartbeat: vi.fn(), done: vi.fn(), tick: vi.fn() } }));

import { arriveAtLot, clearSale, followServer, nextTile, openSale, payByWords, payDeadline, peekSale, pickupWhen, platesWords, runPlates, titleDueAt, wonOpensItself, PAY_WINDOW_MS, type Sale } from './sale';

const HOUR = 3_600_000;
// Tue Oct 13 2026 21:37 UTC = 4:37 pm in Houston (CDT, UTC-5)
const HAMMER = Date.UTC(2026, 9, 13, 21, 37);
const SERVER_DEADLINE = HAMMER + 48 * HOUR;   // what worker/src/auction.ts writes on the sale

describe('the pay-by', () => {
  afterEach(() => clearSale());

  it('is the server deadline, not the hammer plus a local window', () => {
    const later = SERVER_DEADLINE + 15 * 60_000;   // the server moved it; the glass must follow, not recompute
    expect(payDeadline({ wonAt: HAMMER, deadlineAt: later }, true)).toBe(later);
    expect(payDeadline({ wonAt: HAMMER, deadlineAt: later }, false)).toBe(later);
  });

  it('waits for the server with a Worker, and only the local fixtures compute 48 h', () => {
    expect(payDeadline({ wonAt: HAMMER }, true)).toBeNull();
    expect(payDeadline({ wonAt: HAMMER }, false)).toBe(HAMMER + PAY_WINDOW_MS);
  });

  it('reads as the day and time in the buyer zone, the words the push carries', () => {
    expect(payByWords(SERVER_DEADLINE, 'America/Chicago')).toBe('Thu 4:37 pm');
    expect(payByWords(SERVER_DEADLINE, 'America/Los_Angeles')).toBe('Thu 2:37 pm');
    expect(payByWords(Date.UTC(2026, 9, 15, 17, 0), 'America/Chicago')).toBe('Thu 12 pm');
    expect(payByWords(Date.UTC(2026, 9, 16, 5, 5), 'America/Chicago')).toBe('Fri 12:05 am');
    expect(payByWords(SERVER_DEADLINE, 'America/Chicago')).not.toMatch(/[\u2013\u2014]/);
  });

  it('is synced from the lot sale into the open sale', () => {
    openSale({ lotId: 'L1', hammer: 5200, total: 5900, wonAt: HAMMER - 2000 });
    expect(peekSale()?.deadlineAt).toBeUndefined();
    followServer({ wonAt: HAMMER, deadlineAt: SERVER_DEADLINE });
    expect(peekSale()?.wonAt).toBe(HAMMER);
    expect(peekSale()?.deadlineAt).toBe(SERVER_DEADLINE);
    expect(peekSale()?.pickedUp).toBeUndefined();
    followServer({ wonAt: HAMMER, deadlineAt: SERVER_DEADLINE, startedAt: HAMMER + 30 * HOUR });
    expect(peekSale()?.pickedUp).toBe(true);
  });
});

describe('pickup times', () => {
  const dealer = { phone: '(832) 555-0148', afterHours: '(832) 555-0199' };

  it('are the dealer hours from the lot, with the after-hours line to call', () => {
    const w = pickupWhen({ hours: ['Mon to Fri 9-6', 'Sat 10\u20132', ' Sat 10-2 ', ''], dealer });
    expect(w).toEqual({ kind: 'slots', slots: ['Mon to Fri 9-6', 'Sat 10-2'], call: '(832) 555-0199' });
    for (const s of (w as { slots: string[] }).slots) expect(s).not.toMatch(/[‒-―]/);
  });

  it('with no hours on the lot are one line to call and the number', () => {
    expect(pickupWhen({ dealer })).toEqual({ kind: 'call', call: '(832) 555-0148' });
    expect(pickupWhen({ hours: [], dealer })).toEqual({ kind: 'call', call: '(832) 555-0148' });
    expect(pickupWhen({ hours: ['Closed'], dealer })).toEqual({ kind: 'call', call: '(832) 555-0148' });
    expect(pickupWhen({ hours: ['  '], dealer: { phone: '', afterHours: '(832) 555-0199' } })).toEqual({ kind: 'call', call: '(832) 555-0199' });
  });

  it('never fall back to invented slots', () => {
    const w = pickupWhen({ dealer });
    expect('slots' in w).toBe(false);
  });
});

describe('the plates ring', () => {
  beforeEach(() => { vi.useFakeTimers(); openSale({ lotId: 'L1', hammer: 5200, total: 5900, wonAt: HAMMER }); });
  afterEach(() => { clearSale(); vi.useRealTimers(); });

  it('runs the demo cadence on the local fixtures', () => {
    arriveAtLot(false);
    vi.advanceTimersByTime(1800);
    expect(peekSale()?.pickedUp).toBe(true);
    vi.advanceTimersByTime(4000); expect(peekSale()?.plates).toBe('filed');
    vi.advanceTimersByTime(5000); expect(peekSale()?.plates).toBe('approved');
    vi.advanceTimersByTime(5000); expect(peekSale()?.plates).toBe('mailed');
  });

  it('with a Worker never runs the demo: no fake scan, no fake filing', () => {
    arriveAtLot(true);
    runPlates(true);
    vi.advanceTimersByTime(60_000);
    expect(peekSale()?.arrived).toBe(true);
    expect(peekSale()?.pickedUp).toBeUndefined();
    expect(peekSale()?.plates).toBe('none');
  });

  it('with a Worker follows the server sale state', () => {
    followServer({ wonAt: HAMMER, deadlineAt: SERVER_DEADLINE, startedAt: HAMMER + HOUR });
    expect(peekSale()?.plates).toBe('none');   // started is not filed
    followServer({ wonAt: HAMMER, deadlineAt: SERVER_DEADLINE, startedAt: HAMMER + HOUR, plates: 'filed' });
    expect(peekSale()?.plates).toBe('filed');
    followServer({ wonAt: HAMMER, deadlineAt: SERVER_DEADLINE, startedAt: HAMMER + HOUR, plates: 'kickback' });
    expect(peekSale()?.plates).toBe('kickback');
  });
});

const DAY = 24 * HOUR;
const SIGNED = { guide: { paths: [] }, bill: { paths: [] } } as unknown as Sale['signed'];
const TX = { name: 'Marisol Treviño', dob: '04/12/1991', address: '2210 Example Ave, San Antonio', licence: '12344821', state: 'TX', confirmed: true };
const ready = (over: Partial<Sale> = {}): Sale => ({ lotId: 'L1', hammer: 5200, total: 5900, wonAt: HAMMER, id: TX, insured: true, signed: SIGNED, pay: 'wire', plates: 'none', ...over });

describe('Won is done', () => {
  it('once the car has started at the lot, whatever the county has done', () => {
    expect(nextTile(ready())).toBe('plates');                                   // paid, not started: the last tile is lit
    expect(nextTile(ready({ pickedUp: true }))).toBeNull();                     // started, the Worker carries no plates state
    expect(nextTile(ready({ pickedUp: true, plates: 'filed' }))).toBeNull();
    expect(nextTile(ready({ pickedUp: true, plates: 'mailed' }))).toBeNull();
    expect(nextTile(ready({ pickedUp: true, id: { ...TX, state: 'OK' } }))).toBeNull();
    // a fresh launch after the start: the Worker carries startedAt and nothing of the steps this phone once did
    expect(nextTile({ lotId: 'L1', hammer: 5200, total: 5900, wonAt: HAMMER, signed: {}, plates: 'none', pickedUp: true })).toBeNull();
  });

  it('not before: each earlier step in its order', () => {
    expect(nextTile(ready({ id: undefined }))).toBe('id');
    expect(nextTile(ready({ insured: false }))).toBe('insure');
    expect(nextTile(ready({ signed: {} }))).toBe('sign');
    expect(nextTile(ready({ pay: undefined }))).toBe('plates');                 // the last tile opens Pay first
  });

  it('follows the server start into the done rule', () => {
    openSale({ lotId: 'L1', hammer: 5200, total: 5900, wonAt: HAMMER });
    followServer({ wonAt: HAMMER, deadlineAt: SERVER_DEADLINE, startedAt: HAMMER + DAY });
    expect(peekSale()?.pickedUp).toBe(true);
    expect(nextTile(ready({ pickedUp: peekSale()!.pickedUp }))).toBeNull();
    clearSale();
  });
});

describe('Won opens itself', () => {
  it('only while the sale is still mine to finish', () => {
    expect(wonOpensItself(undefined)).toBe(true);                                 // the local stand-in writes no sale
    expect(wonOpensItself({})).toBe(true);
    expect(wonOpensItself({ startedAt: HAMMER + DAY })).toBe(false);              // started: the lane and Me are the glass
    expect(wonOpensItself({ voidedAt: HAMMER + DAY })).toBe(false);
    expect(wonOpensItself({ forfeitedAt: HAMMER + 2 * DAY })).toBe(false);
  });
});

describe('the plates words', () => {
  it('before the server has sent a filing: the dealer deadline, day 20 after the sale date, the Desk clock', () => {
    expect(platesWords({ plates: 'none', wonAt: HAMMER })).toBe('Filed by Nov 2');
    // 11:30 pm in Houston on Oct 13 is Oct 14 in UTC: the sale date is the pilot zone's, as the Desk counts it
    expect(platesWords({ plates: 'none', wonAt: Date.UTC(2026, 9, 14, 4, 30) })).toBe('Filed by Nov 2');
    expect(platesWords({ plates: 'none', wonAt: Date.UTC(2026, 9, 14, 5, 30) })).toBe('Filed by Nov 3');
    expect(titleDueAt(HAMMER)).toBe(Date.UTC(2026, 10, 2, 12));
  });

  it('then only the stage the server sent', () => {
    expect(platesWords({ plates: 'filed', wonAt: HAMMER })).toBe('Filed');
    expect(platesWords({ plates: 'approved', wonAt: HAMMER })).toBe('Approved');
    expect(platesWords({ plates: 'mailed', wonAt: HAMMER })).toBe('Mailed');
    expect(platesWords({ plates: 'kickback', wonAt: HAMMER })).toBe('Dealer fixing');
  });

  it('are four words or fewer, with no dash', () => {
    for (const plates of ['none', 'filed', 'approved', 'mailed', 'kickback'] as const) {
      const w = platesWords({ plates, wonAt: HAMMER });
      expect(w.split(' ').length).toBeLessThanOrEqual(4);
      expect(w).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
