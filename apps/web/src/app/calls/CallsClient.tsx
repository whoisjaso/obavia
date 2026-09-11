'use client';

import { useMemo, useState } from 'react';
import { DialHistory, type SessionHistoryEntry } from '@apohenia/domain/schemas';
import { formatClock, isDial } from '@apohenia/domain/dialer';
import { DISPOSITION_GLYPHS, outcomeGlyph } from '@apohenia/domain/vocabulary';
import { Avatar, Card, Chip, FictionalPill, Icon, IconButton, NotAssessedLabel, Ring, Sheet, Stat, StatusGlyph, TopBar, type IconName } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { formatDuration, formatWhen, historyTotals, type CallRow } from './review-lib';
import styles from './calls.module.css';

export interface CallsClientProps {
  calls: CallRow[];
}

const EMPTY_HISTORY: DialHistory = [];

function outcomeTone(glyph: string): 'green' | 'red' | 'teal' | 'neutral' {
  return glyph === '✓' ? 'green' : glyph === '⊘' ? 'red' : glyph === '◔' ? 'teal' : 'neutral';
}

/** Disposition marks that have no icon of their own in the status-character map. */
const DISPOSITION_ICON: Record<string, IconName> = { '◍': 'voicemail', '◈': 'person', '↻': 'refresh', '◎': 'target', '▣': 'calendar', '★': 'star', '✕': 'x', '⊘': 'ban', '○': 'circle' };

/**
 * History: sessions first (each a card with a talk ring, date, and three small numbers; tap opens
 * the attempt list) and only while at least one exists, then one card per synthetic call (Avatar,
 * contact, company, duration, outcome mark).
 */
