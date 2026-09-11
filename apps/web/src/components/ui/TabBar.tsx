'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from './Icon';
import { TABS, isTabActive } from '@/lib/routes';
import { isImmersiveRoute } from '@/lib/immersive';
import styles from './TabBar.module.css';

/**
 * Fixed bottom glass band with a 1px top line: Dial, Train, Script, Me. Icon 26px + 11px label;
 * the active tab is the filled icon and a heavier label, inactive tabs the regular icon.
 * `aria-current="page"` on the active tab, safe-area padding. `<nav aria-label="Primary">`.
 * Hidden (CSS) while a screen is immersive: an in-call stage or the identity interview.
 */
export function TabBar() {
  const pathname = usePathname() ?? '/';
  const immersive = isImmersiveRoute(pathname);
  return (
    <nav aria-label="Primary" className={[styles.bar, immersive ? styles.hidden : ''].join(' ').trim()} data-tabbar data-immersive-route={immersive ? 'true' : undefined}>
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <li key={tab.href} className={styles.item}>
              <Link href={tab.href} className={styles.tab} aria-current={active ? 'page' : undefined} data-tab={tab.id}>
                <span className={styles.iconSlot} aria-hidden="true">
                  <Icon name={tab.icon} size={26} weight={active ? 'fill' : 'regular'} className={styles.icon} />
                </span>
                <span className={styles.label}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
