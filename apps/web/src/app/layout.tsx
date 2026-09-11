import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { DemoPill, Stage, TabBar } from '@/components/ui';
import '@/styles/globals.css';
import styles from './shell.module.css';

/** One shipped face so every viewer (and every CI screenshot) renders the same stack; `--font-sans` feeds tokens.css. */
const inter = Inter({ subsets: ['latin'], weight: ['500', '600', '700', '800'], display: 'swap', variable: '--font-sans', fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'] });

export const metadata: Metadata = {
  title: { default: 'Apohenia', template: '%s · Apohenia' },
  description: 'Apohenia Sales OS — demo mode: synthetic prospects, no real calls are placed.',
  applicationName: 'Apohenia',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Apohenia' },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * App shell v2: skip link → dark Stage (`<main>`) → fixed glass TabBar. No sidebar, no header
 * bar, no sentences. Each screen renders its own TopBar with the `◐ Demo` pill; until a screen does,
 * the shell's fallback pill (top-left, hidden by CSS once a `[data-topbar]` exists) keeps the honesty
 * glyph on every route.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className={styles.shell} data-app-shell>
          <div className={styles.fallbackPill} data-fallback-pill>
            <DemoPill />
          </div>
          <Stage as="main" id="main" tabIndex={-1}>
            {children}
          </Stage>
        </div>
        <TabBar />
      </body>
    </html>
  );
}
