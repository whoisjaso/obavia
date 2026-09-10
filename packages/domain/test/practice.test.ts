import { describe, expect, it } from 'vitest';
import { PracticeAttempt, ScriptNode } from '../src/schemas';
import { loadScriptNodes } from '../src/seeds';
import {
  ASK_MEANING_CHOICE_ID,
  EXIT_CHOICES,
  MIRROR_CHOICE_ID,
  NOT_A_VOICE_CALL,
  PRACTICE_SCENARIOS,
  RESPECTFUL_DISQUALIFICATION_NOTE,
  SIMULATION_DISCLAIMER,
  TONE_NOTE,
  advanceMock,
  attemptFromResult,
  branchClassification,
  branchClassificationItems,
  coachView,
  deliveryReplay,
  evaluatorView,
  exactRecall,
  exactRecallScore,
  fullMock,
  gradeChoice,
  gradeDeliveryReplay,
  gradeExactRecall,
  gradeOrder,
  lcsLength,
  maskForMode,
  mirrorDuel,
  mockOutcomeScore,
  normalizeWords,
  orderRehearsal,
  orderScore,
  practiceThisMoment,
  practiceThisMomentComparison,
  randomizedNodeLookup,
  recallWithReveal,
  seededShuffle,
  summarizeAttempts,
  vocabularyMeaning,
  type CoachView,
} from '../src/practice';

// ---------------------------------------------------------------------------------------
// Fixture: five valid ScriptNodes constructed here (independent of the real seed's contents).
// ---------------------------------------------------------------------------------------

function node(partial: Partial<ScriptNode> & Pick<ScriptNode, 'id' | 'stage' | 'primary_word_track'>): ScriptNode {
  return ScriptNode.parse({
    script_version_id: 'fixture-v1',
    role_applicability: ['cold', 'setter'],
    source_question_ids: [],
    intended_answer_type: 'A concrete answer.',
    required_context: [],
    sufficient_answer_examples: [],
    insufficient_answer_examples: [],
    mirror_variants: [],
    bridge_template: '{ack} — {question}',
    delivery_overlay: { tone_cue: 'Curious (instructor-described).', pacing_cue: 'Ask, then pause.' },
    completion_criteria: 'Answered.',
    branches: [],
    stop_or_skip_conditions: [],
    why_this_now: 'Because the stage needs it.',
    what_to_listen_for: 'Specifics.',
    approval: { status: 'draft' },
    ...partial,
  });
}

const ENTRY = node({
  id: 'fx-entry',
  stage: 'entry',
  role_applicability: ['cold', 'setter'],
  primary_word_track: 'Hi, this is Jason with Apohenia — is this a bad time, or can I take sixty seconds?',
  intended_answer_type: 'Permission to continue.',
  sufficient_answer_examples: ['Go ahead, you have a minute.'],
  insufficient_answer_examples: ['Hmm. (no answer yet — ask again briefly)'],
  mirror_variants: ['Have I caught you at a bad moment?'],
  branches: [
    { label: 'Permission given', answer_category: 'permission', next_node_id: 'fx-intent' },
    { label: 'Not now', answer_category: 'not_now', next_node_id: null },
    { label: 'Asks to stop', answer_category: 'opt_out', next_node_id: null },
  ],
  why_this_now: 'Permission first; the source treats the opener as earning the next minute.',
});

const INTENT = node({
  id: 'fx-intent',
  stage: 'intent',
  primary_word_track: 'What specifically would you want to be different about how inquiries are handled?',
  intended_answer_type: 'A tangible goal.',
  sufficient_answer_examples: ['Every web inquiry answered the same day.', 'No evening inquiry waiting until Monday.'],
  insufficient_answer_examples: ['Just better. (no tangible — ask what better looks like)'],
  mirror_variants: ['If this were working the way you want, what would be true?', 'What would you see that you do not see now?'],
  branches: [
    { label: 'Tangible goal stated', answer_category: 'answered', next_node_id: 'fx-process' },
    { label: 'Declines', answer_category: 'declined', next_node_id: 'fx-process' },
  ],
  why_this_now: 'Without a tangible goal every later question floats.',
});

