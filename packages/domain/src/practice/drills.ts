/**
 * Drill builders (brief §13): every item is derived from ScriptNode data — sufficient and
 * insufficient answer examples, branch answer categories, mirror variants, stage, primary line
 * and why-this-now. Builders are pure: they never mutate the nodes they read (scenario 29).
 *
 * Own-script lines shown in a drill cite node ids (`cited_node_ids`); they are never rendered
 * as source quotes. Synthetic prospect lines are labelled as such by the UI.
 */
import { DrillItem, type DrillChoice, type DrillResult } from '../schemas/practice';
import type { ScriptNode } from '../schemas/scripts';
import { exactRecallScore, orderScore, seededRandom, seededShuffle } from './scoring';

export const MIRROR_CHOICE_ID = 'ask_mirror' as const;
export const MIRROR_CHOICE_LABEL = 'Ask a mirror question: the answer is not yet sufficient' as const;
export const ASK_MEANING_CHOICE_ID = 'ask_meaning' as const;
export const ASK_MEANING_CHOICE_LABEL = 'Ask what it means' as const;
export const TONE_NOTE = 'Tone: not assessed (text-only)' as const;
export const SIMULATION_DISCLAIMER = 'A simulated alternate outcome is not proof the real prospect would have bought' as const;

/**
 * Answer categories that mean the objective was NOT progressed by the answer (declined, unknown,
 * stop…). A sufficient answer example is never classified into these.
 */
export const NON_PROGRESS_CATEGORIES: ReadonlySet<string> = new Set([
  'declined',
  'declines',
  'unknown',
  'no_answer',
  'opt_out',
  'stop',
  'not_now',
  'refused',
  'silence',
  'irrelevant',
  'contradicted',
  'gatekeeper',
]);

function item(partial: Omit<DrillItem, 'choices' | 'correct_choice_ids' | 'expected_order' | 'cited_node_ids'> & Partial<DrillItem>): DrillItem {
  return DrillItem.parse({ choices: [], correct_choice_ids: [], expected_order: [], cited_node_ids: [], ...partial });
}

function stageCue(node: ScriptNode): string {
  return `${node.stage}${node.substage ? ` · ${node.substage}` : ''}`;
}

// ---------------------------------------------------------------------------------------
// Exact recall / recall with reveal
// ---------------------------------------------------------------------------------------

/** Typed recall of the exact primary line from the stage cue and why-this-now. */
export function exactRecall(node: ScriptNode): DrillItem {
  return item({
    id: `exact_recall:${node.id}`,
    kind: 'exact_recall',
    input: 'text',
    node_id: node.id,
    stage: node.stage,
    prompt: `Type the exact primary line for ${stageCue(node)}.`,
    context: node.why_this_now,
    target_text: node.primary_word_track,
    cited_node_ids: [node.id],
  });
}

/** Same as exact recall, but the UI may reveal the line before checking. */
export function recallWithReveal(node: ScriptNode): DrillItem {
  return item({
    id: `recall_with_reveal:${node.id}`,
    kind: 'recall_with_reveal',
    input: 'text',
    node_id: node.id,
    stage: node.stage,
    prompt: `Recall the primary line for ${stageCue(node)}. Reveal it if you need to, then type it.`,
    context: node.why_this_now,
    target_text: node.primary_word_track,
    cited_node_ids: [node.id],
  });
}

/** Grade a typed attempt. Memorization only; conversation score is not produced here. */
export function gradeExactRecall(drill: DrillItem, attempt: string, revealed = false): DrillResult {
  const target = drill.target_text ?? '';
  const score = exactRecallScore(target, attempt);
  const exact = score.exact_match_ratio === 1 && score.word_order_ratio === 1;
  return {
    item_id: drill.id,
    kind: drill.kind,
    correct: exact,
    memorization_score: { exact_match_ratio: score.exact_match_ratio, word_order_ratio: score.word_order_ratio },
    missing_words: score.missing_words,
    extra_words: score.extra_words,
    tone_assessed: false,
    notes: `${exact ? 'Word-for-word match.' : `${score.missing_words.length} missing, ${score.extra_words.length} extra.`}${revealed ? ' Line was revealed before checking.' : ''} ${TONE_NOTE}.`,
  };
}

// ---------------------------------------------------------------------------------------
// Order rehearsal
// ---------------------------------------------------------------------------------------

