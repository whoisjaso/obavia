'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import styles from './Sheet.module.css';

export interface SheetProps {
  open: boolean;
  /** Called on Esc, backdrop tap, grabber tap or the close button. Ignored when `required` is true. */
  onClose: () => void;
  /** Accessible name. Shown as a small uppercase word row unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  /** A required sheet cannot be dismissed — one of its tiles must be chosen (e.g. the outcome). */
  required?: boolean;
  children: ReactNode;
  /** Tall sheet (up to 92dvh) for long lists like a transcript. */
  tall?: boolean;
  /** Test/automation hook. */
  'data-sheet'?: string;
}

/**
 * Bottom sheet on native `<dialog>`: `showModal()` makes the rest of the page inert and traps
 * focus; a grabber, `--r-sheet` top corners, slide-up over `--dur`, blurred backdrop, Esc closes,
 * focus returns to the opener. Wide screens (≥640px) center it at 560px.
 */
export function Sheet({ open, onClose, title, hideTitle, required, children, tall, 'data-sheet': dataSheet }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = (document.activeElement as HTMLElement | null) ?? null;
      el.showModal();
      // Move focus to the first focusable control inside the sheet (not the close button).
      const first = el.querySelector<HTMLElement>('[data-sheet-body] button, [data-sheet-body] a, [data-sheet-body] input, [data-sheet-body] textarea, [data-sheet-body] select, [data-sheet-body] [tabindex]');
      (first ?? el).focus();
    } else if (!open && el.open) {
      el.close();
      opener.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={[styles.sheet, tall ? styles.tall : ''].join(' ').trim()}
      aria-labelledby={titleId}
      data-sheet={dataSheet ?? title}
      onCancel={(e) => {
        e.preventDefault();
        if (!required) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !required) onClose();
      }}
    >
      <div className={styles.inner}>
        <button type="button" className={styles.grabber} aria-label={required ? `${title} — choose one` : `Close ${title}`} onClick={() => !required && onClose()} disabled={required}>
          <span aria-hidden="true" />
        </button>
        <div className={[styles.head, hideTitle ? styles.headHidden : ''].join(' ').trim()}>
          <h2 id={titleId} className={hideTitle ? 'sr-only' : styles.title}>
            {title}
          </h2>
          {!required ? <IconButton icon="x" label={`Close ${title}`} onClick={onClose} className={styles.close} /> : null}
        </div>
        <div className={styles.body} data-sheet-body>
          {children}
        </div>
      </div>
    </dialog>
  );
}
