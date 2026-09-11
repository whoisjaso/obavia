import type { ReactNode } from 'react';
import styles from './legacy.module.css';

export type BadgeVariant = 'neutral' | 'info' | 'warning' | 'success';

export interface BadgeProps {
  variant?: BadgeVariant;
  /** Text label — required. Badges never communicate by color alone. */
  children: ReactNode;
  /** Optional title attribute for extra context. */
  title?: string;
}

const variantClass: Record<BadgeVariant, string | undefined> = {
  neutral: styles.badgeNeutral,
  info: styles.badgeInfo,
  warning: styles.badgeWarning,
  success: styles.badgeSuccess,
};

/** Text icon shown before the label so the state is readable without color. */
const variantIcon: Record<BadgeVariant, string | null> = {
  neutral: null,
  info: 'i',
  warning: '!',
  success: '✓',
};

/** Small status label. Each variant pairs a color with a text glyph and the label itself. */
export function Badge({ variant = 'neutral', children, title }: BadgeProps) {
  const icon = variantIcon[variant];
  return (
    <span className={[styles.badge, variantClass[variant]].join(' ')} title={title}>
      {icon ? (
        <span className={styles.badgeIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
