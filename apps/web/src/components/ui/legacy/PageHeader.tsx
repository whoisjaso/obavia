import type { ReactNode } from 'react';
import styles from './legacy.module.css';

export interface PageHeaderProps {
  /** The page's h1. Exactly one per route — visually hidden (DESIGN_SYSTEM §2: no page titles you read). */
  title: string;
  /** One-sentence purpose. Kept for assistive technology only; never painted on the stage. */
  purpose: string;
  /** Optional glyph pills rendered at the top of the column (e.g. `✦ Fictional`). */
  aside?: ReactNode;
}

/**
 * v1 compatibility. Every route still renders one PageHeader for its single `<h1>`; on the v2
 * stage the heading and purpose are screen-reader only, so the screen keeps one hero and ≤3-word
 * labels. Phase-2 screens may keep using it purely for the hidden h1.
 */
export function PageHeader({ title, purpose, aside }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader} data-page-header>
      <h1 className="sr-only">{title}</h1>
      <p className="sr-only">{purpose}</p>
      {aside ? <div>{aside}</div> : null}
    </header>
  );
}
