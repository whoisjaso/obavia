import { describe, expect, it } from 'vitest';
import { MissingResourceRegister, type ScriptNode, type SourceQuestionRecord } from '../src/schemas';
import { loadScriptNodes } from '../src/seeds';
import {
  CLASSIFICATION_DEFINITIONS,
  DELIVERY_OVERLAY_TABLE,
  TIMESTAMP_PATTERN,
  VERIFY_COMMAND,
  classificationCounts,
  containsTimestampPattern,
  counterpartsFor,
  coverageReport,
  deliveryCueNote,
  excerptLabel,
  facets,
  familyLabel,
  filterSourceRows,
  formatOffsets,
  getSourceIndex,
  isLiveEligibleForCitation,
  listMissingResources,
  loadMissingResourceRegister,
  neighbours,
  ownScriptCounterparts,
  searchRecords,
  searchSources,
  sectionsForSource,
  splitBySource,
  toSourceRow,
} from '../src/sources';
import missingJson from '../../../data/source_missing_resources.json';

const index = getSourceIndex();

describe('facets', () => {
  it('counts A 144 / B 63, 160/33/14, every family and every section (named-only at 0)', () => {
    const f = facets();
    expect(f.bySource).toEqual({ A: 144, B: 63 });
    expect(f.byClassification).toEqual({ adapt: 160, study_only: 33, private_training: 14 });
    expect(Object.values(f.byFamily).reduce((a, b) => a + b, 0)).toBe(207);
    expect(f.byFamily.V).toBe(48);
    expect(f.byFamily.O).toBe(31);
    expect(Object.keys(f.byFamily)).toEqual(['I', 'L', 'S', 'E', 'F', 'C', 'P', 'M', 'O', 'U', 'R', 'X', 'Y', 'V', 'D', 'T']);
    expect(Object.keys(f.bySection)).toHaveLength(39);
    expect(f.bySection.A13).toBe(48);
    expect(f.bySection.B22).toBe(0);
    expect(f.bySection.A08).toBe(0);
    expect(f.byDelivery.not_audio_verified).toBe(48);
    expect(Object.values(f.byDelivery).reduce((a, b) => a + b, 0)).toBe(207);
  });

  it('facets over a subset count only that subset', () => {
    const subset = index.records.filter((r) => r.family === 'D');
    const f = facets(subset);
    expect(f.byFamily).toEqual({ D: 13 });
    expect(f.byClassification).toEqual({ adapt: 0, study_only: 8, private_training: 5 });
    expect(f.bySource.A + f.bySource.B).toBe(13);
  });
});

