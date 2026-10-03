/* The production form fillers (ported from the Triple J desk) read the dealer
   from one module. Here the dealer comes from the workspace, so this module
   is a live view over the current DealerConfig: `useDealership(config)` is
   called before any official form is filled, and every getter reads from it.
   Nothing here is typed; every value is the dealer's own. */
import type { DealerConfig } from './config';

let current: DealerConfig | null = null;
const listeners: Array<() => void> = [];
/** Modules that hold dealer facts as exported values re-read them here (live bindings). */
export function onDealership(fn: () => void) { listeners.push(fn); if (current) fn(); }
export function useDealership(config: DealerConfig) { current = config; listeners.forEach(fn => fn()); }
const d = () => { if (!current) throw new Error('useDealership(config) must run before filling an official form'); return current; };

export const dealership = {
  get legalName() { return d().legalName; },
  get name() { return d().legalName; },
  get shortName() { return d().dba || d().legalName; },
  get license() { return d().licence; },
  get county() { return d().county; },
  get authorizedAgent() { return d().signer?.name ?? null; },
  address: {
    get street() { return d().street; }, get locality() { return d().city; },
    get region() { return d().state; }, get postalCode() { return d().zip; },
    get oneLine() { const a = d(); return [a.street, a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '); },
  },
  phone: { get display() { return d().phone; } },
  get website() { return d().website; },
  get lateHandlingFee() { return d().fees?.lateHandling ?? 0; },
};

/** The production desk's `brand` (names and marks), over the workspace dealer. */
export const brand = {
  get short() { return dealership.shortName; },
  get full() { return dealership.name; },
  get legal() { return dealership.legalName; },
  get logo() { return d().brand?.logo ?? null; },
  get monogram() { return d().brand?.monogram ?? ''; },
};
