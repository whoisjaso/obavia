/** Composition: raw provider events → normalized turns → candidates → ranking → facts/lenses/opt-out. */
import type { TranscriptTurn } from '../schemas/transcript';
import type { DecisionLens, VocabularyEvent } from '../schemas/vocabulary';
import { detectOptOut, extractVocabulary, type ExtractionOptions, type OptOut } from './extract';
import { extractFacts, type Fact } from './facts';
import { normalizeTranscript, type NormalizedTranscript, type NormalizedTurn } from './normalize';
import { rankCandidates, type RankedCandidate } from './rank';

export interface CallAnalysis {
  call_id: string;
  turns: NormalizedTurn[];
  events: VocabularyEvent[];
  ranked: RankedCandidate[];
  excluded: RankedCandidate[];
  lenses: DecisionLens[];
  facts: Fact[];
  opt_out: OptOut | null;
  dropped: NormalizedTranscript['dropped'];
  revisions: NormalizedTranscript['revisions'];
  superseded_utterance_ids: string[];
}

export function analyzeCall(raw: readonly TranscriptTurn[], options: ExtractionOptions = {}): CallAnalysis {
  const normalized = normalizeTranscript(raw);
  const callId = raw[0]?.call_id ?? normalized.turns[0]?.call_id ?? 'unknown-call';
  const { events, lenses } = extractVocabulary(normalized, callId, options);
  const { ranked, excluded } = rankCandidates(events);
  const facts = extractFacts(normalized.turns, ranked, events);
  return {
    call_id: callId,
    turns: normalized.turns,
    events,
    ranked,
    excluded,
    lenses,
    facts,
    opt_out: detectOptOut(normalized.turns),
    dropped: normalized.dropped,
    revisions: normalized.revisions,
    superseded_utterance_ids: normalized.superseded_utterance_ids,
  };
}

/** Wall-clock duration from first start to last end, in seconds (0 when no timestamps). */
export function callDurationSeconds(turns: readonly TranscriptTurn[]): number {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const t of turns) {
    start = Math.min(start, Date.parse(t.started_at));
    if (t.ended_at) end = Math.max(end, Date.parse(t.ended_at));
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 1000);
}
