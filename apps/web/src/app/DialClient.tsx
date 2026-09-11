'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ScriptNode, ScriptVersion, SyntheticProspectsSeed, Transcript } from '@apohenia/domain/schemas';
import { DialHistory, DialPrefs, DialSession, DialSuppressionList, type SessionHistoryEntry } from '@apohenia/domain/schemas';
import {
  COOLDOWN_MS,
  RUNNING_STATUSES,
  armingCount,
  buildQueue,
  countdownRemaining,
  currentCall,
  formatClock,
  initialSession,
  nextUp,
  pickTranscript,
  playbackSchedule,
  playedTurns,
  policyGlyph,
  reduce,
  simulateDial,
  type DialContext,
  type DialEvent,
} from '@apohenia/domain/dialer';
import { Avatar, Card, Chip, FictionalPill, HeroButton, IconButton, Sheet, Stat, Tile, Toast, TopBar, useToast, type HeroState } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { formatPhone, localTimeIn } from './dial-lib';
import { InCall } from './InCall';
import { OutcomeSheet } from './OutcomeSheet';
import styles from './dial.module.css';

export interface DialClientProps {
  nodes: ScriptNode[];
  versions: ScriptVersion[];
  transcripts: Transcript[];
  prospects: SyntheticProspectsSeed;
}

const EMPTY_SESSION = initialSession([], 'demo');
const EMPTY_LIST: DialSuppressionList = [];
const EMPTY_HISTORY: DialHistory = [];
const DEFAULT_PREFS: DialPrefs = { playback_rate: 1 };
const TICK_MS = 100;

function nowIso(): string {
  return new Date().toISOString();
}

