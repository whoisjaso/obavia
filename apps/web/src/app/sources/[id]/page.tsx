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
import { classificationGlyph } from '@apohenia/domain/scripts';
import { loadScriptNodes } from '@apohenia/domain/seeds';
import { statusGlyph } from '@apohenia/domain/offers';
import { sectionShortName, sentenceCase } from '../lib';
import { Card, Chip, Glyph, GlyphPill, IconButton, TopBar } from '@/components/ui';
import styles from '../sources.module.css';
import { RecordInfo } from './RecordInfo';

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
  return { title: record ? `${record.id} · ${sentenceCase(record.title)}` : 'Source record' };
}

/**
 * Owner: M-script (v2). One curated source study record as a full-screen card: the unchanged
 * excerpt is the hero text; offsets, the verification-pending glyph, the classification glyph
 * (study_only = ⊘ with its full accessible text), the normalized template, purpose, delivery cue,
 * own-script counterparts and prev/next. Server component — every control is a link.
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
  const g = classificationGlyph(record.use_classification);
  const definition = CLASSIFICATION_DEFINITIONS[record.use_classification];
  const position = index.records.findIndex((r) => r.id === record.id) + 1;
  const nodeLabels = new Map(loadScriptNodes().nodes.map((n) => [n.id, (n.substage ?? n.id).replace(/[_-]+/g, ' ')] as const));

  return (
    <div className={styles.root} data-record={record.id} data-live-eligible={liveEligible ? 'yes' : 'no'}>
      <h1 className="sr-only">
        {record.id} · {sentenceCase(record.title)}
      </h1>
      <TopBar
        left={<IconButton icon="arrow-left" label="Back to the Source Library" href="/sources" data-back />}
        center={<Chip static label={sectionShortName(record.section_title)} name={`Record ${record.id} — ${record.section_title}`} data-record-section />}
        right={
          <RecordInfo
            meta={{
              sourceLabel: sourceLabel(record.source),
              sectionId: record.section_id,
              sectionTitle: record.section_title,
              sectionNamedOnly: Boolean(section && !section.records_supplied),
              family: record.family,
              familyLabel: familyLabel(record.family),
              offsets: formatOffsets(record),
              offsetConvention: OFFSET_CONVENTION,
              hashVerified: record.hash_verified,
              excerptLabel: excerptLabel(record),
              excerptLength: record.excerpt_length,
              lengthMatches: record.length_matches_offsets,
              markdownLine: record.markdown_line,
              reviewedCall: record.source === 'A' && record.family === 'V',
            }}
            rows={[...DELIVERY_OVERLAY_TABLE]}
            note={DELIVERY_OVERLAY_NOTE}
          />
        }
      />

      <div className={styles.row}>
        <GlyphPill glyph={g.glyph} label={g.word} tone={g.tone} name={liveEligible ? `${g.name}. ${definition}` : `${SOURCE_ONLY_NOTICE}. ${definition}`} data-classification={record.use_classification} {...(liveEligible ? {} : { 'data-source-only-notice': '' })} />
        <span className="sr-only" data-offsets>
          {formatOffsets(record)}
        </span>
      </div>

      <p className={styles.recordHeading}>{sentenceCase(record.title)}</p>

      {/* the excerpt is the hero; provenance (offsets, hash status) lives behind ⓘ */}
      <Card data-excerpt-card>
        <blockquote className={styles.excerpt} data-excerpt lang="en">
          {record.excerpt}
        </blockquote>
      </Card>

      <Card data-template-card>
        <h2 className={styles.caption}>
          Template <GlyphPill glyph="≈" label="Normalized" tone="neutral" name={`${TEMPLATE_LABEL}: an editorial reconstruction; the unchanged excerpt is above`} data-template-label />
        </h2>
        <p className={styles.templateLarge} data-template>
          {record.template}
        </p>
      </Card>

      <Card>
        <h2 className={styles.caption}>Purpose</h2>
        <p className={styles.body}>{record.purpose}</p>
      </Card>

      <Card>
        <h2 className={styles.caption}>
          Delivery <GlyphPill glyph="◔" label="Described" tone="neutral" name={deliveryCueNote(record.delivery)} />
        </h2>
        <Chip static label={record.delivery} name={`Delivery described in source: ${record.delivery}`} />
      </Card>

      <Card data-counterparts={counterparts.length === 0 ? 'none' : counterparts.length}>
        <h2 className={styles.caption}>
          Own lines <GlyphPill glyph="✦" tone="purple" name="Own-script lines are Apohenia's original wording citing this record id; they are never shown as source quotes" />
        </h2>
        {counterparts.length === 0 ? (
          <GlyphPill glyph="∅" label="None yet" tone="neutral" name={`No own-script node cites ${record.id}${liveEligible ? '' : ', and a live node must not, because it is not live-eligible'}`} />
        ) : (
          <div className={styles.row}>
            {counterparts.map((c) => {
              const s = statusGlyph(c.approval_status);
              return (
                <Link
                  key={c.node_id}
                  href={`/scripts?node=${encodeURIComponent(c.node_id)}`}
                  className={styles.chipLink}
                  aria-label={`${nodeLabels.get(c.node_id) ?? c.node_id} (${c.node_id}), stage ${c.stage}. ${s.name}.${c.practice_only ? ' Practice only.' : ''}${c.citation_warning ? ` ${c.citation_warning}` : ''} Open in the script.`}
                  data-counterpart={c.node_id}
                >
                  <Glyph glyph={s.glyph} size={14} />
                  <span>{nodeLabels.get(c.node_id) ?? c.node_id}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <nav className={styles.pager} aria-label="Record pager">
        {prev ? <IconButton icon="arrow-left" label={`Previous: ${prev.id}, ${sentenceCase(prev.title)}`} href={`/sources/${encodeURIComponent(prev.id)}`} size={56} /> : <span className={styles.pagerEnd} aria-hidden="true" />}
        <span className={styles.pagerMid} aria-hidden="true">
          {position} of {index.records.length}
        </span>
        {next ? <IconButton icon="arrow-right" label={`Next: ${next.id}, ${sentenceCase(next.title)}`} href={`/sources/${encodeURIComponent(next.id)}`} size={56} /> : <span className={styles.pagerEnd} aria-hidden="true" />}
      </nav>
    </div>
  );
}
