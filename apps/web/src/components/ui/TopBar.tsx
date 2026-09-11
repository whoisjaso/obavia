import type { ReactNode } from 'react';
import { DemoPill } from './Pill';
import styles from './TopBar.module.css';

export interface TopBarProps {
  /** Extra glyph pills after the demo pill (e.g. `✦ Fictional`). */
  left?: ReactNode;
  /** One word, optional. Rendered as plain text (the route's h1 is elsewhere, visually hidden). */
  title?: string;
  /** Center slot alternative to `title` (e.g. the session timer). */
  center?: ReactNode;
  /** At most two `IconButton`s. */
  right?: ReactNode;
  /** Render the `◐ Demo` pill in the left slot (default true — it is always visible without real telephony). */
  demo?: boolean;
}

/**
 * 44px translucent row at the top of a screen: left glyph pill(s), one-word center, ≤2 icon
 * buttons right. Marked `data-topbar` so the shell's fallback demo pill hides itself.
 */
export function TopBar({ left, title, center, right, demo = true }: TopBarProps) {
  return (
    <div className={styles.bar} data-topbar>
      <div className={styles.left}>
        {demo ? <DemoPill /> : null}
        {left}
      </div>
      <div className={styles.center}>{center ?? (title ? <span className={styles.title}>{title}</span> : null)}</div>
      <div className={styles.right}>{right}</div>
    </div>
  );
}
