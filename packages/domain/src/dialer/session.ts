/**
 * Sequential-session reducer (brief §9). Pure, deterministic, no timers: the host feeds TICK(ms)
 * and the wall-clock `at` strings; the reducer decides every transition.
 *
 * Invariants enforced here:
 *  - a session is human-started; demo never dials a phone; live refuses to start unless telephony
 *    is configured, the campaign/jurisdiction policy is reviewed and the sequential-session flag is on;
 *  - at most one active call; a new dial can never begin while a call is connected or undispositioned;
 *  - every dial is preceded by `precheck(item, ctx)` — re-run again at the moment the countdown ends;
 *  - wrap-up requires a disposition before the cooldown to the next record;
 *  - `do_not_call` writes a suppression entry; a suppressed number is never dialed again;
 *  - pause on user / inbound / disconnect / checks_failed; an active call is never dropped by a pause;
 *  - an exhausted queue ends the session cleanly (`queue_empty`).
 */
import type { Attempt, DialMode, DialResult, DialSession, DispositionKind, EndReason, PauseReason, QueueItem, SessionLogEntry } from '../schemas/dialer';
import { EMPTY_STATS, computeStats } from './stats';

export const ARM_MS = 3000;
export const DIAL_MS = 1200;
export const COOLDOWN_MS = 5000;
const LOG_CAP = 200;

export interface LiveGate {
  telephony_configured: boolean;
  policy_reviewed: boolean;
  sequential_session_flag: boolean;
}

export interface DialContext {
  mode: DialMode;
  /** Required when `mode === 'live'`. */
  live?: LiveGate;
  /** Durable suppression list (E.164) from earlier sessions. */
  suppressed?: readonly string[];
}

export type DialEvent =
  | { type: 'START_SESSION'; session_id: string; queue: readonly QueueItem[]; at: string }
  | { type: 'ARM'; at: string }
  | { type: 'TICK'; ms: number; at: string }
  | { type: 'CANCEL_ARM'; at: string }
  | { type: 'DIAL_RESULT'; result: DialResult; at: string; transcript_id?: string | null }
  | { type: 'END_CALL'; at: string }
  | { type: 'DISPOSITION'; kind: DispositionKind; callback_at?: string; at: string }
  | { type: 'PAUSE'; reason: PauseReason; at: string }
  | { type: 'RESUME'; at: string }
  | { type: 'END_SESSION'; at: string; reason?: EndReason }
  | { type: 'SKIP'; reason: string; at: string };

export interface Precheck {
  decision: 'allow' | 'deny' | 'requires_review';
  reasons: string[];
}

/** Statuses during which a call attempt is in flight (one at a time). */
export const CALL_STATUSES: ReadonlySet<DialSession['status']> = new Set(['dialing', 'ringing', 'connected', 'wrapup']);
/** Statuses during which the session clock runs. */
export const RUNNING_STATUSES: ReadonlySet<DialSession['status']> = new Set(['arming', 'dialing', 'ringing', 'connected', 'wrapup', 'cooldown', 'paused']);

export function initialSession(queue: readonly QueueItem[] = [], mode: DialMode = 'demo'): DialSession {
  return {
    id: null,
    status: 'idle',
    mode,
    started_at: null,
    ended_at: null,
    ended_reason: null,
    queue: [...queue],
    cursor: 0,
    attempts: [],
    suppression: [],
    elapsed_ms: 0,
    session_ms: 0,
    pause_reason: null,
    pause_requested: null,
    end_requested: false,
    refusal: null,
    log: [],
    stats: EMPTY_STATS,
  };
}

/** The live gate (brief §9): all three must hold before a live session may even start. */
export function liveGateReasons(ctx: DialContext): string[] {
  if (ctx.mode !== 'live') return [];
  const g = ctx.live;
  const reasons: string[] = [];
  if (!g?.telephony_configured) reasons.push('telephony not configured');
  if (!g?.policy_reviewed) reasons.push('campaign and jurisdiction policy not reviewed');
  if (!g?.sequential_session_flag) reasons.push('sequential session mode not enabled by admin policy');
  return reasons;
}

/** Attempts that count as "this number was dialed in this session". Cancelled/skipped do not. */
function wasAttempted(a: Attempt): boolean {
  return a.dial_result !== null || a.disposition !== null;
}

/**
 * Checks run immediately before every dial (and again when the countdown ends). Demo returns
 * `allow` with reason `demo` because no phone is dialed; live requires the gate AND a reviewed
 * contact policy for the record; suppressed numbers are denied in every mode.
 */
