import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  clearAllStored,
  exportAllStored,
  listStoredKeys,
  readStored,
  removeStored,
  writeStored,
} from './storage';

/** Minimal in-memory Storage for node tests. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  } as Storage;
}

const Pref = z.object({ mode: z.enum(['a', 'b']) });

describe('storage', () => {
  it('is a no-op without a Storage (SSR)', () => {
    expect(readStored('x', Pref, { mode: 'a' }, null)).toEqual({ mode: 'a' });
    expect(writeStored('x', Pref, { mode: 'b' }, null)).toBe(false);
    expect(listStoredKeys(null)).toEqual([]);
    expect(clearAllStored(null)).toBe(0);
  });

  it('namespaces, validates, lists, exports and clears', () => {
    const s = memoryStorage();
    s.setItem('unrelated', '1');
    expect(writeStored('pref', Pref, { mode: 'b' }, s)).toBe(true);
    expect(s.getItem('apohenia.v1.pref')).toBe('{"mode":"b"}');
    expect(readStored('pref', Pref, { mode: 'a' }, s)).toEqual({ mode: 'b' });

    // invalid stored data falls back and is not deleted
    s.setItem('apohenia.v1.bad', '{"mode":"zzz"}');
    expect(readStored('bad', Pref, { mode: 'a' }, s)).toEqual({ mode: 'a' });
    expect(s.getItem('apohenia.v1.bad')).not.toBeNull();

    expect(listStoredKeys(s).map((k) => k.key)).toEqual(['bad', 'pref']);
    const exported = exportAllStored(s);
    expect(exported.mode).toBe('local_demo');
    expect(exported.entries).toEqual({ pref: { mode: 'b' }, bad: { mode: 'zzz' } });

    removeStored('bad', s);
    expect(listStoredKeys(s).map((k) => k.key)).toEqual(['pref']);
    expect(clearAllStored(s)).toBe(1);
    expect(s.getItem('unrelated')).toBe('1');
  });

  it('refuses to write invalid values', () => {
    const s = memoryStorage();
    expect(writeStored('pref', Pref, { mode: 'nope' } as unknown as { mode: 'a' }, s)).toBe(false);
    expect(s.length).toBe(0);
  });
});
