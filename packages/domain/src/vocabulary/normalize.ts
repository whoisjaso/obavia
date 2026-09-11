/**
 * Transcript normalization (brief §12, scenarios 13/14).
 *
 * - Dedupe by documented provider_event_key and by the compound key
 *   (call_id, track, utterance_id, revision).
 * - Partials are superseded by finals of the same utterance; later revisions replace earlier ones.
 * - Per-track ordering follows provider_sequence; there is NO global cross-track sequence.
 *   Display order is started_at, then track, then provider_sequence.
 * - Interim text is never a confirmed quote (`confirmQuote`).
 */
import type { TranscriptTurn } from '../schemas/transcript';
import type { Stability } from '../schemas/vocabulary';

export interface NormalizedTurn extends TranscriptTurn {
  stability: Stability;
  /** Position in display order (started_at, track, provider_sequence). */
  display_index: number;
}

export type DropReason = 'duplicate_event_key' | 'duplicate_compound_key';

export interface DedupeResult {
  events: TranscriptTurn[];
  dropped: { provider_event_key: string; reason: DropReason }[];
}

export function compoundKey(t: Pick<TranscriptTurn, 'call_id' | 'track' | 'utterance_id' | 'revision'>): string {
  return `${t.call_id}|${t.track}|${t.utterance_id}|${t.revision}`;
}

/** Remove duplicate callbacks. A final beats a partial with the same compound key; otherwise first wins. */
export function dedupeEvents(turns: readonly TranscriptTurn[]): DedupeResult {
  const byEventKey = new Set<string>();
  const byCompound = new Map<string, number>();
  const events: TranscriptTurn[] = [];
  const dropped: DedupeResult['dropped'] = [];
  for (const t of turns) {
    const ek = `${t.call_id}|${t.provider_event_key}`;
    if (byEventKey.has(ek)) {
      dropped.push({ provider_event_key: t.provider_event_key, reason: 'duplicate_event_key' });
      continue;
    }
    byEventKey.add(ek);
    const ck = compoundKey(t);
    const existingIndex = byCompound.get(ck);
    if (existingIndex !== undefined) {
      const existing = events[existingIndex];
      if (existing && !existing.is_final && t.is_final) {
        events[existingIndex] = t; // final supersedes the partial with the same key
      } else {
        dropped.push({ provider_event_key: t.provider_event_key, reason: 'duplicate_compound_key' });
      }
      continue;
    }
    byCompound.set(ck, events.length);
    events.push(t);
  }
  return { events, dropped };
}

export interface RevisionChange {
  utterance_id: string;
  from_revision: number;
  to_revision: number;
  from_text: string;
  to_text: string;
}

export interface RevisionResult {
  /** One event per utterance_id: the highest revision, preferring a final over a partial at that revision. */
  latest: TranscriptTurn[];
  /** Same as `latest` but revised utterances carry their PREVIOUS revision (for invalidating dependents). */
  previous: TranscriptTurn[];
  /** Utterance ids where an earlier event (partial or lower revision) was replaced. */
  superseded_utterance_ids: string[];
  /** Text changes caused by a higher revision number. */
  revisions: RevisionChange[];
}

function rank(t: TranscriptTurn): number {
  return t.revision * 2 + (t.is_final ? 1 : 0);
}

/** Resolve the latest revision per utterance_id and report what was superseded (scenario 13/14). */
export function applyRevision(events: readonly TranscriptTurn[]): RevisionResult {
  const groups = new Map<string, TranscriptTurn[]>();
  for (const e of events) {
    const key = `${e.call_id}|${e.utterance_id}`;
    const g = groups.get(key);
    if (g) g.push(e);
    else groups.set(key, [e]);
  }
  const latest: TranscriptTurn[] = [];
  const previous: TranscriptTurn[] = [];
  const superseded: string[] = [];
  const revisions: RevisionChange[] = [];
  for (const g of groups.values()) {
    const sorted = [...g].sort((a, b) => rank(a) - rank(b));
    const last = sorted[sorted.length - 1]!;
    latest.push(last);
    if (sorted.length > 1) {
      superseded.push(last.utterance_id);
      const lowerRevision = sorted.filter((s) => s.revision < last.revision);
      const prior = lowerRevision[lowerRevision.length - 1];
      if (prior) {
        previous.push(prior);
        if (prior.text !== last.text) {
          revisions.push({
            utterance_id: last.utterance_id,
            from_revision: prior.revision,
            to_revision: last.revision,
            from_text: prior.text,
            to_text: last.text,
          });
        }
      } else {
        previous.push(last);
      }
    } else {
      previous.push(last);
    }
  }
  return { latest, previous, superseded_utterance_ids: superseded, revisions };
}

