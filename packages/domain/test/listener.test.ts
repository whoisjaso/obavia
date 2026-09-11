/**
 * Personal Meaning Listener — acceptance tests for addendum v3 §10 (items 1–20), plus paraphrase /
 * unseen-domain and abstention cases. Deterministic evidence/lifecycle tests only: there is no
 * model, so nothing here claims inference capability beyond the rule set.
 */
import { describe, expect, it } from 'vitest';
import { PRACTICE_SCENARIOS, coachView, evaluatorView } from '../src/practice';
import { ListenerMemory, Reference, ReferenceCard } from '../src/schemas/listener';
import type { TranscriptTurn } from '../src/schemas/transcript';
import { loadSyntheticTranscripts } from '../src/seeds';
import { normalizeTranscript } from '../src/vocabulary/normalize';
import {
  applyListenerActions,
  applySuggestion,
  applyTurn,
  clarifyReference,
  conceptsForTurn,
  correctReference,
  decideForState,
  decideSuggestion,
  declineSuggestion,
  dismissReference,
  extractTurn,
  forbidReuse,
  invalidateForRevision,
  keepReference,
  labelFigure,
  listenerFromMemory,
  listenerFromTurns,
  markUsed,
  metricGuard,
  offerClaimGuard,
  pinReference,
  queueSuggestion,
  rankByConcept,
  recordReaction,
  rejectReference,
  retrieveByConcept,
  sliceCodePoints,
  suggestPrimary,
  toCards,
  unpinReference,
  validateEvidence,
  validateProposal,
  visibleCards,
  type ListenerOptions,
  type SuggestionNode,
} from '../src/listener';

const seed = loadSyntheticTranscripts();
function fixture(id: string) {
  const t = seed.transcripts.find((x) => x.call_id === id);
  if (!t) throw new Error(`no fixture ${id}`);
  return t;
}

type Line = ['R' | 'P', string] | ['R' | 'P', string, { revision: number; utterance: number }];

/** In-memory synthetic turns with the §12 envelope. Revision lines reuse an earlier utterance id. */
function turns(lines: Line[], callId = 'mem-call'): TranscriptTurn[] {
  const seq: Record<string, number> = { representative: 0, prospect: 0 };
  let utt = 0;
  return lines.map(([who, text, extra], i) => {
    const role = who === 'P' ? 'prospect' : 'representative';
    const uid = extra ? `${callId}-u${String(extra.utterance).padStart(2, '0')}` : `${callId}-u${String(++utt).padStart(2, '0')}`;
    const s = seq[role]!;
    seq[role] = s + 1;
    return {
      workspace_id: 'ws-demo',
      call_id: callId,
      provider: 'synthetic',
      transcription_session_id: `${callId}-session`,
      provider_event_key: `${callId}-ev-${String(i + 1).padStart(3, '0')}`,
      provider_sequence: s,
      track: role,
      speaker_role: role,
      utterance_id: uid,
      revision: extra?.revision ?? 0,
      started_at: new Date(Date.UTC(2026, 8, 8, 15, 0, (extra ? extra.utterance - 1 : i) * 10)).toISOString(),
      ended_at: null,
      text,
      is_final: true,
      confidence_if_provided: null,
      consent_epoch: 1,
      received_at: new Date(Date.UTC(2026, 8, 8, 15, 0, i * 10 + 5)).toISOString(),
    };
  });
}

const ENTRY: SuggestionNode = { id: 'cold-open', script_version_id: 'dealership-inquiry-follow-through-v0.1', stage: 'entry' };
const RESPONSIBILITY: SuggestionNode = {
  id: 'commit-responsibility',
  script_version_id: 'dealership-inquiry-follow-through-v0.1',
  stage: 'commitment',
  intended_answer_type: 'Who holds the decision — the speaker, or another named role.',
};

function lastProspect(raw: TranscriptTurn[]) {
  const n = normalizeTranscript(raw);
  const t = [...n.turns].reverse().find((x) => x.speaker_role === 'prospect')!;
  return { utterance_id: t.utterance_id, text: t.text, speaker_role: t.speaker_role, is_final: t.is_final };
}

function suggestFor(raw: TranscriptTurn[], node: SuggestionNode = ENTRY, options: ListenerOptions = {}) {
  const r = listenerFromTurns(raw, options);
  return { result: r, decision: decideSuggestion({ references: r.references, current_turn: lastProspect(raw), node, event_version: r.event_version }) };
}

describe('listener fixtures', () => {
  it('appends fifteen syn-l-* synthetic, fictional listener calls without touching the original eight', () => {
    const l = seed.transcripts.filter((t) => t.call_id.startsWith('syn-l-'));
    expect(l).toHaveLength(15);
    expect(seed.transcripts.slice(0, 8).map((t) => t.call_id)[0]).toBe('syn-a-profit-not-revenue');
    for (const t of l) {
      expect(t.synthetic).toBe(true);
      expect(t.title).toMatch(/fictional/i);
      for (const e of t.turns) expect(e.provider).toBe('synthetic');
    }
  });

  it('every extracted reference validates against the zod schema and its own evidence span', () => {
    for (const t of seed.transcripts) {
      const r = listenerFromTurns(t.turns);
      for (const ref of r.references) {
        expect(Reference.safeParse(ref).success, `${t.call_id} ${ref.label}`).toBe(true);
        if (ref.lifecycle.state !== 'invalidated') expect(validateEvidence(ref.evidence, r.normalized.turns).ok, `${t.call_id} ${ref.label}`).toBe(true);
        expect(ref.evidence.timestamp).toBe(t.turns.find((x) => x.utterance_id === ref.evidence.utterance_id && x.revision === ref.evidence.revision)?.started_at);
      }
    }
  });
});

describe('§10 item 1 — first-mention hockey is recognized before any repetition', () => {
  it('captures HOCKEY / NOBODY KNOWS WHO IS DEFENDING from the single utterance, relationship intact, personal connection unknown', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns.slice(0, 4);
    const { references } = listenerFromTurns(raw);
    expect(references).toHaveLength(1);
    const h = references[0]!;
    expect(h.label).toBe('HOCKEY / NOBODY KNOWS WHO IS DEFENDING');
    expect(h.lifecycle.occurrence_count).toBe(1);
    expect(h.evidence.exact_expression).toBe('like a hockey team where nobody knows who is defending');
    expect(h.semantics.relationship).toContain('nobody knows who is defending');
    expect(h.semantics.concept_ids).toContain('role_ownership');
    expect(h.semantics.origin).toBe('prospect_spontaneous');
    expect(h.semantics.prohibited_inferences.join(' ')).toMatch(/no hobby\/biography inference/);
    expect(h.reuse.allowed_mapping).toContain('Using your hockey example');
    expect(h.reuse.disallowed_mapping_examples.join(' ')).toContain('Since you grew up playing hockey');
    expect(JSON.stringify(h)).not.toMatch(/loves hockey|fan of hockey|plays hockey/i);
  });

  it('suggests "Using your hockey example, who should own the first response…" when responsibilities come up later', () => {
    const { decision } = suggestFor(fixture('syn-l-hockey-responsibilities').turns);
    expect(decision.suggestion?.text).toBe('Using your hockey example, who should own the first response, and who covers it when that person is unavailable?');
    expect(decision.suggestion?.evidence_turn_id).toBe('syn-l-hockey-responsibilities-u04');
    expect(decision.suggestion?.script_node_id).toBe('cold-open');
  });
});