describe('filtered search', () => {
  it('empty filters return every record in seed order; A and B can be split without merging', () => {
    const all = searchSources({});
    expect(all).toHaveLength(207);
    expect(all.map((r) => r.id)).toEqual(index.records.map((r) => r.id));
    const split = splitBySource(all);
    expect(split.A).toHaveLength(144);
    expect(split.B).toHaveLength(63);
    expect(split.A.every((r) => r.source === 'A')).toBe(true);
  });

  it('filters by source, family, section, classification and delivery', () => {
    expect(searchSources({ source: 'B' })).toHaveLength(63);
    expect(searchSources({ family: 'L' })).toHaveLength(14);
    expect(searchSources({ section: 'A01' }).map((r) => r.id)).toEqual(['I01', 'I02', 'I03', 'I04']);
    expect(searchSources({ classification: 'study_only' })).toHaveLength(33);
    expect(searchSources({ source: 'A', classification: 'study_only' })).toHaveLength(21);
    expect(searchSources({ source: 'B', classification: 'study_only' })).toHaveLength(12);
    expect(searchSources({ delivery: 'not_audio_verified' }).every((r) => r.family === 'V')).toBe(true);
    expect(searchSources({ section: 'B22' })).toEqual([]);
  });

  it('query is case-insensitive over id, title, template, purpose and excerpt and combines with filters', () => {
    const ids = searchSources({ query: 'CHANGE' }).map((r) => r.id);
    expect(ids).toContain('L07');
    expect(searchSources({ query: 'l07' }).map((r) => r.id)).toContain('L07');
    expect(searchSources({ query: 'change', family: 'L' }).every((r) => r.family === 'L')).toBe(true);
    expect(searchSources({ query: 'zzzz-no-such-text' })).toEqual([]);
    // Skeleton search behaviour is unchanged.
    expect(searchRecords('   ')).toEqual([]);
  });

  it('filterSourceRows works on slim rows (no excerpt) exactly as the UI uses it', () => {
    const rows = index.records.map(toSourceRow);
    expect(rows[0]).not.toHaveProperty('excerpt');
    expect(filterSourceRows(rows, { classification: 'study_only' })).toHaveLength(33);
    expect(filterSourceRows(rows, { query: 'million a week' }).map((r) => r.id)).toEqual(['D01']);
  });

  it('sectionsForSource lists 13 A sections and 26 B sections in id order, with the named-only flag', () => {
    const a = sectionsForSource('A');
    const b = sectionsForSource('B');
    expect(a).toHaveLength(13);
    expect(b).toHaveLength(26);
    expect(a.map((s) => s.id)).toEqual([...a.map((s) => s.id)].sort());
    expect(a.filter((s) => !s.records_supplied).map((s) => s.id)).toEqual(['A08']);
    expect(b.filter((s) => !s.records_supplied).map((s) => s.id)).toEqual([
      'B00', 'B01', 'B02', 'B06', 'B12', 'B13', 'B14', 'B15', 'B16', 'B22', 'B23', 'B25',
    ]);
  });

  it('neighbours walks the seed order and returns null at the ends', () => {
    const first = index.records[0]!;
    const last = index.records[index.records.length - 1]!;
    expect(neighbours(first.id).prev).toBeNull();
    expect(neighbours(last.id).next).toBeNull();
    expect(neighbours('L07').prev?.id).toBe('L06');
    expect(neighbours('L07').next?.id).toBe('L08');
    expect(neighbours('ZZ99')).toEqual({ prev: null, next: null });
  });
});

describe('named-but-missing register', () => {
  it('validates against the schema, has no placeholder marker, and every handling says marked missing — not reconstructed', () => {
    expect(MissingResourceRegister.safeParse(missingJson).success).toBe(true);
    expect(missingJson).not.toHaveProperty('_status');
    const list = listMissingResources();
    expect(list.length).toBeGreaterThanOrEqual(10);
    for (const m of list) expect(m.handling).toContain('marked missing — not reconstructed');
    expect(new Set(list.map((m) => m.id)).size).toBe(list.length);
    expect(loadMissingResourceRegister().resources).toEqual(list);
  });

  it('contains the raw sources, the four-frame fear set and the other named gaps', () => {
    const ids = listMissingResources().map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'raw_source_a',
        'raw_source_b',
        'punctuation_audit_1449',
        'package_validation_report_original',
        'four_frame_fear_set',
        'screen_only_slides',
        'video_timestamps',
        'speaker_diarization',
        'named_only_sections',
        'narrator_10000_paid_in_full',
        'section_count_41_vs_39',
      ]),
    );
    const fear = listMissingResources().find((m) => m.id === 'four_frame_fear_set')!;
    for (const name of ['island', "what's riskier", 'fat person', '$4,000']) expect(fear.name).toContain(name);
    expect(fear.what_is_supplied).toMatch(/two/i);
    const named = listMissingResources().find((m) => m.id === 'named_only_sections')!;
    for (const id of coverageReport().named_only_section_ids) expect(named.name).toContain(id);
  });
});

