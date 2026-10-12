import { describe, expect, it } from 'vitest';
import { closeAfterBid, inLastTwoMinutes, increment, needsHold, nextBid, proxy, roll } from './auction';
import { outTheDoor, TEXAS } from './money';
import { LocalAuctionServer, type Lot } from './server';
import { pack } from './grid';

describe('money', () => {
  it('total is hammer + 6.25% + title + registration + doc, no premium', () => {
    const t = outTheDoor(5150, { ...TEXAS, doc: 292 });
    expect(t.tax).toBe(321.88);
    expect(t.fees).toBe(400);
    expect(t.total).toBe(5871.88);
  });
});

describe('increments', () => {
  it('ladder', () => {
    expect(increment(900)).toBe(25);
    expect(increment(4900)).toBe(100);
    expect(increment(5000)).toBe(250);
    expect(increment(12000)).toBe(500);
  });
  it('next bid opens at the ask, then one increment over', () => {
    expect(nextBid(4900, false)).toBe(4900);
    expect(nextBid(4900, true)).toBe(5000);
  });
  it('roll crosses the ladder', () => {
    expect(roll(4900, true, 0)).toBe(5000);
    expect(roll(4900, true, 1)).toBe(5250);
  });
  it('hold over 2x', () => {
    expect(needsHold(10001, 5000)).toBe(true);
    expect(needsHold(10000, 5000)).toBe(false);
  });
});

describe('soft close', () => {
  it('refills to exactly two minutes, never more, never variable', () => {
    const now = 1_000_000;
    expect(closeAfterBid(now + 119_000, now)).toBe(now + 120_000);
    expect(closeAfterBid(now + 1_000, now)).toBe(now + 120_000);
    expect(closeAfterBid(now + 121_000, now)).toBe(now + 121_000);
  });
  it('last two minutes flag', () => {
    expect(inLastTwoMinutes(1000 + 119_999, 1000)).toBe(true);
    expect(inLastTwoMinutes(1000 + 120_000, 1000)).toBe(false);
    expect(inLastTwoMinutes(500, 1000)).toBe(false);
  });
});

describe('proxy', () => {
  it('first bid opens at the price named, with a ceiling above it', () => {
    expect(proxy({ high: 4900 }, { id: 'a', amount: 4900, max: 5600 }, false)).toEqual({ high: 4900, leader: 'a', max: 5600 });
    expect(proxy({ high: 4900 }, { id: 'a', amount: 5100, max: 5100 }, false)).toEqual({ high: 5100, leader: 'a', max: 5100 });
  });
  it('a plain bid is the price', () => {
    expect(proxy({ high: 5100, leader: 'r1', max: 5100 }, { id: 'me', amount: 6100, max: 6100 }, true)).toEqual({ high: 6100, leader: 'me', max: 6100 });
  });
  it('a lower challenger raises the price one increment over its ceiling, leader holds', () => {
    const s = proxy({ high: 4900, leader: 'a', max: 5600 }, { id: 'b', amount: 5000, max: 5200 }, true);
    expect(s).toEqual({ high: 5450, leader: 'a', max: 5600 });
  });
  it('a higher challenger takes the lead one increment over the old ceiling', () => {
    const s = proxy({ high: 4900, leader: 'a', max: 5600 }, { id: 'b', amount: 5000, max: 6000 }, true);
    expect(s).toEqual({ high: 5850, leader: 'b', max: 6000 });
  });
  it('tie goes to the earlier ceiling', () => {
    const s = proxy({ high: 4900, leader: 'a', max: 5600 }, { id: 'b', amount: 5000, max: 5600 }, true);
    expect(s.leader).toBe('a'); expect(s.high).toBe(5600);
  });
  it('under the ask changes nothing', () => {
    const before = { high: 4900, leader: 'a', max: 5600 };
    expect(proxy(before, { id: 'b', amount: 4950, max: 4950 }, true)).toBe(before);
  });
});

const lot = (over: Partial<Lot> = {}): Lot => ({
  id: 'altima', start: 4900, retail: 7995, opensAt: 0, closesAt: 1_000_000, high: 4900, bids: 0, watching: 12, ...over,
});

describe('server', () => {
  it('acks with price and close time written together', () => {
    let now = 900_000;
    const s = new LocalAuctionServer([lot()], () => now);
    const a = s.apply({ lotId: 'altima', bidder: 'me', amount: 5100, max: 5100, key: 'k1' }, now);
    expect(a.ok).toBe(true);
    expect(a.lot.high).toBe(5100); expect(a.lot.bids).toBe(1);
    expect(a.lot.closesAt).toBe(now + 120_000);   // inside the last two minutes, so refilled
  });
  it('idempotent on key', () => {
    const s = new LocalAuctionServer([lot()]);
    const a = s.apply({ lotId: 'altima', bidder: 'me', amount: 4900, max: 5100, key: 'k' }, 10);
    const b = s.apply({ lotId: 'altima', bidder: 'me', amount: 4900, max: 5100, key: 'k' }, 20);
    expect(b).toBe(a); expect(s.get('altima').bids).toBe(1);
  });
  it('a bid after close is rejected with how late it was', () => {
    const s = new LocalAuctionServer([lot({ closesAt: 1000 })]);
    const a = s.apply({ lotId: 'altima', bidder: 'me', amount: 4900, max: 5100, key: 'late' }, 1400);
    expect(a.ok).toBe(false);
    if (!a.ok && a.reason === 'closed') expect(a.lateByMs).toBe(400);
    expect(s.get('altima').closed?.sold).toBe(false);
  });
  it('outbid by a standing ceiling says so', () => {
    const s = new LocalAuctionServer([lot()]);
    s.apply({ lotId: 'altima', bidder: 'a', amount: 4900, max: 6000, key: '1' }, 10);
    const b = s.apply({ lotId: 'altima', bidder: 'me', amount: 5000, max: 5200, key: '2' }, 20);
    expect(b.ok).toBe(false); if (!b.ok) expect(b.reason).toBe('outbid');
    expect(b.lot.high).toBe(5450); expect(b.lot.leader).toBe('a');
  });
});

describe('grid', () => {
  const wide = (x: string) => x === 'W';
  it('a sideways photo that will not fit pulls the next upright one forward', () => {
    expect(pack(['a', 'b', 'W', 'c', 'd'], 3, wide).map(x => x.p)).toEqual(['a', 'b', 'c', 'W', 'd']);
  });
  it('keeps order when everything fits', () => {
    expect(pack(['W', 'a', 'b', 'c'], 3, wide).map(x => x.p)).toEqual(['W', 'a', 'b', 'c']);
  });
  it('twelve photos with three wide never leave a hole in four columns', () => {
    const ph = ['a', 'W', 'b', 'c', 'd', 'e', 'W', 'f', 'g', 'W', 'h', 'i'];
    const rows: number[] = []; let used = 0;
    for (const { p } of pack(ph, 4, wide)) { used += wide(p) ? 2 : 1; if (used === 4) { rows.push(used); used = 0; } }
    expect(rows.every(r => r === 4)).toBe(true);
  });
});
