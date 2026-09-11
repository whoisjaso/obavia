'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AssistanceMode, DrillChoice, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import { maskForMode } from '@apohenia/domain/practice';
import { stageLabel } from '@apohenia/domain/scripts';
import { Chip, Icon, IconButton, LineCard, NotAssessedLabel, Ring, Sheet, SlotLine, type IconName } from '@/components/ui';
import { pct, resolveForPractice, verdictText } from './practice-lib';
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

/** 96px round hero docked on a glass band above the tab bar. Green for check/start, blue for next. */
export function PracticeHero({ action, label, disabled, onClick, left, right }: PracticeHeroProps) {
  return (
    <div className={styles.foot} data-practice-foot>
      <div className={styles.footInner}>
        <div className={styles.footSide}>{left}</div>
        <div className={styles.heroWrap}>
          <button type="button" className={styles.hero} data-practice-hero={action} data-tone={action === 'next' ? 'blue' : 'green'} aria-label={label ?? HERO_WORD[action]} disabled={disabled} onClick={onClick}>
            <Icon name={HERO_ICON[action]} size={40} weight="bold" />
          </button>
          <span className={styles.heroCaption} aria-hidden="true">
            {HERO_WORD[action]}
          </span>
        </div>
        <div className={[styles.footSide, styles.footRight].join(' ')}>{right}</div>
      </div>
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

const STATE_TEXT: Record<ChoiceState, string> = { idle: '', selected: 'selected', correct: 'accepted answer', wrong: 'your choice, not accepted', dim: '' };

export function ChoiceTile({ choice, index, state, disabled, onPress, note, pressed }: ChoiceTileProps) {
  const cls = [styles.choice, styles[`choice_${state}`]].join(' ');
  const keycap = index < 9 ? String(index + 1) : '';
  return (
    <button type="button" className={cls} aria-pressed={pressed ?? state === 'selected'} disabled={disabled} onClick={onPress} data-choice-id={choice.id} data-choice-state={state}>
      <span className={styles.choiceKey} aria-hidden="true">
        {state === 'correct' ? <Icon name="check" size={16} weight="bold" /> : state === 'wrong' ? <Icon name="x" size={16} weight="bold" /> : keycap}
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
// Synthetic prospect line: gold-tinted card, fictional mark, never a real prospect.
// ---------------------------------------------------------------------------------------

export function ProspectCard({ text, label = 'They said' }: { text: string; label?: string }) {
  return (
    <section className={styles.prospect} data-synthetic-line aria-label={`Synthetic prospect line, fictional, not a real prospect: ${text}`}>
      <span className={styles.prospectHead} aria-hidden="true">
        <Icon name="spark" size={13} weight="fill" />
        <span>{label}</span>
      </span>
      <span className={styles.prospectText} aria-hidden="true">
        {text}
      </span>
    </section>
  );
}

/** The drill's own question when no synthetic prospect line carries it (e.g. "which branch handles this category?"). */
export function QuestionCard({ text }: { text: string }) {
  return (
    <section className={styles.question} data-drill-question aria-label={`Drill question: ${text}`}>
      <span className={styles.questionGlyph} aria-hidden="true">
        <Icon name="question" size={18} weight="bold" />
      </span>
      <span className={styles.questionText} aria-hidden="true">
        {text}
      </span>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Assistance: what the current mode shows for a node. The primary line is rendered verbatim,
// either in the full LineCard (never re-flows) or as a two-line preview that expands in place,
// or replaced by a hidden-line card with an optional Reveal.
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
  /** Why now, listen for, mirrors: the sheet behind the info control (the stage carries none of that text). */
  onInfo?: () => void;
  /** Fictional practice prospect facts: slots resolve against them (unfilled slots render as chips). */
  facts?: Record<string, string>;
  /** Two-line preview with an expand control: the line is context, the answer tiles are the hero. */
  preview?: boolean;
  /** Small controls at the right of the preview head (e.g. stage jump), before the info and expand controls. */
  tools?: ReactNode;
}

export function AssistCard({ node, mode, revealed, onReveal, hideLine, hideMirrors, meta, onInfo, facts = {}, preview, tools }: AssistCardProps) {
  const [expanded, setExpanded] = useState(false);
  const masked = maskForMode(node, mode, revealed);
  const view = { ...masked, primary: masked.primary === null ? null : resolveForPractice(masked.primary, facts), mirrors: masked.mirrors.map((m) => resolveForPractice(m, facts)) };
  const shown = view.primary !== null && !hideLine;
  const stage = stageLabel(node.stage);
  const mirrorCount = shown && !hideMirrors ? view.mirrors.length : 0;
  const infoLabel = mirrorCount > 0 ? `Why this line now, what to listen for, and ${mirrorCount} mirror ${mirrorCount === 1 ? 'question' : 'questions'}` : 'Why this line now and what to listen for';
  return (
    <div data-assistance-block data-primary={shown ? 'shown' : 'hidden'} data-node-id={node.id} data-mode={mode} data-mirrors={mirrorCount}>
      {shown && preview ? (
        <section className={[styles.previewCard, expanded ? styles.previewExpanded : ''].join(' ').trim()} aria-label={`Script line, stage ${stage}`} data-line-preview data-expanded={expanded ? 'true' : 'false'}>
          <div className={styles.previewHead}>
            <Chip static label={stage} tone="teal" icon={node.approval.status === 'published' ? 'lock' : undefined} name={`Stage ${stage}`} />
            {meta}
            <span className={styles.previewTools}>
              {tools}
              {onInfo ? <IconButton icon="info" label={infoLabel} onClick={onInfo} className={styles.quietButton} data-line-info /> : null}
              <IconButton icon={expanded ? 'arrow-up' : 'chevron-down'} label={expanded ? 'Collapse the script line' : 'Show the whole script line'} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className={styles.quietButton} data-line-expand />
            </span>
          </div>
          <span className={styles.previewText} data-primary-line data-node-id={node.id}>
            <SlotLine text={view.primary ?? ''} />
          </span>
        </section>
      ) : shown ? (
        <LineCard stage={stage} line={view.primary ?? ''} nodeId={node.id} locked={node.approval.status === 'published'} minLines={2} meta={meta} onInfo={onInfo} />
      ) : (
        <section className={styles.hiddenLine} aria-label={`Script line, stage ${stage}, hidden`} data-primary-hidden>
          <div className={styles.hiddenHead}>
            <Chip static label={stage} tone="teal" name={`Stage ${stage}`} />
            {meta}
            {onInfo ? <IconButton icon="info" label="Why this line now" onClick={onInfo} className={styles.quietButton} /> : null}
          </div>
          <div className={styles.hiddenGlyph} aria-hidden="true">
            <Icon name="more" size={44} weight="bold" />
          </div>
          <span className="sr-only">{hideLine ? 'Primary line hidden by this drill.' : 'Primary line hidden in this mode.'}</span>
          {view.can_reveal && !hideLine ? <Chip icon="eye" label="Reveal" name="Reveal the primary line (allowed in this mode)" tone="teal" onClick={onReveal} data-reveal /> : null}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Result: verdict mark, two rings (Memory / Conversation), a tone caption, word chips.
// ---------------------------------------------------------------------------------------

function ScoreRing({ label, scored, value, name, color, kind }: { label: string; scored: boolean; value: number; name: string; color: string; kind: 'number' | 'check' }) {
  return (
    <div className={styles.score} data-score={label.toLowerCase()} data-scored={scored ? 'true' : 'false'} data-score-value={scored ? value.toFixed(2) : undefined}>
      <Ring value={scored ? value : 0} size={72} stroke={7} color={scored ? color : 'var(--ink-3)'} label={name}>
        <span className={styles.scoreCenter} aria-hidden="true">
          {!scored ? <Icon name="empty" size={20} weight="bold" className={styles.scoreEmpty} /> : kind === 'check' ? <Icon name={value >= 1 ? 'check' : 'x'} size={28} weight="bold" /> : `${Math.round(value * 100)}%`}
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
  /** Accepted labels for the info sheet. */
  accepted?: string[];
}

export function ResultCard({ result, children, accepted }: ResultCardProps) {
  const [why, setWhy] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const m = result.memorization_score;
  const c = result.conversation_score;
  const verdict = result.correct === null ? 'self' : result.correct ? 'yes' : 'no';
  const text = verdictText(result);
  const memoryName = m ? `Memory: exact match ${pct(m.exact_match_ratio)}, word order ${pct(m.word_order_ratio)}` : 'Memory: not scored in this drill';
  const conversationName = c
    ? `Conversation: objective ${c.objective_satisfied ? 'satisfied' : 'not satisfied'}${c.branch_choice_correct !== undefined ? `, branch choice ${c.branch_choice_correct ? 'correct' : 'incorrect'}` : ''}${c.accurate_disqualification ? ', accurate disqualification' : ''}`
    : 'Conversation: not scored in this drill';

  // The result arrives where the input was; bring the whole card above the docked hero.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  return (
    <section ref={ref} className={[styles.result, styles[`result_${verdict}`]].join(' ')} data-result-panel data-verdict={verdict} aria-label={`Result: ${text}`}>
      <div className={styles.verdict}>
        <span className={styles.verdictGlyph} aria-hidden="true">
          <Icon name={verdict === 'yes' ? 'check' : verdict === 'no' ? 'x' : 'circle-dashed'} size={28} weight="bold" />
        </span>
        <span className={styles.verdictWord} aria-hidden="true">
          {verdict === 'yes' ? 'Correct' : verdict === 'no' ? 'Not correct' : 'Self-rated'}
        </span>
        <span className="sr-only" data-verdict-text>
          {text}
        </span>
        <IconButton icon="info" label="Why this result" onClick={() => setWhy(true)} className={styles.verdictInfo} data-result-info />
      </div>
      <div className={styles.rings}>
        <ScoreRing label="Memory" scored={m !== undefined} value={m?.exact_match_ratio ?? 0} name={memoryName} color="var(--green)" kind="number" />
        <ScoreRing label="Conversation" scored={c !== undefined} value={c ? (c.objective_satisfied ? 1 : 0) : 0} name={conversationName} color="var(--teal)" kind="check" />
      </div>
      <div className={styles.toneRow} data-score="tone">
        <NotAssessedLabel name={TONE_NAME} label="Tone: Not assessed" className={styles.toneLabel} />
      </div>
      {result.missing_words.length > 0 ? (
        <div className={styles.words} data-missing-words>
          <span className={styles.wordsKey} aria-hidden="true">
            Missing
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
          <span className={styles.wordsKey} aria-hidden="true">
            Extra
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
            <span className={styles.sheetText}>Not assessed (text-only)</span>
          </div>
          {result.simulation_disclaimer ? <p className={styles.sheetWarn}>{result.simulation_disclaimer}.</p> : null}
        </div>
      </Sheet>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Empty state: one icon + two words + one action tile (never a prose box).
// ---------------------------------------------------------------------------------------

export function EmptyGlyph({ icon = 'empty', label, children }: { icon?: IconName; label: string; children?: ReactNode }) {
  return (
    <div className={styles.empty} data-empty>
      <span className={styles.emptyGlyph} aria-hidden="true">
        <Icon name={icon} size={72} weight="regular" />
      </span>
      <span className={styles.emptyLabel}>{label}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Facts: a short list of icon rows (the mock brief), never a paragraph.
// ---------------------------------------------------------------------------------------

export function FactRows({ facts, hook }: { facts: { icon: IconName; text: string }[]; hook?: string }) {
  return (
    <ul className={styles.facts} data-fact-rows={hook}>
      {facts.map((f, i) => (
        <li key={i} className={styles.fact}>
          <Icon name={f.icon} size={20} weight="regular" className={styles.factIcon} />
          <span className={styles.factText}>{f.text}</span>
        </li>
      ))}
    </ul>
  );
}
