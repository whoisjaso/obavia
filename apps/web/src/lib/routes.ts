import type { IconName } from '@/components/ui/icons';

/** One of the four bottom tabs (DESIGN_SYSTEM §2 TabBar). */
export interface TabRoute {
  id: 'dial' | 'train' | 'script' | 'me';
  href: string;
  /** One word. */
  label: string;
  icon: IconName;
  /** Path prefixes that light this tab up (secondary screens reached from it). */
  owns: readonly string[];
}

export const TABS: readonly TabRoute[] = [
  { id: 'dial', href: '/', label: 'Dial', icon: 'phone', owns: ['/prospects', '/calls', '/pipeline', '/call-room'] },
  { id: 'train', href: '/practice', label: 'Train', icon: 'target', owns: ['/practice'] },
  { id: 'script', href: '/scripts', label: 'Script', icon: 'script', owns: ['/scripts', '/sources', '/offers'] },
  { id: 'me', href: '/today', label: 'Me', icon: 'person', owns: ['/today', '/onboarding', '/profile', '/insights', '/settings'] },
] as const;

/** True when `pathname` belongs to the tab. Dial owns only `/` itself plus its secondary screens. */
export function isTabActive(tab: TabRoute, pathname: string): boolean {
  if (pathname === tab.href) return true;
  return tab.owns.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Every route the shell renders (for the smoke test), with the visually hidden h1 text it carries. */
export interface AppRoute {
  href: string;
  /** Text of the route's single h1 (visually hidden on the stage). */
  h1: string;
}

export const APP_ROUTES: readonly AppRoute[] = [
  { href: '/', h1: 'Dial' },
  { href: '/practice', h1: 'Practice' },
  { href: '/scripts', h1: 'Scripts' },
  { href: '/today', h1: 'Today' },
  { href: '/onboarding/identity', h1: 'Identity interview' },
  { href: '/profile', h1: 'Profile' },
  { href: '/offers', h1: 'Offers' },
  { href: '/sources', h1: 'Sources' },
  { href: '/prospects', h1: 'Prospects' },
  { href: '/calls', h1: 'Calls' },
  { href: '/pipeline', h1: 'Pipeline' },
  { href: '/insights', h1: 'Insights' },
  { href: '/settings', h1: 'Settings' },
] as const;

/** The whole truth behind the `◐ Demo` glyph pill. */
export const DEMO_PILL_NAME = 'Demo mode: synthetic prospects, no real calls are placed';

/** @deprecated v1 name; the pill's accessible name is `DEMO_PILL_NAME`. */
export const DEMO_MODE_LABEL = DEMO_PILL_NAME;
