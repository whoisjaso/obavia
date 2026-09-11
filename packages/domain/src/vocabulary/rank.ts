/**
 * Priority ranking (brief §7): explicit corrections/negations, explicit emphasis and prospect-defined
 * meanings outrank raw repetition counts. seller_only, quoted_other, rejected, invalidated and interim
 * candidates never enter the top pins.
 */
import type { VocabularyEvent } from '../schemas/vocabulary';

export interface RankedCandidate {
  event: VocabularyEvent;
  score: number;
  reasons: string[];
  eligible: boolean;
  /** Why the candidate is kept out of the pinned set. */
  exclusion?: string;
}

export function exclusionFor(ev: VocabularyEvent): string | undefined {
  if (ev.rejected_by) return `rejected term (${ev.rejected_by === 'negation' ? 'negated by the prospect' : `"${ev.rejected_by}" was preferred`})`;
  if (ev.attribution === 'quoted_other') return "quoted someone else's goal: not the prospect's priority";
  if (ev.meaning_status === 'invalidated') return 'invalidated by a transcript revision: clarify before using';
  if (ev.provenance === 'seller_only') return 'seller only: the prospect never adopted it';
  if (ev.provenance === 'model_hypothesis') return 'hypothesis: not a quote';
  if (ev.stability === 'interim') return 'interim transcript: provisional until final';
  return undefined;
}

export function scoreEvent(ev: VocabularyEvent): { score: number; reasons: string[] } {
  let score = 1;
  const reasons: string[] = [];
  if (ev.correction_or_negation) {
    score += 5;
    reasons.push(`explicit correction: rejects "${ev.correction_or_negation.rejects}"`);
  }
  if (ev.explicit_emphasis) {
    score += 3;
    reasons.push('explicit emphasis');
  }
  if (ev.meaning_status === 'explained' || ev.meaning_status === 'confirmed') {
    score += 3;
    reasons.push('prospect defined the meaning');
  }
  if (ev.provenance === 'prospect_said') {
    score += 1;
    reasons.push('prospect originated');
  } else if (ev.provenance === 'seller_proposed_prospect_confirmed') {
    score += 0.5;
    reasons.push('seller proposed, prospect confirmed');
  }
  const prospectRepeats = ev.repetition_by_speaker?.prospect ?? ev.repetition_count;
  const repeatBonus = Math.min(2.5, Math.max(0, prospectRepeats - 1) * 0.5);
  if (repeatBonus > 0) {
    score += repeatBonus;
    reasons.push(`repeated by the prospect ×${prospectRepeats}`);
  }
  return { score, reasons };
}

export interface Ranking {
  /** Eligible candidates, best first. Ties keep transcript order (earlier first). */
  ranked: RankedCandidate[];
  /** Excluded candidates with their reason, in transcript order. */
  excluded: RankedCandidate[];
}

/** `events` must be in transcript order (as produced by extraction) so ties are stable. */
export function rankCandidates(events: readonly VocabularyEvent[]): Ranking {
  const all: { candidate: RankedCandidate; index: number }[] = events.map((event, index) => {
    const exclusion = exclusionFor(event);
    const { score, reasons } = scoreEvent(event);
    return { candidate: { event, score, reasons: [...reasons, ...(event.rank_reasons ?? [])], eligible: exclusion === undefined, exclusion }, index };
  });
  const ranked = all
    .filter((c) => c.candidate.eligible)
    .sort((a, b) => b.candidate.score - a.candidate.score || a.index - b.index)
    .map((c) => c.candidate);
  const excluded = all.filter((c) => !c.candidate.eligible).map((c) => c.candidate);
  return { ranked, excluded };
}

/** The correction line shown under the strip: "PROFIT, rejected: revenue". */
export function correctionLines(events: readonly VocabularyEvent[]): { event_id: string; line: string; cue?: string }[] {
  return events
    .filter((e) => e.correction_or_negation && !e.rejected_by && e.speaker_role === 'prospect')
    .map((e) => ({ event_id: e.id, line: `${e.exact_text.toUpperCase()}, rejected: ${e.correction_or_negation!.rejects}`, cue: e.cue }));
}
