'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_ROUTES } from '@/lib/routes';
import styles from './shell.module.css';

/** Left sidebar navigation. Active route is marked with `aria-current="page"` plus a border and weight — not color alone. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className={styles.sidebar}>
      <ul className={styles.navList}>
        {APP_ROUTES.map((route) => {
          const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
          return (
            <li key={route.href}>
              <Link href={route.href} className={styles.navLink} aria-current={active ? 'page' : undefined}>
                {route.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
