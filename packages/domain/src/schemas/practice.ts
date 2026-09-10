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
