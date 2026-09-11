import type { ReactNode } from 'react';
import { DemoPill } from './Pill';
import styles from './TopBar.module.css';

export interface TopBarProps {
  /** Extra glyph pills after the demo pill (e.g. `✦ Fictional`). */
  left?: ReactNode;
  /** One word, optional. Rendered as plain text (the route's h1 is elsewhere, visually hidden). */
  title?: string;
  /** Center slot alternative to `title` (e.g. the session timer at `--fs-title`). */
  center?: ReactNode;
  /** At most two `IconButton`s. */
  right?: ReactNode;
  /** Render the `◐ Demo` pill in the left slot (default true — it is always visible without real telephony). */
  demo?: boolean;
}

/**
 * Fixed, full-width glass row (44px + safe area) with its content centered in the `--col` column —
 * the same chrome as the tab bar. Its height never changes with state. A spacer keeps the stage
 * layout below it. Marked `data-topbar` so the shell's fallback demo pill hides itself.
 */
export function TopBar({ left, title, center, right, demo = true }: TopBarProps) {
  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <div className={styles.bar} data-topbar>
        <div className={styles.inner}>
          <div className={styles.left}>
            {demo ? <DemoPill /> : null}
            {left}
          </div>
          <div className={styles.center}>{center ?? (title ? <span className={styles.title}>{title}</span> : null)}</div>
          <div className={styles.right}>{right}</div>
        </div>
      </div>
    </>
  );
}