/** Order the given stage nodes; the caller passes them in canonical order. Shuffle is seed-deterministic. */
export function orderRehearsal(stageNodes: readonly ScriptNode[], seed = 1): DrillItem {
  const shuffled = seededShuffle(stageNodes, seed);
  return item({
    id: `order_rehearsal:${stageNodes.map((n) => n.id).join(',')}:${seed}`,
    kind: 'order_rehearsal',
    input: 'ordering',
    stage: stageNodes[0]?.stage,
    prompt: 'Put these primary lines in the order the script asks them.',
    choices: shuffled.map((n) => ({ id: n.id, label: n.primary_word_track, note: stageCue(n) })),
    expected_order: stageNodes.map((n) => n.id),
    cited_node_ids: stageNodes.map((n) => n.id),
  });
}

export function gradeOrder(drill: DrillItem, givenIds: readonly string[]): DrillResult {
  const score = orderScore(drill.expected_order, givenIds);
  return {
    item_id: drill.id,
    kind: drill.kind,
    correct: score.position_ratio === 1,
    memorization_score: { exact_match_ratio: score.position_ratio, word_order_ratio: score.word_order_ratio },
    missing_words: [],
    extra_words: [],
    tone_assessed: false,
    notes: `${Math.round(score.position_ratio * drill.expected_order.length)} of ${drill.expected_order.length} in position. ${TONE_NOTE}.`,
  };
}

// ---------------------------------------------------------------------------------------
// Randomized node lookup
// ---------------------------------------------------------------------------------------

/** From a stage cue and why-this-now, pick the matching primary line among four. */
export function randomizedNodeLookup(nodes: readonly ScriptNode[], seed = 1): DrillItem {
  if (nodes.length === 0) throw new Error('randomizedNodeLookup needs at least one node');
  const rnd = seededRandom(seed);
  const target = nodes[Math.floor(rnd() * nodes.length)] as ScriptNode;
  const others = seededShuffle(
    nodes.filter((n) => n.id !== target.id),
    seed + 1,
  ).slice(0, 3);
  const choices = seededShuffle([target, ...others], seed + 2).map<DrillChoice>((n) => ({ id: n.id, label: n.primary_word_track, note: stageCue(n) }));
  return item({
    id: `random_node_lookup:${target.id}:${seed}`,
    kind: 'random_node_lookup',
    input: 'single_choice',
    node_id: target.id,
    stage: target.stage,
    prompt: `Which primary line belongs to ${stageCue(target)}?`,
    context: target.why_this_now,
    choices,
    correct_choice_ids: [target.id],
    cited_node_ids: choices.map((c) => c.id),
  });
}

// ---------------------------------------------------------------------------------------
// Branch classification
// ---------------------------------------------------------------------------------------

export interface BranchPromptSource {
  kind: 'sufficient' | 'insufficient' | 'category';
  text: string;
  /** The branch answer_category, for category prompts. */
  category?: string;
}

function branchChoices(node: ScriptNode): DrillChoice[] {
  return [
    ...node.branches.map<DrillChoice>((b) => ({ id: `branch:${b.answer_category}`, label: b.label, ...(b.note ? { note: b.note } : {}) })),
    { id: MIRROR_CHOICE_ID, label: MIRROR_CHOICE_LABEL, note: 'Use when the answer does not yet meet the completion criteria.' },
  ];
}

function progressBranchIds(node: ScriptNode): string[] {
  const progress = node.branches.filter((b) => !NON_PROGRESS_CATEGORIES.has(b.answer_category));
  const pool = progress.length > 0 ? progress : node.branches;
  return pool.map((b) => `branch:${b.answer_category}`);
}

