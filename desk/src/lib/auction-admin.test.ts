import { describe, expect, it } from 'vitest';
import { isAdminKey } from './auction';

describe('the admin key', () => {
  it('is the key minted for GDN "*" and nothing else', () => {
    expect(isAdminKey('d:*.abcDEF_-1')).toBe(true);
    expect(isAdminKey('d:P123456.abcDEF')).toBe(false);
    expect(isAdminKey('')).toBe(false);
    expect(isAdminKey(null)).toBe(false);
  });
});
