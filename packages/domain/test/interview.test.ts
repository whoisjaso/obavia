import { describe, expect, it } from 'vitest';
import { isPlaceholderSeed, loadIdentityInterview } from '../src/seeds';
import { IdentityProfile, InterviewSession, InterviewVersion, TrainingPlanItem } from '../src/schemas/interview';
import {
  InterviewPrivacyError,
  REVIEW_SCREEN_ID,
  applyAnswer,
  buildProfile,
  buildTrainingPlan,
  conditionHolds,
  createSession,
  displayStatus,
  endorseProfile,
  exportForProspectContext,
  findScreen,
  invalidateDependents,
  isComplete,
  isProfileCurrent,
  nextScreenId,
  planSettings,
  prevScreenId,
  progress,
  selectedOption,
  selectedOptions,
  selectionProblem,
  sortedScreens,
  toggleSelection,
  visibleScreens,
} from '../src/interview';

const version = loadIdentityInterview();
const NOW = '2026-09-10T12:00:00.000Z';

function screen(id: string) {
  const s = findScreen(version, id);
  if (!s) throw new Error(`missing screen ${id}`);
  return s;
}

/** Answer every visible base screen with its first substantive option, leaving conditionals untouched. */
function answerAllBase(session: InterviewSession): InterviewSession {
  let s = session;
  for (const sc of sortedScreens(version)) {
    if (sc.base_or_conditional !== 'base') continue;
    const first = sc.options[0];
    if (!first) throw new Error('screen without options');
    s = applyAnswer(s, sc, [first.id], 'answered', { version, now: NOW });
  }
  return s;
}

describe('identity interview seed', () => {
  it('is authored (no placeholder marker) and parses as an InterviewVersion', () => {
    expect(isPlaceholderSeed(version)).toBe(false);
    expect(InterviewVersion.safeParse(version).success).toBe(true);
    expect(version.id).toBe('identity-interview');
    expect(version.version).toBe(1);
  });

  it('has exactly 30 base screens and 3 conditional screens (33 total)', () => {
    expect(version.screens).toHaveLength(33);
    expect(version.screens.filter((s) => s.base_or_conditional === 'base')).toHaveLength(30);
    expect(version.screens.filter((s) => s.base_or_conditional === 'conditional')).toHaveLength(3);
  });

  it('every screen has 3–7 options, allows skip, has an uncertainty option, and multi screens state their limit', () => {
    const optionIds = new Set<string>();
    for (const s of version.screens) {
      expect(s.options.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.options.length, s.id).toBeLessThanOrEqual(7);
      expect(s.allow_skip, s.id).toBe(true);
      expect(s.uncertainty_option, s.id).toBeDefined();
      if (s.kind === 'multi') {
        expect(s.max_select, s.id).toBeGreaterThan(0);
        expect(`${s.prompt} ${s.help ?? ''}`, s.id).toMatch(new RegExp(`up to ${s.max_select}`));
      }
      for (const o of s.options) {
        expect(optionIds.has(o.id), `duplicate option id ${o.id}`).toBe(false);
        optionIds.add(o.id);
      }
    }
  });

  it('conditional screens reference an existing trigger screen and its option ids', () => {
    for (const s of version.screens) {
      if (!s.condition) continue;
      const trigger = findScreen(version, s.condition.screen_id);
      expect(trigger, s.id).toBeDefined();
      for (const id of s.condition.any_of) expect(trigger?.options.some((o) => o.id === id), `${s.id}:${id}`).toBe(true);
    }
  });

  it('keeps the six human needs as an optional lens on two separate screens', () => {
    const current = screen('needs_current');
    const desired = screen('needs_desired');
    expect(current.help).toMatch(/optional lens, not a validated test/i);
    expect(desired.help).toMatch(/optional lens, not a validated test/i);
    expect(current.options).toHaveLength(6);
    expect(desired.options).toHaveLength(6);
  });

  it('faith context is multi-select (its options are jointly true) and the biggest-blocker screen lists the vocabulary-reminder failure point', () => {
    const faith = screen('faith_context');
    expect(faith.kind).toBe('multi');
    expect(faith.max_select).toBe(3);
    expect(toggleSelection(faith, ['faith_reason'], 'faith_people')).toEqual(['faith_reason', 'faith_people']);
    const blocker = screen('friction_biggest');
    expect(blocker.options.map((o) => o.id)).toContain('big_vocab');
  });

  it('option descriptions describe, never pronounce a verdict on the person', () => {
    const descriptions = version.screens.flatMap((s) => s.options.map((o) => o.description ?? ''));
    for (const banned of ['it will again', 'not quite me yet', 'is not yet', 'teach fastest', 'but it sticks', 'instead of forcing', 'is a good outcome']) {
      expect(descriptions.some((d) => d.toLowerCase().includes(banned)), banned).toBe(false);
    }
  });

  it('uses no shame or readiness language', () => {
    const text = JSON.stringify(version).toLowerCase();
    for (const banned of ['readiness', 'shame', 'billionaire readiness', 'lazy', 'failure to']) {
      expect(text.includes(banned), banned).toBe(false);
    }
  });
});

