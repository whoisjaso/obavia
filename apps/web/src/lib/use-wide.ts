'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1024px)';

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** True at ≥1024px (the two-column in-call layout). False on the server and during hydration. */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
