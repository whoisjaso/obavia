/**
 * Personal Meaning Listener (addendum v3 §8) — first-mention references, evidence, semantics,
 * lifecycle and reuse. Tenant/call scoped. Exact text lives in `evidence`; the normalized label
 * lives beside it and is never quoted as if the prospect said it.
 *
 * Owning module agent: M-listener. Additive to repo conventions; consumed by the call room and /calls.
 */
import { z } from 'zod';
import { SpeakerRole, TranscriptTurn } from './transcript';

export const LISTENER_SCHEMA_VERSION = '1.0.0' as const;
export const LISTENER_EXTRACTOR_VERSION = '1.0.0' as const;

export const ReferenceKind = z.enum(['analogy', 'image', 'comparison', 'emotional_descriptor', 'outcome_label', 'defined_term', 'correction']);
export type ReferenceKind = z.infer<typeof ReferenceKind>;

export const ReferenceOrigin = z.enum(['prospect_spontaneous', 'prompted', 'seller_introduced_prospect_confirmed', 'third_party', 'unknown']);
export type ReferenceOrigin = z.infer<typeof ReferenceOrigin>;

/** Interpretation status of the reference's meaning in THIS context (addendum §3). */
export const ReferenceMeaningStatus = z.enum(['observed', 'inferred', 'confirmed', 'unknown']);
export type ReferenceMeaningStatus = z.infer<typeof ReferenceMeaningStatus>;

export const EvidenceStatus = z.enum(['provisional', 'final', 'corrected']);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

export const ReferenceState = z.enum(['held', 'pinned', 'dismissed', 'rejected', 'invalidated']);
export type ReferenceState = z.infer<typeof ReferenceState>;

export const Polarity = z.enum(['positive', 'negative', 'mixed', 'neutral']);
export type Polarity = z.infer<typeof Polarity>;

export const ReferenceEvidence = z.object({
  /** The distinctive expression exactly as it appears in the turn text. */
  exact_expression: z.string(),
  /** The sentence (or clause) the expression sits in, exactly as transcribed. */
  supporting_quote: z.string(),
  utterance_id: z.string(),
  turn_id: z.string(),
  /** Unicode CODE-POINT offsets of `exact_expression` within the turn text (not UTF-16 units). */
  span: z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() }),
  revision: z.number().int().nonnegative(),
  status: EvidenceStatus,
  /** Only when the turn supplied `started_at`; never invented. */
  timestamp: z.string().optional(),
});
export type ReferenceEvidence = z.infer<typeof ReferenceEvidence>;

export const ReferenceValence = z.object({
  polarity: Polarity,
  /** What the valence attaches to ("the setback"), never the domain ("basketball"). */
  object: z.string(),
});
export type ReferenceValence = z.infer<typeof ReferenceValence>;

export const ReferenceSemantics = z.object({
  kind: ReferenceKind,
  /** Analogy domain when one is recognisable ("hockey", "jazz", "cooking"); open vocabulary. */
  source_domain: z.string().optional(),
  /** The word to say when reusing the reference ("hockey", "soufflé") — taken from the prospect's own head noun. */
  domain_word: z.string().optional(),
  /** The business thing the reference describes ("how the team handles inquiries"). */
  business_target: z.string(),
  /** The comparison relationship, not the noun ("individual style vs lack of coordination"). */
  relationship: z.string(),
  valence: ReferenceValence,
  origin: ReferenceOrigin,
  meaning_status: ReferenceMeaningStatus,
  explained_meaning: z.object({ text: z.string(), evidence_turn_id: z.string() }).optional(),
  /** Explicit prohibitions ("no hobby/biography inference"). Always shown beside the interpretation. */
  prohibited_inferences: z.array(z.string()),
  /** Concept ids from the listener lexicon, derived from the relationship clause. */
  concept_ids: z.array(z.string()),
  /** The analogy concerns an intensely painful event: neutral acknowledgment only, never elaborated. */
  painful: z.boolean(),
});
export type ReferenceSemantics = z.infer<typeof ReferenceSemantics>;

export const CorrectionEntry = z.object({
  at_event_version: z.number().int().nonnegative(),
  field: z.string(),
  from: z.string(),
  to: z.string(),
  by: z.enum(['rep', 'transcript_revision']),
  /** Evidence note supplied with a rep correction. */
  note: z.string().optional(),
});
export type CorrectionEntry = z.infer<typeof CorrectionEntry>;

export const ReferenceLifecycle = z.object({
  first_turn_id: z.string(),
  last_turn_id: z.string(),
  occurrence_count: z.number().int().positive(),
  state: ReferenceState,
  reason: z.string().optional(),
  correction_history: z.array(CorrectionEntry),
  /** KEEP FOR LATER was pressed; the reference is held without interrupting the call. */
  kept_for_later: z.boolean(),
});
export type ReferenceLifecycle = z.infer<typeof ReferenceLifecycle>;

