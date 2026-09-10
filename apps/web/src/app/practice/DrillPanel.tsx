'use client';

import { useMemo, useState } from 'react';
import type { AssistanceMode, DrillItem, DrillKind, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import {
  branchClassification,
  deliveryReplay,
  exactRecall,
  gradeChoice,
  gradeDeliveryReplay,
  gradeExactRecall,
  gradeOrder,
  mirrorDuel,
  orderRehearsal,
  practiceThisMoment,
  practiceThisMomentComparison,
  randomizedNodeLookup,
  recallWithReveal,
  vocabularyMeaning,
  type MomentContext,
  type VocabularyItemInput,
} from '@apohenia/domain/practice';
import { Badge, Button, Card, Field, Inline, Select, Stack } from '@/components/ui';
import { AssistanceBlock, ChoiceGroup, ResultPanel, SyntheticProspectLine } from './shared';
import styles from './practice.module.css';

/** FICTIONAL vocabulary items for the meaning-fidelity drill (brief §7 examples, synthetic). */
const VOCAB_ITEMS: VocabularyItemInput[] = [
  { phrase: 'gratification', definition_given: null, candidate_synonyms: ['satisfaction', 'pleasure', 'reward'] },
  { phrase: 'profit', definition_given: 'what is left after floorplan interest and recon — net, not gross', candidate_synonyms: ['revenue', 'margin', 'turnover'] },
  { phrase: 'control', definition_given: null, candidate_synonyms: ['oversight', 'management', 'authority'] },
  { phrase: 'a real lead', definition_given: 'someone who has picked a car and asked for an out-the-door number', candidate_synonyms: ['a hot lead', 'a qualified buyer', 'an inquiry'] },
];

/** FICTIONAL default context for "practice this moment" — personal data already absent. */
const DEFAULT_MOMENT: MomentContext = {
  original_question: 'So, is it working okay for you?',
  information_obtained: ['"Yeah, it is fine."'],
  information_missing: ['how long the current process has run', 'who set it up and why'],
};

export type NodeDrillKind = Exclude<DrillKind, 'full_mock'>;

interface Props {
  kind: NodeDrillKind;
  nodes: ScriptNode[];
  mode: AssistanceMode;
  scriptVersionId: string;
  onResult: (result: DrillResult, nodeId?: string) => void;
}

function stagesInOrder(nodes: readonly ScriptNode[]): string[] {
  const seen: string[] = [];
  for (const n of nodes) if (!seen.includes(n.stage)) seen.push(n.stage);
  return seen;
}

export function DrillPanel({ kind, nodes, mode, onResult }: Props) {
  const stages = useMemo(() => stagesInOrder(nodes), [nodes]);
  const [nodeId, setNodeId] = useState(nodes[0]?.id ?? '');
  const [stage, setStage] = useState(stages[0] ?? '');
  const [seed, setSeed] = useState(1);
  const [vocabIndex, setVocabIndex] = useState(0);
  const [moment, setMoment] = useState<MomentContext>(DEFAULT_MOMENT);

  const node = nodes.find((n) => n.id === nodeId) ?? nodes[0];
  const stageNodes = useMemo(() => nodes.filter((n) => n.stage === stage), [nodes, stage]);

  const item: DrillItem | null = useMemo(() => {
    if (!node) return null;
    switch (kind) {
      case 'exact_recall':
        return exactRecall(node);
      case 'recall_with_reveal':
        return recallWithReveal(node);
      case 'order_rehearsal':
        return stageNodes.length > 0 ? orderRehearsal(stageNodes, seed) : null;
      case 'random_node_lookup':
        return randomizedNodeLookup(nodes, seed);
      case 'branch_classification':
        return branchClassification(node, seed);
      case 'mirror_duel':
        return mirrorDuel(node, nodes, seed);
      case 'delivery_replay':
        return deliveryReplay(node);
      case 'vocabulary_meaning': {
        const items = vocabularyMeaning(VOCAB_ITEMS, seed);
        return items[vocabIndex % items.length] ?? null;
      }
      case 'practice_this_moment':
        return practiceThisMoment(moment, node);
    }
  }, [kind, node, nodes, stageNodes, seed, vocabIndex, moment]);

  const usesNode = kind !== 'order_rehearsal' && kind !== 'random_node_lookup' && kind !== 'vocabulary_meaning';

  function next() {
    if (kind === 'vocabulary_meaning') {
      setVocabIndex((i) => i + 1);
      return;
    }
    if (kind === 'order_rehearsal' || kind === 'random_node_lookup') {
      setSeed((s) => s + 1);
      return;
    }
    // Node-based drills: advance to the next node in seed order (and vary the seed).
    const idx = nodes.findIndex((n) => n.id === node?.id);
    const nextNode = nodes[(idx + 1) % nodes.length];
    if (nextNode) setNodeId(nextNode.id);
    setSeed((s) => s + 1);
  }

  if (!node || !item) {
    return <p role="status">Nothing to drill yet for this selection.</p>;
  }

  return (
    <Stack gap={4}>
      <Inline gap={4}>
        {usesNode ? (
          <Field id="drill-node" label="Node">
            {(control) => (
              <Select {...control} value={node.id} onChange={(e) => setNodeId(e.target.value)} options={nodes.map((n) => ({ value: n.id, label: `${n.stage}${n.substage ? ` · ${n.substage}` : ''} — ${n.id}` }))} />
            )}
          </Field>
        ) : null}
        {kind === 'order_rehearsal' ? (
          <Field id="drill-stage" label="Stage">
            {(control) => <Select {...control} value={stage} onChange={(e) => setStage(e.target.value)} options={stages.map((s) => ({ value: s, label: s }))} />}
          </Field>
        ) : null}
      </Inline>

      {kind === 'practice_this_moment' ? <MomentForm value={moment} onChange={setMoment} /> : null}

      <DrillRun key={item.id} item={item} node={usesNode ? node : undefined} mode={mode} moment={kind === 'practice_this_moment' ? moment : undefined} onResult={onResult} onNext={next} />
    </Stack>
  );
}

// ---------------------------------------------------------------------------------------

interface RunProps {
  item: DrillItem;
  node?: ScriptNode;
  mode: AssistanceMode;
  moment?: MomentContext;
  onResult: (result: DrillResult, nodeId?: string) => void;
  onNext: () => void;
}

/** One drill item. Keyed by item id so answer state resets with the item. */
function DrillRun({ item, node, mode, moment, onResult, onNext }: RunProps) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => item.choices.map((c) => c.id));
  const [tone, setTone] = useState(false);
  const [pacing, setPacing] = useState(false);
  const [selfNote, setSelfNote] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [drillRevealed, setDrillRevealed] = useState(false);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [comparison, setComparison] = useState<{ original: string[]; simulated: string[] } | null>(null);

  const isText = item.input === 'text';
  const isChoice = item.input === 'single_choice';
  const isOrder = item.input === 'ordering';
  const isSelf = item.input === 'self_rating';

  const canCheck = result === null && ((isText && text.trim().length > 0) || (isChoice && choice !== null) || isOrder || isSelf);

  function check() {
    let r: DrillResult;
    if (isText) r = gradeExactRecall(item, text, drillRevealed);
    else if (isOrder) r = gradeOrder(item, order);
    else if (isSelf) r = gradeDeliveryReplay(item, { followed_tone_cue: tone, followed_pacing_cue: pacing, note: selfNote.trim() || undefined });
    else if (item.kind === 'practice_this_moment' && moment && node && choice) {
      const cmp = practiceThisMomentComparison(item, moment, node, choice);
      setComparison({ original: cmp.original_information, simulated: cmp.simulated_information });
      r = cmp;
    } else r = gradeChoice(item, choice ?? '');
    setResult(r);
    onResult(r, item.node_id);
  }

  function move(id: string, delta: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      next[i] = prev[j] as string;
      next[j] = prev[i] as string;
      return next;
    });
  }

  const choiceLabel = (id: string) => item.choices.find((c) => c.id === id)?.label ?? id;

  return (
    <Card title={kindTitle(item.kind)} headingLevel="h3" data-drill-kind={item.kind}>
      <Stack gap={4}>
        {node ? <AssistanceBlock node={node} mode={mode} revealed={revealed} onReveal={() => setRevealed(true)} hidePrimary={isText} /> : null}

        <p className={styles.prompt}>{item.prompt}</p>
        {item.context && !(isText && mode === 'unassisted') ? <p className={styles.context}>{item.context}</p> : null}
        {item.synthetic_prospect_line ? <SyntheticProspectLine text={item.synthetic_prospect_line} /> : null}
        {item.delivery_cues ? (
          <dl className={styles.scoreGrid}>
            <dt className={styles.scoreLabel}>Tone cue</dt>
            <dd>{item.delivery_cues.tone_cue}</dd>
            <dt className={styles.scoreLabel}>Pacing cue</dt>
            <dd>{item.delivery_cues.pacing_cue}</dd>
          </dl>
        ) : null}
        {item.cited_node_ids.length > 0 ? <p className={styles.cite}>cites nodes: {item.cited_node_ids.join(', ')}</p> : null}

        {isText ? (
          <Stack gap={2}>
            {item.kind === 'recall_with_reveal' && !drillRevealed && result === null ? (
              <div>
                <Button onClick={() => setDrillRevealed(true)}>Reveal the line</Button>
              </div>
            ) : null}
            {drillRevealed || result !== null ? (
              <p>
                <strong>Exact line:</strong> {item.target_text} <span className={styles.cite}>[{item.node_id}]</span>
              </p>
            ) : null}
            <Field id={`recall-${item.id}`} label="Type the line from memory" help="Typing is the point of this drill. Punctuation and case are ignored; words and their order count.">
              {(control) => <textarea {...control} className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} disabled={result !== null} />}
            </Field>
          </Stack>
        ) : null}

        {isChoice ? <ChoiceGroup label="Choices" choices={item.choices} selected={choice} onSelect={setChoice} correctIds={result ? item.correct_choice_ids : undefined} disabled={result !== null} /> : null}

        {isOrder ? (
          <ol className={styles.orderList} aria-label="Your order">
            {order.map((id, i) => (
              <li key={id} className={styles.orderItem}>
                <span className={styles.choiceMark}>{i + 1}.</span>
                <span>
                  {choiceLabel(id)}
                  {result ? <span className={styles.choiceNote}>{item.expected_order[i] === id ? 'In position.' : `Expected here: ${choiceLabel(item.expected_order[i] ?? '')}`}</span> : null}
                </span>
                <span className={styles.orderMoves}>
                  <Button variant="quiet" onClick={() => move(id, -1)} disabled={i === 0 || result !== null} aria-label={`Move item ${i + 1} up`}>
                    ↑ Up
                  </Button>
                  <Button variant="quiet" onClick={() => move(id, 1)} disabled={i === order.length - 1 || result !== null} aria-label={`Move item ${i + 1} down`}>
                    ↓ Down
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        {isSelf ? (
          <Stack gap={2}>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={tone} onChange={(e) => setTone(e.target.checked)} disabled={result !== null} /> I followed the tone cue (my own judgement)
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={pacing} onChange={(e) => setPacing(e.target.checked)} disabled={result !== null} /> I followed the pacing cue (my own judgement)
            </label>
            <Field id={`self-note-${item.id}`} label="Note to self (optional)">
              {(control) => <input {...control} className={styles.input} value={selfNote} onChange={(e) => setSelfNote(e.target.value)} disabled={result !== null} />}
            </Field>
            <p className={styles.muted}>Nothing is recorded or measured. Text-only practice cannot assess tone.</p>
          </Stack>
        ) : null}

        {item.input === 'none' ? <p className={styles.muted}>Pick another node — this one has no data for this drill yet.</p> : null}

        <Inline gap={2}>
          {item.input !== 'none' ? (
            <Button variant="primary" onClick={check} disabled={!canCheck}>
              Check
            </Button>
          ) : null}
          <Button onClick={onNext}>Next</Button>
          {result === null ? <Badge variant="neutral">not checked yet</Badge> : null}
        </Inline>

        {result ? (
          <ResultPanel
            result={result}
            extra={
              comparison ? (
                <dl className={styles.scoreGrid}>
                  <dt className={styles.scoreLabel}>Information obtained (original)</dt>
                  <dd>{comparison.original.join('; ') || '(nothing recorded)'}</dd>
                  <dt className={styles.scoreLabel}>Information a sufficient answer would carry (simulated)</dt>
                  <dd>{comparison.simulated.join('; ')}</dd>
                </dl>
              ) : null
            }
          />
        ) : null}
      </Stack>
    </Card>
  );
}

function kindTitle(kind: DrillKind): string {
  const map: Record<DrillKind, string> = {
    exact_recall: 'Exact recall',
    recall_with_reveal: 'Recall with reveal',
    order_rehearsal: 'Order rehearsal',
    random_node_lookup: 'Random node lookup',
    branch_classification: 'Branch classification',
    mirror_duel: 'Mirror duel',
    vocabulary_meaning: 'Vocabulary meaning',
    delivery_replay: 'Delivery replay',
    full_mock: 'Full mock',
    practice_this_moment: 'Practice this moment',
  };
  return map[kind];
}

function MomentForm({ value, onChange }: { value: MomentContext; onChange: (v: MomentContext) => void }) {
  return (
    <Card title="The moment (FICTIONAL example — edit freely, personal data removed)" headingLevel="h3">
      <Stack gap={3}>
        <Field id="moment-question" label="Question you actually asked">
          {(control) => <input {...control} className={styles.input} value={value.original_question} onChange={(e) => onChange({ ...value, original_question: e.target.value })} />}
        </Field>
        <Field id="moment-obtained" label="Information obtained (one per line)">
          {(control) => <textarea {...control} className={styles.textarea} value={value.information_obtained.join('\n')} onChange={(e) => onChange({ ...value, information_obtained: lines(e.target.value) })} />}
        </Field>
        <Field id="moment-missing" label="Information still missing (one per line)">
          {(control) => <textarea {...control} className={styles.textarea} value={value.information_missing.join('\n')} onChange={(e) => onChange({ ...value, information_missing: lines(e.target.value) })} />}
        </Field>
      </Stack>
    </Card>
  );
}

function lines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}