const PROCESS = node({
  id: 'fx-process',
  stage: 'logical_certainty',
  substage: 'process',
  primary_word_track: 'Walk me through what happens today when an inquiry comes in.',
  intended_answer_type: 'The current process, step by step.',
  sufficient_answer_examples: ['It goes to the sales inbox and whoever is on the desk answers.'],
  insufficient_answer_examples: ['We handle it. (no steps — ask who does what first)'],
  mirror_variants: ['Who sees an inquiry first, and what do they do with it?'],
  branches: [{ label: 'Process described', answer_category: 'answered', next_node_id: 'fx-history' }],
  why_this_now: 'Process before problem: the source asks what happens before asking what is wrong.',
});

const HISTORY = node({
  id: 'fx-history',
  stage: 'logical_certainty',
  substage: 'duration_origin',
  primary_word_track: 'How long has it worked that way — and what led you to set it up like that?',
  intended_answer_type: 'Duration and origin.',
  sufficient_answer_examples: ['Since we switched CRMs two years ago; the vendor set it up.'],
  insufficient_answer_examples: ['A while. (no duration — ask months or years)'],
  mirror_variants: ['Was this set up on purpose, or did it just settle into place?'],
  branches: [
    { label: 'Answered', answer_category: 'answered', next_node_id: 'fx-concern' },
    { label: 'Declines', answer_category: 'declined', next_node_id: 'fx-concern' },
  ],
  why_this_now: 'Hearing themselves explain an inherited process opens them to a different one.',
});

const CONCERN = node({
  id: 'fx-concern',
  stage: 'concern',
  primary_word_track: 'What would need to be true for this to be a clear yes or a clear no?',
  intended_answer_type: 'The real concern behind hesitation.',
  sufficient_answer_examples: ['I cannot spend anything without my partner.'],
  insufficient_answer_examples: ['Let me think about it. (no concern named — ask what specifically)'],
  mirror_variants: [],
  branches: [
    { label: 'Budget', answer_category: 'budget', next_node_id: null },
    { label: 'Authority', answer_category: 'authority', next_node_id: null },
    { label: 'Unknown', answer_category: 'unknown', next_node_id: null },
  ],
  why_this_now: 'Diagnose before you answer.',
});

const NODES: ScriptNode[] = [ENTRY, INTENT, PROCESS, HISTORY, CONCERN];

// ---------------------------------------------------------------------------------------

describe('scoring', () => {
  it('normalizeWords lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeWords('  Hi,  THIS is   Jason — with "Apohenia"!  ')).toEqual(['hi', 'this', 'is', 'jason', 'with', 'apohenia']);
    expect(normalizeWords("don't")).toEqual(["don't"]);
  });

  it('exactRecallScore is deterministic with exact ratios, missing and extra words', () => {
    const a = exactRecallScore('the quick brown fox', 'the quick fox brown extra');
    const b = exactRecallScore('the quick brown fox', 'the quick fox brown extra');
    expect(a).toEqual(b);
    expect(a.exact_match_ratio).toBe(1);
    expect(a.word_order_ratio).toBe(0.75); // LCS "the quick brown" or "the quick fox" = 3 / 4
    expect(a.missing_words).toEqual([]);
    expect(a.extra_words).toEqual(['extra']);

    const c = exactRecallScore('one two three four', 'one three');
    expect(c.exact_match_ratio).toBe(0.5);
    expect(c.word_order_ratio).toBe(0.5);
    expect(c.missing_words).toEqual(['two', 'four']);
    expect(exactRecallScore('a b', 'A, b.').exact_match_ratio).toBe(1);
    expect(exactRecallScore('a b', '').exact_match_ratio).toBe(0);
  });

  it('LCS order ratio penalises reordering but not omission of order', () => {
    expect(lcsLength(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(1);
    expect(exactRecallScore('a b c', 'c b a').word_order_ratio).toBeCloseTo(1 / 3);
    expect(orderScore(['n1', 'n2', 'n3'], ['n1', 'n3', 'n2'])).toEqual({ position_ratio: 1 / 3, word_order_ratio: 2 / 3, missing_ids: [] });
    expect(orderScore(['n1', 'n2'], ['n2']).missing_ids).toEqual(['n1']);
  });

  it('seeded shuffle is reproducible and leaves the input untouched', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const copy = [...input];
    expect(seededShuffle(input, 7)).toEqual(seededShuffle(input, 7));
    expect(seededShuffle(input, 7)).not.toEqual(seededShuffle(input, 8));
    expect(input).toEqual(copy);
  });
});