/** Every branch-classification prompt a node can produce (sufficient, insufficient, category). */
export function branchClassificationItems(node: ScriptNode): DrillItem[] {
  const choices = branchChoices(node);
  const out: DrillItem[] = [];
  node.sufficient_answer_examples.forEach((text, i) => {
    out.push(
      item({
        id: `branch_classification:${node.id}:sufficient:${i}`,
        kind: 'branch_classification',
        input: 'single_choice',
        node_id: node.id,
        stage: node.stage,
        prompt: 'A prospect answers as below. Is the objective satisfied? If so, choose the branch; if not, ask a mirror.',
        context: `Objective: ${node.intended_answer_type}`,
        synthetic_prospect_line: text,
        choices,
        correct_choice_ids: progressBranchIds(node),
        cited_node_ids: [node.id],
      }),
    );
  });
  node.insufficient_answer_examples.forEach((text, i) => {
    out.push(
      item({
        id: `branch_classification:${node.id}:insufficient:${i}`,
        kind: 'branch_classification',
        input: 'single_choice',
        node_id: node.id,
        stage: node.stage,
        prompt: 'A prospect answers as below. Is the objective satisfied? If so, choose the branch; if not, ask a mirror.',
        context: `Objective: ${node.intended_answer_type}`,
        synthetic_prospect_line: text,
        choices,
        correct_choice_ids: [MIRROR_CHOICE_ID],
        cited_node_ids: [node.id],
      }),
    );
  });
  node.branches.forEach((b, i) => {
    out.push(
      item({
        id: `branch_classification:${node.id}:category:${i}`,
        kind: 'branch_classification',
        input: 'single_choice',
        node_id: node.id,
        stage: node.stage,
        prompt: `The prospect's answer falls in the category "${b.answer_category.replace(/_/g, ' ')}". Which branch handles it?`,
        context: b.note ? `Branch note: ${b.note}` : `Objective: ${node.intended_answer_type}`,
        choices,
        correct_choice_ids: [`branch:${b.answer_category}`],
        cited_node_ids: [node.id],
      }),
    );
  });
  return out;
}

/** One branch-classification item chosen deterministically by seed. */
export function branchClassification(node: ScriptNode, seed = 1): DrillItem {
  const all = branchClassificationItems(node);
  if (all.length === 0) {
    return item({
      id: `branch_classification:${node.id}:none`,
      kind: 'branch_classification',
      input: 'none',
      node_id: node.id,
      stage: node.stage,
      prompt: 'This line has no answer examples or branches authored yet.',
      cited_node_ids: [node.id],
    });
  }
  const rnd = seededRandom(seed);
  return all[Math.floor(rnd() * all.length)] as DrillItem;
}

// ---------------------------------------------------------------------------------------
// Mirror duel (B09: different questions seeking the same answer type)
// ---------------------------------------------------------------------------------------

export function mirrorDuel(node: ScriptNode, allNodes: readonly ScriptNode[], seed = 1): DrillItem {
  const correct = node.mirror_variants.map<DrillChoice>((m, i) => ({ id: `mirror:${node.id}:${i}`, label: m, note: 'Seeks the same answer type.' }));
  const distractorPool = allNodes.filter((n) => n.id !== node.id && n.primary_word_track !== node.primary_word_track);
  const distractors = seededShuffle(distractorPool, seed)
    .slice(0, Math.max(2, correct.length))
    .map<DrillChoice>((n) => ({ id: `distractor:${n.id}`, label: n.primary_word_track, note: `Seeks a different answer type (${n.stage.replace(/_/g, ' ')}).` }));
  const choices = seededShuffle([...correct, ...distractors], seed + 1);
  return item({
    id: `mirror_duel:${node.id}:${seed}`,
    kind: 'mirror_duel',
    input: 'single_choice',
    node_id: node.id,
    stage: node.stage,
    prompt: correct.length > 0 ? `Which question seeks the same answer as this line, in different words?` : 'This line has no mirror variants authored yet; every option seeks a different answer.',
    context: `Line: ${node.primary_word_track}\nSeeks: ${node.intended_answer_type}`,
    choices,
    correct_choice_ids: correct.map((c) => c.id),
    cited_node_ids: [node.id, ...distractors.map((d) => d.id.replace('distractor:', ''))],
  });
}

// ---------------------------------------------------------------------------------------
// Vocabulary meaning fidelity
// ---------------------------------------------------------------------------------------

export interface VocabularyItemInput {
  /** The prospect's exact phrase. */
  phrase: string;
  /** The definition the prospect gave, or null when the meaning is unknown. */
  definition_given: string | null;
  /** Plausible synonyms — never the correct answer. */
  candidate_synonyms: string[];
}