describe('§10 item 2 — first-mention jazz produces the comparison, not only the music noun', () => {
  it('preserves individual style vs coordination and the negative object', () => {
    const { references } = listenerFromTurns(fixture('syn-l-jazz-robotic').turns.slice(0, 4));
    const j = references.find((r) => r.label.startsWith('JAZZ'))!;
    expect(j.label).toMatch(/^JAZZ \/ EVERYBODY WANTS TO PLAY A SOLO$/);
    expect(j.semantics.relationship).toContain('everybody wants to play a solo');
    expect(j.semantics.concept_ids).toEqual(['coordination_vs_individuality']);
    expect(j.semantics.valence).toEqual({ polarity: 'negative', object: 'the lack of coordination, not the individual style, not the activity' });
    expect(j.semantics.prohibited_inferences.join(' ')).not.toMatch(/musician/);
    expect(JSON.stringify(j)).not.toMatch(/is a musician|plays in a band/i);
  });
});

describe('§10 item 3 — later "robotic" retrieves the earlier jazz reference outside the recent-turn window', () => {
  it('retrieveByConcept maps "robotic" to coordination_vs_individuality with no music words in the turn', () => {
    const full = fixture('syn-l-jazz-robotic').turns;
    const r = listenerFromTurns(full);
    const robotic = 'Would a shared process make everyone sound robotic?';
    expect(robotic).not.toMatch(/jazz|band|solo|music/i);
    expect(conceptsForTurn(robotic)).toContain('coordination_vs_individuality');
    const hits = retrieveByConcept(r, robotic);
    expect(hits.map((h) => h.label)).toEqual(['JAZZ / EVERYBODY WANTS TO PLAY A SOLO']);
    expect(rankByConcept(robotic, r.references)[0]?.matched_concepts).toEqual(['coordination_vs_individuality']);
    // The jazz utterance is seven turns earlier — well outside a 3-turn "recent" window.
    const idx = r.normalized.turns.findIndex((t) => t.utterance_id === hits[0]!.evidence.utterance_id);
    expect(r.normalized.turns.length - 1 - idx).toBeGreaterThanOrEqual(7);
  });

  it('the suggestion keeps individual style AND shared structure, never obedience', () => {
    const { decision } = suggestFor(fixture('syn-l-jazz-robotic').turns);
    expect(decision.suggestion?.text).toBe(
      'Going back to your jazz example, the idea would be to keep individual style while giving everyone the same arrangement to follow. Which parts of the follow-up need that shared structure?',
    );
    expect(decision.suggestion?.text).not.toMatch(/obey|silence|fall in line/i);
  });
});

