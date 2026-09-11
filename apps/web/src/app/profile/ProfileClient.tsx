'use client';

import { useState } from 'react';
import { z } from 'zod';
import { IdentityProfile, InterviewSession, type InterviewScreen, type InterviewVersion } from '@apohenia/domain/schemas';
import { INTERVIEW_STORAGE_KEYS, buildProfile, buildTrainingPlan, displayStatus, endorseProfile, isProfileCurrent, isUncertaintyOption, isNoneOption, optionLabelOf, progress, visibleScreens } from '@apohenia/domain/interview';
import { Card, Chip, GlyphPill, Icon, IconButton, NotAssessedLabel, Sheet, Stat, Tile, TileGrid, Toast, TopBar, useToast } from '@/components/ui';
import { listStoredKeys, readStored, removeStored, useStoredState } from '@/lib/storage';
import styles from './profile.module.css';

const SESSION_KEY = 'interview.session';
const PROFILE_KEY = 'interview.profile';
const SessionOrNull = InterviewSession.nullable();
const ProfileOrNull = IdentityProfile.nullable();
const Anything = z.unknown();
/** Today's later duration choice (A-2), read so the plan shows the same duration Today shows. */
const TodayPrefs = z.object({ duration_minutes: z.number().int().positive().nullable().default(null) });
const NO_PREFS = { duration_minutes: null } as const;

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

const PRIVACY_STATEMENT = 'Private. Never enters a prospect’s context. Export or delete below.';

/**
 * Profile (DESIGN_SYSTEM §3.6): one card per section with answer-id chips, Endorse as the hero tile,
 * the training plan and the scoped export/delete in sheets. Built from the stored interview session
 * with `buildProfile`; nothing is inferred and nothing downstream reads it until endorsed.
 */
