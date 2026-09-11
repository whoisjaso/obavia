'use client';

import { useState } from 'react';
import { IconButton, Sheet } from '@/components/ui';
import styles from '../sources.module.css';

export interface OverlayRow {
  element: string;
  a_described: string;
  b_described: string;
}

/** ⓘ → the delivery-overlay reference (framework §11) as a sheet of dense rows. Client-only island on the record page. */
export function RecordInfo({ rows, note }: { rows: OverlayRow[]; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="info" label="Delivery overlay reference (framework §11)" onClick={() => setOpen(true)} data-open-overlay />
      <Sheet open={open} onClose={() => setOpen(false)} title="Delivery" data-sheet="overlay" tall>
        <div className={styles.sheetBody} data-delivery-overlay>
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
      </Sheet>
    </>
  );
}
