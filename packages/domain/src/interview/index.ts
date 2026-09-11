/**
 * Identity interview engine — owning module agent: M-interview.
 *
 * Pure functions over the zod types in `../schemas/interview`. No React, no browser APIs,
 * no dates read implicitly (every function that stamps a time takes `now`).
 *
 * Vocabulary
 * - A **version** is the seeded questionnaire (30 base + 3 conditional screens).
 * - A **session** is one person's answers against one version. Each screen's answer is
 *   persisted separately as `answered`, `skipped` or `not_applicable`; pressing Next never
 *   marks a screen answered by itself.
 * - A **conditional** screen is visible only while its declared condition holds on an
 *   ANSWERED trigger screen. Back-editing the trigger invalidates dependent answers.
 * - A **profile** is a reviewable summary built from the session, carrying the source
 *   answer ids. It carries no scores, percentages, labels or diagnoses.
 * - A **training plan** translates endorsed standards into cue → exact action →
 *   frequency/duration → completion evidence → review → recovery.
 */
import type {
  IdentityProfile,
  IdentityProfileSection,
  InterviewAnswer,
  InterviewCondition,
  InterviewScreen,
  InterviewSession,
  InterviewVersion,
  TrainingPlanItem,
} from '../schemas/interview';

export const MODULE = 'interview' as const;

/** Sentinel `current_screen_id` meaning "the review screen". */
export const REVIEW_SCREEN_ID = '__review__' as const;

/** Profile section keys in display order, with their labels. */
export const PROFILE_SECTIONS: readonly { key: string; label: string }[] = [
  { key: 'success_definitions', label: 'Definitions of success' },
  { key: 'beliefs', label: 'Current beliefs about selling' },
  { key: 'identity', label: 'Chosen identity' },
  { key: 'chosen_standards', label: 'Chosen standards' },
  { key: 'current_friction', label: 'Current friction' },
  { key: 'desired_behavior', label: 'Desired behavior' },
  { key: 'preferred_phrases', label: 'Preferred phrases' },
  { key: 'learning_style', label: 'Learning style' },
  { key: 'next_drill', label: 'Next drill' },
  { key: 'practice_duration', label: 'Practice duration and rhythm' },
  { key: 'difficult_day_minimum', label: 'Difficult-day minimum' },
  { key: 'recovery_rule', label: 'Recovery rule' },
  { key: 'offer_hypothesis', label: 'Offer hypothesis' },
  { key: 'delivery_dependencies', label: 'Delivery dependencies' },
  { key: 'needs_current', label: 'Current needs (optional lens)' },
  { key: 'needs_desired', label: 'Desired priorities (optional lens)' },
  { key: 'unknowns', label: 'Explicit unknowns' },
];

/** Thrown when a selection or transition is not allowed by the screen definition. */
export class InterviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterviewError';
  }
}

/** Thrown by `exportForProspectContext`; the interview must never feed a prospect context. */
export class InterviewPrivacyError extends Error {
  constructor() {
    super('Identity interview answers are private and never enter a prospect context.');
    this.name = 'InterviewPrivacyError';
  }
}

// ---------------------------------------------------------------------------------------
// Screens and visibility
// ---------------------------------------------------------------------------------------

/** Screens sorted by `order` (stable). */
export function sortedScreens(version: InterviewVersion): InterviewScreen[] {
  return [...version.screens].sort((a, b) => a.order - b.order);
}

export function findScreen(version: InterviewVersion, screenId: string): InterviewScreen | undefined {
  return version.screens.find((s) => s.id === screenId);
}

/** True when an answer exists, is `answered`, is not invalidated, and includes any of the condition's option ids. */
export function conditionHolds(condition: InterviewCondition, answers: InterviewSession['answers']): boolean {
  const trigger = answers[condition.screen_id];
  if (!trigger || trigger.status !== 'answered' || trigger.invalidated_by) return false;
  return trigger.selected_option_ids.some((id) => condition.any_of.includes(id));
}

/**
 * Base screens are always visible. A conditional screen is visible only while its declared
 * condition holds on an answered trigger. Chained conditions (a conditional whose trigger
 * is itself conditional) are handled because the trigger's answer would have been
 * invalidated when it became not applicable.
 */
