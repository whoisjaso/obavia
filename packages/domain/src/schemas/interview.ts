/**
 * Identity interview (brief §4): 30 base + 3 conditional screens, no typing required,
 * answered / skipped / not-applicable persisted separately, endorsed profile,
 * training plan items (cue → exact action → frequency/duration → evidence → review → recovery).
 *
 * Owning module agent: M-interview (may extend additively; say so in its report).
 */
import { z } from 'zod';

export const InterviewOption = z.object({
  id: z.string(),
  label: z.string(),
  /** Optional short clarifier shown under the label on the answer card. */
  description: z.string().optional(),
});
export type InterviewOption = z.infer<typeof InterviewOption>;

/** Declared (not computed) condition: show the screen when the referenced screen's answer includes any of these options. */
export const InterviewCondition = z.object({
  screen_id: z.string(),
  any_of: z.array(z.string()).min(1),
});
export type InterviewCondition = z.infer<typeof InterviewCondition>;

export const InterviewScreen = z
  .object({
    id: z.string(),
    order: z.number().int().nonnegative(),
    prompt: z.string(),
    help: z.string().optional(),
    /** Short noun phrase used to build the profile summary sentence (added by M-interview, optional). */
    summary_label: z.string().optional(),
    kind: z.enum(['single', 'multi']),
    /** Required when kind is 'multi'; the UI must state the limit to the user. */
    max_select: z.number().int().positive().optional(),
    options: z.array(InterviewOption).min(1),
    allow_skip: z.boolean(),
    /** Mutually exclusive with substantive options. */
    uncertainty_option: z.object({ id: z.string(), label: z.string() }).optional(),
    /** Mutually exclusive with substantive options. */
    none_option: z.object({ id: z.string(), label: z.string() }).optional(),
    condition: InterviewCondition.optional(),
    /** Which profile section this screen feeds (e.g. "definitions_of_success"). */
    profile_field: z.string(),
    base_or_conditional: z.enum(['base', 'conditional']),
  })
  .refine((s) => s.kind !== 'multi' || typeof s.max_select === 'number', {
    message: 'max_select is required when kind is "multi"',
    path: ['max_select'],
  })
  .refine((s) => s.base_or_conditional !== 'conditional' || s.condition !== undefined, {
    message: 'conditional screens must declare a condition',
    path: ['condition'],
  });
export type InterviewScreen = z.infer<typeof InterviewScreen>;

export const InterviewVersion = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  title: z.string(),
  screens: z.array(InterviewScreen),
});
export type InterviewVersion = z.infer<typeof InterviewVersion>;

export const InterviewAnswerStatus = z.enum(['answered', 'skipped', 'not_applicable']);
export type InterviewAnswerStatus = z.infer<typeof InterviewAnswerStatus>;

export const InterviewAnswer = z.object({
  screen_id: z.string(),
  status: InterviewAnswerStatus,
  selected_option_ids: z.array(z.string()),
  /** ISO-8601 UTC timestamp. */
  answered_at: z.string(),
  /** Set when a back-edit on this screen invalidated the answer (dependent screens recompute). */
  invalidated_by: z.string().optional(),
});
export type InterviewAnswer = z.infer<typeof InterviewAnswer>;

export const InterviewSessionStatus = z.enum(['in_progress', 'reviewed', 'endorsed']);
export type InterviewSessionStatus = z.infer<typeof InterviewSessionStatus>;

export const InterviewSession = z.object({
  id: z.string(),
  version_id: z.string(),
  answers: z.record(z.string(), InterviewAnswer),
  current_screen_id: z.string(),
  status: InterviewSessionStatus,
  endorsed_at: z.string().optional(),
});
export type InterviewSession = z.infer<typeof InterviewSession>;

export const IdentityProfileSection = z.object({
  key: z.string(),
  label: z.string(),
  /** Source answer/option ids the summary was built from. */
  answer_ids: z.array(z.string()),
  summary: z.string(),
});
export type IdentityProfileSection = z.infer<typeof IdentityProfileSection>;

/** Reviewable profile. `endorsed` must be true before anything downstream uses it. No scores, no labels. */
export const IdentityProfile = z.object({
  id: z.string(),
  session_id: z.string(),
  version: z.number().int().nonnegative(),
  endorsed: z.boolean(),
  /** ISO-8601 UTC timestamp set by endorseProfile (added by M-interview, optional). */
  endorsed_at: z.string().optional(),
  sections: z.array(IdentityProfileSection),
  /** Explicit unknowns — things the interview did not establish. */
  unknowns: z.array(z.string()),
});
export type IdentityProfile = z.infer<typeof IdentityProfile>;

/** One endorsed standard translated into a practice habit. */
export const TrainingPlanItem = z.object({
  standard: z.string(),
  cue: z.string(),
  exact_action: z.string(),
  frequency: z.string(),
  /**
   * Chosen duration, or `null` when the person has not chosen one yet — never a default number
   * (widened additively by M-interview: an unchosen duration is displayed as "—", not "15 min").
   */
  duration_minutes: z.number().int().positive().nullable(),
  /** Observable evidence (a completed drill), not time on page. */
  completion_evidence: z.string(),
  review: z.string(),
  /** A missed practice does not erase previous work. */
  recovery_rule: z.string(),
});
export type TrainingPlanItem = z.infer<typeof TrainingPlanItem>;
