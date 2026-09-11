import type { Metadata } from 'next';
import { CLASSIFICATION_DEFINITIONS, FAMILY_LABELS, PRIVATE_BY_DEFAULT_NOTICE, TEMPLATE_LABEL, coverageReport, getSourceIndex, listMissingResources, sectionsForSource, sourceDescription, toSourceRow } from '@apohenia/domain/sources';
import { SourcesClient } from './SourcesClient';

export const metadata: Metadata = { title: 'Sources' };

/**
 * Owner: M-script (v2). Source Library (DESIGN_SYSTEM §3.5): search field + card list (id chip ·
 * title · classification glyph), Source A / Source B as two chips (never merged), section chips,
 * the named-but-missing register and the coverage numbers behind two icon buttons. Server component:
 * slim rows only (excerpts live on the record page).
 */
export default function SourcesPage() {
  const index = getSourceIndex();
  const coverage = coverageReport(index);
  const missing = listMissingResources();
  const rows = index.records.map(toSourceRow);
  const sections = { A: sectionsForSource('A', index), B: sectionsForSource('B', index) };

  return (
    <>
      <h1 className="sr-only">Sources</h1>
      <SourcesClient
        rows={rows}
        sections={sections}
        sourceDescriptions={{ A: sourceDescription('A'), B: sourceDescription('B') }}
        classificationDefinitions={CLASSIFICATION_DEFINITIONS}
        familyLabels={FAMILY_LABELS}
        templateLabel={TEMPLATE_LABEL}
        privateNotice={PRIVATE_BY_DEFAULT_NOTICE}
        missing={missing}
        coverage={{
          record_count: coverage.record_count,
          expected_record_count: coverage.expected_record_count,
          by_source: coverage.by_source,
          by_classification: coverage.by_classification,
          sections_with_records: coverage.sections_with_records,
          sections_named_only: coverage.sections_named_only,
          sections_total: coverage.sections_total,
          brief_claims_section_count: coverage.brief_claims_section_count,
          live_eligible_count: coverage.live_eligible_count,
          never_live_count: coverage.never_live_count,
          hash_verified_count: coverage.hash_verified_count,
          hash_pending_count: coverage.hash_pending_count,
          raw_sources_supplied: coverage.raw_sources_supplied,
          hash_verification: coverage.hash_verification,
          offset_convention: coverage.offset_convention,
          package_sha256: coverage.package_sha256,
          reviewed_call_records: coverage.reviewed_call_records,
          records_with_timestamp_pattern: coverage.records_with_timestamp_pattern,
          verify_command: coverage.verify_command,
        }}
      />
    </>
  );
}
