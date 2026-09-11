import type { ElementType, ReactNode } from 'react';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Element to render (defaults to span). */
  as?: ElementType;
}

/** Content available to assistive technology but not painted on the stage. */
export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}
