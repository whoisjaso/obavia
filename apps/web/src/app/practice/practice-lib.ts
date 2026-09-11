/**
 * Train (`/practice`) — pure view helpers. Owner: M-train.
 * Nothing here scores or masks: every number comes from @apohenia/domain/practice.
 */
import type { AssistanceMode, DrillKind, DrillResult, LegitimateOutcome, PracticeAttempt } from '@apohenia/domain/schemas';
import { MODE_DESCRIPTIONS, MODE_LABELS, isAssisted, summarizeAttempts, type MomentContext } from '@apohenia/domain/practice';
import type { IconName, TileTone } from '@/components/ui';

// ---------------------------------------------------------------------------------------
// Drills (DESIGN_SYSTEM §3.4): ten tiles, ≤2-word labels, the whole truth in `hint`.
// ---------------------------------------------------------------------------------------

export type DrillScoring = 'memory' | 'conversation' | 'self';

export interface DrillMeta {
  kind: DrillKind;
  /** ≤2 words, Title Case (the tile label). */
  label: string;
  icon: IconName;
  /** One sentence — accessible name + ⓘ sheet only. */
  hint: string;
  /** ≤3-word cue shown on the drill screen instead of the prompt sentence. */
  cue: string;
  /** Which ring the drill feeds. `self` drills are never scored (reps only). */
  scoring: DrillScoring;
}

export const DRILLS: readonly DrillMeta[] = [
  { kind: 'exact_recall', label: 'Recall', icon: 'script', hint: 'Type the primary line word for word.', cue: 'Type the line', scoring: 'memory' },
  { kind: 'recall_with_reveal', label: 'Reveal', icon: 'sun', hint: 'Type the primary line; reveal it first if you need to.', cue: 'Type the line', scoring: 'memory' },
  { kind: 'order_rehearsal', label: 'Order', icon: 'list', hint: 'Put a stage back in the order the script asks it.', cue: 'Put in order', scoring: 'memory' },
  { kind: 'random_node_lookup', label: 'Lookup', icon: 'search', hint: 'From the stage cue, find the primary line among four.', cue: 'Which line?', scoring: 'memory' },
  { kind: 'branch_classification', label: 'Branches', icon: 'flag', hint: 'Sufficient answer? Choose the branch — or ask a mirror.', cue: 'Which branch?', scoring: 'conversation' },
  { kind: 'mirror_duel', label: 'Mirror', icon: 'refresh', hint: 'Which question seeks the same answer type in different words?', cue: 'Same answer?', scoring: 'conversation' },
  { kind: 'vocabulary_meaning', label: 'Meaning', icon: 'bookmark', hint: 'Their definition or ask what it means — never a synonym.', cue: 'What it means?', scoring: 'conversation' },
  { kind: 'delivery_replay', label: 'Delivery', icon: 'mic', hint: 'Say the line aloud and rate yourself against the cues. Nothing is recorded or measured.', cue: 'Say it aloud', scoring: 'self' },
  { kind: 'full_mock', label: 'Mock', icon: 'phone', hint: 'Choice-based simulation against a fictional scenario — not an AI voice call.', cue: 'Choose a branch', scoring: 'conversation' },
  { kind: 'practice_this_moment', label: 'Moment', icon: 'history', hint: 'Retry a weak transition with an alternative question and compare what each obtains.', cue: 'Try another', scoring: 'self' },
];

export function drillMeta(kind: DrillKind): DrillMeta {
  return DRILLS.find((d) => d.kind === kind) ?? (DRILLS[0] as DrillMeta);
}

// ---------------------------------------------------------------------------------------
// Assistance modes: five glyphs, accessible names from the domain labels.
// ---------------------------------------------------------------------------------------

export interface ModeMeta {
  mode: AssistanceMode;
  glyph: string;
  /** One lowercase word under the glyph (spec: full · reveal · mirror · cue · none). */
  word: string;
}

export const MODES: readonly ModeMeta[] = [
  { mode: 'full_script', glyph: '≡', word: 'full' },
  { mode: 'recall_with_reveal', glyph: '◑', word: 'reveal' },
  { mode: 'primary_plus_mirror', glyph: '⇄', word: 'mirror' },
  { mode: 'stage_purpose_cue', glyph: '◎', word: 'cue' },
  { mode: 'unassisted', glyph: '○', word: 'none' },
];

/** The whole truth for one mode option, built from the domain's own labels. */
export function modeName(mode: AssistanceMode): string {
  return `${MODE_LABELS[mode]}: ${MODE_DESCRIPTIONS[mode]} Tracked as ${isAssisted(mode) ? 'assisted' : 'unassisted'}.`;
}

// ---------------------------------------------------------------------------------------
// Rings
// ---------------------------------------------------------------------------------------

/** Self-rated drills have no score; their ring fills by repetitions up to this many. */
export const REPS_TARGET = 5;

