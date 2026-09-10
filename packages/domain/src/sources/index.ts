/**
 * Source Library index — owning module agent: M-sources (extend here; do not rewrite shared schemas).
 *
 * Loads the curated study records and sections, indexes them, and offers search, facets,
 * the named-but-missing register, a coverage report and the own-script counterpart lookup.
 * Everything here is STUDY material; nothing is live approval.
 *
 * Skeleton exports (buildSourceIndex, getSourceIndex, searchRecords, recordsForSection,
 * recordsCitedBy, classificationCounts) keep their original behaviour.
 */
import type { ScriptNode } from '../schemas/scripts';
import {
  type MissingResource,
  type SourceId,
  type SourceQuestionRecord,
  type SourceSection,
  type UseClassification,
} from '../schemas/sources';
import { loadMissingResourceRegister, loadPackageValidation, loadScriptNodes, loadSourceQuestionRecords, loadSourceSections } from '../seeds';
import {
  containsTimestampPattern,
  FAMILY_ORDER,
  familyLabel,
  filterSourceRows,
  isLiveEligibleForCitation,
  type SourceSearchFilters,
} from './pure';

export * from './pure';

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

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

export interface SourceFacets {
  bySource: Record<SourceId, number>;
  /** Family letter → count, in FAMILY_ORDER (families with zero records are omitted). */
  byFamily: Record<string, number>;
  /** Section id → count, including named-only sections with 0. */
  bySection: Record<string, number>;
  byClassification: Record<UseClassification, number>;
  /** Delivery cue string → count, most frequent first. */
  byDelivery: Record<string, number>;
}

