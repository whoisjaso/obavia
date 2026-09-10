'use client';

import type { ReactNode } from 'react';
import type { AssistanceMode, DrillChoice, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import { MODE_LABELS, TONE_NOTE, maskForMode } from '@apohenia/domain/practice';
import { Badge, Button, Inline } from '@/components/ui';
import styles from './practice.module.css';

export const MEMORIZATION_LABEL = 'Memorization' as const;
export const CONVERSATION_LABEL = 'Conversation' as const;

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface ChoiceGroupProps {
  label: string;
  choices: DrillChoice[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** After checking: which ids were correct, to mark them in text (never color alone). */
  correctIds?: string[];
  disabled?: boolean;
}

/** Keyboard-operable toggle buttons (aria-pressed) inside a labelled group. */
export function ChoiceGroup({ label, choices, selected, onSelect, correctIds, disabled }: ChoiceGroupProps) {
  const checked = correctIds !== undefined;
  return (
    <ul className={styles.choices} role="group" aria-label={label} data-choice-group>
      {choices.map((c, i) => {
        const isSelected = selected === c.id;
        const isCorrect = checked && correctIds.includes(c.id);
        const isWrong = checked && isSelected && !isCorrect;
        const cls = [styles.choice, isCorrect ? styles.choiceCorrect : '', isWrong ? styles.choiceWrong : ''].join(' ').trim();
        return (
          <li key={c.id}>
            <button type="button" className={cls} aria-pressed={isSelected} onClick={() => onSelect(c.id)} disabled={disabled} data-choice-id={c.id}>
              <span className={styles.choiceMark} aria-hidden="true">
                {LETTERS[i] ?? String(i + 1)}
              </span>
              <span>
                {c.label}
                {checked ? (
                  <span className={styles.choiceNote}>
                    {isCorrect ? 'Accepted answer. ' : isSelected ? 'Your choice — not accepted. ' : ''}
                    {c.note}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SyntheticProspectLine({ text, label = 'Synthetic prospect line' }: { text: string; label?: string }) {
  return (
    <blockquote className={styles.prospectLine} data-synthetic-line>
      <span className={styles.prospectLabel}>{label} — fictional, not a real prospect</span>
      <span className={styles.prospectText}>{text}</span>
    </blockquote>
  );
}

/** Result panel: memorization and conversation always shown as separate rows; tone always "not assessed". */
export function ResultPanel({ result, extra }: { result: DrillResult; extra?: ReactNode }) {
  const m = result.memorization_score;
  const c = result.conversation_score;
  const headline = result.correct === null ? 'Self-rated — no right answer' : result.correct ? 'Correct' : 'Not correct';
  return (
    <section className={styles.result} aria-label="Result" data-result-panel>
      <h3 className={styles.resultTitle}>
        Result: {headline}
      </h3>
      <dl className={styles.scoreGrid}>
        <dt className={styles.scoreLabel}>{MEMORIZATION_LABEL}</dt>
        <dd>{m ? `exact match ${pct(m.exact_match_ratio)} · word order ${pct(m.word_order_ratio)}` : 'not scored in this drill'}</dd>
        <dt className={styles.scoreLabel}>{CONVERSATION_LABEL}</dt>
        <dd>
          {c
            ? `${c.objective_satisfied ? 'objective satisfied' : 'objective not satisfied'}${c.branch_choice_correct !== undefined ? ` · branch choice ${c.branch_choice_correct ? 'correct' : 'incorrect'}` : ''}${c.accurate_disqualification ? ' · accurate disqualification' : ''}`
            : 'not scored in this drill'}
        </dd>
        <dt className={styles.scoreLabel}>Tone</dt>
        <dd>{TONE_NOTE.replace(/^Tone: /, '')}</dd>
      </dl>
      {result.missing_words.length > 0 ? (
        <p>
          Missing: <span className={styles.wordList}>{result.missing_words.join(' ')}</span>
        </p>
      ) : null}
      {result.extra_words.length > 0 ? (
        <p>
          Extra: <span className={styles.wordList}>{result.extra_words.join(' ')}</span>
        </p>
      ) : null}
      <p className={styles.muted}>{result.notes}</p>
      {result.simulation_disclaimer ? <p className={styles.disclaimer}>{result.simulation_disclaimer}.</p> : null}
      {extra}
    </section>
  );
}

export interface AssistanceBlockProps {
  node: ScriptNode;
  mode: AssistanceMode;
  revealed: boolean;
  onReveal: () => void;
  /** True for typed-recall drills: the primary line is hidden by the drill itself. */
  hidePrimary?: boolean;
}

/** What the current assistance mode shows for the node. Never a score or rank. */
export function AssistanceBlock({ node, mode, revealed, onReveal, hidePrimary }: AssistanceBlockProps) {
  const view = maskForMode(node, mode, revealed);
  const showPrimary = view.primary !== null && !hidePrimary;
  return (
    <div className={styles.assist} data-assistance-block>
      <Inline gap={2}>
        <span className={styles.assistTitle}>Assistance · {MODE_LABELS[mode]}</span>
        <Badge variant="neutral">stage: {view.stage}</Badge>
        <Badge variant={node.approval.status === 'draft' ? 'warning' : 'success'}>{node.approval.status}</Badge>
      </Inline>
      {showPrimary ? (
        <p>
          <strong>Say this:</strong> {view.primary} <span className={styles.cite}>[{node.id}]</span>
        </p>
      ) : hidePrimary ? (
        <p className={styles.hiddenNote}>Primary line hidden by this drill.</p>
      ) : (
        <p className={styles.hiddenNote}>Primary line hidden in this mode.</p>
      )}
      {view.mirrors.length > 0 && !hidePrimary ? (
        <p>
          <strong>Mirror if unclear:</strong> {view.mirrors.join(' / ')}
        </p>
      ) : null}
      {view.purpose ? (
        <p>
          <strong>Why this now:</strong> {view.purpose}
        </p>
      ) : null}
      {view.listen_for ? (
        <p>
          <strong>What to listen for:</strong> {view.listen_for}
        </p>
      ) : null}
      {view.can_reveal && !hidePrimary ? (
        <div>
          <Button onClick={onReveal}>Reveal line</Button>
        </div>
      ) : null}
    </div>
  );
}
