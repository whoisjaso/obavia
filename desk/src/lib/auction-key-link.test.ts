import { beforeEach, describe, expect, it } from 'vitest';
import { dealerKey, takeArrival, takeKeyFromLink } from './auction';

/* Open The Desk (legibility audit D2): the key arrives in the fragment, is kept the way a pasted key is kept,
   and leaves the address bar and this tab's history entry before anything renders. */
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0,
  } as Storage;
  takeArrival();
});
const at = (hash: string) => {
  const calls: string[] = [];
  const loc = { hash, pathname: '/', search: '' };
  const hist = { state: null, replaceState: (_s: unknown, _t: string, url?: string | URL | null) => { calls.push(String(url)); } };
  return { loc, hist, calls };
};
const KEY = 'd:P123456.AbC_d-9xYz';

describe('a key in the link', () => {
  it('is kept, taken out of the address, and lands on Let It Go once', () => {
    const { loc, hist, calls } = at(`#/auction/setup?key=${encodeURIComponent(KEY)}`);
    expect(takeKeyFromLink(loc, hist)).toBe('kept');
    expect(dealerKey.get()).toBe(KEY);
    expect(calls).toEqual(['/#/auction/go']);
    expect(calls.join()).not.toContain('key=');
    expect(takeArrival()).toBe(true);
    expect(takeArrival()).toBe(false);
  });
  it('reads the unencoded form the same way', () => {
    const { loc, hist } = at(`#/auction/setup?key=${KEY}`);
    expect(takeKeyFromLink(loc, hist)).toBe('kept');
    expect(dealerKey.get()).toBe(KEY);
  });
  it('a malformed key is not kept, is still removed, and lands on the key page', () => {
    const { loc, hist, calls } = at('#/auction/setup?key=hello');
    expect(takeKeyFromLink(loc, hist)).toBe('bad');
    expect(dealerKey.get()).toBeNull();
    expect(calls).toEqual(['/#/auction/setup']);
    expect(takeArrival()).toBe(false);
  });
  it('any other address is left alone', () => {
    for (const h of ['', '#/', '#/auction/setup', '#/auction', `#/auction/go?key=${KEY}`]) {
      const { loc, hist, calls } = at(h);
      expect(takeKeyFromLink(loc, hist)).toBeNull();
      expect(calls).toEqual([]);
    }
    expect(dealerKey.get()).toBeNull();
  });
});
