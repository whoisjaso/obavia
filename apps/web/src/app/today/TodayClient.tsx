'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { IdentityProfile, InterviewSession, PracticeAttempt, type InterviewVersion } from '@apohenia/domain/schemas';
import { DURATION_CHOICES, isComplete, isProfileCurrent, planSettings, progress, selectedOption } from '@apohenia/domain/interview';
import { Card, Chip, Icon, IconButton, NotAssessedLabel, Ring, Sheet, Tile, TileGrid, Toast, TopBar, useToast, type IconName } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import {
  DayRecord,
  EMPTY_DAY,
  EMPTY_PREFS,
  Evidence,
  NEXT_DRILL_META,
  NO_EVIDENCE,
  PRESET_EVIDENCE,
  RINGS,
  TodayPrefs,
  attemptsOn,
  localDateOf,
  minutesLabel,
  nextId,
  shortDay,
  useLocalDay,
  type EvidenceEntry,
  type RingMeta,
} from './today-lib';
import styles from './today.module.css';

const SessionOrNull = InterviewSession.nullable();
const ProfileOrNull = IdentityProfile.nullable();
const Attempts = z.array(PracticeAttempt);
const EMPTY_ATTEMPTS: PracticeAttempt[] = [];

export interface TodayClientProps {
  version: InterviewVersion;
  /** Server date (UTC): only the pre-hydration fallback for the local day key (A-5). */
  serverDay: string;
}

/**
 * Me (DESIGN_SYSTEM §3.6): three rings for today (Rehearse · Mock · Review), a `min` chip for a
 * minimum-action day, then cards (Next drill to Train, Profile, Evidence) on a dark stage.
 * Reads the endorsed profile only while it still matches the interview session exactly (A-1);
 * otherwise it shows the empty state with one action tile.
 */
