/**
 * Suggestion policy (addendum §6): at most ONE optional suggestion, template-based and grounded in
 * the prospect's own reference, matched to the current node's purpose, compatible with the approved
 * offer. Abstaining is a valid output. Never repeats the reference used in the immediately preceding
 * suggestion (unless the current turn asks for clarification); never uses a rejected reference;
 * painful analogies get a neutral acknowledgment with no domain words and no upbeat same-domain line.
 */
import type { Reference, ReferenceSuggestion } from '../schemas/listener';
import type { NormalizedTurn } from '../vocabulary/normalize';
import { escapeRegExp } from '../vocabulary/text';
import { CONCEPT_BY_ID, conceptsForTurn } from './concepts';
import { domainWordIn } from './lexicon';
import { isReusable, rankByConcept } from './retrieve';
import type { ListenerState } from './state';

export interface SuggestionNode {
  id: string;
  script_version_id: string;
  stage: string;
  why_this_now?: string;
  intended_answer_type?: string;
}

export interface ApprovedOfferSummary {
  approved_claims: string[];
  /** Price strings that ARE approved (e.g. "$1,200"); any other price number is rejected. */
  approved_price_text: string[];
}

export interface SuggestionInput {
  references: readonly Reference[];
  /** The most recent FINAL prospect turn, or null. */
  current_turn: { utterance_id: string; text: string; speaker_role: string; is_final: boolean } | null;
  node: SuggestionNode | null;
  event_version: number;
  /** Number of rep/UI actions applied so far (stamped on the suggestion for staleness checks). */
  input_action_count?: number;
  /** Reference used by the immediately preceding suggestion (if any). */
  last_suggestion_reference_id?: string | null;
  /** Reference ids the representative declined ("Not now") at this event version. */
  not_now?: readonly string[];
  approved_offer?: ApprovedOfferSummary | null;
  /** USE NOW on a card: build the line for this reference regardless of retrieval. */
  forced_reference_id?: string | null;
  /** CLARIFY MEANING on a card: offer its clarification question. */
  clarify_reference_id?: string | null;
}

export interface SuggestionDecision {
  suggestion: ReferenceSuggestion | null;
  /** Why the policy abstained or chose. Always populated. */
  reason: string;
}

const ASKS_CLARIFICATION = /\b(?:what do you mean|can you explain|say that again|clarify|not sure I follow|what does that mean|how do you mean|run that by me)\b/i;
const QUESTION_OR_CONCERN = /\?|\b(?:worried|worry|concern|concerned|afraid|what if|nervous|hesitant|not sure)\b/i;

/** Guard: a suggestion may ask questions; it cannot promise, guarantee, discount or quote unapproved numbers. */
export function offerClaimGuard(text: string, offer?: ApprovedOfferSummary | null): { ok: boolean; reason?: string } {
  const forbidden = /\b(?:guarantee[sd]?|promise[sd]?|discount(?:s|ed)?|free\b|refund(?:s|ed)?|we will make sure|we'll make sure|never fails?|can't fail|cannot fail|risk[- ]free|no[- ]risk|money[- ]back)\b/i;
  const m = forbidden.exec(text);
  if (m) return { ok: false, reason: `contains an offer claim ("${m[0]}") that an analogy cannot justify` };
  const prices = text.match(/\$\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s?%/g) ?? [];
  for (const p of prices) {
    const approved = (offer?.approved_price_text ?? []).some((a) => a.replace(/\s/g, '') === p.replace(/\s/g, ''));
    if (!approved) return { ok: false, reason: `contains a price/number ("${p}") that is not from an approved offer` };
  }
  return { ok: true };
}

/** Financial wording guard: a profit reference never has revenue substituted for it (test 7). */
export function metricGuard(reference: Reference, text: string): { ok: boolean; reason?: string } {
  const distinct = /distinct from ([a-z-]+)|, not ([a-z-]+) \(explicit correction\)/i.exec(reference.semantics.relationship);
  const rejected = distinct?.[1] ?? distinct?.[2];
  if (!rejected) return { ok: true };
  if (new RegExp(`(?<![a-z])${escapeRegExp(rejected)}(?![a-z])`, 'i').test(text)) {
    return { ok: false, reason: `uses "${rejected}", which the prospect set aside in favour of "${reference.evidence.exact_expression}"` };
  }
  return { ok: true };
}