function countBy<T>(items: readonly T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Facet counts over a record set (defaults to the full index). */
export function facets(records: readonly SourceQuestionRecord[] = getSourceIndex().records, index: SourceIndex = getSourceIndex()): SourceFacets {
  const src = countBy(records, (r) => r.source);
  const fam = countBy(records, (r) => r.family);
  const sec = countBy(records, (r) => r.section_id);
  const del = countBy(records, (r) => r.delivery);

  const byFamily: Record<string, number> = {};
  const families = [...FAMILY_ORDER, ...[...fam.keys()].filter((f) => !FAMILY_ORDER.includes(f)).sort()];
  for (const f of families) {
    const n = fam.get(f);
    if (n) byFamily[f] = n;
  }

  const bySection: Record<string, number> = {};
  for (const s of index.sections) bySection[s.id] = sec.get(s.id) ?? 0;
  for (const [k, v] of sec) if (!(k in bySection)) bySection[k] = v;

  const byDelivery: Record<string, number> = {};
  for (const [k, v] of [...del.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) byDelivery[k] = v;

  return {
    bySource: { A: src.get('A') ?? 0, B: src.get('B') ?? 0 },
    byFamily,
    bySection,
    byClassification: {
      adapt: records.filter((r) => r.use_classification === 'adapt').length,
      study_only: records.filter((r) => r.use_classification === 'study_only').length,
      private_training: records.filter((r) => r.use_classification === 'private_training').length,
    },
    byDelivery,
  };
}

// ---------------------------------------------------------------------------
// Filtered search
// ---------------------------------------------------------------------------

/**
 * Filtered search: {source, family, section, classification, delivery, query}. Empty filters
 * return every record (unlike `searchRecords`, which returns [] for an empty query).
 * Results stay in seed order; A and B are never merged into one ordering — filter by source
 * or split the result by `record.source` when rendering.
 */
export function searchSources(filters: SourceSearchFilters, index: SourceIndex = getSourceIndex()): SourceQuestionRecord[] {
  return filterSourceRows(index.records, filters);
}

/** Split any record list into A and B lists, preserving order. Used so the UI never merges the two sources. */
export function splitBySource<T extends { source: SourceId }>(records: readonly T[]): Record<SourceId, T[]> {
  const out: Record<SourceId, T[]> = { A: [], B: [] };
  for (const r of records) out[r.source].push(r);
  return out;
}

/** Sections for one source, in id order, with counts and the named-only flag. */
export function sectionsForSource(source: SourceId, index: SourceIndex = getSourceIndex()): SourceSection[] {
  return index.sections.filter((s) => s.source === source).sort((a, b) => a.id.localeCompare(b.id));
}

/** Previous and next record in seed order (null at the ends). */
export function neighbours(
  id: string,
  index: SourceIndex = getSourceIndex(),
): { prev: SourceQuestionRecord | null; next: SourceQuestionRecord | null } {
  const i = index.records.findIndex((r) => r.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: index.records[i - 1] ?? null, next: index.records[i + 1] ?? null };
}

// ---------------------------------------------------------------------------
// Named-but-missing register
// ---------------------------------------------------------------------------

/** The register at data/source_missing_resources.json, validated in seeds.ts (throws on invalid data). */
export { loadMissingResourceRegister };

/** Named-but-missing or unverifiable resources. Each is marked missing — not reconstructed. */
export function listMissingResources(): MissingResource[] {
  return [...loadMissingResourceRegister().resources];
}

// ---------------------------------------------------------------------------
// Own-script counterparts
// ---------------------------------------------------------------------------

/** A light reference to a script node that cites a source record. */
export interface ScriptNodeRef {
  node_id: string;
  stage: string;
  approval_status: ScriptNode['approval']['status'];
  practice_only: boolean;
  /** Warning when a node that is not practice-only cites a non-adapt record (should never happen; reported, not hidden). */
  citation_warning?: string;
}

/**
 * Map record id → script nodes citing it. Reads the script-node seed (M-script owns it; it may be
 * a placeholder with `nodes: []`, which yields an empty map). Never invents a node.
 */
export function ownScriptCounterparts(
  nodes: readonly ScriptNode[] = loadScriptNodes().nodes,
  index: SourceIndex = getSourceIndex(),
): ReadonlyMap<string, readonly ScriptNodeRef[]> {
  const map = new Map<string, ScriptNodeRef[]>();
  for (const n of nodes) {
    for (const id of n.source_question_ids) {
      const record = index.byId.get(id);
      const practiceOnly = n.practice_only === true;
      const ref: ScriptNodeRef = { node_id: n.id, stage: n.stage, approval_status: n.approval.status, practice_only: practiceOnly };
      if (record && !practiceOnly && !isLiveEligibleForCitation(record)) {
        ref.citation_warning = `${id} is ${record.use_classification}; a non-practice node must not present it as live.`;
      }
      const list = map.get(id);
      if (list) list.push(ref);
      else map.set(id, [ref]);
    }
  }
  return map;
}

/** Nodes citing one record (empty when none, or when the script seed is still a placeholder). */
export function counterpartsFor(recordId: string, counterparts: ReadonlyMap<string, readonly ScriptNodeRef[]> = ownScriptCounterparts()): ScriptNodeRef[] {
  return [...(counterparts.get(recordId) ?? [])];
}

// ---------------------------------------------------------------------------
// Coverage report — the numbers SOURCE_COVERAGE.md prints
// ---------------------------------------------------------------------------

export interface CoverageFamilyRow {
  family: string;
  label: string;
  total: number;
  adapt: number;
  study_only: number;
  private_training: number;
  source_a: number;
  source_b: number;
}

export interface CoverageReport {
  record_count: number;
  expected_record_count: number;
  by_classification: Record<UseClassification, number>;
  by_source: Record<SourceId, number>;
  sections_with_records: number;
  sections_named_only: number;
  sections_total: number;
  brief_claims_section_count: number;
  named_only_section_ids: string[];
  families: CoverageFamilyRow[];
  live_eligible_count: number;
  never_live_count: number;
  hash_verified_count: number;
  hash_pending_count: number;
  raw_sources_supplied: boolean;
  hash_verification: string;
  offset_convention: string;
  package_sha256: string;
  missing_resource_count: number;
  missing_resource_ids: string[];
  records_with_timestamp_pattern: string[];
  reviewed_call_records: number;
  verify_command: string;
}

export const VERIFY_COMMAND = 'node scripts/verify-source-offsets.mjs';

export function coverageReport(index: SourceIndex = getSourceIndex()): CoverageReport {
  const validation = loadPackageValidation();
  const f = facets(index.records, index);
  const families: CoverageFamilyRow[] = Object.keys(f.byFamily).map((family) => {
    const rs = index.byFamily.get(family) ?? [];
    return {
      family,
      label: familyLabel(family),
      total: rs.length,
      adapt: rs.filter((r) => r.use_classification === 'adapt').length,
      study_only: rs.filter((r) => r.use_classification === 'study_only').length,
      private_training: rs.filter((r) => r.use_classification === 'private_training').length,
      source_a: rs.filter((r) => r.source === 'A').length,
      source_b: rs.filter((r) => r.source === 'B').length,
    };
  });
  const namedOnly = index.sections.filter((s) => !s.records_supplied).map((s) => s.id).sort();
  const withRecords = index.sections.filter((s) => s.records_supplied).length;
  const timestampHits = index.records
    .filter((r) => containsTimestampPattern(r.template) || containsTimestampPattern(r.excerpt))
    .map((r) => r.id);
  const missing = listMissingResources();
  return {
    record_count: index.records.length,
    expected_record_count: validation.expected_record_count,
    by_classification: classificationCounts(index),
    by_source: f.bySource,
    sections_with_records: withRecords,
    sections_named_only: namedOnly.length,
    sections_total: index.sections.length,
    brief_claims_section_count: validation.brief_claims_section_count,
    named_only_section_ids: namedOnly,
    families,
    live_eligible_count: index.records.filter(isLiveEligibleForCitation).length,
    never_live_count: index.records.filter((r) => !isLiveEligibleForCitation(r)).length,
    hash_verified_count: index.records.filter((r) => r.hash_verified).length,
    hash_pending_count: index.records.filter((r) => !r.hash_verified).length,
    raw_sources_supplied: validation.raw_sources_supplied,
    hash_verification: validation.hash_verification,
    offset_convention: validation.offset_convention,
    package_sha256: validation.package_sha256,
    missing_resource_count: missing.length,
    missing_resource_ids: missing.map((m) => m.id),
    records_with_timestamp_pattern: timestampHits,
    reviewed_call_records: index.byFamily.get('V')?.length ?? 0,
    verify_command: VERIFY_COMMAND,
  };
}