export function TodayClient({ version, serverDay }: TodayClientProps) {
  const day = useLocalDay(serverDay);
  const [session, , sessionHydrated] = useStoredState<InterviewSession | null>('interview.session', SessionOrNull, null);
  const [profile, , profileHydrated] = useStoredState<IdentityProfile | null>('interview.profile', ProfileOrNull, null);
  const [dayRec, setDayRec, dayHydrated] = useStoredState<DayRecord>(`today.${day}`, DayRecord, EMPTY_DAY);
  const [prefs, setPrefs, prefsHydrated] = useStoredState<TodayPrefs>('today.prefs', TodayPrefs, EMPTY_PREFS);
  const [evidence, setEvidence, evidenceHydrated] = useStoredState<EvidenceEntry[]>('today.evidence', Evidence, NO_EVIDENCE);
  const [attempts, , attemptsHydrated] = useStoredState<PracticeAttempt[]>('practice.attempts', Attempts, EMPTY_ATTEMPTS);
  const [sheet, setSheet] = useState<'none' | 'info' | 'journal'>('none');
  const [freeText, setFreeText] = useState('');
  const [live, setLive] = useState('');
  const [toast, showToast] = useToast();

  const hydrated = sessionHydrated && profileHydrated && dayHydrated && prefsHydrated && evidenceHydrated && attemptsHydrated;
  const current = hydrated && profile !== null && isProfileCurrent(profile, version, session);
  const logged = useMemo(() => attemptsOn(attempts, day), [attempts, day]);
  const todayEvidence = useMemo(() => evidence.filter((e) => e.date === day), [evidence, day]);
  const earlierEvidence = useMemo(() => evidence.filter((e) => e.date !== day), [evidence, day]);

  const topBar = (
    <TopBar
      center={
        <span className={styles.dayChip} data-local-day={day}>
          {shortDay(day)}
        </span>
      }
      right={
        <>
          <IconButton icon="wave" label="Insights" href="/insights" />
          <IconButton icon="gear" label="Settings" href="/settings" />
        </>
      }
    />
  );

  if (!hydrated) {
    return (
      <div className={styles.root} data-today data-hydrated="false">
        {topBar}
        <span className="sr-only" role="status">
          Reading today
        </span>
      </div>
    );
  }

  // ---- shared blocks: rings and evidence are completion evidence you mark, independent of the profile ----
  function doneFor(id: RingMeta['id'] | 'minimum'): { done: boolean; auto: boolean; count: number } {
    const count = id === 'rehearse' ? logged.rehearse : id === 'mock' ? logged.mock : 0;
    const auto = count > 0;
    return { done: auto || Boolean(dayRec.done[id]), auto, count };
  }

  function toggleRing(meta: RingMeta | { id: 'minimum'; label: string }) {
    const { done, auto } = doneFor(meta.id);
    if (auto) {
      showToast('Logged in Train');
      return;
    }
    setDayRec((prev) => ({ ...prev, done: { ...prev.done, [meta.id]: !done } }));
    setLive(`${meta.label}: ${done ? 'not yet' : 'done'}.`);
  }

  function toggleMinimumDay() {
    const next = !dayRec.minimum_day;
    setDayRec((prev) => ({ ...prev, minimum_day: next }));
    setLive(next ? 'Minimum-action day on: only the chosen minimum counts today. Progress is kept.' : 'Minimum-action day off.');
  }

  function addEvidence(text: string, source: EvidenceEntry['source']) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setEvidence((prev) => [{ id: nextId(), date: day, text: trimmed, source }, ...prev].slice(0, 500));
    showToast('Logged', 'green');
    setLive(`Evidence logged: ${trimmed}`);
  }

  function removeEvidence(id: string) {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  }

  const minimumDone = doneFor('minimum').done;
  const doneCount = RINGS.filter((meta) => doneFor(meta.id).done).length;
  const minimum = current && profile ? selectedOption(profile, version, 'difficult_day_minimum') : null;

  const ringsBlock = (
    <section className={styles.ringsBlock} aria-label="Today" data-rings>
      <div className={styles.ringsHead}>
        <Chip
          label="min"
          icon="circle-half"
          toggle
          selected={dayRec.minimum_day}
          tone="gold"
          name={dayRec.minimum_day ? 'Minimum-action day is on: only the chosen minimum counts today. Progress is kept; nothing is deducted. Tap to turn off.' : 'Minimum-action day: turn on when today is difficult. Only the chosen minimum counts; progress is kept; nothing is deducted.'}
          onClick={toggleMinimumDay}
          data-minimum-chip
        />
        <IconButton icon="info" label="About today's rings: completion evidence, not scores" onClick={() => setSheet('info')} data-today-info />
      </div>

      {dayRec.minimum_day ? (
        <div className={styles.minimumRow} data-minimum-row>
          <RingToggle
            label="Minimum"
            icon="check"
            color="var(--orange)"
            done={minimumDone}
            count={0}
            name={`Minimum: ${minimumDone ? 'done' : 'not yet'}. ${minimum ? minimum.label : 'Difficult-day minimum not chosen in the interview.'} Tap to ${minimumDone ? 'unmark' : 'mark'}.`}
            onToggle={() => toggleRing({ id: 'minimum', label: 'Minimum' })}
            id="minimum"
          />
          {minimum ? (
            <span className={styles.minimumText} data-minimum-text>
              {minimum.label}
            </span>
          ) : (
            <NotAssessedLabel label="Not chosen" name="Difficult-day minimum not chosen in the interview" data-minimum-text />
          )}
        </div>
      ) : (
        <>
          <div className={styles.rings}>
            {RINGS.map((meta) => {
              const { done, auto, count } = doneFor(meta.id);
              return (
                <RingToggle
                  key={meta.id}
                  id={meta.id}
                  label={meta.label}
                  icon={meta.icon}
                  color={meta.color}
                  done={done}
                  count={count}
                  name={`${meta.label}: ${done ? 'done' : 'not yet'}${count > 0 ? `, ${count} logged in Train today` : ''}. ${meta.evidence}${auto ? '' : ` Tap to ${done ? 'unmark' : 'mark'}.`}`}
                  onToggle={() => toggleRing(meta)}
                />
              );
            })}
          </div>
          <span className={styles.ringsCaption} aria-hidden="true" data-rings-done={doneCount}>
            {doneCount} of {RINGS.length}
          </span>
        </>
      )}
    </section>
  );

  const evidenceCard = (
    <Card data-evidence>
      <div className={styles.evidenceHead}>
        <span className={styles.kicker}>Evidence</span>
        <button type="button" className={styles.count} onClick={() => setSheet('journal')} aria-label={`Evidence journal: ${todayEvidence.length} line${todayEvidence.length === 1 ? '' : 's'} today, ${evidence.length} in total. Open.`} data-evidence-open>
          <span className={styles.countValue} aria-hidden="true" data-evidence-today={todayEvidence.length}>
            {todayEvidence.length}
          </span>
          <Icon name="chevron" size={18} className={styles.countChevron} />
        </button>
      </div>
      <div className={styles.chips} data-evidence-presets>
        {PRESET_EVIDENCE.map((p) => {
          const loggedToday = todayEvidence.some((e) => e.text === p.text);
          return <Chip key={p.id} label={p.short} icon={loggedToday ? 'check' : 'plus'} tone={loggedToday ? 'green' : 'neutral'} name={`Log evidence: ${p.text}${loggedToday ? ' (already logged today)' : ''}`} onClick={() => addEvidence(p.text, 'preset')} data-evidence-preset={p.id} />;
        })}
        <Chip label="Own" icon="edit" name="Write your own evidence line" onClick={() => setSheet('journal')} data-evidence-own />
      </div>
    </Card>
  );

  const sheets = (
    <>
      {/* ---- ⓘ rings ---- */}
      <Sheet open={sheet === 'info'} onClose={() => setSheet('none')} title="Today" data-sheet="today-info">
        <div className={styles.sheetStack}>
          {RINGS.map((meta) => (
            <div key={meta.id} className={styles.sheetRow}>
              <span className={styles.sheetKey} style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className={styles.sheetText}>{meta.evidence}</span>
            </div>
          ))}
          <div className={styles.sheetRow}>
            <span className={[styles.sheetKey, styles.sheetKeyOrange].join(' ')}>min</span>
            <span className={styles.sheetText}>A minimum-action day keeps your progress: only the chosen minimum counts. No streaks, nothing is deducted.</span>
          </div>
          <p className={styles.sheetMuted}>Rings are completion evidence, never a score. Stored in this browser only.</p>
        </div>
      </Sheet>

      {/* ---- journal ---- */}
      <Sheet open={sheet === 'journal'} onClose={() => setSheet('none')} title="Evidence" tall data-sheet="evidence">
        <div className={styles.sheetStack}>
          <label className={styles.ownLine}>
            <span className="sr-only">Your own evidence line: something observable you did, in your words</span>
            <textarea className={styles.textarea} rows={2} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="I ended the mock call at the first clear no." data-evidence-free />
          </label>
          <TileGrid columns={2}>
            <Tile
              icon="plus"
              label="Add"
              tone="green"
              disabled={freeText.trim().length === 0}
              name={freeText.trim().length === 0 ? 'Add: write a line first' : `Add evidence line: ${freeText.trim()}`}
              onClick={() => {
                addEvidence(freeText, 'free');
                setFreeText('');
              }}
              data-evidence-add
            />
            <Tile icon="check" label="Done" onClick={() => setSheet('none')} />
          </TileGrid>
          <JournalList heading="Today" count={todayEvidence.length} entries={todayEvidence} onRemove={removeEvidence} hook="today" />
          {earlierEvidence.length > 0 ? <JournalList heading="Earlier" count={earlierEvidence.length} entries={earlierEvidence.slice(0, 60)} onRemove={removeEvidence} hook="earlier" showDate /> : null}
        </div>
      </Sheet>
    </>
  );

  if (!current || profile === null) {
    const hasSession = session !== null && session.version_id === version.id;
    const prog = hasSession && session ? progress(session, version) : null;
    const complete = hasSession && session ? isComplete(session, version) : false;
    const fraction = prog && prog.total_visible > 0 ? (prog.answered + prog.skipped) / prog.total_visible : 0;
    const interviewName = hasSession && prog ? `Identity interview: ${prog.answered + prog.skipped} of ${prog.total_visible} done. Resume or revise your answers` : 'Start the identity interview';
    return (
      <div className={styles.root} data-today data-hydrated="true" data-local-day={day} data-today-empty={hasSession ? 'unendorsed' : 'no-session'} data-minimum-day={dayRec.minimum_day ? 'true' : 'false'}>
        <div className="sr-only" aria-live="polite" aria-atomic="true" data-today-live>
          {live}
        </div>
        {topBar}
        {ringsBlock}

        {/* next drill: nothing is chosen until an endorsed profile chooses one; the empty state is one line and one action */}
        <Card data-next-drill-empty>
          <div className={styles.cardRow}>
            <span className={[styles.iconCircle, styles.iconMuted].join(' ')} aria-hidden="true">
              <Icon name="target" size={28} />
            </span>
            <div className={styles.cardText}>
              <span className={styles.kicker}>Next drill</span>
              <span className={styles.emptyLine}>{hasSession ? 'Chosen once you endorse' : 'Chosen in the interview'}</span>
            </div>
          </div>
          <div className={styles.emptyAction}>
            <Tile icon="target" label="Choose a drill" size="sm" href="/practice" name="Choose a drill in Train" data-choose-drill />
          </div>
        </Card>

        <TileGrid columns={2}>
          <Tile icon="list" label={hasSession ? 'Interview' : 'Start the interview'} name={interviewName} href="/onboarding/identity" size="lg" data-interview-tile>
            <Ring value={fraction} size={28} stroke={3} color="var(--blue)" track="rgba(255,255,255,0.12)" label={prog ? `${prog.answered + prog.skipped} of ${prog.total_visible}` : '0 of 30'} />
          </Tile>
          {complete ? <Tile icon="check" label="Endorse" name="Review and endorse your profile" tone="green" href="/profile" size="lg" data-endorse-tile /> : <Tile icon="person" label="Profile" name={hasSession ? 'Profile: built from your answers so far; endorse once the interview is complete' : 'Profile: empty until the interview is answered'} href="/profile" size="lg" />}
        </TileGrid>

        {evidenceCard}
        {sheets}
        <Toast message={toast} />
      </div>
    );
  }

  // ---- endorsed and current ----
  const settings = planSettings(profile, { duration_minutes: prefs.duration_minutes });
  const drill = selectedOption(profile, version, 'next_drill');
  const drillMeta = drill ? NEXT_DRILL_META[drill.id] : undefined;
  const primary = selectedOption(profile, version, 'identity_primary');
  const endorsedOn = profile.endorsed_at ? localDateOf(profile.endorsed_at) : null;
  const durationName = settings.duration_minutes !== null ? `${settings.duration_minutes} minutes` : 'not chosen';

  return (
    <div className={styles.root} data-today data-hydrated="true" data-local-day={day} data-minimum-day={dayRec.minimum_day ? 'true' : 'false'}>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-today-live>
        {live}
      </div>
      {topBar}

      {ringsBlock}

      {/* ---- next drill ---- */}
      <Card
        href="/practice"
        name={`Next drill: ${drill ? drill.label : 'not chosen'}. Primary statement: ${primary ? primary.label : 'not chosen'}. Duration ${durationName}. ${settings.frequency}. Cue: ${settings.cue}. Opens Train.`}
        data-next-drill
        data-drill-option={drill?.id ?? ''}
        data-duration={settings.duration_minutes ?? ''}
      >
        <div className={styles.cardRow}>
          <span className={[styles.iconCircle, styles.iconGreen].join(' ')} aria-hidden="true">
            <Icon name={drillMeta?.icon ?? 'target'} size={28} />
          </span>
          <div className={styles.cardText}>
            <span className={styles.kicker}>Next drill</span>
            <span className={styles.big}>{drill ? drill.label : 'Not chosen'}</span>
            {primary ? <span className={styles.sub}>{primary.label}</span> : <NotAssessedLabel label="No statement chosen" name="Primary statement not chosen in the interview" />}
          </div>
        </div>
        <div className={styles.chips} aria-hidden="true">
          <Chip static icon="timer" label={settings.duration_minutes !== null ? minutesLabel(settings.duration_minutes) : 'not chosen'} />
          {settings.frequency_chosen ? <Chip static icon="refresh" label={settings.frequency} /> : null}
          {settings.cue_chosen ? <Chip static icon="play" label={settings.cue} /> : null}
          {drillMeta ? <Chip static icon="target" label={drillMeta.tile} /> : null}
        </div>
      </Card>

      {settings.duration_source !== 'interview' ? (
        <div className={styles.durationRow} role="group" aria-label="Practice duration in minutes: not chosen in the interview. Choose one here" data-duration-row>
          <Chip static icon="timer" label="min" name="Practice duration, minutes" />
          {DURATION_CHOICES.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              name={`${n} minutes`}
              toggle
              selected={prefs.duration_minutes === n}
              onClick={() => {
                setPrefs({ duration_minutes: prefs.duration_minutes === n ? null : n });
                setLive(prefs.duration_minutes === n ? 'Practice duration cleared.' : `Practice duration: ${n} minutes.`);
              }}
              data-duration-choice={n}
            />
          ))}
        </div>
      ) : null}

      {/* ---- profile ---- */}
      <Card href="/profile" name={`Profile: endorsed${endorsedOn ? ` on ${endorsedOn}` : ''}. Open profile.`} data-today-profile>
        <div className={styles.cardRow}>
          <span className={[styles.iconCircle, styles.iconBlue].join(' ')} aria-hidden="true">
            <Icon name="person" size={28} />
          </span>
          <div className={styles.cardText}>
            <span className={styles.kicker}>Profile</span>
            <span className={styles.chipsInline} aria-hidden="true">
              <Chip static icon="check" label="Endorsed" tone="green" />
              {endorsedOn ? <Chip static label={endorsedOn} /> : null}
            </span>
          </div>
        </div>
      </Card>

      {evidenceCard}
      {sheets}

      <Toast message={toast} />
    </div>
  );
}

