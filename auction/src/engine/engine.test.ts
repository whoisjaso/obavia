import { describe, expect, it } from 'vitest';
import { closeAfterBid, inLastTwoMinutes, increment, needsHold, nextBid, proxy, roll } from './auction';
import { outTheDoor, TEXAS } from './money';
import { LocalAuctionServer, type Lot } from './server';
import { pack } from './grid';
import { collateralRefusal } from './meta';

describe('money', () => {
  it('total is hammer + 6.25% + title + registration + $10 plate + doc, no premium', () => {
    const t = outTheDoor(5150, { ...TEXAS, doc: 292 });
    expect(t.tax).toBe(321.88);
    expect(t.fees).toBe(410);
    expect(t.total).toBe(5881.88);
  });
  it('the plate is $10 (HB 718) and a lot opened before it still carries it', () => {
    expect(TEXAS.plate).toBe(10);
    const { plate: _drop, ...old } = { ...TEXAS, doc: 292 };
    expect(outTheDoor(5150, old).fees).toBe(410);
  });
  it('the database fee is off unless the dealer charges it, and never above $20', () => {
    expect(outTheDoor(5000, { ...TEXAS, doc: 150 }).fees).toBe(268);
    expect(outTheDoor(5000, { ...TEXAS, doc: 150, database: 20 }).fees).toBe(288);
    expect(outTheDoor(5000, { ...TEXAS, doc: 150, database: 35 }).fees).toBe(288);
    expect(outTheDoor(5000, { ...TEXAS, doc: 150, database: 15 }).total).toBe(5595.5);
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

describe('collateral', () => {
  const ok = { title: { status: 'hand' as const }, floor: 3400, insured: true };
  it('title in hand, insured, floor above payoff: accepted', () => { expect(collateralRefusal(ok)).toBeNull(); });
  it('repo or unknown title: refused', () => {
    expect(collateralRefusal({ ...ok, title: { status: 'repo' } })).toMatch(/repossession/);
    expect(collateralRefusal({ ...ok, title: { status: 'unknown' } })).toMatch(/unknown/);
  });
  it('at lender needs a release time', () => {
    expect(collateralRefusal({ ...ok, title: { status: 'lender', payoff: 2000 } })).toMatch(/release/);
    expect(collateralRefusal({ ...ok, title: { status: 'lender', payoff: 2000, releaseDays: 5 } })).toBeNull();
  });
  it('the release lands inside 14 days so title reaches the buyer before day 21', () => {
    expect(collateralRefusal({ ...ok, title: { status: 'lender', payoff: 2000, releaseDays: 14 } })).toBeNull();
    expect(collateralRefusal({ ...ok, title: { status: 'lender', payoff: 2000, releaseDays: 15 } })).toBe('release past day 14');
  });
  it('a floor under the payoff needs the dealer\'s OK', () => {
    expect(collateralRefusal({ ...ok, title: { status: 'lender', payoff: 4000, releaseDays: 5 } })).toMatch(/payoff/);
    expect(collateralRefusal({ ...ok, title: { status: 'lender', payoff: 4000, releaseDays: 5 }, payoffAcknowledged: true })).toBeNull();
  });
  it('uninsured: refused', () => { expect(collateralRefusal({ ...ok, insured: false })).toMatch(/insured/); });
});

describe('carFromLot', async () => {
  // cars.ts requires the seeded photos as Metro assets; under Node they are just ids.
  const { createRequire } = await import('node:module');
  const Module = createRequire(import.meta.url)('node:module') as { _extensions: Record<string, (m: { exports: unknown }) => void> };
  Module._extensions['.jpg'] = m => { m.exports = 1; };
  Module._extensions['.wav'] = m => { m.exports = 2; };
  Module._extensions['.mp4'] = m => { m.exports = 3; };
  const { carFromLot, isWide, lotMedia, seedLots } = await import('../data/cars');
  const { LocalAuctionServer, isPublic } = await import('./server');
  const meta = {
    year: 2016, make: 'Toyota', model: 'Camry', miles: 88_000, vin: '4T1BF1FK0GU000004',
    photos: [{ url: '/photos/camry/0.jpg', w: 1600, h: 900 }, { url: 'photos/camry/1.jpg', w: 900, h: 1600 }],
    grade: [1, 1, 1, 1, 1, 1] as [number, number, number, number, number, number],
    title: 'at lender' as const,
    dealer: { name: 'Triple J Auto', city: 'Houston', street: '100 Example St', gdn: 'P000000', phone: '(555) 010-0000', afterHours: '(555) 010-0001', fees: { ...TEXAS, doc: 150 } },
    documents: { guide: '/docs/camry/guide.pdf' },
    collateral: { title: { status: 'lender' as const, lienholder: 'Westlake', payoff: 3000, releaseDays: 10 }, floor: 4000, insured: true },
  };
  const lot: Lot = { id: 'camry', start: 4000, retail: 7995, opensAt: 0, closesAt: 1, high: 4000, bids: 0, watching: 0, car: meta };
  it('prefixes photo and document paths with the Worker base', () => {
    const car = carFromLot(lot, 'https://auction.example.com/')!;
    expect(car.id).toBe('camry');
    expect(car.photos[0].src).toEqual({ uri: 'https://auction.example.com/photos/camry/0.jpg' });
    expect(car.photos[1].src).toEqual({ uri: 'https://auction.example.com/photos/camry/1.jpg' });
    expect(car.documents?.guide).toBe('https://auction.example.com/docs/camry/guide.pdf');
    expect(car.collateral?.title.releaseDays).toBe(10);
  });
  it('keeps each photo shape so sideways shots read wide', () => {
    const car = carFromLot(lot, 'https://auction.example.com')!;
    expect(isWide(car.photos[0])).toBe(true);
    expect(isWide(car.photos[1])).toBe(false);
  });
  it('a lot without a car is null', () => {
    const { car: _, ...bare } = lot;
    expect(carFromLot(bare, 'https://auction.example.com')).toBeNull();
  });
  // W4-B: the engine recording and the walkaround, streamed by lot, never by key
  it('audioKey and videoKey become the lot\'s own stream paths; without them the car has neither', () => {
    const car = carFromLot({ ...lot, car: { ...meta, audioKey: 'r2/private/engine.wav', videoKey: 'r2/private/walk.mp4' } }, 'https://auction.example.com/')!;
    expect(car.engine).toEqual({ uri: 'https://auction.example.com/lots/camry/audio' });
    expect(car.video).toEqual({ uri: 'https://auction.example.com/lots/camry/video' });
    expect(JSON.stringify(car)).not.toMatch(/r2\/private/);
    const bare = carFromLot(lot, 'https://auction.example.com')!;
    expect(bare.engine).toBeUndefined(); expect(bare.video).toBeUndefined();
    expect(lotMedia('https://a.example', 'lot 9', 'audio')).toBe('https://a.example/lots/lot%209/audio');
  });
  // W4: the closed lane. GET /lots never lists a closed lot; the stand-in drops it at the same boundary
  it('a closed lot never reaches the lane: the stand-in omits it as GET /lots does', () => {
    const now = 1_700_000_000_000;
    const seeded = seedLots(now);
    const closed = seeded.filter(l => !isPublic(l));
    expect(closed.map(l => l.id)).toEqual(['tahoe-closed']);
    expect(closed[0].car?.lane).toBe('closed');
    const server = new LocalAuctionServer(seeded, () => now);
    expect(server.all().map(l => l.id)).toEqual(['altima', 'sonata', 'fusion']);
    expect(() => server.get('tahoe-closed')).toThrow();
    expect(isPublic({ ...lot, car: { ...meta, lane: 'public' } })).toBe(true);
    expect(isPublic(lot)).toBe(true);
    // the first seeded lot carries the fixture's keys
    expect(seeded[0].car).toMatchObject({ audioKey: expect.any(String), videoKey: expect.any(String) });
  });
});
