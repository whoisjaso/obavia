import type { SVGAttributes } from 'react';
import { FILLED_ICONS, ICON_PATHS, type IconName } from './icons';

export type { IconName } from './icons';

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Rendered size in px (24 grid). */
  size?: number;
  /** Accessible name; omit for decorative icons (rendered `aria-hidden`). */
  label?: string;
  /** Stroke width on the 24 grid (defaults to 1.75). */
  strokeWidth?: number;
}

/**
 * Inline SVG icon from the design-system set. Uses `currentColor` so it takes the parent's ink.
 * Decorative by default; pass `label` to expose it as an image.
 */
export function Icon({ name, size = 24, label, strokeWidth = 1.75, className, style, ...rest }: IconProps) {
  const filled = FILLED_ICONS.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 1 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={className}
      style={{ flexShrink: 0, ...style }}
      {...rest}
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
