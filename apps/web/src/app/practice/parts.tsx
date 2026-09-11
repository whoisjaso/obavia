'use client';

import { useState, type ReactNode } from 'react';
import type { AssistanceMode, DrillChoice, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import { maskForMode } from '@apohenia/domain/practice';
import { stageLabel } from '@apohenia/domain/scripts';
import { Chip, Icon, IconButton, LineCard, NotAssessedGlyph, Ring, Sheet, type IconName } from '@/components/ui';
import { pct, verdictText } from './practice-lib';
import styles from './practice.module.css';

export const TONE_NAME = 'Tone not assessed (text-only)' as const;

// ---------------------------------------------------------------------------------------
// Hero: the one primary control of a drill screen (Check → Next; Start; Advance).
// ---------------------------------------------------------------------------------------

export type HeroAction = 'check' | 'next' | 'start' | 'advance' | 'done';

const HERO_ICON: Record<HeroAction, IconName> = { check: 'check', next: 'next', start: 'play', advance: 'next', done: 'check' };
const HERO_WORD: Record<HeroAction, string> = { check: 'Check', next: 'Next', start: 'Start', advance: 'Next', done: 'Done' };

export interface PracticeHeroProps {
  action: HeroAction;
  /** Full accessible name; defaults to the one-word caption. */
  label?: string;
  disabled?: boolean;
  onClick: () => void;
  /** Small control at the left of the hero (e.g. skip). */
  left?: ReactNode;
  /** Small control at the right of the hero (e.g. end). */
  right?: ReactNode;
}

/** 112px round hero pinned above the tab bar. Green for check/start, blue for next. */
export function PracticeHero({ action, label, disabled, onClick, left, right }: PracticeHeroProps) {
  return (
    <div className={styles.foot} data-practice-foot>
      <div className={styles.footSide}>{left}</div>
      <div className={styles.heroWrap}>
        <button type="button" className={styles.hero} data-practice-hero={action} data-tone={action === 'next' ? 'blue' : 'green'} aria-label={label ?? HERO_WORD[action]} disabled={disabled} onClick={onClick}>
          <Icon name={HERO_ICON[action]} size={48} strokeWidth={2} />
        </button>
        <span className={styles.heroCaption} aria-hidden="true">
          {HERO_WORD[action]}
        </span>
      </div>
      <div className={[styles.footSide, styles.footRight].join(' ')}>{right}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Choice tiles: big tap targets for drill answers (labels are script content, so any length).
// ---------------------------------------------------------------------------------------

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

export interface ChoiceTileProps {
  choice: DrillChoice;
  index: number;
  state: ChoiceState;
  disabled?: boolean;
  onPress?: () => void;
  /** Text under the label after checking (the choice note). */
  note?: string;
  /** Override the pressed semantics (ordering rows use it for "swap from"). */
  pressed?: boolean;
}

const STATE_GLYPH: Record<ChoiceState, string> = { idle: '', selected: '', correct: '✓', wrong: '✗', dim: '' };
const STATE_TEXT: Record<ChoiceState, string> = { idle: '', selected: 'selected', correct: 'accepted answer', wrong: 'your choice, not accepted', dim: '' };

export function ChoiceTile({ choice, index, state, disabled, onPress, note, pressed }: ChoiceTileProps) {
  const cls = [styles.choice, styles[`choice_${state}`]].join(' ');
  const keycap = index < 9 ? String(index + 1) : undefined;
  return (
    <button type="button" className={cls} aria-pressed={pressed ?? state === 'selected'} disabled={disabled} onClick={onPress} data-choice-id={choice.id} data-choice-state={state}>
      <span className={styles.choiceKey} aria-hidden="true">
        {STATE_GLYPH[state] || keycap || '·'}
      </span>
      <span className={styles.choiceBody}>
        <span className={styles.choiceLabel}>{choice.label}</span>
        {note ? <span className={styles.choiceNote}>{note}</span> : null}
      </span>
      {STATE_TEXT[state] ? <span className="sr-only">, {STATE_TEXT[state]}</span> : null}
    </button>
  );
}

// ---------------------------------------------------------------------------------------
// Synthetic prospect line — gold-tinted card, ✦ fictional, never a real prospect.
// ---------------------------------------------------------------------------------------

export function ProspectCard({ text, label = 'They said' }: { text: string; label?: string }) {
  return (
    <section className={styles.prospect} data-synthetic-line aria-label={`Synthetic prospect line, fictional, not a real prospect: ${text}`}>
      <span className={styles.prospectHead} aria-hidden="true">
        <span className={styles.prospectGlyph}>✦</span>
        <span>{label}</span>
      </span>
      <span className={styles.prospectText} aria-hidden="true">
        {text}
      </span>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Assistance: what the current mode shows for a node. The primary line is rendered verbatim
// in a LineCard (never re-flows) or replaced by a hidden-line card with an optional Reveal.
// ---------------------------------------------------------------------------------------

export interface AssistCardProps {
  node: ScriptNode;
  mode: AssistanceMode;
  revealed: boolean;
  onReveal: () => void;
  /** The drill itself hides the line (typed recall) regardless of mode. */
  hideLine?: boolean;
  /** Mirrors would give the answer away (mirror duel, moment). */
  hideMirrors?: boolean;
  /** Extra chip(s) next to the stage. */
  meta?: ReactNode;
  onInfo?: () => void;
}

export function AssistCard({ node, mode, revealed, onReveal, hideLine, hideMirrors, meta, onInfo }: AssistCardProps) {
  const view = maskForMode(node, mode, revealed);
  const shown = view.primary !== null && !hideLine;
  const stage = stageLabel(node.stage);
  const draft = node.approval.status !== 'published' ? <Chip static glyph="◔" label={node.approval.status} name={`Approval status: ${node.approval.status} — training only`} tone="teal" /> : null;
  return (
    <div data-assistance-block data-primary={shown ? 'shown' : 'hidden'} data-node-id={node.id} data-mode={mode}>
      {shown ? (
        <LineCard stage={stage} line={view.primary ?? ''} bridge={view.purpose ?? undefined} nodeId={node.id} locked={node.approval.status === 'published'} minLines={2} meta={<>{draft}{meta}</>} onInfo={onInfo} />
      ) : (
        <section className={styles.hiddenLine} aria-label={`Script line, stage ${stage}, hidden`} data-primary-hidden>
          <div className={styles.hiddenHead}>
            <Chip static label={stage} tone="teal" name={`Stage ${stage}`} />
            {draft}
            {meta}
            {onInfo ? <IconButton icon="info" label="Why this line now" onClick={onInfo} className={styles.hiddenInfo} /> : null}
          </div>
          <div className={styles.hiddenGlyph} aria-hidden="true">
            · · ·
          </div>
          <span className="sr-only">{hideLine ? 'Primary line hidden by this drill.' : 'Primary line hidden in this mode.'}</span>
          {view.purpose ? <p className={styles.hiddenBridge}>{view.purpose}</p> : null}
          {view.can_reveal && !hideLine ? <Chip glyph="◑" label="Reveal" name="Reveal the primary line (allowed in this mode)" tone="teal" onClick={onReveal} data-reveal /> : null}
        </section>
      )}
      {shown && !hideMirrors && view.mirrors.length > 0 ? (
        <ul className={styles.mirrors} aria-label="Mirror questions — same answer type, different words">
          {view.mirrors.map((m) => (
            <li key={m} className={styles.mirror}>
              <span aria-hidden="true">⇄</span> {m}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Result: verdict glyph, two rings (Memory / Conversation), a — for tone, word chips.
// ---------------------------------------------------------------------------------------

function ScoreRing({ label, scored, value, name, color, kind }: { label: string; scored: boolean; value: number; name: string; color: string; kind: 'number' | 'check' }) {
  return (
    <div className={styles.score} data-score={label.toLowerCase()} data-scored={scored ? 'true' : 'false'} data-score-value={scored ? value.toFixed(2) : undefined}>
      <Ring value={scored ? value : 0} size={84} stroke={8} color={scored ? color : 'var(--ink-3)'} label={name}>
        <span className={styles.scoreCenter} aria-hidden="true">
          {!scored ? '—' : kind === 'check' ? <Icon name={value >= 1 ? 'check' : 'x'} size={30} strokeWidth={2.5} /> : Math.round(value * 100)}
        </span>
      </Ring>
      <span className={styles.scoreLabel} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

export interface ResultCardProps {
  result: DrillResult;
  /** Extra content below the rings (e.g. the moment comparison). */
  children?: ReactNode;
  /** Accepted labels for the ⓘ sheet. */
  accepted?: string[];
}

export function ResultCard({ result, children, accepted }: ResultCardProps) {
  const [why, setWhy] = useState(false);
  const m = result.memorization_score;
  const c = result.conversation_score;
  const verdict = result.correct === null ? 'self' : result.correct ? 'yes' : 'no';
  const text = verdictText(result);
  const memoryName = m ? `Memory: exact match ${pct(m.exact_match_ratio)}, word order ${pct(m.word_order_ratio)}` : 'Memory: not scored in this drill';
  const conversationName = c
    ? `Conversation: objective ${c.objective_satisfied ? 'satisfied' : 'not satisfied'}${c.branch_choice_correct !== undefined ? `, branch choice ${c.branch_choice_correct ? 'correct' : 'incorrect'}` : ''}${c.accurate_disqualification ? ', accurate disqualification' : ''}`
    : 'Conversation: not scored in this drill';
  return (
    <section className={[styles.result, styles[`result_${verdict}`]].join(' ')} data-result-panel data-verdict={verdict} aria-label={`Result: ${text}`}>
      <div className={styles.verdict}>
        <span className={styles.verdictGlyph} aria-hidden="true">
          {verdict === 'yes' ? '✓' : verdict === 'no' ? '✗' : '◌'}
        </span>
        <span className="sr-only" data-verdict-text>
          {text}
        </span>
        <IconButton icon="info" label="Why this result" onClick={() => setWhy(true)} className={styles.verdictInfo} data-result-info />
      </div>
      <div className={styles.rings}>
        <ScoreRing label="Memory" scored={m !== undefined} value={m?.exact_match_ratio ?? 0} name={memoryName} color="var(--green)" kind="number" />
        <ScoreRing label="Conversation" scored={c !== undefined} value={c ? (c.objective_satisfied ? 1 : 0) : 0} name={conversationName} color="var(--teal)" kind="check" />
        <div className={styles.score} data-score="tone">
          <span className={styles.toneRing}>
            <NotAssessedGlyph name={TONE_NAME} className={styles.toneGlyph} />
          </span>
          <span className={styles.scoreLabel} aria-hidden="true">
            Tone
          </span>
        </div>
      </div>
      {result.missing_words.length > 0 ? (
        <div className={styles.words} data-missing-words>
          <span className={styles.wordsGlyph} aria-hidden="true">
            −
          </span>
          <span className="sr-only">Missing words:</span>
          {result.missing_words.map((w, i) => (
            <span key={`${w}-${i}`} className={[styles.wordChip, styles.wordMissing].join(' ')}>
              {w}
            </span>
          ))}
        </div>
      ) : null}
      {result.extra_words.length > 0 ? (
        <div className={styles.words} data-extra-words>
          <span className={styles.wordsGlyph} aria-hidden="true">
            +
          </span>
          <span className="sr-only">Extra words:</span>
          {result.extra_words.map((w, i) => (
            <span key={`${w}-${i}`} className={[styles.wordChip, styles.wordExtra].join(' ')}>
              {w}
            </span>
          ))}
        </div>
      ) : null}
      {children}
      <Sheet open={why} onClose={() => setWhy(false)} title="Why" data-sheet="result-why">
        <div className={styles.sheetStack}>
          <p className={styles.sheetBig}>{text}</p>
          <p className={styles.sheetText}>{result.notes}</p>
          {accepted && accepted.length > 0 ? (
            <div className={styles.sheetRow}>
              <span className={styles.sheetKey}>Accepted</span>
              <ul className={styles.sheetList}>
                {accepted.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={styles.sheetRow}>
            <span className={styles.sheetKey}>Memory</span>
            <span className={styles.sheetText}>{memoryName.replace(/^Memory: /, '')}</span>
          </div>
          <div className={styles.sheetRow}>
            <span className={styles.sheetKey}>Conversation</span>
            <span className={styles.sheetText}>{conversationName.replace(/^Conversation: /, '')}</span>
          </div>
          <div className={styles.sheetRow}>
            <span className={styles.sheetKey}>Tone</span>
            <span className={styles.sheetText}>not assessed (text-only)</span>
          </div>
          {result.simulation_disclaimer ? <p className={styles.sheetWarn}>{result.simulation_disclaimer}.</p> : null}
        </div>
      </Sheet>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Empty state: one glyph + two words + one action tile (never a prose box).
// ---------------------------------------------------------------------------------------

export function EmptyGlyph({ glyph, label, children }: { glyph: string; label: string; children?: ReactNode }) {
  return (
    <div className={styles.empty} data-empty>
      <span className={styles.emptyGlyph} aria-hidden="true">
        {glyph}
      </span>
      <span className={styles.emptyLabel}>{label}</span>
      {children}
    </div>
  );
}
