import type { ReactNode } from 'react';
import { Badge } from './Badge';
import styles from './ui.module.css';

export interface EmptyStateProps {
  title: string;
  /** What exactly will be here and what it will do. */
  children: ReactNode;
  /** Which increment builds it, e.g. "Increment 1". */
  increment?: string;
  /** Which module agent owns it, e.g. "M-interview". */
  owner?: string;
  /** Optional actions (buttons/links). */
  actions?: ReactNode;
}

/** Honest placeholder: says what will be built, by which increment, and who owns it. */
export function EmptyState({ title, children, increment, owner, actions }: EmptyStateProps) {
  return (
    <div className={styles.empty} data-empty-state>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <div className={styles.emptyBody}>{children}</div>
      {increment || owner ? (
        <div className={styles.emptyMeta}>
          {increment ? <Badge variant="info">Planned: {increment}</Badge> : null}
          {owner ? <Badge variant="neutral">Owner: {owner}</Badge> : null}
          <Badge variant="warning">Not built yet</Badge>
        </div>
      ) : null}
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
