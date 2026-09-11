'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AssistanceMode, DrillItem, DrillKind, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import {
  branchClassification,
  deliveryReplay,
  exactRecall,
  gradeChoice,
  gradeDeliveryReplay,
  gradeExactRecall,
  gradeOrder,
  maskForMode,
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
import { stageLabel } from '@apohenia/domain/scripts';
import { Card, Chip, FictionalPill, Icon, IconButton, LineCard, Sheet, SlotLine, Tile, TileGrid, TopBar, WordCard } from '@/components/ui';
import { AssistCard, ChoiceTile, PracticeHero, ProspectCard, QuestionCard, ResultCard, type ChoiceState } from './parts';
import { DEFAULT_MOMENT, drillMeta, itemWithFacts, lines, resolveForPractice, resultAnnouncement, shortChoices } from './practice-lib';
import styles from './practice.module.css';

/** FICTIONAL vocabulary items for the meaning-fidelity drill (brief §7 examples, synthetic). */
const VOCAB_ITEMS: VocabularyItemInput[] = [
  { phrase: 'gratification', definition_given: null, candidate_synonyms: ['satisfaction', 'pleasure', 'reward'] },
  { phrase: 'profit', definition_given: 'what is left after floorplan interest and recon, net, not gross', candidate_synonyms: ['revenue', 'margin', 'turnover'] },
  { phrase: 'control', definition_given: null, candidate_synonyms: ['oversight', 'management', 'authority'] },
  { phrase: 'a real lead', definition_given: 'someone who has picked a car and asked for an out-the-door number', candidate_synonyms: ['a hot lead', 'a qualified buyer', 'an inquiry'] },
];

export type NodeDrillKind = Exclude<DrillKind, 'full_mock'>;

export interface DrillScreenProps {
  kind: NodeDrillKind;
  nodes: ScriptNode[];
  mode: AssistanceMode;
  /** Fictional practice prospect facts that fill slots (never a real person). */
  facts: Record<string, string>;
  practiceLabel: string;
  onResult: (result: DrillResult, nodeId?: string) => void;
  onClose: () => void;
  onLive: (text: string) => void;
}

function stagesInOrder(nodes: readonly ScriptNode[]): string[] {
  const seen: string[] = [];
  for (const n of nodes) if (!seen.includes(n.stage)) seen.push(n.stage);
  return seen;
}

/**
 * One drill, one item per screen. Next advances to the next node / stage / seed; the stage chip
 * opens a jump sheet; ⓘ opens the prompt, purpose and what-to-listen-for; ✕ returns to the grid.
 */
