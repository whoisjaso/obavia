import type { ElementType, ReactNode } from 'react';
import styles from './ui.module.css';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Element to render (defaults to span). */
  as?: ElementType;
}

/** Content available to assistive technology but not visible. */
export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps) {
  return <Tag className={styles.visuallyHidden}>{children}</Tag>;
}
