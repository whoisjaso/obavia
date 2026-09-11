import { describe, expect, it } from 'vitest';
import { loadSyntheticTranscripts } from '../src/seeds';
import type { Transcript, TranscriptTurn } from '../src/schemas/transcript';
import {
  EMPTY_PIN_STATE,
  PIN_MAX,
  PIN_MIN,
  analyzeCall,
  applyMeaning,
  applyRevision,
  checkTrackOrder,
  confirmQuote,
  correctionLines,
  dedupeEvents,
  extractFacts,
  funnelDefinitions,
  normalizeTranscript,
  pinPhrase,
  postCallReview,
  provenanceLabel,
  resolvePins,
  rubricDefinition,
  unpinPhrase,
  type RankedCandidate,
} from '../src/vocabulary';

const seed = loadSyntheticTranscripts();
function call(prefix: string): Transcript {
  const t = seed.transcripts.find((x) => x.call_id.startsWith(prefix));
  if (!t) throw new Error(`no call ${prefix}`);
  return t;
}
const A = call('syn-a');
const B = call('syn-b');
const C = call('syn-c');
const D = call('syn-d');
const E = call('syn-e');
const F = call('syn-f');
const G = call('syn-g');
const H = call('syn-h');

describe('synthetic transcript seed', () => {
  it('is authored (no placeholder marker), synthetic, provider "synthetic", with the §12 fields on every event', () => {
    expect(seed._status).toBeUndefined();
    expect(seed.transcripts.length).toBeGreaterThanOrEqual(8);
    for (const t of seed.transcripts) {
      expect(t.synthetic).toBe(true);
      expect(t.title).toMatch(/fictional/i);
      for (const e of t.turns) {
        expect(e.provider).toBe('synthetic');
        expect(e.call_id).toBe(t.call_id);
        expect(e.consent_epoch).toBe(1);
        expect(['representative', 'prospect']).toContain(e.track);
        expect(Number.isNaN(Date.parse(e.started_at))).toBe(false);
      }
    }
  });

  it('has unique provider_event_keys except the one deliberate duplicate callback in call G', () => {
    for (const t of seed.transcripts) {
      const keys = t.turns.map((e) => e.provider_event_key);
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      if (t.call_id === G.call_id) expect(dupes).toHaveLength(1);
      else expect(dupes).toEqual([]);
    }
  });

  it('keeps per-track provider_sequence monotonic against started_at (no regressions)', () => {
    for (const t of seed.transcripts) expect(checkTrackOrder(t.turns).ok, t.call_id).toBe(true);
  });
});

describe('scenario 1 — profit, not revenue; net, not gross', () => {
  const a = analyzeCall(A.turns);
  it('prioritizes PROFIT as the prospect\'s word', () => {
    expect(a.ranked[0]!.event.exact_text.toLowerCase()).toBe('profit');
    expect(a.ranked[0]!.event.provenance).toBe('prospect_said');
    expect(a.ranked[0]!.event.correction_or_negation?.rejects).toBe('revenue');
  });
  it('marks revenue as rejected and keeps it out of the pins', () => {
    const revenue = a.events.find((e) => e.normalized_key === 'revenue');
    expect(revenue?.rejected_by).toBe('profit');
    expect(a.ranked.some((r) => r.event.normalized_key === 'revenue')).toBe(false);
    expect(correctionLines(a.events).map((c) => c.line)).toContain('PROFIT, rejected: revenue');
  });
  it('retains the net-not-gross correction and surfaces the "ask what costs are included" cue', () => {
    const net = a.events.find((e) => e.normalized_key === 'net');
    expect(net?.correction_or_negation?.rejects).toBe('gross');
    expect(net?.cue).toContain('ask what costs are included');
    expect(a.ranked.slice(0, 2).map((r) => r.event.normalized_key)).toEqual(['profit', 'net']);
    const review = postCallReview(A.turns);
    expect(review.better_question.toLowerCase()).toContain('net');
  });
  it('derives the side facts', () => {
    const facts = Object.fromEntries(a.facts.map((f) => [f.key, f.value]));
    expect(facts['{prospect_name}']).toBe('Dana Whitlock');
    expect(facts['{dealership_name}']).toBe('Riverbend Motors');
    expect(facts['{their_word}']).toBe('Profit');
    expect(facts['{reconnect_window}']).toContain('Thursday');
    expect(extractFacts(a.turns).find((f) => f.key === '{prospect_name}')?.status).toBe('observed');
  });
});

