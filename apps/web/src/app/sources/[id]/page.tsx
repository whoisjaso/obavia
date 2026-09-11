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
import { statusGlyph } from '@apohenia/domain/offers';
import { Card, Chip, GlyphPill, IconButton, TopBar } from '@/components/ui';
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
  return { title: record ? `${record.id} — ${record.title}` : 'Source record' };
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

  return (
    <div className={styles.root} data-record={record.id} data-live-eligible={liveEligible ? 'yes' : 'no'}>
      <h1 className="sr-only">
        {record.id} — {record.title}
      </h1>
      <TopBar
        left={<IconButton icon="arrow-left" label="Back to the Source Library" href="/sources" data-back />}
        center={<Chip static label={record.id} name={`Record ${record.id}`} className={styles.mono} />}
        right={
          <>
            <RecordInfo rows={[...DELIVERY_OVERLAY_TABLE]} note={DELIVERY_OVERLAY_NOTE} />
          </>
        }
      />

      <div className={styles.row}>
        <GlyphPill glyph={g.glyph} label={g.word} tone={g.tone} name={liveEligible ? `${g.name}. ${definition}` : `${SOURCE_ONLY_NOTICE}. ${definition}`} data-classification={record.use_classification} {...(liveEligible ? {} : { 'data-source-only-notice': '' })} />
        <Chip static label={sourceLabel(record.source)} name={sourceLabel(record.source)} />
        <Chip static label={record.section_id} name={`Section ${record.section_id} — ${record.section_title}${section && !section.records_supplied ? ' (named only; no records supplied)' : ''}`} className={styles.mono} />
        <Chip static label={record.family} name={`Family ${record.family} — ${familyLabel(record.family)}`} className={styles.mono} />
      </div>

      <p className={styles.recordHeading}>{record.title}</p>

      {/* the excerpt is the hero */}
      <Card data-excerpt-card>
        <div className={styles.row} style={{ marginBottom: 'var(--s-3)' }}>
          <GlyphPill glyph={record.hash_verified ? '✓' : '◔'} label={record.hash_verified ? 'Verified' : 'Pending'} tone={record.hash_verified ? 'green' : 'orange'} name={excerptLabel(record)} data-excerpt-label />
          <Chip static label={formatOffsets(record)} name={`Original characters ${formatOffsets(record)} — ${OFFSET_CONVENTION}`} className={styles.mono} data-offsets-chip />
          <span className="sr-only" data-offsets>
            {formatOffsets(record)}
          </span>
        </div>
        <blockquote className={styles.excerpt} data-excerpt lang="en">
          {record.excerpt}
        </blockquote>
        <p className={styles.small} style={{ marginTop: 'var(--s-3)' }}>
          {record.excerpt_length} code points{record.length_matches_offsets ? '' : ' — length does not match the offsets; shown as supplied'} · line {record.markdown_line}
          {record.source === 'A' && record.family === 'V' ? ' · reviewed call, ">>" turn markers, speakers not diarized' : ''}
        </p>
      </Card>

      <Card data-template-card>
        <h2 className={styles.caption}>
          Template <GlyphPill glyph="≈" label="Normalized" tone="neutral" name={`${TEMPLATE_LABEL} — an editorial reconstruction; the unchanged excerpt is above`} data-template-label />
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
        <Chip static label={record.delivery} name={`Delivery described in source: ${record.delivery}`} className={styles.mono} />
      </Card>

      <Card data-counterparts={counterparts.length === 0 ? 'none' : counterparts.length}>
        <h2 className={styles.caption}>
          Own lines <GlyphPill glyph="✦" tone="purple" name="Own-script lines are Apohenia's original wording citing this record id; they are never shown as source quotes" />
        </h2>
        {counterparts.length === 0 ? (
          <GlyphPill glyph="∅" label="None yet" tone="neutral" name={`No own-script node cites ${record.id}${liveEligible ? '' : ' — and a live node must not, because it is not live-eligible'}`} />
        ) : (
          <div className={styles.row}>
            {counterparts.map((c) => {
              const s = statusGlyph(c.approval_status);
              return (
                <Link
                  key={c.node_id}
                  href={`/scripts?node=${encodeURIComponent(c.node_id)}`}
                  className={[styles.chipLink, styles.mono].join(' ')}
                  aria-label={`${c.node_id}, stage ${c.stage}. ${s.name}.${c.practice_only ? ' Practice only.' : ''}${c.citation_warning ? ` ${c.citation_warning}` : ''} Open in the script.`}
                  data-counterpart={c.node_id}
                >
                  <span aria-hidden="true">{s.glyph}</span>
                  <span>{c.node_id}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <nav className={styles.pager} aria-label="Record pager">
        {prev ? <IconButton icon="arrow-left" label={`Previous: ${prev.id} — ${prev.title}`} href={`/sources/${encodeURIComponent(prev.id)}`} size={56} /> : <span className={styles.pagerEnd} aria-hidden="true" />}
        <span className={styles.pagerMid} aria-hidden="true">
          {record.id}
        </span>
        {next ? <IconButton icon="arrow-right" label={`Next: ${next.id} — ${next.title}`} href={`/sources/${encodeURIComponent(next.id)}`} size={56} /> : <span className={styles.pagerEnd} aria-hidden="true" />}
      </nav>
    </div>
  );
}
