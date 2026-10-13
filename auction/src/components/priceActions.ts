/* VoiceOver's adjustable trait on the price (decisions §3.5 item 4): the two actions a swipe up or down sends,
   and the direction each rolls, one engine increment at a time. Pure, so it is tested without the native runtime. */
export const PRICE_ACTIONS = [{ name: 'increment' as const }, { name: 'decrement' as const }];
export function priceAction(name: string): 1 | -1 | null {
  return name === 'increment' ? 1 : name === 'decrement' ? -1 : null;
}
/** The steps after an action, never below zero (the asking price is the floor). */
export const adjustSteps = (steps: number, dir: 1 | -1) => Math.max(0, steps + dir);
