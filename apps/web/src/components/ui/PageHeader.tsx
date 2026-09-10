import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface PageHeaderProps {
  /** The page's h1. Exactly one per page. */
  title: string;
  /** One-sentence purpose, taken from the brief. */
  purpose: string;
  /** Optional actions or badges rendered to the right of the title. */
  aside?: ReactNode;
}

/** Standard page header: h1 + one-sentence purpose. Every route renders one. */
export function PageHeader({ title, purpose, aside }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderRow}>
        <h1>{title}</h1>
        {aside ? <div>{aside}</div> : null}
      </div>
      <p className={styles.pagePurpose}>{purpose}</p>
    </header>
  );
}
