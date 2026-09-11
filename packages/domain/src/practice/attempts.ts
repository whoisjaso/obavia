/**
 * Practice attempts and their summaries (brief §13, §14). Memorization and conversation
 * scores stay separate objects; assisted and unassisted attempts are summarised in separate
 * buckets and never mixed. Nothing here ranks the user or emits a badge.
 */
import { PracticeAttempt, type AssistanceMode, type DrillResult } from '../schemas/practice';
import { isAssisted } from './modes';

export interface AttemptInput {
  id: string;
  mode: AssistanceMode;
  script_version_id: string;
  result: DrillResult;
  started_at: string;
  ended_at?: string;
  node_id?: string;
}

/** Build a schema-valid attempt from a drill result. `assisted` derives from the mode only. */
export function attemptFromResult(input: AttemptInput): PracticeAttempt {
  return PracticeAttempt.parse({
    id: input.id,
    mode: input.mode,
    drill_kind: input.result.kind,
    script_version_id: input.script_version_id,
    node_id: input.node_id,
    started_at: input.started_at,
    ended_at: input.ended_at ?? input.started_at,
    assisted: isAssisted(input.mode),
    memorization_score: input.result.memorization_score,
    conversation_score: input.result.conversation_score,
    tone_assessed: false,
    notes: input.result.notes,
  });
}

export interface MemorizationSummary {
  attempts: number;
  mean_exact_match_ratio: number | null;
  mean_word_order_ratio: number | null;
}

export interface ConversationSummary {
  attempts: number;
  objective_satisfied: number;
  branch_choices: number;
  branch_choices_correct: number;
  accurate_disqualifications: number;
}

export interface BucketSummary {
  attempts: number;
  memorization: MemorizationSummary;
  conversation: ConversationSummary;
  by_drill_kind: Record<string, number>;
}

export interface AttemptsSummary {
  assisted: BucketSummary;
  unassisted: BucketSummary;
  /** Always literally false in text-only practice. */
  tone_assessed: false;
}

function emptyBucket(): BucketSummary {
  return {
    attempts: 0,
    memorization: { attempts: 0, mean_exact_match_ratio: null, mean_word_order_ratio: null },
    conversation: { attempts: 0, objective_satisfied: 0, branch_choices: 0, branch_choices_correct: 0, accurate_disqualifications: 0 },
    by_drill_kind: {},
  };
}

function summariseBucket(list: readonly PracticeAttempt[]): BucketSummary {
  const b = emptyBucket();
  let exactSum = 0;
  let orderSum = 0;
  for (const a of list) {
    b.attempts += 1;
    b.by_drill_kind[a.drill_kind] = (b.by_drill_kind[a.drill_kind] ?? 0) + 1;
    if (a.memorization_score) {
      b.memorization.attempts += 1;
      exactSum += a.memorization_score.exact_match_ratio;
      orderSum += a.memorization_score.word_order_ratio;
    }
    if (a.conversation_score) {
      b.conversation.attempts += 1;
      if (a.conversation_score.objective_satisfied) b.conversation.objective_satisfied += 1;
      if (a.conversation_score.branch_choice_correct !== undefined) {
        b.conversation.branch_choices += 1;
        if (a.conversation_score.branch_choice_correct) b.conversation.branch_choices_correct += 1;
      }
      if (a.conversation_score.accurate_disqualification) b.conversation.accurate_disqualifications += 1;
    }
  }
  if (b.memorization.attempts > 0) {
    b.memorization.mean_exact_match_ratio = exactSum / b.memorization.attempts;
    b.memorization.mean_word_order_ratio = orderSum / b.memorization.attempts;
  }
  return b;
}

/** Split by `assisted` first, then summarise each bucket on its own. Buckets never share counts. */
export function summarizeAttempts(attempts: readonly PracticeAttempt[]): AttemptsSummary {
  return {
    assisted: summariseBucket(attempts.filter((a) => a.assisted)),
    unassisted: summariseBucket(attempts.filter((a) => !a.assisted)),
    tone_assessed: false,
  };
}