describe('§10 item 4 — soufflé: negative association attaches to collapse after effort, not cooking generally', () => {
  it('records the object as the result after effort and suggests the rollout question later', () => {
    const { result, decision } = suggestFor(fixture('syn-l-souffle-rollout').turns);
    const s = result.references.find((r) => r.label.startsWith('SOUFFLÉ'))!;
    expect(s.semantics.valence.polarity).toBe('negative');
    expect(s.semantics.valence.object).toBe('the result after the effort (not cooking or the activity itself)');
    expect(s.semantics.concept_ids).toContain('effort_then_failure');
    expect(s.semantics.prohibited_inferences.join(' ')).toMatch(/no hobby\/biography inference/);
    expect(JSON.stringify(s)).not.toMatch(/dislikes cooking|is a chef|baked/i);
    expect(decision.suggestion?.text).toBe('Using your soufflé comparison, what failed when the actual customers started using it?');
    expect(decision.suggestion?.text).not.toMatch(/guarantee|cannot fail|won't fail/i);
  });
});

describe('§10 item 5 — "ambushed" remains an unresolved term until clarification evidence is received', () => {
  const full = fixture('syn-l-ambushed-explained').turns;
  it('is captured as AMBUSHED (not "price objection") with meaning unknown and a clarification question', () => {
    const { references } = listenerFromTurns(full.slice(0, 6));
    const a = references.find((r) => r.label === 'AMBUSHED')!;
    expect(a.semantics.kind).toBe('emotional_descriptor');
    expect(a.semantics.meaning_status).toBe('unknown');
    expect(a.semantics.explained_meaning).toBeUndefined();
    expect(a.semantics.valence).toEqual({ polarity: 'negative', object: 'the extra charges: the explicit description, not an explanation of why' });
    expect(a.reuse.proposed_clarification).toBe(`When you say "ambushed," was it that the charges weren't disclosed, or that you were already committed before they appeared?`);
    expect(`${a.label} ${a.semantics.relationship} ${a.semantics.business_target}`).not.toMatch(/price objection/i);
    // Unknown meaning → only a clarification is offered, never an explanation invented for them.
    const d = decideSuggestion({ references, current_turn: lastProspect(full.slice(0, 6)), node: ENTRY, event_version: 6, clarify_reference_id: a.id });
    expect(d.suggestion?.purpose).toBe('clarify_meaning');
  });

  it('updates the meaning WITH evidence after the prospect explains, and later retrieves it for full costs / exit terms', () => {
    const { result, decision } = suggestFor(full);
    const a = result.references.find((r) => r.label === 'AMBUSHED')!;
    expect(a.semantics.meaning_status).toBe('confirmed');
    expect(a.semantics.explained_meaning).toEqual({ text: "By then they had our website and we couldn't easily leave.", evidence_turn_id: 'syn-l-ambushed-explained-u08' });
    expect(a.semantics.concept_ids).toContain('hidden_costs_commitment_lockin');
    expect(decision.suggestion?.text).toContain('You said you felt ambushed by the extra charges');
    expect(decision.suggestion?.text).toMatch(/review/);
    expect(decision.suggestion?.text).not.toMatch(/cancel any time|cancellation policy|no penalty/i);
  });
});

describe('§10 item 6 — basketball injury: no injury history, team preference, gambling history, or dislike of basketball', () => {
  it('holds the comparison with the negative object = the setback, marks it painful, and never produces an upbeat same-domain line', () => {
    const full = fixture('syn-l-basketball-injury').turns;
    const { result, decision } = suggestFor(full);
    const b = result.references.find((r) => r.label.startsWith('BASKETBALL'))!;
    expect(b.semantics.painful).toBe(true);
    expect(b.semantics.valence).toEqual({ polarity: 'negative', object: 'the setback' });
    expect(b.semantics.meaning_status).toBe('inferred');
    const json = JSON.stringify(b).toLowerCase();
    for (const forbidden of ['injury history', 'broke his', 'broke her', 'team preference', 'favorite team', 'gambling', 'dislikes basketball', 'basketball disliked', 'hates basketball']) {
      expect(json).not.toContain(forbidden);
    }
    expect(b.reuse.allowed_mapping).toMatch(/Neutral acknowledgment only/);
    expect(b.reuse.disallowed_mapping_examples.join(' ')).toContain('slam dunk');
    // Whatever the policy returns for this reference contains no domain word and no "slam dunk".
    const forced = decideSuggestion({ references: result.references, current_turn: lastProspect(full), node: ENTRY, event_version: result.event_version, forced_reference_id: b.id });
    expect(forced.suggestion?.text).not.toMatch(/basketball|slam dunk|leg|injur/i);
    expect(decision.suggestion?.text ?? '').not.toMatch(/basketball|slam dunk/i);
  });
});

describe('§10 item 7 — profit remains distinct from revenue in both wording and calculations', () => {
  const full = fixture('syn-l-profit-vs-revenue').turns;
  it('captures PROFIT as an explicit priority with revenue set aside, and the suggestion never says revenue', () => {
    const { result, decision } = suggestFor(full);
    const p = result.references.find((r) => r.label.startsWith('PROFIT'))!;
    expect(p.semantics.kind).toBe('outcome_label');
    expect(p.evidence.exact_expression).toBe('Profit');
    expect(p.semantics.relationship).toContain('distinct from revenue');
    expect(p.semantics.prohibited_inferences).toContain('do not relabel revenue amounts as profit');
    expect(decision.suggestion?.text).toContain('profit');
    expect(decision.suggestion?.text).not.toMatch(/revenue/i);
    expect(metricGuard(p, 'That would add about 20% revenue, which is profit for you').ok).toBe(false);
  });
  it('a revenue figure is never relabelled as profit', () => {
    const p = listenerFromTurns(full).references.find((r) => r.label.startsWith('PROFIT'))!;
    const labelled = labelFigure(p, { metric: 'revenue', value: 12000 });
    expect(labelled.label).toBe('revenue');
    expect(labelled.mismatch).toBe(true);
    expect(labelled.note).toMatch(/ask how they get from revenue to profit/);
    expect(labelFigure(p, { metric: 'profit', value: 3000 }).mismatch).toBe(false);
  });
});

describe('§10 item 8 — repetition by the seller does not manufacture a prospect-originated priority', () => {
  it('seller says "profit" three times, prospect never does: no PROFIT reference, only what the prospect actually prioritized', () => {
    const full = fixture('syn-l-seller-repeats-profit').turns;
    expect(full.filter((t) => t.speaker_role === 'representative' && /profit/i.test(t.text)).length).toBeGreaterThanOrEqual(3);
    expect(full.filter((t) => t.speaker_role === 'prospect' && /profit/i.test(t.text))).toHaveLength(0);
    const { references } = listenerFromTurns(full);
    expect(references.map((r) => r.label)).toEqual(['KEEPING THE TEAM BUSY']);
    expect(references.every((r) => r.prospect_speaker_role === 'prospect')).toBe(true);
  });
});

describe('§10 item 9 — "My partner follows hockey; I don\'t understand it" does not recommend hockey analogies', () => {
  it('the third-party power-play comparison is do-not-reuse and the later responsibilities question gets no hockey suggestion', () => {
    const full = fixture('syn-l-partner-hockey').turns;
    const { result, decision } = suggestFor(full);
    const third = result.references.find((r) => r.semantics.source_domain === 'hockey');
    expect(third?.semantics.origin).toBe('third_party');
    expect(third?.reuse.do_not_reuse).toBe(true);
    expect(result.not_eligible.some((n) => /hockey.*without a comparison relationship/.test(n.reason))).toBe(true);
    expect(retrieveByConcept(result.references, 'Who should be responsible for the first response?')).toEqual([]);
    expect(decision.suggestion).toBeNull();
    expect(JSON.stringify(result.references)).not.toMatch(/hockey fan|follows hockey": true/i);
  });
});

describe('§10 item 10 — a seller-introduced analogy is labeled prompted/shared, not spontaneous', () => {
  it('relay race: seller_introduced_prospect_confirmed with the seller turn named', () => {
    const { references } = listenerFromTurns(fixture('syn-l-seller-introduced-relay').turns);
    const r = references.find((x) => x.semantics.source_domain === 'relay race')!;
    expect(r.semantics.origin).toBe('seller_introduced_prospect_confirmed');
    expect(r.lifecycle.reason).toContain('syn-l-seller-introduced-relay-u05');
    expect(r.semantics.prohibited_inferences.join(' ')).toMatch(/seller-introduced/);
  });
  it('kitchen: seller asked for a comparison, prospect supplied the domain → prompted', () => {
    const { references } = listenerFromTurns(fixture('syn-l-prompted-kitchen').turns);
    expect(references[0]?.label).toBe('KITCHEN / THREE CHEFS AND NO MENU');
    expect(references[0]?.semantics.origin).toBe('prompted');
  });
  it('without preceding context in a partial window the origin is unknown, never spontaneous by default', () => {
    const raw = turns([['P', 'Managing these salespeople is like running a jazz band where everybody wants to play a solo.']]);
    expect(listenerFromTurns(raw, { window: 'partial' }).references[0]?.semantics.origin).toBe('unknown');
    expect(listenerFromTurns(raw).references[0]?.semantics.origin).toBe('prospect_spontaneous');
  });
});

describe('§10 item 11 — "Let\'s touch base tomorrow" creates no baseball-interest claim or sports reminder', () => {
  it('idioms are not references', () => {
    const { references, not_eligible } = listenerFromTurns(fixture('syn-l-touch-base').turns);
    expect(references).toEqual([]);
    expect(not_eligible.some((n) => n.reason.includes('commonplace idiom "touch base"'))).toBe(true);
    const mem = listenerFromTurns(turns([['R', 'How did it go?'], ['P', 'It was a home run, and the ballpark figure is fine.']]));
    expect(mem.references).toEqual([]);
  });
});

describe('§10 item 12 — a rare noun with no relevant comparison does not automatically receive high priority', () => {
  it('"our CRM is a Frankenstein" is low priority (no card); "the Frankenstein of three tools nobody owns" has a relationship', () => {
    const full = fixture('syn-l-frankenstein').turns;
    const first = listenerFromTurns(full.slice(0, 4));
    expect(first.references).toEqual([]);
    expect(first.not_eligible.find((n) => n.reason.includes('Frankenstein'))?.priority).toBe('low');
    const all = listenerFromTurns(full);
    expect(all.references).toHaveLength(1);
    expect(all.references[0]!.label).toBe('FRANKENSTEIN / OF THREE TOOLS NOBODY OWNS');
    expect(all.references[0]!.semantics.kind).toBe('image');
    expect(all.references[0]!.semantics.concept_ids).toContain('role_ownership');
  });
});

describe('§10 item 13 — a prospect rejects an analogy; later suggestions stop using it', () => {
  it('"please don\'t bring up the jazz thing" → state rejected, reaction recorded, robotic question gets no jazz line', () => {
    const { result, decision } = suggestFor(fixture('syn-l-jazz-rejected').turns);
    const j = result.references.find((r) => r.label.startsWith('JAZZ'))!;
    expect(j.lifecycle.state).toBe('rejected');
    expect(j.reuse.reactions).toEqual([{ turn_id: 'syn-l-jazz-rejected-u06', reaction: 'rejected' }]);
    expect(j.reuse.do_not_reuse).toBe(true);
    expect(decision.suggestion).toBeNull();
  });
  it('a rep-recorded rejection ("Not this reference again") has the same effect', () => {
    const raw = fixture('syn-l-jazz-robotic').turns;
    const base = listenerFromTurns(raw);
    const j = base.references[0]!;
    const after = listenerFromTurns(raw, { actions: [{ type: 'reaction', reference_id: j.id, event_version: base.event_version, turn_id: 'syn-l-jazz-robotic-u12', reaction: 'rejected' }] });
    expect(after.references[0]!.lifecycle.state).toBe('rejected');
    expect(decideSuggestion({ references: after.references, current_turn: lastProspect(raw), node: ENTRY, event_version: after.event_version }).suggestion).toBeNull();
  });
});

describe('§10 item 14 — a transcript revision retracts a phrase; cards and queued suggestions update', () => {
  const full = fixture('syn-l-revision-retracts').turns;
  it('AMBUSHED is invalidated with a reason and a transcript_revision correction entry; a queued suggestion is dropped', () => {
    const before = listenerFromTurns(full.slice(0, 4));
    const a0 = before.references.find((r) => r.label === 'AMBUSHED')!;
    expect(a0.lifecycle.state).toBe('held');
    const queued = decideSuggestion({ references: before.references, current_turn: lastProspect(full.slice(0, 4)), node: ENTRY, event_version: before.event_version, clarify_reference_id: a0.id }).suggestion!;
    expect(queued.reference_id).toBe(a0.id);

    const after = listenerFromTurns(full);
    const a1 = after.references.find((r) => r.label === 'AMBUSHED')!;
    expect(a1.lifecycle.state).toBe('invalidated');
    expect(a1.lifecycle.reason).toContain('revision 0→1 removed "ambushed"');
    expect(a1.lifecycle.correction_history).toEqual([{ at_event_version: after.event_version, field: 'evidence.exact_expression', from: 'ambushed', to: 'I felt the extra charges were unclear.', by: 'transcript_revision' }]);
    expect(a1.evidence.status).toBe('corrected');
    expect(applySuggestion(after.references, queued, 'syn-l-revision-retracts-u06', after.event_version).ok).toBe(false);
    expect(retrieveByConcept(after.references, 'What are the full costs and the exit terms?')).toEqual([]);
  });
  it('a revision that KEEPS the phrase does not invalidate it', () => {
    const raw = turns([['R', 'What happened?'], ['P', 'I felt ambushed by the extra charge.'], ['P', 'I felt ambushed by the extra charges.', { revision: 1, utterance: 2 }]]);
    const r = listenerFromTurns(raw);
    expect(r.references).toHaveLength(1);
    expect(r.references[0]!.lifecycle.state).toBe('held');
    expect(r.references[0]!.evidence.revision).toBe(1);
  });
});

describe('§10 item 15 — a rejected reference is not resurrected by a late model response', () => {
  it('applySuggestion refuses a stale suggestion for a dismissed, rejected or invalidated reference', () => {
    const raw = fixture('syn-l-jazz-robotic').turns;
    const base = listenerFromTurns(raw);
    const j = base.references[0]!;
    const late = decideSuggestion({ references: base.references, current_turn: lastProspect(raw), node: ENTRY, event_version: base.event_version }).suggestion!;
    for (const action of [
      { type: 'dismiss' as const, reference_id: j.id, event_version: base.event_version + 1 },
      { type: 'reaction' as const, reference_id: j.id, event_version: base.event_version + 1, turn_id: 'x', reaction: 'rejected' as const },
    ]) {
      const refs = applyListenerActions(base.references, [action]);
      const applied = applySuggestion(refs, late, 'syn-l-jazz-robotic-u12', base.event_version + 2);
      expect(applied.ok).toBe(false);
      expect(applied.references.find((r) => r.id === j.id)!.reuse.used_at).toEqual([]);
      expect(decideSuggestion({ references: refs, current_turn: lastProspect(raw), node: ENTRY, event_version: base.event_version + 2 }).suggestion).toBeNull();
    }
    // A pin after the suggestion was computed also makes it stale (the reference moved on).
    const pinned = applyListenerActions(base.references, [{ type: 'pin', reference_id: j.id, event_version: base.event_version + 1 }]);
    expect(applySuggestion(pinned, late, 'x', base.event_version + 1).reason).toMatch(/stale/);
    // A fresh suggestion at the current version applies and records used_at.
    const fresh = decideSuggestion({ references: pinned, current_turn: lastProspect(raw), node: ENTRY, event_version: base.event_version + 1 }).suggestion!;
    const ok = applySuggestion(pinned, fresh, 'syn-l-jazz-robotic-u12', base.event_version + 1);
    expect(ok.ok).toBe(true);
    expect(ok.references[0]!.reuse.used_at).toEqual([{ turn_id: 'syn-l-jazz-robotic-u12', event_version: base.event_version + 1 }]);
  });
});

describe('§10 item 16 — several references remain visible and readable beside the exact script (domain side)', () => {
  it('order is first-appearance and stable as turns arrive; pinning never reorders; the script node is never touched', () => {
    const full = fixture('syn-l-unseen-domains').turns;
    const partial = listenerFromTurns(full.slice(0, 6)).references.map((r) => r.id);
    const all = listenerFromTurns(full);
    expect(all.references.map((r) => r.id).slice(0, partial.length)).toEqual(partial);
    expect(all.references).toHaveLength(3);
    const pinnedLast = listenerFromTurns(full, { actions: [{ type: 'pin', reference_id: all.references[2]!.id, event_version: all.event_version }] });
    expect(pinnedLast.references.map((r) => r.id)).toEqual(all.references.map((r) => r.id));
    expect(pinnedLast.references[2]!.lifecycle.state).toBe('pinned');
    const d = decideSuggestion({ references: pinnedLast.references, current_turn: lastProspect(full), node: ENTRY, event_version: all.event_version });
    expect(d.suggestion?.script_node_id).toBe(ENTRY.id); // the suggestion references the node; it never replaces it
  });
});

describe('§10 item 17 — an irrelevant current topic produces no forced analogy', () => {
  it('abstains when the current turn shares no concept with any reference', () => {
    const raw = [...fixture('syn-l-jazz-robotic').turns.slice(0, 4), ...turns([['R', 'What time works for a follow-up?'], ['P', 'Thursday at ten works. Send the invite to me.']], 'syn-l-jazz-robotic').map((t, i) => ({ ...t, provider_event_key: `extra-${i}`, utterance_id: `syn-l-jazz-robotic-x${i}`, provider_sequence: 10 + i, started_at: new Date(Date.UTC(2026, 8, 9, 0, 0, i)).toISOString() }))];
    const { result, decision } = suggestFor(raw);
    expect(result.references).toHaveLength(1);
    expect(decision.suggestion).toBeNull();
    expect(decision.reason).toMatch(/abstain/);
  });
  it('abstains when a matching reference exists but the node purpose does not fit and the turn is not a question', () => {
    const raw = turns([['R', 'How is it going?'], ['P', 'The team handles inquiries like a hockey team where nobody knows who is defending.'], ['R', 'Ok.'], ['P', 'We hired a backup last month.']]);
    const { decision } = suggestFor(raw, ENTRY);
    expect(decision.suggestion).toBeNull();
    // The same statement at a node whose purpose is responsibility DOES fit.
    expect(suggestFor(raw, RESPONSIBILITY).decision.suggestion?.text).toContain('Using your hockey example');
  });
});

describe('§10 item 18 — a proposed analogy cannot introduce an unapproved offer claim or guarantee', () => {
  it('the offer guard rejects guarantees, promises, discounts, refunds and unapproved prices', () => {
    for (const bad of [
      'Using your hockey example, we guarantee nobody drops the puck.',
      'We will make sure the soufflé never collapses again.',
      "I promise this won't fail.",
      'There is a 20% discount if you sign today.',
      'It is $1,500 a month, like a season ticket.',
      'Full refund if it is not a slam dunk.',
      'Setup is free with the annual plan.',
    ]) {
      expect(offerClaimGuard(bad).ok, bad).toBe(false);
    }
    expect(offerClaimGuard('Using your hockey example, who should own the first response?').ok).toBe(true);
    expect(offerClaimGuard('The approved price is $1,200 a month.', { approved_claims: [], approved_price_text: ['$1,200'] }).ok).toBe(true);
    expect(offerClaimGuard('The approved price is $1,300 a month.', { approved_claims: [], approved_price_text: ['$1,200'] }).ok).toBe(false);
  });
  it('every suggestion the policy emits over the fixtures passes the guard', () => {
    for (const t of seed.transcripts) {
      const r = listenerFromTurns(t.turns);
      const last = [...r.normalized.turns].reverse().find((x) => x.speaker_role === 'prospect');
      if (!last) continue;
      const d = decideSuggestion({ references: r.references, current_turn: { utterance_id: last.utterance_id, text: last.text, speaker_role: last.speaker_role, is_final: last.is_final }, node: ENTRY, event_version: r.event_version });
      if (d.suggestion) expect(offerClaimGuard(d.suggestion.text).ok, d.suggestion.text).toBe(true);
    }
  });
});

describe('§10 item 19 — live and simulated fixtures use the same extraction path; hidden mock facts are inaccessible', () => {
  it('a practice scenario\'s REVEALED lines run through listenerFromTurns; nothing from evaluatorView.hidden_fact_sheet is reachable', () => {
    const scenario = PRACTICE_SCENARIOS.find((s) => s.id === 'skeptical-earlier-automation')!;
    const revealed = ['The last thing I bought like this made things worse.', 'It was like planting a garden that you never water and then blaming the seeds.'];
    const coach = coachView(scenario, revealed);
    // Build turns ONLY from what the coach view can see: public brief is context, revealed facts are prospect lines.
    const raw = turns([['R', `Context: ${coach.public_brief} — what happened last time?`], ...coach.revealed_facts.map((f): Line => ['P', f])], `practice-${coach.id}`);
    const result = listenerFromTurns(raw);
    expect(result.references.map((r) => r.label)).toContain('GARDEN / YOU NEVER WATER AND THEN BLAMING');
    const evaluator = evaluatorView(scenario, revealed);
    const hidden = JSON.stringify(evaluator.hidden_fact_sheet);
    const everything = JSON.stringify(result);
    for (const line of [...evaluator.hidden_fact_sheet.real_needs, ...evaluator.hidden_fact_sheet.already_tried, ...evaluator.hidden_fact_sheet.would_proceed_if]) {
      expect(everything).not.toContain(line);
    }
    expect(everything).not.toContain('hidden_fact_sheet');
    expect(hidden).toContain('chat-bot'); // the hidden truth exists, and is simply not in the input the listener accepts
    // Structural: the signature accepts turns + options only. A hidden fact sheet is not a TranscriptTurn.
    const fn: (t: readonly TranscriptTurn[], o?: ListenerOptions) => unknown = listenerFromTurns;
    expect(fn.length).toBeLessThanOrEqual(2);
    // Same function, same behaviour on the synthetic fixture path.
    expect(listenerFromTurns(fixture('syn-l-unseen-domains').turns).references.map((r) => r.semantics.kind)).toEqual(['analogy', 'analogy', 'analogy']);
  });
});

describe('§10 item 20 — duplicate events, revisions, dismissed-not-resurrected (tenant/consent/deletion belong to Increments 2/4)', () => {
  it('duplicate provider events never create duplicate references or inflate occurrence_count', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns;
    const dup = [...raw, raw[3]!, { ...raw[3]!, provider_event_key: 'redelivered-under-new-key' }];
    const r = listenerFromTurns(dup);
    expect(r.normalized.dropped.length).toBe(2);
    expect(r.references).toHaveLength(1);
    expect(r.references[0]!.lifecycle.occurrence_count).toBe(1);
  });
  it('a genuine second mention (new utterance) counts once more, keeping the first evidence', () => {
    const raw = turns([
      ['R', 'How is it handled?'],
      ['P', 'The team handles inquiries like a hockey team where nobody knows who is defending.'],
      ['R', 'Ok.'],
      ['P', 'Like I said, it is like a hockey team where nobody knows who is defending.'],
    ]);
    const r = listenerFromTurns(raw);
    expect(r.references).toHaveLength(1);
    expect(r.references[0]!.lifecycle.occurrence_count).toBe(2);
    expect(r.references[0]!.evidence.utterance_id).toBe('mem-call-u02');
    expect(r.references[0]!.lifecycle.last_turn_id).toBe('mem-call-u04');
  });
  it('a dismissed reference stays dismissed when the same turns are replayed (action log is deterministic)', () => {
    const raw = fixture('syn-l-jazz-robotic').turns;
    const base = listenerFromTurns(raw);
    const actions = [{ type: 'dismiss' as const, reference_id: base.references[0]!.id, event_version: 4 }];
    const a = listenerFromTurns(raw, { actions });
    const b = listenerFromTurns([...raw], { actions });
    expect(a.references[0]!.lifecycle.state).toBe('dismissed');
    expect(b).toEqual(a);
  });
  it('call boundaries: references are scoped by call_id and ids never collide across calls', () => {
    const a = listenerFromTurns(fixture('syn-l-jazz-robotic').turns).references[0]!;
    const b = listenerFromTurns(fixture('syn-l-jazz-rejected').turns).references[0]!;
    expect(a.label).toBe(b.label);
    expect(a.id).not.toBe(b.id);
    expect(a.call_id).toBe('syn-l-jazz-robotic');
  });
  it.todo('tenant boundary (RLS), consent stopping and deletion propagate to reference memory — Increment 2/4 (Supabase + consent gates); not faked here');
  it.todo('model-outage fallback keeps the script, manual controls and captured references — Increment 4 (coach contract); the rule-based path has no model to lose');
});

describe('evidence exactness — Unicode code-point spans', () => {
  it('spans are code-point offsets that slice back to the exact expression even after astral characters', () => {
    const raw = turns([['R', 'How does it feel?'], ['P', '🙂 honestly 𝒜 it is like a hockey team where nobody knows who is defending.']]);
    const r = listenerFromTurns(raw);
    const ref = r.references[0]!;
    const text = raw[1]!.text;
    expect(sliceCodePoints(text, ref.evidence.span.start, ref.evidence.span.end)).toBe(ref.evidence.exact_expression);
    expect(text.slice(ref.evidence.span.start, ref.evidence.span.end)).not.toBe(ref.evidence.exact_expression); // UTF-16 slicing would be wrong
    expect(validateEvidence(ref.evidence, r.normalized.turns).ok).toBe(true);
  });
  it('validateProposal rejects fabricated quotes, wrong spans, wrong speaker and wrong revision', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns;
    const n = normalizeTranscript(raw);
    const good = listenerFromTurns(raw).references[0]!.evidence;
    expect(validateProposal({ ...good, speaker_role: 'prospect' }, n.turns).ok).toBe(true);
    expect(validateProposal({ ...good, exact_expression: 'like a football team', speaker_role: 'prospect' }, n.turns).ok).toBe(false);
    expect(validateProposal({ ...good, span: { start: 0, end: 5 }, speaker_role: 'prospect' }, n.turns).ok).toBe(false);
    expect(validateProposal({ ...good, utterance_id: 'syn-l-hockey-responsibilities-u03', speaker_role: 'prospect' }, n.turns).ok).toBe(false);
    expect(validateProposal({ ...good, revision: 3, speaker_role: 'prospect' }, n.turns).ok).toBe(false);
    expect(validateProposal({ ...good, speaker_role: 'representative' }, n.turns).ok).toBe(false);
  });
  it('a provisional (interim) turn yields provisional evidence that is never suggested', () => {
    const raw = turns([['R', 'How is it?'], ['P', 'It is like a hockey team where nobody knows who is defending.']]).map((t) => (t.speaker_role === 'prospect' ? { ...t, is_final: false } : t));
    const r = listenerFromTurns(raw);
    expect(r.references[0]!.evidence.status).toBe('provisional');
    expect(retrieveByConcept(r.references, 'Who should be responsible for the first response?')).toEqual([]);
  });
});