export function DrillScreen({ kind, nodes, mode, facts, practiceLabel, onResult, onClose, onLive }: DrillScreenProps) {
  const meta = drillMeta(kind);
  const stages = useMemo(() => stagesInOrder(nodes), [nodes]);
  const [nodeIndex, setNodeIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [seed, setSeed] = useState(1);
  const [vocabIndex, setVocabIndex] = useState(0);
  const [moment, setMoment] = useState<MomentContext>(DEFAULT_MOMENT);
  const [sheet, setSheet] = useState<'none' | 'info' | 'stage' | 'moment'>('none');
  const [done, setDone] = useState(0);

  const node = nodes[nodeIndex % Math.max(1, nodes.length)];
  const stage = stages[stageIndex % Math.max(1, stages.length)] ?? '';
  const stageNodes = useMemo(() => nodes.filter((n) => n.stage === stage), [nodes, stage]);
  const usesNode = kind !== 'order_rehearsal' && kind !== 'random_node_lookup' && kind !== 'vocabulary_meaning';

  const item: DrillItem | null = useMemo(() => {
    if (!node) return null;
    const raw = ((): DrillItem | null => {
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
    })();
    return raw ? itemWithFacts(raw, facts) : null;
  }, [kind, node, nodes, stageNodes, seed, vocabIndex, moment, facts]);

  function next() {
    setDone((d) => d + 1);
    setSeed((s) => s + 1);
    if (kind === 'vocabulary_meaning') setVocabIndex((i) => i + 1);
    else if (kind === 'order_rehearsal') setStageIndex((i) => i + 1);
    else if (kind !== 'random_node_lookup') setNodeIndex((i) => i + 1);
  }

  function jumpToStage(s: string) {
    const si = stages.indexOf(s);
    if (si >= 0) setStageIndex(si);
    const ni = nodes.findIndex((n) => n.stage === s);
    if (ni >= 0) setNodeIndex(ni);
    setSeed((x) => x + 1);
    setSheet('none');
  }

  // Esc closes the drill when no sheet is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const currentStage = item?.stage ?? node?.stage ?? stage;
  const fictional = Boolean(item?.synthetic_prospect_line) || kind === 'practice_this_moment' || kind === 'vocabulary_meaning';
  // ⓘ sheet content for the node on stage, masked by the assistance mode (never on the stage itself).
  const mirrorsGiveAway = kind === 'mirror_duel' || kind === 'practice_this_moment';
  const view = usesNode && node ? maskForMode(node, mode) : null;
  const whyNow = view?.purpose ?? null;
  const listenFor = view?.listen_for ?? null;
  const mirrors = view && !mirrorsGiveAway ? view.mirrors.map((m) => resolveForPractice(m, facts)) : [];

  return (
    <div className={styles.screen} data-drill-screen={kind} data-done={done}>
      <TopBar
        left={<FictionalPill name={fictional ? `Fictional training content: synthetic prospect lines, not a real record. Slots filled from the fictional practice prospect ${practiceLabel}.` : `Fictional practice prospect: ${practiceLabel} fills the name and dealership slots; not a real record`} />}
        title={meta.label}
        right={
          <>
            <IconButton icon="info" label={`About this drill: ${meta.hint}`} onClick={() => setSheet('info')} data-drill-info />
            <IconButton icon="x" label="Close drill" onClick={onClose} data-drill-close />
          </>
        }
      />

      {!node || !item ? (
        <div className={styles.center}>
          <span className={styles.emptyGlyph} aria-hidden="true">
            <Icon name="empty" size={72} />
          </span>
          <span className={styles.emptyLabel}>Nothing here</span>
        </div>
      ) : (
        <DrillRun
          key={item.id}
          item={item}
          node={usesNode ? node : undefined}
          mode={mode}
          facts={facts}
          moment={kind === 'practice_this_moment' ? moment : undefined}
          stageChip={kind === 'order_rehearsal' ? <Chip static label={stageLabel(currentStage)} tone="teal" icon="target" name={`Stage ${stageLabel(currentStage)}`} data-stage-chip /> : null}
          lookupNode={kind === 'random_node_lookup' ? nodes.find((n) => n.id === item.node_id) : undefined}
          onJump={() => setSheet('stage')}
          cue={meta.cue}
          onResult={(r, id) => {
            onResult(r, id);
            onLive(resultAnnouncement(r));
          }}
          onNext={next}
          onEditMoment={kind === 'practice_this_moment' ? () => setSheet('moment') : undefined}
          onInfo={() => setSheet('info')}
        />
      )}

      {/* ⓘ — the prompt, purpose and what to listen for (mode-gated). */}
      <Sheet open={sheet === 'info'} onClose={() => setSheet('none')} title={meta.label} data-sheet="drill-info">
        <div className={styles.sheetStack}>
          <p className={styles.sheetBig}>{meta.hint}</p>
          {item ? <p className={styles.sheetText}>{item.prompt}</p> : null}
          {item?.context && !(item.input === 'text' && mode === 'unassisted') ? <p className={styles.sheetText}>{item.context}</p> : null}
          {whyNow ? (
            <div className={styles.sheetRow} data-sheet-why-now>
              <span className={styles.sheetKey}>Why this now</span>
              <p className={styles.sheetText}>{whyNow}</p>
            </div>
          ) : null}
          {listenFor ? (
            <div className={styles.sheetRow} data-sheet-listen-for>
              <span className={styles.sheetKey}>Listen for</span>
              <p className={styles.sheetText}>{listenFor}</p>
            </div>
          ) : null}
          {mirrors.length > 0 ? (
            <div className={styles.sheetRow} data-sheet-mirrors>
              <span className={styles.sheetKey}>Mirrors</span>
              <ul className={styles.sheetList}>
                {mirrors.map((m) => (
                  <li key={m} className={styles.mirror} data-mirror>
                    <Icon name="swap" size={14} weight="bold" className={styles.mirrorIcon} /> <SlotLine text={m} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {item?.cited_node_ids.length ? (
            <div className={styles.sheetChips}>
              {item.cited_node_ids.map((id) => {
                const cited = nodes.find((n) => n.id === id);
                return <Chip key={id} static icon="script" label={(cited?.substage ?? id).replace(/[_-]+/g, ' ')} name={`Cites node ${id}${cited ? ` (${stageLabel(cited.stage)})` : ''}`} />;
              })}
            </div>
          ) : null}
          <p className={styles.sheetMuted}>Tone: Not assessed (text-only). Reducing assistance is optional and reversible.</p>
        </div>
      </Sheet>

      {/* Stage jump. */}
      <Sheet open={sheet === 'stage'} onClose={() => setSheet('none')} title="Stage" data-sheet="stage">
        <div className={styles.sheetChips}>
          {stages.map((s) => (
            <Chip key={s} label={stageLabel(s)} toggle selected={s === currentStage} onClick={() => jumpToStage(s)} data-stage-option={s} />
          ))}
        </div>
      </Sheet>

      {/* Edit the moment (FICTIONAL example — personal data already removed). */}
      <Sheet open={sheet === 'moment'} onClose={() => setSheet('none')} title="Moment" data-sheet="moment">
        <div className={styles.sheetStack}>
          <FictionalPill />
          <label className={styles.field}>
            <span className={styles.sheetKey}>Question asked</span>
            <input className={styles.input} value={moment.original_question} onChange={(e) => setMoment({ ...moment, original_question: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.sheetKey}>Obtained</span>
            <textarea className={styles.textareaSmall} value={moment.information_obtained.join('\n')} onChange={(e) => setMoment({ ...moment, information_obtained: lines(e.target.value) })} />
          </label>
          <label className={styles.field}>
            <span className={styles.sheetKey}>Missing</span>
            <textarea className={styles.textareaSmall} value={moment.information_missing.join('\n')} onChange={(e) => setMoment({ ...moment, information_missing: lines(e.target.value) })} />
          </label>
          <Tile icon="check" label="Done" tone="green" onClick={() => setSheet('none')} />
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------------------

interface RunProps {
  item: DrillItem;
  node?: ScriptNode;
  mode: AssistanceMode;
  facts: Record<string, string>;
  moment?: MomentContext;
  stageChip: ReactNode;
  /** The target node of a lookup item (its stage cue is the question). */
  lookupNode?: ScriptNode;
  onJump: () => void;
  cue: string;
  onResult: (result: DrillResult, nodeId?: string) => void;
  onNext: () => void;
  onEditMoment?: () => void;
  onInfo: () => void;
}

/** One item. Keyed by item id so every answer state resets with the item. */
function DrillRun({ item, node, mode, facts, moment, stageChip, lookupNode, onJump, cue, onResult, onNext, onEditMoment, onInfo }: RunProps) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => item.choices.map((c) => c.id));
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [tone, setTone] = useState(false);
  const [pacing, setPacing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [comparison, setComparison] = useState<{ original: string[]; simulated: string[] } | null>(null);

  const isText = item.input === 'text';
  const isChoice = item.input === 'single_choice';
  const isOrder = item.input === 'ordering';
  const isSelf = item.input === 'self_rating';
  const checked = result !== null;
  const canCheck = !checked && ((isText && text.trim().length > 0) || (isChoice && choice !== null) || isOrder || isSelf);

  function check() {
    let r: DrillResult;
    if (isText) r = gradeExactRecall(item, text, revealed);
    else if (isOrder) r = gradeOrder(item, order);
    else if (isSelf) r = gradeDeliveryReplay(item, { followed_tone_cue: tone, followed_pacing_cue: pacing });
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
      const out = [...prev];
      out[i] = prev[j] as string;
      out[j] = prev[i] as string;
      return out;
    });
  }

  function tapOrder(id: string) {
    if (checked) return;
    if (swapFrom === null) {
      setSwapFrom(id);
      return;
    }
    if (swapFrom !== id) {
      setOrder((prev) => {
        const i = prev.indexOf(swapFrom);
        const j = prev.indexOf(id);
        if (i < 0 || j < 0) return prev;
        const out = [...prev];
        out[i] = prev[j] as string;
        out[j] = prev[i] as string;
        return out;
      });
    }
    setSwapFrom(null);
  }

  // Number keys 1–9 pick a choice; Enter checks when possible.
  useEffect(() => {
    if (!isChoice || checked) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (document.querySelector('dialog[open]') || t?.tagName === 'TEXTAREA' || t?.tagName === 'INPUT') return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) {
        const c = item.choices[n - 1];
        if (c) {
          e.preventDefault();
          setChoice(c.id);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isChoice, checked, item.choices]);

  const choiceLabel = (id: string) => item.choices.find((c) => c.id === id)?.label ?? id;
  const accepted = item.choices.filter((c) => item.correct_choice_ids.includes(c.id)).map((c) => c.label);

  function stateFor(id: string): ChoiceState {
    if (!checked) return choice === id ? 'selected' : 'idle';
    if (item.kind === 'practice_this_moment') return choice === id ? 'selected' : 'dim';
    const correct = item.correct_choice_ids.includes(id);
    if (correct) return 'correct';
    if (choice === id) return 'wrong';
    return 'dim';
  }

  const showLine = isText && (revealed || checked) && item.target_text !== undefined;
  const gridChoices = isChoice && shortChoices(item.choices.map((c) => c.label));
  // Choice drills show the line as a two-line preview; the cue and the tools ride in its head so the answer tiles start higher.
  const preview = Boolean(node) && isChoice;
  const cueChip = (
    <span data-cue>
      <Chip static label={cue} name={item.prompt} tone="neutral" />
    </span>
  );
  const cueTools = (
    <>
      {onEditMoment ? <IconButton icon="gear" label="Edit the moment (fictional example)" onClick={onEditMoment} className={preview ? styles.quietButton : undefined} data-edit-moment /> : null}
      {item.kind !== 'vocabulary_meaning' ? <IconButton icon="list" label="Jump to another stage" onClick={onJump} className={preview ? styles.quietButton : undefined} data-stage-jump /> : null}
    </>
  );

  return (
    <div className={styles.drill} data-drill-kind={item.kind} data-item-id={item.id} data-checked={checked ? 'true' : 'false'}>
      {!preview ? (
        <div className={styles.cueRow}>
          {stageChip}
          {cueChip}
          <span className={styles.cueTools}>{cueTools}</span>
        </div>
      ) : null}

      {/* --- context: the line (mode-masked) or what the drill shows --- */}
      {node && !isText ? (
        <AssistCard node={node} mode={mode} facts={facts} revealed={revealed} onReveal={() => setRevealed(true)} hideMirrors={item.kind === 'mirror_duel' || item.kind === 'practice_this_moment'} onInfo={onInfo} preview={preview} meta={preview ? cueChip : undefined} tools={preview ? cueTools : undefined} />
      ) : null}
      {node && isText ? (
        showLine ? (
          <LineCard stage={stageLabel(node.stage)} line={item.target_text ?? ''} nodeId={node.id} locked minLines={2} onInfo={onInfo} />
        ) : (
          <AssistCard node={node} mode={mode} facts={facts} revealed={false} onReveal={() => setRevealed(true)} hideLine onInfo={onInfo} />
        )
      ) : null}

      {item.kind === 'random_node_lookup' && lookupNode ? (
        <Card data-lookup-cue>
          <span className={styles.cardKey}>Stage</span>
          <p className={styles.lookupStage}>
            {stageLabel(lookupNode.stage)}
            {lookupNode.substage ? <span className={styles.lookupSub}>{lookupNode.substage.replace(/_/g, ' ')}</span> : null}
          </p>
          <span className={styles.cardKey}>Why this now</span>
          <p className={styles.cardText}>{lookupNode.why_this_now}</p>
        </Card>
      ) : null}

      {item.kind === 'practice_this_moment' && moment ? (
        <Card data-moment-card>
          <span className={styles.cardKey}>You asked</span>
          <p className={styles.quote}>“{moment.original_question}”</p>
          <div className={styles.chipRow}>
            <Chip static glyph="●" label={`${moment.information_obtained.length} obtained`} name={`Information obtained: ${moment.information_obtained.join('; ') || 'nothing recorded'}`} tone="gold" />
            <Chip static glyph="○" label={`${moment.information_missing.length} missing`} name={`Information still missing: ${moment.information_missing.join('; ') || 'nothing recorded'}`} />
          </div>
        </Card>
      ) : null}

      {item.kind === 'vocabulary_meaning' && item.synthetic_prospect_line ? (
        <div className={styles.wordStage}>
          <WordCard word={item.synthetic_prospect_line} provenance="said" provenanceName="fictional prospect said this phrase (synthetic, not a real prospect)" />
          <Chip static glyph={item.correct_choice_ids.includes('definition_given') ? '◐' : '?'} label={item.correct_choice_ids.includes('definition_given') ? 'Defined earlier' : 'Not defined'} name={item.context ?? ''} tone={item.correct_choice_ids.includes('definition_given') ? 'gold' : 'neutral'} />
        </div>
      ) : item.synthetic_prospect_line ? (
        <ProspectCard text={item.synthetic_prospect_line} />
      ) : isChoice && item.kind === 'branch_classification' ? (
        <QuestionCard text={item.prompt} />
      ) : null}

      {isChoice ? (
        gridChoices ? (
          <div role="group" aria-label="Choices" data-choice-group>
            <TileGrid columns={2}>
              {item.choices.map((c, i) => {
                const st = stateFor(c.id);
                return (
                  <Tile
                    key={c.id}
                    label={c.label}
                    name={`${c.label}${st === 'correct' ? ', accepted answer' : st === 'wrong' ? ', your choice, not accepted' : ''}`}
                    selected={checked ? st === 'correct' : choice === c.id}
                    tone={st === 'correct' ? 'green' : st === 'wrong' ? 'red' : 'neutral'}
                    disabled={checked}
                    onClick={() => setChoice(c.id)}
                    className={[styles.tileChoice, styles[`tile_${st}`]].join(' ')}
                    data-choice-id={c.id}
                    data-choice-state={st}
                  >
                    <span className={styles.tileKey} aria-hidden="true">
                      {i + 1}
                    </span>
                  </Tile>
                );
              })}
            </TileGrid>
          </div>
        ) : (
          <div role="group" aria-label="Choices" className={styles.choices} data-choice-group>
            {item.choices.map((c, i) => (
              <ChoiceTile key={c.id} choice={c} index={i} state={stateFor(c.id)} disabled={checked} onPress={() => setChoice(c.id)} note={checked ? c.note : undefined} />
            ))}
          </div>
        )
      ) : null}

      {item.delivery_cues ? (
        <div className={styles.cues}>
          <Card dense data-cue-card="tone">
            <span className={styles.cardKey}>
              <Icon name="music" size={14} weight="bold" />
              Tone
            </span>
            <p className={styles.cardText}>{item.delivery_cues.tone_cue}</p>
          </Card>
          <Card dense data-cue-card="pacing">
            <span className={styles.cardKey}>
              <Icon name="timer" size={14} weight="bold" />
              Pacing
            </span>
            <p className={styles.cardText}>{item.delivery_cues.pacing_cue}</p>
          </Card>
        </div>
      ) : null}

      {/* --- result --- */}
      {result ? (
        <ResultCard result={result} accepted={accepted}>
          {comparison ? (
            <div className={styles.compare} data-moment-compare>
              <Card tone="gold" dense data-compare="original">
                <span className={styles.cardKey}>
                  <Icon name="circle" size={12} weight="fill" />
                  Original
                </span>
                <ul className={styles.compareList}>{comparison.original.length > 0 ? comparison.original.map((l, i) => <li key={i}>{l}</li>) : <li className={styles.muted}>None recorded</li>}</ul>
              </Card>
              <Card tone="purple" dense data-compare="simulated" aria-label="Simulated: taken from the node's sufficient-answer examples, never from a real prospect">
                <span className={styles.cardKey}>
                  <Icon name="spark" size={12} weight="fill" />
                  Simulated
                </span>
                <ul className={styles.compareList}>
                  {comparison.simulated.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </Card>
            </div>
          ) : null}
        </ResultCard>
      ) : null}

      {/* --- input --- */}
      {isText && !checked ? (
        <div className={styles.typeBox}>
          {item.kind === 'recall_with_reveal' && !revealed && !checked ? <Chip icon="eye" label="Reveal" name="Reveal the line before typing (counts as revealed)" tone="teal" onClick={() => setRevealed(true)} data-reveal /> : null}
          <textarea className={styles.textarea} aria-label="Type the line from memory" placeholder="Type the line" value={text} onChange={(e) => setText(e.target.value)} disabled={checked} rows={4} autoFocus data-recall-input />
        </div>
      ) : null}

      {isOrder ? (
        <ol className={styles.orderList} aria-label="Your order" data-order-list>
          {order.map((id, i) => {
            const c = item.choices.find((x) => x.id === id) ?? { id, label: id };
            const inPlace = item.expected_order[i] === id;
            const st: ChoiceState = checked ? (inPlace ? 'correct' : 'wrong') : swapFrom === id ? 'selected' : 'idle';
            return (
              <li key={id} className={styles.orderRow}>
                <ChoiceTile choice={c} index={i} state={st} disabled={checked} pressed={swapFrom === id} onPress={() => tapOrder(id)} note={checked && !inPlace ? `Expected here: ${choiceLabel(item.expected_order[i] ?? '')}` : undefined} />
                <span className={styles.orderMoves}>
                  <IconButton icon="arrow-up" label={`Move item ${i + 1} up`} onClick={() => move(id, -1)} disabled={i === 0 || checked} />
                  <IconButton icon="chevron-down" label={`Move item ${i + 1} down`} onClick={() => move(id, 1)} disabled={i === order.length - 1 || checked} />
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {isSelf ? (
        <div role="group" aria-label="Self-rating: your own judgement, nothing is measured" data-self-rating>
          <TileGrid columns={2}>
            <Tile icon="wave" label="Tone cue" name="I followed the tone cue (my own judgement)" selected={tone} onClick={() => setTone((v) => !v)} disabled={checked} data-self="tone" />
            <Tile icon="clock" label="Pacing cue" name="I followed the pacing cue (my own judgement)" selected={pacing} onClick={() => setPacing((v) => !v)} disabled={checked} data-self="pacing" />
          </TileGrid>
        </div>
      ) : null}

      {item.input === 'none' ? (
        <div className={styles.center} data-nothing>
          <span className={styles.emptyGlyph} aria-hidden="true">
            <Icon name="empty" size={72} />
          </span>
          <span className={styles.emptyLabel}>No data yet</span>
        </div>
      ) : null}

      <PracticeHero
        action={checked ? 'next' : 'check'}
        label={checked ? 'Next item' : 'Check'}
        disabled={!checked && (!canCheck || item.input === 'none')}
        onClick={checked ? onNext : check}
        left={!checked ? <IconButton icon="next" label="Skip this item" onClick={onNext} data-skip /> : null}
      />
    </div>
  );
}
