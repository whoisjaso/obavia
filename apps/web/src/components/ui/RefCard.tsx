'use client';

import { Glyph, Icon } from './Icon';
import styles from './RefCard.module.css';

export type RefMeaningStatus = 'observed' | 'inferred' | 'confirmed' | 'unknown';

/** Meaning-status marks as status characters (drawn as icons on the stage; kept as data for screens and tests). */
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
  /** Full accessible name of the status mark. */
  statusName: string;
  /** Invalidated: struck through with a prohibit mark. */
  invalidated?: boolean;
  /** Rejected/dismissed: muted. */
  muted?: boolean;
  pinned?: boolean;
  kept?: boolean;
  onPress?: () => void;
  referenceId?: string;
  tabIndex?: number;
}

/** "PROFIT (NOT REVENUE)" splits into title "PROFIT" + aside "revenue" (the word they set aside). */
export function splitReferenceLabel(label: string): { title: string; aside: string | null } {
  const m = /^(.*?)\s*\(not\s+([^)]+)\)\s*$/i.exec(label);
  return m ? { title: m[1]!.trim(), aside: m[2]!.trim().toLowerCase() } : { title: label, aside: null };
}

/**
 * THEIR REFERENCES card: label at `--fs-their-words` in purple, one meaning line, a meaning-status
 * mark + one word. Invalidated references strike through. Tap opens the Sheet (Keep, Use, Clarify).
 */
export function RefCard({ label, meaning, status, statusName, invalidated, muted, pinned, kept, onPress, referenceId, tabIndex }: RefCardProps) {
  const { title, aside } = splitReferenceLabel(label);
  const word = invalidated ? 'invalidated' : status;
  const name = `${label}. ${meaning}. ${invalidated ? 'Invalidated: evidence retracted' : statusName}${pinned ? '; pinned' : ''}${kept ? '; kept for later' : ''}`;
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
        {title}
      </span>
      {aside ? (
        <span className={styles.aside} aria-hidden="true" data-ref-aside>
          not <s>{aside}</s>
        </span>
      ) : null}
      <span className={styles.meaning} data-ref-meaning>
        {meaning}
      </span>
      <span className={styles.meta} aria-hidden="true" data-ref-meta>
        <span className={styles.glyph}>{invalidated ? <Icon name="ban" size={13} weight="bold" /> : <Glyph glyph={REF_MEANING_GLYPH[status]} size={13} />}</span>
        <span>{word}</span>
        {pinned ? <Icon name="pin" size={13} weight="fill" className={styles.pin} /> : null}
        {kept ? <Icon name="bookmark" size={13} weight="fill" className={styles.kept} /> : null}
      </span>
    </button>
  );
}
