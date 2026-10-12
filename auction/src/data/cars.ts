/* Seeded lane. Figures are placeholders until the ten Triple J pilot cars and
   floors arrive; the photos are the ad's stills. Every car carries the dealer's
   name and licence number because the law puts the dealer's name on the sale. */
import type { Lot } from '../engine/server';
import type { Fees } from '../engine/money';
import { TEXAS } from '../engine/money';

export type Car = {
  id: string;
  year: number; make: string; model: string;
  miles: number;
  photos: number[];              // require() ids; first is the lane photo
  engine?: number;               // the recorded idle, for hold-to-hear (none seeded yet)
  dealer: { name: string; city: string; gdn: string; fees: Fees };
  grade: [number, number, number, number, number, number]; // paint, glass, tyres, lights, A/C, drives: 0..1
  title: 'in hand' | 'at lender';
};

const TRIPLE_J = { name: 'Triple J Auto', city: 'Houston', gdn: 'P000000', fees: { ...TEXAS, doc: 150 } };

export const cars: Car[] = [
  {
    id: 'altima', year: 2014, make: 'Nissan', model: 'Altima', miles: 128_400,
    photos: [require('../../assets/cars/auction.jpg'), require('../../assets/cars/detail.jpg'), require('../../assets/cars/wheel.jpg')],
    dealer: TRIPLE_J, grade: [0.6, 1, 0.5, 1, 0.5, 1], title: 'in hand',
  },
  {
    id: 'sonata', year: 2015, make: 'Hyundai', model: 'Sonata', miles: 96_200,
    photos: [require('../../assets/cars/lot.jpg'), require('../../assets/cars/keys.jpg')],
    dealer: TRIPLE_J, grade: [1, 1, 1, 1, 0.5, 1], title: 'at lender',
  },
  {
    id: 'fusion', year: 2013, make: 'Ford', model: 'Fusion', miles: 141_900,
    photos: [require('../../assets/cars/detail.jpg'), require('../../assets/cars/wheel.jpg')],
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
