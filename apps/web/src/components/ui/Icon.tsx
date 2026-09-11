import type { CSSProperties, SVGAttributes } from 'react';
import type { Icon as PhosphorIcon, IconWeight as PhosphorWeight } from '@phosphor-icons/react/dist/lib/types';
import { ApproximateEquals } from '@phosphor-icons/react/dist/ssr/ApproximateEquals';
import { ArrowClockwise } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { ArrowDown } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowElbowDownRight } from '@phosphor-icons/react/dist/ssr/ArrowElbowDownRight';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowUp } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { ArrowsLeftRight } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { Article } from '@phosphor-icons/react/dist/ssr/Article';
import { BookmarkSimple } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ChatCircle } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Circle } from '@phosphor-icons/react/dist/ssr/Circle';
import { CircleDashed } from '@phosphor-icons/react/dist/ssr/CircleDashed';
import { CircleHalf } from '@phosphor-icons/react/dist/ssr/CircleHalf';
import { Clock } from '@phosphor-icons/react/dist/ssr/Clock';
import { ClockCounterClockwise } from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import { Columns } from '@phosphor-icons/react/dist/ssr/Columns';
import { Diamond } from '@phosphor-icons/react/dist/ssr/Diamond';
import { DotsThree } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { Empty } from '@phosphor-icons/react/dist/ssr/Empty';
import { Eye } from '@phosphor-icons/react/dist/ssr/Eye';
import { Flag } from '@phosphor-icons/react/dist/ssr/Flag';
import { GearSix } from '@phosphor-icons/react/dist/ssr/GearSix';
import { Hash } from '@phosphor-icons/react/dist/ssr/Hash';
import { Hourglass } from '@phosphor-icons/react/dist/ssr/Hourglass';
import { House } from '@phosphor-icons/react/dist/ssr/House';
import { Info } from '@phosphor-icons/react/dist/ssr/Info';
import { Lightning } from '@phosphor-icons/react/dist/ssr/Lightning';
import { ListBullets } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { LockSimple } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Microphone } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Moon } from '@phosphor-icons/react/dist/ssr/Moon';
import { MusicNote } from '@phosphor-icons/react/dist/ssr/MusicNote';
import { Pause } from '@phosphor-icons/react/dist/ssr/Pause';
import { PencilSimple } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Phone } from '@phosphor-icons/react/dist/ssr/Phone';
import { PhoneDisconnect } from '@phosphor-icons/react/dist/ssr/PhoneDisconnect';
import { Play } from '@phosphor-icons/react/dist/ssr/Play';
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus';
import { Prohibit } from '@phosphor-icons/react/dist/ssr/Prohibit';
import { PushPin } from '@phosphor-icons/react/dist/ssr/PushPin';
import { Question } from '@phosphor-icons/react/dist/ssr/Question';
import { Record } from '@phosphor-icons/react/dist/ssr/Record';
import { SealCheck } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Sparkle } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { SquaresFour } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { Star } from '@phosphor-icons/react/dist/ssr/Star';
import { Sun } from '@phosphor-icons/react/dist/ssr/Sun';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { Timer } from '@phosphor-icons/react/dist/ssr/Timer';
import { User } from '@phosphor-icons/react/dist/ssr/User';
import { Voicemail } from '@phosphor-icons/react/dist/ssr/Voicemail';
import { WarningCircle } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { Waveform } from '@phosphor-icons/react/dist/ssr/Waveform';
import { X } from '@phosphor-icons/react/dist/ssr/X';

/**
 * The kit's icon vocabulary (DESIGN_SYSTEM §2 `Icon`), backed by Phosphor. Screens address icons by
 * these names only, never by a Phosphor component, so the set can change without churning screens.
 * The SSR build is used on purpose: it carries no context hook, so the same component renders in
 * server and client components alike.
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
  | 'arrow-down'
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
  | 'moon'
  | 'pin'
  | 'diamond'
  | 'circle'
  | 'circle-half'
  | 'circle-dashed'
  | 'empty'
  | 'hash'
  | 'question'
  | 'warning'
  | 'approx'
  | 'hourglass'
  | 'eye'
  | 'undo'
  | 'redo'
  | 'edit'
  | 'home'
  | 'grid'
  | 'columns'
  | 'swap'
  | 'timer'
  | 'music'
  | 'branch'
  | 'record'
  | 'chat'
  | 'seal-check'
  | 'lightning';

/** The three weights the kit uses: `fill` for hero and tab icons, `bold` for small status marks, `regular` elsewhere. */
export type IconWeight = Extract<PhosphorWeight, 'regular' | 'bold' | 'fill'>;

