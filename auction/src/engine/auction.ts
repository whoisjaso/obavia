/* Pure auction rules. No clocks, no network: every function takes `now`.
   The Durable Object will run exactly these; the app runs them locally to
   predict and to render. See docs/plan/obavia-auction-decisions.md §2, §4. */

/** Bid increments by price, in whole dollars. */
export function increment(price: number): number {
  if (price < 1000) return 25;
  if (price < 5000) return 100;
  if (price < 10000) return 250;
  return 500;
}

/** The lowest bid that beats the current high (or opens at the start price). */
export const nextBid = (high: number, opened: boolean) => (opened ? high + increment(high) : high);

/** Price after rolling `steps` increments up from the next bid (never below it). */
export function roll(high: number, opened: boolean, steps: number): number {
  let p = nextBid(high, opened);
  for (let i = 0; i < Math.max(0, steps); i++) p += increment(p);
  return p;
}

/** Fixed soft close: a bid inside the last two minutes sets the close to exactly 2:00 from now. */
export const SOFT_CLOSE_MS = 120_000;
export function closeAfterBid(closesAt: number, now: number): number {
  return closesAt - now < SOFT_CLOSE_MS ? now + SOFT_CLOSE_MS : closesAt;
}
export const inLastTwoMinutes = (closesAt: number, now: number) => closesAt - now < SOFT_CLOSE_MS && closesAt > now;

/** A bid above twice the current high asks for a deliberate hold. */
export const needsHold = (amount: number, high: number) => amount > high * 2;

export type Bidder = { id: string; amount: number; max: number };   // amount: the price bid now; max: the ceiling, ≥ amount

export type Proxy = { high: number; leader?: string; max?: number };

/** eBay-style proxy: a new ceiling against the standing leader's ceiling.
    Returns the new public high and leader. Ties go to the earlier ceiling. */
export function proxy(state: Proxy, bidder: Bidder, opened: boolean): Proxy {
  const floorBid = nextBid(state.high, opened);
  const max = Math.max(bidder.max, bidder.amount);
  if (bidder.amount < floorBid || max < floorBid) return state;   // too low, no change
  if (!opened || !state.leader || state.max === undefined) {
    return { high: bidder.amount, leader: bidder.id, max };        // opens at the price the buyer named
  }
  if (bidder.id === state.leader) return { ...state, high: Math.max(state.high, bidder.amount), max: Math.max(state.max, max) }; // raise own bid or ceiling
  if (max > state.max) {
    // challenger wins: the price is what they named, or one increment over the old leader's ceiling if that is higher
    return { high: Math.min(max, Math.max(bidder.amount, state.max + increment(state.max))), leader: bidder.id, max };
  }
  // leader holds: price rises to one increment over the challenger's ceiling, capped at the leader's ceiling
  return { ...state, high: Math.min(state.max, max + increment(max)) };
}
