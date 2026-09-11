import type { HTMLAttributes } from 'react';
import { DEMO_PILL_NAME } from '@/lib/routes';
import styles from './Pill.module.css';

export type PillTone = 'neutral' | 'orange' | 'purple' | 'gold' | 'green' | 'red' | 'teal';

export interface GlyphPillProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** One glyph character (◐, ✦, —, ◔, ✓, ⊘). Decorative; `name` carries the truth. */
  glyph: string;
  /** ≤2 visible words. Omit for glyph-only pills. */
  label?: string;
  /** The FULL accessible name — the whole truth, e.g. "Demo mode: synthetic prospects, no real calls are placed". */
  name: string;
  tone?: PillTone;
}

/**
 * Honesty glyph pill (DESIGN_SYSTEM §0.6): a glyph plus at most two words on the stage; the whole
 * sentence lives in the accessible name and the tooltip. Exposed as `role="status"` so the state
 * is announced once and never chatters.
 */
export function GlyphPill({ glyph, label, name, tone = 'neutral', className, ...rest }: GlyphPillProps) {
  return (
    <span role="status" aria-label={name} title={name} className={[styles.pill, styles[tone], className ?? ''].join(' ').trim()} {...rest}>
      <span className={styles.glyph} aria-hidden="true">
        {glyph}
      </span>
      {label ? (
        <span className={styles.label} aria-hidden="true">
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** `◐ Demo` — always visible while no real telephony exists. Accessible name says the whole truth. `compact` = glyph only. */
export function DemoPill({ compact, ...props }: Omit<GlyphPillProps, 'glyph' | 'name' | 'label'> & { compact?: boolean }) {
  return <GlyphPill glyph="◐" label={compact ? undefined : 'Demo'} name={DEMO_PILL_NAME} tone="orange" data-demo-pill {...props} />;
}

/** `✦ Fictional` — fictional training content (offers, prospects). */
export function FictionalPill(props: Omit<GlyphPillProps, 'glyph' | 'name' | 'label'>) {
  return <GlyphPill glyph="✦" label="Fictional" name="Fictional training content — not a real record" tone="purple" data-fictional-pill {...props} />;
}

/** `—` — a value that was not assessed / not set. Pass the exact truth as `name`. */
export function NotAssessedGlyph({ name, ...props }: Omit<GlyphPillProps, 'glyph' | 'label'>) {
  return <GlyphPill glyph="—" name={name} tone="neutral" data-not-assessed {...props} />;
}
