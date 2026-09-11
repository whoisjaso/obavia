import type { ReactNode } from 'react';
import styles from './legacy.module.css';

export interface FieldProps {
  /** Id of the control; label/help/error are linked to it. */
  id: string;
  label: string;
  help?: string;
  error?: string;
  /** Render-prop: receives the ids to spread onto the control (`aria-describedby`, `aria-invalid`). */
  children: (control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode;
}

/** Label + control + help + error, all id-linked. Errors are announced via `aria-invalid` and text, not color alone. */
export function Field({ id, label, help, error, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, ...(error ? { 'aria-invalid': true as const } : {}) })}
      {help ? (
        <p id={helpId} className={styles.fieldHelp}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.fieldError} role="alert">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
