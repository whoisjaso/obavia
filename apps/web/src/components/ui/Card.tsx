'use client';

import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  children: ReactNode;
  /** Tap affordance: renders the card as a button with a chevron. */
  onPress?: () => void;
  /** Tap affordance: renders the card as a link with a chevron. */
  href?: string;
  /** Accessible name for a pressable card. */
  name?: string;
  /** Raised variant (`--bg-2`). */
  raised?: boolean;
  /** Tinted border/glow for THEIR WORDS (gold), THEIR REFERENCES (purple), suggestions (purple), attention (orange). */
  tone?: 'neutral' | 'gold' | 'purple' | 'orange' | 'green' | 'red';
  /** Tighter padding (12px) for list rows. */
  dense?: boolean;
  /** v1 compatibility: optional heading rendered inside the card as h2/h3. */
  title?: string;
  /** v1 compatibility: heading level for `title`. */
  headingLevel?: 'h2' | 'h3';
}

/**
 * `--bg-1` surface, `--r-card` corners, 20px padding. With `onPress`/`href` it becomes a real
 * button/link with a trailing chevron. Depth comes from the surface step and a 1px line, never
 * from shadows.
 */
export function Card({ children, onPress, href, name, raised, tone = 'neutral', dense, title, headingLevel = 'h2', className, ...rest }: CardProps) {
  const Heading = headingLevel;
  const cls = [styles.card, raised ? styles.raised : '', styles[tone], dense ? styles.dense : '', className ?? ''].join(' ').trim();
  const body = (
    <>
      {title ? <Heading className={styles.title}>{title}</Heading> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={[cls, styles.pressable].join(' ')} aria-label={name} data-card {...(rest as HTMLAttributes<HTMLAnchorElement>)}>
        <div className={styles.body}>{body}</div>
        <Icon name="chevron" size={20} className={styles.chevron} />
      </Link>
    );
  }
  if (onPress) {
    return (
      <button type="button" className={[cls, styles.pressable].join(' ')} onClick={onPress} aria-label={name} data-card {...(rest as HTMLAttributes<HTMLButtonElement>)}>
        <div className={styles.body}>{body}</div>
        <Icon name="chevron" size={20} className={styles.chevron} />
      </button>
    );
  }
  if (title) {
    return (
      <section className={cls} data-card {...rest}>
        {body}
      </section>
    );
  }
  return (
    <div className={cls} data-card {...rest}>
      {body}
    </div>
  );
}
