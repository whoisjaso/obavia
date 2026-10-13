import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* The platform and the Keychain are mocked: Platform.OS is flipped per test, SecureStore is a Map that can be
   told to refuse, localStorage is a Map on globalThis. */
const platform = { OS: 'ios' as string };
const secure = new Map<string, string>();
const refuse = { get: false, set: false };
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 0,
  getItem: vi.fn((k: string) => { if (refuse.get) throw new Error('keychain'); return secure.get(k) ?? null; }),
  setItem: vi.fn((k: string, v: string) => { if (refuse.set) throw new Error('keychain'); secure.set(k, v); }),
}));

class MemoryStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
let ls: MemoryStorage;
const SESSION = JSON.stringify({ id: 'b-1', token: 't-1' });

async function load() { vi.resetModules(); return (await import('./kv')).kv; }

beforeEach(() => {
  secure.clear(); refuse.get = false; refuse.set = false;
  ls = new MemoryStorage(); (globalThis as { localStorage?: unknown }).localStorage = ls;
});
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

describe('kv on a phone', () => {
  beforeEach(() => { platform.OS = 'ios'; });

  it('keeps the buyer in secure storage, never in localStorage', async () => {
    const kv = await load();
    kv.set('obavia.buyer', SESSION);
    expect(secure.get('obavia.buyer')).toBe(SESSION);
    expect(ls.getItem('obavia.buyer')).toBeNull();
    expect(kv.get('obavia.buyer')).toBe(SESSION);
  });

  it('moves an old localStorage session into secure storage once, and removes the old copy', async () => {
    ls.setItem('obavia.buyer', SESSION);
    const kv = await load();
    expect(kv.get('obavia.buyer')).toBe(SESSION);
    expect(secure.get('obavia.buyer')).toBe(SESSION);
    expect(ls.getItem('obavia.buyer')).toBeNull();
    // a later read comes from secure storage alone
    expect(kv.get('obavia.buyer')).toBe(SESSION);
  });

  it('a newer secure value wins over a stale localStorage copy', async () => {
    secure.set('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-2' }));
    ls.setItem('obavia.buyer', SESSION);
    const kv = await load();
    expect(JSON.parse(kv.get('obavia.buyer')!).token).toBe('t-2');
  });

  it('a refused secure write keeps the old copy where it was and still signs the buyer in', async () => {
    ls.setItem('obavia.buyer', SESSION);
    refuse.set = true;
    const kv = await load();
    expect(kv.get('obavia.buyer')).toBe(SESSION);
    expect(ls.getItem('obavia.buyer')).toBe(SESSION);
  });

  it('a refused secure write never falls back to plain storage', async () => {
    refuse.set = true;
    const kv = await load();
    kv.set('obavia.buyer', SESSION);
    expect(ls.getItem('obavia.buyer')).toBeNull();
  });

  it('nothing stored anywhere reads as null', async () => {
    const kv = await load();
    expect(kv.get('obavia.buyer')).toBeNull();
  });

  it('other keys stay in localStorage', async () => {
    const kv = await load();
    kv.set('obavia.profile', '{"phone":"1"}');
    expect(ls.getItem('obavia.profile')).toBe('{"phone":"1"}');
    expect(secure.has('obavia.profile')).toBe(false);
  });
});

describe('kv on the web', () => {
  beforeEach(() => { platform.OS = 'web'; });

  it('keeps the buyer in localStorage and never touches secure storage', async () => {
    const kv = await load();
    kv.set('obavia.buyer', SESSION);
    expect(ls.getItem('obavia.buyer')).toBe(SESSION);
    expect(secure.size).toBe(0);
    expect(kv.get('obavia.buyer')).toBe(SESSION);
  });

  it('no localStorage at all reads null and writes nothing, without throwing', async () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    const kv = await load();
    expect(() => kv.set('obavia.buyer', SESSION)).not.toThrow();
    expect(kv.get('obavia.buyer')).toBeNull();
  });
});
