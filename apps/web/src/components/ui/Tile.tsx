'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Tile.module.css';

export type TileTone = 'neutral' | 'green' | 'red' | 'blue' | 'purple' | 'gold' | 'orange';

export interface TileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: IconName;
  /** ≤2 words, Title Case. */
  label: string;
  /** Full accessible name when the label alone is too terse. */
  name?: string;
  /** Selected = blue ring + check glyph; also sets `aria-pressed`. */
  selected?: boolean;
  tone?: TileTone;
  /** Renders as a link. */
  href?: string;
  /** Optional slot under the label (e.g. two small rings). */
  children?: ReactNode;
  /** Bigger icon and label (hero tile). */
  size?: 'md' | 'lg';
  /** Suggested (not selected): a thin blue ring + small ✦ glyph, distinct from focus and selection. */
  suggested?: boolean;
}

/**
 * Choice tile: 32px icon + ≤2-word label, `--r-tile`, `--bg-1`, pressed `--bg-3`. Grids of 2–3
 * columns. Every tile is a real `<button>` (or `<Link>` with `href`).
 */
export function Tile({ icon, label, name, selected, tone = 'neutral', href, children, size = 'md', suggested, className, type = 'button', ...rest }: TileProps) {
  const cls = [styles.tile, styles[tone], selected ? styles.selected : '', suggested && !selected ? styles.suggested : '', size === 'lg' ? styles.lg : '', className ?? ''].join(' ').trim();
  const inner = (
    <>
      {suggested && !selected ? (
        <span className={styles.spark} aria-hidden="true">
          ✦
        </span>
      ) : null}
      {selected ? (
        <span className={styles.check} aria-hidden="true">
          <Icon name="check" size={14} strokeWidth={2.5} />
        </span>
      ) : null}
      {icon ? <Icon name={icon} size={size === 'lg' ? 40 : 32} className={styles.icon} /> : null}
      <span className={styles.label}>{label}</span>
      {children ? <span className={styles.slot}>{children}</span> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={name} data-tile={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} aria-label={name} aria-pressed={selected === undefined ? undefined : selected} data-tile={label} {...rest}>
      {inner}
    </button>
  );
}

/** 2- or 3-column tile grid. */
export function TileGrid({ columns = 3, children, className }: { columns?: 2 | 3; children: ReactNode; className?: string }) {
  return (
    <div className={[styles.grid, columns === 2 ? styles.cols2 : styles.cols3, className ?? ''].join(' ').trim()} data-tile-grid>
      {children}
    </div>
  );
}
