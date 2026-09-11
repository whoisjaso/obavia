'use client';

import { useEffect } from 'react';

/** Routes that are always immersive (no tab bar): one task per screen, an explicit exit control. */
export const IMMERSIVE_ROUTES: readonly string[] = ['/onboarding/identity'];

export function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Immersive mode = the screen owns the whole viewport: the tab bar hides and the stage drops its
 * bottom padding (DESIGN_SYSTEM §3.2 — an iOS call has no tab bar). State-driven screens (in-call)
 * set it while active; the attribute lives on <html> so the fixed TabBar can read it from CSS.
 */
export function useImmersive(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.setAttribute('data-immersive', 'true');
    return () => {
      root.removeAttribute('data-immersive');
    };
  }, [active]);
}
