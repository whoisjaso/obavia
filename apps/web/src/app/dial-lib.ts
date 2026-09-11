/**
 * Thin adapters between the domain packages and the Dial / In-call screens. No React.
 *
 * Listener: imported only from '@apohenia/domain/listener' (its index exports are frozen). The
 * suggestion policy is driven through `decideSuggestion(input)` — the lower-level, state-free entry
 * point — because the in-call screen keeps its own persisted action log per attempt.
 */
import { z } from 'zod';
import { decideSuggestion, listenerFromTurns, meaningStatusText, shortMeaning, type SuggestionDecision } from '@apohenia/domain/listener';
import { provenanceLabel, type Fact, type RankedCandidate } from '@apohenia/domain/vocabulary';
import { resolveSlots, type KnownFacts } from '@apohenia/domain/scripts';
import { ListenerAction, PinState } from '@apohenia/domain/schemas';
import type { Reference, ReferenceSuggestion, ScriptNode, TranscriptTurn, VocabularyEvent } from '@apohenia/domain/schemas';
import type { IconName, RefMeaningStatus, WordProvenance } from '@/components/ui';
import { bridgeParts, type BridgePart } from '@/lib/line-parts';

// ---------------------------------------------------------------------------------------------
// THEIR WORDS
// ---------------------------------------------------------------------------------------------

/** Provenance glyph word for a WordCard: ● said · ◐ confirmed · ○ yours · ◌ hypothesis. */
export function wordProvenance(ev: Pick<VocabularyEvent, 'provenance'>): WordProvenance {
  switch (ev.provenance) {
    case 'prospect_said':
      return 'said';
    case 'seller_proposed_prospect_confirmed':
      return 'confirmed';
    case 'model_hypothesis':
      return 'hypothesis';
    default:
      return 'yours';
  }
}

/** Full accessible provenance sentence (from the vocabulary module — never restated here). */
export function wordProvenanceName(ev: VocabularyEvent): string {
  return provenanceLabel(ev);
}

/** The word the prospect set aside ("revenue" in "profit, not revenue"); undefined otherwise. */
export function wordCorrection(ev: Pick<VocabularyEvent, 'correction_or_negation'>): string | undefined {
  return ev.correction_or_negation?.rejects;
}

/** Normalized key for matching a reference label against a pinned word ("PROFIT (NOT REVENUE)" → "profit"). */
export function panelKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Vocabulary facts ("{prospect_name}") → script known facts ("prospect_name"). */
export function toKnownFacts(facts: readonly Fact[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of facts) out[f.key.replace(/^\{|\}$/g, '')] = f.value;
  return out;
}

// ---------------------------------------------------------------------------------------------
// THEIR REFERENCES
// ---------------------------------------------------------------------------------------------

export function refMeaningStatus(r: Reference): RefMeaningStatus {
  return r.semantics.meaning_status;
}

/** Accessible name for the meaning glyph (from the listener module). */
export function refMeaningName(r: Reference): string {
  return `meaning ${meaningStatusText(r)}`;
}

export function refMeaningLine(r: Reference): string {
  return shortMeaning(r);
}

/** One plain clause, ≤8 words, for the card: "profit, not revenue" (the full relationship stays in the sheet). */
export function plainMeaning(r: Reference): string {
  if (r.lifecycle.state === 'invalidated') return 'evidence retracted';
  if (r.lifecycle.state === 'rejected') return 'set aside by them';
  const rel = r.semantics.relationship
    .replace(/^[^:]+:\s*/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .split(/\s+[—–-]\s+/)[0]!
    .replace(/[.;:,\s]+$/g, '')
    .trim();
  const words = rel.split(/\s+/).filter(Boolean);
  return words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : rel;
}

/** "PROFIT (NOT REVENUE)" → title "PROFIT" + aside "not revenue" (the set-aside word, shown struck through). */
export function splitRefLabel(label: string): { title: string; aside: string | null } {
  const m = /^(.*?)\s*\((not\s+[^)]+)\)\s*$/i.exec(label);
  return m ? { title: m[1]!.trim(), aside: m[2]!.trim().toLowerCase() } : { title: label, aside: null };
}

/** One imperative line from the reference's prohibited inferences ("Use their word: profit, not revenue"). */
export function guidanceLine(r: Reference): string | null {
  const { title, aside } = splitRefLabel(r.label);
  if (aside) return `Use their word: ${title.toLowerCase()}, ${aside}`;
  if (r.semantics.prohibited_inferences.length === 0) return null;
  return 'Use their example — never their biography';
}

/** E.164 → a readable NANP number "(555) 010-0001"; anything else is returned unchanged. */
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** Cards worth showing on the rail: held/pinned first-appearance order, then muted states, max `max`. */
export function referencesForRail(references: readonly Reference[], max = 7): Reference[] {
  const live = references.filter((r) => r.lifecycle.state === 'held' || r.lifecycle.state === 'pinned');
  const rest = references.filter((r) => !live.includes(r));
  return [...live, ...rest].slice(0, Math.max(max, live.length));
}