function newSessionId(): string {
  return `dial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Wall clock at 30-second resolution; null on the server and during hydration (no mismatch). */
function useNow(): number | null {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 30_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => null,
  );
}

/**
 * Owns the sequential session (reducer in @apohenia/domain/dialer) + the 100 ms tick, the demo
 * simulator hookup (ring → result → synthetic transcript), persistence (`dial.session`,
 * `dial.history`, `dial.suppression`) and the three surfaces: Dial stage, In-call, Outcome sheet.
 */
export function DialClient({ nodes, versions, transcripts, prospects }: DialClientProps) {
  const [session, setSession, hydrated] = useStoredState('dial.session', DialSession, EMPTY_SESSION, { throttleMs: 500 });
  const [suppression, setSuppression] = useStoredState('dial.suppression', DialSuppressionList, EMPTY_LIST);
  const [, setHistory] = useStoredState('dial.history', DialHistory, EMPTY_HISTORY);
  const [prefs] = useStoredState('dial.prefs', DialPrefs, DEFAULT_PREFS);
  const [toast, showToast] = useToast();
  const [summary, setSummary] = useState<SessionHistoryEntry | null>(null);
  const [peek, setPeek] = useState(false);
  const now = useNow();

  const suppressedNumbers = useMemo(() => suppression.map((s) => s.phone), [suppression]);
  const ctx = useMemo<DialContext>(() => ({ mode: 'demo', suppressed: suppressedNumbers }), [suppressedNumbers]);
  const ctxRef = useRef(ctx);
  const sessionRef = useRef(session);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const archive = useCallback(
    (ended: DialSession) => {
      if (!ended.id || !ended.started_at) return;
      const entry: SessionHistoryEntry = {
        id: ended.id,
        mode: ended.mode,
        started_at: ended.started_at,
        ended_at: ended.ended_at ?? nowIso(),
        ended_reason: ended.ended_reason ?? 'user',
        stats: ended.stats,
        attempts: ended.attempts,
      };
      setHistory((prev) => [entry, ...prev.filter((h) => h.id !== entry.id)].slice(0, 50));
      if (ended.suppression.length > 0) {
        setSuppression((prev) => {
          const known = new Set(prev.map((s) => s.phone));
          return [...prev, ...ended.suppression.filter((s) => !known.has(s.phone))];
        });
      }
      setSummary(entry);
    },
    [setHistory, setSuppression],
  );

  /** Ref-backed dispatch: several events in one tick see each other's results; an ended session is archived and reset. */
  const dispatch = useCallback(
    (event: DialEvent) => {
      const prev = sessionRef.current;
      const next = reduce(prev, event, ctxRef.current);
      if (next === prev) return;
      if (next.status === 'ended' && next.id) {
        archive(next);
        const fresh = initialSession([], 'demo');
        sessionRef.current = fresh;
        setSession(fresh);
        return;
      }
      sessionRef.current = next;
      setSession(next);
    },
    [archive, setSession],
  );

  // ---- the tick: elapsed time, ringing → simulated result ----
  useEffect(() => {
    if (!RUNNING_STATUSES.has(session.status)) return;
    let last = performance.now();
    const id = setInterval(() => {
      const t = performance.now();
      const dt = t - last;
      last = t;
      const s = sessionRef.current;
      const at = nowIso();
      if (s.status === 'ringing') {
        const call = currentCall(s);
        if (call) {
          const sim = simulateDial(call.n - 1);
          if (s.elapsed_ms + dt >= sim.ring_ms) {
            const item = s.queue.find((q) => q.id === call.item_id);
            const transcript = sim.result === 'connected' && item ? pickTranscript(item, call.n - 1, transcripts) : null;
            dispatch({ type: 'TICK', ms: dt, at });
            dispatch({ type: 'DIAL_RESULT', result: sim.result, at, transcript_id: transcript?.call_id ?? null });
            return;
          }
        }
      }
      dispatch({ type: 'TICK', ms: dt, at });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [session.status, dispatch, transcripts]);

  // ---- derived ----
  const idleQueue = useMemo(() => buildQueue(prospects, { mode: 'demo', suppressed: suppressedNumbers }), [prospects, suppressedNumbers]);
  const view = session.status === 'ended' ? EMPTY_SESSION : session;
  const queue = view.status === 'idle' ? idleQueue : view.queue;
  const viewForNext = useMemo(() => (view.status === 'idle' ? { ...view, queue } : view), [view, queue]);
  const next = useMemo(() => nextUp(viewForNext, ctx), [viewForNext, ctx]);
  const call = currentCall(view);
  const callItem = call ? (view.queue.find((q) => q.id === call.item_id) ?? null) : null;
  const dialIndex = call ? call.n - 1 : 0;
  const transcript = useMemo(() => (call && callItem && call.dial_result === 'connected' ? pickTranscript(callItem, dialIndex, transcripts) : null), [call, callItem, dialIndex, transcripts]);
  const schedule = useMemo(() => (transcript ? playbackSchedule(transcript) : []), [transcript]);
  const talkMs = call?.talk_ms ?? 0;
  const played = useMemo(() => (transcript ? playedTurns(transcript, schedule, talkMs * prefs.playback_rate) : []), [transcript, schedule, talkMs, prefs.playback_rate]);
  const inCall = (view.status === 'connected' || (view.status === 'wrapup' && call?.dial_result === 'connected')) && callItem && call;
  const running = RUNNING_STATUSES.has(view.status);
  const queueEmpty = view.status === 'idle' && next === null;

  // ---- hero ----
  const heroState: HeroState = queueEmpty ? 'off' : view.status === 'idle' ? 'idle' : view.status === 'arming' ? 'arming' : view.status === 'dialing' ? 'dialing' : view.status === 'ringing' ? 'ringing' : view.status === 'cooldown' ? 'cooldown' : view.status === 'paused' ? 'paused' : 'off';
  const nextName = next ? `${next.contact}, ${next.company}` : '';
  const heroLabel: string =
    view.status === 'idle'
      ? queueEmpty
        ? 'Queue empty — nothing to dial'
        : `Start session: countdown, then a simulated call to ${nextName}. Demo mode; no real call is placed.`
      : view.status === 'arming'
        ? `Countdown ${armingCount(view)} to ${nextName}. Tap again or press Escape to cancel.`
        : view.status === 'dialing'
          ? `Dialing ${nextName} (simulated)`
          : view.status === 'ringing'
            ? `Ringing ${nextName} (simulated)`
            : view.status === 'cooldown'
              ? `Next call in ${Math.ceil((COOLDOWN_MS - view.elapsed_ms) / 1000)} seconds: ${nextName}. Tap to pause.`
              : view.status === 'paused'
                ? `Paused. Tap to resume${next ? ` with ${nextName}` : ''}.`
                : 'Call in progress';
  const caption = view.status === 'arming' ? 'Cancel' : view.status === 'dialing' ? 'Dialing' : view.status === 'ringing' ? 'Ringing' : view.status === 'cooldown' ? 'Next' : view.status === 'paused' ? 'Paused' : undefined;

  function onHero() {
    const s = sessionRef.current;
    const at = nowIso();
    switch (s.status) {
      case 'idle':
      case 'ended': {
        if (s.status === 'ended') archive(s);
        if (!next) return;
        dispatch({ type: 'START_SESSION', session_id: newSessionId(), queue: buildQueue(prospects, { mode: 'demo', suppressed: ctxRef.current.suppressed ?? [] }), at });
        return;
      }
      case 'arming':
        dispatch({ type: 'CANCEL_ARM', at });
        return;
      case 'cooldown':
        dispatch({ type: 'PAUSE', reason: 'user', at });
        return;
      case 'paused':
        dispatch({ type: 'RESUME', at });
        return;
      case 'dialing':
      case 'ringing':
        dispatch({ type: 'PAUSE', reason: 'user', at });
        return;
      default:
        return;
    }
  }

  function endSession() {
    dispatch({ type: 'END_SESSION', at: nowIso() });
  }

  // Esc cancels arming (global; in-call has its own map).
  useEffect(() => {
    if (view.status !== 'arming' && view.status !== 'cooldown') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      dispatch(view.status === 'arming' ? { type: 'CANCEL_ARM', at: nowIso() } : { type: 'PAUSE', reason: 'user', at: nowIso() });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view.status, dispatch]);

  // ---- live region text (state changes only) ----
  const live =
    view.status === 'arming'
      ? `Countdown to ${nextName}. Tap again or press Escape to cancel.`
      : view.status === 'dialing'
        ? `Dialing ${nextName}, simulated.`
        : view.status === 'ringing'
          ? 'Ringing.'
          : view.status === 'connected'
            ? `Connected to ${callItem?.contact ?? 'prospect'}, simulated call.`
            : view.status === 'wrapup'
              ? 'Call ended. Choose an outcome.'
              : view.status === 'cooldown'
                ? `Next: ${nextName || 'queue empty'}.`
                : view.status === 'paused'
                  ? 'Paused.'
                  : '';

  const localTime = next && now !== null ? localTimeIn(next.timezone, now) : null;
  const policy = next ? policyGlyph(next.policy_status) : null;

  return (
    <div className={styles.root} data-dial data-status={view.status} data-hydrated={hydrated ? 'true' : 'false'}>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-dial-live>
        {live}
      </div>

      {inCall ? (
        <InCall
          key={call.id}
          item={callItem}
          attempt={call}
          transcript={transcript}
          played={played}
          talkMs={talkMs}
          nodes={nodes}
          versions={versions}
          dimmed={view.status === 'wrapup'}
          onEnd={() => dispatch({ type: 'END_CALL', at: nowIso() })}
          onNotify={showToast}
        />
      ) : (
        <div className={styles.stage}>
          <TopBar
            center={running ? <span className={styles.timer} data-session-timer aria-label={`Session time ${formatClock(view.session_ms)}`}>{formatClock(view.session_ms)}</span> : null}
            right={
              <>
                <IconButton icon="list" label="Queue" href="/prospects" />
                <IconButton icon="history" label="History" href="/calls" />
              </>
            }
          />

          <div className={styles.stats} data-stats>
            <Stat value={view.stats.dials} icon="phone" name="Dials" />
            <Stat value={view.stats.talked} icon="target" name="Talks" />
            <Stat value={view.stats.next_steps} icon="next" name="Next steps" />
          </div>

          <div className={styles.heroArea}>
            {queueEmpty ? (
              <div className={styles.empty} data-queue-empty>
                <span className={styles.emptyGlyph} aria-hidden="true">
                  ∅
                </span>
                <span className={styles.emptyLabel}>Queue empty</span>
                <Tile icon="plus" label="Add prospects" href="/prospects" />
              </div>
            ) : (
              <HeroButton
                state={heroState}
                label={heroLabel}
                progress={countdownRemaining(view)}
                count={view.status === 'arming' ? armingCount(view) : undefined}
                caption={caption}
                onClick={onHero}
                aside={
                  view.status === 'cooldown' || view.status === 'paused' ? (
                    <IconButton icon="x" label="End session" tone="red" onClick={endSession} data-end-session />
                  ) : view.status === 'dialing' || view.status === 'ringing' ? (
                    <IconButton icon="x" label="End session" tone="red" onClick={endSession} data-end-session />
                  ) : null
                }
              />
            )}
          </div>

          {next ? (
            <Card onPress={() => setPeek(true)} name={`Next up: ${next.contact}, ${next.company}, ${next.city}. Open record.`} dense data-next-up data-contact-id={next.contact_id}>
              <div className={styles.nextRow}>
                <Avatar name={next.contact} size={48} />
                <div className={styles.nextText}>
                  <span className={styles.nextCompany} data-next-company>
                    {next.company}
                  </span>
                  <span className={styles.nextContact} data-next-contact>
                    {next.contact}
                  </span>
                  <span className={styles.nextMeta}>
                    <span>{next.city}</span>
                    {localTime ? (
                      <span className={[styles.localTime, localTime.withinHours ? styles.inHours : ''].join(' ').trim()} role="img" aria-label={localTime.name}>
                        <span aria-hidden="true">{localTime.withinHours ? '◔' : '◑'}</span> <span aria-hidden="true">{localTime.text}</span>
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {/* Outcome (required after any call). */}
      {view.status === 'wrapup' && call ? (
        <OutcomeSheet
          open
          contact={call.contact}
          suggested={call.dial_result}
          onChoose={(kind, callbackAt) => {
            dispatch({ type: 'DISPOSITION', kind, at: nowIso(), ...(callbackAt ? { callback_at: callbackAt } : {}) });
            if (kind === 'do_not_call') showToast('Suppressed · never dialed again', 'red');
          }}
        />
      ) : null}

      {/* Peek at the next record — no dial control inside. */}
      <Sheet open={peek && next !== null} onClose={() => setPeek(false)} title="Record" data-sheet="record">
        {next ? (
          <div className={styles.record}>
            <div className={styles.recordHead}>
              <Avatar name={next.contact} size={72} />
              <div>
                <span className={styles.recordName}>{next.contact}</span>
                <span className={styles.recordRole}>{next.role}</span>
                <span className={styles.recordCompany}>{next.location !== next.company ? `${next.company} · ${next.location}` : next.company}</span>
                <span className={styles.recordPlace}>
                  {next.city}, {next.state}
                </span>
              </div>
            </div>
            <div className={styles.recordMeta} role="group" aria-label="Local time and number">
              <span className={styles.recordFact} role="img" aria-label={localTime ? localTime.name : `Time zone ${next.timezone}`} data-record-local>
                <span className={styles.recordFactGlyph} aria-hidden="true">
                  {localTime?.withinHours ? '◔' : '◑'}
                </span>
                <span aria-hidden="true">{localTime ? localTime.text : '—'}</span>
              </span>
              <span className={styles.recordFact} role="img" aria-label={`Number ${next.phone} (fictional)`} data-record-phone={next.phone}>
                <span className={styles.recordFactGlyph} aria-hidden="true">
                  ☏
                </span>
                <span aria-hidden="true">{formatPhone(next.phone)}</span>
              </span>
            </div>
            <div className={styles.recordChips}>
              <FictionalPill />
              {policy ? <Chip static glyph={policy.glyph} label={policy.word} name={policy.name} tone={next.policy_status === 'allow' ? 'green' : next.policy_status === 'suppressed' ? 'red' : 'teal'} /> : null}
              <Chip static glyph={next.entrypoint === 'inbound' ? '↙' : '↗'} label={next.entrypoint} name={next.entrypoint === 'inbound' ? `Inbound: ${next.inbound_action ?? 'the prospect acted first'}` : 'Cold: no prior action from the prospect'} />
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* Session summary after End. */}
      <Sheet open={summary !== null} onClose={() => setSummary(null)} title="Session" data-sheet="summary">
        {summary ? (
          <div className={styles.summary}>
            <div className={styles.summaryStats}>
              <Stat value={summary.stats.dials} icon="phone" name="Dials" label="dials" size="lg" />
              <Stat value={summary.stats.talked} icon="target" name="Talks" label="talks" size="lg" />
              <Stat value={summary.stats.next_steps} icon="next" name="Next steps" label="next" size="lg" />
            </div>
            <div className={styles.summaryRow}>
              <Stat value={formatClock(summary.stats.talk_ms)} icon="wave" name="Talk time" />
              <Stat value={formatClock(summary.stats.session_ms)} icon="clock" name="Session time" />
            </div>
            <Tile icon="check" label="Done" tone="green" onClick={() => setSummary(null)} />
          </div>
        ) : null}
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}
