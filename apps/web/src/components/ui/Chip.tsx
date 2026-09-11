'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipTone = 'neutral' | 'blue' | 'teal' | 'purple' | 'gold' | 'green' | 'red';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** ≤3 words. */
  label: string;
  /** Leading glyph or small element (decorative). */
  glyph?: ReactNode;
  /** Selected state (blue). Sets `aria-pressed` when `toggle` is true. */
  selected?: boolean;
  /** Treat as a toggle (`aria-pressed`) rather than an action. */
  toggle?: boolean;
  tone?: ChipTone;
  /** Full accessible name when the label is not self-explanatory. */
  name?: string;
  /** Static (non-interactive) chip, e.g. a stage tag on the LineCard. */
  static?: boolean;
  /** Small keycap hint shown at the end (e.g. "1"). */
  kbd?: string;
}

/** Pill button for branches and filters. Selected state is blue; static chips are plain spans. */
export function Chip({ label, glyph, selected, toggle, tone = 'neutral', name, static: isStatic, kbd, className, type = 'button', ...rest }: ChipProps) {
  const cls = [styles.chip, styles[tone], selected ? styles.selected : '', className ?? ''].join(' ').trim();
  const inner = (
    <>
      {glyph ? (
        <span className={styles.glyph} aria-hidden="true">
          {glyph}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
      {kbd ? (
        <kbd className={styles.kbd} aria-hidden="true">
          {kbd}
        </kbd>
      ) : null}
    </>
  );
  if (isStatic) {
    return (
      <span className={[cls, styles.static].join(' ')} aria-label={name} data-chip={label}>
        {inner}
      </span>
    );
  }
  return (
    <button type={type} className={cls} aria-label={name} aria-pressed={toggle ? Boolean(selected) : undefined} data-chip={label} {...rest}>
      {inner}
    </button>
  );
}
