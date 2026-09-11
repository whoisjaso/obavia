'use client';

import { useState } from 'react';
import { Chip, GlyphPill, IconButton, Sheet } from '@/components/ui';
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
 * ⓘ → the record's provenance (source · section · family · character offsets · hash status) and the
 * delivery-overlay reference (framework §11) as a sheet. Ids and offsets are data, not stage UI.
 */
export function RecordInfo({ meta, rows, note }: { meta: RecordMeta; rows: OverlayRow[]; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="info" label="Record provenance: source, section, offsets, verification status, and the delivery overlay reference (framework §11)" onClick={() => setOpen(true)} data-open-overlay />
      <Sheet open={open} onClose={() => setOpen(false)} title="Record" data-sheet="overlay" tall>
        <div className={styles.sheetBody}>
          <div className={styles.row} data-record-provenance>
            <Chip static label={meta.sourceLabel} name={meta.sourceLabel} />
            <Chip static label={meta.sectionId} name={`Section ${meta.sectionId} — ${meta.sectionTitle}${meta.sectionNamedOnly ? ' (named only; no records supplied)' : ''}`} className={styles.mono} />
            <Chip static label={meta.family} name={`Family ${meta.family} — ${meta.familyLabel}`} className={styles.mono} />
          </div>
          <div className={styles.row}>
            <GlyphPill glyph={meta.hashVerified ? '✓' : '◔'} label={meta.hashVerified ? 'Verified' : 'Pending'} tone={meta.hashVerified ? 'green' : 'orange'} name={meta.excerptLabel} data-excerpt-label />
            <GlyphPill glyph="#" label={meta.offsets} tone="neutral" name={`Original characters ${meta.offsets} — ${meta.offsetConvention}`} className={styles.mono} data-offsets-chip />
          </div>
          <p className={styles.small}>
            {meta.excerptLength} code points{meta.lengthMatches ? '' : ' — length does not match the offsets; shown as supplied'} · line {meta.markdownLine}
            {meta.reviewedCall ? ' · reviewed call, ">>" turn markers, speakers not diarized' : ''}
          </p>
          <div data-delivery-overlay>
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