describe('paraphrase and unseen-domain cases', () => {
  it('gardening, chess and construction comparisons are captured with relationships and concepts (nothing from the addendum verbatim)', () => {
    const { references } = listenerFromTurns(fixture('syn-l-unseen-domains').turns);
    expect(references.map((r) => [r.semantics.source_domain, r.semantics.concept_ids[0]])).toEqual([
      ['gardening', 'ongoing_maintenance'],
      ['chess', 'reactive_vs_planned'],
      ['construction', 'foundation_before_build'],
    ]);
    for (const r of references) expect(r.semantics.relationship.length).toBeGreaterThan(10);
  });
  it('paraphrased emotional descriptors: any "felt <participle>" is accepted; open lexicon phrases carry their object', () => {
    const r = listenerFromTurns(turns([['R', 'What happened?'], ['P', 'We felt steamrolled by the renewal, and there was no breathing room to think it over.']]));
    const labels = r.references.map((x) => x.label);
    expect(labels).toContain('STEAMROLLED');
    expect(labels).toContain('BREATHING ROOM');
    const br = r.references.find((x) => x.label === 'BREATHING ROOM')!;
    expect(br.semantics.valence.polarity).toBe('negative');
    expect(br.semantics.valence.object).toContain('absence of breathing room');
    expect(r.references.find((x) => x.label === 'STEAMROLLED')!.semantics.meaning_status).toBe('unknown');
  });
  it('a paraphrased "as X as" comparison in an unseen domain still attaches valence to the business object, not the domain', () => {
    const r = listenerFromTurns(turns([['R', 'How was the migration?'], ['P', 'The migration was as frustrating as sailing with a crew that argues about the rudder.']]));
    expect(r.references[0]!.semantics.source_domain).toBe('sailing');
    expect(r.references[0]!.semantics.valence.polarity).toBe('negative');
    expect(r.references[0]!.semantics.valence.object).toBe('the migration');
  });
  it('a defined term "by X I mean Y" is captured as confirmed with the definition as evidence', () => {
    const r = listenerFromTurns(turns([['R', 'What do you mean?'], ['P', 'By stickiness I mean how many customers come back within a year.']]));
    expect(r.references[0]!.semantics.kind).toBe('defined_term');
    expect(r.references[0]!.semantics.meaning_status).toBe('confirmed');
    expect(r.references[0]!.semantics.explained_meaning?.text).toBe('how many customers come back within a year');
  });
  it('extractTurn on a representative turn yields nothing (only the prospect originates references)', () => {
    const n = normalizeTranscript(turns([['R', 'It is like a hockey team where nobody knows who is defending, right?']]));
    expect(extractTurn(n.turns[0]!).candidates).toEqual([]);
  });
});

