/**
 * Inline SVG icon paths on a 24×24 grid, 1.75px stroke, round caps/joins, `currentColor`.
 * No icon fonts, no emoji as UI (DESIGN_SYSTEM §2). Each entry is one or more path `d` strings;
 * `fill` entries are filled shapes (used sparingly, e.g. the empty-set glyph is text, not an icon).
 */
export type IconName =
  | 'phone'
  | 'phone-off'
  | 'pause'
  | 'play'
  | 'next'
  | 'prev'
  | 'target'
  | 'script'
  | 'person'
  | 'list'
  | 'clock'
  | 'check'
  | 'x'
  | 'info'
  | 'bookmark'
  | 'spark'
  | 'mic'
  | 'wave'
  | 'arrow-up'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron'
  | 'chevron-down'
  | 'search'
  | 'plus'
  | 'flag'
  | 'ban'
  | 'calendar'
  | 'star'
  | 'refresh'
  | 'gear'
  | 'voicemail'
  | 'shield'
  | 'lock'
  | 'more'
  | 'history'
  | 'sun'
  | 'moon';

export const ICON_PATHS: Record<IconName, string[]> = {
  phone: ['M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z'],
  /* the same handset, filled and turned 135° — the standard "call end" glyph (see ICON_TRANSFORMS) */
  'phone-off': ['M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z'],
  pause: ['M8 5v14', 'M16 5v14'],
  play: ['M7 4l13 8-13 8z'],
  next: ['M5 12h14', 'M13 6l6 6-6 6'],
  prev: ['M19 12H5', 'M11 6l-6 6 6 6'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12h.01'],
  script: ['M4 7h16', 'M4 12h16', 'M4 17h10'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  check: ['M5 12l5 5L20 7'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
  bookmark: ['M6 4h12v17l-6-4-6 4z'],
  spark: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M5.6 5.6l2.8 2.8', 'M15.6 15.6l2.8 2.8', 'M5.6 18.4l2.8-2.8', 'M15.6 8.4l2.8-2.8'],
  mic: ['M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z', 'M6 11a6 6 0 0 0 12 0', 'M12 17v4', 'M9 21h6'],
  wave: ['M3 12h2', 'M7 8v8', 'M11 5v14', 'M15 8v8', 'M19 12h2'],
  'arrow-up': ['M12 19V5', 'M6 11l6-6 6 6'],
  'arrow-left': ['M19 12H5', 'M11 18l-6-6 6-6'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  chevron: ['M9 6l6 6-6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  plus: ['M12 5v14', 'M5 12h14'],
  flag: ['M5 21V4', 'M5 4h12l-2 4 2 4H5'],
  ban: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M5.6 5.6l12.8 12.8'],
  calendar: ['M4 6h16v14H4z', 'M8 3v5', 'M16 3v5', 'M4 11h16'],
  star: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z'],
  refresh: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v5h-5'],
  gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  voicemail: ['M6 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M18 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M6 16h12'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  lock: ['M6 11h12v10H6z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  more: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
  history: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5', 'M12 7v5l3 2'],
  sun: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 2v2', 'M12 20v2', 'M2 12h2', 'M20 12h2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'],
};

/** Icons whose shape is filled rather than stroked. */
export const FILLED_ICONS: ReadonlySet<IconName> = new Set<IconName>(['play', 'star', 'bookmark', 'phone-off']);

/** Per-icon SVG transform applied to every path (the hang-up handset is the call handset rotated 135° about the grid center). */
export const ICON_TRANSFORMS: Readonly<Partial<Record<IconName, string>>> = { 'phone-off': 'rotate(135 12 12)' };
