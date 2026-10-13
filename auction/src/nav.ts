/* The intent bus. A push (or anything else outside the screens) says where
   the buyer should land; the screen that owns that place reads the intent,
   acts once, and clears it. No navigation library. */
import { useSyncExternalStore } from 'react';

export type Screen = 'lane' | 'won' | 'pickup' | 'me' | 'offer' | 'clause';
export type Intent = { screen: Screen; lotId?: string };

/** `offer`: the second-chance page (screens/won/Offer.tsx), where the "Second chance" push lands with its lot.
    `clause`: the clause page (screens/Clause.tsx) on its own over the lane, for a 409 clause_required met outside the
    Bid sheet or a push that says the words changed; it takes no lot. */
export const SCREENS: readonly Screen[] = ['lane', 'won', 'pickup', 'me', 'offer', 'clause'];
export const isScreen = (v: unknown): v is Screen => typeof v === 'string' && (SCREENS as readonly string[]).includes(v);

let current: Intent | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function go(i: Intent) {
  if (!isScreen(i.screen)) return;
  current = i.lotId ? { screen: i.screen, lotId: i.lotId } : { screen: i.screen };
  emit();
}

export function clearIntent() {
  if (current === null) return;
  current = null;
  emit();
}

/** The store functions, for consumers outside React and for tests. */
export const peekIntent = (): Intent | null => current;
export function subscribeIntent(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useIntent(): Intent | null {
  return useSyncExternalStore(subscribeIntent, peekIntent, peekIntent);
}
