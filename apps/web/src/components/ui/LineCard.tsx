'use client';

import type { ReactNode } from 'react';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import styles from './LineCard.module.css';

export interface LineCardProps {
  /** Stage chip (one or two words, e.g. "intent"). */
  stage: string;
  /** The exact primary line. Rendered verbatim; never re-flows while visible (fixed min-height). */
  line: string;
  /** Bridge line under the primary line (`--fs-body --ink-2`). */
  bridge?: string;
  /** Tap on the line = next. Omit to make the line non-interactive (e.g. read-only replay). */
  onNext?: () => void;
  /** ⓘ opens the explanation sheet (why now, listen for, mirrors, tone). */
  onInfo?: () => void;
  /** Accessible name for the tap-to-advance control. */
  nextName?: string;
  /** Lock glyph: the primary line is frozen (published/immutable). */
  locked?: boolean;
  /** Extra chip(s) next to the stage (draft badge as a glyph chip, etc.). */
  meta?: ReactNode;
  /** Minimum number of display lines reserved so arriving words never move the text. */
  minLines?: number;
  /** Node id for automation hooks. */
  nodeId?: string;
}

/**
 * The script line: stage chip, the primary line at `--fs-display` weight 700, a subtle ⓘ, and the
 * bridge line below. The card reserves `minLines` lines so nothing shifts when words arrive.
 */
/** Lines longer than this many words step down one size so the whole line stays on screen. */
export const LONG_LINE_WORDS = 24;

export function LineCard({ stage, line, bridge, onNext, onInfo, nextName, locked, meta, minLines = 4, nodeId }: LineCardProps) {
  const long = line.trim().split(/\s+/).length > LONG_LINE_WORDS;
  const text = (
    <span className={styles.text} data-primary-line data-node-id={nodeId}>
      {line}
    </span>
  );
  return (
    <section className={[styles.card, long ? styles.long : ''].join(' ').trim()} data-line-card data-node-id={nodeId} data-line-length={long ? 'long' : 'short'} aria-label={`Script line, stage ${stage}`}>
      <div className={styles.head}>
        <Chip static label={stage} tone="teal" glyph={locked ? '🔒' : undefined} name={locked ? `Stage ${stage}, line locked` : `Stage ${stage}`} />
        {meta}
        {onInfo ? <IconButton icon="info" label="Why this line now" onClick={onInfo} className={styles.info} /> : null}
      </div>
      <div className={styles.lineBox} style={{ minHeight: `calc(${minLines} * ${long ? 'var(--fs-display-long)' : 'var(--fs-display)'} * var(--lh-tight))` }}>
        {onNext ? (
          <button type="button" className={styles.lineButton} onClick={onNext} aria-label={nextName ?? `${line} — next line`} data-line-next>
            {text}
          </button>
        ) : (
          <div className={styles.lineButton}>{text}</div>
        )}
      </div>
      {bridge ? (
        <p className={styles.bridge} data-bridge-line>
          {bridge}
        </p>
      ) : null}
    </section>
  );
}