/** Label a figure by its actual metric; a revenue figure is never relabelled as profit. */
export function labelFigure(reference: Reference, figure: { metric: string; value: number }): { label: string; mismatch: boolean; note: string } {
  const preferred = reference.evidence.exact_expression.toLowerCase();
  const mismatch = figure.metric.toLowerCase() !== preferred;
  return {
    label: figure.metric.toLowerCase(),
    mismatch,
    note: mismatch ? `${figure.metric} is not ${preferred}; ask how they get from ${figure.metric} to ${preferred} rather than assume` : `matches their stated priority "${preferred}"`,
  };
}

function domainWord(r: Reference): string {
  if (r.semantics.domain_word) return r.semantics.domain_word;
  const d = r.semantics.source_domain;
  if (d) return domainWordIn(r.evidence.exact_expression, d) ?? d;
  return r.label.split(' / ')[0]!.toLowerCase();
}

/** Grounded template for one reference and one concept. Returns null when no honest line exists. */
export function templateFor(r: Reference, conceptId: string | undefined): { text: string; purpose: string } | null {
  const concept = conceptId ? CONCEPT_BY_ID.get(conceptId) : undefined;
  const kind = r.semantics.kind;
  const exact = r.evidence.exact_expression;
  if (r.semantics.painful) {
    // Neutral acknowledgment + business-level question; no domain word, no elaboration of the image.
    return { text: `You described that setback in strong terms earlier. What did it cost you, in practical terms?`, purpose: 'neutral_acknowledgment' };
  }
  if (kind === 'emotional_descriptor') {
    if (r.semantics.meaning_status !== 'confirmed') {
      return r.reuse.proposed_clarification ? { text: r.reuse.proposed_clarification, purpose: 'clarify_meaning' } : null;
    }
    const q = concept?.question ?? 'what would need to be different this time?';
    return { text: `You said you felt ${exact.toLowerCase()}${r.semantics.business_target !== 'not stated' ? ` by ${r.semantics.business_target}` : ''}. ${q.charAt(0).toUpperCase()}${q.slice(1)}`, purpose: conceptId ?? 'answer_in_their_frame' };
  }
  if (kind === 'outcome_label' || kind === 'correction') {
    const q = concept?.question ?? `where does ${exact.toLowerCase()} come into what we are discussing?`;
    return { text: `You said ${exact.toLowerCase()} is what matters. ${q.charAt(0).toUpperCase()}${q.slice(1)}`, purpose: conceptId ?? 'answer_in_their_frame' };
  }
  if (kind === 'defined_term') {
    const meaning = r.semantics.explained_meaning?.text ?? '';
    return { text: `You defined "${exact.toLowerCase()}" as ${meaning || 'something specific'}. Does that still hold for what we are discussing?`, purpose: 'confirm_definition' };
  }
  // analogy / comparison / image
  const word = domainWord(r);
  const q = concept?.question;
  if (!q || !conceptId) return null;
  if (conceptId === 'coordination_vs_individuality') return { text: `Going back to your ${word} example, ${q}`, purpose: conceptId };
  if (conceptId === 'effort_then_failure') return { text: `Using your ${word} comparison, ${q}`, purpose: conceptId };
  return { text: `Using your ${word} example, ${q}`, purpose: conceptId };
}

function build(r: Reference, conceptId: string | undefined, input: SuggestionInput, node: SuggestionNode): SuggestionDecision {
  const t = templateFor(r, conceptId);
  if (!t) return { suggestion: null, reason: `no honest template for "${r.label}" on this concept; abstain` };
  const guard = offerClaimGuard(t.text, input.approved_offer);
  if (!guard.ok) return { suggestion: null, reason: `guard rejected the line: ${guard.reason}` };
  const metric = metricGuard(r, t.text);
  if (!metric.ok) return { suggestion: null, reason: `guard rejected the line: ${metric.reason}` };
  return {
    suggestion: {
      reference_id: r.id,
      text: t.text,
      purpose: t.purpose,
      concept_id: conceptId,
      evidence_turn_id: r.evidence.turn_id,
      script_node_id: node.id,
      script_version_id: node.script_version_id,
      input_event_version: input.event_version,
      ...(input.input_action_count === undefined ? {} : { input_action_count: input.input_action_count }),
      trigger_turn_id: input.current_turn?.utterance_id,
    },
    reason: `grounded in "${r.label}" (${r.evidence.turn_id})`,
  };
}

/**
 * The policy over an explicit input (lower level). At most one suggestion; `suggestion: null` with a
 * populated `reason` when nothing is appropriate now.
 */