// ----------------------------------------------------------------------------------------

interface RingToggleProps {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  done: boolean;
  count: number;
  name: string;
  onToggle: () => void;
}

/** One ring you can mark: filled when done (check mark); at zero the solid track stays visible around the count logged in Train or the ring's icon. */
function RingToggle({ id, label, icon, color, done, count, name, onToggle }: RingToggleProps) {
  return (
    <button type="button" className={styles.ringToggle} aria-pressed={done} aria-label={name} onClick={onToggle} data-ring-toggle={id} data-done={done ? 'true' : 'false'} data-count={count}>
      <Ring value={done ? 1 : 0} size={96} stroke={9} color={color} transitionMs={320}>
        <span className={styles.ringCenter} style={{ color: done ? color : 'var(--ink-2)' }} aria-hidden="true">
          {done ? <Icon name="check" size={40} strokeWidth={2.5} /> : count > 0 ? <span className={styles.ringCount}>{count}</span> : <Icon name={icon} size={30} />}
        </span>
      </Ring>
      <span className={styles.ringLabel} aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

function JournalList({ heading, count, entries, onRemove, hook, showDate }: { heading: string; count: number; entries: EvidenceEntry[]; onRemove: (id: string) => void; hook: string; showDate?: boolean }) {
  return (
    <section className={styles.journal} aria-label={`${heading}: ${count} line${count === 1 ? '' : 's'}`} data-evidence-journal={hook} data-count={count}>
      <span className={styles.journalHead} aria-hidden="true">
        {heading} <span className={styles.journalCount}>{count}</span>
      </span>
      {entries.length === 0 ? (
        <span className={styles.journalEmpty} aria-hidden="true">
          None yet
        </span>
      ) : (
        <ul className={styles.journalList}>
          {entries.map((e) => (
            <li key={e.id} className={styles.entry} data-evidence-entry={e.id}>
              {showDate ? <Chip static label={e.date} name={`Logged on ${e.date}`} /> : null}
              <span className={styles.entryText}>{e.text}</span>
              <IconButton icon="x" label={`Remove evidence: ${e.text}`} onClick={() => onRemove(e.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
