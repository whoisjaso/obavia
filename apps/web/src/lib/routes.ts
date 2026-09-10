/** Primary navigation, in display order. Shared by the sidebar and the E2E smoke test. */
export interface AppRoute {
  href: string;
  label: string;
}

export const APP_ROUTES: readonly AppRoute[] = [
  { href: '/today', label: 'Today' },
  { href: '/onboarding/identity', label: 'Identity interview' },
  { href: '/profile', label: 'Profile' },
  { href: '/offers', label: 'Offers' },
  { href: '/sources', label: 'Sources' },
  { href: '/scripts', label: 'Scripts' },
  { href: '/practice', label: 'Practice' },
  { href: '/prospects', label: 'Prospects' },
  { href: '/call-room', label: 'Call Room' },
  { href: '/calls', label: 'Calls' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/insights', label: 'Insights' },
  { href: '/settings', label: 'Settings' },
] as const;

export const DEMO_MODE_LABEL = 'Local demo mode · synthetic data · stored in this browser · cannot dial';
