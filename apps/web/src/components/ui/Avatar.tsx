import styles from './Avatar.module.css';

export interface AvatarProps {
  /** Full name; initials and hue derive from it. */
  name: string;
  size?: 32 | 40 | 48 | 56 | 72;
  /** Announce the name (defaults to decorative — the name is usually printed beside it). */
  labelled?: boolean;
}

/** Stable 0–359 hue from a string (djb2). */
export function hueFromName(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i += 1) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** First letters of the first two words ("Dana Whitlock" → "DW"; "Unknown (switchboard only)" → "U"). */
export function initialsOf(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  const a = words[0]?.[0] ?? '?';
  const b = words[1]?.[0] ?? '';
  return `${a}${b}`.toUpperCase();
}

/** Initials in a colored circle; hue is a hash of the name so a prospect keeps their color everywhere. */
export function Avatar({ name, size = 48, labelled = false }: AvatarProps) {
  const hue = hueFromName(name);
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: `hsl(${hue} 45% 26%)`, color: `hsl(${hue} 90% 85%)` }}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? name : undefined}
      aria-hidden={labelled ? undefined : true}
      data-avatar
    >
      {initialsOf(name)}
    </span>
  );
}
