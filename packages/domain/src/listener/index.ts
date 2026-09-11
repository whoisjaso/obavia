/**
 * Personal Meaning Listener — FROZEN public API (addendum v3). Owning module agent: M-listener.
 *
 * Pure TypeScript, no model, no network: first-mention reference extraction from finalized prospect
 * turns, evidence validation, conversation-scoped memory with lifecycle actions, concept-based delayed
 * recall, a one-suggestion policy with offer/metric guards, and UI-ready cards.
 *
 * Everything below is stable for the call room (M-core). Signatures:
 *
 *   listenerFromTurns(turns, ctx?)                       → ListenerState
 *   listenerFromMemory(memory, ctx?)                     → ListenerState
 *   applyTurn(state, turn, ctx?)                         → ListenerState
 *   invalidateForRevision(state, revisedTurn)            → ListenerState
 *   retrieveByConcept(state | refs, turnText, stageId?)  → Reference[]
 *   suggestPrimary(state, { node, … })                   → ReferenceSuggestion | null
 *   queueSuggestion(state, suggestion | null)            → ListenerState
 *   pinReference / unpinReference / keepReference / dismissReference / forbidReuse /
 *   rejectReference / correctReference / clarifyReference / markUsed / recordReaction /
 *   declineSuggestion(state, referenceId, …)             → ListenerState
 *   toCards(state)                                       → ReferenceCard[]
 *
 * Same path for live and mock: every entry point takes transcript turns + script context only. A
 * practice scenario's hidden fact sheet is not a TranscriptTurn and cannot be passed in.
 */

export const MODULE = 'listener' as const;

// --- State -------------------------------------------------------------------------------------

export {
  /**
   * `listenerFromTurns(turns: readonly TranscriptTurn[], ctx?: ListenerOptions): ListenerState`
   * Build the whole state from raw provider events (dedupe + revisions + extraction + validation +
   * action replay). Deterministic. `ctx.window: 'partial'` marks a transcript that does not start at
   * the beginning (origin becomes `unknown`, never spontaneous by default).
   */
  listenerFromTurns,
  /** `listenerFromMemory(memory: ListenerMemory, ctx?: ListenerContext): ListenerState` — restore after reload. */
  listenerFromMemory,
  /**
   * `applyTurn(state, turn: TranscriptTurn, ctx?): ListenerState`
   * Incremental: consume ONE event (partial/final/revision/duplicate). Duplicates never duplicate
   * references or inflate counts; a revision invalidates dependents; a new final prospect turn drops the
   * queued suggestion (ask `suggestPrimary` again for the new turn).
   */
  applyTurn,
  /**
   * `invalidateForRevision(state, revisedTurn: TranscriptTurn): ListenerState`
   * Explicit revision path: drops any queued suggestion built on that utterance BEFORE recomputing, then
   * behaves like `applyTurn`. Invalidated cards stay visible with state `invalidated` and a reason.
   */
  invalidateForRevision,
  /** `pinReference(state, referenceId): ListenerState` — protects position, not accuracy. No-op on rejected/invalidated. */
  pinReference,
  /** `unpinReference(state, referenceId): ListenerState` */
  unpinReference,
  /** `keepReference(state, referenceId): ListenerState` — KEEP FOR LATER (held, no interruption, no personal-history question). */
  keepReference,
  /** `dismissReference(state, referenceId, reason?): ListenerState` — leaves the visible set; never resurrected by a late output. */
  dismissReference,
  /** `forbidReuse(state, referenceId): ListenerState` — "do not reuse this reference"; the card stays as evidence. */
  forbidReuse,
  /** `rejectReference(state, referenceId, turnId?): ListenerState` — the prospect rejected it; state `rejected`, never suggested again. */
  rejectReference,
  /**
   * `correctReference(state, referenceId, field: 'relationship' | 'explained_meaning' | 'business_target', to, note): ListenerState`
   * Rep correction; the original stays in `correction_history`, evidence becomes `corrected`, the quote is never rewritten.
   */
  correctReference,
  /** `clarifyReference(state, referenceId): ListenerState` — CLARIFY MEANING pressed; the clarification question is on offer. */
  clarifyReference,
  /** `markUsed(state, referenceId, turnId?): ListenerState` — USE NOW / line said: records `used_at`, blocks an immediate repeat, clears the slot. */
  markUsed,
  /** `recordReaction(state, referenceId, reaction: 'accepted' | 'rejected' | 'unknown', turnId?): ListenerState` — `unknown` is neither. */
  recordReaction,
  /** `declineSuggestion(state, referenceId): ListenerState` — "Not now": hidden from the policy at this event version only. */
  declineSuggestion,
  /**
   * `queueSuggestion(state, suggestion: ReferenceSuggestion | null): ListenerState`
   * Put the ONE suggestion in the slot so `toCards` shows it on its card. Refused (slot cleared) when it is
   * stale or its reference is dismissed/rejected/invalidated/do-not-reuse.
   */
  queueSuggestion,
} from './state';
export type { ListenerState, ListenerResult, ListenerOptions } from './state';

// --- Retrieval + suggestion --------------------------------------------------------------------

export {
  /**
   * `retrieveByConcept(state | readonly Reference[], currentTurnText: string, stageId?: string): Reference[]`
   * Earlier references that share a CONCEPT with the current turn (no noun matching needed), best first,
   * whole conversation, only reusable ones. Empty array is the normal case.
   */
  retrieveByConcept,
  /** `rankByConcept(turnText, references, stageId?): RetrievedReference[]` — same, with matched concepts and score. */
  rankByConcept,
  /** `isReusable(reference): boolean` — held/pinned, final, not third-party, not rejected, not do-not-reuse. */
  isReusable,
} from './retrieve';
export type { RetrievedReference } from './retrieve';