/** The most recent FINAL prospect turn among the normalized turns. */
export function latestProspectTurn(turns: readonly TranscriptTurn[]): { utterance_id: string; text: string; speaker_role: string; is_final: boolean } | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.speaker_role === 'prospect' && t.is_final) return { utterance_id: t.utterance_id, text: t.text, speaker_role: t.speaker_role, is_final: t.is_final };
  }
  return null;
}

export interface OverlayRequest {
  kind: 'use' | 'clarify';
  reference_id: string;
}

export interface OverlayArgs {
  references: readonly Reference[];
  normalizedTurns: readonly TranscriptTurn[];
  node: ScriptNode | null;
  eventVersion: number;
  lastUsedReferenceId: string | null;
  notNow: readonly { reference_id: string; event_version: number }[];
  overlay: OverlayRequest | null;
}

/** One optional suggestion for the current turn/node (abstaining is normal). Never auto-applied. */
export function decideOverlay(args: OverlayArgs): SuggestionDecision {
  return decideSuggestion({
    references: args.references,
    current_turn: latestProspectTurn(args.normalizedTurns),
    node: args.node ? { id: args.node.id, script_version_id: args.node.script_version_id, stage: args.node.stage, why_this_now: args.node.why_this_now, intended_answer_type: args.node.intended_answer_type } : null,
    event_version: args.eventVersion,
    last_suggestion_reference_id: args.lastUsedReferenceId,
    not_now: args.notNow.filter((n) => n.event_version === args.eventVersion).map((n) => n.reference_id),
    forced_reference_id: args.overlay?.kind === 'use' ? args.overlay.reference_id : null,
    clarify_reference_id: args.overlay?.kind === 'clarify' ? args.overlay.reference_id : null,
  });
}

/** Run the listener over the played turns with the persisted action log. */
export function listenerOver(turns: readonly TranscriptTurn[], callId: string, actions: readonly ListenerAction[]) {
  return listenerFromTurns(turns, { call_id: callId, actions });
}

export type { ReferenceSuggestion };

// ---------------------------------------------------------------------------------------------
// Script line
// ---------------------------------------------------------------------------------------------

/** Resolve the primary line's slots from confirmed facts only; missing slots render the visible cue. */
export function resolveLine(node: ScriptNode, knownFacts: KnownFacts): string {
  return resolveSlots(node.primary_word_track, { knownFacts }).text;
}

/** The bridge template as glyph cues (◐ ack · ● their word · ? question) — a shape, never words to say. */
export function bridgeShape(template: string): BridgePart[] {
  return bridgeParts(template);
}

/** Resolve a mirror variant against the record (never invents; unfilled slots stay as chips). */
export function resolveMirror(text: string, knownFacts: KnownFacts): string {
  return resolveSlots(text, { knownFacts }).text;
}

// ---------------------------------------------------------------------------------------------
// Branch chips: ≤3 visible words + a distinct icon per answer category; the full label is the name.
// ---------------------------------------------------------------------------------------------

const CHIP_LABELS: Record<string, string> = {
  permission_granted: 'Go ahead',
  gatekeeper: 'Gatekeeper',
  bad_time: 'Bad time',
  not_relevant: 'Not relevant',
  opt_out: 'Decline',
  declined: 'Declines',
  transferred: 'Transferred',
  name_given: 'Name given',
  take_message: 'Takes message',
  agreed: 'Agreed',
  talk_now: 'Talk now',
  confirmed: 'Confirmed',
  doesnt_recall: "Doesn't recall",
  wrong_person: 'Wrong person',
  missing_notes: 'Goal missing',
  disputed: 'Disputed',
  tangible_given: 'Tangible',
  experience_included: 'Problem too',
  no_goal: 'No goal',
  experience_given: 'Experience',
  generic_goal_repeated: 'Generic again',
  no_problem: 'No problem',
  described: 'Described',
  already_known: 'On record',
  unknown: 'Unknown',
  answered: 'Answered',
  something_to_keep: 'Keep something',
  nothing_liked: 'Nothing liked',
  specific_problem: 'Specific',
  label_only: 'Label only',
  nothing_to_change: 'Nothing',
  impact_described_setter: 'Impact · setter',
  impact_described_closer: 'Impact · closer',
  no_impact: 'No impact',
  target_and_gap: 'Target · gap',
  unqualified_signal: 'Too small',
  would_invest: 'Would fund',
  would_not: 'Not now',
  lack_authority: 'Not their call',
  prefers_nurture: 'Resource first',
  rationale_given: 'Rationale',
  prefers_diy: 'In-house',
  never_looked: 'Never looked',
  looked_not_proceeded: 'Looked, stopped',
  proceeded_bad: 'Bad result',
  proceeded_good: 'Good result',
  mixed_result: 'Mixed result',
  still_active_provider: 'Has provider',
  changed_priorities: 'Priorities moved',
  no_actual_problem: 'No problem',
  lack_authority_budget: 'No authority',
  shifted_explained: 'Shift explained',
  plausible_reason_accepted: 'Plausible reason',
  still_constrained: 'Still constrained',
  identity_frame_practice_only: 'Identity frame',
  criteria_given: 'Criteria',
  bottleneck_named: 'Bottleneck',
  still_active_no_gap: 'No gap',
  practice_complete: 'Done',
  specific_outcomes: 'Specific',
  vague_word: 'Vague word',
  meaning_given: 'Meaning',
  still_vague: 'Still vague',
  consequences_stated: 'Consequences',
  no_consequence: 'None',
  not_settling: 'Not settling',
  would_settle: 'Would settle',
  reason_given: 'Reason',
  responsibility_optional: 'Whose call',
  no_reason_now: 'No reason',
  mine: 'Their decision',
  someone_else: 'Someone else',
  yes: 'Yes',
  yes_upsell_compare: 'Yes · compare',
  not_yet: 'Not yet',
  makes_sense: 'Makes sense',
  question: 'Question',
  end: 'End',
};