/** Given a prospect phrase, the only right move is the prospect's own definition or asking for one. */
export function vocabularyMeaning(items: readonly VocabularyItemInput[], seed = 1): DrillItem[] {
  return items.map((v, i) => {
    const synonyms = v.candidate_synonyms.map<DrillChoice>((s, j) => ({ id: `synonym:${j}`, label: s, note: 'A synonym is not their meaning.' }));
    const ask: DrillChoice = { id: ASK_MEANING_CHOICE_ID, label: ASK_MEANING_CHOICE_LABEL, note: 'Correct whenever the prospect has not defined the word.' };
    const definition: DrillChoice | null = v.definition_given ? { id: 'definition_given', label: v.definition_given, note: 'Their own definition, kept verbatim.' } : null;
    const choices = seededShuffle([...synonyms, ask, ...(definition ? [definition] : [])], seed + i);
    return item({
      id: `vocabulary_meaning:${i}:${seed}`,
      kind: 'vocabulary_meaning',
      input: 'single_choice',
      prompt: `The prospect said "${v.phrase}". What does it mean?`,
      context: v.definition_given ? 'They explained it earlier in the call.' : 'They have not explained it.',
      synthetic_prospect_line: v.phrase,
      choices,
      correct_choice_ids: [definition ? 'definition_given' : ASK_MEANING_CHOICE_ID],
    });
  });
}

// ---------------------------------------------------------------------------------------
// Delivery replay (self-rated; text cannot measure tone)
// ---------------------------------------------------------------------------------------

export function deliveryReplay(node: ScriptNode): DrillItem {
  return item({
    id: `delivery_replay:${node.id}`,
    kind: 'delivery_replay',
    input: 'self_rating',
    node_id: node.id,
    stage: node.stage,
    prompt: 'Say the line aloud, then rate yourself against the instructor-described cues. Nothing is recorded or measured.',
    context: node.primary_word_track,
    delivery_cues: { tone_cue: node.delivery_overlay.tone_cue, pacing_cue: node.delivery_overlay.pacing_cue },
    cited_node_ids: [node.id],
  });
}

export interface DeliverySelfRating {
  followed_tone_cue: boolean;
  followed_pacing_cue: boolean;
  note?: string;
}

/** Self-rated only. Has `tone_assessed: false` and no numeric tonality field of any kind. */
export function gradeDeliveryReplay(drill: DrillItem, rating: DeliverySelfRating): DrillResult {
  return {
    item_id: drill.id,
    kind: drill.kind,
    correct: null,
    missing_words: [],
    extra_words: [],
    tone_assessed: false,
    notes: `Self-rated: tone cue ${rating.followed_tone_cue ? 'followed' : 'not followed'}; pacing cue ${rating.followed_pacing_cue ? 'followed' : 'not followed'}.${rating.note ? ` Note: ${rating.note}` : ''} ${TONE_NOTE}.`,
  };
}

// ---------------------------------------------------------------------------------------
// Generic choice grading
// ---------------------------------------------------------------------------------------

/** Grade a single-choice drill. Memorization for node lookup, conversation for judgement drills — never both. */
export function gradeChoice(drill: DrillItem, choiceId: string): DrillResult {
  const correct = drill.correct_choice_ids.includes(choiceId);
  const chosen = drill.choices.find((c) => c.id === choiceId);
  const correctLabels = drill.choices.filter((c) => drill.correct_choice_ids.includes(c.id)).map((c) => c.label);
  const chosenNote = chosen?.note ? ` (${chosen.note.replace(/\.$/, '')})` : '';
  const explain = correct
    ? `Correct${chosenNote}.`
    : `Not this one${chosenNote}. Accepted: ${correctLabels.length > 0 ? correctLabels.join(' / ') : '(none)'}.`;
  // Node lookup is a memorization drill; the others test conversation judgement. Never both.
  const memorization = drill.kind === 'random_node_lookup' || drill.kind === 'order_rehearsal';
  return {
    item_id: drill.id,
    kind: drill.kind,
    correct,
    ...(memorization
      ? { memorization_score: { exact_match_ratio: correct ? 1 : 0, word_order_ratio: correct ? 1 : 0 } }
      : {
          conversation_score: {
            objective_satisfied: correct,
            branch_choice_correct: drill.kind === 'branch_classification' || drill.kind === 'mirror_duel' ? correct : undefined,
            notes: explain,
          },
        }),
    missing_words: [],
    extra_words: [],
    tone_assessed: false,
    notes: `${explain} ${TONE_NOTE}.`,
  };
}
