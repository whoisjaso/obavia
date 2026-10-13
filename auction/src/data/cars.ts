/* Seeded lane. Figures are placeholders until the ten Triple J pilot cars and
   floors arrive; the photos are the ad's stills, two of them cropped sideways
   because buyers and dealers shoot cars horizontally too. Every car carries the
   dealer's name and licence number because the law puts the dealer's name on
   the sale. */
import type { Lot } from '../engine/server';
import type { Fees } from '../engine/money';
import type { CarMeta, Collateral } from '../engine/meta';
import { TEXAS } from '../engine/money';

/** A photo knows its own shape so the glass can treat sideways shots properly. */
export type Photo = { src: number | { uri: string }; w: number; h: number };
/** A sound or a film: a bundled asset locally, the Worker's stream on a lot. */
export type Media = number | { uri: string };
export const isWide = (p: Photo) => p.w > p.h;

export type Car = {
  id: string;
  year: number; make: string; model: string;
  miles: number;
  vin: string;                   // full VIN; the glass shows the last six
  photos: Photo[];               // the first is the lane photo
  engine?: Media;                // the recorded idle, for hold-to-hear (W4-B: GET /lots/:id/audio, or the seeded file)
  video?: Media;                 // the walkaround, the Car's first tile (W4-B: GET /lots/:id/video, or the seeded file)
  dealer: { name: string; city: string; street: string; gdn: string; phone: string; afterHours: string; fees: Fees };
  grade: [number, number, number, number, number, number]; // paint, glass, tires, lights, A/C, drives: 0..1
  title: 'in hand' | 'at lender';
  collateral?: Collateral;       // who holds the title and how long its release takes; from the Desk
  documents?: { guide?: string; bill?: string; title?: string };   // absolute URLs
  hours?: string[];              // pickup windows the dealer offers
};

