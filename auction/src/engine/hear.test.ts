import { describe, expect, it } from 'vitest';
import { fadeGains } from './fade';

describe('hold to hear: the release fade', () => {
  it('steps the gain down to 0, the last step the pause, never a jump to silence', () => {
    expect(fadeGains(6)).toEqual([0.833, 0.667, 0.5, 0.333, 0.167, 0]);
    expect(fadeGains(3)).toEqual([0.667, 0.333, 0]);
    expect(fadeGains().at(-1)).toBe(0);
  });
});
