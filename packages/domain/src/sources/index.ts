/**
 * Source Library index — owning module agent: M-sources (extend here; do not rewrite shared schemas).
 *
 * Loads the curated study records and sections, indexes them, and offers a simple
 * case-insensitive search. Everything here is STUDY material; nothing is live approval.
 */
import type { SourceQuestionRecord, SourceSection, UseClassification } from '../schemas/sources';
import { loadSourceQuestionRecords, loadSourceSections } from '../seeds';

export const MODULE = 'sources' as const;

export interface SourceIndex {
  records: readonly SourceQuestionRecord[];
  sections: readonly SourceSection[];
  byId: ReadonlyMap<string, SourceQuestionRecord>;
  bySection: ReadonlyMap<string, readonly SourceQuestionRecord[]>;
  byFamily: ReadonlyMap<string, readonly SourceQuestionRecord[]>;
  byClassification: ReadonlyMap<UseClassification, readonly SourceQuestionRecord[]>;
  sectionById: ReadonlyMap<string, SourceSection>;
}

function groupBy<K>(
  records: readonly SourceQuestionRecord[],
  key: (r: SourceQuestionRecord) => K,
): ReadonlyMap<K, readonly SourceQuestionRecord[]> {
  const map = new Map<K, SourceQuestionRecord[]>();
  for (const r of records) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

/** Build an index from explicit inputs (useful in tests). */
export function buildSourceIndex(
  records: readonly SourceQuestionRecord[],
  sections: readonly SourceSection[],
): SourceIndex {
  return {
    records,
    sections,
    byId: new Map(records.map((r) => [r.id, r])),
    bySection: groupBy(records, (r) => r.section_id),
    byFamily: groupBy(records, (r) => r.family),
    byClassification: groupBy(records, (r) => r.use_classification),
    sectionById: new Map(sections.map((s) => [s.id, s])),
  };
}

let cached: SourceIndex | undefined;

/** Index over the seeded 207 records / 39 sections. Parsed once per process. */
export function getSourceIndex(): SourceIndex {
  if (!cached) cached = buildSourceIndex(loadSourceQuestionRecords(), loadSourceSections());
  return cached;
}

/** Case-insensitive substring search over template, purpose and excerpt. Returns records in seed order. */
export function searchRecords(query: string, index: SourceIndex = getSourceIndex()): SourceQuestionRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  return index.records.filter(
    (r) =>
      r.template.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q) ||
      r.excerpt.toLowerCase().includes(q),
  );
}

/** Records belonging to a section (empty for named-only sections). */
export function recordsForSection(sectionId: string, index: SourceIndex = getSourceIndex()): SourceQuestionRecord[] {
  return [...(index.bySection.get(sectionId) ?? [])];
}

/** Resolve a list of record ids (e.g. a script node's source_question_ids). Unknown ids are reported, not invented. */
export function recordsCitedBy(
  ids: readonly string[],
  index: SourceIndex = getSourceIndex(),
): { found: SourceQuestionRecord[]; missing: string[] } {
  const found: SourceQuestionRecord[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const r = index.byId.get(id);
    if (r) found.push(r);
    else missing.push(id);
  }
  return { found, missing };
}

/** Count of records per classification (adapt / study_only / private_training). */
export function classificationCounts(index: SourceIndex = getSourceIndex()): Record<UseClassification, number> {
  return {
    adapt: index.byClassification.get('adapt')?.length ?? 0,
    study_only: index.byClassification.get('study_only')?.length ?? 0,
    private_training: index.byClassification.get('private_training')?.length ?? 0,
  };
}
