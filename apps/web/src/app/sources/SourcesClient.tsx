'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';
import type { MissingResource, SourceId, SourceSection, UseClassification } from '@apohenia/domain/schemas';
import type { SourceRow } from '@apohenia/domain/sources';
import { classificationGlyph } from '@apohenia/domain/scripts';
import { Card, Chip, GlyphPill, Icon, IconButton, Ring, Sheet, Stat, TopBar } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './sources.module.css';
import { filterRows, namedOnlyTitle } from './lib';

export interface CoverageNumbers {
  record_count: number;
  expected_record_count: number;
  by_source: Record<SourceId, number>;
  by_classification: Record<UseClassification, number>;
  sections_with_records: number;
  sections_named_only: number;
  sections_total: number;
  brief_claims_section_count: number;
  live_eligible_count: number;
  never_live_count: number;
  hash_verified_count: number;
  hash_pending_count: number;
  raw_sources_supplied: boolean;
  hash_verification: string;
  offset_convention: string;
  package_sha256: string;
  reviewed_call_records: number;
  records_with_timestamp_pattern: string[];
  verify_command: string;
}

export interface SourcesClientProps {
  rows: SourceRow[];
  sections: Record<SourceId, SourceSection[]>;
  sourceDescriptions: Record<SourceId, string>;
  classificationDefinitions: Readonly<Record<UseClassification, string>>;
  templateLabel: string;
  privateNotice: string;
  missing: MissingResource[];
  coverage: CoverageNumbers;
}

const Filters = z.object({
  source: z.enum(['A', 'B']),
  classification: z.string(),
  query: z.string(),
  section: z.object({ A: z.string(), B: z.string() }),
});
type Filters = z.infer<typeof Filters>;

const INITIAL: Filters = { source: 'A', classification: '', query: '', section: { A: '', B: '' } };
const SOURCES: readonly SourceId[] = ['A', 'B'];
const CLASSIFICATIONS: readonly UseClassification[] = ['adapt', 'study_only', 'private_training'];

type SheetState = { kind: 'missing' } | { kind: 'missing-item'; id: string } | { kind: 'coverage' } | null;

function Caption({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className={styles.caption}>
      {children}
    </h3>
  );
}

