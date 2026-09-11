/**
 * Listener state (frozen API surface). ONE object per conversation, rebuilt deterministically from
 * `memory` = { raw provider events, rep/UI action log, one-suggestion slot }.
 *
 * `listenerFromTurns(turns, ctx)` is the ONE path for live and mock calls: it accepts transcript turns
 * and script/context options only — a practice scenario's hidden fact sheet is not a TranscriptTurn and
 * cannot be passed in. `applyTurn` and every lifecycle function return a NEW state (no mutation): the
 * call room keeps the latest state, persists `state.memory`, and re-renders `toCards(state)`.
 */
import type { TranscriptTurn } from '../schemas/transcript';
import type { ListenerAction, ListenerMemory, Reaction, Reference, ReferenceSuggestion } from '../schemas/listener';
import { normalizeTranscript, type NormalizedTranscript } from '../vocabulary/normalize';
import { extractReferences, type ListenerContext, type NotEligible } from './extract';
import { applyListenerActions, applyRevisions, eventVersionOf, invalidateFailedEvidence } from './memory';
import { suggestionStillValid } from './suggest';

export interface ListenerState {
  call_id: string;
  /** Number of provider events consumed (before dedupe). Every action and suggestion is stamped with it. */
  event_version: number;
  /** References in first-appearance order. Never reordered by new evidence, pins or actions. */
  references: Reference[];
  /** Explainability: sentences that were considered and why they are not cards. */
  not_eligible: NotEligible[];
  normalized: NormalizedTranscript;
  /** The replay log + action log + suggestion slot. Persist this (per call) and nothing else. */
  memory: ListenerMemory;
  /** Context the state was built with; reused by `applyTurn` and the lifecycle functions. */
  context: ListenerContext;
}

/** @deprecated name kept for earlier callers — identical to `ListenerState`. */
export type ListenerResult = ListenerState;

export interface ListenerOptions extends ListenerContext {
  /** Persisted rep/UI actions replayed over the extracted references (ignored when `memory` is given). */
  actions?: readonly ListenerAction[];
  /** A persisted memory to restore (its `turns` are ignored: the `turns` argument is authoritative). */
  memory?: Pick<ListenerMemory, 'actions' | 'last_suggestion_reference_id' | 'queued_suggestion'>;
}

function contextOf(options: ListenerOptions): ListenerContext {
  return { workspace_id: options.workspace_id, call_id: options.call_id, window: options.window };
}

/**
 * Raw provider events → dedupe/revisions (vocabulary pipeline) → references (latest + invalidated by
 * revision) → evidence validation → action replay → queued-suggestion revalidation. Deterministic:
 * the same turns and memory always produce the same state.
 */
export function listenerFromTurns(turns: readonly TranscriptTurn[], options: ListenerOptions = {}): ListenerState {
  const normalized = normalizeTranscript(turns);
  const eventVersion = eventVersionOf(turns);
  const ctx = contextOf(options);
  const actions = options.memory ? options.memory.actions : (options.actions ?? []);
  const latest = extractReferences(normalized, turns, ctx);
  let references = latest.references;
  if (normalized.revisions.length > 0) {
    const previous = extractReferences({ ...normalized, turns: normalized.previous_turns, revisions: [] }, turns, ctx);
    references = applyRevisions(references, previous.references, normalized, eventVersion);
  }
  references = invalidateFailedEvidence(references, normalized.turns, eventVersion);
  references = applyListenerActions(references, actions);
  // Stable order: first appearance in the transcript. Nothing reorders as new evidence arrives.
  const order = new Map(normalized.turns.map((t, i) => [t.utterance_id, i] as const));
  references.sort((a, b) => (order.get(a.evidence.utterance_id) ?? 0) - (order.get(b.evidence.utterance_id) ?? 0) || a.evidence.span.start - b.evidence.span.start);
  const queued = options.memory?.queued_suggestion ?? null;
  return {
    call_id: options.call_id ?? turns[0]?.call_id ?? 'unknown-call',
    event_version: eventVersion,
    references,
    not_eligible: latest.not_eligible,
    normalized,
    memory: {
      turns: [...turns],
      actions: [...actions],
      last_suggestion_reference_id: options.memory?.last_suggestion_reference_id ?? null,
      queued_suggestion: queued && suggestionStillValid(references, queued, actions.length).ok ? queued : null,
    },
    context: ctx,
  };
}

