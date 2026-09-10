'use client';

import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';
import { IdentityProfile } from '@apohenia/domain/schemas';
import { buildTrainingPlan, planSettings } from '@apohenia/domain/interview';
import { Badge, Button, Card, EmptyState, Field, Stack } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './today.module.css';

const PROFILE_KEY = 'interview.profile';
const ProfileOrNull = IdentityProfile.nullable();

/** One editable routine item. `availability` explains why an item cannot be completed in this increment. */
const RoutineItem = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  evidence: z.string(),
  enabled: z.boolean(),
  availability: z.enum(['available', 'no_telephony', 'none_yet']).default('available'),
});
type RoutineItem = z.infer<typeof RoutineItem>;
const Routine = z.array(RoutineItem);

const DayRecord = z.object({
  done: z.record(z.string(), z.boolean()).default({}),
  minimum_day: z.boolean().default(false),
});
type DayRecord = z.infer<typeof DayRecord>;
const EMPTY_DAY: DayRecord = { done: {}, minimum_day: false };

const EvidenceEntry = z.object({
  id: z.string(),
  date: z.string(),
  text: z.string(),
  source: z.enum(['preset', 'free']),
});
type EvidenceEntry = z.infer<typeof EvidenceEntry>;
const Evidence = z.array(EvidenceEntry);
const NO_EVIDENCE: EvidenceEntry[] = [];
const NO_ROUTINE: RoutineItem[] | null = null;
const RoutineOrNull = Routine.nullable();

const PRESET_EVIDENCE = [
  'I clarified a vague answer without making assumptions',
  'I respected a no-fit case',
  'I asked one clear question at a time',
  'I ran the drill I said I would run',
  'I moved from an answer to the next question without a pause',
  'I said only what is approved when asked about price or capability',
];

const DEFAULT_ROUTINE: RoutineItem[] = [
  {
    id: 'rehearse',
    label: 'Rehearse exact wording and one transition',
    detail: 'The approved opening, word for word, plus one answer-to-question transition.',
    evidence: 'Opening said in full and one transition completed (not time on page).',
    enabled: true,
    availability: 'available',
  },
  {
    id: 'mock',
    label: 'One focused mock scenario',
    detail: 'A single typed practice scenario in Practice; ending a no-fit case cleanly counts.',
    evidence: 'One scenario completed to an agreed next step or a clean no-fit ending.',
    enabled: true,
    availability: 'available',
  },
  {
    id: 'calling_block',
    label: 'Approved calling block',
    detail: 'Not available in Increment 1 (no telephony). Shown so the routine is complete; it cannot be marked done.',
    evidence: 'Not available in Increment 1 (no telephony).',
    enabled: true,
    availability: 'no_telephony',
  },
  {
    id: 'review_two',
    label: 'Review two conversations',
    detail: 'None yet. Reviews appear when consented conversations exist in a later increment.',
    evidence: 'None yet.',
    enabled: true,
    availability: 'none_yet',
  },
  {
    id: 'change_one',
    label: 'Change one behavior',
    detail: 'Name the one behavior before the session; note whether it happened after.',
    evidence: 'One behavior named before and observed after.',
    enabled: true,
    availability: 'available',
  },
];