export function visibleScreens(version: InterviewVersion, answers: InterviewSession['answers']): InterviewScreen[] {
  return sortedScreens(version).filter(
    (s) => s.base_or_conditional === 'base' || (s.condition !== undefined && conditionHolds(s.condition, answers)),
  );
}

/** Conditional screens whose condition does not currently hold. */
export function hiddenConditionalScreens(version: InterviewVersion, answers: InterviewSession['answers']): InterviewScreen[] {
  return sortedScreens(version).filter(
    (s) => s.base_or_conditional === 'conditional' && !(s.condition !== undefined && conditionHolds(s.condition, answers)),
  );
}

/** Next visible screen id after `currentId`, or `REVIEW_SCREEN_ID` when the current screen is the last visible one. */
export function nextScreenId(version: InterviewVersion, answers: InterviewSession['answers'], currentId: string): string {
  const visible = visibleScreens(version, answers);
  const index = visible.findIndex((s) => s.id === currentId);
  if (index === -1) return visible[0]?.id ?? REVIEW_SCREEN_ID;
  return visible[index + 1]?.id ?? REVIEW_SCREEN_ID;
}

/** Previous visible screen id, or null on the first visible screen. From the review screen, the last visible screen. */
export function prevScreenId(version: InterviewVersion, answers: InterviewSession['answers'], currentId: string): string | null {
  const visible = visibleScreens(version, answers);
  if (currentId === REVIEW_SCREEN_ID) return visible[visible.length - 1]?.id ?? null;
  const index = visible.findIndex((s) => s.id === currentId);
  if (index <= 0) return null;
  return visible[index - 1]?.id ?? null;
}

/** Conditional screens that directly depend on `screenId`. */
export function dependentsOf(version: InterviewVersion, screenId: string): InterviewScreen[] {
  return sortedScreens(version).filter((s) => s.condition?.screen_id === screenId);
}

// ---------------------------------------------------------------------------------------
// Sessions and answers
// ---------------------------------------------------------------------------------------

/** New in-progress session positioned on the first screen. `id` defaults to a time-based id. */
export function createSession(version: InterviewVersion, now: string = new Date().toISOString(), id?: string): InterviewSession {
  const first = sortedScreens(version)[0];
  return {
    id: id ?? `session-${version.id}-v${version.version}-${now.replace(/[^0-9]/g, '').slice(0, 14)}`,
    version_id: version.id,
    answers: {},
    current_screen_id: first?.id ?? REVIEW_SCREEN_ID,
    status: 'in_progress',
  };
}

export function isUncertaintyOption(screen: InterviewScreen, optionId: string): boolean {
  return screen.uncertainty_option?.id === optionId;
}

export function isNoneOption(screen: InterviewScreen, optionId: string): boolean {
  return screen.none_option?.id === optionId;
}

/** True for an id that belongs to the screen's substantive option list. */
export function isSubstantiveOption(screen: InterviewScreen, optionId: string): boolean {
  return screen.options.some((o) => o.id === optionId);
}

function isExclusiveOption(screen: InterviewScreen, optionId: string): boolean {
  return isUncertaintyOption(screen, optionId) || isNoneOption(screen, optionId);
}

export function maxSelectFor(screen: InterviewScreen): number {
  return screen.kind === 'single' ? 1 : (screen.max_select ?? 1);
}

/**
 * Toggle one option in a selection, enforcing the screen's rules. Intended for UI clicks.
 * - Uncertainty and none are each mutually exclusive with substantive options and with each other.
 * - Selecting a substantive option clears uncertainty/none.
 * - Single screens replace the selection; multi screens refuse to exceed `max_select`
 *   (the selection is returned unchanged so the UI can show its notice).
 */
export function toggleSelection(screen: InterviewScreen, current: readonly string[], optionId: string): string[] {
  if (!isSubstantiveOption(screen, optionId) && !isExclusiveOption(screen, optionId)) {
    throw new InterviewError(`Option "${optionId}" does not belong to screen "${screen.id}".`);
  }
  if (current.includes(optionId)) return current.filter((id) => id !== optionId);
  if (isExclusiveOption(screen, optionId)) return [optionId];
  const substantive = current.filter((id) => isSubstantiveOption(screen, id));
  if (screen.kind === 'single') return [optionId];
  if (substantive.length >= maxSelectFor(screen)) return [...current];
  return [...substantive, optionId];
}