/** Rebuild a state from a persisted memory (page reload, or a late-arriving event replayed in order). */
export function listenerFromMemory(memory: ListenerMemory, ctx: ListenerContext = {}): ListenerState {
  return listenerFromTurns(memory.turns, { ...ctx, memory });
}

function rebuild(state: ListenerState, memory: ListenerMemory, ctx: ListenerContext = state.context): ListenerState {
  return listenerFromTurns(memory.turns, { ...ctx, memory });
}

/**
 * Incremental: consume ONE provider event (partial, final, revision or duplicate) and return the new
 * state. Duplicates never duplicate references; revisions invalidate dependents; a new final prospect
 * turn drops the queued suggestion (the conversation moved on — ask `suggestPrimary` again).
 */
export function applyTurn(state: ListenerState, turn: TranscriptTurn, ctx: ListenerContext = state.context): ListenerState {
  const queued = state.memory.queued_suggestion;
  const movedOn = queued !== null && turn.speaker_role === 'prospect' && turn.is_final && turn.utterance_id !== queued.trigger_turn_id;
  const revisesEvidence = queued !== null && turn.revision > 0 && state.references.some((r) => r.id === queued.reference_id && r.evidence.utterance_id === turn.utterance_id);
  return rebuild(state, { ...state.memory, turns: [...state.memory.turns, turn], queued_suggestion: movedOn || revisesEvidence ? null : queued }, ctx);
}

/**
 * A transcript revision arrived for an utterance that references depend on. Dependent interpretations
 * are invalidated (state `invalidated`, reason, correction entry) and any queued suggestion built on that
 * utterance is dropped BEFORE recomputation. Equivalent to `applyTurn` for a revision event, made explicit.
 */
export function invalidateForRevision(state: ListenerState, revisedTurn: TranscriptTurn): ListenerState {
  const queued = state.memory.queued_suggestion;
  const dependent = queued !== null && state.references.some((r) => r.id === queued.reference_id && r.evidence.utterance_id === revisedTurn.utterance_id);
  const withoutQueued: ListenerState = dependent ? { ...state, memory: { ...state.memory, queued_suggestion: null } } : state;
  return applyTurn(withoutQueued, revisedTurn);
}

// ---------------------------------------------------------------------------------------------
// Lifecycle (rep/UI actions). Each returns a new state; the action is appended to the log.
// ---------------------------------------------------------------------------------------------

function withAction(state: ListenerState, action: ListenerAction): ListenerState {
  return rebuild(state, { ...state.memory, actions: [...state.memory.actions, action] });
}

function lastProspectTurnId(state: ListenerState): string {
  const t = [...state.normalized.turns].reverse().find((x) => x.speaker_role === 'prospect');
  return t?.utterance_id ?? 'no-prospect-turn';
}

/** Pin: protects the card's position, not its accuracy. Ignored for rejected/invalidated references. */
export function pinReference(state: ListenerState, referenceId: string): ListenerState {
  return withAction(state, { type: 'pin', reference_id: referenceId, event_version: state.event_version });
}

export function unpinReference(state: ListenerState, referenceId: string): ListenerState {
  return withAction(state, { type: 'unpin', reference_id: referenceId, event_version: state.event_version });
}

/** KEEP FOR LATER: hold it without interrupting the call or asking personal-history questions. */
export function keepReference(state: ListenerState, referenceId: string): ListenerState {
  return withAction(state, { type: 'keep', reference_id: referenceId, event_version: state.event_version });
}

