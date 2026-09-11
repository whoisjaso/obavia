'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { InterviewSession, type InterviewScreen, type InterviewVersion } from '@apohenia/domain/schemas';
import {
  DISPLAY_STATUS_LABEL,
  REVIEW_SCREEN_ID,
  answeredDependents,
  applyAnswer,
  createSession,
  displayStatus,
  goTo,
  hiddenConditionalScreens,
  isComplete,
  nextScreenId,
  optionLabelOf,
  prevScreenId,
  progress,
  selectionProblem,
  sortedScreens,
  toggleSelection,
  visibleScreens,
  type DisplayStatus,
} from '@apohenia/domain/interview';
import { Card, Chip, GlyphPill, Icon, IconButton, Ring, Sheet, Tile, TileGrid, TopBar } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './interview.module.css';

const SESSION_KEY = 'interview.session';
const SessionOrNull = InterviewSession.nullable();

/** Status glyph + one word + the whole truth (DISPLAY_STATUS_LABEL) for the review cards. */
const STATUS_GLYPH: Record<DisplayStatus, { glyph: string; word: string; tone: 'green' | 'neutral' | 'gold' | 'blue' }> = {
  answered: { glyph: '✓', word: 'Answered', tone: 'green' },
  skipped: { glyph: '→', word: 'Skipped', tone: 'neutral' },
  not_applicable: { glyph: '⊘', word: 'N/A', tone: 'neutral' },
  needs_reanswer: { glyph: '↺', word: 'Re-check', tone: 'gold' },
  unanswered: { glyph: '○', word: 'Open', tone: 'blue' },
};

export interface InterviewClientProps {
  version: InterviewVersion;
  placeholder: boolean;
}

/**
 * Identity interview (DESIGN_SYSTEM §3.6): one question per screen, the prompt at `--fs-large`,
 * full-bleed option tiles, Next/Back as hero chips, progress as a ring in the top bar, review as a
 * card list with Edit chips. Click-only; the engine (`@apohenia/domain/interview`) owns every rule.
 */
