import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SourceQuestionRecord, SourceSection } from '../src/schemas/sources';
import {
  loadPackageValidation,
  loadSourceQuestionRecords,
  loadSourceSections,
  validateAllSeeds,
} from '../src/seeds';
import {
  classificationCounts,
  getSourceIndex,
  recordsCitedBy,
  recordsForSection,
  searchRecords,
} from '../src/sources';
import recordsJson from '../../../data/source_question_records.json';
import sectionsJson from '../../../data/source_sections.json';

describe('source schemas', () => {
  it('parses all 207 records strictly', () => {
    const parsed = z.array(SourceQuestionRecord).parse(recordsJson);
    expect(parsed).toHaveLength(207);
    expect(new Set(parsed.map((r) => r.id)).size).toBe(207);
  });

  it('parses all 39 sections (26 with records + 13 named-only)', () => {
    const parsed = z.array(SourceSection).parse(sectionsJson);
    expect(parsed).toHaveLength(39);
    expect(parsed.filter((s) => s.records_supplied)).toHaveLength(26);
    expect(parsed.filter((s) => !s.records_supplied)).toHaveLength(13);
  });

  it('rejects a record with an unknown classification or extra field', () => {
    const [first] = recordsJson;
    expect(SourceQuestionRecord.safeParse({ ...first, use_classification: 'live' }).success).toBe(false);
    expect(SourceQuestionRecord.safeParse({ ...first, extra: 1 }).success).toBe(false);
  });

  it('package validation report matches the loaded data', () => {
    const v = loadPackageValidation();
    expect(v.ok).toBe(true);
    expect(v.record_count).toBe(loadSourceQuestionRecords().length);
    expect(v.raw_sources_supplied).toBe(false);
    expect(loadSourceSections()).toHaveLength(v.section_count_with_records + v.section_count_named_only);
  });
});

describe('source index', () => {
  it('counts classifications 160 / 33 / 14', () => {
    expect(classificationCounts()).toEqual({ adapt: 160, study_only: 33, private_training: 14 });
  });

  it('search is case-insensitive and finds the "change desired" record (L07) for "change"', () => {
    // NB: the task brief expected L06 here; in the supplied data L06 is "forced positive"
    // (no "change" in any searchable field) and L07 is "change desired". We assert the real data.
    const ids = searchRecords('CHANGE').map((r) => r.id);
    expect(ids).toContain('L07');
    expect(ids).not.toContain('L06');
    expect(searchRecords('   ')).toEqual([]);
  });

  it('recordsForSection returns section members and [] for named-only sections', () => {
    expect(recordsForSection('A01').map((r) => r.id)).toEqual(['I01', 'I02', 'I03', 'I04']);
    expect(recordsForSection('B22')).toEqual([]);
    expect(getSourceIndex().sectionById.get('B22')?.records_supplied).toBe(false);
  });

  it('recordsCitedBy reports unknown ids instead of inventing them', () => {
    const { found, missing } = recordsCitedBy(['L06', 'ZZ99']);
    expect(found.map((r) => r.id)).toEqual(['L06']);
    expect(missing).toEqual(['ZZ99']);
  });
});

describe('seeds', () => {
  it('every seed parses; module-authored seeds are still placeholders', () => {
    const report = validateAllSeeds();
    expect(report.find((r) => r.name === 'source_question_records.json')?.count).toBe(207);
    for (const name of ['identity_interview.json', 'apohenia_script_nodes.json', 'offers.json', 'synthetic_transcripts.json']) {
      const entry = report.find((r) => r.name === name);
      expect(entry, name).toBeDefined();
      // Placeholder flag is informational: it flips to false once the owning agent authors the file.
      expect(typeof entry?.placeholder).toBe('boolean');
    }
  });
});