export function decideSuggestion(input: SuggestionInput): SuggestionDecision {
  const node = input.node;
  if (!node) return { suggestion: null, reason: 'no current script node' };
  const notNow = new Set(input.not_now ?? []);
  const byId = new Map(input.references.map((r) => [r.id, r] as const));

  if (input.clarify_reference_id) {
    const r = byId.get(input.clarify_reference_id);
    if (!r || r.lifecycle.state === 'invalidated' || r.lifecycle.state === 'dismissed') return { suggestion: null, reason: 'clarification target is not available' };
    const text = r.reuse.proposed_clarification ?? `When you say "${r.evidence.exact_expression}," what does that mean for you here?`;
    const guard = offerClaimGuard(text, input.approved_offer);
    if (!guard.ok) return { suggestion: null, reason: guard.reason! };
    return {
      suggestion: {
        reference_id: r.id,
        text,
        purpose: 'clarify_meaning',
        evidence_turn_id: r.evidence.turn_id,
        script_node_id: node.id,
        script_version_id: node.script_version_id,
        input_event_version: input.event_version,
        ...(input.input_action_count === undefined ? {} : { input_action_count: input.input_action_count }),
        trigger_turn_id: input.current_turn?.utterance_id,
      },
      reason: 'clarification requested by the representative',
    };
  }

  if (input.forced_reference_id) {
    const r = byId.get(input.forced_reference_id);
    if (!r || !isReusable(r)) return { suggestion: null, reason: 'that reference cannot be used (dismissed, rejected, invalidated, third-party or provisional)' };
    const turnConcepts = input.current_turn ? conceptsForTurn(input.current_turn.text) : [];
    const conceptId = r.semantics.concept_ids.find((c) => turnConcepts.includes(c)) ?? r.semantics.concept_ids.find((c) => (CONCEPT_BY_ID.get(c)?.stages ?? []).includes(node.stage)) ?? r.semantics.concept_ids[0];
    return build(r, conceptId, input, node);
  }

  const turn = input.current_turn;
  if (!turn || turn.speaker_role !== 'prospect' || !turn.is_final) return { suggestion: null, reason: 'no final prospect turn to respond to' };
  const asksClarification = ASKS_CLARIFICATION.test(turn.text);
  const candidates = rankByConcept(turn.text, input.references, node.stage).filter((c) => {
    if (notNow.has(c.reference.id)) return false;
    if (input.last_suggestion_reference_id && c.reference.id === input.last_suggestion_reference_id && !asksClarification) return false;
    return true;
  });
  if (candidates.length === 0) return { suggestion: null, reason: 'no earlier reference matches the concept of the current turn; abstain' };
  for (const cand of candidates) {
    const conceptId = cand.matched_concepts[0];
    const nodeText = `${node.why_this_now ?? ''} ${node.intended_answer_type ?? ''}`;
    const nodePurposeMatch = conceptId !== undefined && conceptsForTurn(nodeText).includes(conceptId);
    const stageMatch = cand.stage_match || nodePurposeMatch;
    const directQuestion = QUESTION_OR_CONCERN.test(turn.text);
    if (!stageMatch && !directQuestion) continue; // not this node's purpose and not a question — abstain
    const decision = build(cand.reference, conceptId, input, node);
    if (decision.suggestion) return { ...decision, reason: `${decision.reason}; concept ${conceptId}; ${stageMatch ? `matches stage ${node.stage}` : "answers the prospect's question in their frame"}` };
  }
  return { suggestion: null, reason: 'matching references exist but none fits this node purpose without an unsupported claim; abstain' };
}

// ---------------------------------------------------------------------------------------------
// State-based entry points (frozen API)
// ---------------------------------------------------------------------------------------------

/** The turn a suggestion may respond to: the most recent FINAL prospect turn, or null. */
export function currentProspectTurn(state: Pick<ListenerState, 'normalized'>): SuggestionInput['current_turn'] {
  const t = [...state.normalized.turns].reverse().find((x: NormalizedTurn) => x.speaker_role === 'prospect' && x.is_final);
  return t ? { utterance_id: t.utterance_id, text: t.text, speaker_role: t.speaker_role, is_final: t.is_final } : null;
}

