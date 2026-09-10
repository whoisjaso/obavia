/**
 * Conversation-scoped reference memory (addendum §6, §8, §9): evidence validation, transcript
 * revisions that invalidate dependents, and the rep/UI action log replayed over freshly
 * extracted references. Pure functions; the store is `{ actions }` persisted per call.
 */
import type { TranscriptTurn } from '../schemas/transcript';
import type { ListenerAction, Reference } from '../schemas/listener';
import type { NormalizedTranscript, NormalizedTurn } from '../vocabulary/normalize';
import { keyMatcher } from '../vocabulary/text';
import { sliceCodePoints } from './extract';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Evidence validator: the quoted expression must sit exactly at the recorded code-point span in
 * the CURRENT text of the turn, on a prospect turn, at the recorded revision. Applied to our own
 * extractor output and to any later model proposal alike.
 */
export function validateEvidence(
  evidence: Pick<Reference['evidence'], 'exact_expression' | 'utterance_id' | 'span' | 'revision'>,
  turns: readonly NormalizedTurn[],
  speakerRole: Reference['prospect_speaker_role'] = 'prospect',
): ValidationResult {
  const turn = turns.find((t) => t.utterance_id === evidence.utterance_id);
  if (!turn) return { ok: false, reason: `utterance ${evidence.utterance_id} is not in the transcript` };
  if (turn.speaker_role !== speakerRole) return { ok: false, reason: `utterance ${evidence.utterance_id} is a ${turn.speaker_role} turn, not ${speakerRole}` };
  if (turn.revision !== evidence.revision) return { ok: false, reason: `utterance ${evidence.utterance_id} is at revision ${turn.revision}, evidence cites ${evidence.revision}` };
  const slice = sliceCodePoints(turn.text, evidence.span.start, evidence.span.end);
  if (slice !== evidence.exact_expression) return { ok: false, reason: `span [${evidence.span.start}, ${evidence.span.end}) reads "${slice}", not "${evidence.exact_expression}"` };
  return { ok: true };
}

/** A model (or any external) proposal is validated the same way; fabricated quotes/spans are rejected. */
export interface ReferenceProposal {
  exact_expression: string;
  utterance_id: string;
  span: { start: number; end: number };
  revision: number;
  speaker_role: Reference['prospect_speaker_role'];
}

export function validateProposal(proposal: ReferenceProposal, turns: readonly NormalizedTurn[]): ValidationResult {
  if (proposal.speaker_role !== 'prospect') return { ok: false, reason: 'only prospect turns can originate a reference' };
  return validateEvidence(proposal, turns, 'prospect');
}

/**
 * Transcript revisions: a reference whose phrase no longer occurs in the revised utterance is
 * INVALIDATED (state + reason + correction entry), never silently dropped or kept as valid.
 */
export function applyRevisions(latest: Reference[], previous: Reference[], normalized: NormalizedTranscript, eventVersion: number): Reference[] {
  if (normalized.revisions.length === 0) return latest;
  const out = [...latest];
  const latestIds = new Set(latest.map((r) => r.id));
  for (const old of previous) {
    if (latestIds.has(old.id)) continue;
    const change = normalized.revisions.find((r) => r.utterance_id === old.evidence.utterance_id);
    if (!change) continue;
    const stillThere = keyMatcher(old.evidence.exact_expression).test(change.to_text);
    if (stillThere) continue;
    out.push({
      ...old,
      updated_event_version: eventVersion,
      evidence: { ...old.evidence, status: 'corrected' },
      lifecycle: {
        ...old.lifecycle,
        state: 'invalidated',
        reason: `transcript revision ${change.from_revision}→${change.to_revision} removed "${old.evidence.exact_expression}"; now reads: "${change.to_text}"`,
        correction_history: [
          ...old.lifecycle.correction_history,
          { at_event_version: eventVersion, field: 'evidence.exact_expression', from: old.evidence.exact_expression, to: change.to_text, by: 'transcript_revision' },
        ],
      },
      reuse: { ...old.reuse, do_not_reuse: true },
    });
  }
  return out;
}