describe('visibility and navigation', () => {
  it('shows only base screens on a fresh session', () => {
    const session = createSession(version, NOW, 'test');
    expect(visibleScreens(version, session.answers)).toHaveLength(30);
    expect(progress(session, version)).toEqual({ answered: 0, skipped: 0, not_applicable: 3, remaining: 30, total_visible: 30 });
  });

  it('gates each conditional screen on its declared condition holding on an ANSWERED answer', () => {
    let session = createSession(version, NOW, 'test');
    const offer = screen('offer_hypothesis');
    session = applyAnswer(session, offer, ['dealership_follow_through'], 'answered', { version, now: NOW });
    expect(visibleScreens(version, session.answers).some((s) => s.id === 'offer_least_control')).toBe(true);
    expect(nextScreenId(version, session.answers, 'offer_hypothesis')).toBe('offer_least_control');

    session = applyAnswer(session, offer, ['offer_different'], 'answered', { version, now: NOW });
    expect(visibleScreens(version, session.answers).some((s) => s.id === 'offer_least_control')).toBe(false);
    expect(nextScreenId(version, session.answers, 'offer_hypothesis')).toBe('offer_materials');

    // A skipped trigger never satisfies a condition.
    session = applyAnswer(session, offer, [], 'skipped', { version, now: NOW });
    expect(conditionHolds(screen('offer_least_control').condition!, session.answers)).toBe(false);
  });

  it('gates the repetition-block and faith conditionals', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('learning_style'), ['repetition_blocks', 'learn_one_correction'], 'answered', { version, now: NOW });
    expect(visibleScreens(version, session.answers).map((s) => s.id)).toContain('repetition_block_length');
    session = applyAnswer(session, screen('faith_context'), ['faith_private'], 'answered', { version, now: NOW });
    expect(visibleScreens(version, session.answers).map((s) => s.id)).not.toContain('faith_practice_standard');
    session = applyAnswer(session, screen('faith_context'), ['faith_people'], 'answered', { version, now: NOW });
    expect(visibleScreens(version, session.answers).map((s) => s.id)).toContain('faith_practice_standard');
    expect(nextScreenId(version, session.answers, 'faith_context')).toBe('faith_practice_standard');
    expect(prevScreenId(version, session.answers, 'faith_practice_standard')).toBe('faith_context');
  });

  it('nextScreenId reaches the review screen after the last visible screen; prev from review is the last screen', () => {
    const session = createSession(version, NOW, 'test');
    const visible = visibleScreens(version, session.answers);
    const last = visible[visible.length - 1]!;
    expect(nextScreenId(version, session.answers, last.id)).toBe(REVIEW_SCREEN_ID);
    expect(prevScreenId(version, session.answers, REVIEW_SCREEN_ID)).toBe(last.id);
    expect(prevScreenId(version, session.answers, visible[0]!.id)).toBeNull();
  });
});