describe('scenario 2 — the representative says profit; the prospect emphasizes staff time', () => {
  const b = analyzeCall(B.turns);
  it('classifies profit as seller_only with four representative mentions and zero prospect mentions', () => {
    const profit = b.events.find((e) => e.normalized_key === 'profit');
    expect(profit?.provenance).toBe('seller_only');
    expect(profit?.repetition_by_speaker).toEqual({ representative: 4, prospect: 0 });
    expect(provenanceLabel(profit!)).toBe('seller only: not pinned');
  });
  it('never promotes profit into the top pins; staff time is the pin', () => {
    expect(b.ranked.some((r) => r.event.normalized_key === 'profit')).toBe(false);
    expect(b.ranked[0]!.event.normalized_key).toBe('staff time');
    const { pinned } = resolvePins(EMPTY_PIN_STATE, b.ranked);
    expect(pinned.map((p) => p.event.normalized_key)).toContain('staff time');
    expect(pinned.map((p) => p.event.normalized_key)).not.toContain('profit');
  });
  it('the review names the correction from the wrong speaker', () => {
    const review = postCallReview(B.turns);
    expect(review.correction.text).toContain('"profit"');
    expect(review.correction.text).toContain('"staff time"');
    expect(review.correction.quote_turn_id).toBe('syn-b-staff-time-u03');
  });
});

describe('scenario 32 — efficiency proposed by the seller and confirmed by the prospect', () => {
  const c = analyzeCall(C.turns);
  it('is labelled confirmed shared term, never "prospect said"', () => {
    const eff = c.events.find((e) => e.normalized_key === 'efficiency');
    expect(eff?.provenance).toBe('seller_proposed_prospect_confirmed');
    expect(eff?.source_role).toBe('representative');
    expect(provenanceLabel(eff!)).toContain('confirmed shared term');
    expect(provenanceLabel(eff!)).not.toBe('prospect said');
    expect(c.ranked[0]!.event.normalized_key).toBe('efficiency');
    expect(c.facts.find((f) => f.key === '{stated_goal}')).toBeUndefined();
  });
});

describe('scenario 33 — gratification keeps its own definition', () => {
  const d = analyzeCall(D.turns);
  const grat = d.events.find((e) => e.normalized_key === 'gratification')!;
  it('records the prospect\'s definition and ranks it first', () => {
    expect(grat.meaning_status).toBe('explained');
    expect(grat.meaning).toContain('real reply');
    expect(d.ranked[0]!.event.normalized_key).toBe('gratification');
  });
  it('refuses a seller or model synonym; keeps human corrections beside the original', () => {
    const rep = applyMeaning(grat, { text: 'satisfaction', by: 'representative' });
    expect(rep.applied).toBe(false);
    expect(rep.event.meaning).toBe(grat.meaning);
    const model = applyMeaning(grat, { text: 'satisfaction', by: 'model' });
    expect(model.applied).toBe(false);
    const human = applyMeaning(grat, { text: 'weekend leads answered by Monday', by: 'rep_correction' }, '2026-09-10T00:00:00Z');
    expect(human.applied).toBe(true);
    expect(human.event.meaning).toBe(grat.meaning);
    expect(human.event.user_edits?.meaning).toBe('weekend leads answered by Monday');
  });
  it('satisfaction (seller-introduced, then contrasted by the prospect) stays seller_only', () => {
    const sat = d.events.find((e) => e.normalized_key === 'satisfaction');
    expect(sat?.provenance).toBe('seller_only');
    expect(d.ranked.some((r) => r.event.normalized_key === 'satisfaction')).toBe(false);
  });
});

