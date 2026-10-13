/* The price under VoiceOver (decisions §3.5 item 4; gap table Phase 2 Frontend): increment and decrement each roll
   one engine increment, the drag's own step, and the ask is the floor. */
import { describe, expect, it } from 'vitest';
import { increment, roll } from '../engine/auction';
import { PRICE_ACTIONS, adjustSteps, priceAction } from './priceActions';

describe('the adjustable price', () => {
  it('exposes increment and decrement, and nothing else rolls', () => {
    expect(PRICE_ACTIONS.map(a => a.name)).toEqual(['increment', 'decrement']);
    expect(priceAction('increment')).toBe(1);
    expect(priceAction('decrement')).toBe(-1);
    expect(priceAction('activate')).toBeNull();
    expect(priceAction('')).toBeNull();
  });

  it('an increment is one engine increment on the Bid sheet, a decrement one back, never under the ask', () => {
    for (const [high, opened] of [[5100, true], [3400, false], [12_500, true]] as [number, boolean][]) {
      const at = (steps: number) => roll(high, opened, steps);
      let steps = 0;
      steps = adjustSteps(steps, priceAction('increment')!);
      expect(at(steps) - at(0)).toBe(increment(at(0)));
      steps = adjustSteps(steps, priceAction('increment')!);
      expect(at(steps) - at(1)).toBe(increment(at(1)));
      steps = adjustSteps(steps, priceAction('decrement')!);
      expect(steps).toBe(1);
      steps = adjustSteps(adjustSteps(steps, -1), -1);
      expect(steps).toBe(0);   // the ask is the floor
      expect(at(0)).toBe(opened ? high + increment(high) : high);
    }
  });

  it('on the Lane the increment arms one step: the Bid sheet opens at the next bid', () => {
    // Lane.tsx: onArm(0) is the sheet at roll(high, opened, 0), the same number the first 28 pt of drag arms
    expect(roll(5100, true, 0)).toBe(5100 + increment(5100));
  });
});