export function ProfileClient({ version }: { version: InterviewVersion }) {
  const [session, setSession, sessionHydrated, resetSession] = useStoredState<InterviewSession | null>(SESSION_KEY, SessionOrNull, null);
  const [storedProfile, setStoredProfile, profileHydrated, resetProfile] = useStoredState<IdentityProfile | null>(PROFILE_KEY, ProfileOrNull, null);
  const [prefs] = useStoredState<{ duration_minutes: number | null }>('today.prefs', TodayPrefs, NO_PREFS);
  const [exported, setExported] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'none' | 'plan' | 'privacy' | 'about'>('none');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  if (!sessionHydrated || !profileHydrated) {
    return (
      <div className={styles.root} data-profile data-hydrated="false">
        <TopBar />
        <span className="sr-only" role="status">
          Reading saved answers
        </span>
      </div>
    );
  }

  if (!session || session.version_id !== version.id) {
    return (
      <div className={styles.root} data-profile data-hydrated="true" data-profile-empty>
        <TopBar />
        <div className={styles.empty}>
          <span className={styles.emptyGlyph} aria-hidden="true">
            <Icon name="empty" size={72} weight="bold" />
          </span>
          <span className={styles.emptyLabel}>No answers yet</span>
          <span className="sr-only">Your profile is built from the identity interview. Nothing here is inferred; every section shows the answer ids it came from.</span>
          <Tile icon="list" label="Start interview" name="Start the identity interview" href="/onboarding/identity" size="lg" />
        </div>
      </div>
    );
  }

  const derived = buildProfile(version, session);
  const screensByField = new Map<string, InterviewScreen[]>();
  for (const sc of visibleScreens(version, session.answers)) {
    const list = screensByField.get(sc.profile_field) ?? [];
    list.push(sc);
    screensByField.set(sc.profile_field, list);
  }
  const endorsedCurrent = isProfileCurrent(storedProfile, version, session);
  const endorsedStale = storedProfile !== null && storedProfile.endorsed && !endorsedCurrent;
  const effective = endorsedCurrent && storedProfile ? storedProfile : derived;
  const plan = buildTrainingPlan(effective, { duration_minutes: prefs.duration_minutes });
  const prog = progress(session, version);
  const status: 'endorsed' | 'stale' | 'unendorsed' = endorsedCurrent ? 'endorsed' : endorsedStale ? 'stale' : 'unendorsed';
  const endorsedDate = endorsedCurrent && storedProfile?.endorsed_at ? formatDate(storedProfile.endorsed_at) : null;

  function onEndorse() {
    if (!session) return;
    const now = new Date().toISOString();
    setStoredProfile(endorseProfile(derived, now));
    setSession({ ...session, status: 'endorsed', endorsed_at: now });
    setMessage(`Endorsed on ${formatDate(now)}. Your training plan and Today now read this profile.`);
    showToast('Endorsed', 'green');
  }

  function onExport() {
    const json = JSON.stringify(exportInterviewKeys(), null, 2);
    setExported(json);
    setMessage('Exported interview data (interview.* keys only) as JSON.');
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apohenia-interview-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download is a convenience; the JSON is still shown in the sheet.
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
    setConfirmDelete(false);
    setSheet('none');
    setMessage('Deleted interview answers and profile from this browser. Today’s entries were left in place.');
    showToast('Deleted', 'red');
  }

  const statusPill =
    status === 'endorsed' ? (
      <GlyphPill icon="check" label="Endorsed" tone="green" name={`Endorsed ${endorsedDate ?? ''}. Your training plan and Today read this profile.`} data-profile-status="endorsed" />
    ) : status === 'stale' ? (
      <GlyphPill icon="undo" label="Stale" tone="orange" name="Answers changed since endorsement. Endorse again; Today has stopped reading the old profile." data-profile-status="stale" />
    ) : (
      <GlyphPill icon="circle-dashed" label="Draft" tone="neutral" name="Not endorsed yet: nothing downstream uses this profile" data-profile-status="unendorsed" />
    );

  return (
    <div className={styles.root} data-profile data-hydrated="true" data-status={status}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-profile-message>
        {message ?? ''}
      </div>
      <TopBar
        left={statusPill}
        right={
          <>
            <IconButton icon="shield" label="Privacy: export or delete interview data" onClick={() => setSheet('privacy')} data-privacy-open />
            <IconButton icon="list" label="Revise answers in the interview" href="/onboarding/identity" />
          </>
        }
      />

      <div className={styles.stats} data-profile-stats>
        <Stat value={prog.answered} icon="check" name="Answered" />
        <Stat value={prog.skipped} icon="next" name="Skipped" />
        <Stat value={prog.remaining} icon="clock" name="Open" />
      </div>

      <TileGrid columns={2}>
        <Tile
          icon="check"
          label={endorsedCurrent ? 'Endorsed' : 'Endorse'}
          tone="green"
          size="lg"
          disabled={endorsedCurrent}
          name={
            endorsedCurrent
              ? `Endorsed${endorsedDate ? ` on ${endorsedDate}` : ''}. Endorsing means: this summary is mine as written. It can be revised at any time.`
              : `${endorsedStale ? 'Endorse this updated profile' : 'Endorse this profile'}. Endorsing means: this summary is mine as written. It can be revised at any time. Only an endorsed profile feeds the training plan and Today.`
          }
          onClick={onEndorse}
          data-endorse-button
        />
        <Tile icon="target" label="Plan" size="lg" name={endorsedCurrent ? `Training plan: ${plan.length} standard${plan.length === 1 ? '' : 's'} translated into practice habits` : 'Training plan: endorse the profile to generate it'} onClick={() => setSheet('plan')} data-plan-open />
      </TileGrid>

      <div className={styles.sections} data-profile-sections>
        {derived.sections.map((section) => {
          const screens = section.key === 'unknowns' ? [] : (screensByField.get(section.key) ?? []);
          return (
            <section key={section.key} className={styles.section} aria-labelledby={`profile-section-${section.key}`} data-profile-section={section.key} data-answer-ids={section.answer_ids.join(' ')}>
              <h2 id={`profile-section-${section.key}`} className={styles.sectionLabel}>
                {section.label}
              </h2>
              {section.key === 'unknowns' ? (
                <Card>
                  <div className={styles.chips} data-unknowns aria-label={`Explicit unknowns: ${derived.unknowns.length}`}>
                    {derived.unknowns.length === 0 ? (
                      <NotAssessedLabel label="None recorded" name="No unknowns recorded. Skipped or uncertain answers appear here." />
                    ) : (
                      derived.unknowns.map((u) => <Chip key={u} static label={u} className={styles.unknownChip} name={`Unknown: ${u}`} />)
                    )}
                  </div>
                </Card>
              ) : (
                screens.map((screen) => <AnswerCard key={screen.id} screen={screen} session={session} />)
              )}
            </section>
          );
        })}
      </div>

      {/* ---- training plan ---- */}
      <Sheet open={sheet === 'plan'} onClose={() => setSheet('none')} title="Plan" tall data-sheet="plan">
        <div className={styles.sheetStack}>
          <p className={styles.sheetMuted}>Each endorsed standard becomes a cue, an exact action, a frequency and duration, completion evidence, a review and a recovery rule. A missed practice does not erase previous work.</p>
          {!endorsedCurrent ? (
            <div className={styles.gate} data-plan-gate>
              <Chip static icon="circle-dashed" label="Endorse first" tone="gold" name="Endorse the profile to generate the plan. An unendorsed profile produces no plan." />
              <Tile icon="check" label="Endorse" tone="green" name="Endorse this profile now" onClick={() => { onEndorse(); }} />
            </div>
          ) : plan.length === 0 ? (
            <div className={styles.gate} data-plan-empty>
              <span className={styles.emptyGlyph} aria-hidden="true">
                <Icon name="empty" size={48} weight="bold" />
              </span>
              <span className={styles.sheetText}>No standards were chosen on the “Which of these statements do you choose as yours?” screen, so there is nothing to translate yet.</span>
              <Tile icon="list" label="Revise" name="Revise answers in the interview" href="/onboarding/identity" />
            </div>
          ) : (
            <ul className={styles.plan} data-training-plan>
              {plan.map((item) => (
                <li key={item.standard} className={styles.planItem} data-plan-item>
                  <span className={styles.planStandard}>{item.standard}</span>
                  <PlanRow k="Cue" v={item.cue} />
                  <PlanRow k="Action" v={item.exact_action} />
                  <div className={styles.planRow}>
                    <span className={styles.planKey}>Rhythm</span>
                    <span className={styles.planValue}>
                      {item.frequency}
                      {' · '}
                      {item.duration_minutes !== null ? <span data-plan-duration={item.duration_minutes}>{item.duration_minutes} min</span> : <NotAssessedLabel label="duration not chosen" name="Duration not chosen. Choose it on Today or in the interview" data-plan-duration="" />}
                    </span>
                  </div>
                  <PlanRow k="Evidence" v={item.completion_evidence} />
                  <PlanRow k="Review" v={item.review} />
                  <PlanRow k="Recovery" v={item.recovery_rule} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>

      {/* ---- privacy: scoped export / delete ---- */}
      <Sheet
        open={sheet === 'privacy'}
        onClose={() => {
          setSheet('none');
          setConfirmDelete(false);
        }}
        title="Privacy"
        tall
        data-sheet="privacy"
      >
        <div className={styles.sheetStack}>
          <p className={styles.privacy} data-privacy-statement>
            {PRIVACY_STATEMENT}
          </p>
          <div className={styles.chips}>
            <Chip static icon="home" label="Answers" name="Stored key: interview.session (this browser only)" />
            <Chip static icon="home" label="Profile" name="Stored key: interview.profile (this browser only)" />
          </div>
          <p className={styles.sheetMuted}>Export contains only the interview keys stored in this browser. Delete removes those keys and nothing else; the app-wide delete lives on Settings.</p>
          {confirmDelete ? (
            <TileGrid columns={2}>
              <Tile icon="x" label="Delete" tone="red" name="Delete interview answers and profile from this browser for good" onClick={onDelete} data-confirm-delete-interview />
              <Tile icon="check" label="Keep" name="Keep my interview data" onClick={() => setConfirmDelete(false)} />
            </TileGrid>
          ) : (
            <TileGrid columns={2}>
              <Tile icon="arrow-up" label="Export" name="Export interview data as JSON (interview keys only)" onClick={onExport} data-export-interview />
              <Tile icon="x" label="Delete" tone="red" name="Delete interview data (asks once more)" onClick={() => setConfirmDelete(true)} data-delete-interview />
            </TileGrid>
          )}
          {exported !== null ? (
            <pre className={styles.exportPre} data-export-json>
              {exported}
            </pre>
          ) : null}
        </div>
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}

/**
 * One card per question: the question as an 11px caption, the chosen option(s) as a 22px label
 * (several = chips). Unanswered is a caption ("Skipped", "Not answered") whose accessible name says
 * why. Ids live only in the JSON export (and the section's data attribute), never on the stage.
 */
function AnswerCard({ screen, session }: { screen: InterviewScreen; session: InterviewSession }) {
  const st = displayStatus(session, screen.id);
  const answer = session.answers[screen.id];
  const caption = screen.summary_label ?? screen.prompt.replace(/[?.]$/, '');
  const ids = st === 'answered' ? (answer?.selected_option_ids ?? []) : [];
  const first = ids[0];
  const exclusive = first !== undefined && (isUncertaintyOption(screen, first) || isNoneOption(screen, first));
  const labels = ids.map((id) => optionLabelOf(screen, id));
  const emptyName =
    st === 'skipped' ? `${caption}: skipped` : st === 'needs_reanswer' ? `${caption}: an earlier answer changed. Confirm this one again` : st === 'not_applicable' ? `${caption}: not applicable` : `${caption}: not answered yet`;
  const emptyWord = st === 'skipped' ? 'Skipped' : st === 'needs_reanswer' ? 'Re-check' : st === 'not_applicable' ? 'Not asked' : 'Not answered';
  return (
    <Card dense data-answer-card={screen.id} data-answer-status={st}>
      <span className={styles.answerCaption} aria-hidden="true">
        {caption}
      </span>
      <span className="sr-only">{caption}: </span>
      {st === 'answered' && labels.length > 0 ? (
        exclusive ? (
          <span className={[styles.answerBig, styles.answerMuted].join(' ')}>{labels[0]}</span>
        ) : labels.length === 1 ? (
          <span className={styles.answerBig}>{labels[0]}</span>
        ) : (
          <span className={styles.answerChips}>
            {labels.map((l) => (
              <Chip key={l} static label={l} name={l} className={styles.answerChip} />
            ))}
          </span>
        )
      ) : (
        <NotAssessedLabel label={emptyWord} name={emptyName} className={styles.answerEmpty} />
      )}
    </Card>
  );
}

function PlanRow({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.planRow}>
      <span className={styles.planKey}>{k}</span>
      <span className={styles.planValue}>{v}</span>
    </div>
  );
}