describe('scenarios 13/14 — revision, duplicates and out-of-order provider events', () => {
  it('applyRevision reports the superseded utterance and the profit → Prophet change', () => {
    const { events } = dedupeEvents(G.turns);
    const rev = applyRevision(events);
    expect(rev.superseded_utterance_ids).toContain('syn-g-profit-prophet-revision-u04');
    expect(rev.revisions).toHaveLength(1);
    expect(rev.revisions[0]!.from_text).toContain('profit');
    expect(rev.revisions[0]!.to_text).toContain('Prophet');
    expect(rev.latest.filter((e) => e.utterance_id === 'syn-g-profit-prophet-revision-u04')).toHaveLength(1);
  });
  it('invalidates the provisional "profit" meaning and drops it from pins until clarified', () => {
    const g = analyzeCall(G.turns);
    const profit = g.events.find((e) => e.normalized_key === 'profit');
    expect(profit?.meaning_status).toBe('invalidated');
    expect(profit?.invalidation?.now_reads).toContain('Prophet');
    expect(profit?.cue).toContain('clarify');
    expect(g.ranked.some((r) => r.event.normalized_key === 'profit')).toBe(false);
    expect(g.excluded.find((r) => r.event.normalized_key === 'profit')?.exclusion).toContain('revision');
    const clarified = analyzeCall(G.turns, { clarified: [profit!.id] });
    const again = clarified.events.find((e) => e.normalized_key === 'profit');
    expect(again?.meaning_status).toBe('asked');
    expect(again?.meaning).toBeUndefined();
    expect(clarified.ranked.some((r) => r.event.normalized_key === 'profit')).toBe(true);
  });
  it('a duplicated partial/final callback does not duplicate words or counts', () => {
    const n = normalizeTranscript(G.turns);
    expect(n.dropped.map((d) => d.reason).sort()).toEqual(['duplicate_compound_key', 'duplicate_event_key']);
    expect(new Set(n.turns.map((t) => t.utterance_id)).size).toBe(n.turns.length);
    expect(n.turns).toHaveLength(12);
    const prophet = analyzeCall(G.turns).events.find((e) => e.normalized_key === 'prophet');
    expect(prophet?.repetition_by_speaker?.prospect).toBe(2);
    // Feeding every event twice changes nothing.
    const once = analyzeCall(A.turns);
    const twice = analyzeCall([...A.turns, ...A.turns]);
    expect(twice.turns.map((t) => t.utterance_id)).toEqual(once.turns.map((t) => t.utterance_id));
    expect(twice.events.map((e) => [e.id, e.repetition_count])).toEqual(once.events.map((e) => [e.id, e.repetition_count]));
  });
  it('out-of-order arrival never regresses order or double counts', () => {
    const shuffled = [...A.turns].reverse();
    const ordered = analyzeCall(A.turns);
    const fromShuffled = analyzeCall(shuffled);
    expect(fromShuffled.turns.map((t) => t.utterance_id)).toEqual(ordered.turns.map((t) => t.utterance_id));
    expect(fromShuffled.ranked.map((r) => r.event.id)).toEqual(ordered.ranked.map((r) => r.event.id));
    expect(checkTrackOrder(shuffled).ok).toBe(true);
    // Call G's array order is scrambled across tracks on purpose; display order follows timestamps.
    const g = normalizeTranscript(G.turns);
    const starts = g.turns.map((t) => Date.parse(t.started_at));
    expect([...starts].sort((x, y) => x - y)).toEqual(starts);
  });
});

describe('interim text is never a confirmed quote', () => {
  const partialIndex = G.turns.findIndex((e) => !e.is_final);
  const upToPartial = G.turns.slice(0, partialIndex + 1);
  it('an interim turn cannot be confirmed; a final one can', () => {
    const n = normalizeTranscript(upToPartial);
    const interim = n.turns.find((t) => t.utterance_id === 'syn-g-profit-prophet-revision-u04')!;
    expect(interim.stability).toBe('interim');
    expect(confirmQuote(interim)).toBeNull();
    const final = n.turns.find((t) => t.is_final)!;
    expect(confirmQuote(final)?.stability).toBe('final');
  });
  it('interim candidates are provisional and excluded from pins', () => {
    const a = analyzeCall(upToPartial);
    const prof = a.events.find((e) => e.normalized_key === 'prof');
    if (prof) {
      expect(prof.stability).toBe('interim');
      expect(confirmQuote(prof)).toBeNull();
      expect(a.ranked.some((r) => r.event.id === prof.id)).toBe(false);
      expect(provenanceLabel(prof)).toContain('provisional');
    }
    for (const r of a.ranked) expect(r.event.stability).toBe('final');
  });
});

