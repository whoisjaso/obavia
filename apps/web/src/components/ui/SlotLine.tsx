import { lineParts, type LinePart, type SlotStatus } from '@/lib/line-parts';
import { Icon, type IconName } from './Icon';
import styles from './SlotLine.module.css';

const TONE: Record<SlotStatus, string> = { missing: styles['missing'] ?? '', offer: styles['offer'] ?? '', price: styles['offer'] ?? '', fictional: styles['fictional'] ?? '' };
const MARK: Record<SlotStatus, IconName | null> = { missing: null, offer: 'hourglass', price: 'hourglass', fictional: 'spark' };

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
 * name says what fills it; offer / price gates are orange chips with an hourglass; the fictional
 * gate is purple with a spark. Nothing on the stage ever shows `[missing: …]`, `{slot}` or ⟨tokens⟩.
 * The chip is ONE inline, non-breaking run (brackets are pseudo-elements) so a line clamp treats it
 * as a word and never strands a bracket on its own.
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
            {MARK[p.status] ? <Icon name={MARK[p.status]!} size={16} weight="fill" className={styles.glyph} /> : null}
            {p.label}
          </span>
        ),
      )}
    </span>
  );
}
