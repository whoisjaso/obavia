/**
 * Full mock (choice-based walk through the script against a fictional scenario) and
 * "practice this moment" (brief §13). Explicitly NOT an AI voice call: every prospect line is
 * a synthetic sentence drawn from the scenario's hidden fact sheet, revealed one step at a
 * time. The live run never renders the sheet itself; only `evaluatorView` does, afterwards.
 */
import { DrillItem, type ConversationScore, type DrillChoice, type DrillResult, type HiddenFactSheet, type LegitimateOutcome, type PracticeScenario } from '../schemas/practice';
import type { ScriptNode } from '../schemas/scripts';
import { SIMULATION_DISCLAIMER, TONE_NOTE } from './drills';

export const NOT_A_VOICE_CALL = 'Choice-based simulation, not an AI voice call' as const;
export const RESPECTFUL_DISQUALIFICATION_NOTE = 'respectful disqualification was the correct outcome' as const;
export const MAX_MOCK_STEPS = 40 as const;

/** Exit choices available at every step; the outcome they map to is evaluated by `mockOutcomeScore`. */
export const EXIT_CHOICES: readonly { id: string; label: string; outcome: LegitimateOutcome }[] = [
  { id: 'exit:no_fit', label: 'End respectfully — no fit', outcome: 'no_fit' },
  { id: 'exit:defer', label: 'Agree a later reconnect — defer', outcome: 'defer' },
  { id: 'exit:needs_second_decision_maker', label: 'Schedule with the second decision-maker', outcome: 'needs_second_decision_maker' },
  { id: 'exit:gatekeeper', label: 'Ask for the right person or a good time — gatekeeper', outcome: 'gatekeeper' },
  { id: 'exit:opt_out', label: 'Stop immediately — opt-out', outcome: 'opt_out' },
  { id: 'exit:qualified', label: 'Proceed to close — qualified', outcome: 'qualified' },
];

export function outcomeForExitChoice(choiceId: string): LegitimateOutcome | undefined {
  return EXIT_CHOICES.find((e) => e.id === choiceId)?.outcome;
}

/** Which hidden-sheet field feeds the synthetic prospect line at each stage. */
const STAGE_FACT_FIELD: Record<string, keyof HiddenFactSheet> = {
  entry: 'objections',
  intent: 'real_needs',
  logical_certainty: 'already_tried',
  setter_transition: 'would_proceed_if',
  emotional_certainty: 'already_tried',
  future: 'real_needs',
  consequence: 'would_not_proceed_if',
  commitment: 'would_proceed_if',
  pitch: 'objections',
  decision: 'budget_capacity',
  concern: 'decision_roles',
  exit: 'would_not_proceed_if',
  follow_up: 'would_proceed_if',
  referral: 'real_needs',
  upsell: 'real_needs',
};

/** Deterministically pick the prospect line for a node from the hidden sheet (revealed one at a time). */
export function prospectLineFor(scenario: PracticeScenario, node: ScriptNode, stepIndex: number): { field: keyof HiddenFactSheet; line: string } {
  const field = STAGE_FACT_FIELD[node.stage] ?? 'real_needs';
  const pool = scenario.hidden_fact_sheet[field];
  const fallback = scenario.hidden_fact_sheet.real_needs;
  const source = pool.length > 0 ? pool : fallback;
  const line = source[stepIndex % Math.max(1, source.length)] ?? '(the prospect says nothing)';
  return { field, line };
}

export interface MockStep {
  index: number;
  node_id: string;
  stage: string;
  /** Own-script line, cited by node id. */
  say_this: string;
  why_this_now: string;
  /** Synthetic prospect line. UI labels it synthetic. */
  prospect_line: string;
  /** Branch choices + exit choices. */
  choices: DrillChoice[];
}

export interface MockRun {
  scenario_id: string;
  entry_node_id: string | null;
  /** True when the script version has no nodes for the scenario's entrypoint. */
  empty: boolean;
  label: typeof NOT_A_VOICE_CALL;
  steps: MockStep[];
  /** Facts revealed so far — exactly the prospect lines shown. */
  revealed_facts: string[];
  path: string[];
  outcome: LegitimateOutcome | null;
  ended: boolean;
}