/** Display order: started_at, then track name, then provider_sequence. Never a cross-track sequence merge. */
export function orderForDisplay<T extends TranscriptTurn>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.started_at);
    const tb = Date.parse(b.started_at);
    if (ta !== tb) return ta - tb;
    if (a.track !== b.track) return a.track < b.track ? -1 : 1;
    return a.provider_sequence - b.provider_sequence;
  });
}

/** Per-track event lists ordered by provider_sequence (the only sequence that is meaningful). */
export function perTrackSequences<T extends TranscriptTurn>(events: readonly T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const e of events) (out[e.track] ??= []).push(e);
  for (const track of Object.keys(out)) out[track]!.sort((a, b) => a.provider_sequence - b.provider_sequence);
  return out;
}

export interface TrackOrderCheck {
  ok: boolean;
  /** Track + utterance where a later started_at carried a lower provider_sequence. */
  regressions: { track: string; utterance_id: string }[];
}

/** Within one track, provider_sequence must not regress against started_at. Cross-track order is never checked. */
export function checkTrackOrder(events: readonly TranscriptTurn[]): TrackOrderCheck {
  const regressions: TrackOrderCheck['regressions'] = [];
  const byTrack = perTrackSequences(orderForDisplay(events));
  for (const [track, list] of Object.entries(byTrack)) {
    const timeOrdered = [...list].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
    let lastSeq = -1;
    for (const e of timeOrdered) {
      if (e.provider_sequence < lastSeq) regressions.push({ track, utterance_id: e.utterance_id });
      lastSeq = Math.max(lastSeq, e.provider_sequence);
    }
  }
  return { ok: regressions.length === 0, regressions };
}

function withStability(turns: readonly TranscriptTurn[]): NormalizedTurn[] {
  return orderForDisplay(turns).map((t, i) => ({ ...t, stability: t.is_final ? 'final' : 'interim', display_index: i }));
}

export interface NormalizedTranscript {
  turns: NormalizedTurn[];
  /** Turns as they read before the latest revisions (revised utterances at their prior revision). */
  previous_turns: NormalizedTurn[];
  dropped: DedupeResult['dropped'];
  superseded_utterance_ids: string[];
  revisions: RevisionChange[];
}

/** Dedupe → latest revision per utterance → display order, with stability attached. */
export function normalizeTranscript(raw: readonly TranscriptTurn[]): NormalizedTranscript {
  const { events, dropped } = dedupeEvents(raw);
  const rev = applyRevision(events);
  return {
    turns: withStability(rev.latest),
    previous_turns: withStability(rev.previous),
    dropped,
    superseded_utterance_ids: rev.superseded_utterance_ids,
    revisions: rev.revisions,
  };
}

export interface ConfirmedQuote {
  text: string;
  turn_id: string;
  speaker_role: TranscriptTurn['speaker_role'];
  stability: 'final';
}

/**
 * Interim text may be displayed as provisional but can never become a confirmed quote.
 * Returns null for anything that is not `final`.
 */
export function confirmQuote(
  event: { stability: Stability; speaker_role: TranscriptTurn['speaker_role'] } & ({ exact_text: string; turn_id: string } | { text: string; utterance_id: string }),
): ConfirmedQuote | null {
  if (event.stability !== 'final') return null;
  if ('exact_text' in event) {
    return { text: event.exact_text, turn_id: event.turn_id, speaker_role: event.speaker_role, stability: 'final' };
  }
  return { text: event.text, turn_id: event.utterance_id, speaker_role: event.speaker_role, stability: 'final' };
}
