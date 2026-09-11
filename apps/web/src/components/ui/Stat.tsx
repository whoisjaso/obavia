import { Icon, type IconName } from './Icon';
import styles from './Stat.module.css';

export interface StatProps {
  /** The big number (or a short numeric string like "02:14"). */
  value: number | string;
  icon: IconName;
  /** Accessible name for the whole stat ("Dials"). Required: the icon is the only visible label. */
  name: string;
  /** Optional one-word visible label. Never a sentence. */
  label?: string;
  /** Ink for the number (defaults to `--ink`). */
  color?: string;
  size?: 'md' | 'lg';
}

/** Big number over a small icon. The accessible name reads "Dials: 12". */
export function Stat({ value, icon, name, label, color, size = 'md' }: StatProps) {
  return (
    <div className={[styles.stat, size === 'lg' ? styles.lg : ''].join(' ').trim()} role="group" aria-label={`${name}: ${value}`} data-stat={name.toLowerCase()}>
      <span className={styles.value} style={color ? { color } : undefined} aria-hidden="true">
        {value}
      </span>
      <span className={styles.meta} aria-hidden="true">
        <Icon name={icon} size={16} weight="bold" />
        {label ? <span className={styles.label}>{label}</span> : null}
      </span>
    </div>
  );
}