/** Dismiss: the card leaves the visible set; a late output can never bring it back. */
export function dismissReference(state: ListenerState, referenceId: string, reason?: string): ListenerState {
  const queued = state.memory.queued_suggestion?.reference_id === referenceId ? null : state.memory.queued_suggestion;
  return rebuild(state, { ...state.memory, queued_suggestion: queued, actions: [...state.memory.actions, { type: 'dismiss', reference_id: referenceId, event_version: state.event_version, reason }] });
}

/** "Do not reuse this reference": keeps the card as evidence, never suggests it again. */
export function forbidReuse(state: ListenerState, referenceId: string): ListenerState {
  const queued = state.memory.queued_suggestion?.reference_id === referenceId ? null : state.memory.queued_suggestion;
  return rebuild(state, { ...state.memory, queued_suggestion: queued, actions: [...state.memory.actions, { type: 'do_not_reuse', reference_id: referenceId, event_version: state.event_version }] });
}

/** The prospect rejected the reference (heard on the call): state `rejected`, never suggested again. */
export function rejectReference(state: ListenerState, referenceId: string, turnId: string = lastProspectTurnId(state)): ListenerState {
  return recordReaction(state, referenceId, 'rejected', turnId);
}

/** Correct an interpretation (relationship / business_target / explained_meaning). The quote is never rewritten. */
export function correctReference(state: ListenerState, referenceId: string, field: 'relationship' | 'explained_meaning' | 'business_target', to: string, note: string): ListenerState {
  return withAction(state, { type: 'correct', reference_id: referenceId, event_version: state.event_version, field, to, note });
}

/** CLARIFY MEANING: put the clarification question on offer for this reference. */
export function clarifyReference(state: ListenerState, referenceId: string): ListenerState {
  return withAction(state, { type: 'clarify', reference_id: referenceId, event_version: state.event_version });
}

/**
 * USE NOW / the rep said the suggested line: records `used_at`, remembers the reference so it is not
 * suggested again immediately, and clears the suggestion slot.
 */
export function markUsed(state: ListenerState, referenceId: string, turnId: string = lastProspectTurnId(state)): ListenerState {
  return rebuild(state, {
    ...state.memory,
    actions: [...state.memory.actions, { type: 'use', reference_id: referenceId, event_version: state.event_version, turn_id: turnId }],
    last_suggestion_reference_id: referenceId,
    queued_suggestion: null,
  });
}

/** The prospect's explicit reaction to a reuse. `unknown` is neither acceptance nor rejection. */
export function recordReaction(state: ListenerState, referenceId: string, reaction: Reaction, turnId: string = lastProspectTurnId(state)): ListenerState {
  const queued = reaction === 'rejected' && state.memory.queued_suggestion?.reference_id === referenceId ? null : state.memory.queued_suggestion;
  return rebuild(state, { ...state.memory, queued_suggestion: queued, actions: [...state.memory.actions, { type: 'reaction', reference_id: referenceId, event_version: state.event_version, turn_id: turnId, reaction }] });
}

/** "Not now" on the suggestion: hides that reference from the policy at this event version only. */
export function declineSuggestion(state: ListenerState, referenceId: string): ListenerState {
  return rebuild(state, { ...state.memory, queued_suggestion: null, actions: [...state.memory.actions, { type: 'suggestion_not_now', reference_id: referenceId, event_version: state.event_version }] });
}

/**
 * Put one suggestion (from `suggestPrimary`) in the single slot so `toCards` shows it on its card. A
 * suggestion whose reference is no longer usable, or that was computed against older references, is
 * refused (late outputs cannot resurrect a dismissed or rejected reference).
 */
export function queueSuggestion(state: ListenerState, suggestion: ReferenceSuggestion | null): ListenerState {
  if (suggestion === null) return { ...state, memory: { ...state.memory, queued_suggestion: null } };
  if (suggestion.input_event_version !== state.event_version) return { ...state, memory: { ...state.memory, queued_suggestion: null } };
  const valid = suggestionStillValid(state.references, suggestion, state.memory.actions.length);
  return { ...state, memory: { ...state.memory, queued_suggestion: valid.ok ? suggestion : null } };
}
