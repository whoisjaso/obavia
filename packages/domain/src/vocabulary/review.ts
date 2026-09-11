/**
 * Post-call review (brief §14) — rule-based, text-only, no model.
 * One strength with evidence, one highest-leverage correction, a better question, one drill,
 * the agreed next step or clear outcome, uncertainties, and tone "not assessed (text-only)".
 * Never a score of distress; never an acoustic rating.
 */
import type { Transcript, TranscriptTurn } from '../schemas/transcript';
import { analyzeCall, type CallAnalysis } from './analyze';
import { missingFields, slotLabel } from './facts';
import { wordCount } from './text';

export interface NodeLike {
  id: string;
  stage: string;
  required_context: string[];
}

export interface ReviewQuote {
  text: string;
  /** Utterance id of the evidence turn; null only when no text evidence exists. */
  quote_turn_id: string | null;
}

export interface PostCallReview {
  call_id: string;
  strength: ReviewQuote;
  correction: ReviewQuote;
  better_question: string;
  drill: string;
  next_step_or_outcome: string;
  uncertainties: string[];
  tone: 'not assessed (text-only)';
}

export type CallOutcome = 'do_not_call' | 'agreed_follow_up' | 'deferral' | 'no_agreed_next_step';

const VAGUE = /\b(?:uneven|better|more|improve|stuff|things|somewhat|kind of|it depends|not sure|hard to say)\b/i;
const REMOVAL = /\b(?:removing|remove|take you off|won't hear from me|will not hear from me|off the list)\b/i;
const DEFERRAL = /\b(?:send me something first|maybe|I'll decide|let me think|not right now)\b/i;

export function callOutcome(analysis: CallAnalysis): CallOutcome {
  if (analysis.opt_out) return 'do_not_call';
  if (analysis.facts.some((f) => f.key === '{reconnect_window}')) return 'agreed_follow_up';
  const lastProspect = [...analysis.turns].reverse().find((t) => t.speaker_role === 'prospect' && t.is_final);
  if (lastProspect && DEFERRAL.test(lastProspect.text)) return 'deferral';
  return 'no_agreed_next_step';
}

export function outcomeLabel(outcome: CallOutcome): string {
  const labels: Record<CallOutcome, string> = {
    do_not_call: 'Opt-out recorded — do not call',
    agreed_follow_up: 'Agreed follow-up',
    deferral: 'Deferral — prospect will decide after receiving material',
    no_agreed_next_step: 'No agreed next step',
  };
  return labels[outcome];
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []);
}

/** Rule-based review of one call. `nodesCovered` = script nodes the representative worked through. */
export function postCallReview(transcript: Transcript | readonly TranscriptTurn[], nodesCovered: readonly NodeLike[] = []): PostCallReview {
  const turns = Array.isArray(transcript) ? transcript : (transcript as Transcript).turns;
  const analysis = analyzeCall(turns);
  const finals = analysis.turns.filter((t) => t.is_final);
  const top = analysis.ranked[0]?.event;

  // ---- strength ----
  let strength: ReviewQuote | null = null;
  if (analysis.opt_out) {
    const optIndex = finals.findIndex((t) => t.utterance_id === analysis.opt_out!.turn_id);
    const after = finals.slice(optIndex + 1).filter((t) => t.speaker_role === 'representative');
    if (after.length === 1 && REMOVAL.test(after[0]!.text)) {
      strength = { text: `Stopped immediately on the opt-out and confirmed removal — no reframe: "${after[0]!.text}"`, quote_turn_id: after[0]!.utterance_id };
    }
  }
  if (!strength) {
    for (let i = 0; i + 1 < finals.length; i += 1) {
      const p = finals[i]!;
      const r = finals[i + 1]!;
      if (p.speaker_role !== 'prospect' || r.speaker_role !== 'representative' || !r.text.includes('?')) continue;
      const vague = wordCount(p.text) <= 6 || VAGUE.test(p.text);
      const mirrored = Array.from(words(p.text)).some((w) => words(r.text).has(w));
      if (vague && mirrored) {
        strength = { text: `Mirrored a vague answer instead of assuming: "${r.text}"`, quote_turn_id: r.utterance_id };
        break;
      }
    }
  }
  if (!strength && top) {
    const echo = finals.find((t) => t.speaker_role === 'representative' && t.display_index > (analysis.turns.find((x) => x.utterance_id === top.turn_id)?.display_index ?? -1) && new RegExp(`\\b${top.exact_text}\\b`, 'i').test(t.text));
    if (echo) strength = { text: `Used the prospect's own word "${top.exact_text}" instead of a synonym: "${echo.text}"`, quote_turn_id: echo.utterance_id };
  }
  if (!strength) strength = { text: 'No specific strength identified from text alone.', quote_turn_id: null };

  // ---- correction ----
  let correction: ReviewQuote | null = null;
  const repQuestions = finals.filter((t) => t.speaker_role === 'representative' && t.text.includes('?'));
  const seen = new Map<string, TranscriptTurn>();
  for (const q of repQuestions) {
    const norm = q.text.toLowerCase().replace(/[^a-z ]/g, '').trim();
    const prior = seen.get(norm);
    if (prior) {
      correction = { text: `Repeated a question the prospect had already answered: "${q.text}"`, quote_turn_id: q.utterance_id };
      break;
    }
    seen.set(norm, q);
  }
  const pushed = analysis.excluded.find((c) => c.event.provenance === 'seller_only' && (c.event.repetition_by_speaker?.representative ?? 0) >= 3);
  if (!correction && pushed && top) {
    correction = {
      text: `Kept saying "${pushed.event.exact_text}" (${pushed.event.repetition_by_speaker?.representative}×) while the prospect's word was "${top.exact_text}" — use theirs.`,
      quote_turn_id: pushed.event.turn_id,
    };
  }
  const missing = nodesCovered.flatMap((n) => missingFields(n.required_context, analysis.facts)).filter((v, i, a) => a.indexOf(v) === i);
  if (!correction && missing.length > 0 && !analysis.opt_out) {
    // Evidence for an absence is the last question the representative asked: the last place the
    // field could have been established, and the turn that shows what was asked instead.
    // Never the closing prospect turn, which says nothing about what was (not) asked.
    const lastQuestion = [...repQuestions].reverse()[0] ?? null;
    correction = lastQuestion
      ? { text: `Critical field not established: ${slotLabel(missing[0]!)}. The last question asked did not establish it.`, quote_turn_id: lastQuestion.utterance_id }
      : { text: `Critical field not established: ${slotLabel(missing[0]!)}. No question asked for it.`, quote_turn_id: null };
  }
  if (!correction) correction = { text: 'No high-leverage correction found from text alone.', quote_turn_id: null };

  // ---- better question ----
  const netGross = analysis.events.find((e) => e.correction_or_negation && /\b(net|gross)\b/.test(`${e.normalized_key} ${e.correction_or_negation.rejects}`));
  const undefinedEmphasis = analysis.ranked.find((r) => r.event.provenance === 'prospect_said' && r.event.explicit_emphasis && r.event.meaning_status === 'unknown');
  let better_question: string;
  if (analysis.opt_out) better_question = 'None — after an opt-out there is no better question; the only correct move is to stop.';
  else if (netGross) better_question = `When you say ${netGross.exact_text.toLowerCase()}, which costs come off first — pack, payroll, anything else?`;
  else if (missing.includes('{stated_problem}')) better_question = 'Where exactly does the current process break down — what happens, and when?';
  else if (missing.includes('{stated_goal}')) better_question = 'In your words, what are you trying to get to?';
  else if (undefinedEmphasis) better_question = `When you say "${undefinedEmphasis.event.exact_text}", what does that mean for you here?`;
  else if (top) better_question = `You said "${top.exact_text}" — what would that look like day to day?`;
  else better_question = 'What would need to be true for this to be worth your time?';

  // ---- drill ----
  let drill: string;
  if (analysis.opt_out) drill = 'Exit rehearsal: say the stop-immediately line three times — no reframe, no second question.';
  else if (pushed && top) drill = `Vocabulary accuracy: replay the prospect turns and restate each one using only their word ("${top.exact_text}"), five repetitions.`;
  else if (missing.length > 0) drill = `Question recall: rehearse the node that establishes ${slotLabel(missing[0]!)} and one bridge into it.`;
  else drill = 'Mirror drill: after each vague answer, mirror the last two words as a question — ten repetitions.';

  // ---- next step ----
  const outcome = callOutcome(analysis);
  const reconnect = analysis.facts.find((f) => f.key === '{reconnect_window}');
  const next_step_or_outcome =
    outcome === 'agreed_follow_up' && reconnect ? `Agreed follow-up: "${reconnect.value}" (prospect's words).` : outcomeLabel(outcome) + '.';

  // ---- uncertainties ----
  const uncertainties = ['Synthetic transcript — no real prospect, no audio.'];
  const interim = analysis.turns.filter((t) => !t.is_final).length;
  if (interim > 0) uncertainties.push(`${interim} interim turn(s) present — provisional text, not quotable.`);
  for (const r of analysis.revisions) uncertainties.push(`Utterance ${r.utterance_id} was revised (${r.from_revision}→${r.to_revision}); dependent interpretations were invalidated.`);
  if (analysis.dropped.length > 0) uncertainties.push(`${analysis.dropped.length} duplicate provider event(s) dropped before counting.`);
  uncertainties.push('Speaker roles come from provider tracks and were not independently verified.');
  uncertainties.push('Tone, pacing and acoustics are not assessed from text.');

  return {
    call_id: analysis.call_id,
    strength,
    correction,
    better_question,
    drill,
    next_step_or_outcome,
    uncertainties,
    tone: 'not assessed (text-only)',
  };
}

export interface RubricCriterion {
  key: string;
  label: string;
  weight: number;
  description: string;
}

export interface RubricDefinition {
  label: 'internal training rubric — not validated';
  total: 100;
  criteria: RubricCriterion[];
  /** Any of these fails the review regardless of score. */
  automatic_fail: string[];
  notes: string[];
}

export function rubricDefinition(): RubricDefinition {
  return {
    label: 'internal training rubric — not validated',
    total: 100,
    criteria: [
      { key: 'relevance_permission', label: 'Relevance and permission', weight: 10, description: 'A specific, relevant reason to call and explicit permission to continue.' },
      { key: 'listening_vocabulary', label: 'Listening and vocabulary accuracy', weight: 20, description: "The prospect's own words kept, corrections preserved, no synonym substitution." },
      { key: 'evidence_diagnosis', label: 'Evidence-based diagnosis', weight: 20, description: 'Problem and impact established from what the prospect said, not assumed.' },
      { key: 'fit_constraints', label: 'Fit and constraints', weight: 20, description: 'Budget, authority, implementation and no-fit handled honestly.' },
      { key: 'clarity', label: 'Clarity of explanation', weight: 15, description: 'Plain explanation tied to their stated outcome; no unsupported claims.' },
      { key: 'decision_next_step', label: 'Decision and next-step accuracy', weight: 15, description: 'A mutually agreed next step or a clear no-fit / declined outcome.' },
    ],
    automatic_fail: ['fabricated proof', 'coercion', 'serious consent failure', 'explicit opt-out violation'],
    notes: [
      'Internal training rubric, not a validated universal model.',
      'Human corrections are retained for evaluation, not treated as permanent ground truth.',
      'No talk/listen ratio, word count or emotion score is required.',
    ],
  };
}

export interface FunnelStage {
  key: string;
  label: string;
  numerator: string;
  denominator: string;
}

export function funnelDefinitions(): FunnelStage[] {
  return [
    { key: 'eligible_records', label: 'Eligible records', numerator: 'records with a reviewed contact policy that allows contact', denominator: 'all imported records' },
    { key: 'attempted_contacts', label: 'Attempted contacts', numerator: 'records with at least one human-initiated attempt', denominator: 'eligible records' },
    { key: 'connections', label: 'Connections', numerator: 'attempts where a person answered', denominator: 'attempted contacts' },
    { key: 'decision_maker_conversations', label: 'Decision-maker conversations', numerator: 'connections with the person who owns the decision', denominator: 'connections' },
    { key: 'relevant_problems', label: 'Relevant problems', numerator: 'conversations where a relevant problem was stated by the prospect', denominator: 'decision-maker conversations' },
    { key: 'agreed_next_steps', label: 'Mutually agreed next steps', numerator: 'conversations ending in an agreed next step', denominator: 'relevant problems' },
    { key: 'meetings_attended', label: 'Meetings attended', numerator: 'agreed meetings that happened', denominator: 'agreed next steps' },
    { key: 'proposals_authorized', label: 'Proposals authorized', numerator: 'meetings where the prospect authorized a proposal', denominator: 'meetings attended' },
    { key: 'confirmed_outcomes', label: 'User-confirmed outcomes', numerator: 'won / lost / no-fit outcomes confirmed by the user', denominator: 'proposals authorized' },
  ];
}

/** Additive (M-queue): glyph chip for a text-derived call outcome (History cards). The name says the whole truth. */
export function outcomeGlyph(outcome: CallOutcome): { glyph: '⊘' | '✓' | '◔' | '○'; word: string; name: string } {
  switch (outcome) {
    case 'do_not_call':
      return { glyph: '⊘', word: 'DNC', name: `${outcomeLabel(outcome)} — derived from the prospect's own words` };
    case 'agreed_follow_up':
      return { glyph: '✓', word: 'follow-up', name: `${outcomeLabel(outcome)} — derived from the prospect's own words` };
    case 'deferral':
      return { glyph: '◔', word: 'deferral', name: `${outcomeLabel(outcome)} — derived from the prospect's own words` };
    default:
      return { glyph: '○', word: 'no step', name: `${outcomeLabel(outcome)} — derived from the prospect's own words` };
  }
}
