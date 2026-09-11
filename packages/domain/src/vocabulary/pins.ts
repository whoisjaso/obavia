/**
 * Pin management for the THEIR WORDS strip (brief §7, scenario 36).
 *
 * - 3–7 pins by default (fewer when fewer candidates exist); three is not a hard maximum.
 * - Slots are stable: a pinned item keeps its position while new evidence arrives. A manual pin is
 *   never displaced; an auto-filled slot may be replaced in place by a clearly stronger candidate
 *   (the other slots do not move). Excluded/invalidated items drop out.
 * - Items the representative unpinned are never auto re-pinned.
 */
import type { PinState } from '../schemas/vocabulary';
import type { RankedCandidate } from './rank';

export const PIN_MIN = 3;
export const PIN_MAX = 7;
/** Auto-fill target; manual pins can extend the strip up to PIN_MAX. */
export const PIN_AUTO_FILL = 5;

export const EMPTY_PIN_STATE: PinState = { order: [], manual: [], unpinned: [] };

export interface ResolvedPins {
  state: PinState;
  pinned: RankedCandidate[];
  overflow: RankedCandidate[];
}

/** Merge persisted pin state with the current ranking. Pure; returns the next state. */
export function resolvePins(state: PinState, ranked: readonly RankedCandidate[]): ResolvedPins {
  const byId = new Map(ranked.filter((r) => r.eligible).map((r) => [r.event.id, r] as const));
  const unpinned = new Set(state.unpinned);
  const manual = new Set(state.manual.filter((id) => byId.has(id)));
  // Keep existing slots (drop anything no longer eligible or explicitly unpinned).
  const order = state.order.filter((id) => byId.has(id) && !unpinned.has(id));
  for (const id of manual) if (!order.includes(id) && order.length < PIN_MAX) order.push(id);
  // Fill free auto slots, then replace weaker auto slots in place.
  for (const cand of ranked) {
    const id = cand.event.id;
    if (!cand.eligible || order.includes(id) || unpinned.has(id)) continue;
    if (order.length < PIN_AUTO_FILL) {
      order.push(id);
      continue;
    }
    let weakestIndex = -1;
    let weakestScore = Number.POSITIVE_INFINITY;
    order.forEach((slotId, i) => {
      if (manual.has(slotId)) return;
      const slot = byId.get(slotId);
      if (slot && slot.score < weakestScore) {
        weakestScore = slot.score;
        weakestIndex = i;
      }
    });
    if (weakestIndex >= 0 && cand.score > weakestScore + 1) order[weakestIndex] = id;
  }
  const pinned = order.map((id) => byId.get(id)!).filter(Boolean);
  const pinnedIds = new Set(order);
  const overflow = ranked.filter((r) => r.eligible && !pinnedIds.has(r.event.id));
  return { state: { order, manual: Array.from(manual), unpinned: Array.from(unpinned) }, pinned, overflow };
}

export interface PinResult {
  state: PinState;
  ok: boolean;
  reason?: string;
}

/** Pin explicitly. Refuses beyond PIN_MAX; promoting an auto-pinned item keeps its slot. */
export function pinPhrase(state: PinState, eventId: string): PinResult {
  const unpinned = state.unpinned.filter((id) => id !== eventId);
  const manual = state.manual.includes(eventId) ? state.manual : [...state.manual, eventId];
  if (state.order.includes(eventId)) {
    return { state: { ...state, manual, unpinned }, ok: true };
  }
  if (state.order.length >= PIN_MAX) {
    return { state, ok: false, reason: `Maximum of ${PIN_MAX} pins: unpin one first` };
  }
  return { state: { order: [...state.order, eventId], manual, unpinned }, ok: true };
}

/** Unpin explicitly. Always allowed; the item is never auto re-pinned. */
export function unpinPhrase(state: PinState, eventId: string): PinResult {
  return {
    state: {
      order: state.order.filter((id) => id !== eventId),
      manual: state.manual.filter((id) => id !== eventId),
      unpinned: state.unpinned.includes(eventId) ? state.unpinned : [...state.unpinned, eventId],
    },
    ok: true,
  };
}

/** Human-readable count line: "4 of up to 7 pinned". */
export function pinCountLabel(pinnedCount: number, available: number): string {
  const cap = Math.min(PIN_MAX, Math.max(available, pinnedCount));
  return `${pinnedCount} of up to ${cap} pinned`;
}
