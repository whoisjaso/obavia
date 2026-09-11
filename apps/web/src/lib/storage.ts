/**
 * SSR-safe, namespaced, zod-validated browser storage.
 *
 * Every key is prefixed `apohenia.v1.` so the Settings page can list/export/delete exactly
 * this app's data. On the server (or when storage is unavailable) reads return the fallback
 * and writes are no-ops — nothing throws during SSR.
 *
 * Increment 1 stores synthetic, local data only. Real-data mode (Increment 2) must never
 * silently fall back to this.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZodType } from 'zod';

export const STORAGE_NAMESPACE = 'apohenia.v1.' as const;

/** Resolve a Storage instance. Injectable for tests; returns null on the server. */
export function resolveStorage(explicit?: Storage | null): Storage | null {
  if (explicit !== undefined) return explicit;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function namespacedKey(key: string): string {
  return `${STORAGE_NAMESPACE}${key}`;
}

/** Read and validate. Invalid or missing data returns `fallback`; invalid data is left in place (not deleted) for inspection. */
export function readStored<T>(key: string, schema: ZodType<T>, fallback: T, storage?: Storage | null): T {
  const s = resolveStorage(storage);
  if (!s) return fallback;
  const raw = s.getItem(namespacedKey(key));
  if (raw === null) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/** Validate then write. Returns false if validation failed or storage is unavailable. */
export function writeStored<T>(key: string, schema: ZodType<T>, value: T, storage?: Storage | null): boolean {
  const s = resolveStorage(storage);
  if (!s) return false;
  const parsed = schema.safeParse(value);
  if (!parsed.success) return false;
  try {
    s.setItem(namespacedKey(key), JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string, storage?: Storage | null): void {
  const s = resolveStorage(storage);
  if (!s) return;
  s.removeItem(namespacedKey(key));
}

export interface StoredKeyInfo {
  /** Key without the namespace prefix. */
  key: string;
  /** Approximate size of the stored string in bytes (UTF-16 length × 2 is what browsers count; we report UTF-8). */
  bytes: number;
}

/** List this app's keys (namespace stripped) with sizes. */
export function listStoredKeys(storage?: Storage | null): StoredKeyInfo[] {
  const s = resolveStorage(storage);
  if (!s) return [];
  const out: StoredKeyInfo[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const full = s.key(i);
    if (full && full.startsWith(STORAGE_NAMESPACE)) {
      const raw = s.getItem(full) ?? '';
      out.push({ key: full.slice(STORAGE_NAMESPACE.length), bytes: new TextEncoder().encode(raw).length });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export interface StorageExport {
  namespace: typeof STORAGE_NAMESPACE;
  exported_at: string;
  /** Local demo mode only — synthetic data. */
  mode: 'local_demo';
  entries: Record<string, unknown>;
}

/** Export every namespaced entry as parsed JSON (unparseable values are exported as raw strings). */
export function exportAllStored(storage?: Storage | null): StorageExport {
  const s = resolveStorage(storage);
  const entries: Record<string, unknown> = {};
  if (s) {
    for (const { key } of listStoredKeys(s)) {
      const raw = s.getItem(namespacedKey(key));
      if (raw === null) continue;
      try {
        entries[key] = JSON.parse(raw);
      } catch {
        entries[key] = raw;
      }
    }
  }
  return { namespace: STORAGE_NAMESPACE, exported_at: new Date().toISOString(), mode: 'local_demo', entries };
}

/** Delete every namespaced entry. Returns the number removed. */
export function clearAllStored(storage?: Storage | null): number {
  const s = resolveStorage(storage);
  if (!s) return 0;
  const keys = listStoredKeys(s);
  for (const { key } of keys) s.removeItem(namespacedKey(key));
  return keys.length;
}

/** Options for `useStoredState`. */
export interface StoredStateOptions {
  /**
   * Coalesce writes: at most one localStorage write per `throttleMs` (the in-memory value updates
   * immediately). The pending value is flushed on unmount and when the page is hidden. Use it for
   * state that changes on a timer (the dial session ticks every 100 ms).
   */
  throttleMs?: number;
}

/**
 * Client-only stored state. Renders `initial` on the server and first client paint, then
 * hydrates from storage after mount (avoids SSR mismatch). `hydrated` tells the caller when
 * the value is trustworthy. `setValue` validates and persists; `reset` restores `initial`
 * in memory only (use after `clearAllStored`). Pass a stable `initial` (module constant).
 */
export function useStoredState<T>(
  key: string,
  schema: ZodType<T>,
  initial: T,
  options: StoredStateOptions = {},
): [value: T, setValue: (next: T | ((prev: T) => T)) => void, hydrated: boolean, reset: () => void] {
  const [value, setValueState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const throttleMs = options.throttleMs ?? 0;
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Hydrate after mount only; the initial render must match the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount hydration from localStorage
    setValueState(readStored(key, schema, initial));
    setHydrated(true);
    // `initial` is intentionally excluded: it only seeds the pre-hydration render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, schema]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    if (p) {
      pending.current = null;
      writeStored(key, schema, p.value);
    }
  }, [key, schema]);

  // Flush coalesced writes when the page hides or the component unmounts.
  useEffect(() => {
    if (throttleMs <= 0) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush, throttleMs]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (throttleMs <= 0) {
          writeStored(key, schema, resolved);
        } else {
          pending.current = { value: resolved };
          if (!timer.current) {
            timer.current = setTimeout(() => {
              timer.current = null;
              const p = pending.current;
              pending.current = null;
              if (p) writeStored(key, schema, p.value);
            }, throttleMs);
          }
        }
        return resolved;
      });
    },
    [key, schema, throttleMs],
  );

  /** Reset in-memory state to `initial` WITHOUT writing to storage (e.g. after clearAllStored). */
  const reset = useCallback(() => setValueState(initial), [initial]);

  return [value, setValue, hydrated, reset];
}

/** Read-modify-write outside React (e.g. merging a session's suppressions into the durable list). */
export function updateStored<T>(key: string, schema: ZodType<T>, fallback: T, update: (prev: T) => T, storage?: Storage | null): T {
  const next = update(readStored(key, schema, fallback, storage));
  writeStored(key, schema, next, storage);
  return next;
}