describe('maskForMode', () => {
  it('shows everything in full_script (default) and only the stage when unassisted', () => {
    const full = maskForMode(INTENT);
    expect(full.mode).toBe('full_script');
    expect(full.primary).toBe(INTENT.primary_word_track);
    expect(full.mirrors).toEqual(INTENT.mirror_variants);
    expect(full.purpose).toBe(INTENT.why_this_now);
    const un = maskForMode(INTENT, 'unassisted');
    expect(un).toMatchObject({ primary: null, mirrors: [], purpose: null, listen_for: null, stage: 'intent' });
  });

  it('recall_with_reveal hides the line until revealed; the other modes mask as documented', () => {
    const hidden = maskForMode(INTENT, 'recall_with_reveal', false);
    expect(hidden.primary).toBeNull();
    expect(hidden.can_reveal).toBe(true);
    expect(hidden.purpose).toBe(INTENT.why_this_now);
    const shown = maskForMode(INTENT, 'recall_with_reveal', true);
    expect(shown.primary).toBe(INTENT.primary_word_track);
    expect(shown.can_reveal).toBe(false);
    const pm = maskForMode(INTENT, 'primary_plus_mirror');
    expect(pm.primary).toBe(INTENT.primary_word_track);
    expect(pm.mirrors).toHaveLength(2);
    expect(pm.purpose).toBeNull();
    const cue = maskForMode(INTENT, 'stage_purpose_cue');
    expect(cue.primary).toBeNull();
    expect(cue.purpose).toBe(INTENT.why_this_now);
    // No mode emits a rank, badge or score.
    for (const m of [maskForMode(INTENT), hidden, shown, pm, cue] as unknown as Record<string, unknown>[]) {
      expect(Object.keys(m).some((k) => /score|rank|badge|level/i.test(k))).toBe(false);
    }
  });
});

describe('branch classification', () => {
  it('insufficient examples require a mirror; sufficient examples map to a progress branch; categories map to their branch', () => {
    const items = branchClassificationItems(INTENT);
    const insufficient = items.filter((i) => i.id.includes(':insufficient:'));
    const sufficient = items.filter((i) => i.id.includes(':sufficient:'));
    const category = items.filter((i) => i.id.includes(':category:'));
    expect(insufficient).toHaveLength(1);
    expect(sufficient).toHaveLength(2);
    expect(category).toHaveLength(2);
    expect(insufficient[0]!.correct_choice_ids).toEqual([MIRROR_CHOICE_ID]);
    expect(insufficient[0]!.synthetic_prospect_line).toBe(INTENT.insufficient_answer_examples[0]);
    expect(sufficient[0]!.correct_choice_ids).toEqual(['branch:answered']); // declined is non-progress
    expect(category[1]!.correct_choice_ids).toEqual(['branch:declined']);
    // Every item offers each branch plus the mirror option.
    for (const i of items) expect(i.choices.map((c) => c.id)).toEqual(['branch:answered', 'branch:declined', MIRROR_CHOICE_ID]);
  });

  it('grades choices from the data and keeps memorization out of the result', () => {
    const insufficient = branchClassificationItems(INTENT).find((i) => i.id.includes(':insufficient:'))!;
    const right = gradeChoice(insufficient, MIRROR_CHOICE_ID);
    expect(right.correct).toBe(true);
    expect(right.conversation_score).toMatchObject({ objective_satisfied: true, branch_choice_correct: true });
    expect(right.memorization_score).toBeUndefined();
    const wrong = gradeChoice(insufficient, 'branch:answered');
    expect(wrong.correct).toBe(false);
    expect(wrong.conversation_score?.branch_choice_correct).toBe(false);
    expect(wrong.tone_assessed).toBe(false);
    expect(wrong.notes).toContain(TONE_NOTE);
  });

  it('branchClassification(node, seed) is deterministic and degrades gracefully with no data', () => {
    expect(branchClassification(INTENT, 3)).toEqual(branchClassification(INTENT, 3));
    const bare = node({ id: 'fx-bare', stage: 'exit', primary_word_track: 'Thank you for your time.' });
    expect(branchClassification(bare).input).toBe('none');
  });
});

