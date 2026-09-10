'use client';

import Link from 'next/link';
import { useId, useMemo } from 'react';
import { z } from 'zod';
import type { SourceId, SourceSection, UseClassification } from '@apohenia/domain/schemas';
import type { SourceRow } from '@apohenia/domain/sources';
import { Badge, Button, Field, Select, Tabs, VisuallyHidden } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './sources.module.css';
import { filterRows, namedOnlyTitle } from './lib';

export interface OptionWithLabel {
  value: string;
  label: string;
}

export interface ClassificationOption {
  value: UseClassification;
  label: string;
  definition: string;
}

export interface SourcesClientProps {
  rows: SourceRow[];
  sections: Record<SourceId, SourceSection[]>;
  sourceDescriptions: Record<SourceId, string>;
  familyOptions: OptionWithLabel[];
  deliveryOptions: OptionWithLabel[];
  classificationOptions: ClassificationOption[];
  templateLabel: string;
}

const Filters = z.object({
  family: z.string(),
  classification: z.string(),
  delivery: z.string(),
  query: z.string(),
  section: z.object({ A: z.string(), B: z.string() }),
});
type Filters = z.infer<typeof Filters>;

const INITIAL: Filters = { family: '', classification: '', delivery: '', query: '', section: { A: '', B: '' } };

const SOURCES: readonly SourceId[] = ['A', 'B'];

function classificationVariant(c: UseClassification): 'neutral' | 'warning' {
  return c === 'adapt' ? 'neutral' : 'warning';
}