export const Reaction = z.enum(['accepted', 'rejected', 'unknown']);
export type Reaction = z.infer<typeof Reaction>;

export const ReferenceReuse = z.object({
  /** Stage ids / concept ids where the reference could help later. */
  candidate_purposes: z.array(z.string()),
  relevance_explanation: z.string(),
  /** "Using your hockey example…" — justified by the example alone. */
  allowed_mapping: z.string(),
  /** "Since you grew up playing hockey…" — never justified by the example. */
  disallowed_mapping_examples: z.array(z.string()),
  proposed_clarification: z.string().optional(),
  bridge_text: z.string().optional(),
  used_at: z.array(z.object({ turn_id: z.string(), event_version: z.number().int().nonnegative() })),
  reactions: z.array(z.object({ turn_id: z.string(), reaction: Reaction })),
  do_not_reuse: z.boolean(),
  /** CLARIFY MEANING was pressed; the clarification question is on offer. */
  clarification_requested: z.boolean(),
});
export type ReferenceReuse = z.infer<typeof ReferenceReuse>;

export const Reference = z.object({
  id: z.string(),
  workspace_id: z.string(),
  call_id: z.string(),
  prospect_speaker_role: SpeakerRole,
  created_event_version: z.number().int().nonnegative(),
  updated_event_version: z.number().int().nonnegative(),
  schema_version: z.string(),
  extractor_version: z.string(),
  /** Uppercase short form ("HOCKEY / NOBODY KNOWS WHO IS DEFENDING"). Never a quote. */
  label: z.string(),
  evidence: ReferenceEvidence,
  semantics: ReferenceSemantics,
  lifecycle: ReferenceLifecycle,
  reuse: ReferenceReuse,
});
export type Reference = z.infer<typeof Reference>;

/** One optional suggestion (at most one at a time). Carries the versions it was computed from. */
export const ReferenceSuggestion = z.object({
  reference_id: z.string(),
  text: z.string(),
  /** 'answer_in_their_frame' | 'clarify_meaning' | 'bridge' | 'test_the_failure' | a stage id. */
  purpose: z.string(),
  concept_id: z.string().optional(),
  evidence_turn_id: z.string(),
  script_node_id: z.string(),
  script_version_id: z.string(),
  /** Transcript event version the suggestion was computed from; stale when the reference moved on. */
  input_event_version: z.number().int().nonnegative(),
  /** Length of the rep/UI action log when computed; any later action (pin, correct, dismiss…) makes it stale. */
  input_action_count: z.number().int().nonnegative().optional(),
  /** The current turn that triggered retrieval, when there is one. */
  trigger_turn_id: z.string().optional(),
});
export type ReferenceSuggestion = z.infer<typeof ReferenceSuggestion>;

/** Rep/UI actions replayed over freshly extracted references (persisted per call). */
export const ListenerAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pin'), reference_id: z.string(), event_version: z.number().int().nonnegative() }),
  z.object({ type: z.literal('unpin'), reference_id: z.string(), event_version: z.number().int().nonnegative() }),
  z.object({ type: z.literal('keep'), reference_id: z.string(), event_version: z.number().int().nonnegative() }),
  z.object({ type: z.literal('dismiss'), reference_id: z.string(), event_version: z.number().int().nonnegative(), reason: z.string().optional() }),
  z.object({ type: z.literal('do_not_reuse'), reference_id: z.string(), event_version: z.number().int().nonnegative() }),
  z.object({ type: z.literal('clarify'), reference_id: z.string(), event_version: z.number().int().nonnegative() }),
  z.object({
    type: z.literal('correct'),
    reference_id: z.string(),
    event_version: z.number().int().nonnegative(),
    field: z.enum(['relationship', 'explained_meaning', 'business_target']),
    to: z.string(),
    note: z.string(),
  }),
  z.object({ type: z.literal('use'), reference_id: z.string(), event_version: z.number().int().nonnegative(), turn_id: z.string() }),
  z.object({ type: z.literal('reaction'), reference_id: z.string(), event_version: z.number().int().nonnegative(), turn_id: z.string(), reaction: Reaction }),
  z.object({ type: z.literal('suggestion_not_now'), reference_id: z.string(), event_version: z.number().int().nonnegative() }),
]);
export type ListenerAction = z.infer<typeof ListenerAction>;

/** Persisted per call at `callroom.refs.<call_id>`. */
export const ListenerCallState = z.object({
  actions: z.array(ListenerAction),
});
export type ListenerCallState = z.infer<typeof ListenerCallState>;