export function InterviewClient({ version, placeholder }: InterviewClientProps) {
  const [stored, setStored, hydrated] = useStoredState<InterviewSession | null>(SESSION_KEY, SessionOrNull, null);
  // A fresh session is created lazily and only becomes persisted on the first answer or skip.
  const [fresh] = useState(() => createSession(version));
  const [note, setNote] = useState<{ count: number; labels: string[] } | null>(null);
  const [sheet, setSheet] = useState<'none' | 'help' | 'restart'>('none');
  const [live, setLive] = useState('');

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
  const hasAnyAnswer = Object.keys(session.answers).length > 0;

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
    setNote(reset.length > 0 ? { count: reset.length, labels: reset.map((d) => d.summary_label ?? d.prompt) } : null);
    const nextId = nextScreenId(version, applied.answers, screen.id);
    commit(goTo(applied, nextId));
    setLive(nextId === REVIEW_SCREEN_ID ? 'Review your answers.' : `Question ${visibleScreens(version, applied.answers).findIndex((s) => s.id === nextId) + 1}.`);
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
    setSheet('none');
    setNote(null);
    commit(createSession(version));
    setLive('Interview started over. Every answer in this browser was cleared.');
  }

  const index = currentScreen ? visible.findIndex((s) => s.id === currentScreen.id) : visible.length;
  const doneFraction = prog.total_visible > 0 ? (prog.answered + prog.skipped) / prog.total_visible : 0;
  const progressName = onReview
    ? `Review: ${prog.answered} answered, ${prog.skipped} skipped, ${prog.remaining} remaining of ${prog.total_visible} visible`
    : `Question ${index + 1} of ${prog.total_visible} visible${hidden.length > 0 ? ` (up to ${hidden.length} more may appear based on your answers)` : ''}: ${prog.answered} answered, ${prog.skipped} skipped, ${prog.remaining} remaining`;

  if (!hydrated) {
    return (
      <div className={styles.root} data-interview data-hydrated="false">
        <TopBar />
        <span className="sr-only" role="status">
          Reading saved answers
        </span>
      </div>
    );
  }

  return (
    <div className={styles.root} data-interview data-hydrated="true" data-interview-status={session.status}>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-interview-live>
        {live}
      </div>
      <TopBar
        left={
          <>
            <IconButton icon="x" label="Leave the interview — answers so far stay saved" href="/today" data-interview-exit />
            {placeholder ? <GlyphPill glyph="◔" label="Placeholder" name="Placeholder seed — the interview content is not authored yet" tone="orange" /> : null}
          </>
        }
        center={
          <span className={styles.progress} data-progress-line data-index={index + 1} data-total={prog.total_visible}>
            <Ring value={doneFraction} size={30} stroke={4} color="var(--blue)" label={progressName} />
            <span className={styles.progressText} aria-hidden="true">
              {onReview ? prog.answered + prog.skipped : index + 1}
              <span className={styles.progressSep}>/</span>
              {prog.total_visible}
            </span>
          </span>
        }
        right={
          <>
            <IconButton icon="info" label="Help for this question" onClick={() => setSheet('help')} data-help-open />
            {hasAnyAnswer && !onReview ? <IconButton icon="list" label="Go to review" onClick={() => jumpTo(REVIEW_SCREEN_ID)} data-review-open /> : null}
          </>
        }
      />

      {note ? (
        <Card dense tone="orange" role="status" data-dependents-note>
          <span className={styles.noteRow}>
            <span className={styles.noteGlyph} aria-hidden="true">
              ↺
            </span>
            <span aria-hidden="true" className={styles.noteText}>
              {note.count === 1 ? 'Reset' : `Reset ${note.count}`} · {note.labels.join(' · ')}
            </span>
            <span className="sr-only">
              Because this answer changed, {note.count === 1 ? 'a dependent answer was' : `${note.count} dependent answers were`} reset: {note.labels.map((l) => `“${l}”`).join(', ')}. Nothing else was touched.
            </span>
          </span>
        </Card>
      ) : null}

      {onReview ? (
        <ReviewScreen version={version} session={session} visible={visible} hidden={hidden} complete={isComplete(session, version)} remaining={prog.remaining} onEdit={jumpTo} onBack={() => back(null)} onRestart={() => setSheet('restart')} />
      ) : (
        <ScreenView
          key={`${currentScreen.id}:${session.answers[currentScreen.id]?.answered_at ?? 'new'}`}
          screen={currentScreen}
          index={index}
          total={prog.total_visible}
          initialSelection={displayStatus(session, currentScreen.id) === 'answered' || displayStatus(session, currentScreen.id) === 'needs_reanswer' ? (session.answers[currentScreen.id]?.selected_option_ids ?? []) : []}
          needsReanswer={displayStatus(session, currentScreen.id) === 'needs_reanswer'}
          hasDependents={answeredDependents(session, version, currentScreen.id).length > 0}
          canGoBack={prevScreenId(version, session.answers, currentScreen.id) !== null}
          onBack={() => back(currentScreen)}
          onSkip={() => answer(currentScreen, [], 'skipped')}
          onNext={(selection) => answer(currentScreen, selection, 'answered')}
        />
      )}

      {/* ⓘ — help text and rules, off the stage. */}
      <Sheet open={sheet === 'help'} onClose={() => setSheet('none')} title="Help" data-sheet="interview-help">
        <div className={styles.sheetStack}>
          {currentScreen ? (
            <>
              <p className={styles.sheetBig}>{currentScreen.prompt}</p>
              {currentScreen.help ? <p className={styles.sheetText}>{currentScreen.help}</p> : null}
              {currentScreen.options.some((o) => o.description) ? (
                <ul className={styles.sheetOptions} data-option-descriptions>
                  {currentScreen.options.map((o) => (
                    <li key={o.id}>
                      <span className={styles.sheetOptionLabel}>{o.label}</span>
                      {o.description ? <span className={styles.sheetMuted}> — {o.description}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className={styles.sheetText}>{currentScreen.kind === 'multi' ? `Choose up to ${currentScreen.max_select ?? 1}.` : 'Choose one.'} Skip is always available. No typing required.</p>
              {currentScreen.base_or_conditional === 'conditional' ? <p className={styles.sheetMuted}>This question appears because of an earlier answer; changing that answer resets it.</p> : null}
            </>
          ) : (
            <>
              <p className={styles.sheetBig}>Review your answers</p>
              <p className={styles.sheetText}>Every question shows its status. Edit any answer; a changed answer resets the questions that depend on it. Continue to your profile with open questions listed as unknowns.</p>
            </>
          )}
          <p className={styles.sheetMuted}>Private. Answers never enter a prospect’s context. Stored in this browser only.</p>
        </div>
      </Sheet>

      {/* Start over — two tiles, no paragraph. */}
      <Sheet open={sheet === 'restart'} onClose={() => setSheet('none')} title="Start over" data-sheet="interview-restart">
        <div className={styles.sheetStack}>
          <p className={styles.sheetText}>Clears every answer in this browser and starts a fresh session. Your endorsed profile, if any, stops being used by Today until you endorse again.</p>
          <TileGrid columns={2}>
            <Tile icon="refresh" label="Start over" tone="red" name="Start the interview over — clears every answer in this browser" onClick={restart} data-confirm-restart />
            <Tile icon="check" label="Keep" name="Keep my answers" onClick={() => setSheet('none')} />
          </TileGrid>
        </div>
      </Sheet>
    </div>
  );
}

// ----------------------------------------------------------------------------------------

interface ScreenViewProps {
  screen: InterviewScreen;
  index: number;
  total: number;
  initialSelection: string[];
  needsReanswer: boolean;
  hasDependents: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: (selection: string[]) => void;
}

/** Short cue (≤3 words) for a selection problem; the full sentence stays the accessible text. */
function reasonCue(problem: string): string {
  if (problem.startsWith('Choose an option')) return 'Pick one';
  if (problem.startsWith('Choose up to')) return 'Too many';
  if (/mutually exclusive|cannot be combined/.test(problem)) return 'One or other';
  return 'Check choice';
}

function ScreenView({ screen, index, total, initialSelection, needsReanswer, hasDependents, canGoBack, onBack, onSkip, onNext }: ScreenViewProps) {
  const [selection, setSelection] = useState<string[]>(initialSelection);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const promptId = useId();
  const reasonId = useId();

  const substantive = screen.options.map((o) => ({ id: o.id, label: o.label, description: o.description, exclusive: false as const }));
  const exclusive = [
    ...(screen.uncertainty_option ? [{ id: screen.uncertainty_option.id, label: screen.uncertainty_option.label, description: undefined, exclusive: true as const }] : []),
    ...(screen.none_option ? [{ id: screen.none_option.id, label: screen.none_option.label, description: undefined, exclusive: true as const }] : []),
  ];
  const allOptions = [...substantive, ...exclusive];

  const problem = selectionProblem(screen, selection);
  const max = screen.kind === 'multi' ? screen.max_select : undefined;
  const chosen = selection.filter((id) => screen.options.some((o) => o.id === id)).length;

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

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = allOptions.length - 1;
    const map: Record<string, number> = {
      ArrowDown: i === last ? 0 : i + 1,
      ArrowRight: i === last ? 0 : i + 1,
      ArrowUp: i === 0 ? last : i - 1,
      ArrowLeft: i === 0 ? last : i - 1,
      Home: 0,
      End: last,
    };
    const target = map[e.key];
    if (target !== undefined) {
      e.preventDefault();
      buttons.current[target]?.focus();
    }
  }

  const renderOption = (o: (typeof allOptions)[number], i: number) => {
    const pressed = selection.includes(o.id);
    return (
      <li key={o.id} className={o.exclusive ? styles.exclusiveItem : undefined}>
        <button
          type="button"
          ref={(el) => {
            buttons.current[i] = el;
          }}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={[styles.option, o.exclusive ? styles.optionExclusive : '', pressed ? styles.optionSelected : ''].join(' ').trim()}
          aria-pressed={pressed}
          aria-label={o.description ? `${o.label} — ${o.description}` : undefined}
          onClick={() => toggle(o.id)}
          data-option-id={o.id}
        >
          {pressed ? (
            <span className={styles.optionCheck} aria-hidden="true">
              <Icon name="check" size={14} strokeWidth={2.5} />
            </span>
          ) : null}
          <span className={styles.optionLabel} aria-hidden={o.description ? true : undefined}>
            {o.label}
          </span>
        </button>
      </li>
    );
  };

  return (
    <section className={styles.screen} aria-labelledby={promptId} data-screen-id={screen.id} data-screen-kind={screen.kind}>
      <div className={styles.cueRow}>
        <span className="sr-only">
          Question {index + 1} of {total} visible.
        </span>
        {screen.base_or_conditional === 'conditional' ? <Chip static glyph="↳" label="Follow-up" name="Conditional question — shown because of an earlier answer" tone="teal" /> : null}
        {needsReanswer ? (
          <span data-needs-reanswer role="status">
            <Chip static glyph="↺" label="Re-check" name="An earlier answer this question depends on changed. Confirm or change your answer." tone="gold" />
          </span>
        ) : null}
        {hasDependents ? (
          <span data-has-dependents>
            <Chip static glyph="⇢" label="Has follow-up" name="Changing this answer resets the answer that depends on it. You will see a note if that happens." />
          </span>
        ) : null}
      </div>

      <h2 id={promptId} className={styles.prompt}>
        {screen.prompt}
      </h2>

      <div className={styles.kindRow}>
        {max !== undefined ? (
          <span data-max-select data-chosen={chosen}>
            <Chip static glyph="◫" label={`Up to ${max}`} name={`Multi-select: choose up to ${max}. Selected ${chosen} of ${max}.`} />
          </span>
        ) : (
          <span data-pick-one>
            <Chip static glyph="◉" label="Pick one" name="Choose one." />
          </span>
        )}
        {max !== undefined ? (
          <span className={styles.countPill} aria-hidden="true">
            {chosen}/{max}
          </span>
        ) : null}
        {limitNotice ? (
          <span role="status" data-limit-notice>
            <Chip static glyph="◫" label={`Max ${max ?? ''}`} tone="gold" name={limitNotice} />
          </span>
        ) : null}
      </div>

      <ul className={styles.options} role="group" aria-labelledby={promptId} data-options>
        {substantive.map((o, i) => renderOption(o, i))}
        {exclusive.map((o, j) => renderOption(o, substantive.length + j))}
      </ul>

      <div className={styles.actions}>
        <IconButton icon="arrow-left" label="Back" size={56} disabled={!canGoBack} onClick={onBack} data-back />
        <Chip label="Skip" glyph="→" name="Skip this question" onClick={onSkip} data-skip />
        <span className={styles.spacer} />
        {problem !== null ? (
          <span id={reasonId} className={styles.reason} data-next-reason>
            <span aria-hidden="true">◌ {reasonCue(problem)}</span>
            <span className="sr-only">{problem}</span>
          </span>
        ) : null}
        <button type="button" className={styles.nextHero} onClick={() => onNext(selection)} disabled={problem !== null} aria-describedby={problem !== null ? reasonId : undefined} data-next>
          <span>Next</span>
          <Icon name="arrow-right" size={22} strokeWidth={2.25} />
        </button>
      </div>
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
    const labels = st === 'answered' || st === 'needs_reanswer' ? (answer?.selected_option_ids ?? []).map((id) => optionLabelOf(s, id)) : [];
    return { screen: s, status: st, labels, visible: isVisible };
  });
  const prog = progress(session, version);
  const summaryName = complete
    ? `Every visible question is answered or skipped. ${prog.answered} answered, ${prog.skipped} skipped.${hidden.length > 0 ? ` ${hidden.length} conditional question${hidden.length === 1 ? ' does' : 's do'} not apply to your answers.` : ''} You can edit any answer, or continue to your profile.`
    : `${remaining} question${remaining === 1 ? '' : 's'} still open. You can answer ${remaining === 1 ? 'it' : 'them'}, or continue to the profile with those listed as unknowns.`;

  return (
    <div className={styles.review} data-review-screen data-complete={complete ? 'true' : 'false'}>
      <h2 className="sr-only">Review your answers</h2>
      <div className={styles.reviewHead} role="group" aria-label={summaryName} data-review-summary>
        <Ring value={prog.total_visible > 0 ? (prog.answered + prog.skipped) / prog.total_visible : 0} size={72} stroke={7} color={complete ? 'var(--green)' : 'var(--blue)'}>
          <span className={styles.reviewRingCenter} aria-hidden="true">
            {complete ? <Icon name="check" size={30} strokeWidth={2.5} /> : remaining}
          </span>
        </Ring>
        <div className={styles.reviewChips} aria-hidden="true">
          <Chip static glyph="✓" label={`${prog.answered}`} tone="green" />
          <Chip static glyph="→" label={`${prog.skipped}`} />
          {hidden.length > 0 ? <Chip static glyph="⊘" label={`${hidden.length}`} /> : null}
          {!complete ? <Chip static glyph="○" label={`${remaining} open`} tone="blue" /> : (
            <span data-review-complete>
              <Chip static label="All answered" tone="green" />
            </span>
          )}
        </div>
      </div>

      <ul className={styles.reviewList}>
        {rows.map((r, i) => {
          const s = STATUS_GLYPH[r.status];
          const title = r.screen.summary_label ?? r.screen.prompt;
          return (
            <li key={r.screen.id}>
              <Card dense className={[styles.reviewCard, r.visible ? '' : styles.reviewCardMuted].join(' ').trim()} data-review-row={r.screen.id} data-review-status={r.status}>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewIndex} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className={styles.reviewBody}>
                    <span className={styles.reviewTitle}>
                      {title}
                      {r.screen.base_or_conditional === 'conditional' ? <span className={styles.reviewCond} aria-label="conditional"> ↳</span> : null}
                    </span>
                    <span className={styles.reviewMeta}>
                      <Chip static glyph={s.glyph} label={s.word} tone={s.tone} name={DISPLAY_STATUS_LABEL[r.status]} />
                      {r.labels.map((l) => (
                        <Chip key={l} static label={l} name={`Answer: ${l}`} className={styles.answerChip} />
                      ))}
                    </span>
                  </div>
                  {r.visible ? <Chip label="Edit" glyph="✎" name={`Edit: ${title}`} onClick={() => onEdit(r.screen.id)} data-review-edit={r.screen.id} /> : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <TileGrid columns={3}>
        <Tile icon="arrow-left" label="Back" name="Back to the last question" onClick={onBack} data-review-back />
        <Tile icon="refresh" label="Start over" tone="red" name="Start the interview over (asks once more)" onClick={onRestart} data-review-restart />
        <Tile icon="person" label="Profile" tone="green" name="Continue to your profile" href="/profile" />
      </TileGrid>
    </div>
  );
}
