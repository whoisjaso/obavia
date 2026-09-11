/**
 * Practice Studio (brief §13). Memorization and conversation scores are SEPARATE optional
 * objects. Text-only practice never claims tone assessment (`tone_assessed: false`).
 *
 * Owning module agent: M-practice.
 */
import { z } from 'zod';

export const AssistanceMode = z.enum([
  'full_script',
  'recall_with_reveal',
  'primary_plus_mirror',
  'stage_purpose_cue',
  'unassisted',
]);
export type AssistanceMode = z.infer<typeof AssistanceMode>;

/** Default is the full exact script; reducing assistance is optional and reversible. */
export const DEFAULT_ASSISTANCE_MODE: AssistanceMode = 'full_script';

export const DrillKind = z.enum([
  'exact_recall',
  'random_node_lookup',
  'order_rehearsal',
  'branch_classification',
  'mirror_duel',
  'delivery_replay',
  'vocabulary_meaning',
  'full_mock',
  'practice_this_moment',
  /** Additive (M-practice): typed recall that allows a reveal before checking. */
  'recall_with_reveal',
]);
export type DrillKind = z.infer<typeof DrillKind>;

export const MemorizationScore = z.object({
  exact_match_ratio: z.number().min(0).max(1),
  word_order_ratio: z.number().min(0).max(1),
});
export type MemorizationScore = z.infer<typeof MemorizationScore>;

export const ConversationScore = z.object({
  objective_satisfied: z.boolean(),
  branch_choice_correct: z.boolean().optional(),
  accurate_disqualification: z.boolean().optional(),
  notes: z.string().optional(),
});
export type ConversationScore = z.infer<typeof ConversationScore>;

export const PracticeAttempt = z.object({
  id: z.string(),
  mode: AssistanceMode,
  drill_kind: DrillKind,
  script_version_id: z.string(),
  node_id: z.string().optional(),
  started_at: z.string(),
  ended_at: z.string().optional(),
  /** Tracked separately from unassisted ability. */
  assisted: z.boolean(),
  memorization_score: MemorizationScore.optional(),
  conversation_score: ConversationScore.optional(),
  /** Text-only practice cannot assess tone. Literal false in Increment 1. */
  tone_assessed: z.literal(false),
  notes: z.string(),
});
export type PracticeAttempt = z.infer<typeof PracticeAttempt>;

// ---------------------------------------------------------------------------------------
// Additive (M-practice): scenarios, drill items and drill results.
// ---------------------------------------------------------------------------------------

/** Additive (M-practice): outcomes a scenario may legitimately end in (brief §13). */
export const LegitimateOutcome = z.enum([
  'qualified',
  'no_fit',
  'defer',
  'needs_second_decision_maker',
  'opt_out',
  'gatekeeper',
]);
export type LegitimateOutcome = z.infer<typeof LegitimateOutcome>;

/**
 * Additive (M-practice): hidden scenario truth. Only the post-session evaluator may read it
 * (brief §13, scenario 22). Never rendered during a live run.
 */
export const HiddenFactSheet = z.object({
  real_needs: z.array(z.string()),
  objections: z.array(z.string()),
  budget_capacity: z.array(z.string()),
  decision_roles: z.array(z.string()),
  already_tried: z.array(z.string()),
  would_proceed_if: z.array(z.string()),
  would_not_proceed_if: z.array(z.string()),
});
export type HiddenFactSheet = z.infer<typeof HiddenFactSheet>;

/** Additive (M-practice): a fictional practice scenario (brief §13 list). */
export const PracticeScenario = z.object({
  id: z.string(),
  /** Always prefixed FICTIONAL in seeds. */
  title: z.string(),
  /** What the representative may know before the call. */
  public_brief: z.string(),
  /** Which script entrypoint the mock starts from. */
  entrypoint: z.string(),
  hidden_fact_sheet: HiddenFactSheet,
  legitimate_outcomes: z.array(LegitimateOutcome).min(1),
  /** True when the correct result is a respectful exit, never a sale. */
  never_converts: z.boolean(),
  fictional: z.literal(true),
});
export type PracticeScenario = z.infer<typeof PracticeScenario>;

export const DrillInput = z.enum(['text', 'single_choice', 'ordering', 'self_rating', 'none']);
export type DrillInput = z.infer<typeof DrillInput>;

export const DrillChoice = z.object({
  id: z.string(),
  label: z.string(),
  /** Optional short explanation shown after checking. */
  note: z.string().optional(),
});
export type DrillChoice = z.infer<typeof DrillChoice>;

/** Additive (M-practice): one drill prompt, fully data-driven from ScriptNode fields. */
export const DrillItem = z.object({
  id: z.string(),
  kind: DrillKind,
  input: DrillInput,
  /** Node this item was built from (cited, never quoted as a source). */
  node_id: z.string().optional(),
  stage: z.string().optional(),
  prompt: z.string(),
  /** Extra context shown with the prompt (e.g. why-this-now). */
  context: z.string().optional(),
  /** Synthetic prospect line, when the drill presents one. Always labelled synthetic in the UI. */
  synthetic_prospect_line: z.string().optional(),
  choices: z.array(DrillChoice).default([]),
  /** Ids of the choices that count as correct (empty for text / self-rated drills). */
  correct_choice_ids: z.array(z.string()).default([]),
  /** Exact target for typed recall; hidden until checked (or revealed). */
  target_text: z.string().optional(),
  /** Expected order of ids for ordering drills. */
  expected_order: z.array(z.string()).default([]),
  /** Delivery cues for self-rated replay (instructor-described, never audio-verified). */
  delivery_cues: z.object({ tone_cue: z.string(), pacing_cue: z.string() }).optional(),
  /** Node ids cited by this item (own-script lines cite record ids; never source quotes). */
  cited_node_ids: z.array(z.string()).default([]),
});
export type DrillItem = z.infer<typeof DrillItem>;

/** Additive (M-practice): the outcome of one drill item. Tone is never assessed in text. */
export const DrillResult = z.object({
  item_id: z.string(),
  kind: DrillKind,
  /** Null when the drill has no right answer (self-rated / comparison). */
  correct: z.boolean().nullable(),
  memorization_score: MemorizationScore.optional(),
  conversation_score: ConversationScore.optional(),
  missing_words: z.array(z.string()).default([]),
  extra_words: z.array(z.string()).default([]),
  /** Literal false: text-only practice cannot measure tone, inflection or timing. */
  tone_assessed: z.literal(false),
  simulation_disclaimer: z.string().optional(),
  notes: z.string(),
});
export type DrillResult = z.infer<typeof DrillResult>;
