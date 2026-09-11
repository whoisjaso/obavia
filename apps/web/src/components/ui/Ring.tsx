import type { CSSProperties, ReactNode } from 'react';
import styles from './Ring.module.css';

export type RingVariant = 'progress' | 'countdown';

export interface RingProps {
  /** 0–1. For `progress` this is the filled fraction; for `countdown` the REMAINING fraction. */
  value: number;
  size?: number;
  /** Stroke width in px (3–12). */
  stroke?: number;
  color?: string;
  /** Track color (defaults to a faint line). */
  track?: string;
  variant?: RingVariant;
  /** Center slot (a number, an icon). */
  children?: ReactNode;
  /** Accessible name; when given the ring is exposed as a progress meter with `aria-valuenow`. */
  label?: string;
  /** Absolutely fill the parent (used as the HeroButton countdown overlay). */
  overlay?: boolean;
  /** Smooth the stroke between ticks (ms). 0 = none. */
  transitionMs?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * SVG ring. `progress` fills clockwise from 12 o'clock; `countdown` drains clockwise so the
 * remaining arc shrinks like a conic timer. Never a progress bar with a caption.
 */
export function Ring({ value, size = 56, stroke = 6, color = 'var(--green)', track = 'var(--line-strong)', variant = 'progress', children, label, overlay, transitionMs = 0, className, style }: RingProps) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v);
  const cls = [styles.ring, overlay ? styles.overlay : '', className ?? ''].join(' ').trim();
  return (
    <span
      className={cls}
      style={{ width: size, height: size, ...style }}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(v * 100) : undefined}
      data-ring={variant}
      data-ring-value={v.toFixed(2)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ width: '100%', height: '100%' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap={variant === 'countdown' ? 'butt' : 'round'}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={transitionMs > 0 ? { transition: `stroke-dashoffset ${transitionMs}ms linear` } : undefined}
        />
      </svg>
      {children ? <span className={styles.center}>{children}</span> : null}
    </span>
  );
}
