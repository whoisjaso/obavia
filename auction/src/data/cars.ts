/* Seeded lane. Figures are placeholders until the ten Triple J pilot cars and
   floors arrive; the photos are the ad's stills, two of them cropped sideways
   because buyers and dealers shoot cars horizontally too. Every car carries the
   dealer's name and licence number because the law puts the dealer's name on
   the sale. */
import type { Lot } from '../engine/server';
import type { Fees } from '../engine/money';
import { TEXAS } from '../engine/money';

/** A photo knows its own shape so the glass can treat sideways shots properly. */
export type Photo = { src: number; w: number; h: number };
export const isWide = (p: Photo) => p.w > p.h;

export type Car = {
  id: string;
  year: number; make: string; model: string;
  miles: number;
  vin: string;                   // full VIN; the glass shows the last six
  photos: Photo[];               // the first is the lane photo
  engine?: number;               // the recorded idle, for hold-to-hear (none seeded yet)
  dealer: { name: string; city: string; street: string; gdn: string; phone: string; afterHours: string; fees: Fees };
  grade: [number, number, number, number, number, number]; // paint, glass, tyres, lights, A/C, drives: 0..1
  title: 'in hand' | 'at lender';
};

export const GRADE_WORDS = ['paint', 'glass', 'tyres', 'lights', 'A/C', 'drives'] as const;

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

export const cars: Car[] = [
  {
    id: 'altima', year: 2014, make: 'Nissan', model: 'Altima', miles: 128_400, vin: '1N4AL3AP0EC000001',
    photos: [P.auction, P.auctionWide, P.detail, P.wheel, P.keys, P.auction, P.detail, P.wheel, P.auctionWide, P.keys, P.auction, P.wheel],
    dealer: TRIPLE_J, grade: [0.6, 1, 0.5, 1, 0.5, 1], title: 'in hand',
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

/** The lots as the server sees them, opened against `now`. The first car is
    already in its last two minutes so the blue ring can be seen in the demo. */
export function seedLots(now: number): Lot[] {
  const day = 86_400_000;
  return [
    { id: 'altima', start: 4900, retail: 7995, opensAt: now - 6 * day, closesAt: now + 95_000, high: 5100, leader: 'r1', max: 5100, bids: 7, watching: 23 },
    { id: 'sonata', start: 3400, retail: 6495, opensAt: now - 2 * day, closesAt: now + 2 * day + 4 * 3_600_000, high: 3400, bids: 0, watching: 11 },
    { id: 'fusion', start: 2900, retail: 5495, opensAt: now - 4 * day, closesAt: now + 1 * day + 2 * 3_600_000, high: 3250, leader: 'r2', max: 3400, bids: 3, watching: 9 },
  ];
}