/** Script context for one suggestion. Only `node` is required; everything else defaults from the state. */
export interface SuggestionContext {
  /** The script node the rep is on (id, version, stage, why-now / intended answer). Null → abstain. */
  node: SuggestionNode | null;
  /** Override the turn to respond to (default: the latest final prospect turn in the state). */
  current_turn?: SuggestionInput['current_turn'];
  /** Approved-offer summary so an approved price may appear; any other price/guarantee is rejected. */
  approved_offer?: ApprovedOfferSummary | null;
  /** USE NOW on a card: build the line for this reference regardless of retrieval. */
  forced_reference_id?: string | null;
  /** CLARIFY MEANING on a card: offer its clarification question. */
  clarify_reference_id?: string | null;
}

/** Build the policy input from a state: references, current turn, no-repeat id and "not now" declines. */
export function suggestionInputFor(state: ListenerState, ctx: SuggestionContext): SuggestionInput {
  const notNow = state.memory.actions.filter((a) => a.type === 'suggestion_not_now' && a.event_version === state.event_version).map((a) => a.reference_id);
  return {
    references: state.references,
    current_turn: ctx.current_turn === undefined ? currentProspectTurn(state) : ctx.current_turn,
    node: ctx.node,
    event_version: state.event_version,
    input_action_count: state.memory.actions.length,
    last_suggestion_reference_id: state.memory.last_suggestion_reference_id,
    not_now: notNow,
    approved_offer: ctx.approved_offer ?? null,
    forced_reference_id: ctx.forced_reference_id ?? null,
    clarify_reference_id: ctx.clarify_reference_id ?? null,
  };
}

/** Same as `suggestPrimary` but with the policy's reason (for logs, tests and the "why this" affordance). */
export function decideForState(state: ListenerState, ctx: SuggestionContext): SuggestionDecision {
  return decideSuggestion(suggestionInputFor(state, ctx));
}

/**
 * Frozen API. At most ONE suggestion for the current turn and script node, grounded in one of the
 * prospect's own references, or `null` (abstaining is the normal output). Never repeats the reference
 * the rep just used, never uses a dismissed/rejected/invalidated/third-party reference, never emits a
 * guarantee, promise, discount or unapproved price.
 */
export function suggestPrimary(state: ListenerState, ctx: SuggestionContext): ReferenceSuggestion | null {
  return decideForState(state, ctx).suggestion;
}

/**
 * Is a previously computed suggestion still honest against the current references? False when its
 * reference is gone, dismissed/rejected/invalidated, do-not-reuse, or changed after the suggestion was
 * computed (stale). Used to drop the queued suggestion and to refuse late outputs.
 */
export function suggestionStillValid(references: readonly Reference[], suggestion: ReferenceSuggestion, actionCount?: number): { ok: boolean; reason: string } {
  if (actionCount !== undefined && suggestion.input_action_count !== undefined && suggestion.input_action_count !== actionCount) {
    return { ok: false, reason: `stale: computed after ${suggestion.input_action_count} actions, the log now has ${actionCount}` };
  }
  const r = references.find((x) => x.id === suggestion.reference_id);
  if (!r) return { ok: false, reason: 'reference no longer exists' };
  if (r.lifecycle.state === 'dismissed' || r.lifecycle.state === 'rejected' || r.lifecycle.state === 'invalidated') {
    return { ok: false, reason: `reference is ${r.lifecycle.state}; suggestion dropped` };
  }
  if (r.reuse.do_not_reuse) return { ok: false, reason: 'reference is marked do-not-reuse' };
  if (r.updated_event_version > suggestion.input_event_version) {
    return { ok: false, reason: `stale: computed at event ${suggestion.input_event_version}, reference changed at ${r.updated_event_version}` };
  }
  return { ok: true, reason: 'valid' };
}

export interface ApplyResult {
  ok: boolean;
  reason: string;
  references: Reference[];
}

/** Accept a suggestion only if its reference is still usable and it is not stale. */
export function applySuggestion(references: Reference[], suggestion: ReferenceSuggestion, turnId: string, eventVersion: number): ApplyResult {
  const valid = suggestionStillValid(references, suggestion);
  if (!valid.ok) return { ok: false, reason: valid.reason, references };
  const r = references.find((x) => x.id === suggestion.reference_id)!;
  const next = references.map((x) => (x.id === r.id ? { ...x, updated_event_version: Math.max(x.updated_event_version, eventVersion), reuse: { ...x.reuse, used_at: [...x.reuse.used_at, { turn_id: turnId, event_version: eventVersion }] } } : x));
  return { ok: true, reason: 'applied', references: next };
}
