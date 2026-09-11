'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Glyph, Icon, type IconName } from './Icon';
import styles from './Chip.module.css';

export type ChipTone = 'neutral' | 'blue' | 'teal' | 'purple' | 'gold' | 'green' | 'red';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** At most 3 words. */
  label: string;
  /** Leading mark: a status character or icon name (drawn as an icon from the set) or a small element. Decorative. */
  glyph?: ReactNode;
  /** Leading icon from the set (wins over `glyph`). */
  icon?: IconName;
  /** Selected state: blue ring, blue tint and a check mark. Sets `aria-pressed` when `toggle` is true. */
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

/** 44px pill button for branches and filters. Selected = blue ring + check; static chips are plain spans. */
export function Chip({ label, glyph, icon, selected, toggle, tone = 'neutral', name, static: isStatic, kbd, className, type = 'button', ...rest }: ChipProps) {
  const cls = [styles.chip, styles[tone], selected ? styles.selected : '', className ?? ''].join(' ').trim();
  const lead = icon ? <Icon name={icon} size={16} weight="bold" /> : typeof glyph === 'string' ? <Glyph glyph={glyph} size={14} /> : glyph;
  const inner = (
    <>
      {selected ? (
        <span className={styles.check} aria-hidden="true">
          <Icon name="check" size={14} weight="bold" />
        </span>
      ) : lead ? (
        <span className={styles.glyph} aria-hidden="true">
          {lead}
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
    <button type={type} className={cls} aria-label={name} aria-pressed={toggle ? Boolean(selected) : undefined} data-chip={label} data-selected={selected ? 'true' : undefined} {...rest}>
      {inner}
    </button>
  );
}