describe('pins — 3 to 7, stable slots, overflow', () => {
  function fakeRanked(n: number): RankedCandidate[] {
    return Array.from({ length: n }, (_, i) => ({
      event: {
        id: `x:${i}`,
        call_id: 'x',
        exact_text: `term ${i}`,
        speaker_role: 'prospect' as const,
        turn_id: `u${i}`,
        span: { start: 0, end: 1 },
        revision: 0,
        stability: 'final' as const,
        meaning_status: 'unknown' as const,
        first_seen_turn: `u${i}`,
        last_seen_turn: `u${i}`,
        repetition_count: 1,
        explicit_emphasis: false,
        provenance: 'prospect_said' as const,
        source_role: 'prospect' as const,
        pinned: false,
      },
      score: 10 - i,
      reasons: [],
      eligible: true,
    }));
  }
  it('auto-fills at least three when available and refuses an eighth manual pin', () => {
    const a = analyzeCall(A.turns);
    const { pinned } = resolvePins(EMPTY_PIN_STATE, a.ranked);
    expect(pinned.length).toBeGreaterThanOrEqual(PIN_MIN);
    expect(pinned.length).toBeLessThanOrEqual(PIN_MAX);
    let state = resolvePins(EMPTY_PIN_STATE, fakeRanked(9)).state;
    for (const id of ['x:5', 'x:6']) {
      const r = pinPhrase(state, id);
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(state.order).toHaveLength(PIN_MAX);
    const eighth = pinPhrase(state, 'x:7');
    expect(eighth.ok).toBe(false);
    expect(eighth.reason).toContain('7');
    const resolved = resolvePins(state, fakeRanked(9));
    expect(resolved.pinned).toHaveLength(PIN_MAX);
    expect(resolved.overflow.map((o) => o.event.id)).toEqual(['x:7', 'x:8']);
  });
  it('fewer candidates → fewer pins, no padding', () => {
    const { pinned } = resolvePins(EMPTY_PIN_STATE, fakeRanked(2));
    expect(pinned).toHaveLength(2);
  });
  it('a pinned item keeps its slot while new evidence arrives; unpinned items are never re-pinned', () => {
    const early = analyzeCall(A.turns.slice(0, 8)); // through "Profit, not revenue."
    const first = resolvePins(EMPTY_PIN_STATE, early.ranked);
    expect(first.state.order[0]).toBe(`${A.call_id}:profit`);
    const manual = pinPhrase(first.state, `${A.call_id}:profit`).state;
    const late = analyzeCall(A.turns);
    const second = resolvePins(manual, late.ranked);
    for (const [i, id] of first.state.order.entries()) expect(second.state.order[i]).toBe(id);
    expect(second.state.order).toContain(`${A.call_id}:net`);
    const un = unpinPhrase(second.state, `${A.call_id}:net`);
    expect(un.ok).toBe(true);
    const third = resolvePins(un.state, late.ranked);
    expect(third.state.order).not.toContain(`${A.call_id}:net`);
    expect(third.overflow.map((o) => o.event.id)).toContain(`${A.call_id}:net`);
    const back = pinPhrase(third.state, `${A.call_id}:net`);
    expect(back.ok).toBe(true);
    expect(resolvePins(back.state, late.ranked).state.order).toContain(`${A.call_id}:net`);
  });
});

describe('quoted-other and rejected terms never top-ranked; analogies are observations', () => {
  it('call F: revenue rejected, another owner\'s goal quoted, retention is the priority', () => {
    const f = analyzeCall(F.turns);
    expect(f.ranked[0]!.event.normalized_key).toBe('retention');
    const revenue = f.events.find((e) => e.normalized_key === 'revenue');
    expect(revenue?.rejected_by).toBe('negation');
    const other = f.events.find((e) => e.normalized_key === 'doubling volume');
    expect(other?.attribution).toBe('quoted_other');
    expect(provenanceLabel(other!)).toContain('quoted someone else');
    for (const r of f.ranked) {
      expect(r.event.rejected_by).toBeUndefined();
      expect(r.event.attribution).not.toBe('quoted_other');
    }
  });
  it('call E: basketball is a tentative lens, never an archetype', () => {
    const e = analyzeCall(E.turns);
    expect(e.lenses).toHaveLength(1);
    expect(e.lenses[0]!.label).toBe('basketball analogy preferred/observed');
    expect(e.lenses[0]!.status).toBe('hypothesis');
    expect(e.lenses[0]!.evidence_strength).toBe('strong');
    expect(e.lenses[0]!.supporting_event_ids).toHaveLength(3);
    expect(JSON.stringify(e.lenses)).not.toMatch(/archetype|approval|personality/i);
  });
  it('call H: opt-out is detected and the outcome is do-not-call', () => {
    const h = analyzeCall(H.turns);
    expect(h.opt_out?.turn_id).toBe('syn-h-opt-out-u04');
    const review = postCallReview(H.turns);
    expect(review.next_step_or_outcome).toMatch(/do not call/i);
    expect(review.strength.quote_turn_id).toBe('syn-h-opt-out-u05');
    expect(review.strength.text).toMatch(/no reframe/);
  });
});

describe('post-call review and definitions', () => {
  it('every review has tone "not assessed (text-only)" and the §14 shape', () => {
    for (const t of seed.transcripts) {
      const r = postCallReview(t, [{ id: 'n', stage: 'intent', required_context: ['{stated_goal}'] }]);
      expect(r.tone).toBe('not assessed (text-only)');
      expect(typeof r.strength.text).toBe('string');
      expect(typeof r.correction.text).toBe('string');
      expect(r.better_question.length).toBeGreaterThan(0);
      expect(r.drill.length).toBeGreaterThan(0);
      expect(r.next_step_or_outcome.length).toBeGreaterThan(0);
      expect(r.uncertainties.length).toBeGreaterThan(0);
      expect(JSON.stringify(r)).not.toMatch(/distress|emotion score|tonality score/i);
    }
  });
  it('a missing-field correction quotes the last question the representative asked, never the closing prospect turn', () => {
    // Call C never states a problem; a node requiring {stated_problem} makes that the correction.
    const r = postCallReview(C.turns, [{ id: 'n', stage: 'intent', required_context: ['{stated_problem}'] }]);
    expect(r.correction.text).toMatch(/^Critical field not established: stated problem\./);
    const finals = C.turns.filter((t) => t.is_final);
    const lastRepQuestion = [...finals].reverse().find((t) => t.speaker_role === 'representative' && t.text.includes('?'));
    expect(r.correction.quote_turn_id).toBe(lastRepQuestion!.utterance_id);
    expect(r.correction.quote_turn_id).not.toBe(finals[finals.length - 1]!.utterance_id);
    // Every missing-field correction across the seed quotes a representative question (or nothing).
    for (const t of seed.transcripts) {
      const rev = postCallReview(t, [{ id: 'n', stage: 'intent', required_context: ['{stated_problem}'] }]);
      if (!rev.correction.text.startsWith('Critical field not established')) continue;
      if (rev.correction.quote_turn_id === null) {
        expect(rev.correction.text).toContain('No question asked for it');
        continue;
      }
      const quoted = t.turns.find((x) => x.utterance_id === rev.correction.quote_turn_id);
      expect(quoted?.speaker_role).toBe('representative');
      expect(quoted?.text).toContain('?');
    }
  });
  it('a strength cites an evidence turn (mirror after a vague answer in call A)', () => {
    const r = postCallReview(A.turns);
    expect(r.strength.quote_turn_id).toBe('syn-a-profit-not-revenue-u05');
    expect(r.strength.text).toContain('Uneven');
  });
  it('rubric is labelled internal and not validated, sums to 100, with automatic fails', () => {
    const rubric = rubricDefinition();
    expect(rubric.label).toBe('internal training rubric, not validated');
    expect(rubric.criteria.reduce((s, c) => s + c.weight, 0)).toBe(100);
    expect(rubric.automatic_fail).toContain('explicit opt-out violation');
  });
  it('funnel stages each state a numerator and a denominator', () => {
    const funnel = funnelDefinitions();
    expect(funnel).toHaveLength(9);
    for (const s of funnel) {
      expect(s.numerator.length).toBeGreaterThan(0);
      expect(s.denominator.length).toBeGreaterThan(0);
    }
  });
});

describe('normalization primitives', () => {
  it('dedupeEvents keeps the final when a partial shares the compound key', () => {
    const base = A.turns[1]!;
    const partial: TranscriptTurn = { ...base, is_final: false, text: 'This is Dana', provider_event_key: 'p1', ended_at: null };
    const final: TranscriptTurn = { ...base, provider_event_key: 'p2' };
    const { events, dropped } = dedupeEvents([partial, final]);
    expect(events).toHaveLength(1);
    expect(events[0]!.is_final).toBe(true);
    expect(dropped).toEqual([]);
  });
});
