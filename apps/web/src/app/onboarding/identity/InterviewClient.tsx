'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { InterviewSession, type InterviewScreen, type InterviewVersion } from '@apohenia/domain/schemas';
import {
  DISPLAY_STATUS_LABEL,
  REVIEW_SCREEN_ID,
  answeredDependents,
  applyAnswer,
  createSession,
  displayStatus,
  findScreen,
  goTo,
  hiddenConditionalScreens,
  isComplete,
  nextScreenId,
  prevScreenId,
  progress,
  selectionProblem,
  sortedScreens,
  toggleSelection,
  visibleScreens,
  type DisplayStatus,
} from '@apohenia/domain/interview';
import { Badge, Button, Card, Dialog, KeyboardHint, Stack, VisuallyHidden } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './interview.module.css';

const SESSION_KEY = 'interview.session';
const SessionOrNull = InterviewSession.nullable();

const STATUS_VARIANT: Record<DisplayStatus, 'success' | 'neutral' | 'info' | 'warning'> = {
  answered: 'success',
  skipped: 'neutral',
  not_applicable: 'neutral',
  needs_reanswer: 'warning',
  unanswered: 'info',
};

export interface InterviewClientProps {
  version: InterviewVersion;
  placeholder: boolean;
}

export function InterviewClient({ version, placeholder }: InterviewClientProps) {
  const [stored, setStored, hydrated] = useStoredState<InterviewSession | null>(SESSION_KEY, SessionOrNull, null);
  // A fresh session is created lazily and only becomes persisted on the first answer or skip.
  const [fresh] = useState(() => createSession(version));
  const [note, setNote] = useState<string | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);

  const session = stored && stored.version_id === version.id ? stored : fresh;
  const visible = useMemo(() => visibleScreens(version, session.answers), [version, session.answers]);
  const hidden = hiddenConditionalScreens(version, session.answers);
  const prog = progress(session, version);

  // Resolve the pointer: the review screen, the current visible screen, or the first remaining one.
  const currentScreen: InterviewScreen | null =
    session.current_screen_id === REVIEW_SCREEN_ID
      ? null
      : (visible.find((s) => s.id === session.current_screen_id) ??
        visible.find((s) => {
          const st = displayStatus(session, s.id);
          return st === 'unanswered' || st === 'needs_reanswer';
        }) ??
        null);
  const onReview = currentScreen === null;

  if (!hydrated) {
    return (
      <p role="status" className={styles.notice}>
        Reading saved answers…
      </p>
    );
  }

  function commit(next: InterviewSession) {
    setStored(next);
  }

  function answer(screen: InterviewScreen, selection: string[], status: 'answered' | 'skipped') {
    const before = answeredDependents(session, version, screen.id);
    const applied = applyAnswer(session, screen, selection, status, { version });
    const reset = before.filter((d) => {
      const st = displayStatus(applied, d.id);
      return st === 'not_applicable' || st === 'needs_reanswer';
    });
    setNote(
      reset.length > 0
        ? `Because this answer changed, ${reset.length === 1 ? 'a dependent answer was' : `${reset.length} dependent answers were`} reset: ${reset
            .map((d) => `“${d.summary_label ?? d.prompt}”`)
            .join(', ')}. Nothing else was touched.`
        : null,
    );
    commit(goTo(applied, nextScreenId(version, applied.answers, screen.id)));
  }

  function back(screen: InterviewScreen | null) {
    const prev = prevScreenId(version, session.answers, screen ? screen.id : REVIEW_SCREEN_ID);
    if (prev) {
      setNote(null);
      commit(goTo(session, prev));
    }
  }

  function jumpTo(screenId: string) {
    setNote(null);
    commit(goTo(session, screenId));
  }

  function restart() {
    setRestartOpen(false);
    setNote(null);
    commit(createSession(version));
  }

  const upcoming = hidden.length;

  return (
    <div className={styles.flow} data-interview-status={session.status}>
      {placeholder ? (
        <Badge variant="warning">Placeholder seed — the interview content is not authored yet</Badge>
      ) : null}

      {onReview ? (
        <ReviewScreen
          version={version}
          session={session}
          visible={visible}
          hidden={hidden}
          complete={isComplete(session, version)}
          remaining={prog.remaining}
          onEdit={jumpTo}
          onBack={() => back(null)}
          onRestart={() => setRestartOpen(true)}
        />
      ) : (
        <>
          <div>
            <p className={styles.progressLine} data-progress-line>
              <span>
                Question {visible.findIndex((s) => s.id === currentScreen.id) + 1} of {prog.total_visible} visible
                {upcoming > 0 ? ` (up to ${upcoming} more may appear based on your answers)` : ''}
              </span>
              <span>
                {prog.answered} answered · {prog.skipped} skipped · {prog.remaining} remaining
              </span>
            </p>
            <div className={styles.progressBar} aria-hidden="true">
              <div
                className={styles.progressFill}
                style={{ width: `${Math.round(((prog.answered + prog.skipped) / Math.max(prog.total_visible, 1)) * 100)}%` }}
              />
            </div>
          </div>
          {note ? (
            <p className={styles.note} role="status" data-dependents-note>
              {note}
            </p>
          ) : null}
          <ScreenView
            key={`${currentScreen.id}:${session.answers[currentScreen.id]?.answered_at ?? 'new'}`}
            screen={currentScreen}
            initialSelection={
              displayStatus(session, currentScreen.id) === 'answered' || displayStatus(session, currentScreen.id) === 'needs_reanswer'
                ? (session.answers[currentScreen.id]?.selected_option_ids ?? [])
                : []
            }
            needsReanswer={displayStatus(session, currentScreen.id) === 'needs_reanswer'}
            hasDependents={answeredDependents(session, version, currentScreen.id).length > 0}
            canGoBack={prevScreenId(version, session.answers, currentScreen.id) !== null}
            onBack={() => back(currentScreen)}
            onSkip={() => answer(currentScreen, [], 'skipped')}
            onNext={(selection) => answer(currentScreen, selection, 'answered')}
            onReview={() => jumpTo(REVIEW_SCREEN_ID)}
            hasAnyAnswer={Object.keys(session.answers).length > 0}
          />
        </>
      )}

      <Dialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        title="Start the interview over?"
        description="This clears every answer in this browser and starts a fresh session. Your endorsed profile, if any, stays until you delete it on the Profile page."
        actions={
          <>
            <Button onClick={() => setRestartOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={restart} data-confirm-restart>
              Start over
            </Button>
          </>
        }
      />
    </div>
  );
}

