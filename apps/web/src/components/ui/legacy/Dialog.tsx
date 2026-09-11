'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './legacy.module.css';

export interface DialogProps {
  open: boolean;
  /** Called when the user presses Escape, clicks the backdrop, or a close action fires. */
  onClose: () => void;
  title: string;
  /** Short description read to screen readers and shown under the title. */
  description?: string;
  children?: ReactNode;
  /** Footer actions (buttons). */
  actions?: ReactNode;
}

/**
 * Accessible modal built on native `<dialog>`: `showModal()` makes the rest of the page inert,
 * traps focus, and closes on Escape. Focus moves into the dialog on open and returns to the
 * previously focused element on close.
 */
export function Dialog({ open, onClose, title, description, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Backdrop click: the target is the dialog element itself, not its content.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={styles.dialogInner}>
        <h2 id={titleId}>{title}</h2>
        {description ? <p id={descId}>{description}</p> : null}
        {children}
        {actions ? <div className={styles.dialogActions}>{actions}</div> : null}
      </div>
    </dialog>
  );
}