describe('selection rules', () => {
  const multi = screen('identity_statements'); // max 4
  const single = screen('practice_duration');

  it('enforces max_select on multi screens (toggle refuses, apply throws)', () => {
    const ids = multi.options.map((o) => o.id);
    let sel: string[] = [];
    for (const id of ids.slice(0, 4)) sel = toggleSelection(multi, sel, id);
    expect(sel).toHaveLength(4);
    expect(toggleSelection(multi, sel, ids[4]!)).toEqual(sel);
    expect(selectionProblem(multi, ids.slice(0, 5))).toMatch(/up to 4/);
    const session = createSession(version, NOW, 'test');
    expect(() => applyAnswer(session, multi, ids.slice(0, 5), 'answered', { version, now: NOW })).toThrow(/up to 4/);
  });

  it('single screens replace the selection', () => {
    let sel = toggleSelection(single, [], 'dur_10');
    sel = toggleSelection(single, sel, 'dur_30');
    expect(sel).toEqual(['dur_30']);
  });

  it('uncertainty clears substantive options and vice versa; uncertainty and none are mutually exclusive', () => {
    const unsure = multi.uncertainty_option!.id;
    const none = multi.none_option!.id;
    let sel = toggleSelection(multi, ['std_prepare', 'std_one_question'], unsure);
    expect(sel).toEqual([unsure]);
    sel = toggleSelection(multi, sel, 'std_prepare');
    expect(sel).toEqual(['std_prepare']);
    sel = toggleSelection(multi, [unsure], none);
    expect(sel).toEqual([none]);
    expect(selectionProblem(multi, [unsure, none])).toMatch(/mutually exclusive/);
    expect(selectionProblem(multi, [unsure, 'std_prepare'])).toMatch(/cannot be combined/);
    const session = createSession(version, NOW, 'test');
    expect(() => applyAnswer(session, multi, [unsure, 'std_prepare'], 'answered', { version, now: NOW })).toThrow();
  });

  it('rejects an empty "answered" selection and rejects foreign option ids', () => {
    const session = createSession(version, NOW, 'test');
    expect(() => applyAnswer(session, single, [], 'answered', { version, now: NOW })).toThrow(/skip/);
    expect(() => applyAnswer(session, single, ['std_prepare'], 'answered', { version, now: NOW })).toThrow(/does not belong/);
    expect(() => toggleSelection(single, [], 'nope')).toThrow();
  });
});

describe('statuses and progress', () => {
  it('skip stores status "skipped" with an empty selection and is never counted as answered', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('needs_current'), ['now_growth'], 'skipped', { version, now: NOW });
    expect(session.answers['needs_current']).toEqual({
      screen_id: 'needs_current',
      status: 'skipped',
      selected_option_ids: [],
      answered_at: NOW,
    });
    const p = progress(session, version);
    expect(p.answered).toBe(0);
    expect(p.skipped).toBe(1);
    expect(p.remaining).toBe(29);
  });

  it('persists answered, skipped and not_applicable separately and validates against the schema', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('offer_hypothesis'), ['dealership_follow_through'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('offer_least_control'), ['lc_crm_access'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('unknowns'), [], 'skipped', { version, now: NOW });
    session = applyAnswer(session, screen('offer_hypothesis'), ['offer_not_decided'], 'answered', { version, now: NOW });
    expect(session.answers['offer_hypothesis']?.status).toBe('answered');
    expect(session.answers['unknowns']?.status).toBe('skipped');
    expect(session.answers['offer_least_control']?.status).toBe('not_applicable');
    expect(InterviewSession.safeParse(session).success).toBe(true);
  });

  it('is complete only when every visible screen is answered or skipped', () => {
    let session = createSession(version, NOW, 'test');
    expect(isComplete(session, version)).toBe(false);
    session = answerAllBase(session);
    // First option of faith_context (faith_reason) and learning_style (repetition_blocks) unlock two conditionals;
    // offer_hypothesis first option (dealership_follow_through) unlocks the third.
    const p = progress(session, version);
    expect(p.total_visible).toBe(33);
    expect(p.answered).toBe(30);
    expect(p.remaining).toBe(3);
    expect(p.not_applicable).toBe(0);
    expect(isComplete(session, version)).toBe(false);
    for (const id of ['faith_practice_standard', 'repetition_block_length', 'offer_least_control']) {
      session = applyAnswer(session, screen(id), [screen(id).options[0]!.id], 'answered', { version, now: NOW });
    }
    expect(isComplete(session, version)).toBe(true);
    expect(progress(session, version)).toEqual({ answered: 33, skipped: 0, not_applicable: 0, remaining: 0, total_visible: 33 });
  });
});

