/**
 * Script engine (brief §6): nodes with exact primary word tracks, source question ids,
 * branches, and approval metadata. Source text, normalization and own wording live in
 * SEPARATE fields/entities (SourceQuestionRecord.template vs ScriptNode.primary_word_track
 * vs WordTrackVariant.own_text). Published versions are immutable snapshots.
 *
 * Owning module agent: M-script.
 */
import { z } from 'zod';

export const ScriptRole = z.enum([
  'setter',
  'closer',
  'cold',
  'inbound',
  'handoff',
  'follow_up',
  'referral',
  'upsell',
]);
export type ScriptRole = z.infer<typeof ScriptRole>;

export const ApprovalStatus = z.enum(['draft', 'reviewed', 'published', 'retired']);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export const Approval = z.object({
  status: ApprovalStatus,
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
});
export type Approval = z.infer<typeof Approval>;

export const ScriptBranch = z.object({
  label: z.string(),
  /** Answer category this branch handles (e.g. "never_looked", "declined", "unknown"). */
  answer_category: z.string(),
  /** Null = end of sequence / hand back to human. */
  next_node_id: z.string().nullable(),
  note: z.string().optional(),
});
export type ScriptBranch = z.infer<typeof ScriptBranch>;

export const DeliveryOverlay = z.object({
  tone_cue: z.string(),
  pacing_cue: z.string(),
});
export type DeliveryOverlay = z.infer<typeof DeliveryOverlay>;

export const ScriptNode = z.object({
  id: z.string(),
  script_version_id: z.string(),
  stage: z.string(),
  substage: z.string().optional(),
  role_applicability: z.array(ScriptRole).min(1),
  /** STABLE within a version. Never rewritten during a call. */
  primary_word_track: z.string(),
  /** Source record ids like "L06". Empty for Apohenia additions (see source_note). */
  source_question_ids: z.array(z.string()),
  intended_answer_type: z.string(),
  /** Slot names that must be evidence-backed before rendering (never fabricated). */
  required_context: z.array(z.string()),
  sufficient_answer_examples: z.array(z.string()),
  insufficient_answer_examples: z.array(z.string()),
  /** When the prospect already supplied this, mark evidence-satisfied and offer a transition. */
  facts_already_known_rule: z.string().optional(),
  mirror_variants: z.array(z.string()),
  bridge_template: z.string(),
  delivery_overlay: DeliveryOverlay,
  completion_criteria: z.string(),
  branches: z.array(ScriptBranch),
  stop_or_skip_conditions: z.array(z.string()),
  why_this_now: z.string(),
  what_to_listen_for: z.string(),
  approval: Approval,
  /** e.g. "Apohenia addition — not in source". */
  source_note: z.string().optional(),
  /**
   * Additive (M-script): fact keys that, when ALL present in the known-facts map, make this node
   * evidence-satisfied (brief §5: offer a transition instead of asking twice). Optional.
   */
  satisfied_by_facts: z.array(z.string()).optional(),
  /**
   * Additive (M-script): true marks a study/practice-only node (e.g. the optional identity frame).
   * Such a node may cite private_training records; it is never a live recommendation.
   */
  practice_only: z.boolean().optional(),
});
export type ScriptNode = z.infer<typeof ScriptNode>;

/** Additive (M-script): canonical stage names in display order. */
export const ScriptStage = z.enum([
  'entry',
  'intent',
  'logical_certainty',
  'setter_transition',
  'emotional_certainty',
  'future',
  'consequence',
  'commitment',
  'pitch',
  'decision',
  'concern',
  'exit',
  'follow_up',
  'referral',
  'upsell',
]);
export type ScriptStage = z.infer<typeof ScriptStage>;

/** Additive (M-script): the six entrypoints a version must expose. */
export const ScriptEntrypoint = z.enum(['cold', 'inbound', 'handoff', 'follow_up', 'referral', 'upsell']);
export type ScriptEntrypoint = z.infer<typeof ScriptEntrypoint>;

export const PricePlacement = z.enum(['after_pillars', 'price_first']);
export type PricePlacement = z.infer<typeof PricePlacement>;

export const ScriptVersion = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number().int().nonnegative(),
  /** A live script references a specific approved offer version; null while drafting. */
  offer_version_id: z.string().nullable(),
  /** Entry point name (cold, inbound, handoff, follow_up, referral, upsell, ...) → node id. */
  entry_node_ids: z.record(z.string(), z.string()),
  node_ids: z.array(z.string()),
  status: ApprovalStatus,
  published_at: z.string().optional(),
  immutable: z.boolean(),
  price_placement: PricePlacement,
  /**
   * Additive (M-script, review finding B-1): the node every opt-out routes to. The engine adds an
   * implicit `opt_out` branch to EVERY node of the version (global stop rule); `validateGraph`
   * asserts the node exists, is terminal and sits in the exit stage. Defaults to "exit-stop".
   */
  stop_node_id: z.string().optional(),
});
export type ScriptVersion = z.infer<typeof ScriptVersion>;

/** Jason's editable own-words track for a node — separate from the primary word track. */
export const WordTrackVariant = z.object({
  node_id: z.string(),
  own_text: z.string(),
  edited_at: z.string(),
});
export type WordTrackVariant = z.infer<typeof WordTrackVariant>;

/** Immutable frozen snapshot used by an actual session. */
export const ScriptPublication = z.object({
  id: z.string(),
  version: ScriptVersion,
  nodes: z.array(ScriptNode),
  /** SHA-256 hex of the canonical JSON of {version, nodes}. */
  content_hash: z.string().regex(/^[0-9a-f]{64}$/),
  published_at: z.string(),
});
export type ScriptPublication = z.infer<typeof ScriptPublication>;