/** A Worker path ("/photos/x/0.jpg") made absolute against the Worker base. */
function absolute(base: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/** The lot's engine recording or walkaround as the Worker streams it (GET /lots/:id/audio, /video): the phone
    never sees the R2 key, only the lot's own path. */
export const lotMedia = (base: string, lotId: string, kind: 'audio' | 'video') => `${base.replace(/\/$/, '')}/lots/${encodeURIComponent(lotId)}/${kind}`;

/** The car a Worker lot carries, as the glass reads it. Null when the lot has no car yet. */
export function carFromLot(lot: Lot, base: string): Car | null {
  const m = lot.car;
  if (!m) return null;
  const docs = m.documents;
  return {
    id: lot.id,
    year: m.year, make: m.make, model: m.model,
    miles: m.miles, vin: m.vin,
    photos: m.photos.map(p => ({ src: { uri: absolute(base, p.url) }, w: p.w, h: p.h })),
    ...(m.audioKey ? { engine: { uri: lotMedia(base, lot.id, 'audio') } } : {}),
    ...(m.videoKey ? { video: { uri: lotMedia(base, lot.id, 'video') } } : {}),
    dealer: { ...m.dealer, fees: { ...m.dealer.fees } },
    grade: m.grade,
    title: m.title,
    collateral: m.collateral,
    documents: docs && {
      ...(docs.guide ? { guide: absolute(base, docs.guide) } : {}),
      ...(docs.bill ? { bill: absolute(base, docs.bill) } : {}),
      ...(docs.title ? { title: absolute(base, docs.title) } : {}),
    },
    hours: m.hours,
  };
}

export const GRADE_WORDS = ['paint', 'glass', 'tires', 'lights', 'A/C', 'drives'] as const;

const TRIPLE_J = {
  name: 'Triple J Auto', city: 'Houston', street: '100 Example St, Houston, TX 77002', gdn: 'P000000',
  phone: '(555) 010-0000', afterHours: '(555) 010-0001', fees: { ...TEXAS, doc: 150 },
};

const P = {
  auction: { src: require('../../assets/cars/auction.jpg'), w: 900, h: 1600 },
  auctionWide: { src: require('../../assets/cars/auction-wide.jpg'), w: 900, h: 506 },
  lot: { src: require('../../assets/cars/lot.jpg'), w: 900, h: 1600 },
  lotWide: { src: require('../../assets/cars/lot-wide.jpg'), w: 900, h: 506 },
  detail: { src: require('../../assets/cars/detail.jpg'), w: 900, h: 967 },
  wheel: { src: require('../../assets/cars/wheel.jpg'), w: 900, h: 1200 },
  keys: { src: require('../../assets/cars/keys.jpg'), w: 900, h: 1200 },
};
/* W4-B fixtures on the first seeded lot: a 2 s engine idle (generated, assets/sfx/engine-idle.wav, -18 dBFS like the
   cloud kit) and a 3 s walkaround placeholder (a pan across the lane still, assets/cars/walkaround.mp4). The Worker's
   lots carry audioKey and videoKey instead (carFromLot). */
const ENGINE_IDLE = require('../../assets/sfx/engine-idle.wav') as number;
const WALKAROUND = require('../../assets/cars/walkaround.mp4') as number;

const seededCars: Car[] = [
  {
    id: 'altima', year: 2014, make: 'Nissan', model: 'Altima', miles: 128_400, vin: '1N4AL3AP0EC000001',
    photos: [P.auction, P.auctionWide, P.detail, P.wheel, P.keys, P.auction, P.detail, P.wheel, P.auctionWide, P.keys, P.auction, P.wheel],
    dealer: TRIPLE_J, grade: [0.6, 1, 0.5, 1, 0.5, 1], title: 'in hand',
    engine: ENGINE_IDLE, video: WALKAROUND,
  },
  {
    id: 'sonata', year: 2015, make: 'Hyundai', model: 'Sonata', miles: 96_200, vin: '5NPE24AF0FH000002',
    photos: [P.lotWide, P.lot, P.keys, P.wheel, P.lot, P.keys, P.lotWide, P.wheel, P.lot, P.keys, P.wheel, P.lot],
    dealer: TRIPLE_J, grade: [1, 1, 1, 1, 0.5, 1], title: 'at lender',
  },
  {
    id: 'fusion', year: 2013, make: 'Ford', model: 'Fusion', miles: 141_900, vin: '3FA6P0H70DR000003',
    photos: [P.detail, P.wheel, P.auctionWide, P.keys, P.detail, P.wheel, P.keys, P.detail, P.auctionWide, P.wheel, P.keys, P.detail],
    dealer: TRIPLE_J, grade: [0.5, 1, 0.5, 0.5, 0, 1], title: 'in hand',
  },
];

/* break-ui, dev-only: `?data=worst` swaps the seeded fixture at this boundary for the realistic worst
   case (the longest name a dealer lists, a five-figure hammer, twelve sideways photos, no photos at all);
   `?data=empty` is zero lots. Never set in a native build: there is no location.search there. */
export const preview = (((globalThis as { location?: { search?: string } }).location?.search ?? '').match(/[?&]data=(worst|empty)/)?.[1] ?? null) as 'worst' | 'empty' | null;

const worstCars: Car[] = [
  {
    id: 'altima', year: 2011, make: 'Mercedes-Benz', model: 'Sprinter 2500 High Roof', miles: 214_700, vin: 'WD3PE8CC5B5000004',
    photos: Array.from({ length: 12 }, (_, i) => (i % 2 ? P.lotWide : P.auctionWide)),
    dealer: { ...TRIPLE_J, name: 'Gulf Coast Commercial Vehicles', fees: { ...TEXAS, doc: 511 } },   // 12,500 + tax + fees (plate included) = 13,910
    grade: [0.5, 1, 0.5, 1, 0, 1], title: 'in hand',
  },
  { ...seededCars[1], photos: [] },
  seededCars[2],
];

export const cars: Car[] = preview === 'worst' ? worstCars : preview === 'empty' ? [] : seededCars;

/** The lots as the server sees them, opened against `now`. The first car is
    already in its last two minutes so the blue ring can be seen in the demo. */
export function seedLots(now: number): Lot[] {
  const day = 86_400_000;
  if (preview === 'empty') return [];
  if (preview === 'worst') return [
    { id: 'altima', start: 9900, retail: 15995, opensAt: now - 6 * day, closesAt: now + 95_000, high: 12_500, leader: 'me', max: 12_500, bids: 14, watching: 1284 },
    { id: 'sonata', start: 3400, retail: 6495, opensAt: now - 2 * day, closesAt: now + 2 * day + 4 * 3_600_000, high: 3400, bids: 0, watching: 1 },
    { id: 'fusion', start: 2900, retail: 5495, opensAt: now - 4 * day, closesAt: now + 1 * day + 2 * 3_600_000, high: 3250, leader: 'r2', max: 3400, bids: 3, watching: 0 },
  ];
  return [
    { id: 'altima', start: 4900, retail: 7995, opensAt: now - 6 * day, closesAt: now + 95_000, high: 5100, leader: 'r1', max: 5100, bids: 7, watching: 23, car: { ...seededMeta(seededCars[0]), audioKey: 'lots/altima/engine.wav', videoKey: 'lots/altima/walkaround.mp4' } },
    { id: 'sonata', start: 3400, retail: 6495, opensAt: now - 2 * day, closesAt: now + 2 * day + 4 * 3_600_000, high: 3400, bids: 0, watching: 11 },
    { id: 'fusion', start: 2900, retail: 5495, opensAt: now - 4 * day, closesAt: now + 1 * day + 2 * 3_600_000, high: 3250, leader: 'r2', max: 3400, bids: 3, watching: 9 },
    // the closed lane (W4): a wholesale lot the Desk marked closed; GET /lots never lists it and neither does the stand-in
    { id: 'tahoe-closed', start: 6900, retail: 11995, opensAt: now - 1 * day, closesAt: now + 3 * day, high: 6900, bids: 0, watching: 0, car: { ...seededMeta(seededCars[1]), year: 2016, make: 'Chevrolet', model: 'Tahoe', vin: '1GNSCBKC0GR000009', lane: 'closed' } },
  ];
}

/** The Desk's record for a seeded car, as a Worker lot would carry it (the photos as Worker paths). */
function seededMeta(c: Car): CarMeta {
  return {
    year: c.year, make: c.make, model: c.model, miles: c.miles, vin: c.vin,
    photos: c.photos.map((p, i) => ({ url: `/photos/${c.id}/${i}.jpg`, w: p.w, h: p.h })),
    grade: c.grade, title: c.title, dealer: c.dealer,
    collateral: { title: { status: c.title === 'in hand' ? 'hand' : 'lender', ...(c.title === 'at lender' ? { lienholder: 'lender', releaseDays: 7 } : {}) }, floor: 0, insured: true },
  };
}