describe('mirror duel', () => {
  it('correct set is exactly the node mirror variants; distractors come from other nodes', () => {
    const duel = mirrorDuel(INTENT, NODES, 5);
    const correct = duel.choices.filter((c) => duel.correct_choice_ids.includes(c.id)).map((c) => c.label);
    expect(new Set(correct)).toEqual(new Set(INTENT.mirror_variants));
    const distractors = duel.choices.filter((c) => !duel.correct_choice_ids.includes(c.id)).map((c) => c.label);
    expect(distractors.length).toBeGreaterThanOrEqual(2);
    for (const d of distractors) {
      expect(INTENT.mirror_variants).not.toContain(d);
      expect(NODES.filter((n) => n.id !== INTENT.id).map((n) => n.primary_word_track)).toContain(d);
    }
    expect(gradeChoice(duel, duel.correct_choice_ids[0]!).correct).toBe(true);
    expect(gradeChoice(duel, distractors.length > 0 ? duel.choices.find((c) => !duel.correct_choice_ids.includes(c.id))!.id : '').correct).toBe(false);
    expect(mirrorDuel(INTENT, NODES, 5)).toEqual(duel);
  });

  it('a node without mirrors has an empty correct set and says so', () => {
    const duel = mirrorDuel(CONCERN, NODES, 1);
    expect(duel.correct_choice_ids).toEqual([]);
    expect(duel.prompt).toMatch(/no mirror variants/i);
  });
});

describe('vocabulary meaning', () => {
  it('correct is "ask what it means" when unknown, and the given definition (never a synonym) when defined', () => {
    const [unknown, defined] = vocabularyMeaning([
      { phrase: 'gratification', definition_given: null, candidate_synonyms: ['satisfaction', 'pleasure'] },
      { phrase: 'profit', definition_given: 'what is left after the floorplan interest, not the gross', candidate_synonyms: ['revenue', 'margin'] },
    ]);
    expect(unknown!.correct_choice_ids).toEqual([ASK_MEANING_CHOICE_ID]);
    expect(gradeChoice(unknown!, 'synonym:0').correct).toBe(false);
    expect(defined!.correct_choice_ids).toEqual(['definition_given']);
    expect(gradeChoice(defined!, 'synonym:0').correct).toBe(false);
    expect(gradeChoice(defined!, 'synonym:1').correct).toBe(false);
    expect(gradeChoice(defined!, ASK_MEANING_CHOICE_ID).correct).toBe(false);
    expect(gradeChoice(defined!, 'definition_given').correct).toBe(true);
  });
});

describe('delivery replay', () => {
  it('is self-rated: tone_assessed false and no numeric tone anywhere', () => {
    const drill = deliveryReplay(HISTORY);
    expect(drill.input).toBe('self_rating');
    expect(drill.delivery_cues?.tone_cue).toBe(HISTORY.delivery_overlay.tone_cue);
    const result = gradeDeliveryReplay(drill, { followed_tone_cue: true, followed_pacing_cue: false, note: 'rushed' });
    expect(result.tone_assessed).toBe(false);
    expect(result.correct).toBeNull();
    expect(result.memorization_score).toBeUndefined();
    expect(result.conversation_score).toBeUndefined();
    for (const [k, v] of Object.entries(result)) {
      if (/tone|tonal|inflection|body/i.test(k)) expect(typeof v).not.toBe('number');
    }
    expect(result.notes).toContain(TONE_NOTE);
  });
});

