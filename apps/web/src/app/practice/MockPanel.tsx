'use client';

import { useState } from 'react';
import type { AssistanceMode, DrillResult, ScriptNode } from '@apohenia/domain/schemas';
import {
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
import { Badge, Button, Card, Field, Inline, Select, Stack } from '@/components/ui';
import { AssistanceBlock, ChoiceGroup, ResultPanel, SyntheticProspectLine } from './shared';
import styles from './practice.module.css';

interface Props {
  nodes: ScriptNode[];
  mode: AssistanceMode;
  onResult: (result: DrillResult, nodeId?: string) => void;
}

const FACT_LABELS: Record<string, string> = {
  real_needs: 'Real needs',
  objections: 'Objections',
  budget_capacity: 'Budget / capacity',
  decision_roles: 'Decision roles',
  already_tried: 'Already tried',
  would_proceed_if: 'Would proceed if',
  would_not_proceed_if: 'Would not proceed if',
};

/**
 * Choice-based full mock. During the run only the coach view (public brief + revealed lines)
 * is rendered; the hidden fact sheet is fetched through `evaluatorView` only after the run
 * ends and only when the evaluator disclosure is opened.
 */
export function MockPanel({ nodes, mode, onResult }: Props) {
  const [scenarioId, setScenarioId] = useState(PRACTICE_SCENARIOS[0]?.id ?? '');
  const [run, setRun] = useState<MockRun | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [score, setScore] = useState<MockOutcomeScore | null>(null);
  const [evaluatorOpen, setEvaluatorOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const scenario = PRACTICE_SCENARIOS.find((s) => s.id === scenarioId) ?? PRACTICE_SCENARIOS[0];
  if (!scenario) return null;
  const coach = coachView(scenario, run?.revealed_facts ?? []);
  const step = run ? run.steps[run.steps.length - 1] : undefined;
  const node = step ? nodes.find((n) => n.id === step.node_id) : undefined;

  function start() {
    if (!scenario) return;
    setRun(fullMock(scenario, nodes));
    setChoice(null);
    setScore(null);
    setEvaluatorOpen(false);
    setRevealed(false);
  }

  function advance() {
    if (!run || !scenario || !choice) return;
    const next = advanceMock(run, scenario, nodes, choice);
    setRun(next);
    setChoice(null);
    setRevealed(false);
    if (next.ended && next.outcome) {
      const s = mockOutcomeScore(scenario, next.outcome, next.path);
      setScore(s);
      onResult(
        {
          item_id: `full_mock:${scenario.id}`,
          kind: 'full_mock',
          correct: s.score === 1,
          conversation_score: s.conversation_score,
          missing_words: [],
          extra_words: [],
          tone_assessed: false,
          notes: `${scenario.title}: outcome "${next.outcome.replace(/_/g, ' ')}". ${s.note} Tone: not assessed (text-only).`,
        },
        next.entry_node_id ?? undefined,
      );
    }
  }

  const ended = run?.ended ?? false;
  const evaluator = ended && evaluatorOpen ? evaluatorView(scenario, run?.revealed_facts ?? []) : null;

  return (
    <Card title="Full mock" headingLevel="h3" data-drill-kind="full_mock">
      <Stack gap={4}>
        <Inline gap={2}>
          <Badge variant="warning">{NOT_A_VOICE_CALL}</Badge>
          <Badge variant="neutral">FICTIONAL scenario</Badge>
        </Inline>

        <Field id="mock-scenario" label="Scenario" help="Every scenario is fictional. Some never convert: a respectful exit is the correct result there.">
          {(control) => (
            <Select
              {...control}
              value={scenario.id}
              disabled={run !== null && !ended}
              onChange={(e) => {
                setScenarioId(e.target.value);
                setRun(null);
                setScore(null);
                setEvaluatorOpen(false);
              }}
              options={PRACTICE_SCENARIOS.map((s) => ({ value: s.id, label: s.title }))}
            />
          )}
        </Field>

        <section aria-label="Public brief" data-coach-view>
          <h4 className={styles.assistTitle}>Public brief (what you may know)</h4>
          <p>{coach.public_brief}</p>
        </section>

        {run === null ? (
          <div>
            <Button variant="primary" onClick={start} disabled={nodes.length === 0}>
              Start mock
            </Button>
          </div>
        ) : null}

        {run && run.empty ? <p role="status">No entry node is available for this scenario&apos;s entrypoint.</p> : null}

        {run && step && node && !ended ? (
          <Stack gap={3} data-mock-step>
            <div className={styles.stepMeta}>
              <Badge variant="neutral">step {step.index + 1}</Badge>
              <Badge variant="neutral">stage: {step.stage}</Badge>
              <span className={styles.cite}>node {step.node_id}</span>
            </div>
            <AssistanceBlock node={node} mode={mode} revealed={revealed} onReveal={() => setRevealed(true)} />
            <SyntheticProspectLine text={step.prospect_line} />
            <p className={styles.prompt}>How do you classify that answer — or how do you end?</p>
            <ChoiceGroup label="Branch or exit" choices={step.choices} selected={choice} onSelect={setChoice} />
            <Inline gap={2}>
              <Button variant="primary" onClick={advance} disabled={choice === null}>
                Advance
              </Button>
              <Button onClick={start}>Restart</Button>
            </Inline>
          </Stack>
        ) : null}

        {run && ended && !run.empty ? (
          <Stack gap={3} data-mock-ended>
            <p role="status">
              Mock ended{run.outcome ? ` with outcome "${run.outcome.replace(/_/g, ' ')}"` : ' at the end of the scripted sequence without an exit choice — restart and choose how you end'}.
            </p>
            <div>
              <h4 className={styles.assistTitle}>Path</h4>
              <ol className={styles.pathList}>
                {run.path.map((id, i) => (
                  <li key={`${id}-${i}`}>
                    <span className={styles.cite}>{id}</span>
                  </li>
                ))}
              </ol>
            </div>
            {score ? (
              <ResultPanel
                result={{
                  item_id: `full_mock:${scenario.id}`,
                  kind: 'full_mock',
                  correct: score.score === 1,
                  conversation_score: score.conversation_score,
                  missing_words: [],
                  extra_words: [],
                  tone_assessed: false,
                  notes: score.note,
                }}
              />
            ) : null}
            <div>
              <Button onClick={() => setEvaluatorOpen((o) => !o)} aria-expanded={evaluatorOpen} aria-controls="evaluator-view" data-evaluator-toggle>
                {evaluatorOpen ? 'Hide evaluator view (post-session)' : 'Evaluator view (post-session)'}
              </Button>
            </div>
            {evaluator ? (
              <section id="evaluator-view" className={styles.factSheet} aria-label="Evaluator view (post-session)" data-evaluator-view>
                <Inline gap={2}>
                  <Badge variant="warning">Post-session evaluator view — hidden fact sheet</Badge>
                  <Badge variant="neutral">not available during the run</Badge>
                </Inline>
                <p className={styles.muted}>
                  Legitimate outcomes: {evaluator.legitimate_outcomes.map((o) => o.replace(/_/g, ' ')).join(', ')}
                  {evaluator.never_converts ? ' · this scenario never converts' : ''}
                </p>
                <dl className={styles.factGroup}>
                  {Object.entries(evaluator.hidden_fact_sheet).map(([k, v]) => (
                    <div key={k}>
                      <dt>{FACT_LABELS[k] ?? k}</dt>
                      {v.map((line, i) => (
                        <dd key={i}>{line}</dd>
                      ))}
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            <div>
              <Button onClick={start}>Run again</Button>
            </div>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
