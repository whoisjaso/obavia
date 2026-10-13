/* Where the app keeps small strings. The buyer's id and token (`obavia.buyer`) are a credential: on a phone
   they live in the Keychain or the Android Keystore through expo-secure-store; on the web, in localStorage,
   which is all a browser has. Everything else sits in localStorage where there is one.

   Before secure storage, a build that had a localStorage kept the session there. The first read on a phone
   moves that value into secure storage and removes the old copy, so it happens once. If the secure write
   fails, the old copy stays where it is and is still returned: a buyer is never signed out by a migration. */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Keys that hold a credential. */
export const SECRET_KEYS: ReadonlySet<string> = new Set(['obavia.buyer']);

const SECURE_OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

const local = (): Storage | undefined => {
  try { return (globalThis as { localStorage?: Storage }).localStorage; } catch { return undefined; }
};
const native = () => Platform.OS === 'ios' || Platform.OS === 'android';

export const kv = {
  get(k: string): string | null {
    if (native() && SECRET_KEYS.has(k)) {
      try {
        const v = SecureStore.getItem(k, SECURE_OPTS);
        if (v != null) return v;
      } catch { /* the Keychain refused: fall through to the old copy, if any */ }
      const old = (() => { try { return local()?.getItem(k) ?? null; } catch { return null; } })();
      if (old == null) return null;
      try { SecureStore.setItem(k, old, SECURE_OPTS); local()?.removeItem(k); } catch { /* kept where it was */ }
      return old;
    }
    try { return local()?.getItem(k) ?? null; } catch { return null; }
  },
  set(k: string, v: string) {
    if (native() && SECRET_KEYS.has(k)) {
      try { SecureStore.setItem(k, v, SECURE_OPTS); return; } catch { return; }   // a credential never falls back to plain storage
    }
    try { local()?.setItem(k, v); } catch { /* nowhere to keep it */ }
  },
  /** Forget a plain value (never a credential: those are cleared by the sign-in path, not here). */
  remove(k: string) {
    if (SECRET_KEYS.has(k)) return;
    try { local()?.removeItem(k); } catch { /* nothing to forget */ }
  },
};
