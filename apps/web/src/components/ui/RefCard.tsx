'use client';

import styles from './RefCard.module.css';

export type RefMeaningStatus = 'observed' | 'inferred' | 'confirmed' | 'unknown';

export const REF_MEANING_GLYPH: Record<RefMeaningStatus, string> = {
  observed: '◉',
  inferred: '◌',
  confirmed: '✓',
  unknown: '?',
};

export interface RefCardProps {
  /** Uppercase short form ("JAZZ / EVERYBODY WANTS A SOLO"). */
  label: string;
  /** One meaning line (`--fs-body`). */
  meaning: string;
  status: RefMeaningStatus;
  /** Full accessible name of the status glyph. */
  statusName: string;
  /** Invalidated: struck through with ⊘. */
  invalidated?: boolean;
  /** Rejected/dismissed: muted. */
  muted?: boolean;
  pinned?: boolean;
  kept?: boolean;
  onPress?: () => void;
  referenceId?: string;
  tabIndex?: number;
}

/**
 * THEIR REFERENCES card: label at `--fs-their-words` in purple, one meaning line, a meaning-status
 * glyph + one word. Invalidated references strike through with ⊘. Tap → Sheet (Keep · Use · Clarify).
 */
export function RefCard({ label, meaning, status, statusName, invalidated, muted, pinned, kept, onPress, referenceId, tabIndex }: RefCardProps) {
  const glyph = invalidated ? '⊘' : REF_MEANING_GLYPH[status];
  const word = invalidated ? 'invalidated' : status;
  const name = `${label}. ${meaning}. ${invalidated ? 'Invalidated — evidence retracted' : statusName}${pinned ? '; pinned' : ''}${kept ? '; kept for later' : ''}`;
  return (
    <button
      type="button"
      className={[styles.card, invalidated ? styles.invalidated : '', muted ? styles.muted : ''].join(' ').trim()}
      onClick={onPress}
      aria-label={name}
      data-ref-card
      data-ref-id={referenceId}
      data-ref-state={invalidated ? 'invalidated' : muted ? 'muted' : pinned ? 'pinned' : 'held'}
      tabIndex={tabIndex}
    >
      <span className={styles.label} data-ref-label>
        {label}
      </span>
      <span className={styles.meaning} data-ref-meaning>
        {meaning}
      </span>
      <span className={styles.meta} aria-hidden="true">
        <span className={styles.glyph}>{glyph}</span>
        <span>{word}</span>
        {pinned ? <span className={styles.pin}>⌖</span> : null}
        {kept ? <span className={styles.kept}>◇</span> : null}
      </span>
    </button>
  );
}
