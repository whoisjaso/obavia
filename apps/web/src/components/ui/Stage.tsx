import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Stage.module.css';

export interface StageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Render as a `<main>` landmark (the app shell does this once). */
  as?: 'main' | 'div';
}

/**
 * Full-height dark stage with one centered phone-width column (`--col`, 520px) on any device and
 * bottom padding for the tab bar. A screen that needs the two-column in-call layout puts
 * `data-stage-wide` on its root; the column widens to `--col + --rail` at ≥1024px.
 */
export function Stage({ children, as: Tag = 'div', className, ...rest }: StageProps) {
  return (
    <Tag className={[styles.stage, className ?? ''].join(' ').trim()} data-stage {...rest}>
      <div className={styles.col}>{children}</div>
    </Tag>
  );
}