function nextId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TodayClient({ today }: { today: string }) {
  const [profile, , profileHydrated] = useStoredState<IdentityProfile | null>(PROFILE_KEY, ProfileOrNull, null);
  const [routineStored, setRoutine, routineHydrated] = useStoredState<RoutineItem[] | null>('today.routine', RoutineOrNull, NO_ROUTINE);
  const [day, setDay, dayHydrated] = useStoredState<DayRecord>(`today.${today}`, DayRecord, EMPTY_DAY);
  const [evidence, setEvidence, evidenceHydrated] = useStoredState<EvidenceEntry[]>('today.evidence', Evidence, NO_EVIDENCE);
  const [editing, setEditing] = useState(false);
  const [freeText, setFreeText] = useState('');

  const hydrated = profileHydrated && routineHydrated && dayHydrated && evidenceHydrated;

  if (!hydrated) {
    return (
      <p role="status" className={styles.muted}>
        Reading today’s plan…
      </p>
    );
  }

  if (!profile || !profile.endorsed) {
    return (
      <EmptyState
        title="Today’s plan appears once your profile is endorsed"
        actions={
          <span className={styles.toggleRow}>
            <Link href="/onboarding/identity">Go to the identity interview</Link>
            <span className={styles.muted}>·</span>
            <Link href="/profile">Review and endorse your profile</Link>
          </span>
        }
      >
        <p>
          The daily routine is built from the standards you endorse, with the duration, cue and recovery rule you chose. Until then
          there is nothing to schedule and nothing is counted against you.
        </p>
      </EmptyState>
    );
  }

  const plan = buildTrainingPlan(profile);
  const settings = planSettings(profile);
  const routine = routineStored ?? DEFAULT_ROUTINE;
  const minimum = profile.sections.find((s) => s.key === 'difficult_day_minimum')?.summary ?? 'Difficult-day minimum: not chosen yet.';
  const nextDrill = profile.sections.find((s) => s.key === 'next_drill')?.summary ?? 'Next drill: not chosen yet.';
  const firstItem = plan[0];

  const activeItems = routine.filter((r) => r.enabled);
  const completable = activeItems.filter((r) => r.availability === 'available');
  const doneCount = completable.filter((r) => day.done[r.id]).length;
  const todayEvidence = evidence.filter((e) => e.date === today);

  function setDone(id: string, value: boolean) {
    setDay((prev) => ({ ...prev, done: { ...prev.done, [id]: value } }));
  }

  function updateItem(id: string, patch: Partial<RoutineItem>) {
    setRoutine(routine.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addEvidence(text: string, source: 'preset' | 'free') {
    const trimmed = text.trim();
    if (!trimmed) return;
    setEvidence((prev) => [{ id: nextId(), date: today, text: trimmed, source }, ...prev].slice(0, 500));
  }

  function removeEvidence(id: string) {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className={styles.page} data-today={today}>
      <Card title="Next drill">
        <dl className={styles.drill} data-next-drill>
          <dt>Cue</dt>
          <dd>{firstItem ? firstItem.cue : `Session cue: ${settings.cue}`}</dd>
          <dt>Exact action</dt>
          <dd>{firstItem ? firstItem.exact_action : nextDrill}</dd>
          <dt>Duration</dt>
          <dd>
            {settings.duration_minutes} minutes · {settings.frequency}
          </dd>
          <dt>Completion evidence</dt>
          <dd>{firstItem ? firstItem.completion_evidence : 'A completed drill, not time on page.'}</dd>
          <dt>Recovery rule</dt>
          <dd>{settings.recovery_rule}</dd>
          <dt>Standards</dt>
          <dd>
            {plan.length > 0 ? plan.map((p) => p.standard).join(' · ') : 'No standards chosen yet.'}{' '}
            <Link href="/profile">See the full plan</Link>
          </dd>
        </dl>
      </Card>

      <Card title="Daily routine">
        <Stack gap={3}>
          <div className={styles.toggleRow}>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={day.minimum_day}
                onChange={(e) => setDay((prev) => ({ ...prev, minimum_day: e.target.checked }))}
                data-minimum-day
              />
              <span>Minimum-action day</span>
            </label>
            <span className={styles.muted}>
              {day.minimum_day
                ? `Today only the minimum counts: ${minimum} Progress is kept; nothing is deleted.`
                : 'Turn on when today is difficult. Progress is kept either way; there are no streaks and nothing is deducted.'}
            </span>
          </div>
          <p className={styles.muted} role="status" data-routine-progress>
            {day.minimum_day
              ? 'Minimum-action day: mark the minimum below when done.'
              : `${doneCount} of ${completable.length} completable items done today. ${activeItems.length - completable.length} shown as unavailable in this increment.`}
          </p>
          <ul className={styles.routine} data-routine>
            {day.minimum_day ? (
              <li className={[styles.item, day.done['minimum'] ? styles.itemDone : ''].join(' ').trim()}>
                <input
                  id="routine-minimum"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={Boolean(day.done['minimum'])}
                  onChange={(e) => setDone('minimum', e.target.checked)}
                />
                <div>
                  <label htmlFor="routine-minimum" className={styles.itemTitle}>
                    The minimum
                  </label>
                  <p className={styles.itemDetail}>{minimum}</p>
                </div>
              </li>
            ) : null}
            {activeItems.map((item) => {
              const available = item.availability === 'available';
              const done = Boolean(day.done[item.id]) && available;
              return (
                <li
                  key={item.id}
                  className={[styles.item, done ? styles.itemDone : '', !available ? styles.itemUnavailable : ''].join(' ').trim()}
                  data-routine-item={item.id}
                >
                  <input
                    id={`routine-${item.id}`}
                    type="checkbox"
                    className={styles.checkbox}
                    checked={done}
                    disabled={!available || day.minimum_day}
                    onChange={(e) => setDone(item.id, e.target.checked)}
                  />
                  <div>
                    <label htmlFor={`routine-${item.id}`} className={styles.itemTitle}>
                      {item.label}
                    </label>{' '}
                    {item.availability === 'no_telephony' ? <Badge variant="neutral">Not available in Increment 1 (no telephony)</Badge> : null}
                    {item.availability === 'none_yet' ? <Badge variant="neutral">None yet</Badge> : null}
                    {done ? <Badge variant="success">Done</Badge> : null}
                    <p className={styles.itemDetail}>{item.detail}</p>
                    <span className={styles.evidenceLabel}>Completion evidence: {item.evidence}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className={styles.toggleRow}>
            <Button variant="quiet" onClick={() => setEditing((v) => !v)} aria-expanded={editing} data-edit-routine>
              {editing ? 'Done editing' : 'Edit routine'}
            </Button>
            {routineStored ? (
              <Button variant="quiet" onClick={() => setRoutine(DEFAULT_ROUTINE)}>
                Restore suggested routine
              </Button>
            ) : null}
          </div>
          {editing ? (
            <Stack gap={2} data-routine-editor>
              {routine.map((item) => (
                <div key={item.id} className={styles.editGrid}>
                  <label>
                    <span className={styles.muted}>Label</span>
                    <input className={styles.input} value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} />
                  </label>
                  <label>
                    <span className={styles.muted}>Completion evidence</span>
                    <input className={styles.input} value={item.evidence} onChange={(e) => updateItem(item.id, { evidence: e.target.value })} />
                  </label>
                  <label className={styles.toggleRow}>
                    <input type="checkbox" checked={item.enabled} onChange={(e) => updateItem(item.id, { enabled: e.target.checked })} />
                    <span>In routine</span>
                  </label>
                </div>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Card>

      <Card title="Identity evidence journal">
        <Stack gap={3}>
          <p className={styles.muted}>
            Observable things you did, in your words. Examples are the kind of evidence that counts; none of them are scores.
          </p>
          <div className={styles.presets} data-evidence-presets>
            {PRESET_EVIDENCE.map((text) => (
              <Button key={text} onClick={() => addEvidence(text, 'preset')}>
                {text}
              </Button>
            ))}
          </div>
          <Field id="evidence-free" label="Add your own evidence line" help="Free text is allowed here; it stays in this browser.">
            {(control) => (
              <textarea
                {...control}
                className={styles.textarea}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="e.g. I ended the mock call at the first clear no."
              />
            )}
          </Field>
          <div>
            <Button
              onClick={() => {
                addEvidence(freeText, 'free');
                setFreeText('');
              }}
              disabled={freeText.trim().length === 0}
            >
              Add evidence line
            </Button>
          </div>
          <h3>Today ({todayEvidence.length})</h3>
          {evidence.length === 0 ? (
            <p className={styles.muted}>No evidence lines yet.</p>
          ) : (
            <ul className={styles.journal} data-evidence-journal>
              {evidence.slice(0, 40).map((e) => (
                <li key={e.id} className={styles.entry}>
                  <span>
                    <span className={styles.entryDate}>{e.date}</span> {e.text}
                  </span>
                  <Button variant="quiet" onClick={() => removeEvidence(e.id)} aria-label={`Remove evidence: ${e.text}`}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Card>
    </div>
  );
}