function entryNodeFor(scenario: PracticeScenario, nodes: readonly ScriptNode[]): ScriptNode | undefined {
  const ep = scenario.entrypoint;
  const roleMatch = nodes.find((n) => n.stage === 'entry' && n.role_applicability.some((r) => r === ep));
  if (roleMatch) return roleMatch;
  const entryStage = nodes.find((n) => n.stage === 'entry');
  if (entryStage) return entryStage;
  return nodes[0];
}

function buildStep(scenario: PracticeScenario, node: ScriptNode, index: number): MockStep {
  const { line } = prospectLineFor(scenario, node, index);
  const branchChoices = node.branches.map<DrillChoice>((b) => ({
    id: `branch:${b.answer_category}`,
    label: b.label,
    note: b.next_node_id ? `→ ${b.next_node_id}` : '→ end of sequence',
  }));
  return {
    index,
    node_id: node.id,
    stage: node.stage,
    say_this: node.primary_word_track,
    why_this_now: node.why_this_now,
    prospect_line: line,
    choices: [...branchChoices, ...EXIT_CHOICES.map<DrillChoice>((e) => ({ id: e.id, label: e.label, note: 'Ends the mock with this outcome.' }))],
  };
}

/** Start a full mock: the first step is the entry node for the scenario's entrypoint. */
export function fullMock(scenario: PracticeScenario, nodes: readonly ScriptNode[]): MockRun {
  const entry = entryNodeFor(scenario, nodes);
  if (!entry) {
    return { scenario_id: scenario.id, entry_node_id: null, empty: true, label: NOT_A_VOICE_CALL, steps: [], revealed_facts: [], path: [], outcome: null, ended: true };
  }
  const first = buildStep(scenario, entry, 0);
  return {
    scenario_id: scenario.id,
    entry_node_id: entry.id,
    empty: false,
    label: NOT_A_VOICE_CALL,
    steps: [first],
    revealed_facts: [first.prospect_line],
    path: [entry.id],
    outcome: null,
    ended: false,
  };
}

/**
 * Apply a choice to the run. Branch choices follow `next_node_id`; a null next node ends the
 * sequence (outcome stays null until an exit is chosen). Exit choices end with an outcome.
 * Returns a new run; the input is not mutated.
 */
export function advanceMock(run: MockRun, scenario: PracticeScenario, nodes: readonly ScriptNode[], choiceId: string): MockRun {
  if (run.ended) return run;
  const exitOutcome = outcomeForExitChoice(choiceId);
  if (exitOutcome) return { ...run, outcome: exitOutcome, ended: true };
  const current = run.steps[run.steps.length - 1];
  const node = current ? nodes.find((n) => n.id === current.node_id) : undefined;
  if (!current || !node) return { ...run, ended: true };
  const category = choiceId.replace(/^branch:/, '');
  const branch = node.branches.find((b) => b.answer_category === category);
  if (!branch) return run;
  if (branch.next_node_id === null || run.steps.length >= MAX_MOCK_STEPS) {
    return { ...run, ended: true };
  }
  const next = nodes.find((n) => n.id === branch.next_node_id);
  if (!next) return { ...run, ended: true };
  const step = buildStep(scenario, next, run.steps.length);
  return {
    ...run,
    steps: [...run.steps, step],
    revealed_facts: [...run.revealed_facts, step.prospect_line],
    path: [...run.path, next.id],
  };
}

export interface MockOutcomeScore {
  /** 1 when the chosen outcome is legitimate for the scenario, else 0. */
  score: 0 | 1;
  accurate_disqualification: boolean;
  pushed_never_converts: boolean;
  stages_visited: string[];
  note: string;
  conversation_score: ConversationScore;
  tone_assessed: false;
}

/**
 * Score the outcome of a mock (brief §13, scenarios 5 and 23). Choosing a legitimate exit for a
 * scenario that never converts scores full; pushing such a scenario to close scores zero and
 * says so. Memorization is never part of this score.
 */