/** Also invalidate any reference whose evidence no longer validates against the current turns. */
export function invalidateFailedEvidence(references: Reference[], turns: readonly NormalizedTurn[], eventVersion: number): Reference[] {
  return references.map((r) => {
    if (r.lifecycle.state === 'invalidated') return r;
    const v = validateEvidence(r.evidence, turns, r.prospect_speaker_role);
    if (v.ok) return r;
    return {
      ...r,
      updated_event_version: eventVersion,
      lifecycle: { ...r.lifecycle, state: 'invalidated', reason: `evidence no longer validates: ${v.reason}` },
      reuse: { ...r.reuse, do_not_reuse: true },
    };
  });
}

function bump(r: Reference, version: number): Reference {
  return { ...r, updated_event_version: Math.max(r.updated_event_version, version) };
}

/** Apply one rep/UI action. Unknown reference ids are ignored. Invalidated references never leave that state. */
export function applyAction(references: Reference[], action: ListenerAction): Reference[] {
  return references.map((r) => {
    if (r.id !== action.reference_id) return r;
    const v = action.event_version;
    switch (action.type) {
      case 'pin':
        if (r.lifecycle.state === 'invalidated' || r.lifecycle.state === 'rejected') return r;
        return bump({ ...r, lifecycle: { ...r.lifecycle, state: 'pinned' } }, v);
      case 'unpin':
        return r.lifecycle.state === 'pinned' ? bump({ ...r, lifecycle: { ...r.lifecycle, state: 'held' } }, v) : r;
      case 'keep':
        return bump({ ...r, lifecycle: { ...r.lifecycle, kept_for_later: true } }, v);
      case 'dismiss':
        if (r.lifecycle.state === 'invalidated') return r;
        return bump({ ...r, lifecycle: { ...r.lifecycle, state: 'dismissed', reason: action.reason ?? 'dismissed by representative' } }, v);
      case 'do_not_reuse':
        return bump({ ...r, reuse: { ...r.reuse, do_not_reuse: true } }, v);
      case 'clarify':
        return bump({ ...r, reuse: { ...r.reuse, clarification_requested: true } }, v);
      case 'correct': {
        const from = action.field === 'relationship' ? r.semantics.relationship : action.field === 'business_target' ? r.semantics.business_target : (r.semantics.explained_meaning?.text ?? '');
        const semantics = { ...r.semantics };
        if (action.field === 'relationship') semantics.relationship = action.to;
        else if (action.field === 'business_target') semantics.business_target = action.to;
        else {
          semantics.explained_meaning = { text: action.to, evidence_turn_id: `rep-correction:${action.note}` };
          semantics.meaning_status = 'confirmed';
        }
        return bump(
          {
            ...r,
            semantics,
            evidence: { ...r.evidence, status: 'corrected' },
            lifecycle: {
              ...r.lifecycle,
              correction_history: [...r.lifecycle.correction_history, { at_event_version: v, field: action.field, from, to: action.to, by: 'rep', note: action.note }],
            },
          },
          v,
        );
      }
      case 'use':
        return bump({ ...r, reuse: { ...r.reuse, used_at: [...r.reuse.used_at, { turn_id: action.turn_id, event_version: v }] } }, v);
      case 'reaction': {
        const reactions = [...r.reuse.reactions, { turn_id: action.turn_id, reaction: action.reaction }];
        if (action.reaction === 'rejected') {
          return bump({ ...r, reuse: { ...r.reuse, reactions, do_not_reuse: true }, lifecycle: { ...r.lifecycle, state: r.lifecycle.state === 'invalidated' ? 'invalidated' : 'rejected', reason: `rejected at ${action.turn_id}` } }, v);
        }
        return bump({ ...r, reuse: { ...r.reuse, reactions } }, v);
      }
      case 'suggestion_not_now':
        return r; // recorded in the store; the suggestion policy reads it directly
      default:
        return r;
    }
  });
}

/** Replay the persisted action log over freshly extracted references (deterministic). */
export function applyListenerActions(references: Reference[], actions: readonly ListenerAction[]): Reference[] {
  return actions.reduce((refs, a) => applyAction(refs, a), references);
}

/** Event version = number of provider events consumed so far (deduped by the transcript pipeline afterwards). */
export function eventVersionOf(raw: readonly TranscriptTurn[]): number {
  return raw.length;
}