/** Source A / Source B are two chips and two lists; they are never merged into one ordering. */
export function SourcesClient({ rows, sections, sourceDescriptions, classificationDefinitions, templateLabel, privateNotice, missing, coverage }: SourcesClientProps) {
  const [filters, setFilters, hydrated] = useStoredState('sources.filters', Filters, INITIAL);
  const [sheet, setSheet] = useState<SheetState>(null);
  const searchId = useId();

  const shared = useMemo(() => filterRows(rows, { classification: filters.classification, query: filters.query }), [rows, filters.classification, filters.query]);
  const perSource = useMemo(() => {
    const out: Record<SourceId, SourceRow[]> = { A: [], B: [] };
    for (const r of shared) {
      if (filters.section[r.source] && r.section_id !== filters.section[r.source]) continue;
      out[r.source].push(r);
    }
    return out;
  }, [shared, filters.section]);
  const source = filters.source;
  const list = perSource[source];
  const sectionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of shared) if (r.source === source) m.set(r.section_id, (m.get(r.section_id) ?? 0) + 1);
    return m;
  }, [shared, source]);

  function update(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }
  function toggleSection(id: string) {
    setFilters((prev) => ({ ...prev, section: { ...prev.section, [source]: prev.section[source] === id ? '' : id } }));
  }
  function toggleClassification(c: UseClassification) {
    update({ classification: filters.classification === c ? '' : c });
  }

  const anyFilter = filters.classification !== '' || filters.query.trim() !== '' || filters.section.A !== '' || filters.section.B !== '';
  const missingItem = sheet?.kind === 'missing-item' ? (missing.find((m) => m.id === sheet.id) ?? null) : null;
  const hashRatio = coverage.record_count > 0 ? coverage.hash_verified_count / coverage.record_count : 0;

  return (
    <div className={styles.root} data-sources data-source={source} data-hydrated={hydrated ? 'true' : 'false'}>
      <TopBar
        left={<Chip static glyph={<Icon name="lock" size={12} />} label="Private" name={privateNotice} tone="neutral" data-private-notice className={styles.privateChip} />}
        title="Sources"
        right={
          <>
            <IconButton icon="flag" label={`Named but missing resources (${missing.length})`} onClick={() => setSheet({ kind: 'missing' })} data-open-missing />
            <IconButton icon="info" label="Package coverage" onClick={() => setSheet({ kind: 'coverage' })} data-open-coverage />
          </>
        }
      />

      {/* search */}
      <div className={styles.search} role="search">
        <Icon name="search" size={20} className={styles.searchIcon} />
        <input
          id={searchId}
          type="search"
          className={styles.searchInput}
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          aria-label="Search records by id, title, template or purpose"
          autoComplete="off"
          enterKeyHint="search"
          data-search
        />
        {anyFilter ? <IconButton icon="x" label="Clear filters" onClick={() => setFilters(INITIAL)} className={styles.clear} data-clear-filters /> : null}
      </div>

      {/* A / B — two chips, two lists */}
      <div className={styles.row} role="group" aria-label="Source">
        {SOURCES.map((s) => (
          <Chip key={s} label={`Source ${s}`} toggle selected={source === s} onClick={() => update({ source: s })} name={`Source ${s}, ${perSource[s].length} matching of ${coverage.by_source[s]} — ${sourceDescriptions[s]}`} data-source-chip={s} />
        ))}
        <Stat value={list.length} icon="list" name={`Matching records in Source ${source}`} />
      </div>

      {/* classification chips */}
      <div className={styles.row} role="group" aria-label="Classification">
        {CLASSIFICATIONS.map((c) => {
          const g = classificationGlyph(c);
          return <Chip key={c} label={g.word} glyph={g.glyph} tone={g.tone === 'orange' ? 'gold' : g.tone} toggle selected={filters.classification === c} onClick={() => toggleClassification(c)} name={`${g.word}: ${classificationDefinitions[c]}`} data-classification-chip={c} />;
        })}
      </div>

      {/* section rail for the selected source */}
      <div className={styles.rail} role="group" aria-label={`Source ${source} sections`} data-section-rail={source}>
        {sections[source].map((s) => {
          if (!s.records_supplied) {
            return <Chip key={s.id} label={s.id} glyph="∅" static name={`${s.id} — ${namedOnlyTitle(s.title)}: named in the framework; no records supplied`} className={[styles.railChip, styles.mono, styles.namedOnly].join(' ')} data-section-id={s.id} data-named-only />;
          }
          const count = sectionCounts.get(s.id) ?? 0;
          return (
            <Chip key={s.id} label={s.id} toggle selected={filters.section[source] === s.id} onClick={() => toggleSection(s.id)} name={`${s.id} — ${s.title}: ${count} of ${s.record_count} records`} kbd={String(count)} className={[styles.railChip, styles.mono].join(' ')} data-section-id={s.id} />
          );
        })}
      </div>

      <span className="sr-only" role="status" aria-live="polite" data-results-status>
        {list.length} matching records in Source {source}; Source A {perSource.A.length}, Source B {perSource.B.length}
      </span>

      {/* the list */}
      <div className={styles.cards} data-source-panel={source}>
        {list.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyGlyph} aria-hidden="true">
              ∅
            </span>
            <span className={styles.emptyLabel}>No match</span>
          </div>
        ) : (
          list.map((r) => {
            const g = classificationGlyph(r.use_classification);
            return (
              <Card key={r.id} href={`/sources/${encodeURIComponent(r.id)}`} name={`${r.id} — ${r.title}. ${g.name}. Open record.`} dense data-record-id={r.id}>
                <div className={styles.recordRow}>
                  <Chip static label={r.id} name={`Record ${r.id}`} className={styles.mono} />
                  <span className={styles.recordTitle}>{r.title}</span>
                  <GlyphPill glyph={g.glyph} tone={g.tone} name={g.name} data-classification={r.use_classification} />
                </div>
                <p className={styles.recordTemplate} title={templateLabel}>
                  {r.template}
                </p>
              </Card>
            );
          })
        )}
      </div>

      {/* ================= missing register ================= */}
      <Sheet open={sheet?.kind === 'missing'} onClose={() => setSheet(null)} title="Missing" data-sheet="missing" tall>
        <div className={styles.sheetBody} data-missing-register>
          {missing.map((m) => (
            <Card key={m.id} dense onPress={() => setSheet({ kind: 'missing-item', id: m.id })} name={`${m.name} — marked missing, not reconstructed. Open.`} data-missing-id={m.id}>
              <div className={styles.missingRow}>
                <GlyphPill glyph="⊘" tone="orange" name="Marked missing — not reconstructed; nothing is filled from imagination" />
                <span className={styles.missingName}>{m.name}</span>
              </div>
            </Card>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet?.kind === 'missing-item' && missingItem !== null} onClose={() => setSheet({ kind: 'missing' })} title="Missing" data-sheet="missing-item">
        {missingItem ? (
          <div className={styles.sheetBody} data-missing-item={missingItem.id}>
            <div className={styles.row}>
              <GlyphPill glyph="⊘" label="Missing" tone="orange" name="Marked missing — not reconstructed" data-missing-marker />
              <Chip static label={missingItem.id} name={`Register id ${missingItem.id}`} className={styles.mono} />
            </div>
            <p className={styles.sheetTitle}>{missingItem.name}</p>
            <section aria-labelledby="m-named">
              <Caption id="m-named">Named in</Caption>
              <p className={styles.body}>{missingItem.named_in}</p>
            </section>
            <section aria-labelledby="m-supplied">
              <Caption id="m-supplied">Supplied</Caption>
              <p className={styles.body} data-what-is-supplied>
                {missingItem.what_is_supplied}
              </p>
            </section>
            <section aria-labelledby="m-missing">
              <Caption id="m-missing">Missing</Caption>
              <p className={styles.body}>{missingItem.what_is_missing}</p>
            </section>
            <section aria-labelledby="m-handling">
              <Caption id="m-handling">Handling</Caption>
              <p className={styles.body}>{missingItem.handling}</p>
            </section>
          </div>
        ) : null}
      </Sheet>

      {/* ================= coverage ================= */}
      <Sheet open={sheet?.kind === 'coverage'} onClose={() => setSheet(null)} title="Coverage" data-sheet="coverage" tall>
        <div className={styles.sheetBody} data-coverage>
          <div className={styles.statRow}>
            <Stat value={coverage.record_count} icon="list" name="Records" label="records" size="lg" />
            <Stat value={coverage.by_source.A} icon="bookmark" name="Source A records" label="A" />
            <Stat value={coverage.by_source.B} icon="bookmark" name="Source B records" label="B" />
          </div>
          <div className={styles.statRow}>
            {CLASSIFICATIONS.map((c) => {
              const g = classificationGlyph(c);
              return (
                <div key={c} className={styles.glyphStat} role="group" aria-label={`${g.word}: ${coverage.by_classification[c]} records — ${classificationDefinitions[c]}`}>
                  <span className={styles.glyphStatValue} aria-hidden="true">
                    {coverage.by_classification[c]}
                  </span>
                  <span className={styles.glyphStatKey} aria-hidden="true">
                    {g.glyph} {g.word}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={styles.ringRow}>
            <div className={styles.ringItem}>
              <Ring value={hashRatio} size={72} stroke={7} color="var(--green)" label={`Hash verified: ${coverage.hash_verified_count} of ${coverage.record_count} records — ${coverage.hash_verification}`}>
                <span className={styles.ringText} aria-hidden="true">
                  {coverage.hash_verified_count}/{coverage.record_count}
                </span>
              </Ring>
              <span className={styles.ringKey} aria-hidden="true">
                Verified
              </span>
            </div>
            <div className={styles.ringItem}>
              <Ring value={coverage.sections_total > 0 ? coverage.sections_with_records / coverage.sections_total : 0} size={72} stroke={7} color="var(--teal)" label={`Sections with records: ${coverage.sections_with_records} of ${coverage.sections_total} (${coverage.sections_named_only} named only; the brief claims ${coverage.brief_claims_section_count})`}>
                <span className={styles.ringText} aria-hidden="true">
                  {coverage.sections_with_records}/{coverage.sections_total}
                </span>
              </Ring>
              <span className={styles.ringKey} aria-hidden="true">
                Sections
              </span>
            </div>
            <div className={styles.ringItem}>
              <Ring value={coverage.record_count > 0 ? coverage.live_eligible_count / coverage.record_count : 0} size={72} stroke={7} color="var(--gold)" label={`Live-eligible for citation: ${coverage.live_eligible_count} adapt; ${coverage.never_live_count} never live (study only + private training)`}>
                <span className={styles.ringText} aria-hidden="true">
                  {coverage.live_eligible_count}
                </span>
              </Ring>
              <span className={styles.ringKey} aria-hidden="true">
                Citable
              </span>
            </div>
          </div>
          <div className={styles.row}>
            <GlyphPill glyph={coverage.raw_sources_supplied ? '✓' : '◔'} label={coverage.raw_sources_supplied ? 'Raw hashed' : 'Raw pending'} tone={coverage.raw_sources_supplied ? 'green' : 'orange'} name={`${coverage.hash_verification}. Offsets: ${coverage.offset_convention}. When the raw sources arrive run ${coverage.verify_command}.`} data-raw-sources={coverage.raw_sources_supplied ? 'yes' : 'no'} />
            <GlyphPill glyph="1,449" tone="neutral" name="The 1,449-occurrence punctuation audit is an audit (not supplied here), not 1,449 approved questions" />
            <GlyphPill glyph={coverage.records_with_timestamp_pattern.length === 0 ? '—' : '!'} label="Timestamps" tone={coverage.records_with_timestamp_pattern.length === 0 ? 'neutral' : 'orange'} name={coverage.records_with_timestamp_pattern.length === 0 ? 'No timestamps in any template or excerpt — the sources are untimed text' : `Timestamp patterns found in ${coverage.records_with_timestamp_pattern.join(', ')} — review before display`} />
          </div>
          <section aria-labelledby="c-sha">
            <Caption id="c-sha">Package SHA-256</Caption>
            <p className={[styles.mono, styles.hash].join(' ')}>{coverage.package_sha256}</p>
            <p className={styles.small}>docs/02-organized-question-bank.md — not the raw transcripts. {coverage.reviewed_call_records} records from the reviewed call (family V).</p>
          </section>
        </div>
      </Sheet>
    </div>
  );
}
