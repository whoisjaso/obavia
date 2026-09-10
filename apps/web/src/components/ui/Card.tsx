import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Optional heading rendered as an h2 inside the card. */
  title?: string;
  /** Heading level for `title` (defaults to h2). */
  headingLevel?: 'h2' | 'h3';
  children: ReactNode;
}

/** Bordered surface for grouping related content. Renders as `<section>` when it has a title. */
export function Card({ title, headingLevel = 'h2', children, className, ...rest }: CardProps) {
  const Heading = headingLevel;
  const cls = [styles.card, className ?? ''].join(' ').trim();
  if (title) {
    return (
      <section className={cls} {...rest}>
        <Heading className={styles.cardTitle}>{title}</Heading>
        {children}
      </section>
    );
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
