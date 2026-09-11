/**
 * Session stats derived from attempts. A connected call is not a conversation; a conversation is not
 * a next step (brief §9: statuses are not upgraded by inference).
 */
import type { Attempt, DispositionKind, SessionStats } from '../schemas/dialer';

/** Dispositions that count as "talked to the decision maker / a real conversation". */
export const TALKED_KINDS: ReadonlySet<DispositionKind> = new Set<DispositionKind>(['talked', 'meeting', 'qualified', 'no_fit', 'do_not_call']);

/** Dispositions that are an agreed next step. */
export const NEXT_STEP_KINDS: ReadonlySet<DispositionKind> = new Set<DispositionKind>(['callback', 'meeting', 'qualified']);

/** True when the attempt actually dialed (skips and cancellations before ringing are not dials). */
export function isDial(a: Attempt): boolean {
  return a.n > 0 && a.status !== 'skipped' && (a.dial_result !== null || a.status === 'dialing' || a.status === 'ringing');
}

export function computeStats(attempts: readonly Attempt[], sessionMs: number): SessionStats {
  let dials = 0;
  let connects = 0;
  let talked = 0;
  let next_steps = 0;
  let talk_ms = 0;
  for (const a of attempts) {
    if (!isDial(a)) continue;
    dials += 1;
    if (a.dial_result === 'connected') connects += 1;
    talk_ms += a.talk_ms;
    const kind = a.disposition?.kind;
    if (kind && TALKED_KINDS.has(kind)) talked += 1;
    if (kind && NEXT_STEP_KINDS.has(kind)) next_steps += 1;
  }
  return { dials, connects, talked, next_steps, talk_ms, session_ms: sessionMs };
}

export const EMPTY_STATS: SessionStats = { dials: 0, connects: 0, talked: 0, next_steps: 0, talk_ms: 0, session_ms: 0 };

/** mm:ss (or h:mm:ss past an hour) for timers. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
