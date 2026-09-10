'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IdentityProfile, InterviewSession, type InterviewVersion } from '@apohenia/domain/schemas';
import {
  INTERVIEW_STORAGE_KEYS,
  buildProfile,
  buildTrainingPlan,
  endorseProfile,
  profileFingerprint,
  progress,
} from '@apohenia/domain/interview';
import { Badge, Button, Card, Dialog, EmptyState, Stack } from '@/components/ui';
import { listStoredKeys, readStored, removeStored, useStoredState } from '@/lib/storage';
import { z } from 'zod';
import styles from './profile.module.css';

const SESSION_KEY = 'interview.session';
const PROFILE_KEY = 'interview.profile';
const SessionOrNull = InterviewSession.nullable();
const ProfileOrNull = IdentityProfile.nullable();
const Anything = z.unknown();

/** Scoped export: only interview.* keys, never the whole namespace. */
function exportInterviewKeys(): { scope: 'interview'; exported_at: string; mode: 'local_demo'; entries: Record<string, unknown> } {
  const entries: Record<string, unknown> = {};
  for (const { key } of listStoredKeys()) {
    if (!key.startsWith('interview.')) continue;
    entries[key] = readStored(key, Anything, null);
  }
  return { scope: 'interview', exported_at: new Date().toISOString(), mode: 'local_demo', entries };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

export function ProfileClient({ version }: { version: InterviewVersion }) {
  const [session, setSession, sessionHydrated, resetSession] = useStoredState<InterviewSession | null>(SESSION_KEY, SessionOrNull, null);
  const [storedProfile, setStoredProfile, profileHydrated, resetProfile] = useStoredState<IdentityProfile | null>(PROFILE_KEY, ProfileOrNull, null);
  const [exported, setExported] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!sessionHydrated || !profileHydrated) {
    return (
      <p role="status" className={styles.muted}>
        Reading saved answers…
      </p>
    );
  }

  if (!session || session.version_id !== version.id) {
    return (
      <EmptyState
        title="No interview answers yet"
        actions={<Link href="/onboarding/identity">Start the identity interview</Link>}
      >
        <p>
          Your profile is built from the identity interview. Nothing here is inferred; every section shows the answer ids it came
          from. Complete or partly complete the interview, then return here to review and endorse.
        </p>
      </EmptyState>
    );
  }

  const derived = buildProfile(version, session);
  const derivedPrint = profileFingerprint(derived);
  const endorsedCurrent =
    storedProfile !== null && storedProfile.endorsed && storedProfile.session_id === session.id && profileFingerprint(storedProfile) === derivedPrint;
  const endorsedStale = storedProfile !== null && storedProfile.endorsed && !endorsedCurrent;
  const effective = endorsedCurrent && storedProfile ? storedProfile : derived;
  const plan = buildTrainingPlan(effective);
  const prog = progress(session, version);

  function onEndorse() {
    const now = new Date().toISOString();
    const endorsed = endorseProfile(derived, now);
    setStoredProfile(endorsed);
    setSession({ ...session!, status: 'endorsed', endorsed_at: now });
    setStatus(`Endorsed on ${formatDate(now)}. Your training plan and Today now read this profile.`);
  }

  function onExport() {
    const json = JSON.stringify(exportInterviewKeys(), null, 2);
    setExported(json);
    setStatus('Exported interview data (interview.* keys only) as JSON.');
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apohenia-interview-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download is a convenience; the JSON is still shown below.
    }
  }

  function onDelete() {
    for (const { key } of listStoredKeys()) {
      if (key.startsWith('interview.')) removeStored(key);
    }
    for (const key of INTERVIEW_STORAGE_KEYS) removeStored(key);
    resetSession();
    resetProfile();
    setExported(null);
    setDeleteOpen(false);
    setStatus('Deleted interview answers and profile from this browser. Today’s routine entries were left in place.');
  }

  return (
    <div className={styles.page}>
      <div className={styles.statusRow} data-profile-status={endorsedCurrent ? 'endorsed' : endorsedStale ? 'stale' : 'unendorsed'}>
        {endorsedCurrent && storedProfile?.endorsed_at ? (
          <Badge variant="success">Endorsed {formatDate(storedProfile.endorsed_at)}</Badge>
        ) : endorsedStale ? (
          <Badge variant="warning">Answers changed since endorsement — endorse again</Badge>
        ) : (
          <Badge variant="info">Not endorsed yet — nothing downstream uses this profile</Badge>
        )}
        <span className={styles.muted}>
          {prog.answered} answered · {prog.skipped} skipped · {prog.remaining} open · interview v{version.version}
        </span>
        <Link href="/onboarding/identity">Revise answers</Link>
      </div>

      {status ? (
        <p role="status" data-profile-message>
          {status}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="primary" onClick={onEndorse} disabled={endorsedCurrent} data-endorse-button>
          {endorsedCurrent ? 'Endorsed' : endorsedStale ? 'Endorse this updated profile' : 'Endorse this profile'}
        </Button>
        <span className={styles.muted}>Endorsing means: this summary is mine as written. It can be revised at any time.</span>
      </div>

      <section aria-labelledby="sections-heading">
        <h2 id="sections-heading">Sections</h2>
        <p className={styles.muted}>Each summary is assembled from the option labels you chose. Source answer ids are shown under each section.</p>
        <div className={styles.sections} style={{ marginTop: 'var(--space-3)' }}>
          {derived.sections.map((section) => (
            <Card key={section.key} title={section.label} headingLevel="h3" data-profile-section={section.key}>
              <p className={styles.summary}>{section.summary}</p>
              <p className={styles.answerIds} data-answer-ids>
                {section.answer_ids.length > 0 ? section.answer_ids.join(' · ') : 'no answer ids (nothing answered here yet)'}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Card title="Explicit unknowns">
        {derived.unknowns.length === 0 ? (
          <p className={styles.muted}>No unknowns recorded. Skipped or uncertain answers appear here.</p>
        ) : (
          <ul className={styles.unknowns} data-unknowns>
            {derived.unknowns.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Training plan">
        <Stack gap={3}>
          <p className={styles.muted}>
            Each endorsed standard becomes: cue → exact action → frequency and duration (your answers) → completion evidence → review →
            recovery rule. A missed practice does not erase previous work.
          </p>
          {!endorsedCurrent ? (
            <p data-plan-gate>Endorse the profile to generate the plan. An unendorsed profile produces no plan.</p>
          ) : plan.length === 0 ? (
            <p data-plan-empty>
              No standards were chosen on the “Which of these statements do you choose as yours?” screen, so there is nothing to translate yet.{' '}
              <Link href="/onboarding/identity">Revise answers</Link>.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.plan} data-training-plan>
                <caption className={styles.muted} style={{ textAlign: 'left', paddingBottom: 'var(--space-2)' }}>
                  {plan.length} standard{plan.length === 1 ? '' : 's'} translated into practice habits
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Standard</th>
                    <th scope="col">Cue</th>
                    <th scope="col">Exact action</th>
                    <th scope="col">Frequency / duration</th>
                    <th scope="col">Completion evidence</th>
                    <th scope="col">Review</th>
                    <th scope="col">Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((item) => (
                    <tr key={item.standard}>
                      <th scope="row">{item.standard}</th>
                      <td>{item.cue}</td>
                      <td>{item.exact_action}</td>
                      <td>
                        {item.frequency} · {item.duration_minutes} min
                      </td>
                      <td>{item.completion_evidence}</td>
                      <td>{item.review}</td>
                      <td>{item.recovery_rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Stack>
      </Card>

      <Card title="Privacy">
        <Stack gap={3}>
          <p className={styles.privacy} data-privacy-statement>
            Private. Never enters a prospect’s context. Export or delete below.
          </p>
          <p className={styles.muted}>
            The export contains only the interview keys (<code>interview.session</code>, <code>interview.profile</code>) stored in this
            browser. Delete removes those keys and nothing else; the app-wide delete lives on Settings.
          </p>
          <div className={styles.actions}>
            <Button onClick={onExport} data-export-interview>
              Export interview data (JSON)
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)} data-delete-interview>
              Delete interview data
            </Button>
          </div>
          {exported !== null ? (
            <details open>
              <summary>Exported JSON</summary>
              <pre className={styles.exportPre} data-export-json>
                {exported}
              </pre>
            </details>
          ) : null}
        </Stack>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete interview data?"
        description="This removes your interview answers and endorsed profile from this browser. Today’s routine and evidence entries are kept. Export first if you want a copy."
        actions={
          <>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} data-confirm-delete-interview>
              Delete interview data
            </Button>
          </>
        }
      />
    </div>
  );
}