const ICONS: Record<IconName, PhosphorIcon> = {
  phone: Phone,
  'phone-off': PhoneDisconnect,
  pause: Pause,
  play: Play,
  next: ArrowRight,
  prev: ArrowLeft,
  target: Target,
  script: Article,
  person: User,
  list: ListBullets,
  clock: Clock,
  check: Check,
  x: X,
  info: Info,
  bookmark: BookmarkSimple,
  spark: Sparkle,
  mic: Microphone,
  wave: Waveform,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  chevron: CaretRight,
  'chevron-down': CaretDown,
  search: MagnifyingGlass,
  plus: Plus,
  flag: Flag,
  ban: Prohibit,
  calendar: CalendarBlank,
  star: Star,
  refresh: ArrowsClockwise,
  gear: GearSix,
  voicemail: Voicemail,
  shield: ShieldCheck,
  lock: LockSimple,
  more: DotsThree,
  history: ClockCounterClockwise,
  sun: Sun,
  moon: Moon,
  pin: PushPin,
  diamond: Diamond,
  circle: Circle,
  'circle-half': CircleHalf,
  'circle-dashed': CircleDashed,
  empty: Empty,
  hash: Hash,
  question: Question,
  warning: WarningCircle,
  approx: ApproximateEquals,
  hourglass: Hourglass,
  eye: Eye,
  undo: ArrowCounterClockwise,
  redo: ArrowClockwise,
  edit: PencilSimple,
  home: House,
  grid: SquaresFour,
  columns: Columns,
  swap: ArrowsLeftRight,
  timer: Timer,
  music: MusicNote,
  branch: ArrowElbowDownRight,
  record: Record,
  chat: ChatCircle,
  'seal-check': SealCheck,
  lightning: Lightning,
};

export const ICON_NAMES: readonly IconName[] = Object.keys(ICONS) as IconName[];

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Rendered size in px. The kit uses 20 / 24 / 28 / 72. */
  size?: number;
  /** Accessible name; omit for decorative icons (rendered `aria-hidden`). */
  label?: string;
  /** `regular` (default), `bold` for small marks, `fill` for the hero and active tab. */
  weight?: IconWeight;
  /**
   * Compatibility with the retired stroke set: a thick stroke (≥ 2.25 on the old 24 grid) maps to
   * `bold`. Prefer `weight`.
   */
  strokeWidth?: number;
}

/**
 * One icon from the kit set, `currentColor`, decorative unless `label` is given. Never an icon
 * font, never an emoji or a unicode glyph standing in for an icon.
 */
export function Icon({ name, size = 24, label, weight, strokeWidth, className, style, ...rest }: IconProps) {
  const Component = ICONS[name];
  const resolvedWeight: IconWeight = weight ?? (strokeWidth !== undefined && strokeWidth >= 2.25 ? 'bold' : 'regular');
  const merged: CSSProperties = { flexShrink: 0, ...style };
  return (
    <Component
      size={size}
      weight={resolvedWeight}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={className}
      style={merged}
      data-icon={name}
      {...rest}
    />
  );
}

export interface GlyphSpec {
  name: IconName;
  weight: IconWeight;
}

/**
 * Screens and seeds still describe status marks as a single character (`◐`, `✦`, `⊘`, `✓`, `∅`).
 * On the stage those characters are never drawn as text: every known character resolves to an icon
 * from the set. Unknown strings (a count such as "1,449") fall back to text.
 */