/** Post-call correction on /calls (persisted at `calls.refs.corrections.<call_id>`); the original stays visible. */
export const ReferenceCorrection = z.object({
  reference_id: z.string(),
  field: z.enum(['relationship', 'explained_meaning', 'business_target']),
  original: z.string(),
  corrected: z.string(),
  note: z.string(),
  corrected_at: z.string(),
  corrected_by: z.literal('rep'),
});
export type ReferenceCorrection = z.infer<typeof ReferenceCorrection>;

/** Explicitly saved to a prospect profile (`prospects.refs.<prospect_id>`). Never automatic. */
export const SavedProspectReference = z.object({
  reference: Reference,
  evidence: ReferenceEvidence,
  status: ReferenceState,
  date: z.string(),
  call_id: z.string(),
  saved_by: z.literal('rep'),
});
export type SavedProspectReference = z.infer<typeof SavedProspectReference>;

// ---------------------------------------------------------------------------------------------
// State + cards (additive, addendum §5/§8/§9). The call room holds ONE `ListenerMemory` per call.
// ---------------------------------------------------------------------------------------------

/**
 * Everything the listener needs to rebuild itself deterministically: the raw provider events consumed
 * so far (the replay log — dedupe/revisions happen on every rebuild), the rep/UI action log, and the
 * one-suggestion slot. Conversation-scoped; never written to a prospect profile automatically.
 */
export const ListenerMemory = z.object({
  turns: z.array(TranscriptTurn),
  actions: z.array(ListenerAction),
  /** Reference used by the most recent suggestion the rep actually used — never suggested again immediately. */
  last_suggestion_reference_id: z.string().nullable(),
  /** The single suggestion currently on offer. Revisions, lifecycle changes and a new prospect turn drop it. */
  queued_suggestion: ReferenceSuggestion.nullable(),
});
export type ListenerMemory = z.infer<typeof ListenerMemory>;

/** Glyphs from the design system: ◉ observed · ◌ inferred · ✓ confirmed · ? unknown · ⊘ invalidated. */
export const MeaningGlyph = z.enum(['◉', '◌', '✓', '?', '⊘']);
export type MeaningGlyph = z.infer<typeof MeaningGlyph>;

/**
 * UI-ready card (addendum §5). Collapsed = `label` + `meaning_line`; expanded = the rest. Text fields are
 * complete sentences the UI renders as-is; `evidence.quote` is the prospect's exact words and nothing else
 * on the card may be shown as a quotation.
 */
export const ReferenceCard = z.object({
  id: z.string(),
  /** Large uppercase term/reference ("HOCKEY / NOBODY KNOWS WHO IS DEFENDING"). */
  label: z.string(),
  /** One short line under the label. */
  meaning_line: z.string(),
  meaning_status: ReferenceMeaningStatus,
  /** Design-system glyph for `meaning_status` (⊘ when invalidated). */
  glyph: MeaningGlyph,
  /** Full accessible name for the glyph ("meaning inferred — interpretation of this sentence, not confirmed"). */
  glyph_name: z.string(),
  origin: ReferenceOrigin,
  origin_label: z.string(),
  valence: ReferenceValence,
  evidence: z.object({
    /** The exact supporting sentence as transcribed. */
    quote: z.string(),
    turn_id: z.string(),
    exact_expression: z.string(),
    status: EvidenceStatus,
    timestamp: z.string().optional(),
  }),
  state: ReferenceState,
  /** `state` explained for the card ("Rejected by the prospect — not used again"). */
  state_line: z.string().optional(),
  pinned: z.boolean(),
  kept_for_later: z.boolean(),
  do_not_reuse: z.boolean(),
  painful: z.boolean(),
  /** "What the comparison represents in this context." */
  represents: z.string(),
  /** "When it may be useful later." */
  useful_when: z.string(),
  /** The confirmed meaning with its evidence turn, only when the prospect supplied it. */
  confirmed_meaning: z.object({ text: z.string(), evidence_turn_id: z.string() }).optional(),
  /** Prohibitions shown beside the interpretation. */
  prohibited_inferences: z.array(z.string()),
  /** CLARIFY MEANING question, when one is on offer. */
  clarification: z.string().optional(),
  /** Which of the three actions are meaningful right now. */
  actions: z.object({ keep: z.boolean(), use: z.boolean(), clarify: z.boolean() }),
  /** The one primary suggestion, attached to the card it is grounded in (at most one card carries it). */
  suggestion: ReferenceSuggestion.optional(),
  concept_ids: z.array(z.string()),
  source_domain: z.string().optional(),
});
export type ReferenceCard = z.infer<typeof ReferenceCard>;
