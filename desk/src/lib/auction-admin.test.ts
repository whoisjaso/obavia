import { describe, expect, it } from 'vitest';
import { holdingCost, isAdminKey } from './auction';

describe('the admin key', () => {
  it('is the key minted for GDN "*" and nothing else', () => {
    expect(isAdminKey('d:*.abcDEF_-1')).toBe(true);
    expect(isAdminKey('d:P123456.abcDEF')).toBe(false);
    expect(isAdminKey('')).toBe(false);
    expect(isAdminKey(null)).toBe(false);
  });
});

describe('holding cost', () => {
  it('is about 0.1% of the car\'s value per day, not a flat $35', () => {
    expect(holdingCost(7, 5000)).toBe(35);
    expect(holdingCost(74, 3350)).toBe(248);
    expect(holdingCost(3, 12500)).toBe(38);
  });
});
