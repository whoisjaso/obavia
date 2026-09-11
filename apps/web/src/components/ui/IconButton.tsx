'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Icon, type IconName, type IconWeight } from './Icon';
import styles from './IconButton.module.css';

export type IconButtonTone = 'neutral' | 'green' | 'red' | 'blue';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Full accessible name (required: icon buttons have no visible text). */
  label: string;
  /** Renders a Next `<Link>` instead of a button. */
  href?: string;
  /** Hit-area size in px (icon is ~55% of it). Minimum 44 for touch. */
  size?: 44 | 56 | 72;
  tone?: IconButtonTone;
  /** Filled circle (solid tone) instead of a quiet glass circle. */
  solid?: boolean;
  /** Icon weight (solid buttons default to `fill`, quiet ones to `regular`). */
  weight?: IconWeight;
}

/**
 * Round icon-only control with a full accessible name. Used in TopBars (≤2 per bar), sheet
 * headers, and the in-call End control (`tone="red" solid size={72}`).
 */
export function IconButton({ icon, label, href, size = 44, tone = 'neutral', solid = false, weight, className, type = 'button', ...rest }: IconButtonProps) {
  const cls = [styles.button, styles[tone], solid ? styles.solid : '', className ?? ''].join(' ').trim();
  const style = { width: size, height: size } as const;
  const iconSize = size === 72 ? 32 : size === 56 ? 28 : 20;
  const iconWeight: IconWeight = weight ?? (solid ? 'fill' : 'regular');
  if (href) {
    return (
      <Link href={href} className={cls} style={style} aria-label={label} title={label} data-icon-button={icon} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        <Icon name={icon} size={iconSize} weight={iconWeight} />
      </Link>
    );
  }
  return (
    <button type={type} className={cls} style={style} aria-label={label} title={label} data-icon-button={icon} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