export interface DrillRingValue {
  /** 0–1 ring fill. */
  value: number;
  count: number;
  /** True when the fill is a score (mean exact match / objective satisfied), false for reps or empty. */
  scored: boolean;
  /** Accessible name — the whole truth. */
  name: string;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** One ring for one drill in one bucket (assisted or unassisted). Buckets never mix. */
export function drillRing(attempts: readonly PracticeAttempt[], meta: DrillMeta, assisted: boolean): DrillRingValue {
  const bucketWord = assisted ? 'assisted' : 'unassisted';
  const own = attempts.filter((a) => a.drill_kind === meta.kind && a.assisted === assisted);
  if (own.length === 0) return { value: 0, count: 0, scored: false, name: `${meta.label}, ${bucketWord}: no attempts yet` };
  const summary = summarizeAttempts(own);
  const bucket = assisted ? summary.assisted : summary.unassisted;
  if (meta.scoring === 'memory' && bucket.memorization.attempts > 0) {
    const value = bucket.memorization.mean_exact_match_ratio ?? 0;
    const order = bucket.memorization.mean_word_order_ratio ?? 0;
    return { value, count: own.length, scored: true, name: `${meta.label}, ${bucketWord}: ${plural(own.length, 'attempt')}, mean exact match ${pct(value)}, mean word order ${pct(order)}` };
  }
  if (meta.scoring === 'conversation' && bucket.conversation.attempts > 0) {
    const value = bucket.conversation.objective_satisfied / bucket.conversation.attempts;
    return { value, count: own.length, scored: true, name: `${meta.label}, ${bucketWord}: ${plural(own.length, 'attempt')}, objective satisfied ${bucket.conversation.objective_satisfied} of ${bucket.conversation.attempts}` };
  }
  return { value: Math.min(1, own.length / REPS_TARGET), count: own.length, scored: false, name: `${meta.label}, ${bucketWord}: ${plural(own.length, 'self-rated attempt')}, not scored` };
}

// ---------------------------------------------------------------------------------------
// Result → live-region sentence (screen readers only).
// ---------------------------------------------------------------------------------------

export function resultAnnouncement(result: DrillResult): string {
  const verdict = result.correct === null ? 'Self-rated, no right answer' : result.correct ? 'Correct' : 'Not correct';
  const m = result.memorization_score;
  const c = result.conversation_score;
  const memory = m ? `Memory: exact match ${pct(m.exact_match_ratio)}, word order ${pct(m.word_order_ratio)}` : 'Memory: not scored in this drill';
  const conversation = c ? `Conversation: objective ${c.objective_satisfied ? 'satisfied' : 'not satisfied'}` : 'Conversation: not scored in this drill';
  return `${verdict}. ${memory}. ${conversation}. Tone not assessed (text-only).`;
}

export function verdictText(result: DrillResult): string {
  return result.correct === null ? 'Self-rated — no right answer' : result.correct ? 'Correct' : 'Not correct';
}

// ---------------------------------------------------------------------------------------
// Mock: ≤2-word tile labels for the ten fictional scenarios and the six exits.
// ---------------------------------------------------------------------------------------

export const SCENARIO_META: Record<string, { label: string; icon: IconName }> = {
  'busy-owner-short-moment': { label: 'Busy owner', icon: 'clock' },
  'existing-vendor-no-gap': { label: 'No gap', icon: 'check' },
  'profit-owner-purchase-cost': { label: 'Purchase cost', icon: 'target' },
  'detail-buyer-measurement': { label: 'Detail buyer', icon: 'search' },
  'relevant-issue-no-budget': { label: 'No budget', icon: 'ban' },
  'multi-owner-second-decision-maker': { label: 'Two partners', icon: 'person' },
  'skeptical-earlier-automation': { label: 'Skeptical', icon: 'shield' },
  'inbound-price-first': { label: 'Price first', icon: 'star' },
  'gatekeeper-cannot-authorize': { label: 'Gatekeeper', icon: 'lock' },
  'clear-opt-out': { label: 'Opt-out', icon: 'phone-off' },
};

export function scenarioMeta(id: string): { label: string; icon: IconName } {
  return SCENARIO_META[id] ?? { label: 'Scenario', icon: 'phone' };
}

export const OUTCOME_META: Record<LegitimateOutcome, { label: string; icon: IconName; tone: TileTone }> = {
  no_fit: { label: 'No fit', icon: 'x', tone: 'orange' },
  defer: { label: 'Defer', icon: 'clock', tone: 'blue' },
  needs_second_decision_maker: { label: 'Second decider', icon: 'person', tone: 'blue' },
  gatekeeper: { label: 'Gatekeeper', icon: 'shield', tone: 'neutral' },
  opt_out: { label: 'Opt-out', icon: 'ban', tone: 'red' },
  qualified: { label: 'Qualified', icon: 'star', tone: 'green' },
};

export const FACT_LABELS: Record<string, string> = {
  real_needs: 'Real needs',
  objections: 'Objections',
  budget_capacity: 'Budget',
  decision_roles: 'Decision roles',
  already_tried: 'Already tried',
  would_proceed_if: 'Would proceed if',
  would_not_proceed_if: 'Would not proceed if',
};

// ---------------------------------------------------------------------------------------
// Practice this moment: FICTIONAL default context (personal data already absent).
// ---------------------------------------------------------------------------------------

export const DEFAULT_MOMENT: MomentContext = {
  original_question: 'So, is it working okay for you?',
  information_obtained: ['"Yeah, it is fine."'],
  information_missing: ['how long the current process has run', 'who set it up and why'],
};

/** Split a textarea into non-empty trimmed lines. */
export function lines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Choice labels short enough for a 2-column tile grid. */
export function shortChoices(labels: readonly string[]): boolean {
  return labels.every((l) => l.trim().split(/\s+/).length <= 4);
}