describe('abstention and no-repeat policy', () => {
  it('does not repeat the reference used in the immediately preceding suggestion unless the turn asks for clarification', () => {
    const raw = fixture('syn-l-jazz-robotic').turns;
    const r = listenerFromTurns(raw);
    const j = r.references[0]!;
    const base = { references: r.references, current_turn: lastProspect(raw), node: ENTRY, event_version: r.event_version };
    expect(decideSuggestion({ ...base, last_suggestion_reference_id: j.id }).suggestion).toBeNull();
    expect(decideSuggestion({ ...base, current_turn: { ...base.current_turn, text: 'What do you mean, robotic in what sense?' }, last_suggestion_reference_id: j.id }).suggestion?.reference_id).toBe(j.id);
  });
  it('"Not now" hides the reference at that version; a dismissed card is never suggested', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns;
    const r = listenerFromTurns(raw);
    const h = r.references[0]!;
    expect(decideSuggestion({ references: r.references, current_turn: lastProspect(raw), node: ENTRY, event_version: r.event_version, not_now: [h.id] }).suggestion).toBeNull();
    const dismissed = listenerFromTurns(raw, { actions: [{ type: 'dismiss', reference_id: h.id, event_version: r.event_version }] });
    expect(decideSuggestion({ references: dismissed.references, current_turn: lastProspect(raw), node: ENTRY, event_version: r.event_version }).suggestion).toBeNull();
  });
  it('returns at most one suggestion even when several references match', () => {
    const raw = turns([
      ['R', 'How is it?'],
      ['P', 'The team handles inquiries like a hockey team where nobody knows who is defending.'],
      ['R', 'Ok.'],
      ['P', "It's the Frankenstein of three tools nobody owns."],
      ['R', 'Ok.'],
      ['P', 'Who should be responsible for the first response?'],
    ]);
    const { result, decision } = suggestFor(raw);
    expect(result.references).toHaveLength(2);
    expect(decision.suggestion).not.toBeNull();
    expect(Array.isArray(decision.suggestion)).toBe(false);
  });
  it('rep corrections keep the original visible in correction_history and mark evidence corrected', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns;
    const r = listenerFromTurns(raw);
    const h = r.references[0]!;
    const corrected = listenerFromTurns(raw, { actions: [{ type: 'correct', reference_id: h.id, event_version: r.event_version, field: 'relationship', to: 'unclear ownership of the first reply', note: 'said so again at u10' }] }).references[0]!;
    expect(corrected.semantics.relationship).toBe('unclear ownership of the first reply');
    expect(corrected.lifecycle.correction_history[0]).toMatchObject({ field: 'relationship', from: h.semantics.relationship, to: 'unclear ownership of the first reply', by: 'rep', note: 'said so again at u10' });
    expect(corrected.evidence.status).toBe('corrected');
    expect(corrected.evidence.exact_expression).toBe(h.evidence.exact_expression); // the quote is never rewritten
  });
});

