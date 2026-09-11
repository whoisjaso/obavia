'use client';

import styles from './WordCard.module.css';

export type WordProvenance = 'said' | 'confirmed' | 'yours' | 'hypothesis';

export const WORD_PROVENANCE_GLYPH: Record<WordProvenance, string> = {
  said: '●',
  confirmed: '◐',
  yours: '○',
  hypothesis: '◌',
};

export interface WordCardProps {
  /** The prospect's exact phrase, shown at `--fs-their-words` in gold. */
  word: string;
  provenance: WordProvenance;
  /** Full accessible name of the provenance ("prospect said"). */
  provenanceName: string;
  /** Correction line if any ("rejected: revenue"). */
  correction?: string;
  /** Pinned by the representative (shown as a small pin glyph). */
  pinned?: boolean;
  /** Provisional (interim transcript) — rendered dimmed with a dotted edge. */
  provisional?: boolean;
  /** Tap → sheet. */
  onPress?: () => void;
  /** Automation hook (vocabulary event id). */
  eventId?: string;
  /** Roving-tabindex support. */
  tabIndex?: number;
}

/** THEIR WORDS card: the word large and gold, provenance glyph + one word, a correction line if any. */
export function WordCard({ word, provenance, provenanceName, correction, pinned, provisional, onPress, eventId, tabIndex }: WordCardProps) {
  const name = `${word}: ${provenanceName}${correction ? `; ${correction}` : ''}${pinned ? '; pinned' : ''}${provisional ? '; provisional' : ''}`;
  return (
    <button
      type="button"
      className={[styles.card, provisional ? styles.provisional : ''].join(' ').trim()}
      onClick={onPress}
      aria-label={name}
      data-word-card
      data-event-id={eventId}
      data-pinned={pinned ? 'true' : undefined}
      tabIndex={tabIndex}
    >
      <span className={styles.word} data-word-text>
        {word}
      </span>
      <span className={styles.meta} aria-hidden="true">
        <span className={styles.glyph}>{WORD_PROVENANCE_GLYPH[provenance]}</span>
        <span>{provenance}</span>
        {pinned ? <span className={styles.pin}>⌖</span> : null}
      </span>
      {correction ? (
        <span className={styles.correction} aria-hidden="true">
          {correction}
        </span>
      ) : null}
    </button>
  );
}
