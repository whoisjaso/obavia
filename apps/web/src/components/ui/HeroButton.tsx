'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Ring } from './Ring';
import styles from './HeroButton.module.css';

export type HeroState = 'idle' | 'arming' | 'dialing' | 'ringing' | 'active' | 'cooldown' | 'paused' | 'off';

export interface HeroButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  state: HeroState;
  /** Full accessible name carrying the state ("Start session: dial Riverbend Motors"). */
  label: string;
  /** 0 to 1 remaining for `arming` / `cooldown` / `paused` (drives the ring overlay and the numeral). */
  progress?: number;
  /** Large numeral inside the ring (3, 2, 1 while arming; seconds left while cooling down). Derived from `progress` when omitted. */
  count?: number | string;
  /** Whole seconds the countdown spans, used to derive the numeral when `count` is omitted (cooldown = 5). */
  seconds?: number;
  /** One-word caption under the button ("Dialing", "Ringing"). */
  caption?: string;
  /** Override the icon. */
  icon?: IconName;
  /** Small button rendered beside the hero (e.g. end session during cooldown). */
  aside?: ReactNode;
}

const ICON: Record<HeroState, IconName> = {
  idle: 'phone',
  arming: 'phone',
  dialing: 'phone',
  ringing: 'phone',
  active: 'phone-off',
  cooldown: 'pause',
  paused: 'play',
  off: 'phone',
};

const COUNTDOWN_STATES: ReadonlySet<HeroState> = new Set<HeroState>(['arming', 'cooldown', 'paused']);

/**
 * The one hero: a 200px (160px under 480px) disc that sits on layered translucent rings and a soft
 * radial wash, lifted by an offset shadow (never a colored halo). Idle breathes slowly. Arming shows
 * a large numeral inside a conic ring that visibly sweeps down 3, 2, 1. Dialing sends rings outward
 * and the disc pulses; ringing adds a handset wiggle. Active turns red with the hang-up handset.
 * Cooldown is the same ring draining over 5 s around a visible seconds numeral with a pause mark
 * under it; paused freezes the ring and shows play. Under reduced motion every animation collapses
 * to a static state. `aria-live` on the caption announces state words; the button's `aria-label`
 * carries the whole state.
 */
export function HeroButton({ state, label, progress = 0, count, seconds, caption, icon, aside, className, type = 'button', disabled, ...rest }: HeroButtonProps) {
  const ringState = COUNTDOWN_STATES.has(state);
  const remaining = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const span = seconds ?? (state === 'arming' ? 3 : 5);
  // A numeral only when it is real: the screen's `count`, or seconds derived from a live remainder.
  const numeral = count ?? (remaining > 0 && (state === 'cooldown' || state === 'paused') ? Math.max(1, Math.ceil(remaining * span)) : undefined);
  const ringColor = state === 'arming' ? 'var(--ink-on-green)' : state === 'paused' ? 'var(--ink-3)' : 'var(--green)';
  const ringTrack = state === 'arming' ? 'rgba(6, 43, 18, 0.22)' : 'var(--line-strong)';

  let center: ReactNode;
  if (state === 'arming' && numeral !== undefined) {
    center = (
      <span className={styles.count} data-hero-count>
        {numeral}
      </span>
    );
  } else if (state === 'cooldown' && numeral !== undefined) {
    center = (
      <span className={styles.stack}>
        <span className={[styles.count, styles.countSmall].join(' ')} data-hero-count>
          {numeral}
        </span>
        <Icon name={icon ?? 'pause'} size={22} weight="fill" className={styles.subIcon} />
      </span>
    );
  } else if (state === 'paused') {
    center = (
      <span className={styles.stack}>
        <Icon name={icon ?? 'play'} size={56} weight="fill" />
        {numeral !== undefined ? (
          <span className={styles.countMicro} data-hero-count>
            {numeral}
          </span>
        ) : null}
      </span>
    );
  } else {
    center = <Icon name={icon ?? ICON[state]} size={72} weight="fill" />;
  }

  return (
    <div className={[styles.wrap, className ?? ''].join(' ').trim()} data-hero-state={state}>
      <div className={styles.stage}>
        <span className={styles.wash} aria-hidden="true" />
        <span className={[styles.orbit, styles.orbit3].join(' ')} aria-hidden="true" />
        <span className={[styles.orbit, styles.orbit2].join(' ')} aria-hidden="true" />
        <span className={[styles.orbit, styles.orbit1].join(' ')} aria-hidden="true" />
        {state === 'dialing' ? (
          <>
            <span className={styles.pulse} aria-hidden="true" data-hero-pulse />
            <span className={[styles.pulse, styles.pulse2].join(' ')} aria-hidden="true" data-hero-pulse />
          </>
        ) : null}
        {state === 'ringing' ? (
          <>
            <span className={[styles.pulse, styles.ringHalo].join(' ')} aria-hidden="true" data-hero-halo="1" />
            <span className={[styles.pulse, styles.ringHalo, styles.ringHalo2].join(' ')} aria-hidden="true" data-hero-halo="2" />
          </>
        ) : null}
        <button
          type={type}
          className={styles.hero}
          aria-label={label}
          aria-pressed={state === 'arming' ? true : undefined}
          disabled={disabled || state === 'off'}
          data-hero
          {...rest}
        >
          {ringState ? <Ring overlay value={remaining} stroke={8} color={ringColor} track={ringTrack} variant="countdown" size={200} transitionMs={110} /> : null}
          <span className={styles.glyph} aria-hidden="true">
            {center}
          </span>
        </button>
        {aside ? <div className={styles.aside}>{aside}</div> : null}
      </div>
      <div className={styles.caption} aria-live="polite" aria-atomic="true" data-hero-caption>
        {caption ?? ''}
      </div>
    </div>
  );
}
