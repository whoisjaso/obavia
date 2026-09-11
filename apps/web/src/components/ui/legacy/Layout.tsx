import type { CSSProperties, HTMLAttributes } from 'react';
import styles from './legacy.module.css';

type Gap = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Spacing-scale step between children (var(--space-N)). */
  gap?: Gap;
}

/** Vertical flex stack. */
export function Stack({ gap = 4, style, className, ...rest }: StackProps) {
  const s: CSSProperties = { gap: `var(--space-${gap})`, ...style };
  return <div className={[styles.stack, className ?? ''].join(' ').trim()} style={s} {...rest} />;
}

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  /** Horizontal distribution. */
  justify?: 'start' | 'between' | 'end';
}

/** Horizontal flex row that wraps. */
export function Inline({ gap = 2, justify = 'start', style, className, ...rest }: InlineProps) {
  const justifyContent = justify === 'between' ? 'space-between' : justify === 'end' ? 'flex-end' : 'flex-start';
  const s: CSSProperties = { gap: `var(--space-${gap})`, justifyContent, ...style };
  return <div className={[styles.inline, className ?? ''].join(' ').trim()} style={s} {...rest} />;
}
