/* The production form fillers (ported from the Triple J desk) read the dealer
   from one module. Here the dealer comes from the workspace, so this module
   is a live view over the current DealerConfig: `useDealership(config)` is
   called before any official form is filled, and every getter reads from it.
   Nothing here is typed; every value is the dealer's own. */
import type { DealerConfig } from './config';

let current: DealerConfig | null = null;
export function useDealership(config: DealerConfig) { current = config; }
const d = () => { if (!current) throw new Error('useDealership(config) must run before filling an official form'); return current; };

export const dealership = {
  get legalName() { return d().legalName; },
  get name() { return d().legalName; },
  get license() { return d().licence; },
  get county() { return d().county; },
  get authorizedAgent() { return d().signer?.name ?? null; },
  address: {
    get street() { return d().street; }, get locality() { return d().city; },
    get region() { return d().state; }, get postalCode() { return d().zip; },
  },
  phone: { get display() { return d().phone; } },
  get website() { return d().website; },
};