export {
  /**
   * `suggestPrimary(state, ctx: SuggestionContext): ReferenceSuggestion | null`
   * At most one suggestion for the latest final prospect turn and `ctx.node`, grounded in one of the
   * prospect's own references; `null` = abstain (normal). Reads the no-repeat id and "not now" declines
   * from `state.memory`. Never a guarantee/promise/discount/unapproved price; painful analogies get a
   * neutral acknowledgment with no domain word.
   */
  suggestPrimary,
  /** `decideForState(state, ctx): SuggestionDecision` — `suggestPrimary` plus the policy's reason. */
  decideForState,
  /** `decideSuggestion(input: SuggestionInput): SuggestionDecision` — the policy over an explicit input (lower level). */
  decideSuggestion,
  /** `suggestionInputFor(state, ctx): SuggestionInput` — how the state becomes policy input (for tests/diagnostics). */
  suggestionInputFor,
  /** `currentProspectTurn(state): { utterance_id, text, speaker_role, is_final } | null` — latest FINAL prospect turn. */
  currentProspectTurn,
  /** `suggestionStillValid(references, suggestion): { ok, reason }` — refuses late/stale outputs and unusable references. */
  suggestionStillValid,
  /** `applySuggestion(references, suggestion, turnId, eventVersion): ApplyResult` — reference-level apply with the same refusal rules. */
  applySuggestion,
  /** `offerClaimGuard(text, approvedOffer?): { ok, reason? }` — rejects guarantees, promises, discounts, refunds, unapproved prices. */
  offerClaimGuard,
  /** `metricGuard(reference, text): { ok, reason? }` — a "profit, not revenue" reference never gets revenue substituted. */
  metricGuard,
  /** `labelFigure(reference, { metric, value }): { label, mismatch, note }` — a revenue figure is never relabelled as profit. */
  labelFigure,
  /** `templateFor(reference, conceptId?): { text, purpose } | null` — the grounded line for one reference/concept, or null. */
  templateFor,
} from './suggest';
export type { SuggestionContext, SuggestionInput, SuggestionDecision, SuggestionNode, ApprovedOfferSummary, ApplyResult } from './suggest';

// --- Cards -------------------------------------------------------------------------------------

export {
  /**
   * `toCards(state): ReferenceCard[]`
   * UI-ready cards in first-appearance order: { id, label, meaning_line, meaning_status, glyph, glyph_name,
   * origin, origin_label, valence, evidence: { quote, turn_id, exact_expression, status }, state, state_line,
   * pinned, kept_for_later, do_not_reuse, painful, represents, useful_when, confirmed_meaning?,
   * prohibited_inferences, clarification?, actions: { keep, use, clarify }, suggestion?, concept_ids }.
   */
  toCards,
  /** `toCard(reference): ReferenceCard` — one card without the suggestion. */
  toCard,
  /** `visibleCards(cards, max = 7): ReferenceCard[]` — held + pinned in order; pinned always survive the cap. */
  visibleCards,
  /** `shortMeaning(reference): string` — the one-line meaning for the collapsed card. */
  shortMeaning,
  /** `meaningStatusText(reference): string` — accessible name of the meaning glyph. */
  meaningStatusText,
  /** `meaningGlyph(reference): '◉' | '◌' | '✓' | '?' | '⊘'` */
  meaningGlyph,
  /** `originLabel(origin): string` */
  originLabel,
} from './cards';

// --- Extraction + evidence (lower level; stable but not needed by the call room) ---------------

export {
  /** `extractReferences(normalized, rawTurns, ctx?): { references, not_eligible }` — the rule-based extractor over a transcript. */
  extractReferences,
  /** `extractTurn(turn, knownNames?): TurnExtraction` — candidates from ONE prospect turn. */
  extractTurn,
  /** `toCodePointOffset(text, utf16Index): number` — evidence spans are Unicode code-point offsets. */
  toCodePointOffset,
  /** `sliceCodePoints(text, start, end): string` */
  sliceCodePoints,
} from './extract';
export type { ListenerContext, NotEligible, ExtractResult, TurnExtraction } from './extract';

export {
  /** `validateEvidence(evidence, normalizedTurns, speakerRole?): { ok, reason? }` — exact span, prospect turn, right revision. */
  validateEvidence,
  /** `validateProposal(proposal, normalizedTurns): { ok, reason? }` — any model/external proposal goes through the same validator. */
  validateProposal,
  /** `applyRevisions(latest, previous, normalized, eventVersion): Reference[]` — revision retraction → `invalidated`. */
  applyRevisions,
  /** `invalidateFailedEvidence(references, normalizedTurns, eventVersion): Reference[]` */
  invalidateFailedEvidence,
  /** `applyAction(references, action): Reference[]` — one persisted rep/UI action. */
  applyAction,
  /** `applyListenerActions(references, actions): Reference[]` — replay the action log (deterministic). */
  applyListenerActions,
  /** `eventVersionOf(rawTurns): number` */
  eventVersionOf,
} from './memory';
export type { ValidationResult, ReferenceProposal } from './memory';

// --- Lexicons (open; extend, never a closed detector) -------------------------------------------

export { CONCEPTS, CONCEPT_BY_ID, conceptsForRelationship, conceptsForTurn, stagesForConcepts } from './concepts';
export type { Concept } from './concepts';
export { EMOTIONAL_LEXICON, PAINFUL_WORDS, IDIOMS, DOMAIN_WORDS, domainFor, domainWordIn, isPainful, containsIdiom } from './lexicon';
export type { EmotionalEntry } from './lexicon';
