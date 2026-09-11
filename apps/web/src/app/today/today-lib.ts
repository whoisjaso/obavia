/**
 * Me (`/today`) — pure view helpers and stored shapes. Owner: M-me.
 * Nothing here scores the person: rings are completion evidence (a drill logged in Train, or a
 * mark you make yourself), never a streak or a grade.
 */
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import type { DrillKind, PracticeAttempt } from '@apohenia/domain/schemas';
import type { IconName } from '@/components/ui';

// ---------------------------------------------------------------------------------------
// Local day (A-5): the browser's own date, computed after hydration; the server date is only
// the pre-hydration fallback so the first paint matches.
// ---------------------------------------------------------------------------------------

/** yyyy-mm-dd in the browser's local time zone. */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function subscribeMinute(cb: () => void): () => void {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
}

/** Today's local day key; `fallback` (the server's UTC date) on the server and the first client paint. */
export function useLocalDay(fallback: string): string {
  return useSyncExternalStore(subscribeMinute, () => localDayKey(), () => fallback);
}

/** Short, human date for a day key ("Thu 11 Sep") without pulling in Intl surprises on the server. */
export function shortDay(dayKey: string, locale?: string): string {
  const [y, m, d] = dayKey.split('-').map((n) => Number(n));
  if (!y || !m || !d) return dayKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------------------
// Stored shapes
// ---------------------------------------------------------------------------------------

/** One local day: which rings the person marked, and whether it is a minimum-action day. */
export const DayRecord = z.object({
  done: z.record(z.string(), z.boolean()).default({}),
  minimum_day: z.boolean().default(false),
});
export type DayRecord = z.infer<typeof DayRecord>;
export const EMPTY_DAY: DayRecord = { done: {}, minimum_day: false };

/** Choices made on Today that the interview left open (A-2). `null` = not chosen, never a default. */
export const TodayPrefs = z.object({
  duration_minutes: z.number().int().positive().nullable().default(null),
});
export type TodayPrefs = z.infer<typeof TodayPrefs>;
export const EMPTY_PREFS: TodayPrefs = { duration_minutes: null };

export const EvidenceEntry = z.object({
  id: z.string(),
  /** Local day key the line was logged on. */
  date: z.string(),
  text: z.string(),
  source: z.enum(['preset', 'free']),
});
export type EvidenceEntry = z.infer<typeof EvidenceEntry>;
export const Evidence = z.array(EvidenceEntry);
export const NO_EVIDENCE: EvidenceEntry[] = [];

export function nextId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------------------
// Rings: Rehearse · Mock · Review (DESIGN_SYSTEM §3.6)
// ---------------------------------------------------------------------------------------

export type RingId = 'rehearse' | 'mock' | 'review';

export interface RingMeta {
  id: RingId;
  /** One word. */
  label: string;
  icon: IconName;
  color: string;
  /** Full sentence for the ⓘ sheet and accessible names. */
  evidence: string;
}

export const RINGS: readonly RingMeta[] = [
  { id: 'rehearse', label: 'Rehearse', icon: 'script', color: 'var(--green)', evidence: 'Exact wording said in full, or one transition completed — a drill logged in Train counts automatically.' },
  { id: 'mock', label: 'Mock', icon: 'phone', color: 'var(--teal)', evidence: 'One focused mock scenario completed to an agreed next step or a clean no-fit ending — a Mock logged in Train counts automatically.' },
  { id: 'review', label: 'Review', icon: 'history', color: 'var(--purple)', evidence: 'One conversation reviewed and one thing named to change. Nothing measures this yet; you mark it.' },
];

/** Attempts logged in Train on `day` (local), split into the two rings they feed. */
export function attemptsOn(attempts: readonly PracticeAttempt[], day: string): { rehearse: number; mock: number } {
  let rehearse = 0;
  let mock = 0;
  for (const a of attempts) {
    const d = new Date(a.started_at);
    if (Number.isNaN(d.getTime()) || localDayKey(d) !== day) continue;
    if (a.drill_kind === 'full_mock') mock += 1;
    else rehearse += 1;
  }
  return { rehearse, mock };
}

// ---------------------------------------------------------------------------------------
// Next drill: the interview's option → the Train tile it lands on (label + icon only).
// ---------------------------------------------------------------------------------------

export interface NextDrillMeta {
  kind: DrillKind;
  /** ≤2-word Train tile label. */
  tile: string;
  icon: IconName;
}

export const NEXT_DRILL_META: Record<string, NextDrillMeta> = {
  drill_opening_recall: { kind: 'exact_recall', tile: 'Recall', icon: 'script' },
  drill_transition: { kind: 'practice_this_moment', tile: 'Moment', icon: 'history' },
  drill_random_node: { kind: 'random_node_lookup', tile: 'Lookup', icon: 'search' },
  drill_mirror_duel: { kind: 'mirror_duel', tile: 'Mirror', icon: 'refresh' },
  drill_answer_category: { kind: 'branch_classification', tile: 'Branches', icon: 'flag' },
};

// ---------------------------------------------------------------------------------------
// Evidence presets: ≤3-word chip, the whole sentence as the logged line and accessible name.
// ---------------------------------------------------------------------------------------

export interface EvidencePreset {
  id: string;
  /** ≤3 words on the chip. */
  short: string;
  /** The evidence line as logged. */
  text: string;
}

export const PRESET_EVIDENCE: readonly EvidencePreset[] = [
  { id: 'clarified', short: 'Clarified vague', text: 'I clarified a vague answer without making assumptions' },
  { id: 'no_fit', short: 'Respected no-fit', text: 'I respected a no-fit case' },
  { id: 'one_question', short: 'One question', text: 'I asked one clear question at a time' },
  { id: 'ran_drill', short: 'Ran the drill', text: 'I ran the drill I said I would run' },
  { id: 'no_pause', short: 'No pause', text: 'I moved from an answer to the next question without a pause' },
  { id: 'approved_only', short: 'Approved only', text: 'I said only what is approved when asked about price or capability' },
];

/** Minutes shown on a chip: "20 min". */
export function minutesLabel(n: number): string {
  return `${n} min`;
}

/** yyyy-mm-dd of an ISO timestamp in local time (for the "endorsed on" chip). */
export function localDateOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : localDayKey(d);
}