describe('exact recall, reveal, order and lookup', () => {
  it('grades typed recall with separate ratios and records a reveal', () => {
    const drill = exactRecall(PROCESS);
    expect(drill.target_text).toBe(PROCESS.primary_word_track);
    const perfect = gradeExactRecall(drill, 'Walk me through what happens today when an inquiry comes in');
    expect(perfect.correct).toBe(true);
    expect(perfect.memorization_score).toEqual({ exact_match_ratio: 1, word_order_ratio: 1 });
    expect(perfect.conversation_score).toBeUndefined();
    const partial = gradeExactRecall(recallWithReveal(PROCESS), 'walk me through what happens', true);
    expect(partial.correct).toBe(false);
    expect(partial.memorization_score?.exact_match_ratio).toBeCloseTo(5 / 11); // 11-word target
    expect(partial.notes).toMatch(/revealed/);
  });

  it('order rehearsal shuffles deterministically and grades against canonical order', () => {
    const stage = [PROCESS, HISTORY, CONCERN];
    const drill = orderRehearsal(stage, 11);
    expect(drill.expected_order).toEqual(['fx-process', 'fx-history', 'fx-concern']);
    expect(orderRehearsal(stage, 11).choices).toEqual(drill.choices);
    expect(gradeOrder(drill, ['fx-process', 'fx-history', 'fx-concern']).correct).toBe(true);
    expect(gradeOrder(drill, ['fx-history', 'fx-process', 'fx-concern']).memorization_score?.exact_match_ratio).toBeCloseTo(1 / 3);
  });

  it('random node lookup offers four primary lines with one correct id and a memorization score', () => {
    const drill = randomizedNodeLookup(NODES, 2);
    expect(drill.choices).toHaveLength(4);
    expect(drill.correct_choice_ids).toEqual([drill.node_id]);
    expect(drill.prompt).toContain(NODES.find((n) => n.id === drill.node_id)!.stage);
    const r = gradeChoice(drill, drill.node_id!);
    expect(r.memorization_score).toEqual({ exact_match_ratio: 1, word_order_ratio: 1 });
    expect(r.conversation_score).toBeUndefined();
    expect(randomizedNodeLookup(NODES, 2)).toEqual(drill);
  });
});

describe('scenarios and context separation (scenario 22)', () => {
  it('ships the ten fictional scenarios', () => {
    expect(PRACTICE_SCENARIOS).toHaveLength(10);
    for (const s of PRACTICE_SCENARIOS) {
      expect(s.title.startsWith('FICTIONAL')).toBe(true);
      expect(s.fictional).toBe(true);
    }
    expect(PRACTICE_SCENARIOS.filter((s) => s.never_converts).length).toBeGreaterThanOrEqual(3);
  });

  it('coachView lacks hidden_fact_sheet (typed and at runtime); evaluatorView has it', () => {
    const s = PRACTICE_SCENARIOS[1]!;
    const coach = coachView(s, ['first revealed line']);
    expect('hidden_fact_sheet' in coach).toBe(false);
    expect(Object.keys(coach)).not.toContain('hidden_fact_sheet');
    expect(coach.access).toBe('coach');
    expect(coach.revealed_facts).toEqual(['first revealed line']);
    // @ts-expect-error — the coach view type has no hidden_fact_sheet property
    const leaked: unknown = coach.hidden_fact_sheet;
    expect(leaked).toBeUndefined();
    const typed: CoachView = coach;
    expect(JSON.stringify(typed)).not.toContain(s.hidden_fact_sheet.objections[0]!);

    const ev = evaluatorView(s);
    expect(ev.access).toBe('evaluator_post_session');
    expect(ev.hidden_fact_sheet).toEqual(s.hidden_fact_sheet);
    expect(ev.never_converts).toBe(true);
  });
});

