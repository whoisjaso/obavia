'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssistanceMode, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import {
  EXIT_CHOICES,
  NOT_A_VOICE_CALL,
  PRACTICE_SCENARIOS,
  advanceMock,
  coachView,
  evaluatorView,
  fullMock,
  mockOutcomeScore,
  type MockOutcomeScore,
  type MockRun,
} from '@apohenia/domain/practice';
import { stageLabel } from '@apohenia/domain/scripts';
import { Card, Chip, FictionalPill, GlyphPill, Icon, IconButton, Sheet, Tile, TileGrid, TopBar } from '@/components/ui';
import { AssistCard, ChoiceTile, EmptyGlyph, PracticeHero, ProspectCard, ResultCard } from './parts';
import { FACT_LABELS, OUTCOME_META, resultAnnouncement, scenarioMeta } from './practice-lib';
import styles from './practice.module.css';

export interface MockScreenProps {
  nodes: ScriptNode[];
  mode: AssistanceMode;
  /** Fictional practice prospect facts that fill slots (never a real person). */
  facts: Record<string, string>;
  onResult: (result: DrillResult, nodeId?: string) => void;
  onClose: () => void;
  onLive: (text: string) => void;
}

/**
 * Full mock as a card-by-card conversation: pick a FICTIONAL scenario (tiles) → read the public
 * brief (coach view) → Start → your line (mode-masked) · their line (synthetic) · branch tiles ·
 * Next, or End with an outcome tile → result rings. The hidden fact sheet is fetched through
 * `evaluatorView` only after the run has ended and only while the Evaluator sheet is open.
 */