/** Source A / Source B are rendered in separate tab panels and are never merged into one list. */
export function SourcesClient({
  rows,
  sections,
  sourceDescriptions,
  familyOptions,
  deliveryOptions,
  classificationOptions,
  templateLabel,
}: SourcesClientProps) {
  const [filters, setFilters, hydrated] = useStoredState('sources.filters', Filters, INITIAL);
  const baseId = useId();
  const classificationById = useMemo(
    () => Object.fromEntries(classificationOptions.map((c) => [c.value, c])) as Record<UseClassification, ClassificationOption>,
    [classificationOptions],
  );

  // Shared filters (family / classification / delivery / query) apply to both sources; the
  // section filter is per source so a Source A section never silently empties the Source B tab.
  const shared = useMemo(
    () => filterRows(rows, { family: filters.family, classification: filters.classification, delivery: filters.delivery, query: filters.query }),
    [rows, filters.family, filters.classification, filters.delivery, filters.query],
  );
  const perSource = useMemo(() => {
    const out: Record<SourceId, SourceRow[]> = { A: [], B: [] };
    for (const r of shared) {
      if (filters.section[r.source] && r.section_id !== filters.section[r.source]) continue;
      out[r.source].push(r);
    }
    return out;
  }, [shared, filters.section]);
  const total = perSource.A.length + perSource.B.length;

  const anyFilter =
    filters.family !== '' ||
    filters.classification !== '' ||
    filters.delivery !== '' ||
    filters.query.trim() !== '' ||
    filters.section.A !== '' ||
    filters.section.B !== '';

  function update(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }
  function toggleSection(source: SourceId, id: string) {
    setFilters((prev) => ({ ...prev, section: { ...prev.section, [source]: prev.section[source] === id ? '' : id } }));
  }

  function renderPanel(source: SourceId) {
    const list = perSource[source];
    const sectionCounts = new Map<string, number>();
    for (const r of shared) if (r.source === source) sectionCounts.set(r.section_id, (sectionCounts.get(r.section_id) ?? 0) + 1);
    const headingId = `${baseId}-results-${source}`;
    return (
      <div data-source-panel={source}>
        <p className={styles.sourceIntro}>{sourceDescriptions[source]}</p>
        <div className={styles.panel}>
          <nav aria-label={`Source ${source} sections`} className={styles.sectionIndex}>
            <p className={styles.sectionIndexTitle}>Section index · Source {source}</p>
            <ul className={styles.sectionList}>
              {sections[source].map((s) => {
                const count = sectionCounts.get(s.id) ?? 0;
                if (!s.records_supplied) {
                  return (
                    <li key={s.id} className={styles.sectionNamedOnly} data-section-id={s.id} data-named-only>
                      <span className={styles.sectionId}>{s.id}</span>
                      <span className={styles.sectionTitle}>
                        <span>{namedOnlyTitle(s.title)}</span>
                        <Badge variant="warning">no records supplied</Badge>
                      </span>
                    </li>
                  );
                }
                const pressed = filters.section[source] === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={styles.sectionButton}
                      aria-pressed={pressed}
                      onClick={() => toggleSection(source, s.id)}
                      data-section-id={s.id}
                    >
                      <span className={styles.sectionId}>{s.id}</span>
                      <span className={styles.sectionTitle}>{s.title}</span>
                      <span className={styles.sectionCount} aria-label={`${count} of ${s.record_count} records`}>
                        {count}/{s.record_count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.resultsHeading}>
              Source {source} — {list.length} record{list.length === 1 ? '' : 's'}
              {filters.section[source] ? ` in ${filters.section[source]}` : ''}
            </h3>
            {list.length === 0 ? (
              <p className={styles.muted}>No Source {source} records match the current filters. Nothing is hidden for another reason.</p>
            ) : (
              <ol className={styles.results} aria-label={`Source ${source} results`}>
                {list.map((r) => {
                  const c = classificationById[r.use_classification];
                  return (
                    <li key={r.id} className={styles.row} data-record-id={r.id}>
                      <div className={styles.rowHead}>
                        <Link href={`/sources/${r.id}`} className={styles.rowLink}>
                          <span className={styles.rowId}>{r.id}</span> — {r.title}
                        </Link>
                        <Badge variant={classificationVariant(r.use_classification)} title={c?.definition}>
                          {c?.label ?? r.use_classification}
                        </Badge>
                        <span className={styles.rowMeta}>{familyOptions.find((f) => f.value === r.family)?.label ?? r.family}</span>
                      </div>
                      <div>
                        <div className={styles.templateLabel}>{templateLabel}</div>
                        <div className={styles.template}>{r.template}</div>
                      </div>
                      <div className={styles.rowFoot}>
                        <span>
                          Section <span className={styles.mono}>{r.section_id}</span> · {r.section_title}
                        </span>
                        <span>Delivery described: {r.delivery}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      <form className={styles.filters} role="search" aria-label="Search and filter source records" onSubmit={(e) => e.preventDefault()}>
        <Field id={`${baseId}-query`} label="Search" help="Matches id, title, normalized template and purpose.">
          {(control) => (
            <input
              {...control}
              type="search"
              className={styles.searchInput}
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="e.g. change, mirror, L07"
              autoComplete="off"
            />
          )}
        </Field>
        <Field id={`${baseId}-family`} label="Family">
          {(control) => (
            <Select
              {...control}
              value={filters.family}
              onChange={(e) => update({ family: e.target.value })}
              options={[{ value: '', label: 'All families' }, ...familyOptions]}
            />
          )}
        </Field>
        <Field id={`${baseId}-classification`} label="Classification">
          {(control) => (
            <Select
              {...control}
              value={filters.classification}
              onChange={(e) => update({ classification: e.target.value })}
              options={[{ value: '', label: 'All classifications' }, ...classificationOptions.map((c) => ({ value: c.value, label: c.value }))]}
            />
          )}
        </Field>
        <Field id={`${baseId}-delivery`} label="Delivery described">
          {(control) => (
            <Select
              {...control}
              value={filters.delivery}
              onChange={(e) => update({ delivery: e.target.value })}
              options={[{ value: '', label: 'All delivery cues' }, ...deliveryOptions]}
            />
          )}
        </Field>
        <Button variant="quiet" onClick={() => setFilters(INITIAL)} disabled={!anyFilter}>
          Clear filters
        </Button>
      </form>

      <p className={styles.status} role="status" aria-live="polite" data-results-status style={{ marginTop: 'var(--space-3)' }}>
        <span className={styles.statusCount}>
          {total} matching record{total === 1 ? '' : 's'}
        </span> · Source A {perSource.A.length} · Source B {perSource.B.length}
        {hydrated ? null : <VisuallyHidden> (restoring saved filters)</VisuallyHidden>}
      </p>

      <div className={styles.legend} style={{ margin: 'var(--space-4) 0' }} aria-label="Classification meanings">
        {classificationOptions.map((c) => (
          <div key={c.value} className={styles.legendItem}>
            <Badge variant={classificationVariant(c.value)}>{c.label}</Badge>
            <span>{c.definition}</span>
          </div>
        ))}
      </div>

      <Tabs
        label="Source"
        tabs={SOURCES.map((s) => ({ id: `source-${s}`, label: `Source ${s}`, content: renderPanel(s) }))}
      />
    </div>
  );
}