describe('classification, labels and delivery notes', () => {
  it('isLiveEligibleForCitation is true only for adapt', () => {
    expect(isLiveEligibleForCitation({ use_classification: 'adapt' })).toBe(true);
    expect(isLiveEligibleForCitation({ use_classification: 'study_only' })).toBe(false);
    expect(isLiveEligibleForCitation({ use_classification: 'private_training' })).toBe(false);
    expect(index.records.filter(isLiveEligibleForCitation)).toHaveLength(160);
    expect(isLiveEligibleForCitation(index.byId.get('D01')!)).toBe(false);
    expect(isLiveEligibleForCitation(index.byId.get('L07')!)).toBe(true);
  });

  it('familyLabel covers every family in the data and falls back to the letter', () => {
    const expected: Record<string, string> = {
      I: 'Intent',
      L: 'Logical certainty',
      S: 'Setter transition',
      E: 'Decision history',
      F: 'Future',
      C: 'Consequence',
      P: 'Pitch / commitment',
      M: 'Mirror',
      O: 'Objection',
      D: 'Identity / status / needs (study)',
      T: 'Training (private)',
      U: 'Follow-up',
      R: 'Referral',
      X: 'Upsell setting',
      Y: 'Upsell closing',
      V: 'Reviewed call',
    };
    for (const [k, v] of Object.entries(expected)) expect(familyLabel(k)).toBe(v);
    for (const fam of new Set(index.records.map((r) => r.family))) expect(expected[fam], fam).toBeDefined();
    expect(familyLabel('Q')).toBe('Q');
  });

  it('deliveryCueNote says cues are instructor-described text and explains not_audio_verified', () => {
    expect(deliveryCueNote('curious')).toMatch(/instructor-described text/);
    expect(deliveryCueNote('curious')).toContain('"curious"');
    expect(deliveryCueNote('not_audio_verified')).toMatch(/reviewed call/);
    expect(deliveryCueNote('not_audio_verified')).toMatch(/no audio/i);
    expect(deliveryCueNote('training')).toMatch(/teaching or self-reflection/);
    for (const d of new Set(index.records.map((r) => r.delivery))) expect(deliveryCueNote(d).length).toBeGreaterThan(40);
  });

  it('classification definitions and labels are one line each and say adapt is not live approval', () => {
    expect(CLASSIFICATION_DEFINITIONS.adapt).toMatch(/Not live approval/);
    expect(CLASSIFICATION_DEFINITIONS.study_only).toMatch(/never a live recommendation/);
    for (const v of Object.values(CLASSIFICATION_DEFINITIONS)) expect(v).not.toContain('\n');
    expect(excerptLabel({ hash_verified: false })).toBe('Unchanged source excerpt · verification pending (raw sources not supplied)');
    expect(excerptLabel({ hash_verified: true })).toMatch(/hash verified/);
    expect(formatOffsets(index.byId.get('D01')!)).toBe('[80241, 80817)');
    expect(DELIVERY_OVERLAY_TABLE.map((r) => r.element)).toEqual(['Casual', 'Curious', 'Skeptical', 'Concern/empathy', 'Pacing']);
  });
});

describe('scenario 35 (partial): no timestamps without timing data', () => {
  it('no record template or excerpt contains an hh:mm:ss or mm:ss pattern', () => {
    const hits = index.records.filter((r) => containsTimestampPattern(r.template) || containsTimestampPattern(r.excerpt));
    expect(hits.map((r) => r.id)).toEqual([]);
    expect(coverageReport().records_with_timestamp_pattern).toEqual([]);
  });

  it('the pattern itself catches both forms', () => {
    expect(TIMESTAMP_PATTERN.test('at 01:23:45 he said')).toBe(true);
    expect(TIMESTAMP_PATTERN.test('around 12:05')).toBe(true);
    expect(TIMESTAMP_PATTERN.test('a million a month')).toBe(false);
    expect(containsTimestampPattern('ratio 3:1')).toBe(false);
  });
});

