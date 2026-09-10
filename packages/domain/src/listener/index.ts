/**
 * Personal Meaning Listener — owning module agent: M-listener (addendum v3).
 *
 * Pure TypeScript, no model: first-mention reference extraction from finalized prospect turns,
 * evidence validation, conversation-scoped memory with lifecycle actions, concept-based delayed
 * recall, and a one-suggestion policy with offer/metric guards.
 *
 * `listenerFromTurns(turns, ctx)` is the ONE path for live and mock calls: it accepts transcript
 * turns and script context only — a practice scenario's hidden fact sheet cannot be passed in.
 */
import type { TranscriptTurn } from '../schemas/transcript';
import type { ListenerAction, Reference } from '../schemas/listener';
import { normalizeTranscript, type NormalizedTranscript } from '../vocabulary/normalize';
import { extractReferences, type ListenerContext, type NotEligible } from './extract';
import { applyListenerActions, applyRevisions, eventVersionOf, invalidateFailedEvidence } from './memory';

export const MODULE = 'listener' as const;

export * from './lexicon';
export * from './concepts';
export * from './extract';
export * from './memory';
export * from './retrieve';
export * from './suggest';

export interface ListenerResult {
  call_id: string;
  /** Number of provider events consumed (before dedupe). */
  event_version: number;
  references: Reference[];
  not_eligible: NotEligible[];
  normalized: NormalizedTranscript;
}

export interface ListenerOptions extends ListenerContext {
  /** Persisted rep/UI actions replayed over the extracted references. */
  actions?: readonly ListenerAction[];
}

/**
 * Raw provider events → dedupe/revisions (vocabulary pipeline) → references (latest + invalidated
 * by revision) → evidence validation → action replay. Deterministic: the same turns and actions
 * always produce the same references.
 */
export function listenerFromTurns(turns: readonly TranscriptTurn[], options: ListenerOptions = {}): ListenerResult {
  const normalized = normalizeTranscript(turns);
  const eventVersion = eventVersionOf(turns);
  const ctx: ListenerContext = { workspace_id: options.workspace_id, call_id: options.call_id, window: options.window };
  const latest = extractReferences(normalized, turns, ctx);
  let references = latest.references;
  if (normalized.revisions.length > 0) {
    const previous = extractReferences({ ...normalized, turns: normalized.previous_turns, revisions: [] }, turns, ctx);
    references = applyRevisions(references, previous.references, normalized, eventVersion);
  }
  references = invalidateFailedEvidence(references, normalized.turns, eventVersion);
  references = applyListenerActions(references, options.actions ?? []);
  // Stable order: first appearance in the transcript. Nothing reorders as new evidence arrives.
  const order = new Map(normalized.turns.map((t, i) => [t.utterance_id, i] as const));
  references.sort((a, b) => (order.get(a.evidence.utterance_id) ?? 0) - (order.get(b.evidence.utterance_id) ?? 0) || a.evidence.span.start - b.evidence.span.start);
  return {
    call_id: options.call_id ?? turns[0]?.call_id ?? 'unknown-call',
    event_version: eventVersion,
    references,
    not_eligible: latest.not_eligible,
    normalized,
  };
}

/** Human-readable meaning-status text for a card. */
export function meaningStatusText(r: Reference): string {
  const labels: Record<Reference['semantics']['meaning_status'], string> = {
    observed: 'observed — the relationship was stated in the turn',
    inferred: 'inferred — interpretation of this sentence, not confirmed',
    confirmed: 'confirmed — meaning supplied by the prospect',
    unknown: 'unknown — ask before assuming',
  };
  return labels[r.semantics.meaning_status];
}

/** One short meaning line for the collapsed card. */
export function shortMeaning(r: Reference): string {
  if (r.lifecycle.state === 'invalidated') return `Invalidated: ${r.lifecycle.reason ?? 'evidence retracted'}`;
  if (r.lifecycle.state === 'rejected') return `Rejected by the prospect — not used again`;
  const rel = r.semantics.relationship.replace(/^[^:]+:\s*/, '');
  return rel.length > 90 ? `${rel.slice(0, 87)}…` : rel;
}

export function originLabel(origin: Reference['semantics']['origin']): string {
  const labels: Record<Reference['semantics']['origin'], string> = {
    prospect_spontaneous: 'prospect said it unprompted',
    prompted: 'prospect said it when asked for a comparison',
    seller_introduced_prospect_confirmed: 'seller introduced, prospect confirmed (shared term)',
    third_party: "someone else's frame — not the prospect's",
    unknown: 'origin unknown (no preceding context)',
  };
  return labels[origin];
}
