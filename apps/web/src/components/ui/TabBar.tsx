'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { TABS, isTabActive } from '@/lib/routes';
import styles from './TabBar.module.css';

/**
 * Fixed bottom glass tab bar: Dial ☏ · Train ◎ · Script ≡ · Me ◯. Icon 26px + 11px label,
 * `aria-current="page"` on the active tab, safe-area padding. `<nav aria-label="Primary">`.
 */
export function TabBar() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Primary" className={styles.bar} data-tabbar>
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <li key={tab.href} className={styles.item}>
              <Link href={tab.href} className={styles.tab} aria-current={active ? 'page' : undefined} data-tab={tab.id}>
                <Icon name={tab.icon} size={26} className={styles.icon} />
                <span className={styles.label}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
