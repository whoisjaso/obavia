import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CLASSIFICATION_DEFINITIONS,
  DELIVERY_OVERLAY_NOTE,
  DELIVERY_OVERLAY_TABLE,
  OFFSET_CONVENTION,
  SOURCE_ONLY_NOTICE,
  TEMPLATE_LABEL,
  classificationLabel,
  counterpartsFor,
  deliveryCueNote,
  excerptLabel,
  familyLabel,
  formatOffsets,
  getSourceIndex,
  isLiveEligibleForCitation,
  neighbours,
  ownScriptCounterparts,
  sourceLabel,
} from '@apohenia/domain/sources';
import { Badge, Card, PageHeader, Stack } from '@/components/ui';
import styles from '../sources.module.css';

interface Params {
  id: string;
}

/** Every record is a static page: 207 known ids, nothing dynamic. */
export function generateStaticParams(): Params[] {
  return getSourceIndex().records.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const record = getSourceIndex().byId.get(id);
  return { title: record ? `${record.id} — ${record.title}` : 'Source record' };
}

/**
 * Owner: M-sources. One curated source study record. Server component; no client state is
 * needed — every control is a link, so the page is keyboard operable by construction.
 */
export default async function SourceRecordPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const index = getSourceIndex();
  const record = index.byId.get(id);
  if (!record) notFound();

  const section = index.sectionById.get(record.section_id);
  const { prev, next } = neighbours(record.id, index);
  const counterparts = counterpartsFor(record.id, ownScriptCounterparts(undefined, index));
  const liveEligible = isLiveEligibleForCitation(record);
  const classificationVariant = liveEligible ? 'neutral' : 'warning';

  return (
    <>
      <p className={styles.crumb}>
        <Link href="/sources">← Source library</Link> · {sourceLabel(record.source)} · {record.section_id} {record.section_title}
      </p>
      <PageHeader
        title={`${record.id} — ${record.title}`}
        purpose="One curated study record: normalized template, instructor's intended purpose, described delivery cue, use classification, exact reference and the unchanged excerpt — study material, never live approval."
        aside={
          <Badge variant={classificationVariant} title={CLASSIFICATION_DEFINITIONS[record.use_classification]}>
            {classificationLabel(record.use_classification)}
          </Badge>
        }
      />

      <Stack gap={5}>
        {liveEligible ? null : (
          <p className={`${styles.notice} ${styles.sourceOnly}`} role="note" data-source-only-notice>
            <span className={styles.noticeGlyph} aria-hidden="true">
              !
            </span>
            <span>
              <span className={styles.noticeStrong}>{SOURCE_ONLY_NOTICE}.</span> {CLASSIFICATION_DEFINITIONS[record.use_classification]}
            </span>
          </p>
        )}

        <div className={styles.detailGrid}>
          <Stack gap={5}>
            <Card title="Normalized template">
              <div className={styles.templateLabel} style={{ marginBottom: 'var(--space-2)' }}>
                {TEMPLATE_LABEL}
              </div>
              <p className={styles.templateLarge} data-template>
                {record.template}
              </p>
            </Card>

            <Card title="Instructor's intended purpose">
              <p>{record.purpose}</p>
            </Card>

            <Card title="Unchanged source excerpt">
              <p className={styles.excerptLabel} data-excerpt-label>
                {excerptLabel(record)}
              </p>
              <blockquote className={styles.excerpt} data-excerpt lang="en">
                {record.excerpt}
              </blockquote>
              <p className={styles.muted} style={{ marginTop: 'var(--space-3)' }}>
                Copied unchanged from the supplied question bank (markdown line {record.markdown_line}); {record.excerpt_length} code points, claimed{' '}
                {record.claimed_length}
                {record.length_matches_offsets ? ' — lengths agree with the offsets.' : ' — length does not match the offsets; shown as supplied.'}
                {record.source === 'A' && record.family === 'V'
                  ? ' The reviewed call uses ">>" turn markers; speakers are not diarized and none is named here.'
                  : ''}
              </p>
            </Card>

            <Card title="Own-script counterpart">
              {counterparts.length === 0 ? (
                <p className={styles.muted} data-counterparts="none">
                  None yet. No own-script node cites {record.id}
                  {liveEligible ? '.' : ' — and a live node must not, because it is not live-eligible.'}
                </p>
              ) : (
                <ol className={styles.counterpartList} data-counterparts={counterparts.length}>
                  {counterparts.map((c) => (
                    <li key={c.node_id}>
                      <Link href={`/scripts?node=${encodeURIComponent(c.node_id)}`}>{c.node_id}</Link> · stage {c.stage} ·{' '}
                      <Badge variant={c.approval_status === 'published' ? 'success' : 'warning'}>{c.approval_status}</Badge>
                      {c.practice_only ? <> <Badge variant="info">practice only</Badge></> : null}
                      {c.citation_warning ? (
                        <>
                          {' '}
                          <Badge variant="warning">{c.citation_warning}</Badge>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
              <p className={styles.muted} style={{ marginTop: 'var(--space-3)' }}>
                Own-script lines are Apohenia&apos;s original wording citing this record id; they are never shown as source quotes.
              </p>
            </Card>
          </Stack>

          <Stack gap={5}>
            <Card title="Use classification">
              <p>
                <Badge variant={classificationVariant}>{classificationLabel(record.use_classification)}</Badge>
              </p>
              <p style={{ marginTop: 'var(--space-2)' }}>{CLASSIFICATION_DEFINITIONS[record.use_classification]}</p>
              <p className={styles.muted} style={{ marginTop: 'var(--space-2)' }} data-live-eligible={liveEligible ? 'yes' : 'no'}>
                Live-eligible for citation: {liveEligible ? 'yes (adapt — still requires an approved own-script line)' : 'no'}
              </p>
            </Card>

            <Card title="Delivery described in source">
              <p>
                <span className={styles.mono}>{record.delivery}</span>
              </p>
              <p className={styles.muted} style={{ marginTop: 'var(--space-2)' }}>
                {deliveryCueNote(record.delivery)}
              </p>
            </Card>

            <Card title="Reference">
              <dl className={styles.dl}>
                <dt>Source</dt>
                <dd>{sourceLabel(record.source)}</dd>
                <dt>Section</dt>
                <dd>
                  {record.section_id} · {record.section_title}
                  {section && !section.records_supplied ? (
                    <>
                      {' '}
                      <Badge variant="warning">no records supplied</Badge>
                    </>
                  ) : null}
                </dd>
                <dt>Family</dt>
                <dd>
                  {record.family} · {familyLabel(record.family)}
                </dd>
                <dt>Original characters</dt>
                <dd>
                  <span className={styles.mono} data-offsets>
                    {formatOffsets(record)}
                  </span>{' '}
                  — code-point offsets
                </dd>
                <dt>Convention</dt>
                <dd>{OFFSET_CONVENTION}</dd>
                <dt>Hash verified</dt>
                <dd>{record.hash_verified ? 'yes' : 'no — raw source not supplied'}</dd>
              </dl>
            </Card>
          </Stack>
        </div>

        <nav className={styles.pager} aria-label="Record pager">
          <span>
            {prev ? (
              <Link href={`/sources/${prev.id}`} rel="prev">
                ← Previous: {prev.id} — {prev.title}
              </Link>
            ) : (
              <span className={styles.muted}>First record</span>
            )}
          </span>
          <span>
            {next ? (
              <Link href={`/sources/${next.id}`} rel="next">
                Next: {next.id} — {next.title} →
              </Link>
            ) : (
              <span className={styles.muted}>Last record</span>
            )}
          </span>
        </nav>

        <Card title="Delivery overlay (framework §11) — static reference">
          <p className={styles.muted} style={{ marginBottom: 'var(--space-3)' }}>
            {DELIVERY_OVERLAY_NOTE}
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Element</th>
                  <th scope="col">A / Andrés-described emphasis</th>
                  <th scope="col">B / Yosh-described emphasis</th>
                </tr>
              </thead>
              <tbody>
                {DELIVERY_OVERLAY_TABLE.map((row) => (
                  <tr key={row.element}>
                    <th scope="row">{row.element}</th>
                    <td>{row.a_described}</td>
                    <td>{row.b_described}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Stack>
    </>
  );
}