export function mockOutcomeScore(scenario: PracticeScenario, chosenOutcome: LegitimateOutcome, path: readonly string[]): MockOutcomeScore {
  const legitimate = scenario.legitimate_outcomes.includes(chosenOutcome);
  const pushed = scenario.never_converts && chosenOutcome === 'qualified';
  const disqualified = chosenOutcome !== 'qualified' && legitimate;
  const stages = [...new Set(path)];
  let note: string;
  if (pushed) note = RESPECTFUL_DISQUALIFICATION_NOTE;
  else if (legitimate) note = disqualified ? `Accurate disqualification: "${chosenOutcome.replace(/_/g, ' ')}" was a legitimate outcome here.` : 'Legitimate outcome for this scenario.';
  else note = `"${chosenOutcome.replace(/_/g, ' ')}" is not a legitimate outcome here. Legitimate: ${scenario.legitimate_outcomes.map((o) => o.replace(/_/g, ' ')).join(', ')}.`;
  const score: 0 | 1 = legitimate && !pushed ? 1 : 0;
  return {
    score,
    accurate_disqualification: disqualified,
    pushed_never_converts: pushed,
    stages_visited: stages,
    note,
    conversation_score: { objective_satisfied: score === 1, accurate_disqualification: disqualified, notes: note },
    tone_assessed: false,
  };
}

// ---------------------------------------------------------------------------------------
// Practice this moment
// ---------------------------------------------------------------------------------------

export interface MomentContext {
  /** The question that was actually asked at the weak transition (own words or primary line). */
  original_question: string;
  /** What the real answer supported (facts obtained). Personal data already removed by the caller. */
  information_obtained: string[];
  /** What the stage needed and did not get. */
  information_missing: string[];
  /** Optional short excerpt, personal data removed. */
  excerpt?: string;
}

/** Offer the node's alternatives (primary line and mirrors) as the "try an alternative question" choices. */
export function practiceThisMoment(context: MomentContext, node: ScriptNode): DrillItem {
  const choices: DrillChoice[] = [
    { id: `primary:${node.id}`, label: node.primary_word_track, note: 'The exact primary line.' },
    ...node.mirror_variants.map<DrillChoice>((m, i) => ({ id: `mirror:${node.id}:${i}`, label: m, note: 'A mirror seeking the same answer type.' })),
  ];
  return DrillItem.parse({
    id: `practice_this_moment:${node.id}`,
    kind: 'practice_this_moment',
    input: 'single_choice',
    node_id: node.id,
    stage: node.stage,
    prompt: `At this transition you asked: "${context.original_question}". Try an alternative question for ${node.stage}.`,
    context: `Obtained: ${context.information_obtained.join('; ') || '(nothing recorded)'}\nMissing: ${context.information_missing.join('; ') || '(nothing recorded)'}${context.excerpt ? `\nExcerpt (personal data removed): ${context.excerpt}` : ''}`,
    choices,
    // Every alternative is a legitimate try; the comparison, not a right answer, is the point.
    correct_choice_ids: choices.map((c) => c.id),
    expected_order: [],
    cited_node_ids: [node.id],
  });
}

export interface MomentComparison extends DrillResult {
  original_information: string[];
  /** Simulated: taken from the node's sufficient-answer examples, never from a real prospect. */
  simulated_information: string[];
  simulation_disclaimer: typeof SIMULATION_DISCLAIMER;
}

/** Compare what the original question obtained with what a sufficient answer to the alternative would carry. */
export function practiceThisMomentComparison(drill: DrillItem, context: MomentContext, node: ScriptNode, choiceId: string): MomentComparison {
  const chosen = drill.choices.find((c) => c.id === choiceId);
  const simulated = node.sufficient_answer_examples.length > 0 ? [...node.sufficient_answer_examples] : ['(no sufficient-answer example authored for this node)'];
  return {
    item_id: drill.id,
    kind: 'practice_this_moment',
    correct: null,
    original_information: [...context.information_obtained],
    simulated_information: simulated,
    missing_words: [],
    extra_words: [],
    tone_assessed: false,
    simulation_disclaimer: SIMULATION_DISCLAIMER,
    notes: `Alternative tried: "${chosen?.label ?? choiceId}". Original obtained ${context.information_obtained.length} item(s); the simulated sufficient answer carries ${simulated.length}. ${SIMULATION_DISCLAIMER}. ${TONE_NOTE}.`,
  };
}