// ---------------------------------------------------------------------------------------------
// Frozen state API (what the call room codes against): incremental applyTurn, lifecycle, cards.
// ---------------------------------------------------------------------------------------------

describe('frozen API — listenerFromTurns / applyTurn are the same path', () => {
  it('applyTurn over every event reproduces listenerFromTurns over the whole transcript (references, versions, not_eligible)', () => {
    for (const t of seed.transcripts) {
      const whole = listenerFromTurns(t.turns, { call_id: t.call_id });
      let state = listenerFromTurns([], { call_id: t.call_id });
      for (const turn of t.turns) state = applyTurn(state, turn);
      expect(state.references).toEqual(whole.references);
      expect(state.event_version).toBe(whole.event_version);
      expect(state.not_eligible).toEqual(whole.not_eligible);
      expect(state.memory.turns).toEqual(t.turns);
    }
  });
  it('the state carries a persistable memory; listenerFromMemory restores an identical state (schema-valid)', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns;
    let state = listenerFromTurns(raw, { call_id: 'syn-l-hockey-responsibilities' });
    state = pinReference(state, state.references[0]!.id);
    state = queueSuggestion(state, suggestPrimary(state, { node: ENTRY }));
    expect(ListenerMemory.safeParse(state.memory).success).toBe(true);
    const restored = listenerFromMemory(JSON.parse(JSON.stringify(state.memory)), state.context);
    expect(restored.references).toEqual(state.references);
    expect(restored.memory.queued_suggestion).toEqual(state.memory.queued_suggestion);
    expect(restored.memory.queued_suggestion?.text).toContain('Using your hockey example');
  });
  it('applyTurn with a duplicate event changes nothing but the event version (item 20)', () => {
    const raw = fixture('syn-l-hockey-responsibilities').turns;
    const base = listenerFromTurns(raw);
    const dup = applyTurn(base, { ...raw[3]!, provider_event_key: 'redelivered' });
    expect(dup.references).toEqual(base.references);
    expect(dup.references[0]!.lifecycle.occurrence_count).toBe(1);
    expect(dup.event_version).toBe(base.event_version + 1);
  });
});