/** ≤3 visible words for a branch chip: the curated label, else the first three words of the label. */
export function chipLabel(branch: { answer_category: string; label: string }): string {
  const known = CHIP_LABELS[branch.answer_category];
  if (known) return known;
  const words = branch.label.replace(/\s*\([^)]*\)/g, '').replace(/[—–].*$/, '').trim().split(/\s+/);
  return words.slice(0, 3).join(' ');
}

/** A distinct icon per branch kind (check · shield · clock · x · ban · …) instead of one arrow for all. */
export function branchIcon(branch: { answer_category: string; next_node_id: string | null }): IconName {
  const c = branch.answer_category;
  if (c === 'opt_out') return 'ban';
  if (/gatekeeper|wrong_person|lack_authority|someone_else|transferred|take_message|name_given/.test(c)) return 'shield';
  if (/bad_time|not_now|would_not|not_yet|later|prefers_nurture|changed_priorities|no_reason_now/.test(c)) return 'clock';
  if (/declin|not_relevant|no_fit|no_problem|no_actual|nothing|no_goal|no_impact|no_consequence|would_settle|still_vague|generic|label_only|no_gap|still_constrained|unqualified|too_small/.test(c)) return 'x';
  if (/question|unknown|doesnt_recall|disputed|missing_notes|vague_word|mixed/.test(c)) return 'search';
  if (/practice|identity_frame|responsibility/.test(c)) return 'bookmark';
  if (branch.next_node_id === null) return 'flag';
  return 'check';
}

/** The default "next" for tap/Space: the first branch that leads somewhere. */
export function defaultNextNodeId(node: ScriptNode): string | null {
  return node.branches.find((b) => b.next_node_id !== null)?.next_node_id ?? null;
}

// ---------------------------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------------------------

export interface LocalTime {
  text: string;
  hour: number;
  /** 9:00–17:59 local = a reasonable calling window. */
  withinHours: boolean;
  /** Full accessible name. */
  name: string;
}

export function localTimeIn(timezone: string, now: number): LocalTime | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone });
    const parts = fmt.formatToParts(new Date(now));
    const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';
    const hour24 = (hourPart % 12) + (dayPeriod.toUpperCase() === 'PM' ? 12 : 0);
    const text = fmt.format(new Date(now)).replace(/\s?(AM|PM)$/i, (m) => m.trim().toLowerCase());
    const withinHours = hour24 >= 9 && hour24 < 18;
    return { text, hour: hour24, withinHours, name: `Local time ${fmt.format(new Date(now))} (${timezone}) — ${withinHours ? 'within' : 'outside'} calling hours` };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Persisted in-call state (per attempt)
// ---------------------------------------------------------------------------------------------

export const InCallState = z.object({
  attempt_id: z.string(),
  node_id: z.string().nullable(),
  /** Node ids visited before the current one (← goes back). */
  history: z.array(z.string()),
  /** Snapshot of the rendered primary line — frozen while the node is on screen (never re-flows). */
  line_text: z.string(),
  pins: PinState,
  clarified: z.array(z.string()),
  ref_actions: z.array(ListenerAction),
  not_now: z.array(z.object({ reference_id: z.string(), event_version: z.number().int().nonnegative() })),
  last_used_ref: z.string().nullable(),
  overlay: z.object({ kind: z.enum(['use', 'clarify']), reference_id: z.string() }).nullable(),
});
export type InCallState = z.infer<typeof InCallState>;

export const EMPTY_IN_CALL: InCallState = {
  attempt_id: '',
  node_id: null,
  history: [],
  line_text: '',
  pins: { order: [], manual: [], unpinned: [] },
  clarified: [],
  ref_actions: [],
  not_now: [],
  last_used_ref: null,
  overlay: null,
};

/** Ranked candidates by event id (helper for pin actions). */
export function candidateById(ranked: readonly RankedCandidate[]): Map<string, RankedCandidate> {
  return new Map(ranked.map((r) => [r.event.id, r] as const));
}
