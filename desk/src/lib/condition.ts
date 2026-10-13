/* The car's condition the day it sold, and every complaint and repair after.
   "The car broke, so I'm not paying" is answered by the record, not an
   argument: what was signed, how it was sold, how far it has been driven
   since, and whether a written warranty covers the repair. */
import { daysBetween } from './loans';
import type { Sale } from './sale';

export type Condition = {
  signedOn: string;               // YYYY-MM-DD
  miles: number | null;           // odometer at sale
  asIs: boolean; warranty?: string;
  guide: boolean;                 // Buyers Guide on the window
  drove: boolean;                 // test drive taken
  lights?: string;                // warning lights at sale, if any
  known?: string;                 // what wasn't working at sale, if anything
  photos: string[];               // small JPEG data URLs
};
export type ServiceEntry = { on: string; miles: number | null; what: string; kind: 'complaint' | 'repair'; by?: 'dealer' | 'buyer' };

export const photosOf = (v: string | undefined): string[] => { try { const x = JSON.parse(v ?? '[]'); return Array.isArray(x) ? x.filter(s => typeof s === 'string') : []; } catch { return []; } };

/** Read off the sale's signed paperwork when the note opens. */
export function conditionFromSale(s: Sale, on: string): Condition | undefined {
  const c = s.step.paperwork?.conditionReport, bos = s.step.paperwork?.billOfSale ?? {};
  if (!c) return undefined;
  return {
    signedOn: on, miles: s.vehicle.mileage ?? null,
    asIs: bos.asIs !== 'warranty', warranty: bos.asIs === 'warranty' ? bos.warrantyLength : undefined,
    guide: c.guide === 'yes', drove: c.drove === 'yes',
    lights: c.lights === 'yes' ? c.lightsWhich : undefined,
    known: c.known === 'yes' ? c.knownWhat : undefined,
    photos: photosOf(c.photos),
  };
}

/** How long and how far after the sale something happened: "27 days and 2,140 miles after the sale". */
export function since(c: Condition, e: { on: string; miles: number | null }) {
  const days = Math.max(0, daysBetween(c.signedOn, e.on));
  const miles = c.miles !== null && e.miles !== null && e.miles >= c.miles ? e.miles - c.miles : null;
  const d = `${days} ${days === 1 ? 'day' : 'days'}`;
  return miles === null ? `${d} after the sale` : `${d} and ${miles.toLocaleString('en-US')} miles after the sale`;
}

/** Whether a complaint was already known at sale: the words overlap what was written down that day. */
export function knownAtSale(c: Condition, what: string) {
  const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const said = new Set([...words(c.known ?? ''), ...words(c.lights ?? '')]);
  return [...words(what)].some(w => said.has(w));
}

/** The one line the owner reads when a buyer says they won't pay because of the car. */
export function standingLine(c: Condition) {
  return c.asIs ? 'Sold as-is. Payments are due whether or not it needs repairs.' : `Sold with a warranty${c.warranty ? ` (${c.warranty})` : ''}. Check whether it covers the repair; payments are still due.`;
}
