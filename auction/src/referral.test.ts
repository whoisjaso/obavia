import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claimSettled, codeFromUrl, forgetReferral, pendingReferral, rememberReferral, withReferral } from './referral';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK: 0, getItem: () => null, setItem: () => {} }));

class MemoryStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }
beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage(); });
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

describe('the code on a link', () => {
  it('reads r from the web query and from a deep link, upper-cased, and nothing else', () => {
    expect(codeFromUrl('?r=ab12cd')).toBe('AB12CD');
    expect(codeFromUrl('https://obavia.co/lane/altima?r=Ab12CD&utm=x#top')).toBe('AB12CD');
    expect(codeFromUrl('obavia://lane/altima?x=1&r=zz99zz')).toBe('ZZ99ZZ');
    expect(codeFromUrl('?ref=ab12cd')).toBeNull();
    expect(codeFromUrl('?r=')).toBeNull();
    expect(codeFromUrl('?r=a')).toBeNull();                          // too short
    expect(codeFromUrl('?r=' + 'a'.repeat(17))).toBeNull();          // too long
    expect(codeFromUrl('?r=ab%20cd')).toBeNull();                    // not a code
    expect(codeFromUrl('?r=%E0%A4%A')).toBeNull();                   // bad escape, no throw
    expect(codeFromUrl(null)).toBeNull();
    expect(codeFromUrl('https://obavia.co/lane/altima')).toBeNull();
  });

  it('the first link wins; forget clears', () => {
    rememberReferral(codeFromUrl('?r=first1'));
    rememberReferral(codeFromUrl('?r=second2'));
    expect(pendingReferral()).toBe('FIRST1');
    forgetReferral();
    expect(pendingReferral()).toBeNull();
    rememberReferral(null);
    expect(pendingReferral()).toBeNull();
  });

  it('the share link carries ?r= only with a code, after any query the link already has', () => {
    expect(withReferral('https://obavia.co/lane/altima', 'marisol7')).toBe('https://obavia.co/lane/altima?r=MARISOL7');
    expect(withReferral('https://obavia.co/lane/altima?x=1', 'MARISOL7')).toBe('https://obavia.co/lane/altima?x=1&r=MARISOL7');
    expect(withReferral('https://obavia.co/lane/altima', undefined)).toBe('https://obavia.co/lane/altima');
    expect(withReferral('https://obavia.co/lane/altima', 'no good')).toBe('https://obavia.co/lane/altima');
  });

  it('409 already_claimed and 404 no_such_code settle the claim; the network does not', () => {
    expect(claimSettled('already_claimed')).toBe(true);
    expect(claimSettled('no_such_code')).toBe(true);
    expect(claimSettled('network')).toBe(false);
    expect(claimSettled('sign_in')).toBe(false);
  });
});
