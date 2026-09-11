/**
 * Confirmed facts (compact validated fact state, brief §12) derived by text rules — no model.
 * Keys use the script slot format ("{prospect_name}") so a node's required_context can be checked.
 */
import type { SpeakerRole } from '../schemas/transcript';
import type { VocabularyEvent } from '../schemas/vocabulary';
import type { NormalizedTurn } from './normalize';
import type { RankedCandidate } from './rank';
import { splitSentences } from './text';

export type FactStatus = 'observed' | 'seller_stated' | 'agreed';

export interface Fact {
  key: string;
  value: string;
  status: FactStatus;
  turn_id: string;
  speaker_role: SpeakerRole;
}

const NAME_AT_START = /^(?:[Tt]his is |[Ii]t's |I'm |I am )?([A-Z][a-z]+ [A-Z][a-z]+)\b/;
const COMPANY_AFTER_PREP = /\b(?:at|with|from|over at|I run)\s+([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){1,4})/;
const COMPANY_AFTER_COMMA = /^[A-Z][a-z]+ [A-Z][a-z]+,\s*([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){1,4})/;
const REP_FIRST_NAME = /^Hi ([A-Z][a-z]+)\b/;
const REP_COMPANY = /why I called ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){1,4})/;
const FOLLOW_UP_DAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|next week|tomorrow)\b/i;
const FOLLOW_UP_AGREE = /\b(?:works|is fine|fine|loop|send|afternoon|morning|at \w+)\b/i;

function add(facts: Fact[], f: Fact): void {
  if (!facts.some((x) => x.key === f.key && (x.status === 'observed' || x.status === 'agreed'))) {
    const i = facts.findIndex((x) => x.key === f.key);
    if (i >= 0) facts[i] = f;
    else facts.push(f);
  }
}

/** Derive facts from normalized turns plus the current ranking (their word / stated goal). */
export function extractFacts(turns: readonly NormalizedTurn[], ranked: readonly RankedCandidate[] = [], events: readonly VocabularyEvent[] = []): Fact[] {
  const facts: Fact[] = [];
  const rep = turns.find((t) => t.speaker_role === 'representative' && t.is_final);
  if (rep) {
    const n = REP_FIRST_NAME.exec(rep.text);
    if (n) add(facts, { key: '{prospect_name}', value: n[1]!, status: 'seller_stated', turn_id: rep.utterance_id, speaker_role: 'representative' });
    const c = REP_COMPANY.exec(rep.text);
    if (c) add(facts, { key: '{dealership_name}', value: c[1]!, status: 'seller_stated', turn_id: rep.utterance_id, speaker_role: 'representative' });
  }
  for (const t of turns) {
    if (t.speaker_role !== 'prospect' || !t.is_final) continue;
    for (const s of splitSentences(t.text)) {
      const name = NAME_AT_START.exec(s.text);
      if (name && !facts.some((f) => f.key === '{prospect_name}' && f.status === 'observed')) {
        add(facts, { key: '{prospect_name}', value: name[1]!, status: 'observed', turn_id: t.utterance_id, speaker_role: 'prospect' });
      }
      const company = COMPANY_AFTER_PREP.exec(s.text) ?? COMPANY_AFTER_COMMA.exec(s.text);
      if (company && !facts.some((f) => f.key === '{dealership_name}' && f.status === 'observed')) {
        add(facts, { key: '{dealership_name}', value: company[1]!, status: 'observed', turn_id: t.utterance_id, speaker_role: 'prospect' });
      }
      if (FOLLOW_UP_DAY.test(s.text) && FOLLOW_UP_AGREE.test(s.text) && !facts.some((f) => f.key === '{reconnect_window}')) {
        add(facts, { key: '{reconnect_window}', value: s.text.replace(/[.!?]$/, ''), status: 'agreed', turn_id: t.utterance_id, speaker_role: 'prospect' });
      }
    }
  }
  const top = ranked.find((r) => r.eligible);
  if (top) {
    add(facts, { key: '{their_word}', value: top.event.exact_text, status: 'observed', turn_id: top.event.turn_id, speaker_role: top.event.speaker_role });
    if (top.event.provenance === 'prospect_said') {
      add(facts, { key: '{stated_goal}', value: top.event.exact_text, status: 'observed', turn_id: top.event.turn_id, speaker_role: 'prospect' });
    }
  }
  const problem = events.find((e) => e.rank_reasons?.some((r) => r.includes('problem')) || /problem/.test(e.cue ?? ''));
  if (problem) {
    add(facts, { key: '{stated_problem}', value: problem.exact_text, status: 'observed', turn_id: problem.turn_id, speaker_role: 'prospect' });
  }
  return facts;
}

/** Slots from a node's required_context that no fact covers yet — the first is "the one most useful missing field". */
export function missingFields(requiredContext: readonly string[], facts: readonly Fact[]): string[] {
  const known = new Set(facts.map((f) => f.key));
  return requiredContext.filter((k) => !known.has(k));
}

/** Plain-language label for a slot key. */
export function slotLabel(key: string): string {
  return key.replace(/[{}]/g, '').replace(/_/g, ' ');
}
