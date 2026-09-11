/**
 * Apohenia UI kit v2 ("Arena") — see docs/DESIGN_SYSTEM.md §2.
 * Every screen imports only from here. The v1 kit (Badge, Button, Dialog, EmptyState, Field,
 * PageHeader, Select, Tabs, Stack/Inline) is gone — no route renders it anymore.
 */

// ---- v2 kit ----
export { Stage, type StageProps } from './Stage';
export { TabBar } from './TabBar';
export { TopBar, type TopBarProps } from './TopBar';
export { DemoPill, FictionalPill, GlyphPill, NotAssessedGlyph, StatusGlyph, type GlyphPillProps, type PillTone } from './Pill';
export { HeroButton, type HeroButtonProps, type HeroState } from './HeroButton';
export { Ring, type RingProps, type RingVariant } from './Ring';
export { Stat, type StatProps } from './Stat';
export { Tile, TileGrid, type TileProps, type TileTone } from './Tile';
export { Chip, type ChipProps, type ChipTone } from './Chip';
export { Card, type CardProps } from './Card';
export { Sheet, type SheetProps } from './Sheet';
export { Avatar, hueFromName, initialsOf, type AvatarProps } from './Avatar';
export { LineCard, type LineCardProps } from './LineCard';
export { SlotLine, type SlotLineProps } from './SlotLine';
export { WordCard, WORD_PROVENANCE_GLYPH, type WordCardProps, type WordProvenance, type WordReference } from './WordCard';
export { RefCard, REF_MEANING_GLYPH, type RefCardProps, type RefMeaningStatus } from './RefCard';
export { Icon, type IconName, type IconProps } from './Icon';
export { ICON_PATHS } from './icons';
export { IconButton, type IconButtonProps, type IconButtonTone } from './IconButton';
export { Toast, useToast, type ToastMessage, type ToastProps } from './Toast';
export { VisuallyHidden, type VisuallyHiddenProps } from './VisuallyHidden';
