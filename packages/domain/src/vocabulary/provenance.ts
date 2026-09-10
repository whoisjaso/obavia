/**
 * Provenance classification (brief §7, scenarios 2 and 32).
 *
 *  prospect_said                     — a prospect turn originates the term.
 *  seller_proposed_prospect_confirmed — the representative says it first and the prospect repeats or
 *                                       affirms it within the next two prospect turns ("Yes, efficiency.").
 *  seller_only                       — the representative says it; the prospect never adopts it.
 *  model_hypothesis                  — reserved; nothing produces it in Increment 1 (no model).
 */
import type { SpeakerRole } from '../schemas/transcript';
import type { Provenance, VocabularyEvent } from '../schemas/vocabulary';
import type { NormalizedTurn } from './normalize';
import { keyMatcher, wordCount } from './text';

export interface Occurrence {
  turn_id: string;
  speaker_role: SpeakerRole;
  display_index: number;
  start: number;
  end: number;
  is_final: boolean;
  /** Exact text as it appears in the turn. */
  text: string;
}

/** Every occurrence of a normalized key across the given turns, in display order. */
export function findOccurrences(key: string, turns: readonly NormalizedTurn[]): Occurrence[] {
  const out: Occurrence[] = [];
  const re = keyMatcher(key);
  for (const t of turns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t.text)) !== null) {
      out.push({
        turn_id: t.utterance_id,
        speaker_role: t.speaker_role,
        display_index: t.display_index,
        start: m.index,
        end: m.index + m[0].length,
        is_final: t.is_final,
        text: m[0],
      });
      if (m[0].length === 0) re.lastIndex += 1;
    }
  }
  return out.sort((a, b) => a.display_index - b.display_index || a.start - b.start);
}

const AFFIRMATION_START = /^(?:yes|yeah|yep|exactly|right|correct|that's it|that's right|that is it|that's exactly it|precisely|absolutely)\b/i;
const NON_CONFIRMATION_START = /^(?:no|nope|not really|not quite|not exactly|different|it's not|that's not|wrong)\b/i;

/** A short, unqualified affirmation ("Yes, exactly.") — no "but", at most eight words. */
export function isShortAffirmation(text: string): boolean {
  const trimmed = text.trim();
  return AFFIRMATION_START.test(trimmed) && !/\bbut\b/i.test(trimmed) && wordCount(trimmed) <= 8;
}

export function startsWithNonConfirmation(text: string): boolean {
  return NON_CONFIRMATION_START.test(text.trim());
}

export interface ProvenanceDecision {
  provenance: Provenance;
  /** Speaker who originated the term. */
  source_role: SpeakerRole;
  /** Turn where the prospect confirmed a seller-proposed term, if any. */
  confirmed_in_turn?: string;
  reason: string;
}

/** Decide provenance from the ordered occurrences of one term and the surrounding turns. */
export function classifyProvenance(key: string, occurrences: readonly Occurrence[], turns: readonly NormalizedTurn[]): ProvenanceDecision {
  const first = occurrences[0];
  if (!first) {
    return { provenance: 'seller_only', source_role: 'unknown', reason: 'no occurrence found' };
  }
  if (first.speaker_role === 'prospect') {
    return {
      provenance: 'prospect_said',
      source_role: 'prospect',
      reason: first.is_final ? 'a prospect turn originates the term' : 'a prospect turn originates the term (interim — provisional)',
    };
  }
  if (first.speaker_role !== 'representative') {
    return { provenance: 'seller_only', source_role: first.speaker_role, reason: 'origin speaker unknown' };
  }
  // Seller said it first: look at the next two prospect turns after that representative turn.
  const re = keyMatcher(key);
  const following = turns.filter((t) => t.display_index > first.display_index && t.speaker_role === 'prospect' && t.is_final).slice(0, 2);
  for (const t of following) {
    re.lastIndex = 0;
    const repeats = re.test(t.text);
    if (startsWithNonConfirmation(t.text)) continue;
    if (repeats || isShortAffirmation(t.text)) {
      return {
        provenance: 'seller_proposed_prospect_confirmed',
        source_role: 'representative',
        confirmed_in_turn: t.utterance_id,
        reason: repeats ? 'representative proposed it; prospect repeated it' : 'representative proposed it; prospect affirmed it',
      };
    }
  }
  return { provenance: 'seller_only', source_role: 'representative', reason: 'representative said it; the prospect never adopted it' };
}

/** Visible label for a pin — provenance is always shown next to the phrase (CONVENTIONS §8). */
export function provenanceLabel(ev: Pick<VocabularyEvent, 'provenance' | 'attribution' | 'stability' | 'rejected_by' | 'meaning_status'>): string {
  if (ev.rejected_by) return 'rejected by the prospect — not their priority';
  if (ev.attribution === 'quoted_other') return 'quoted someone else — not their priority';
  if (ev.meaning_status === 'invalidated') return 'invalidated by transcript revision — clarify';
  const base: Record<Provenance, string> = {
    prospect_said: 'prospect said',
    seller_proposed_prospect_confirmed: 'confirmed shared term (seller proposed, prospect confirmed)',
    seller_only: 'seller only — not pinned',
    model_hypothesis: 'hypothesis — not a quote',
  };
  const label = base[ev.provenance];
  return ev.stability === 'interim' ? `${label} · provisional (interim)` : label;
}