// ----------------------------------------------------------------------------------------

interface ScreenViewProps {
  screen: InterviewScreen;
  initialSelection: string[];
  needsReanswer: boolean;
  hasDependents: boolean;
  canGoBack: boolean;
  hasAnyAnswer: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: (selection: string[]) => void;
  onReview: () => void;
}

function ScreenView({
  screen,
  initialSelection,
  needsReanswer,
  hasDependents,
  canGoBack,
  hasAnyAnswer,
  onBack,
  onSkip,
  onNext,
  onReview,
}: ScreenViewProps) {
  const [selection, setSelection] = useState<string[]>(initialSelection);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const promptId = `prompt-${screen.id}`;
  const helpId = screen.help ? `help-${screen.id}` : undefined;

  const allOptions: { id: string; label: string; description?: string; exclusive: boolean }[] = [
    ...screen.options.map((o) => ({ id: o.id, label: o.label, description: o.description, exclusive: false })),
    ...(screen.uncertainty_option ? [{ id: screen.uncertainty_option.id, label: screen.uncertainty_option.label, exclusive: true }] : []),
    ...(screen.none_option ? [{ id: screen.none_option.id, label: screen.none_option.label, exclusive: true }] : []),
  ];

  const problem = selectionProblem(screen, selection);
  const max = screen.kind === 'multi' ? screen.max_select : undefined;

  function toggle(optionId: string) {
    const next = toggleSelection(screen, selection, optionId);
    // The engine returns the selection unchanged (option not added) only when the limit is reached.
    if (!selection.includes(optionId) && !next.includes(optionId) && max !== undefined) {
      setLimitNotice(`You have chosen ${max}. Unselect one to choose another.`);
      return;
    }
    setLimitNotice(null);
    setSelection(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = allOptions.length - 1;
    const map: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowRight: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = map[e.key];
    if (target !== undefined) {
      e.preventDefault();
      buttons.current[target]?.focus();
    }
  }

  return (
    <section className={styles.screen} aria-labelledby={promptId} data-screen-id={screen.id} data-screen-kind={screen.kind}>
      <h2 id={promptId} className={styles.prompt}>
        {screen.prompt}
      </h2>
      {screen.help ? (
        <p id={helpId} className={styles.help}>
          {screen.help}
        </p>
      ) : null}
      {max !== undefined ? (
        <p className={styles.notice} data-max-select>
          Multi-select: choose up to {max}. Selected {selection.filter((id) => screen.options.some((o) => o.id === id)).length} of {max}.
        </p>
      ) : (
        <p className={styles.notice}>Choose one.</p>
      )}
      {needsReanswer ? (
        <p className={styles.note} role="status">
          An earlier answer this question depends on changed. Confirm or change your answer.
        </p>
      ) : null}
      <ul className={styles.options} role="group" aria-labelledby={promptId} aria-describedby={helpId} data-options>
        {allOptions.map((o, i) => {
          const pressed = selection.includes(o.id);
          return (
            <li key={o.id}>
              <button
                onKeyDown={(e) => onKeyDown(e, i)}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                className={[styles.option, o.exclusive ? styles.optionExclusive : ''].join(' ').trim()}
                aria-pressed={pressed}
                onClick={() => toggle(o.id)}
                data-option-id={o.id}
              >
                <span className={styles.check} aria-hidden="true">
                  {pressed ? '✓' : ''}
                </span>
                <span>
                  <span className={styles.optionLabel}>{o.label}</span>
                  {o.description ? <span className={styles.optionDescription}>{o.description}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {limitNotice ? (
        <p className={styles.notice} role="status">
          {limitNotice}
        </p>
      ) : null}
      {hasDependents ? (
        <p className={styles.notice}>Changing this answer resets the answer that depends on it. You will see a note if that happens.</p>
      ) : null}
      <div className={styles.actions}>
        <Button onClick={onBack} disabled={!canGoBack}>
          Back
        </Button>
        <Button variant="quiet" onClick={onSkip}>
          Skip this question
        </Button>
        <span className={styles.spacer} />
        {hasAnyAnswer ? (
          <Button variant="quiet" onClick={onReview}>
            Go to review
          </Button>
        ) : null}
        <Button variant="primary" onClick={() => onNext(selection)} disabled={problem !== null} title={problem ?? undefined}>
          Next
        </Button>
      </div>
      <p className={styles.notice}>
        <KeyboardHint keys={['↑', '↓']} action="move between options" /> · <KeyboardHint keys={['Space']} action="select" /> ·{' '}
        <KeyboardHint keys={['Tab']} action="reach Back / Skip / Next" />
      </p>
    </section>
  );
}

// ----------------------------------------------------------------------------------------

interface ReviewScreenProps {
  version: InterviewVersion;
  session: InterviewSession;
  visible: InterviewScreen[];
  hidden: InterviewScreen[];
  complete: boolean;
  remaining: number;
  onEdit: (screenId: string) => void;
  onBack: () => void;
  onRestart: () => void;
}

function ReviewScreen({ version, session, visible, hidden, complete, remaining, onEdit, onBack, onRestart }: ReviewScreenProps) {
  const rows = sortedScreens(version).map((s) => {
    const isVisible = visible.some((v) => v.id === s.id);
    const st: DisplayStatus = isVisible ? displayStatus(session, s.id) : 'not_applicable';
    const answer = session.answers[s.id];
    const labels =
      st === 'answered' || st === 'needs_reanswer'
        ? (answer?.selected_option_ids ?? []).map((id) => {
            const sc = findScreen(version, s.id);
            return (
              sc?.options.find((o) => o.id === id)?.label ??
              (sc?.uncertainty_option?.id === id ? sc.uncertainty_option.label : sc?.none_option?.id === id ? sc.none_option.label : id)
            );
          })
        : [];
    return { screen: s, status: st, labels, visible: isVisible };
  });

  return (
    <Stack gap={4} data-review-screen>
      <h2>Review your answers</h2>
      <p className={styles.help}>
        {complete
          ? 'Every visible question is answered or skipped. You can edit any answer, or continue to your profile.'
          : `${remaining} question${remaining === 1 ? '' : 's'} still open. You can answer ${remaining === 1 ? 'it' : 'them'}, or continue to the profile with those listed as unknowns.`}
        {hidden.length > 0
          ? ` ${hidden.length} conditional question${hidden.length === 1 ? ' does' : 's do'} not apply to your answers.`
          : ''}
      </p>
      <Card>
        <table className={styles.reviewTable}>
          <caption className={styles.mono} style={{ textAlign: 'left', paddingBottom: 'var(--space-2)' }}>
            {visible.length} visible screens · {hidden.length} not applicable
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Question</th>
              <th scope="col">Status</th>
              <th scope="col">Answer</th>
              <th scope="col">
                <VisuallyHidden>Edit</VisuallyHidden>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.screen.id} data-review-row={r.screen.id} data-review-status={r.status}>
                <td className={styles.mono}>{i + 1}</td>
                <td>
                  {r.screen.summary_label ?? r.screen.prompt}
                  {r.screen.base_or_conditional === 'conditional' ? (
                    <>
                      {' '}
                      <span className={styles.mono}>(conditional)</span>
                    </>
                  ) : null}
                </td>
                <td>
                  <Badge variant={STATUS_VARIANT[r.status]}>{DISPLAY_STATUS_LABEL[r.status]}</Badge>
                </td>
                <td>{r.labels.join('; ')}</td>
                <td>
                  {r.visible ? (
                    <button type="button" className={styles.linkButton} onClick={() => onEdit(r.screen.id)} aria-label={`Edit: ${r.screen.summary_label ?? r.screen.prompt}`}>
                      Edit
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className={styles.actions}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="quiet" onClick={onRestart}>
          Start over
        </Button>
        <span className={styles.spacer} />
        <Link href="/profile" data-continue-to-profile>
          Continue to your profile
        </Link>
      </div>
    </Stack>
  );
}
