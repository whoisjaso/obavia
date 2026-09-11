'use client';

import type { ReactNode } from 'react';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { SlotLine } from './SlotLine';
import styles from './LineCard.module.css';

export interface LineCardProps {
  /** Stage chip (one or two words, e.g. "intent"). */
  stage: string;
  /** The exact primary line (resolved). Rendered verbatim through SlotLine; never re-flows while visible. */
  line: string;
  /** A plain sentence under the line (`--fs-body --ink-2`): the resolved bridge, or a purpose cue in Train. */
  bridge?: string;
  /** Tap on the line = next. Omit to make the line non-interactive (e.g. read-only replay). */
  onNext?: () => void;
  /** The info button opens the explanation sheet (why now, listen for, mirrors, tone). */
  onInfo?: () => void;
  /** Accessible name for the tap-to-advance control. */
  nextName?: string;
  /** Lock mark: the primary line is frozen (published/immutable). */
  locked?: boolean;
  /** Extra chip(s) next to the stage. */
  meta?: ReactNode;
  /** Minimum number of display lines reserved so arriving words never move the text. */
  minLines?: number;
  /** Fill the parent (fixed in-call stage): the text scrolls inside the card instead of growing it. */
  fill?: boolean;
  /** Node id for automation hooks. */
  nodeId?: string;
}

/** Lines longer than this many words step down one size so the whole line stays on screen. */
export const LONG_LINE_WORDS = 24;

/**
 * The script line: stage chip, the primary line at `--fs-display` weight 700, a quiet info button,
 * and one plain bridge line below when it resolves. The card reserves `minLines` lines (or fills its
 * parent) so nothing shifts when words arrive; slots render as chips, never as brackets.
 */
export function LineCard({ stage, line, bridge, onNext, onInfo, nextName, locked, meta, minLines = 4, fill, nodeId }: LineCardProps) {
  const long = line.trim().split(/\s+/).length > LONG_LINE_WORDS;
  const text = (
    <span className={styles.text} data-primary-line data-node-id={nodeId}>
      <SlotLine text={line} />
    </span>
  );
  return (
    <section className={[styles.card, long ? styles.long : '', fill ? styles.fill : ''].join(' ').trim()} data-line-card data-node-id={nodeId} data-line-length={long ? 'long' : 'short'} aria-label={`Script line, stage ${stage}`}>
      <div className={styles.head}>
        <Chip static label={stage} tone="teal" icon={locked ? 'lock' : undefined} name={locked ? `Stage ${stage}, line locked` : `Stage ${stage}`} />
        {meta}
        {onInfo ? <IconButton icon="info" label="Why this line now" onClick={onInfo} className={styles.info} /> : null}
      </div>
      <div className={styles.lineBox} style={fill ? undefined : { minHeight: `calc(${minLines} * ${long ? 'var(--fs-display-long)' : 'var(--fs-display)'} * var(--lh-tight))` }}>
        {onNext ? (
          <button type="button" className={styles.lineButton} onClick={onNext} aria-label={nextName ?? `${line}. Next line`} data-line-next>
            {text}
          </button>
        ) : (
          <div className={styles.lineButton}>{text}</div>
        )}
      </div>
      {bridge ? (
        <p className={styles.bridge} data-bridge-text>
          {bridge}
        </p>
      ) : null}
    </section>
  );
}