/** Validate a selection against the screen. Returns a human-readable problem or null when valid. */
export function selectionProblem(screen: InterviewScreen, selection: readonly string[]): string | null {
  if (selection.length === 0) return 'Choose an option, or skip this question.';
  const unknown = selection.find((id) => !isSubstantiveOption(screen, id) && !isExclusiveOption(screen, id));
  if (unknown) return `Option "${unknown}" does not belong to this question.`;
  const exclusive = selection.filter((id) => isExclusiveOption(screen, id));
  if (exclusive.length > 1) return 'Uncertainty and none are mutually exclusive.';
  if (exclusive.length === 1 && selection.length > 1) return 'Uncertainty or none cannot be combined with other options.';
  const max = maxSelectFor(screen);
  if (selection.length > max) return `Choose up to ${max}.`;
  if (new Set(selection).size !== selection.length) return 'Duplicate option.';
  return null;
}

/** Options for `applyAnswer`. */
export interface ApplyAnswerOptions {
  /** Needed to recompute dependent conditional screens. Without it, dependents are left untouched. */
  version?: InterviewVersion;
  /** ISO timestamp to stamp on the answer (defaults to now). */
  now?: string;
}

/**
 * Record an answer or a skip on `screen` and recompute dependents.
 * - `answered` requires a valid, non-empty selection (see `selectionProblem`).
 * - `skipped` stores an empty selection with status `skipped`; it never counts as answered.
 * - When the selection actually changed and `options.version` is given, dependent
 *   conditional screens are invalidated (see `invalidateDependents`).
 * - Re-answering after endorsement returns the session to `in_progress`; the stored profile
 *   must be endorsed again.
 * The session is returned as a new object; the input is not mutated.
 */
export function applyAnswer(
  session: InterviewSession,
  screen: InterviewScreen,
  selectedIds: readonly string[],
  status: 'answered' | 'skipped',
  options: ApplyAnswerOptions = {},
): InterviewSession {
  const now = options.now ?? new Date().toISOString();
  if (status === 'skipped' && !screen.allow_skip) throw new InterviewError(`Screen "${screen.id}" cannot be skipped.`);
  const selection = status === 'skipped' ? [] : [...selectedIds];
  if (status === 'answered') {
    const problem = selectionProblem(screen, selection);
    if (problem) throw new InterviewError(problem);
  }
  const previous = session.answers[screen.id];
  const answer: InterviewAnswer = { screen_id: screen.id, status, selected_option_ids: selection, answered_at: now };
  const next: InterviewSession = {
    ...session,
    answers: { ...session.answers, [screen.id]: answer },
    status: session.status === 'endorsed' ? 'in_progress' : session.status,
  };
  if (session.status === 'endorsed') delete next.endorsed_at;
  const changed =
    !previous ||
    previous.status !== status ||
    previous.invalidated_by !== undefined ||
    previous.selected_option_ids.length !== selection.length ||
    previous.selected_option_ids.some((id) => !selection.includes(id));
  return changed && options.version ? invalidateDependents(next, screen.id, options.version, now) : next;
}

/**
 * Recompute the conditional screens that depend (directly or through a chain) on
 * `changedScreenId` after its answer changed:
 * - condition no longer holds → the dependent's answer becomes `not_applicable` with
 *   `invalidated_by`, and it leaves the visible set;
 * - condition holds again after having been not applicable → the stale answer is removed so
 *   the screen re-enters as remaining;
 * - condition still holds but the trigger changed → the existing answer keeps its status,
 *   gains `invalidated_by`, and is removed from completion ("needs re-answer") until the
 *   person confirms or changes it.
 * A back-edit never silently keeps a dependent answer that was given under different premises.
 */