export function MockScreen({ nodes, mode, facts, onResult, onClose, onLive }: MockScreenProps) {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [run, setRun] = useState<MockRun | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [score, setScore] = useState<MockOutcomeScore | null>(null);
  const [sheet, setSheet] = useState<'none' | 'info' | 'end' | 'evaluator'>('none');
  const [revealed, setRevealed] = useState(false);

  const scenario = scenarioId ? PRACTICE_SCENARIOS.find((s) => s.id === scenarioId) : undefined;
  const coach = scenario ? coachView(scenario, run?.revealed_facts ?? []) : null;
  const step = run ? run.steps[run.steps.length - 1] : undefined;
  const node = step ? nodes.find((n) => n.id === step.node_id) : undefined;
  const ended = run?.ended ?? false;

  function start() {
    if (!scenario) return;
    setRun(fullMock(scenario, nodes));
    setChoice(null);
    setScore(null);
    setRevealed(false);
    setSheet('none');
    onLive(`Mock started: ${scenario.title}. Choice-based simulation, not an AI voice call.`);
  }

  function applyChoice(choiceId: string) {
    if (!run || !scenario) return;
    const next = advanceMock(run, scenario, nodes, choiceId);
    setRun(next);
    setChoice(null);
    setRevealed(false);
    setSheet('none');
    if (next.ended && next.outcome) {
      const s = mockOutcomeScore(scenario, next.outcome, next.path);
      setScore(s);
      const result: DrillResult = {
        item_id: `full_mock:${scenario.id}`,
        kind: 'full_mock',
        correct: s.score === 1,
        conversation_score: s.conversation_score,
        missing_words: [],
        extra_words: [],
        tone_assessed: false,
        notes: `${scenario.title}: outcome "${next.outcome.replace(/_/g, ' ')}". ${s.note} Tone: not assessed (text-only).`,
      };
      onResult(result, next.entry_node_id ?? undefined);
      onLive(`Mock ended with outcome ${next.outcome.replace(/_/g, ' ')}. ${resultAnnouncement(result)}`);
    } else if (next.ended) {
      onLive('Mock ended at the end of the scripted sequence without an exit choice.');
    }
  }

  function back() {
    if (run) {
      setRun(null);
      setScore(null);
      setChoice(null);
      return;
    }
    if (scenario) {
      setScenarioId(null);
      return;
    }
    onClose();
  }

  // Esc = back one level (scenario list → close) when no sheet is open.
  const backRef = useRef(back);
  useEffect(() => {
    backRef.current = back;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      backRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const evaluator = ended && sheet === 'evaluator' && scenario ? evaluatorView(scenario, run?.revealed_facts ?? []) : null;
  const scenarioResult: DrillResult | null =
    score && scenario
      ? { item_id: `full_mock:${scenario.id}`, kind: 'full_mock', correct: score.score === 1, conversation_score: score.conversation_score, missing_words: [], extra_words: [], tone_assessed: false, notes: score.note }
      : null;
  const outcomeMeta = run?.outcome ? OUTCOME_META[run.outcome] : null;

  return (
    <div className={styles.screen} data-drill-screen="full_mock" data-mock-phase={!scenario ? 'pick' : !run ? 'brief' : ended ? 'ended' : 'run'}>
      <TopBar
        left={<GlyphPill glyph="✦" name="Fictional training content — every scenario is fictional, not a real record" tone="purple" data-fictional-pill />}
        title="Mock"
        right={
          <>
            <IconButton icon="info" label={`About the mock: ${NOT_A_VOICE_CALL}. Every scenario is fictional; some never convert — a respectful exit is the correct result there.`} onClick={() => setSheet('info')} data-drill-info />
            <IconButton icon="x" label={run ? 'Leave this mock' : scenario ? 'Back to scenarios' : 'Close drill'} onClick={back} data-drill-close />
          </>
        }
      />

      {/* --- pick a scenario --- */}
      {!scenario ? (
        <TileGrid columns={2} data-scenario-grid>
          {PRACTICE_SCENARIOS.map((s) => {
            const m = scenarioMeta(s.id);
            return <Tile key={s.id} icon={m.icon} label={m.label} name={s.title} onClick={() => setScenarioId(s.id)} data-scenario={s.id} />;
          })}
        </TileGrid>
      ) : null}

      {/* --- brief (coach view: public brief only) --- */}
      {scenario && coach && !run ? (
        <>
          <Card data-coach-view data-drill-kind="full_mock">
            <div className={styles.briefHead}>
              <Icon name={scenarioMeta(scenario.id).icon} size={32} className={styles.briefIcon} />
              <span className={styles.briefTitle}>{scenarioMeta(scenario.id).label}</span>
            </div>
            <p className={styles.cardText}>{coach.public_brief}</p>
            <div className={styles.chipRow}>
              <Chip static glyph={coach.entrypoint === 'inbound' ? '↙' : '↗'} label={coach.entrypoint.replace(/_/g, ' ')} name={`Entry point: ${coach.entrypoint.replace(/_/g, ' ')}`} />
            </div>
          </Card>
          <PracticeHero action="start" label="Start mock — choice-based simulation, not an AI voice call" onClick={start} />
        </>
      ) : null}

      {/* --- running: card-by-card conversation --- */}
      {scenario && run && run.empty ? (
        <EmptyGlyph glyph="∅" label="No entry">
          <Tile icon="list" label="Scenarios" onClick={back} />
        </EmptyGlyph>
      ) : null}

      {scenario && run && !run.empty ? (
        <ol className={styles.thread} aria-label="Conversation so far" data-mock-thread>
          {run.steps.slice(0, -1).map((s, i) => {
            const chosen = run.path[i + 1];
            const branchLabel = nodes.find((n) => n.id === s.node_id)?.branches.find((b) => b.next_node_id === chosen)?.label;
            return (
              <li key={`${s.node_id}-${s.index}`} className={styles.pastStep} data-past-step={s.index}>
                <span className={styles.pastStage}>{stageLabel(s.stage)}</span>
                <span className={styles.pastLine}>
                  <span aria-hidden="true">✦ </span>
                  <span className="sr-only">Synthetic prospect said: </span>
                  {s.prospect_line}
                </span>
                {branchLabel ? <Chip static glyph="→" label={branchLabel} name={`You chose: ${branchLabel}`} tone="blue" /> : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {scenario && run && step && node && !ended ? (
        <div className={styles.drill} data-mock-step data-step-index={step.index} data-drill-kind="full_mock">
          <AssistCard node={node} mode={mode} facts={facts} revealed={revealed} onReveal={() => setRevealed(true)} onInfo={() => setSheet('info')} />
          <ProspectCard text={step.prospect_line} />
          <div role="group" aria-label="Branch" className={styles.choices} data-choice-group>
            {step.choices
              .filter((c) => c.id.startsWith('branch:'))
              .map((c, i) => (
                <ChoiceTile key={c.id} choice={c} index={i} state={choice === c.id ? 'selected' : 'idle'} onPress={() => setChoice(c.id)} />
              ))}
          </div>
          <PracticeHero action="advance" label="Next — take the chosen branch" disabled={choice === null} onClick={() => choice && applyChoice(choice)} right={<IconButton icon="phone-off" label="End the mock with an outcome" tone="red" solid size={56} onClick={() => setSheet('end')} data-mock-end />} />
        </div>
      ) : null}

      {/* --- ended --- */}
      {scenario && run && ended && !run.empty ? (
        <div className={styles.drill} data-mock-ended data-outcome={run.outcome ?? 'none'}>
          <div className={styles.outcomeRow}>
            <span data-mock-outcome data-outcome={run.outcome ?? 'none'}>
              {outcomeMeta && run.outcome ? (
                <Chip static glyph={<Icon name={outcomeMeta.icon} size={14} />} label={outcomeMeta.label} name={`Outcome: ${run.outcome.replace(/_/g, ' ')}`} tone={outcomeMeta.tone === 'green' ? 'green' : outcomeMeta.tone === 'red' ? 'red' : outcomeMeta.tone === 'orange' ? 'gold' : 'blue'} />
              ) : (
                <Chip static glyph="∅" label="No outcome" name="The scripted sequence ended without an exit choice — run again and choose how you end" />
              )}
            </span>
            <span className={styles.path} aria-label={`Path: ${[...new Set(run.path.map((id) => stageLabel(nodes.find((n) => n.id === id)?.stage ?? id)))].join(', ')}`}>
              {[...new Set(run.path.map((id) => nodes.find((n) => n.id === id)?.stage ?? id))].map((s) => (
                <span key={s} className={styles.pathStage} aria-hidden="true">
                  {stageLabel(s)}
                </span>
              ))}
            </span>
          </div>
          {scenarioResult ? <ResultCard result={scenarioResult} /> : null}
          <TileGrid columns={3}>
            <Tile icon="lock" label="Evaluator" name="Evaluator view — post-session hidden fact sheet, not available during the run" onClick={() => setSheet('evaluator')} aria-expanded={sheet === 'evaluator'} data-evaluator-toggle />
            <Tile icon="refresh" label="Again" name="Run this scenario again" onClick={start} data-mock-again />
            <Tile icon="list" label="Scenarios" name="Back to scenarios" onClick={back} />
          </TileGrid>
        </div>
      ) : null}

      {/* End with an outcome. */}
      <Sheet open={sheet === 'end'} onClose={() => setSheet('none')} title="End" data-sheet="mock-end">
        <TileGrid columns={2}>
          {EXIT_CHOICES.map((e) => {
            const m = OUTCOME_META[e.outcome];
            return <Tile key={e.id} icon={m.icon} label={m.label} name={e.label} tone={m.tone} onClick={() => applyChoice(e.id)} data-exit={e.outcome} />;
          })}
        </TileGrid>
      </Sheet>

      {/* Evaluator (post-session only). Content exists only while open. */}
      <Sheet open={sheet === 'evaluator'} onClose={() => setSheet('none')} title="Evaluator" tall data-sheet="evaluator">
        {evaluator ? (
          <div className={styles.sheetStack} data-evaluator-view aria-label="Post-session evaluator view — hidden fact sheet">
            <div className={styles.chipRow}>
              <GlyphPill glyph="⊘" label="Post-session" name="Post-session evaluator view — hidden fact sheet, not available during the run" tone="orange" data-evaluator-pill />
              <FictionalPill />
              {evaluator.never_converts ? <GlyphPill glyph="∅" label="Never converts" name="This scenario never converts: a respectful exit is the correct result" tone="purple" data-never-converts /> : null}
            </div>
            <div className={styles.sheetRow}>
              <span className={styles.sheetKey}>Legitimate</span>
              <div className={styles.chipRow}>
                {evaluator.legitimate_outcomes.map((o) => (
                  <Chip key={o} static glyph={<Icon name={OUTCOME_META[o].icon} size={12} />} label={OUTCOME_META[o].label} name={`Legitimate outcome: ${o.replace(/_/g, ' ')}`} tone="green" />
                ))}
              </div>
            </div>
            {Object.entries(evaluator.hidden_fact_sheet).map(([k, v]) => (
              <div key={k} className={styles.sheetRow}>
                <span className={styles.sheetKey}>{FACT_LABELS[k] ?? k}</span>
                <ul className={styles.sheetList}>
                  {v.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </Sheet>

      {/* ⓘ */}
      <Sheet open={sheet === 'info'} onClose={() => setSheet('none')} title="Mock" data-sheet="drill-info">
        <div className={styles.sheetStack}>
          <p className={styles.sheetBig}>{NOT_A_VOICE_CALL}.</p>
          <p className={styles.sheetText}>Every scenario is fictional. Some never convert: a respectful exit is the correct result there, and accurate disqualification scores full.</p>
          {node && step ? (
            <>
              <div className={styles.sheetRow}>
                <span className={styles.sheetKey}>Why now</span>
                <span className={styles.sheetText}>{node.why_this_now}</span>
              </div>
              {mode === 'full_script' || mode === 'recall_with_reveal' ? (
                <div className={styles.sheetRow}>
                  <span className={styles.sheetKey}>Listen for</span>
                  <span className={styles.sheetText}>{node.what_to_listen_for}</span>
                </div>
              ) : null}
            </>
          ) : null}
          <p className={styles.sheetMuted}>Tone: not assessed (text-only).</p>
        </div>
      </Sheet>
    </div>
  );
}
