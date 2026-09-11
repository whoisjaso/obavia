/**
 * Pure helpers for History and the read-only call replay. No React.
 */
import type { Fact } from '@apohenia/domain/vocabulary';
import type { CallOutcome } from '@apohenia/domain/vocabulary';
import type { DispositionKind, SessionHistoryEntry, VocabularyEvent } from '@apohenia/domain/schemas';
import type { WordProvenance } from '@/components/ui';

/** One row of the synthetic call list, computed on the server from the transcript + prospect seed. */
export interface CallRow {
  id: string;
  contact: string;
  company: string;
  duration_s: number;
  turns: number;
  outcome: CallOutcome;
  /** Listener fixtures ("L") vs the eight scenario calls ("A"–"H"): shown as a small chip. */
  tag: string;
}

/** Provenance glyph word for a WordCard: ● said · ◐ confirmed · ○ yours · ◌ hypothesis. */
export function wordProvenance(ev: Pick<VocabularyEvent, 'provenance'>): WordProvenance {
  switch (ev.provenance) {
    case 'prospect_said':
      return 'said';
    case 'seller_proposed_prospect_confirmed':
      return 'confirmed';
    case 'model_hypothesis':
      return 'hypothesis';
    default:
      return 'yours';
  }
}

/** The word the prospect set aside ("revenue" in "profit, not revenue"); the card renders `not <s>revenue</s>`. */
export function wordCorrection(ev: Pick<VocabularyEvent, 'correction_or_negation'>): string | undefined {
  return ev.correction_or_negation?.rejects;
}

/** Vocabulary facts ("{prospect_name}") → script known facts ("prospect_name"). */
export function toKnownFacts(facts: readonly Fact[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of facts) out[f.key.replace(/^\{|\}$/g, '')] = f.value;
  return out;
}

/** The "(Cedar Hollow Motors, fictional)" parenthetical every synthetic title carries — data, not invention. */
export function companyFromTitle(title: string): string | null {
  const m = /\(([^()]+?),\s*fictional\)/i.exec(title);
  return m?.[1]?.trim() ?? null;
}

/** "Synthetic call A — …" → "A"; "Listener fixture L3 — …" → "L3". */
export function tagFromTitle(title: string): string {
  const m = /^(?:Synthetic call|Listener fixture)\s+([A-Z]\d*)\b/.exec(title);
  return m?.[1] ?? '·';
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Short local date ("Sep 11") and time ("14:02") for a session card. */
export function formatWhen(iso: string): { day: string; time: string; name: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: iso, time: '', name: iso };
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return { day, time, name: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d) };
}

/** Totals across every ended session in `dial.history`. */
export function historyTotals(history: readonly SessionHistoryEntry[]): { sessions: number; dials: number; talks: number; next_steps: number } {
  return history.reduce(
    (acc, h) => ({ sessions: acc.sessions + 1, dials: acc.dials + h.stats.dials, talks: acc.talks + h.stats.talked, next_steps: acc.next_steps + h.stats.next_steps }),
    { sessions: 0, dials: 0, talks: 0, next_steps: 0 },
  );
}

export function isDispositionKind(v: unknown): v is DispositionKind {
  return typeof v === 'string' && ['no_answer', 'voicemail', 'gatekeeper', 'callback', 'talked', 'meeting', 'qualified', 'no_fit', 'do_not_call'].includes(v);
}
