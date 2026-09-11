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
  /** 0–1 remaining for `arming`/`cooldown` (drives the ring overlay). */
  progress?: number;
  /** Large caption inside the ring during arming (3 → 2 → 1). */
  count?: number | string;
  /** One-word caption under the button ("Dialing", "Ringing"). */
  caption?: string;
  /** Override the glyph. */
  icon?: IconName;
  /** Small button rendered beside the hero (e.g. ✕ end session during cooldown). */
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

/**
 * The one hero: a 200px (160px < 480px) circle. Green with a breathing halo when idle; arming shows
 * a conic countdown ring (ink, 6px) draining 3 → 0 around the number; dialing sends a pulse ring
 * outward every 900ms; ringing shows two staggered halos; active turns red with the phone-off
 * glyph; cooldown shows a 5-second ring with ⏸ at its center; paused shows ▶. Under reduced motion
 * every animation collapses to opacity steps. `aria-live` on the caption announces state words;
 * the button's `aria-label` carries the whole state.
 */
export function HeroButton({ state, label, progress = 0, count, caption, icon, aside, className, type = 'button', disabled, ...rest }: HeroButtonProps) {
  const ringState = state === 'arming' || state === 'cooldown';
  const ringColor = state === 'cooldown' ? 'var(--ink-2)' : 'var(--ink)';
  return (
    <div className={[styles.wrap, className ?? ''].join(' ').trim()} data-hero-state={state}>
      <div className={styles.stage}>
        <span className={styles.halo} aria-hidden="true" />
        {state === 'dialing' ? <span className={styles.pulse} aria-hidden="true" data-hero-pulse /> : null}
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
          {ringState ? (
            <Ring overlay value={progress} stroke={6} color={ringColor} track="rgba(0,0,0,0.18)" variant="countdown" size={200} transitionMs={110} />
          ) : null}
          <span className={styles.glyph} aria-hidden="true">
            {state === 'arming' && count !== undefined ? <span className={styles.count}>{count}</span> : <Icon name={icon ?? ICON[state]} size={72} strokeWidth={1.5} />}
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
