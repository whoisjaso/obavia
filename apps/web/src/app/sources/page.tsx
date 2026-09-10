import type { Metadata } from 'next';
import {
  CLASSIFICATION_DEFINITIONS,
  PRIVATE_BY_DEFAULT_NOTICE,
  TEMPLATE_LABEL,
  classificationLabel,
  coverageReport,
  facets,
  familyLabel,
  getSourceIndex,
  listMissingResources,
  sectionsForSource,
  sourceDescription,
  toSourceRow,
} from '@apohenia/domain/sources';
import type { UseClassification } from '@apohenia/domain/schemas';
import { Badge, Card, PageHeader, Stack } from '@/components/ui';
import { SourcesClient } from './SourcesClient';
import styles from './sources.module.css';

export const metadata: Metadata = { title: 'Sources' };

const CLASSIFICATIONS: readonly UseClassification[] = ['adapt', 'study_only', 'private_training'];

/**
 * Owner: M-sources. Server component: loads the seeded package once, passes slim rows down
 * (excerpts stay on the detail page), and renders the private-by-default notice, the
 * named-but-missing register and the coverage summary around the client browser.
 */
export default function SourcesPage() {
  const index = getSourceIndex();
  const f = facets(index.records, index);
  const coverage = coverageReport(index);
  const missing = listMissingResources();

  const rows = index.records.map(toSourceRow);
  const sections = { A: sectionsForSource('A', index), B: sectionsForSource('B', index) };
  const familyOptions = Object.entries(f.byFamily).map(([value, n]) => ({ value, label: `${value} — ${familyLabel(value)} (${n})` }));
  const deliveryOptions = Object.entries(f.byDelivery).map(([value, n]) => ({ value, label: `${value} (${n})` }));
  const classificationOptions = CLASSIFICATIONS.map((value) => ({
    value,
    label: classificationLabel(value),
    definition: CLASSIFICATION_DEFINITIONS[value],
  }));

  return (
    <>
      <PageHeader
        title="Sources"
        purpose="Source Library: A/B preserved, section index, question search, exact excerpt and offset, normalized wording, own-script counterpart, source-only flag, named-but-missing resources, selected voice-style overlay."
        aside={<Badge variant="warning">Private · study only · not live approval</Badge>}
      />
      <Stack gap={5}>
        <p className={styles.notice} role="note" data-private-notice>
          <span className={styles.noticeGlyph} aria-hidden="true">
            !
          </span>
          <span>
            <span className={styles.noticeStrong}>Private by default.</span> {PRIVATE_BY_DEFAULT_NOTICE}
          </span>
        </p>

        <p className={styles.muted}>
          {coverage.record_count} curated study records · adapt {coverage.by_classification.adapt} / study only{' '}
          {coverage.by_classification.study_only} / private training {coverage.by_classification.private_training} · Source A{' '}
          {coverage.by_source.A} / Source B {coverage.by_source.B} · {coverage.sections_with_records} sections with records +{' '}
          {coverage.sections_named_only} named-only · raw sources {coverage.raw_sources_supplied ? 'hashed' : 'not supplied — offsets recorded as claimed, hash verification pending'}
          . The 1,449-occurrence punctuation audit is an audit (not supplied here), not 1,449 approved questions.
        </p>

        <SourcesClient
          rows={rows}
          sections={sections}
          sourceDescriptions={{ A: sourceDescription('A'), B: sourceDescription('B') }}
          familyOptions={familyOptions}
          deliveryOptions={deliveryOptions}
          classificationOptions={classificationOptions}
          templateLabel={TEMPLATE_LABEL}
        />

        <Card title="Named but missing resources" data-missing-register>
          <p className={styles.muted} style={{ marginBottom: 'var(--space-3)' }}>
            Resources the framework or brief names that the supplied package does not contain or cannot verify. Each is marked missing —
            not reconstructed. {missing.length} entries.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Resource</th>
                  <th scope="col">Named in</th>
                  <th scope="col">What is supplied</th>
                  <th scope="col">What is missing</th>
                  <th scope="col">Handling</th>
                </tr>
              </thead>
              <tbody>
                {missing.map((m) => (
                  <tr key={m.id} data-missing-id={m.id}>
                    <th scope="row">
                      {m.name}
                      <div className={styles.mono}>{m.id}</div>
                    </th>
                    <td>{m.named_in}</td>
                    <td>{m.what_is_supplied}</td>
                    <td>{m.what_is_missing}</td>
                    <td>
                      <Badge variant="warning">marked missing — not reconstructed</Badge>
                      <div style={{ marginTop: 'var(--space-2)' }}>{m.handling}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Package coverage">
          <dl className={styles.dl}>
            <dt>Records</dt>
            <dd>
              {coverage.record_count} of {coverage.expected_record_count} expected · {coverage.reviewed_call_records} from the reviewed call (family V)
            </dd>
            <dt>Sections</dt>
            <dd>
              {coverage.sections_with_records} with records + {coverage.sections_named_only} named-only = {coverage.sections_total}. The brief claims{' '}
              {coverage.brief_claims_section_count}; the remaining ids cannot be reconciled from supplied files and are not invented.
            </dd>
            <dt>Live-eligible for citation</dt>
            <dd>
              {coverage.live_eligible_count} adapt · {coverage.never_live_count} never live (study_only + private_training)
            </dd>
            <dt>Offset convention</dt>
            <dd>{coverage.offset_convention}</dd>
            <dt>Hash verification</dt>
            <dd>
              {coverage.hash_verified_count} verified · {coverage.hash_pending_count} pending. {coverage.hash_verification}. When the raw sources arrive run{' '}
              <code>{coverage.verify_command}</code>.
            </dd>
            <dt>Package SHA-256</dt>
            <dd className={styles.mono}>{coverage.package_sha256} (docs/02-organized-question-bank.md — not the raw transcripts)</dd>
            <dt>Timestamp patterns</dt>
            <dd>
              {coverage.records_with_timestamp_pattern.length === 0
                ? 'None in any template or excerpt — the sources are untimed text.'
                : `Found in ${coverage.records_with_timestamp_pattern.join(', ')} — review before display.`}
            </dd>
          </dl>
        </Card>
      </Stack>
    </>
  );
}
