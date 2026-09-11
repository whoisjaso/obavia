import { describe, expect, it } from 'vitest';
import type { Attempt, SessionHistoryEntry } from '../src/schemas/dialer';
import { DISPOSITION_GLYPHS, PIPELINE_LANES, groupByLane, laneForDisposition, pipelineCardsFromHistory } from '../src/vocabulary/crm';
import { outcomeGlyph } from '../src/vocabulary/review';

function attempt(n: number, kind: Attempt['disposition'] extends infer D ? (D extends { kind: infer K } ? K : never) : never, extra: Partial<Attempt> = {}): Attempt {
  return {
    id: `a-${n}`,
    n,
    item_id: `q-${n}`,
    phone: `+1555010000${n}`,
    contact: `Contact ${n}`,
    company: `Company ${n}`,
    started_at: `2026-09-11T10:0${n}:00.000Z`,
    status: 'done',
    dial_result: kind === 'no_answer' ? 'no_answer' : 'connected',
    connected_at: null,
    ended_at: `2026-09-11T10:0${n}:30.000Z`,
    talk_ms: 0,
    disposition: { kind, at: `2026-09-11T10:0${n}:40.000Z` },
    transcript_id: kind === 'no_answer' ? null : 'syn-a-profit-not-revenue',
    skip_reasons: [],
    ...extra,
  };
}

const session: SessionHistoryEntry = {
  id: 's-1',
  mode: 'demo',
  started_at: '2026-09-11T10:00:00.000Z',
  ended_at: '2026-09-11T10:10:00.000Z',
  ended_reason: 'user',
  stats: { dials: 4, connects: 3, talked: 2, next_steps: 2, talk_ms: 0, session_ms: 600000 },
  attempts: [
    attempt(1, 'callback', { disposition: { kind: 'callback', at: '2026-09-11T10:01:40.000Z', callback_at: '2026-09-12T15:00:00.000Z' } }),
    attempt(2, 'meeting'),
    attempt(3, 'no_answer'),
    attempt(4, 'do_not_call'),
    // undispositioned (e.g. session ended mid-call) and skipped entries are not cards
    { ...attempt(5, 'talked'), disposition: null },
    { ...attempt(6, 'talked'), n: 0, status: 'skipped', dial_result: null },
  ],
};

describe('dispositions → pipeline lanes (M-queue additive)', () => {
  it('maps every disposition kind to a lane that exists, without inventing budget/authority/implementation', () => {
    const lanes = new Set(PIPELINE_LANES.map((l) => l.key));
    for (const kind of Object.keys(DISPOSITION_GLYPHS) as (keyof typeof DISPOSITION_GLYPHS)[]) {
      expect(lanes.has(laneForDisposition(kind))).toBe(true);
      expect(['budget', 'authority', 'implementation']).not.toContain(laneForDisposition(kind));
    }
    expect(laneForDisposition('callback')).toBe('agreed_follow_up');
    expect(laneForDisposition('talked')).toBe('deferral');
    expect(laneForDisposition('voicemail')).toBe('no_contact');
    expect(laneForDisposition('do_not_call')).toBe('do_not_call');
  });

  it('builds one card per dispositioned dial, newest first, keeping the callback time; skips and undispositioned attempts are not cards', () => {
    const cards = pipelineCardsFromHistory([session]);
    expect(cards.map((c) => c.attempt_id)).toEqual(['a-4', 'a-3', 'a-2', 'a-1']);
    expect(cards.find((c) => c.attempt_id === 'a-1')).toMatchObject({ lane: 'agreed_follow_up', when: '2026-09-12T15:00:00.000Z', transcript_id: 'syn-a-profit-not-revenue', mode: 'demo' });
    expect(cards.find((c) => c.attempt_id === 'a-3')).toMatchObject({ lane: 'no_contact', when: null, transcript_id: null });
    const grouped = groupByLane(cards);
    expect(grouped.map((g) => g.lane.key)).toEqual(PIPELINE_LANES.map((l) => l.key));
    expect(grouped.find((g) => g.lane.key === 'agreed_follow_up')?.cards).toHaveLength(2);
    expect(grouped.find((g) => g.lane.key === 'budget')?.cards).toHaveLength(0);
  });

  it('every glyph carries a full accessible name, and the outcome glyph never claims more than the label', () => {
    for (const g of Object.values(DISPOSITION_GLYPHS)) expect(g.name.length).toBeGreaterThan(g.word.length + 5);
    expect(outcomeGlyph('do_not_call')).toMatchObject({ glyph: '⊘', word: 'DNC' });
    expect(outcomeGlyph('agreed_follow_up').name).toContain("prospect's own words");
    expect(outcomeGlyph('no_agreed_next_step').glyph).toBe('○');
  });
});