export function precheck(item: QueueItem, ctx: DialContext, session?: Pick<DialSession, 'suppression' | 'attempts'>): Precheck {
  const reasons: string[] = [];
  if (item.policy_status === 'suppressed') reasons.push('suppressed: opt-out on record');
  if (ctx.suppressed?.includes(item.phone)) reasons.push('suppressed: do-not-call list');
  if (session?.suppression.some((s) => s.phone === item.phone)) reasons.push('suppressed: do-not-call in this session');
  if (session?.attempts.some((a) => a.item_id === item.id && wasAttempted(a))) reasons.push('already attempted in this session');
  if (reasons.length > 0) return { decision: 'deny', reasons };
  if (ctx.mode === 'demo') return { decision: 'allow', reasons: ['demo'] };
  const gate = liveGateReasons(ctx);
  if (gate.length > 0) return { decision: 'deny', reasons: gate.map((r) => `live gate: ${r}`) };
  if (item.policy_status === 'requires_review') return { decision: 'requires_review', reasons: ['contact policy requires review'] };
  return { decision: 'allow', reasons: ['policy reviewed'] };
}

function log(state: DialSession, at: string, kind: SessionLogEntry['kind'], text: string): SessionLogEntry[] {
  const next = [...state.log, { at, kind, text }];
  return next.length > LOG_CAP ? next.slice(next.length - LOG_CAP) : next;
}

function withStats(state: DialSession): DialSession {
  return { ...state, stats: computeStats(state.attempts, state.session_ms) };
}

function currentAttempt(state: DialSession): Attempt | null {
  const last = state.attempts[state.attempts.length - 1];
  return last && last.n > 0 && !['done', 'cancelled', 'skipped'].includes(last.status) ? last : null;
}

/** The connected attempt, if any (the one-active-call invariant). */
export function activeCall(state: DialSession): Attempt | null {
  const a = currentAttempt(state);
  return a && (a.status === 'connected' || a.status === 'wrapup') ? a : null;
}

function updateAttempt(state: DialSession, patch: Partial<Attempt>): Attempt[] {
  const i = state.attempts.length - 1;
  const last = state.attempts[i];
  if (!last) return state.attempts;
  const next = [...state.attempts];
  next[i] = { ...last, ...patch };
  return next;
}

function skippedAttempt(state: DialSession, item: QueueItem, at: string, reasons: string[]): Attempt {
  return {
    id: `${state.id ?? 'session'}-s${state.attempts.length + 1}`,
    n: 0,
    item_id: item.id,
    phone: item.phone,
    contact: item.contact,
    company: item.company,
    started_at: at,
    status: 'skipped',
    dial_result: null,
    connected_at: null,
    ended_at: at,
    talk_ms: 0,
    disposition: null,
    transcript_id: null,
    skip_reasons: reasons,
  };
}

function endSession(state: DialSession, at: string, reason: EndReason): DialSession {
  let s = state;
  const inFlight = currentAttempt(s);
  if (inFlight && (inFlight.status === 'dialing' || inFlight.status === 'ringing')) {
    s = { ...s, attempts: updateAttempt(s, { status: 'cancelled', ended_at: at }) };
  }
  return withStats({
    ...s,
    status: 'ended',
    ended_at: at,
    ended_reason: reason,
    elapsed_ms: 0,
    pause_reason: null,
    pause_requested: null,
    end_requested: false,
    log: log(s, at, 'end', `Session ended (${reason.replace(/_/g, ' ')})`),
  });
}

/**
 * Arm the next dialable record at or after `from`, logging a skipped attempt for every record the
 * precheck refuses. Ends the session (`queue_empty`) when nothing remains.
 */
function armNext(state: DialSession, from: number, ctx: DialContext, at: string): DialSession {
  let s: DialSession = { ...state, cursor: from };
  while (s.cursor < s.queue.length) {
    const item = s.queue[s.cursor]!;
    const check = precheck(item, ctx, s);
    if (check.decision === 'allow') {
      return withStats({ ...s, status: 'arming', elapsed_ms: 0, pause_reason: null, log: log(s, at, 'arm', `Arming ${item.contact} · ${item.company}`) });
    }
    s = {
      ...s,
      attempts: [...s.attempts, skippedAttempt(s, item, at, check.reasons)],
      log: log(s, at, 'skip', `Skipped ${item.contact} · ${item.company}: ${check.reasons.join('; ')}`),
      cursor: s.cursor + 1,
    };
  }
  return endSession(s, at, 'queue_empty');
}