describe('own-script counterparts', () => {
  const study: SourceQuestionRecord = { ...index.byId.get('D01')! };
  const adapt: SourceQuestionRecord = { ...index.byId.get('L07')! };
  const base: Omit<ScriptNode, 'id' | 'source_question_ids' | 'practice_only'> = {
    script_version_id: 'v',
    stage: 'logical_certainty',
    role_applicability: ['setter'],
    primary_word_track: 'Own words (draft).',
    intended_answer_type: 'problem',
    required_context: [],
    sufficient_answer_examples: [],
    insufficient_answer_examples: [],
    mirror_variants: [],
    bridge_template: '',
    delivery_overlay: { tone_cue: 'curious', pacing_cue: 'even' },
    completion_criteria: '',
    branches: [],
    stop_or_skip_conditions: [],
    why_this_now: '',
    what_to_listen_for: '',
    approval: { status: 'draft' },
  };

  it('maps record id → citing nodes, flags a non-practice node that cites a non-adapt record, and handles an empty seed', () => {
    const nodes: ScriptNode[] = [
      { ...base, id: 'n-live', source_question_ids: [adapt.id, study.id] },
      { ...base, id: 'n-practice', source_question_ids: [study.id], practice_only: true },
    ];
    const map = ownScriptCounterparts(nodes);
    expect(counterpartsFor(adapt.id, map).map((c) => c.node_id)).toEqual(['n-live']);
    const studyRefs = counterpartsFor(study.id, map);
    expect(studyRefs.map((c) => c.node_id)).toEqual(['n-live', 'n-practice']);
    expect(studyRefs[0]?.citation_warning).toMatch(/study_only/);
    expect(studyRefs[1]?.citation_warning).toBeUndefined();
    expect(studyRefs[1]?.practice_only).toBe(true);
    expect(counterpartsFor('I01', map)).toEqual([]);
    expect(ownScriptCounterparts([]).size).toBe(0);
  });

  it('reads the real script seed (placeholder or authored) without inventing nodes', () => {
    const seed = loadScriptNodes();
    const map = ownScriptCounterparts();
    const cited = new Set(seed.nodes.flatMap((n) => n.source_question_ids));
    expect(map.size).toBe(cited.size);
    for (const [id, refs] of map) {
      expect(cited.has(id)).toBe(true);
      for (const ref of refs) expect(seed.nodes.some((n) => n.id === ref.node_id)).toBe(true);
    }
    // No live (non-practice) node may cite a study_only / private_training record without a warning.
    for (const refs of map.values()) {
      for (const ref of refs) {
        const node = seed.nodes.find((n) => n.id === ref.node_id)!;
        const bad = node.source_question_ids.filter((id) => {
          const r = index.byId.get(id);
          return r && !isLiveEligibleForCitation(r) && node.practice_only !== true;
        });
        if (bad.length > 0) expect(refs.some((x) => x.citation_warning)).toBe(true);
      }
    }
  });
});

describe('coverage report', () => {
  it('prints the numbers SOURCE_COVERAGE.md states', () => {
    const c = coverageReport();
    expect(c.record_count).toBe(207);
    expect(c.expected_record_count).toBe(207);
    expect(c.by_classification).toEqual(classificationCounts());
    expect(c.by_classification).toEqual({ adapt: 160, study_only: 33, private_training: 14 });
    expect(c.by_source).toEqual({ A: 144, B: 63 });
    expect(c.sections_with_records).toBe(26);
    expect(c.sections_named_only).toBe(13);
    expect(c.sections_total).toBe(39);
    expect(c.brief_claims_section_count).toBe(41);
    expect(c.named_only_section_ids).toEqual(['A08', 'B00', 'B01', 'B02', 'B06', 'B12', 'B13', 'B14', 'B15', 'B16', 'B22', 'B23', 'B25']);
    expect(c.live_eligible_count).toBe(160);
    expect(c.never_live_count).toBe(47);
    expect(c.hash_verified_count).toBe(0);
    expect(c.hash_pending_count).toBe(207);
    expect(c.raw_sources_supplied).toBe(false);
    expect(c.reviewed_call_records).toBe(48);
    expect(c.families.reduce((n, f) => n + f.total, 0)).toBe(207);
    for (const f of c.families) {
      expect(f.adapt + f.study_only + f.private_training).toBe(f.total);
      expect(f.source_a + f.source_b).toBe(f.total);
    }
    expect(c.families.find((f) => f.family === 'T')).toMatchObject({ total: 6, private_training: 6, label: 'Training (private)' });
    expect(c.missing_resource_count).toBe(listMissingResources().length);
    expect(c.verify_command).toBe(VERIFY_COMMAND);
    expect(c.package_sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