describe('full mock and outcome scoring (scenarios 5, 23)', () => {
  const noFit = PRACTICE_SCENARIOS.find((s) => s.id === 'existing-vendor-no-gap')!;
  const noBudget = PRACTICE_SCENARIOS.find((s) => s.id === 'relevant-issue-no-budget')!;
  const detail = PRACTICE_SCENARIOS.find((s) => s.id === 'detail-buyer-measurement')!;

  it('walks entry → next by branch, revealing one synthetic line per step, and is labelled not a voice call', () => {
    let run = fullMock(noFit, NODES);
    expect(run.label).toBe(NOT_A_VOICE_CALL);
    expect(run.entry_node_id).toBe('fx-entry');
    expect(run.steps[0]!.prospect_line).toBe(noFit.hidden_fact_sheet.objections[0]);
    expect(run.revealed_facts).toHaveLength(1);
    run = advanceMock(run, noFit, NODES, 'branch:permission');
    expect(run.path).toEqual(['fx-entry', 'fx-intent']);
    expect(run.steps[1]!.prospect_line).toBe(noFit.hidden_fact_sheet.real_needs[0]);
    run = advanceMock(run, noFit, NODES, 'branch:answered');
    expect(run.steps[2]!.node_id).toBe('fx-process');
    expect(run.ended).toBe(false);
    run = advanceMock(run, noFit, NODES, 'exit:no_fit');
    expect(run.ended).toBe(true);
    expect(run.outcome).toBe('no_fit');
    expect(JSON.stringify(run)).not.toContain('hidden_fact_sheet');
    expect(EXIT_CHOICES.map((e) => e.outcome)).toContain('opt_out');
  });

  it('rewards accurate disqualification and scores a pushed close on a never-converts scenario zero', () => {
    const good = mockOutcomeScore(noFit, 'no_fit', ['fx-entry', 'fx-intent']);
    expect(good.score).toBe(1);
    expect(good.accurate_disqualification).toBe(true);
    expect(good.conversation_score.accurate_disqualification).toBe(true);
    const bad = mockOutcomeScore(noFit, 'qualified', ['fx-entry']);
    expect(bad.score).toBe(0);
    expect(bad.pushed_never_converts).toBe(true);
    expect(bad.note).toBe(RESPECTFUL_DISQUALIFICATION_NOTE);
    const deferred = mockOutcomeScore(noBudget, 'defer', []);
    expect(deferred.score).toBe(1);
    expect(mockOutcomeScore(noBudget, 'qualified', []).score).toBe(0);
    const qualified = mockOutcomeScore(detail, 'qualified', []);
    expect(qualified.score).toBe(1);
    expect(qualified.accurate_disqualification).toBe(false);
    expect(mockOutcomeScore(detail, 'opt_out', []).score).toBe(0);
    expect(good.tone_assessed).toBe(false);
  });

  it('is empty-safe when there are no nodes', () => {
    const run = fullMock(noFit, []);
    expect(run.empty).toBe(true);
    expect(run.steps).toEqual([]);
  });
});

describe('practice this moment', () => {
  it('offers the node primary + mirrors and returns a comparison with the simulation disclaimer', () => {
    const ctx = { original_question: 'So, is it working okay?', information_obtained: ['"fine"'], information_missing: ['duration', 'origin'] };
    const drill = practiceThisMoment(ctx, HISTORY);
    expect(drill.choices.map((c) => c.label)).toEqual([HISTORY.primary_word_track, ...HISTORY.mirror_variants]);
    const cmp = practiceThisMomentComparison(drill, ctx, HISTORY, drill.choices[1]!.id);
    expect(cmp.simulation_disclaimer).toBe(SIMULATION_DISCLAIMER);
    expect(cmp.original_information).toEqual(['"fine"']);
    expect(cmp.simulated_information).toEqual(HISTORY.sufficient_answer_examples);
    expect(cmp.tone_assessed).toBe(false);
    expect(cmp.correct).toBeNull();
  });
});

