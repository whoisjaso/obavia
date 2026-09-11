'use client';

import { useState } from 'react';
import { GlyphPill, IconButton, Sheet } from '@/components/ui';
import styles from '../sources.module.css';

export interface OverlayRow {
  element: string;
  a_described: string;
  b_described: string;
}

export interface RecordMeta {
  /** "Source A" / "Source B". */
  sourceLabel: string;
  sectionId: string;
  sectionTitle: string;
  sectionNamedOnly: boolean;
  family: string;
  familyLabel: string;
  /** "[80241, 80817)" */
  offsets: string;
  offsetConvention: string;
  hashVerified: boolean;
  /** excerptLabel(record): the whole truth about verification. */
  excerptLabel: string;
  excerptLength: number;
  lengthMatches: boolean;
  markdownLine: number;
  reviewedCall: boolean;
}

/**
 * The info control opens the record's reference (source, section, family, character offsets, hash
 * status) and the delivery-overlay reference (framework §11) as a sheet. Ids and offsets are data, not stage UI.
 */
export function RecordInfo({ meta, rows, note }: { meta: RecordMeta; rows: OverlayRow[]; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="info" label="Record provenance: source, section, offsets, verification status, and the delivery overlay reference (framework §11)" onClick={() => setOpen(true)} data-open-overlay />
      <Sheet open={open} onClose={() => setOpen(false)} title="Record" data-sheet="overlay" tall>
        <div className={styles.sheetBody}>
          <section aria-labelledby="ref-caption" data-record-provenance>
            <h3 id="ref-caption" className={styles.caption}>
              Reference
            </h3>
            <dl className={styles.refRows}>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Source</dt>
                <dd className={styles.refValue}>{meta.sourceLabel}</dd>
              </div>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Section</dt>
                <dd className={styles.refValue}>
                  <span className={styles.refId}>{meta.sectionId}</span> {meta.sectionTitle}
                  {meta.sectionNamedOnly ? <span className={styles.small}> (named only; no records supplied)</span> : null}
                </dd>
              </div>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Family</dt>
                <dd className={styles.refValue}>
                  <span className={styles.refId}>{meta.family}</span> {meta.familyLabel}
                </dd>
              </div>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Characters</dt>
                <dd className={styles.refValue}>
                  <GlyphPill glyph="#" label={meta.offsets} tone="neutral" name={`Original characters ${meta.offsets}: ${meta.offsetConvention}`} className={styles.mono} data-offsets-chip />
                </dd>
              </div>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Verified</dt>
                <dd className={styles.refValue}>
                  <GlyphPill glyph={meta.hashVerified ? '✓' : '◔'} label={meta.hashVerified ? 'Verified' : 'Pending'} tone={meta.hashVerified ? 'green' : 'orange'} name={meta.excerptLabel} data-excerpt-label />
                </dd>
              </div>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Length</dt>
                <dd className={styles.refValue}>
                  {meta.excerptLength} code points{meta.lengthMatches ? '' : '; length does not match the offsets, shown as supplied'}
                </dd>
              </div>
              <div className={styles.refRow}>
                <dt className={styles.refKey}>Line</dt>
                <dd className={styles.refValue}>{meta.markdownLine}</dd>
              </div>
              {meta.reviewedCall ? (
                <div className={styles.refRow}>
                  <dt className={styles.refKey}>Turns</dt>
                  <dd className={styles.refValue}>Reviewed call; turn markers kept, speakers not diarized</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <div className={styles.overlay} data-delivery-overlay>
            <h3 className={styles.caption}>Delivery overlay</h3>
            <p className={styles.small}>{note}</p>
            {rows.map((r) => (
              <div key={r.element} className={styles.overlayRow}>
                <h3 className={styles.caption}>{r.element}</h3>
                <div className={styles.overlayCols}>
                  <div>
                    <span className={styles.overlayKey}>A</span>
                    <p className={styles.body}>{r.a_described}</p>
                  </div>
                  <div>
                    <span className={styles.overlayKey}>B</span>
                    <p className={styles.body}>{r.b_described}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}