export function CallsClient({ calls }: CallsClientProps) {
  const [history, , hydrated] = useStoredState('dial.history', DialHistory, EMPTY_HISTORY);
  const totals = useMemo(() => historyTotals(history), [history]);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const session = openSession ? (history.find((h) => h.id === openSession) ?? null) : null;

  const sessionCard = (h: SessionHistoryEntry) => {
    const when = formatWhen(h.ended_at);
    const ratio = h.stats.dials > 0 ? h.stats.talked / h.stats.dials : 0;
    return (
      <Card
        key={h.id}
        onPress={() => setOpenSession(h.id)}
        name={`Session ${when.name}: ${h.stats.dials} dials, ${h.stats.talked} talks, ${h.stats.next_steps} next steps, ${formatClock(h.stats.session_ms)} long. Open attempts.`}
        dense
        data-session-card
        data-session-id={h.id}
      >
        <div className={styles.row}>
          <Ring value={ratio} size={48} stroke={5} color="var(--green)">
            <span className={styles.ringNumber}>{h.stats.dials}</span>
          </Ring>
          <div className={styles.text}>
            <span className={styles.company}>{when.day}</span>
            <span className={styles.contact}>
              {when.time} · {formatClock(h.stats.session_ms)}
            </span>
          </div>
          <span className={styles.minis} aria-hidden="true">
            <span className={styles.mini}>
              <Icon name="target" size={14} weight="bold" className={styles.miniGlyph} />
              {h.stats.talked}
            </span>
            <span className={styles.mini}>
              <Icon name="arrow-right" size={14} weight="bold" className={styles.miniGlyph} />
              {h.stats.next_steps}
            </span>
          </span>
        </div>
      </Card>
    );
  };

  const callCard = (c: CallRow) => {
    const g = outcomeGlyph(c.outcome);
    return (
      <Card key={c.id} href={`/calls/${encodeURIComponent(c.id)}`} name={`${c.contact}, ${c.company}, ${formatDuration(c.duration_s)}. ${g.name}. Open review.`} dense data-call-card data-call-id={c.id} data-outcome={c.outcome}>
        <div className={styles.row}>
          <Avatar name={c.contact} size={48} />
          <div className={styles.text}>
            <span className={styles.company}>{c.contact}</span>
            <span className={styles.contact}>{c.company}</span>
            <span className={styles.meta}>
              <span className={styles.clock}>
                <Icon name="timer" size={13} weight="fill" /> {formatDuration(c.duration_s)}
              </span>
            </span>
          </div>
          <StatusGlyph glyph={g.glyph} label={g.word} name={g.name} tone={outcomeTone(g.glyph)} />
        </div>
      </Card>
    );
  };

  return (
    <div className={styles.root} data-history data-hydrated={hydrated ? 'true' : 'false'}>
      <TopBar
        title="History"
        right={
          <>
            <IconButton icon="calendar" label="Follow-ups" href="/pipeline" />
            <IconButton icon="list" label="Queue" href="/prospects" />
          </>
        }
      />

      {/* session numbers appear only once a session ended in this browser; until then one quiet caption, never a row of zeros */}
      {history.length > 0 ? (
        <div className={styles.stats} data-history-stats>
          <Stat value={totals.sessions} icon="history" name="Sessions" />
          <Stat value={totals.dials} icon="phone" name="Dials" />
          <Stat value={totals.talks} icon="target" name="Talks" />
        </div>
      ) : (
        <div className={styles.stats} data-history-stats data-history-empty>
          <NotAssessedLabel label="No sessions yet" name={hydrated ? 'No demo sessions have ended in this browser yet' : 'Reading sessions'} />
        </div>
      )}

      {history.length > 0 ? (
        <>
          <div className={styles.sectionHead}>
            <Chip static icon="circle-half" label="Sessions" name="Demo sessions ended in this browser" tone="neutral" />
          </div>
          <div className={styles.list} data-session-list>
            {history.map(sessionCard)}
          </div>
        </>
      ) : null}

      <div className={styles.sectionHead}>
        <Chip static icon="spark" label="Calls" name="Synthetic calls: authored transcripts, no real prospect, no audio" tone="purple" />
      </div>
      <div className={styles.list} data-call-list>
        {calls.map(callCard)}
      </div>

      {/* ---- session attempts ---- */}
      <Sheet open={session !== null} onClose={() => setOpenSession(null)} title="Session" tall data-sheet="session">
        {session ? (
          <div className={styles.session}>
            <div className={styles.sessionStats}>
              <Stat value={session.stats.dials} icon="phone" name="Dials" label="dials" size="lg" />
              <Stat value={session.stats.talked} icon="target" name="Talks" label="talks" size="lg" />
              <Stat value={session.stats.next_steps} icon="next" name="Next steps" label="next" size="lg" />
            </div>
            <div className={styles.sessionRow}>
              <Stat value={formatClock(session.stats.talk_ms)} icon="wave" name="Talk time" />
              <Stat value={formatClock(session.stats.session_ms)} icon="clock" name="Session time" />
            </div>
            <div className={styles.recordChips}>
              <Chip static icon="circle-half" label="demo" name="Demo session: synthetic prospects, no real calls were placed" tone="neutral" />
              <FictionalPill />
              <Chip static icon={session.ended_reason === 'queue_empty' ? 'empty' : session.ended_reason === 'checks_failed' ? 'ban' : 'phone-off'} label={session.ended_reason === 'queue_empty' ? 'queue empty' : session.ended_reason === 'checks_failed' ? 'checks failed' : 'ended'} name={`Session ended: ${session.ended_reason.replace('_', ' ')}`} />
            </div>
            <div className={styles.list} data-attempt-list>
              {session.attempts.filter(isDial).map((a) => {
                const g = a.disposition ? DISPOSITION_GLYPHS[a.disposition.kind] : null;
                const body = (
                  <div className={styles.row}>
                    <Avatar name={a.contact} size={40} />
                    <div className={styles.text}>
                      <span className={styles.company}>{a.contact}</span>
                      <span className={styles.contact}>
                        {a.company}
                        {a.talk_ms > 0 ? ` · ${formatClock(a.talk_ms)}` : ''}
                      </span>
                    </div>
                    {g ? <StatusGlyph icon={DISPOSITION_ICON[g.glyph] ?? 'circle'} label={g.word} name={g.name} tone={a.disposition?.kind === 'do_not_call' ? 'red' : a.disposition && ['meeting', 'qualified', 'callback'].includes(a.disposition.kind) ? 'green' : 'neutral'} /> : <StatusGlyph icon="circle-dashed" label="open" name="No disposition recorded" />}
                  </div>
                );
                return a.transcript_id ? (
                  <Card key={a.id} href={`/calls/${encodeURIComponent(a.transcript_id)}`} name={`Dial ${a.n}: ${a.contact}, ${a.company}. ${g?.name ?? 'No disposition'}. Open the synthetic call review.`} dense data-attempt-card data-attempt-id={a.id}>
                    {body}
                  </Card>
                ) : (
                  <Card key={a.id} dense data-attempt-card data-attempt-id={a.id} aria-label={`Dial ${a.n}: ${a.contact}, ${a.company}. ${g?.name ?? 'No disposition'}.`}>
                    {body}
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
