import type { ReactNode } from 'react';
import { Badge } from './Badge';
import styles from './legacy.module.css';

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
  /** Single glyph shown above the title (defaults to ∅). */
  glyph?: string;
}

/**
 * v1 compatibility. Honest placeholder: one glyph, a short title, the explanation, one action.
 * Phase-2 screens replace prose boxes with `∅` + two words + one Tile.
 */
export function EmptyState({ title, children, increment, owner, actions, glyph = '∅' }: EmptyStateProps) {
  return (
    <div className={styles.empty} data-empty-state>
      <span className={styles.emptyGlyph} aria-hidden="true">
        {glyph}
      </span>
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
