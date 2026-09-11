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
import type { RefMeaningStatus, WordProvenance } from '@/components/ui';

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

/** "rejected: revenue" when the prospect set a term aside; undefined otherwise. */
export function wordCorrection(ev: Pick<VocabularyEvent, 'correction_or_negation'>): string | undefined {
  return ev.correction_or_negation ? `rejected: ${ev.correction_or_negation.rejects}` : undefined;
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

/** "{ack} — you mentioned {referent}" → "⟨ack⟩ — you mentioned ⟨referent⟩": a shape, not words to say. */
export function bridgeShape(template: string): string {
  return template.replace(/\{([a-z0-9_|]+)\}/gi, (_m, name: string) => `⟨${name.split('|')[0]!.replace(/_/g, ' ')}⟩`);
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