export function invalidateDependents(
  session: InterviewSession,
  changedScreenId: string,
  version: InterviewVersion,
  now: string = new Date().toISOString(),
): InterviewSession {
  let answers = { ...session.answers };
  const queue = [changedScreenId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const dep of dependentsOf(version, id)) {
      const holds = dep.condition !== undefined && conditionHolds(dep.condition, answers);
      const existing = answers[dep.id];
      if (!holds) {
        answers[dep.id] = {
          screen_id: dep.id,
          status: 'not_applicable',
          selected_option_ids: [],
          answered_at: now,
          invalidated_by: changedScreenId,
        };
        queue.push(dep.id);
      } else if (existing && existing.status === 'not_applicable') {
        const rest = { ...answers };
        delete rest[dep.id];
        answers = rest;
        queue.push(dep.id);
      } else if (existing && !existing.invalidated_by) {
        answers[dep.id] = { ...existing, invalidated_by: changedScreenId };
        queue.push(dep.id);
      }
    }
  }
  return { ...session, answers };
}

/** Visible screens whose answers depend on `screenId` and currently hold an answer (used for the back-edit note). */
export function answeredDependents(session: InterviewSession, version: InterviewVersion, screenId: string): InterviewScreen[] {
  return dependentsOf(version, screenId).filter((d) => {
    const st = displayStatus(session, d.id);
    return st === 'answered' || st === 'skipped';
  });
}

/** Answer status for display: the persisted status, or "needs re-answer" when invalidated while still visible. */
export type DisplayStatus = 'answered' | 'skipped' | 'not_applicable' | 'needs_reanswer' | 'unanswered';

export function displayStatus(session: InterviewSession, screenId: string): DisplayStatus {
  const a = session.answers[screenId];
  if (!a) return 'unanswered';
  if (a.status === 'answered' && a.invalidated_by) return 'needs_reanswer';
  if (a.status === 'skipped' && a.invalidated_by) return 'needs_reanswer';
  return a.status;
}

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  answered: 'Answered',
  skipped: 'Skipped',
  not_applicable: 'Not applicable',
  needs_reanswer: 'Needs re-answer',
  unanswered: 'Not yet answered',
};

export interface InterviewProgress {
  answered: number;
  skipped: number;
  /** Conditional screens whose condition does not currently hold. */
  not_applicable: number;
  /** Visible screens that are unanswered, or invalidated and awaiting re-answer. */
  remaining: number;
  total_visible: number;
}

/** Counts over the currently visible screens. A skipped screen is never counted as answered. */
export function progress(session: InterviewSession, version: InterviewVersion): InterviewProgress {
  const visible = visibleScreens(version, session.answers);
  let answered = 0;
  let skipped = 0;
  for (const s of visible) {
    const st = displayStatus(session, s.id);
    if (st === 'answered') answered += 1;
    else if (st === 'skipped') skipped += 1;
  }
  return {
    answered,
    skipped,
    not_applicable: hiddenConditionalScreens(version, session.answers).length,
    remaining: visible.length - answered - skipped,
    total_visible: visible.length,
  };
}

export function isComplete(session: InterviewSession, version: InterviewVersion): boolean {
  return progress(session, version).remaining === 0;
}

/** Move the session pointer. `REVIEW_SCREEN_ID` marks the review screen and sets status `reviewed`. */
export function goTo(session: InterviewSession, screenId: string): InterviewSession {
  const status = screenId === REVIEW_SCREEN_ID && session.status === 'in_progress' ? 'reviewed' : session.status;
  return { ...session, current_screen_id: screenId, status };
}

// ---------------------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------------------

function optionLabel(screen: InterviewScreen, optionId: string): string {
  if (screen.uncertainty_option?.id === optionId) return screen.uncertainty_option.label;
  if (screen.none_option?.id === optionId) return screen.none_option.label;
  return screen.options.find((o) => o.id === optionId)?.label ?? optionId;
}

