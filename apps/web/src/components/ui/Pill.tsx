import type { HTMLAttributes } from 'react';
import { DEMO_PILL_NAME } from '@/lib/routes';
import { Glyph, isDashGlyph, type IconName, type IconWeight } from './Icon';
import styles from './Pill.module.css';

export type PillTone = 'neutral' | 'orange' | 'purple' | 'gold' | 'green' | 'red' | 'teal';

export interface GlyphPillProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * A status character (`◐`, `✦`, `⊘`, `◔`, `✓`) or an icon name. Known characters draw as icons from
   * the set; unknown strings (a count) draw as text; a dash draws as the words "Not set". Decorative:
   * `name` carries the truth.
   */
  glyph?: string | IconName;
  /** Explicit icon (wins over `glyph`). */
  icon?: IconName;
  /** Icon weight override (`bold` by default for marks, `fill` for solid honesty marks). */
  weight?: IconWeight;
  /** At most two visible words. Omit for icon-only pills. */
  label?: string;
  /** The FULL accessible name, the whole truth, e.g. "Demo mode: synthetic prospects, no real calls are placed". */
  name: string;
  tone?: PillTone;
}

/**
 * Honesty pill (DESIGN_SYSTEM §0.6): an icon plus at most two words on the stage; the whole sentence
 * lives in the accessible name and the tooltip. Exposed as `role="status"` so the state is announced
 * once and never chatters.
 */
export function GlyphPill({ glyph, icon, weight, label, name, tone = 'neutral', className, ...rest }: GlyphPillProps) {
  const dash = glyph !== undefined && icon === undefined && isDashGlyph(glyph);
  const text = dash && !label ? 'Not set' : label;
  const mark = icon ?? (glyph && !dash ? glyph : undefined);
  return (
    <span role="status" aria-label={name} title={name} className={[styles.pill, styles[tone], className ?? ''].join(' ').trim()} data-pill-tone={tone} {...rest}>
      {mark ? (
        <span className={styles.glyph} aria-hidden="true">
          <Glyph glyph={mark} size={13} weight={weight} />
        </span>
      ) : null}
      {text ? (
        <span className={styles.label} aria-hidden="true">
          {text}
        </span>
      ) : null}
    </span>
  );
}

/** The Demo mark: always visible while no real telephony exists. Accessible name says the whole truth. `compact` = icon only. */
export function DemoPill({ compact, ...props }: Omit<GlyphPillProps, 'glyph' | 'icon' | 'name' | 'label'> & { compact?: boolean }) {
  return <GlyphPill icon="circle-half" weight="fill" label={compact ? undefined : 'Demo'} name={DEMO_PILL_NAME} tone="orange" data-demo-pill {...props} />;
}

/** The Fictional mark: fictional training content (offers, prospects). */
export function FictionalPill(props: Omit<GlyphPillProps, 'glyph' | 'icon' | 'name' | 'label'>) {
  return <GlyphPill icon="spark" weight="fill" label="Fictional" name="Fictional training content, not a real record" tone="purple" data-fictional-pill {...props} />;
}

export interface NotAssessedLabelProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The exact truth ("Tone not assessed (text-only)", "Price not set: a blank price is not $0"). */
  name: string;
  /** The visible caption: "Not assessed" (default), "Not set", "None yet". */
  label?: string;
}

/**
 * A value that was not assessed or not set: a caption-size word pair, never a dash. The visible word
 * is the short truth; `name` is the whole truth (the accessible name, and visually hidden text so the
 * truth is also in the DOM). Carries `data-not-assessed` for automation.
 */
export function NotAssessedLabel({ name, label = 'Not assessed', className, ...rest }: NotAssessedLabelProps) {
  return (
    <span role="status" aria-label={name} title={name} className={[styles.absent, className ?? ''].join(' ').trim()} data-not-assessed {...rest}>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** @deprecated Retired name; use `NotAssessedLabel`. Renders the same caption. */
export const NotAssessedGlyph = NotAssessedLabel;

/**
 * A 20px status mark at a row's edge: the word lives only in the accessible name (`role="img"`),
 * so names use the whole row width. Carries `data-chip={label}` for automation, like a Chip would.
 */
export function StatusGlyph({ glyph, icon, weight, name, label, tone = 'neutral', className, ...rest }: GlyphPillProps) {
  const mark = icon ?? glyph ?? 'circle';
  return (
    <span role="img" aria-label={name} title={name} className={[styles.statusGlyph, styles[tone], className ?? ''].join(' ').trim()} data-chip={label ?? glyph ?? icon} {...rest}>
      {isDashGlyph(mark) ? <Glyph glyph="circle-dashed" size={20} weight="bold" /> : <Glyph glyph={mark} size={20} weight={weight} />}
    </span>
  );
}
