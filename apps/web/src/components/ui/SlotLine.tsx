import { lineParts, type LinePart, type SlotStatus } from '@/lib/line-parts';
import styles from './SlotLine.module.css';

const TONE: Record<SlotStatus, string> = { missing: styles['missing'] ?? '', offer: styles['offer'] ?? '', price: styles['offer'] ?? '', fictional: styles['fictional'] ?? '' };
const GLYPH: Record<SlotStatus, string> = { missing: '', offer: '◔', price: '◔', fictional: '✦' };

export interface SlotLineProps {
  /** A resolved line (may carry `[missing: …]` cues) or a raw template with `{slots}`. */
  text: string;
  /** Pre-split parts (when the caller already has them). */
  parts?: readonly LinePart[];
  /** Automation hook on the wrapper. */
  'data-slot-line'?: string;
}

/**
 * Inline text with slot chips: an unfilled slot is a small blue ‹name› token whose accessible
 * name says what fills it; offer / price gates are orange ◔ chips; the fictional gate is purple.
 * Nothing on the stage ever shows `[missing: …]`, `{slot}` or ⟨tokens⟩.
 */
export function SlotLine({ text, parts, 'data-slot-line': hook }: SlotLineProps) {
  const list = parts ?? lineParts(text);
  return (
    <span data-slot-line={hook ?? ''}>
      {list.map((p, i) =>
        p.kind === 'text' ? (
          <span key={i}>{p.text}</span>
        ) : (
          <span key={i} className={[styles.slot, TONE[p.status]].join(' ')} role="img" aria-label={p.name} title={p.name} data-slot={p.slot ?? ''} data-slot-status={p.status}>
            {GLYPH[p.status] ? <span className={styles.glyph}>{GLYPH[p.status]} </span> : null}
            <span className={styles.bracket}>‹</span>
            {p.label}
            <span className={styles.bracket}>›</span>
          </span>
        ),
      )}
    </span>
  );
}
