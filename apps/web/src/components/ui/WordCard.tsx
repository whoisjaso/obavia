'use client';

import { REF_MEANING_GLYPH, type RefMeaningStatus } from './RefCard';
import styles from './WordCard.module.css';

export type WordProvenance = 'said' | 'confirmed' | 'yours' | 'hypothesis';

export const WORD_PROVENANCE_GLYPH: Record<WordProvenance, string> = {
  said: '●',
  confirmed: '◐',
  yours: '○',
  hypothesis: '◌',
};

/** When a THEIR REFERENCES card carries the same term as a pinned word, the two merge into one card. */
export interface WordReference {
  referenceId: string;
  /** One plain clause, ≤8 words. */
  meaning: string;
  status: RefMeaningStatus;
  /** Full accessible name of the meaning status. */
  statusName: string;
  invalidated?: boolean;
  pinned?: boolean;
  kept?: boolean;
}

export interface WordCardProps {
  /** The prospect's exact phrase, shown at `--fs-their-words` in gold. */
  word: string;
  provenance: WordProvenance;
  /** Full accessible name of the provenance ("prospect said"). */
  provenanceName: string;
  /** The word they set aside ("revenue" in "profit, not revenue") — rendered as `not <s>revenue</s>`. */
  correction?: string;
  /** Pinned by the representative (shown as a small pin glyph). */
  pinned?: boolean;
  /** Provisional (interim transcript) — rendered dimmed with a dotted edge. */
  provisional?: boolean;
  /** Merged reference (purple meaning line + status glyph); the card then also carries the reference hooks. */
  reference?: WordReference;
  /** Tap → sheet. */
  onPress?: () => void;
  /** Automation hook (vocabulary event id). */
  eventId?: string;
  /** Roving-tabindex support. */
  tabIndex?: number;
}

/**
 * THEIR WORDS card: the word large and gold, provenance glyph + one word at 13px, a correction
 * line in red if any (only the rejected word is struck through). With `reference` it is one panel
 * system: the same term is never listed twice — the card carries the reference's meaning line.
 */
export function WordCard({ word, provenance, provenanceName, correction, pinned, provisional, reference, onPress, eventId, tabIndex }: WordCardProps) {
  const name = `${word}: ${provenanceName}${correction ? `; not ${correction} — they set that word aside` : ''}${pinned ? '; pinned' : ''}${provisional ? '; provisional' : ''}${reference ? `. Reference: ${reference.meaning}. ${reference.invalidated ? 'Invalidated — evidence retracted' : reference.statusName}${reference.kept ? '; kept for later' : ''}` : ''}`;
  const refHooks = reference ? { 'data-ref-card': '', 'data-ref-id': reference.referenceId, 'data-ref-state': reference.invalidated ? 'invalidated' : reference.pinned ? 'pinned' : 'held' } : {};
  return (
    <button
      type="button"
      className={[styles.card, provisional ? styles.provisional : '', reference ? styles.withRef : '', reference?.invalidated ? styles.invalidated : ''].join(' ').trim()}
      onClick={onPress}
      aria-label={name}
      data-word-card
      data-event-id={eventId}
      data-pinned={pinned ? 'true' : undefined}
      tabIndex={tabIndex}
      {...refHooks}
    >
      <span className={styles.word} data-word-text>
        {word}
      </span>
      {correction ? (
        <span className={styles.correction} aria-hidden="true" data-word-correction>
          not <s>{correction}</s>
        </span>
      ) : null}
      {reference ? (
        <span className={styles.meaning} aria-hidden="true" data-ref-meaning>
          <span className={styles.refGlyph}>{reference.invalidated ? '⊘' : REF_MEANING_GLYPH[reference.status]}</span> {reference.meaning}
        </span>
      ) : null}
      <span className={styles.meta} aria-hidden="true">
        <span className={styles.glyph}>{WORD_PROVENANCE_GLYPH[provenance]}</span>
        <span>{provenance}</span>
        {pinned ? <span className={styles.pin}>⌖</span> : null}
        {reference?.kept ? <span className={styles.kept}>◇</span> : null}
      </span>
    </button>
  );
}
