import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SideNav } from '@/components/shell/SideNav';
import { DEMO_MODE_LABEL } from '@/lib/routes';
import '@/styles/globals.css';
import styles from '@/components/shell/shell.module.css';

export const metadata: Metadata = {
  title: { default: 'Apohenia Sales OS', template: '%s · Apohenia Sales OS' },
  description: 'Private sales training operating system. Local demo mode: synthetic data only, cannot dial.',
};

/**
 * App shell: skip link → header (brand + persistent demo-mode badge) → sidebar nav → main.
 * Server component; only SideNav is a client component (it needs the pathname).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className={styles.frame}>
          <header className={styles.header}>
            <Link href="/today" className={styles.brand}>
              Apohenia Sales OS
            </Link>
            <span className={styles.demoBadge} role="status" data-demo-mode-badge>
              <span className={styles.demoBadgeIcon} aria-hidden="true">
                !
              </span>
              {DEMO_MODE_LABEL}
            </span>
          </header>
          <SideNav />
          <main id="main" tabIndex={-1} className={styles.main}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