describe('attempts and summaries', () => {
  it('summarizeAttempts keeps assisted and unassisted apart and memorization apart from conversation', () => {
    const now = '2026-09-10T00:00:00.000Z';
    const recall = gradeExactRecall(exactRecall(PROCESS), 'walk me through');
    const branch = gradeChoice(branchClassificationItems(INTENT).find((i) => i.id.includes(':insufficient:'))!, MIRROR_CHOICE_ID);
    const attempts: PracticeAttempt[] = [
      attemptFromResult({ id: 'a1', mode: 'full_script', script_version_id: 'fixture-v1', result: recall, started_at: now }),
      attemptFromResult({ id: 'a2', mode: 'unassisted', script_version_id: 'fixture-v1', result: recall, started_at: now }),
      attemptFromResult({ id: 'a3', mode: 'unassisted', script_version_id: 'fixture-v1', result: branch, started_at: now }),
      attemptFromResult({ id: 'a4', mode: 'stage_purpose_cue', script_version_id: 'fixture-v1', result: branch, started_at: now }),
    ];
    for (const a of attempts) expect(PracticeAttempt.safeParse(a).success).toBe(true);
    expect(attempts.map((a) => a.assisted)).toEqual([true, false, false, true]);

    const s = summarizeAttempts(attempts);
    expect(s.assisted.attempts).toBe(2);
    expect(s.unassisted.attempts).toBe(2);
    expect(s.assisted.memorization.attempts).toBe(1);
    expect(s.assisted.conversation.attempts).toBe(1);
    expect(s.unassisted.memorization.attempts).toBe(1);
    expect(s.unassisted.conversation.attempts).toBe(1);
    expect(s.unassisted.conversation.branch_choices_correct).toBe(1);
    expect(s.assisted.memorization.mean_exact_match_ratio).toBeCloseTo(recall.memorization_score!.exact_match_ratio);
    // Memorization means never include conversation attempts and vice versa.
    expect(s.assisted.memorization.attempts + s.assisted.conversation.attempts).toBe(s.assisted.attempts);
    expect(s.tone_assessed).toBe(false);
    expect(summarizeAttempts([]).assisted.memorization.mean_exact_match_ratio).toBeNull();
  });
});

describe('purity (scenario 29)', () => {
  it('running every drill builder leaves primary_word_track and every node deep-equal', () => {
    const before = structuredClone(NODES);
    const scenario = PRACTICE_SCENARIOS[0]!;
    for (const n of NODES) {
      exactRecall(n);
      recallWithReveal(n);
      branchClassification(n, 4);
      branchClassificationItems(n);
      mirrorDuel(n, NODES, 4);
      deliveryReplay(n);
      practiceThisMoment({ original_question: 'q', information_obtained: [], information_missing: [] }, n);
      maskForMode(n, 'unassisted');
    }
    orderRehearsal(NODES, 9);
    randomizedNodeLookup(NODES, 9);
    vocabularyMeaning([{ phrase: 'x', definition_given: null, candidate_synonyms: ['y'] }]);
    let run = fullMock(scenario, NODES);
    run = advanceMock(run, scenario, NODES, 'branch:permission');
    advanceMock(run, scenario, NODES, 'exit:defer');
    expect(NODES).toEqual(before);
    expect(NODES.map((n) => n.primary_word_track)).toEqual(before.map((n) => n.primary_word_track));
  });
});

describe('real script seed (through the loader only; tolerates an unauthored seed)', () => {
  const seed = loadScriptNodes();

  it('every builder runs over every real node without throwing and without mutating the seed', () => {
    const before = structuredClone(seed.nodes);
    if (seed.nodes.length === 0) {
      expect(fullMock(PRACTICE_SCENARIOS[0]!, seed.nodes).empty).toBe(true);
      return;
    }
    for (const n of seed.nodes) {
      expect(exactRecall(n).target_text).toBe(n.primary_word_track);
      expect(gradeExactRecall(exactRecall(n), n.primary_word_track).correct).toBe(true);
      const duel = mirrorDuel(n, seed.nodes, 3);
      expect(duel.correct_choice_ids).toHaveLength(n.mirror_variants.length);
      for (const bc of branchClassificationItems(n)) expect(bc.correct_choice_ids.length).toBeGreaterThan(0);
      deliveryReplay(n);
      for (const mode of ['full_script', 'recall_with_reveal', 'primary_plus_mirror', 'stage_purpose_cue', 'unassisted'] as const) maskForMode(n, mode);
    }
    randomizedNodeLookup(seed.nodes, 1);
    for (const s of PRACTICE_SCENARIOS) {
      let run = fullMock(s, seed.nodes);
      expect(run.empty).toBe(false);
      expect(run.steps[0]!.stage).toBe('entry');
      // Walk the first branch until the sequence ends or the step cap is reached; never throws.
      for (let i = 0; i < 60 && !run.ended; i += 1) {
        const first = run.steps[run.steps.length - 1]!.choices.find((c) => c.id.startsWith('branch:'));
        if (!first) break;
        run = advanceMock(run, s, seed.nodes, first.id);
      }
      expect(JSON.stringify(coachView(s, run.revealed_facts))).not.toContain('hidden_fact_sheet');
    }
    expect(seed.nodes).toEqual(before);
  });
});