function subjectOf(screen: InterviewScreen): string {
  return screen.summary_label ?? screen.prompt.replace(/[?.]$/, '');
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join('; ')}; and ${labels[labels.length - 1]}`;
}

/**
 * Build the reviewable profile. Each section lists `answer_ids` = the screen ids and the
 * selected option ids it was built from, plus a summary sentence assembled from option
 * labels. Skipped screens and uncertainty answers become explicit unknowns. The profile
 * is returned with `endorsed: false`; nothing downstream uses it until `endorseProfile`.
 *
 * Deliberately absent: scores, percentages, readiness, diagnoses, moral labels.
 */
export function buildProfile(version: InterviewVersion, session: InterviewSession): IdentityProfile {
  const visible = visibleScreens(version, session.answers);
  const byField = new Map<string, InterviewScreen[]>();
  for (const s of visible) {
    const list = byField.get(s.profile_field) ?? [];
    list.push(s);
    byField.set(s.profile_field, list);
  }
  const unknowns: string[] = [];
  const sections: IdentityProfileSection[] = [];
  const keys = [
    ...PROFILE_SECTIONS.map((p) => p.key),
    ...[...byField.keys()].filter((k) => !PROFILE_SECTIONS.some((p) => p.key === k)),
  ];
  for (const key of keys) {
    const screens = byField.get(key) ?? [];
    const answerIds: string[] = [];
    const sentences: string[] = [];
    for (const screen of screens) {
      const st = displayStatus(session, screen.id);
      const answer = session.answers[screen.id];
      const subject = subjectOf(screen);
      if (st === 'answered' && answer) {
        answerIds.push(screen.id, ...answer.selected_option_ids);
        const [first] = answer.selected_option_ids;
        if (first !== undefined && isUncertaintyOption(screen, first)) {
          sentences.push(`${subject}: not settled yet.`);
          unknowns.push(`${subject} (marked "${screen.uncertainty_option?.label ?? 'not sure'}").`);
        } else if (first !== undefined && isNoneOption(screen, first)) {
          sentences.push(`${subject}: none of the listed options.`);
          if (key === 'unknowns') continue;
          unknowns.push(`${subject} (none of the listed options fit).`);
        } else {
          const labels = answer.selected_option_ids.map((id) => optionLabel(screen, id));
          sentences.push(`${subject}: ${joinLabels(labels)}.`);
          if (key === 'unknowns') unknowns.push(...labels.map((l) => `${l}.`));
        }
      } else if (st === 'skipped') {
        sentences.push(`${subject}: skipped.`);
        unknowns.push(`${subject} (skipped).`);
      } else if (st === 'needs_reanswer') {
        sentences.push(`${subject}: needs re-answer after a change to an earlier answer.`);
        unknowns.push(`${subject} (needs re-answer).`);
      } else {
        sentences.push(`${subject}: not answered yet.`);
        unknowns.push(`${subject} (not answered yet).`);
      }
    }
    const label = PROFILE_SECTIONS.find((p) => p.key === key)?.label ?? key;
    sections.push({ key, label, answer_ids: answerIds, summary: sentences.join(' ') });
  }
  return {
    id: `profile-${session.id}`,
    session_id: session.id,
    version: version.version,
    endorsed: false,
    sections,
    unknowns: [...new Set(unknowns)],
  };
}

/** Stable fingerprint of the reviewable content, used to detect answers changed after endorsement. */
export function profileFingerprint(profile: IdentityProfile): string {
  return JSON.stringify({ s: profile.sections, u: profile.unknowns, v: profile.version, id: profile.session_id });
}

/** The person endorses the summary. Only an endorsed profile may feed the training plan or Today. */
export function endorseProfile(profile: IdentityProfile, now: string = new Date().toISOString()): IdentityProfile {
  return { ...profile, endorsed: true, endorsed_at: now };
}

// ---------------------------------------------------------------------------------------
// Training plan
// ---------------------------------------------------------------------------------------

interface StandardTemplate {
  standard: string;
  cue: (sessionCue: string) => string;
  exact_action: string;
  completion_evidence: string;
  review: string;
}

/** How each chosen standard translates into an exact action. Keyed by option id. */
const STANDARD_TEMPLATES: Record<string, StandardTemplate> = {
  std_prepare: {
    standard: 'I prepare',
    cue: (c) => `Start-of-session cue: ${c}`,
    exact_action: 'Rehearse the approved opening and one branch, out loud, exact words.',
    completion_evidence: 'A completed drill: the opening said in full and one branch completed. Not time on page.',
    review: 'After the drill, note the one line that hesitated. That line is tomorrow’s first repetition.',
  },
  std_one_question: {
    standard: 'I ask one clear question at a time',
    cue: (c) => `Each time a practice answer ends (session cue: ${c})`,
    exact_action: 'Ask exactly one question from the current node, then stop and wait for the full answer.',
    completion_evidence: 'A transition drill completed with no stacked questions.',
    review: 'Count stacked questions in the drill; aim for zero, note the moment it happened.',
  },
  std_listen_first: {
    standard: 'I listen before I answer',
    cue: (c) => `When a practice prospect starts answering (session cue: ${c})`,
    exact_action: 'Let the answer finish; acknowledge with one chosen phrase; refer to what they said; then ask.',
    completion_evidence: 'One transition drill completed using acknowledge → refer → ask.',
    review: 'Note whether the acknowledgment referred to their words, not yours.',
  },
  std_follow_script: {
    standard: 'I follow the script until I have earned the right to vary it',
    cue: (c) => `Start-of-session cue: ${c}`,
    exact_action: 'Run the exact-recall drill on the current script version; primary wording only, no mirror.',
    completion_evidence: 'An exact-recall drill completed on the same script version.',
    review: 'Compare recalled wording with the published version; mark divergences as items, not failures.',
  },
  std_respect_no_fit: {
    standard: 'I respect a no-fit case',
    cue: (c) => `When a mock scenario shows no meaningful gap (session cue: ${c})`,
    exact_action: 'End politely with the approved close-out line; do not reframe or push.',
    completion_evidence: 'One no-fit mock scenario ended cleanly, logged as respectful disqualification.',
    review: 'Confirm the ending was a decision, not an escape; note the line used.',
  },
  std_call_before_build: {
    standard: 'I make the call before I build the tool',
    cue: (c) => `Before opening the code editor (session cue: ${c})`,
    exact_action: 'Complete today’s drill first. Calling blocks are not available in Increment 1; the drill stands in.',
    completion_evidence: 'Drill completed before any build work started today.',
    review: 'Note whether build work started before the drill; adjust the cue if it keeps happening.',
  },
  std_keep_word: {
    standard: 'I keep my word to myself',
    cue: (c) => `Session cue: ${c}`,
    exact_action: 'Do the drill named on Today, at the chosen duration, or the difficult-day minimum.',
    completion_evidence: 'The named drill (or the minimum) marked complete with its evidence line.',
    review: 'Weekly: count kept days without judging missed ones.',
  },
  faithstd_keep_word: {
    standard: 'I keep my word: the drill I said I would do is the drill I do',
    cue: (c) => `Session cue: ${c}`,
    exact_action: 'Do the named drill for the chosen duration; on a hard day, the minimum.',
    completion_evidence: 'The named drill marked complete.',
    review: 'Weekly: count kept days; a missed day is information, not a verdict.',
  },
  faithstd_dignity: {
    standard: 'I treat every prospect with dignity, including when the answer is no',
    cue: (c) => `When a mock scenario opts out or shows no fit (session cue: ${c})`,
    exact_action: 'Stop at the first clear no; use the approved close-out line; no reframe ritual.',
    completion_evidence: 'One opt-out or no-fit scenario ended at the first clear no.',
    review: 'Note whether any pressure line was used after the no.',
  },
  faithstd_truth: {
    standard: 'I tell the truth about what I can deliver',
    cue: (c) => `When a mock prospect asks for price or capability (session cue: ${c})`,
    exact_action: 'Answer only from approved claims; say "not approved yet" where nothing is approved.',
    completion_evidence: 'One price/capability question answered without an unapproved claim.',
    review: 'List any claim that was not on the approved list.',
  },
  faithstd_rest: {
    standard: 'I rest one day a week',
    cue: () => 'The chosen rest day',
    exact_action: 'No drill; mark the day as rest. Progress is kept.',
    completion_evidence: 'Rest day marked; nothing else required.',
    review: 'Confirm the rest day actually happened.',
  },
  faithstd_quiet: {
    standard: 'I start each session with a moment of quiet',
    cue: (c) => `Start-of-session cue: ${c}`,
    exact_action: 'One minute of quiet before the first line of the drill.',
    completion_evidence: 'Quiet minute taken before the drill started.',
    review: 'Note whether skipping it changed the first line.',
  },
};

const DURATION_BY_OPTION: Record<string, number> = { dur_10: 10, dur_15: 15, dur_20: 20, dur_30: 30, dur_45: 45 };
const FREQUENCY_BY_OPTION: Record<string, string> = {
  freq_daily: 'Every day',
  freq_weekdays: 'Weekdays',
  freq_five_chosen: 'Five sessions a week, on days you choose',
  freq_three: 'Three sessions a week',
  freq_twice_daily_short: 'Twice a day, short sessions',
};
const CUE_BY_OPTION: Record<string, string> = {
  cue_first_thing: 'first thing in the morning',
  cue_before_build: 'before opening the code editor',
  cue_after_lunch: 'after lunch',
  cue_end_of_day: 'at the end of the workday',
  cue_calendar_block: 'at the calendar block you set',
};
const RECOVERY_BY_OPTION: Record<string, string> = {
  rec_resume_next: 'Resume the next day with the normal plan; no make-up session. A missed practice does not erase previous work.',
  rec_minimum_then_resume: 'Do the difficult-day minimum, then resume the normal plan. A missed practice does not erase previous work.',
  rec_shorten: 'Shorten the next session and resume. A missed practice does not erase previous work.',
  rec_review_adjust: 'Review the plan and adjust duration or frequency. A missed practice does not erase previous work.',
};

export const DEFAULT_RECOVERY_RULE = 'Resume at the next session. A missed practice does not erase previous work.';

/** Durations the person can choose (minutes) — the same values the interview offers. Never a default. */
export const DURATION_CHOICES: readonly number[] = [10, 15, 20, 30, 45];

function sectionIds(profile: IdentityProfile, key: string): string[] {
  return profile.sections.find((s) => s.key === key)?.answer_ids ?? [];
}

function firstMatch<T>(ids: readonly string[], table: Record<string, T>): T | undefined {
  for (const id of ids) {
    const hit = table[id];
    if (hit !== undefined) return hit;
  }
  return undefined;
}

export interface PlanSettings {
  /** Chosen duration in minutes, or `null` when the person has not chosen one (never a default). */
  duration_minutes: number | null;
  /** Where the duration came from: the interview answer, a later choice, or nowhere yet. */
  duration_source: 'interview' | 'chosen_later' | 'not_chosen';
  frequency: string;
  /** True when the frequency comes from an answer rather than the documented placeholder text. */
  frequency_chosen: boolean;
  cue: string;
  cue_chosen: boolean;
  recovery_rule: string;
}

/** Options for `planSettings` / `buildTrainingPlan`. */
export interface PlanOptions {
  /**
   * A duration chosen outside the interview (e.g. on Today when the interview left it open).
   * Used only when the profile itself carries no duration; the interview answer always wins.
   */
  duration_minutes?: number | null;
}

/**
 * Settings the plan reads from an endorsed profile (duration, frequency, cue, recovery).
 * An unchosen duration is `null` — the UI shows "—" and asks; it never invents "15 min".
 */
export function planSettings(profile: IdentityProfile, options: PlanOptions = {}): PlanSettings {
  const rhythm = sectionIds(profile, 'practice_duration');
  const fromInterview = firstMatch(rhythm, DURATION_BY_OPTION);
  const later = options.duration_minutes ?? null;
  const duration_minutes = fromInterview ?? later;
  const frequency = firstMatch(rhythm, FREQUENCY_BY_OPTION);
  const cue = firstMatch(rhythm, CUE_BY_OPTION);
  return {
    duration_minutes,
    duration_source: fromInterview !== undefined ? 'interview' : later !== null ? 'chosen_later' : 'not_chosen',
    frequency: frequency ?? 'At the frequency you choose (not set yet)',
    frequency_chosen: frequency !== undefined,
    cue: cue ?? 'the start of your practice session',
    cue_chosen: cue !== undefined,
    recovery_rule: firstMatch(sectionIds(profile, 'recovery_rule'), RECOVERY_BY_OPTION) ?? DEFAULT_RECOVERY_RULE,
  };
}

/**
 * Translate each endorsed standard into a training-plan item. Returns an empty list for an
 * unendorsed profile: nothing downstream reads a profile the person has not endorsed.
 * Example: "I prepare" → start-of-session cue → rehearse approved opening and one branch →
 * chosen duration (or `null` while unchosen) → completed drill (not time on page) → review →
 * recovery rule.
 */
export function buildTrainingPlan(profile: IdentityProfile, options: PlanOptions = {}): TrainingPlanItem[] {
  if (!profile.endorsed) return [];
  const settings = planSettings(profile, options);
  const standardIds = sectionIds(profile, 'chosen_standards').filter((id) => id in STANDARD_TEMPLATES);
  return standardIds.map((id) => {
    const t = STANDARD_TEMPLATES[id] as StandardTemplate;
    return {
      standard: t.standard,
      cue: t.cue(settings.cue),
      exact_action: t.exact_action,
      frequency: settings.frequency,
      duration_minutes: settings.duration_minutes,
      completion_evidence: t.completion_evidence,
      review: t.review,
      recovery_rule: settings.recovery_rule,
    };
  });
}

// ---------------------------------------------------------------------------------------
// Reading an endorsed profile (Today, Profile)
// ---------------------------------------------------------------------------------------

/**
 * True only when `profile` is endorsed AND still describes `session` exactly: same session id and
 * the same reviewable content (fingerprint). A back-edit after endorsement, or a fresh session
 * after "Start over", makes the stored profile stale — Today must then fall back to its empty
 * state rather than keep reading it.
 */
export function isProfileCurrent(profile: IdentityProfile | null | undefined, version: InterviewVersion, session: InterviewSession | null | undefined): boolean {
  if (!profile || !profile.endorsed || !session) return false;
  if (session.version_id !== version.id || profile.session_id !== session.id) return false;
  return profileFingerprint(buildProfile(version, session)) === profileFingerprint(profile);
}

/**
 * The substantive options a profile carries for one screen, in the screen's option order.
 * Uncertainty / none answers yield an empty list (the profile marks them as unknowns).
 * Reads only `answer_ids`; nothing is inferred.
 */
export function selectedOptions(profile: IdentityProfile, version: InterviewVersion, screenId: string): InterviewScreen['options'] {
  const screen = findScreen(version, screenId);
  if (!screen) return [];
  const ids = new Set(profile.sections.find((s) => s.key === screen.profile_field)?.answer_ids ?? []);
  if (!ids.has(screen.id)) return [];
  return screen.options.filter((o) => ids.has(o.id));
}

/** First selected option of a single-choice screen, or null. */
export function selectedOption(profile: IdentityProfile, version: InterviewVersion, screenId: string): InterviewScreen['options'][number] | null {
  return selectedOptions(profile, version, screenId)[0] ?? null;
}

/** Label of an option id on a screen (substantive, uncertainty or none), or the id itself. */
export function optionLabelOf(screen: InterviewScreen, optionId: string): string {
  return optionLabel(screen, optionId);
}

// ---------------------------------------------------------------------------------------
// Privacy boundary
// ---------------------------------------------------------------------------------------

/**
 * Structural guard (brief §4, framework §7, scenario 30): private interview answers never
 * enter a prospect-visible message or the live prospect-profile context.
 *
 * This function is the ONLY export whose name mentions prospects. It accepts nothing
 * useful, returns `never`, and always throws `InterviewPrivacyError`. Any code path that
 * tries to build prospect context from the interview has to call this — and fails loudly
 * at runtime and in tests — rather than quietly serialising answers. There is no
 * alternative serializer in this module that takes a prospect, a call or a scenario.
 */
export function exportForProspectContext(...anything: unknown[]): never {
  // The arguments are deliberately discarded; their length is read only so no linter can
  // argue they are unused and so no future edit quietly starts serialising them.
  void anything.length;
  throw new InterviewPrivacyError();
}

/** Storage keys that belong to the interview; used for scoped export/delete. */
export const INTERVIEW_STORAGE_KEYS = ['interview.session', 'interview.profile'] as const;
