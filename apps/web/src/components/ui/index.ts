/**
 * Apohenia UI kit v2 ("Arena") — see docs/DESIGN_SYSTEM.md §2.
 * Every screen imports only from here. The `legacy/` block is the v1 kit kept solely for route
 * folders that have not been restyled yet; remove an export when its last importer is gone.
 */

// ---- v2 kit ----
export { Stage, type StageProps } from './Stage';
export { TabBar } from './TabBar';
export { TopBar, type TopBarProps } from './TopBar';
export { DemoPill, FictionalPill, GlyphPill, NotAssessedGlyph, type GlyphPillProps, type PillTone } from './Pill';
export { HeroButton, type HeroButtonProps, type HeroState } from './HeroButton';
export { Ring, type RingProps, type RingVariant } from './Ring';
export { Stat, type StatProps } from './Stat';
export { Tile, TileGrid, type TileProps, type TileTone } from './Tile';
export { Chip, type ChipProps, type ChipTone } from './Chip';
export { Card, type CardProps } from './Card';
export { Sheet, type SheetProps } from './Sheet';
export { Avatar, hueFromName, initialsOf, type AvatarProps } from './Avatar';
export { LineCard, type LineCardProps } from './LineCard';
export { WordCard, WORD_PROVENANCE_GLYPH, type WordCardProps, type WordProvenance } from './WordCard';
export { RefCard, REF_MEANING_GLYPH, type RefCardProps, type RefMeaningStatus } from './RefCard';
export { Icon, type IconName, type IconProps } from './Icon';
export { ICON_PATHS } from './icons';
export { IconButton, type IconButtonProps, type IconButtonTone } from './IconButton';
export { Toast, useToast, type ToastMessage, type ToastProps } from './Toast';
export { VisuallyHidden, type VisuallyHiddenProps } from './VisuallyHidden';

// ---- v1 compatibility (restyled dark; delete when no route imports them) ----
export { Badge, type BadgeProps, type BadgeVariant } from './legacy/Badge';
export { Button, type ButtonProps } from './legacy/Button';
export { Dialog, type DialogProps } from './legacy/Dialog';
export { EmptyState, type EmptyStateProps } from './legacy/EmptyState';
export { Field, type FieldProps } from './legacy/Field';
export { KeyboardHint, type KeyboardHintProps } from './legacy/KeyboardHint';
export { Inline, Stack, type InlineProps, type StackProps } from './legacy/Layout';
export { PageHeader, type PageHeaderProps } from './legacy/PageHeader';
export { Select, type SelectOption, type SelectProps } from './legacy/Select';
export { Tabs, type TabItem, type TabsProps } from './legacy/Tabs';
