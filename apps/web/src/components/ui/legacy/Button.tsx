import type { ButtonHTMLAttributes } from 'react';
import styles from './legacy.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `primary` for the single main action, `danger` for destructive actions, `quiet` for low-emphasis. */
  variant?: 'default' | 'primary' | 'danger' | 'quiet';
}

const variantClass = {
  default: '',
  primary: styles.buttonPrimary,
  danger: styles.buttonDanger,
  quiet: styles.buttonQuiet,
} as const;

/** Plain, keyboard-operable button. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({ variant = 'default', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={[styles.button, variantClass[variant], className ?? ''].join(' ').trim()} {...rest} />
  );
}