describe('back-edit invalidation', () => {
  it('marks a dependent not_applicable with invalidated_by when the condition stops holding', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('learning_style'), ['repetition_blocks'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('repetition_block_length'), ['block_10'], 'answered', { version, now: NOW });
    expect(progress(session, version).answered).toBe(2);

    session = applyAnswer(session, screen('learning_style'), ['learn_write_out'], 'answered', { version, now: NOW });
    const dep = session.answers['repetition_block_length'];
    expect(dep?.status).toBe('not_applicable');
    expect(dep?.invalidated_by).toBe('learning_style');
    expect(dep?.selected_option_ids).toEqual([]);
    expect(visibleScreens(version, session.answers).map((s) => s.id)).not.toContain('repetition_block_length');
    expect(progress(session, version)).toMatchObject({ answered: 1, not_applicable: 3, total_visible: 30 });
  });

  it('removes a dependent from completion (needs re-answer) when the trigger changes but the condition still holds', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('learning_style'), ['repetition_blocks', 'learn_write_out'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('repetition_block_length'), ['block_10'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('learning_style'), ['repetition_blocks'], 'answered', { version, now: NOW });
    expect(displayStatus(session, 'repetition_block_length')).toBe('needs_reanswer');
    expect(session.answers['repetition_block_length']?.invalidated_by).toBe('learning_style');
    expect(progress(session, version)).toMatchObject({ answered: 1, remaining: 30, total_visible: 31 });
    // Confirming the same answer again clears the flag.
    session = applyAnswer(session, screen('repetition_block_length'), ['block_10'], 'answered', { version, now: NOW });
    expect(displayStatus(session, 'repetition_block_length')).toBe('answered');
  });

  it('re-answering the trigger with the same selection does not invalidate dependents', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('offer_hypothesis'), ['dealership_follow_through'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('offer_least_control'), ['lc_lead_quality'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('offer_hypothesis'), ['dealership_follow_through'], 'answered', { version, now: NOW });
    expect(displayStatus(session, 'offer_least_control')).toBe('answered');
  });

  it('a not_applicable dependent re-enters as remaining when the condition holds again', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('faith_context'), ['faith_reason'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('faith_practice_standard'), ['faithstd_truth'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('faith_context'), ['faith_private'], 'answered', { version, now: NOW });
    expect(session.answers['faith_practice_standard']?.status).toBe('not_applicable');
    session = applyAnswer(session, screen('faith_context'), ['faith_identity'], 'answered', { version, now: NOW });
    expect(session.answers['faith_practice_standard']).toBeUndefined();
    expect(displayStatus(session, 'faith_practice_standard')).toBe('unanswered');
    expect(progress(session, version).remaining).toBe(30);
  });

  it('invalidateDependents can be called directly', () => {
    let session = createSession(version, NOW, 'test');
    session = applyAnswer(session, screen('offer_hypothesis'), ['dealership_follow_through'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('offer_least_control'), ['lc_lead_quality'], 'answered', { version, now: NOW });
    // Simulate a raw change to the trigger without going through applyAnswer.
    const raw: InterviewSession = {
      ...session,
      answers: { ...session.answers, offer_hypothesis: { ...session.answers['offer_hypothesis']!, selected_option_ids: ['offer_different'] } },
    };
    const fixed = invalidateDependents(raw, 'offer_hypothesis', version, NOW);
    expect(fixed.answers['offer_least_control']?.status).toBe('not_applicable');
    expect(fixed.answers['offer_least_control']?.invalidated_by).toBe('offer_hypothesis');
  });
});