describe('frozen API — suggestPrimary(state, ctx) and the one-suggestion slot', () => {
  it('reads the current turn from the state; abstains with no node; queues exactly one suggestion on its card', () => {
    const state = listenerFromTurns(fixture('syn-l-jazz-robotic').turns);
    expect(suggestPrimary(state, { node: null })).toBeNull();
    const s = suggestPrimary(state, { node: ENTRY });
    expect(s?.text).toContain('Going back to your jazz example');
    expect(s?.trigger_turn_id).toBe('syn-l-jazz-robotic-u12');
    const queued = queueSuggestion(state, s);
    const cards = toCards(queued);
    expect(cards.filter((c) => c.suggestion).map((c) => c.label)).toEqual(['JAZZ / EVERYBODY WANTS TO PLAY A SOLO']);
    expect(decideForState(state, { node: ENTRY }).reason).toMatch(/grounded in/);
  });
  it('markUsed clears the slot and blocks an immediate repeat; declineSuggestion hides it for this version only', () => {
    let state = listenerFromTurns(fixture('syn-l-jazz-robotic').turns);
    const s = suggestPrimary(state, { node: ENTRY })!;
    state = markUsed(queueSuggestion(state, s), s.reference_id);
    expect(state.memory.queued_suggestion).toBeNull();
    expect(state.memory.last_suggestion_reference_id).toBe(s.reference_id);
    expect(state.references[0]!.reuse.used_at).toEqual([{ turn_id: 'syn-l-jazz-robotic-u12', event_version: state.event_version }]);
    expect(suggestPrimary(state, { node: ENTRY })).toBeNull(); // no immediate repeat
    let fresh = listenerFromTurns(fixture('syn-l-jazz-robotic').turns);
    fresh = declineSuggestion(fresh, fresh.references[0]!.id);
    expect(suggestPrimary(fresh, { node: ENTRY })).toBeNull();
    const next = applyTurn(fresh, turns([['P', 'Would a shared process make everyone sound robotic?']], 'syn-l-jazz-robotic').map((t) => ({ ...t, utterance_id: 'syn-l-jazz-robotic-u13', provider_event_key: 'ev-013', provider_sequence: 9, started_at: '2026-09-09T00:00:00.000Z' }))[0]!);
    expect(suggestPrimary(next, { node: ENTRY })?.reference_id).toBe(fresh.references[0]!.id); // a new turn lifts "not now"
  });
  it('a new final prospect turn drops the queued suggestion (the conversation moved on)', () => {
    const raw = fixture('syn-l-jazz-robotic').turns;
    let state = listenerFromTurns(raw);
    state = queueSuggestion(state, suggestPrimary(state, { node: ENTRY }));
    expect(state.memory.queued_suggestion).not.toBeNull();
    state = applyTurn(state, { ...raw[11]!, utterance_id: 'syn-l-jazz-robotic-u13', provider_event_key: 'ev-013', provider_sequence: 9, text: 'Thursday at ten works.' });
    expect(state.memory.queued_suggestion).toBeNull();
  });
});