const GLYPH_ICONS: Readonly<Record<string, GlyphSpec>> = {
  '◐': { name: 'circle-half', weight: 'fill' },
  '◑': { name: 'circle-half', weight: 'fill' },
  '✦': { name: 'spark', weight: 'fill' },
  '✧': { name: 'spark', weight: 'regular' },
  '⊘': { name: 'ban', weight: 'bold' },
  '◔': { name: 'hourglass', weight: 'fill' },
  '∅': { name: 'empty', weight: 'bold' },
  '✓': { name: 'check', weight: 'bold' },
  '✔': { name: 'check', weight: 'bold' },
  '✗': { name: 'x', weight: 'bold' },
  '✕': { name: 'x', weight: 'bold' },
  '🔒': { name: 'lock', weight: 'fill' },
  '🔍': { name: 'search', weight: 'bold' },
  '↺': { name: 'undo', weight: 'bold' },
  '↻': { name: 'redo', weight: 'bold' },
  '◌': { name: 'circle-dashed', weight: 'bold' },
  '○': { name: 'circle', weight: 'regular' },
  '●': { name: 'circle', weight: 'fill' },
  '◉': { name: 'eye', weight: 'fill' },
  '◎': { name: 'target', weight: 'regular' },
  '≈': { name: 'approx', weight: 'bold' },
  '#': { name: 'hash', weight: 'bold' },
  '!': { name: 'warning', weight: 'fill' },
  '?': { name: 'question', weight: 'bold' },
  '▣': { name: 'grid', weight: 'fill' },
  '◫': { name: 'columns', weight: 'regular' },
  '⌂': { name: 'home', weight: 'fill' },
  '≡': { name: 'list', weight: 'bold' },
  '→': { name: 'arrow-right', weight: 'bold' },
  '⇢': { name: 'arrow-right', weight: 'regular' },
  '←': { name: 'arrow-left', weight: 'bold' },
  '↑': { name: 'arrow-up', weight: 'bold' },
  '↓': { name: 'arrow-down', weight: 'bold' },
  '✎': { name: 'edit', weight: 'fill' },
  '⇄': { name: 'swap', weight: 'bold' },
  '⇆': { name: 'swap', weight: 'bold' },
  '▶': { name: 'play', weight: 'fill' },
  '⏸': { name: 'pause', weight: 'fill' },
  '⏺': { name: 'record', weight: 'fill' },
  '⏱': { name: 'timer', weight: 'fill' },
  '♪': { name: 'music', weight: 'fill' },
  '◷': { name: 'history', weight: 'bold' },
  '↳': { name: 'branch', weight: 'bold' },
  '…': { name: 'more', weight: 'bold' },
  '◇': { name: 'diamond', weight: 'regular' },
  '◆': { name: 'diamond', weight: 'fill' },
  '⌖': { name: 'pin', weight: 'fill' },
  'ⓘ': { name: 'info', weight: 'fill' },
  '☏': { name: 'phone', weight: 'fill' },
  '☎': { name: 'phone', weight: 'fill' },
  '★': { name: 'star', weight: 'fill' },
  '☆': { name: 'star', weight: 'regular' },
  '⚑': { name: 'flag', weight: 'fill' },
  '⚡': { name: 'lightning', weight: 'fill' },
};

/** Resolve a status character to an icon from the set, or `null` when it has no icon (render as text). */
export function glyphIcon(glyph: string): GlyphSpec | null {
  return GLYPH_ICONS[glyph.trim()] ?? null;
}

/** True for the "nothing here" dash placeholders, which the stage renders as words, never as a dash. */
export function isDashGlyph(glyph: string): boolean {
  const g = glyph.trim();
  return g === '—' || g === '–' || g === '-' || g === '';
}

export interface GlyphProps {
  /** A status character, or an icon name. */
  glyph: string | IconName;
  size?: number;
  /** Override the mapped weight. */
  weight?: IconWeight;
  className?: string;
}

/**
 * Decorative status mark: an icon when the character (or name) is known, otherwise the text itself.
 * Dash placeholders render nothing (the caller prints the word). Always `aria-hidden`: the meaning
 * lives in the parent's accessible name.
 */
export function Glyph({ glyph, size = 14, weight, className }: GlyphProps) {
  if (isDashGlyph(glyph)) return null;
  const spec = Object.hasOwn(ICONS, glyph) ? { name: glyph as IconName, weight: weight ?? 'bold' } : glyphIcon(glyph);
  if (spec) return <Icon name={spec.name} weight={weight ?? spec.weight} size={size} className={className} />;
  return (
    <span aria-hidden="true" className={className} data-glyph-text="">
      {glyph}
    </span>
  );
}