describe('profile', () => {
  function completedSession(): InterviewSession {
    let session = answerAllBase(createSession(version, NOW, 'test'));
    session = applyAnswer(session, screen('faith_practice_standard'), ['faithstd_truth'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('repetition_block_length'), ['block_10'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('offer_least_control'), ['lc_staff_follow_up'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('needs_current'), [], 'skipped', { version, now: NOW });
    session = applyAnswer(session, screen('unknowns'), ['unk_price', 'unk_who_first'], 'answered', { version, now: NOW });
    session = applyAnswer(session, screen('beliefs_self'), [screen('beliefs_self').uncertainty_option!.id], 'answered', { version, now: NOW });
    return session;
  }

  it('carries screen ids and selected option ids as answer_ids, validates against the schema, and is unendorsed', () => {
    const profile = buildProfile(version, completedSession());
    expect(IdentityProfile.safeParse(profile).success).toBe(true);
    expect(profile.endorsed).toBe(false);
    const standards = profile.sections.find((s) => s.key === 'chosen_standards')!;
    expect(standards.answer_ids).toContain('identity_statements');
    expect(standards.answer_ids).toContain('std_prepare');
    expect(standards.answer_ids).toContain('faithstd_truth');
    expect(standards.summary).toContain('I prepare');
    const phrases = profile.sections.find((s) => s.key === 'preferred_phrases')!;
    expect(phrases.answer_ids).toContain('ack_right');
    expect(phrases.summary).toContain('Right');
    expect(profile.sections.map((s) => s.key)).toEqual([
      'success_definitions',
      'beliefs',
      'identity',
      'chosen_standards',
      'current_friction',
      'desired_behavior',
      'preferred_phrases',
      'learning_style',
      'next_drill',
      'practice_duration',
      'difficult_day_minimum',
      'recovery_rule',
      'offer_hypothesis',
      'delivery_dependencies',
      'needs_current',
      'needs_desired',
      'unknowns',
    ]);
  });

  it('lists explicit unknowns from the unknowns screen, skipped screens and uncertainty answers', () => {
    const profile = buildProfile(version, completedSession());
    expect(profile.unknowns).toContain('What the price should be.');
    expect(profile.unknowns).toContain('Which dealerships to talk to first.');
    expect(profile.unknowns.some((u) => u.includes('optional lens') && u.includes('skipped'))).toBe(true);
    expect(profile.unknowns.some((u) => u.startsWith('Belief about myself as a seller') && u.includes('not sure'))).toBe(true);
  });

  it('never emits scores, percentages or diagnoses', () => {
    const profile = buildProfile(version, completedSession());
    const text = JSON.stringify(profile);
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/score|readiness|diagnos|personality|dominant|fear/i);
    for (const section of profile.sections) {
      for (const value of Object.values(section)) expect(typeof value).not.toBe('number');
    }
  });

  it('endorseProfile sets endorsed and endorsed_at without changing sections', () => {
    const profile = buildProfile(version, completedSession());
    const endorsed = endorseProfile(profile, NOW);
    expect(endorsed.endorsed).toBe(true);
    expect(endorsed.endorsed_at).toBe(NOW);
    expect(endorsed.sections).toEqual(profile.sections);
    expect(IdentityProfile.safeParse(endorsed).success).toBe(true);
  });

  it('builds a training plan only from an endorsed profile, with the brief’s example mapping', () => {
    const session = completedSession();
    const profile = buildProfile(version, session);
    expect(buildTrainingPlan(profile)).toEqual([]);
    const plan = buildTrainingPlan(endorseProfile(profile, NOW));
    expect(plan.length).toBeGreaterThan(0);
    for (const item of plan) expect(TrainingPlanItem.safeParse(item).success).toBe(true);
    const prepare = plan.find((p) => p.standard === 'I prepare')!;
    expect(prepare.cue).toMatch(/start-of-session cue/i);
    expect(prepare.exact_action).toMatch(/rehearse the approved opening and one branch/i);
    expect(prepare.duration_minutes).toBe(10); // first option of practice_duration = dur_10
    expect(prepare.frequency).toBe('Every day');
    expect(prepare.completion_evidence).toMatch(/completed drill/i);
    expect(prepare.completion_evidence).toMatch(/not time on page/i);
    expect(prepare.review.length).toBeGreaterThan(0);
    expect(prepare.recovery_rule).toMatch(/does not erase previous work/);
    expect(plan.some((p) => p.standard.startsWith('I tell the truth'))).toBe(true);
  });

  it('an unchosen practice duration is null, never a default number; a later choice fills it only when the interview left it open', () => {
    let session = completedSession();
    session = applyAnswer(session, screen('practice_duration'), [screen('practice_duration').uncertainty_option!.id], 'answered', { version, now: NOW });
    const profile = endorseProfile(buildProfile(version, session), NOW);
    const settings = planSettings(profile);
    expect(settings.duration_minutes).toBeNull();
    expect(settings.duration_source).toBe('not_chosen');
    const plan = buildTrainingPlan(profile);
    expect(plan.length).toBeGreaterThan(0);
    for (const item of plan) {
      expect(item.duration_minutes).toBeNull();
      expect(TrainingPlanItem.safeParse(item).success).toBe(true);
    }
    expect(JSON.stringify(plan)).not.toContain('15');

    const later = planSettings(profile, { duration_minutes: 20 });
    expect(later.duration_minutes).toBe(20);
    expect(later.duration_source).toBe('chosen_later');
    expect(buildTrainingPlan(profile, { duration_minutes: 20 })[0]?.duration_minutes).toBe(20);

    // The interview answer always wins over a later choice.
    const chosen = endorseProfile(buildProfile(version, completedSession()), NOW);
    expect(planSettings(chosen, { duration_minutes: 45 })).toMatchObject({ duration_minutes: 10, duration_source: 'interview' });
  });

  it('isProfileCurrent is true only for an endorsed profile that still matches the session exactly', () => {
    const session = completedSession();
    const unendorsed = buildProfile(version, session);
    expect(isProfileCurrent(unendorsed, version, session)).toBe(false);
    const endorsed = endorseProfile(unendorsed, NOW);
    expect(isProfileCurrent(endorsed, version, session)).toBe(true);
    // A back-edit after endorsement makes the stored profile stale.
    const edited = applyAnswer(session, screen('practice_duration'), ['dur_20'], 'answered', { version, now: NOW });
    expect(isProfileCurrent(endorsed, version, edited)).toBe(false);
    // "Start over" (a fresh session) never keeps an old endorsement.
    expect(isProfileCurrent(endorsed, version, createSession(version, NOW, 'fresh'))).toBe(false);
    expect(isProfileCurrent(endorsed, version, null)).toBe(false);
    expect(isProfileCurrent(null, version, session)).toBe(false);
  });

  it('selectedOptions reads the chosen options of a screen from answer ids only', () => {
    const profile = buildProfile(version, completedSession());
    expect(selectedOption(profile, version, 'next_drill')?.id).toBe('drill_opening_recall');
    expect(selectedOption(profile, version, 'identity_primary')?.label).toBe('I prepare');
    expect(selectedOptions(profile, version, 'unknowns').map((o) => o.id)).toEqual(['unk_price', 'unk_who_first']);
    // Uncertainty answers and skipped screens yield nothing.
    expect(selectedOptions(profile, version, 'beliefs_self')).toEqual([]);
    expect(selectedOptions(profile, version, 'needs_current')).toEqual([]);
    expect(selectedOptions(profile, version, 'no_such_screen')).toEqual([]);
  });

  it('exportForProspectContext is structurally blocked', () => {
    const profile = endorseProfile(buildProfile(version, completedSession()), NOW);
    expect(() => exportForProspectContext(profile)).toThrow(InterviewPrivacyError);
    expect(() => exportForProspectContext()).toThrow(/never enter a prospect context/);
  });
});