describe('frozen API — lifecycle functions', () => {
  const raw = fixture('syn-l-hockey-responsibilities').turns;
  it('pin/unpin/keep/dismiss/forbidReuse/clarify/correct each return a new state and are recorded in memory.actions', () => {
    const base = listenerFromTurns(raw);
    const id = base.references[0]!.id;
    const pinned = pinReference(base, id);
    expect(base.references[0]!.lifecycle.state).toBe('held'); // no mutation
    expect(pinned.references[0]!.lifecycle.state).toBe('pinned');
    expect(unpinReference(pinned, id).references[0]!.lifecycle.state).toBe('held');
    expect(keepReference(base, id).references[0]!.lifecycle.kept_for_later).toBe(true);
    const dismissed = dismissReference(base, id, 'not useful');
    expect(dismissed.references[0]!.lifecycle).toMatchObject({ state: 'dismissed', reason: 'not useful' });
    expect(forbidReuse(base, id).references[0]!.reuse.do_not_reuse).toBe(true);
    expect(clarifyReference(base, id).references[0]!.reuse.clarification_requested).toBe(true);
    const corrected = correctReference(base, id, 'business_target', 'the inbound inquiry handoff', 'said at u10');
    expect(corrected.references[0]!.semantics.business_target).toBe('the inbound inquiry handoff');
    expect(corrected.references[0]!.lifecycle.correction_history[0]).toMatchObject({ field: 'business_target', by: 'rep', note: 'said at u10' });
    expect(corrected.memory.actions.map((a) => a.type)).toEqual(['correct']);
    expect(pinned.memory.actions[0]).toEqual({ type: 'pin', reference_id: id, event_version: base.event_version });
  });
  it('rejectReference / recordReaction: rejected → state rejected, no further suggestions; unknown is neither', () => {
    const base = listenerFromTurns(raw);
    const id = base.references[0]!.id;
    const rejected = rejectReference(base, id);
    expect(rejected.references[0]!.lifecycle.state).toBe('rejected');
    expect(rejected.references[0]!.reuse.reactions).toEqual([{ turn_id: 'syn-l-hockey-responsibilities-u10', reaction: 'rejected' }]);
    expect(suggestPrimary(rejected, { node: ENTRY })).toBeNull();
    expect(pinReference(rejected, id).references[0]!.lifecycle.state).toBe('rejected'); // a pin cannot revive it
    const unknown = recordReaction(base, id, 'unknown', 'syn-l-hockey-responsibilities-u10');
    expect(unknown.references[0]!.lifecycle.state).toBe('held');
    expect(suggestPrimary(unknown, { node: ENTRY })).not.toBeNull();
  });
  it('item 15 through the state: a late suggestion cannot be queued after dismiss/reject, and a stale one is refused', () => {
    const base = listenerFromTurns(raw);
    const id = base.references[0]!.id;
    const late = suggestPrimary(base, { node: ENTRY })!;
    expect(queueSuggestion(dismissReference(base, id), late).memory.queued_suggestion).toBeNull();
    expect(queueSuggestion(rejectReference(base, id), late).memory.queued_suggestion).toBeNull();
    expect(queueSuggestion(pinReference(base, id), late).memory.queued_suggestion).toBeNull(); // any action since → stale, recompute
    expect(queueSuggestion(correctReference(base, id, 'business_target', 'the inbox', 'n'), late).memory.queued_suggestion).toBeNull();
    expect(late.input_action_count).toBe(0);
    expect(queueSuggestion(base, late).memory.queued_suggestion).toEqual(late);
    // Dismissing while a suggestion is queued drops it too.
    expect(dismissReference(queueSuggestion(base, late), id).memory.queued_suggestion).toBeNull();
    expect(forbidReuse(queueSuggestion(base, late), id).memory.queued_suggestion).toBeNull();
  });
  it('item 14 through the state: invalidateForRevision drops the queued suggestion and invalidates the card', () => {
    const full = fixture('syn-l-revision-retracts').turns;
    let state = listenerFromTurns(full.slice(0, 4));
    const a = state.references.find((r) => r.label === 'AMBUSHED')!;
    state = queueSuggestion(state, suggestPrimary(state, { node: ENTRY, clarify_reference_id: a.id }));
    expect(state.memory.queued_suggestion?.purpose).toBe('clarify_meaning');
    const revised = invalidateForRevision(state, full[4]!);
    expect(revised.memory.queued_suggestion).toBeNull();
    const card = toCards(revised).find((c) => c.label === 'AMBUSHED')!;
    expect(card.state).toBe('invalidated');
    expect(card.glyph).toBe('⊘');
    expect(card.meaning_line).toMatch(/^Invalidated: transcript revision 0→1 removed "ambushed"/);
    expect(card.actions).toEqual({ keep: false, use: false, clarify: false });
    // applyTurn with the same revision event reaches the same state.
    expect(applyTurn(state, full[4]!).references).toEqual(revised.references);
  });
});

describe('frozen API — toCards', () => {
  it('cards are schema-valid, first-appearance ordered, and carry quote/turn/status/origin/valence/actions', () => {
    const state = listenerFromTurns(fixture('syn-l-ambushed-explained').turns);
    const cards = toCards(state);
    for (const c of cards) expect(ReferenceCard.safeParse(c).success, c.label).toBe(true);
    const a = cards.find((c) => c.label === 'AMBUSHED')!;
    expect(a).toMatchObject({
      meaning_status: 'confirmed',
      glyph: '✓',
      origin: 'prospect_spontaneous',
      origin_label: 'prospect said it unprompted',
      state: 'held',
      pinned: false,
      evidence: { quote: 'I felt ambushed by the extra charges.', turn_id: 'syn-l-ambushed-explained-u04', exact_expression: 'ambushed', status: 'final' },
      confirmed_meaning: { text: "By then they had our website and we couldn't easily leave.", evidence_turn_id: 'syn-l-ambushed-explained-u08' },
      valence: { polarity: 'negative', object: 'the extra charges: the explicit description, not an explanation of why' },
    });
    expect(a.glyph_name).toMatch(/^meaning confirmed/);
    expect(a.useful_when).toMatch(/unexpected charges after commitment/);
    expect(a.represents).toContain("they explained: By then they had our website");
    expect(a.actions).toEqual({ keep: true, use: true, clarify: false }); // clarified already
    // Before the explanation: unknown meaning, '?' glyph, clarify on offer.
    const early = toCards(listenerFromTurns(fixture('syn-l-ambushed-explained').turns.slice(0, 6)))[0]!;
    expect(early).toMatchObject({ meaning_status: 'unknown', glyph: '?', clarification: expect.stringContaining('When you say "ambushed,"') });
    expect(early.actions.clarify).toBe(true);
  });
  it('third-party and painful references are cards with honest reuse text; rejected cards say so', () => {
    const third = toCards(listenerFromTurns(fixture('syn-l-partner-hockey').turns)).find((c) => c.source_domain === 'hockey')!;
    expect(third.origin).toBe('third_party');
    expect(third.do_not_reuse).toBe(true);
    expect(third.useful_when).toMatch(/someone else's frame/);
    expect(third.actions.use).toBe(false);
    const painful = toCards(listenerFromTurns(fixture('syn-l-basketball-injury').turns))[0]!;
    expect(painful.painful).toBe(true);
    expect(painful.useful_when).toMatch(/neutral acknowledgment/);
    expect(`${painful.label} ${painful.meaning_line} ${painful.represents} ${painful.useful_when} ${painful.state_line ?? ''}`).not.toMatch(/slam dunk|injury history|dislikes basketball|broke (?:his|her|their)/i);
    expect(painful.prohibited_inferences).toContain('no upbeat same-domain line (no "slam dunk")');
    const rejected = toCards(listenerFromTurns(fixture('syn-l-jazz-rejected').turns))[0]!;
    expect(rejected.state).toBe('rejected');
    expect(rejected.meaning_line).toBe('Rejected by the prospect, not used again');
    expect(rejected.state_line).toBe('Rejected by the prospect, not used again');
  });
  it('visibleCards keeps first-appearance order, caps held cards, never drops a pinned one, never shows dismissed', () => {
    const lines: Line[] = [['R', 'Go on.']];
    const domains = ['a hockey team where nobody knows who is defending', 'a jazz band where everybody wants to play a solo', 'a garden that you plant in spring and then never water', 'a chess game where I am always three moves behind the customer', 'a kitchen with three chefs and no menu', 'a relay race where the baton gets dropped between shifts', 'a sailboat where the crew argues about the rudder', 'an orchestra where nobody follows the conductor', 'a farm where the harvest comes in before the barn is built'];
    for (const d of domains) lines.push(['P', `The follow-up is like ${d}.`], ['R', 'Ok.']);
    let state = listenerFromTurns(turns(lines));
    expect(state.references.length).toBeGreaterThanOrEqual(8);
    const last = state.references[state.references.length - 1]!.id;
    state = pinReference(state, last);
    state = dismissReference(state, state.references[1]!.id);
    const all = toCards(state);
    const visible = visibleCards(all, 5);
    expect(visible).toHaveLength(5);
    expect(visible.map((c) => c.id)).toEqual(all.filter((c) => visible.some((v) => v.id === c.id)).map((c) => c.id)); // original order
    expect(visible.some((c) => c.id === last)).toBe(true); // the pinned newest card survives the cap
    expect(visible.some((c) => c.state === 'dismissed')).toBe(false);
    expect(visibleCards(all, 1)).toHaveLength(3); // never fewer than three when available
  });
});
