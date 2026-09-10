import type { SelectHTMLAttributes } from 'react';
import styles from './ui.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
}

/** Native `<select>` styled with tokens. Pair with `Field` for label/help/error linkage. */
export function Select({ options, className, ...rest }: SelectProps) {
  const invalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true';
  return (
    <select className={[styles.select, invalid ? styles.selectInvalid : '', className ?? ''].join(' ').trim()} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