/** The countdown ended: re-run the checks and dial (or skip and re-arm). */
function beginDial(state: DialSession, ctx: DialContext, at: string): DialSession {
  const item = state.queue[state.cursor];
  if (!item) return endSession(state, at, 'queue_empty');
  if (activeCall(state)) return state; // one active call max — never start another
  const check = precheck(item, ctx, state);
  if (check.decision !== 'allow') {
    const s: DialSession = {
      ...state,
      attempts: [...state.attempts, skippedAttempt(state, item, at, check.reasons)],
      log: log(state, at, 'skip', `Checks failed for ${item.contact}: ${check.reasons.join('; ')}`),
    };
    return armNext(s, state.cursor + 1, ctx, at);
  }
  const n = state.attempts.filter((a) => a.n > 0).length + 1;
  const attempt: Attempt = {
    id: `${state.id ?? 'session'}-a${n}`,
    n,
    item_id: item.id,
    phone: item.phone,
    contact: item.contact,
    company: item.company,
    started_at: at,
    status: 'dialing',
    dial_result: null,
    connected_at: null,
    ended_at: null,
    talk_ms: 0,
    disposition: null,
    transcript_id: null,
    skip_reasons: [],
  };
  return withStats({
    ...state,
    status: 'dialing',
    elapsed_ms: 0,
    attempts: [...state.attempts, attempt],
    log: log(state, at, 'dial', `Dialing ${item.contact} · ${item.company} (${ctx.mode === 'demo' ? 'simulated' : 'live'})`),
  });
}

/** Pure reducer. Unknown or invalid events for the current status return the same state. */
export function reduce(state: DialSession, event: DialEvent, ctx: DialContext): DialSession {
  switch (event.type) {
    case 'START_SESSION': {
      if (state.status !== 'idle' && state.status !== 'ended') return state;
      const gate = liveGateReasons(ctx);
      if (gate.length > 0) {
        return { ...state, status: 'idle', refusal: { at: event.at, reasons: gate }, log: log(state, event.at, 'refuse', `Live session refused: ${gate.join('; ')}`) };
      }
      const fresh: DialSession = {
        ...initialSession(event.queue, ctx.mode),
        id: event.session_id,
        started_at: event.at,
        log: [{ at: event.at, kind: 'start', text: `Session started (${ctx.mode})` }],
      };
      return armNext(fresh, 0, ctx, event.at);
    }
    case 'ARM': {
      if (state.status !== 'cooldown') return state;
      return armNext(state, state.cursor, ctx, event.at);
    }
    case 'TICK': {
      if (!RUNNING_STATUSES.has(state.status)) return state;
      const ms = Math.max(0, event.ms);
      const s: DialSession = { ...state, elapsed_ms: state.elapsed_ms + ms, session_ms: state.session_ms + ms };
      switch (s.status) {
        case 'arming':
          return s.elapsed_ms >= ARM_MS ? beginDial(s, ctx, event.at) : s;
        case 'dialing':
          return s.elapsed_ms >= DIAL_MS ? { ...s, status: 'ringing', elapsed_ms: 0, attempts: updateAttempt(s, { status: 'ringing' }) } : s;
        case 'connected':
          return withStats({ ...s, attempts: updateAttempt(s, { talk_ms: (currentAttempt(s)?.talk_ms ?? 0) + ms }) });
        case 'cooldown':
          return s.elapsed_ms >= COOLDOWN_MS ? armNext(s, s.cursor, ctx, event.at) : s;
        default:
          return withStats(s);
      }
    }
    case 'CANCEL_ARM': {
      if (state.status !== 'arming') return state;
      return { ...state, status: 'paused', elapsed_ms: 0, pause_reason: 'user', log: log(state, event.at, 'cancel', 'Countdown cancelled') };
    }
    case 'DIAL_RESULT': {
      if (state.status !== 'dialing' && state.status !== 'ringing') return state;
      const a = currentAttempt(state);
      if (!a) return state;
      if (event.result === 'connected') {
        return withStats({
          ...state,
          status: 'connected',
          elapsed_ms: 0,
          attempts: updateAttempt(state, { status: 'connected', dial_result: 'connected', connected_at: event.at, transcript_id: event.transcript_id ?? null }),
          log: log(state, event.at, 'result', `Connected: ${a.contact}`),
        });
      }
      return withStats({
        ...state,
        status: 'wrapup',
        elapsed_ms: 0,
        attempts: updateAttempt(state, { status: 'wrapup', dial_result: event.result, ended_at: event.at }),
        log: log(state, event.at, 'result', `${event.result.replace(/_/g, ' ')}: ${a.contact}`),
      });
    }
    case 'END_CALL': {
      if (state.status !== 'connected') return state;
      return withStats({ ...state, status: 'wrapup', elapsed_ms: 0, attempts: updateAttempt(state, { status: 'wrapup', ended_at: event.at }), log: log(state, event.at, 'end_call', 'Call ended — disposition required') });
    }
    case 'DISPOSITION': {
      if (state.status !== 'wrapup') return state;
      const a = currentAttempt(state);
      if (!a) return state;
      const disposition = { kind: event.kind, at: event.at, ...(event.callback_at ? { callback_at: event.callback_at } : {}) };
      let s: DialSession = {
        ...state,
        attempts: updateAttempt(state, { status: 'done', disposition, ended_at: a.ended_at ?? event.at }),
        cursor: state.cursor + 1,
        log: log(state, event.at, 'disposition', `${event.kind.replace(/_/g, ' ')}: ${a.contact}`),
      };
      if (event.kind === 'do_not_call') {
        s = {
          ...s,
          suppression: [...s.suppression, { phone: a.phone, item_id: a.item_id, contact: a.contact, at: event.at, reason: 'do_not_call', session_id: s.id }],
          log: log(s, event.at, 'suppress', `Suppressed ${a.phone} (${a.contact}) — never dialed again`),
        };
      }
      if (s.end_requested) return endSession(s, event.at, 'user');
      if (s.pause_requested) {
        return withStats({ ...s, status: 'paused', elapsed_ms: 0, pause_reason: s.pause_requested, pause_requested: null, log: log(s, event.at, 'pause', `Paused (${s.pause_requested})`) });
      }
      return withStats({ ...s, status: 'cooldown', elapsed_ms: 0 });
    }
    case 'PAUSE': {
      switch (state.status) {
        case 'arming':
        case 'cooldown':
          return { ...state, status: 'paused', elapsed_ms: 0, pause_reason: event.reason, log: log(state, event.at, 'pause', `Paused (${event.reason})`) };
        case 'dialing':
        case 'ringing':
          return withStats({
            ...state,
            status: 'paused',
            elapsed_ms: 0,
            pause_reason: event.reason,
            attempts: updateAttempt(state, { status: 'cancelled', ended_at: event.at }),
            log: log(state, event.at, 'pause', `Dial cancelled, paused (${event.reason})`),
          });
        case 'connected':
        case 'wrapup':
          // Never drop an active call: sequencing pauses after the disposition.
          return { ...state, pause_requested: event.reason, log: log(state, event.at, 'pause', `Pause requested (${event.reason}) — applies after the disposition`) };
        default:
          return state;
      }
    }
    case 'RESUME': {
      if (state.status !== 'paused') return state;
      return armNext({ ...state, pause_reason: null, log: log(state, event.at, 'resume', 'Resumed') }, state.cursor, ctx, event.at);
    }
    case 'END_SESSION': {
      if (state.status === 'idle' || state.status === 'ended') return state;
      if (state.status === 'connected') {
        return withStats({ ...state, status: 'wrapup', elapsed_ms: 0, end_requested: true, attempts: updateAttempt(state, { status: 'wrapup', ended_at: event.at }), log: log(state, event.at, 'end_call', 'Call ended — disposition required before the session ends') });
      }
      if (state.status === 'wrapup') return { ...state, end_requested: true };
      return endSession(state, event.at, event.reason ?? 'user');
    }
    case 'SKIP': {
      if (state.status !== 'arming' && state.status !== 'cooldown' && state.status !== 'paused') return state;
      const item = state.queue[state.cursor];
      if (!item) return state;
      const s: DialSession = {
        ...state,
        attempts: [...state.attempts, skippedAttempt(state, item, event.at, [event.reason])],
        log: log(state, event.at, 'skip', `Skipped ${item.contact}: ${event.reason}`),
        cursor: state.cursor + 1,
      };
      return state.status === 'arming' ? armNext(s, s.cursor, ctx, event.at) : withStats(s);
    }
    default:
      return state;
  }
}

/** The record the hero refers to: the in-flight attempt's item, else the next record the checks allow. */
export function nextUp(state: DialSession, ctx: DialContext): QueueItem | null {
  const a = currentAttempt(state);
  if (a && CALL_STATUSES.has(state.status)) return state.queue.find((q) => q.id === a.item_id) ?? null;
  for (let i = state.cursor; i < state.queue.length; i += 1) {
    const item = state.queue[i]!;
    if (precheck(item, ctx, state).decision === 'allow') return item;
  }
  return null;
}

/** The attempt currently dialing/ringing/connected/in wrap-up, if any. */
export function currentCall(state: DialSession): Attempt | null {
  return currentAttempt(state);
}

/** 0–1 remaining fraction of the countdown in the current status (arming / cooldown), else 0. */
export function countdownRemaining(state: DialSession): number {
  const total = state.status === 'arming' ? ARM_MS : state.status === 'cooldown' ? COOLDOWN_MS : 0;
  if (total === 0) return 0;
  return Math.max(0, Math.min(1, 1 - state.elapsed_ms / total));
}

/** Seconds left on the arming countdown (3 → 2 → 1). */
export function armingCount(state: DialSession): number {
  if (state.status !== 'arming') return 0;
  return Math.max(1, Math.ceil((ARM_MS - state.elapsed_ms) / 1000));
}

/** Suppressed phone numbers from a session (for merging into the durable list). */
export function suppressedNumbers(state: Pick<DialSession, 'suppression'>): string[] {
  return [...new Set(state.suppression.map((s) => s.phone))];
}
