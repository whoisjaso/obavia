'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { AssistanceMode, DEFAULT_ASSISTANCE_MODE, PracticeAttempt, type DrillKind, type DrillResult, type ScriptNode } from '@apohenia/domain/schemas';
import { MODE_COPY, MODE_DESCRIPTIONS, MODE_LABELS, TONE_NOTE, attemptFromResult, isAssisted, summarizeAttempts, type BucketSummary } from '@apohenia/domain/practice';
import { Badge, Button, Card, EmptyState, Field, Inline, Select, Stack } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { DrillPanel, type NodeDrillKind } from './DrillPanel';
import { MockPanel } from './MockPanel';
import { CONVERSATION_LABEL, MEMORIZATION_LABEL, pct } from './shared';
import styles from './practice.module.css';

const Attempts = z.array(PracticeAttempt);
const EMPTY_ATTEMPTS: PracticeAttempt[] = [];

interface Props {
  nodes: ScriptNode[];
  scriptVersionId: string;
  placeholder: boolean;
}

const DRILLS: { kind: DrillKind; name: string; hint: string }[] = [
  { kind: 'exact_recall', name: 'Exact recall', hint: 'Type the primary line word for word.' },
  { kind: 'recall_with_reveal', name: 'Recall with reveal', hint: 'Same, with a reveal you can use.' },
  { kind: 'order_rehearsal', name: 'Order rehearsal', hint: 'Put a stage back in sequence.' },
  { kind: 'random_node_lookup', name: 'Random node lookup', hint: 'From the cue, find the line.' },
  { kind: 'branch_classification', name: 'Branch classification', hint: 'Sufficient? Which branch? Or mirror?' },
  { kind: 'mirror_duel', name: 'Mirror duel', hint: 'Same answer type, different words.' },
  { kind: 'vocabulary_meaning', name: 'Vocabulary meaning', hint: 'Their definition or ask — never a synonym.' },
  { kind: 'delivery_replay', name: 'Delivery replay', hint: 'Self-rated against the cues. Not measured.' },
  { kind: 'full_mock', name: 'Full mock', hint: 'Choice-based simulation, not an AI voice call.' },
  { kind: 'practice_this_moment', name: 'Practice this moment', hint: 'Retry a weak transition and compare.' },
];

export function PracticeClient({ nodes, scriptVersionId, placeholder }: Props) {
  const [settingsMode, , settingsHydrated] = useStoredState<AssistanceMode>('settings.assistance_mode', AssistanceMode, DEFAULT_ASSISTANCE_MODE);
  const [modeOverride, setModeOverride] = useState<AssistanceMode | null>(null);
  const mode: AssistanceMode = modeOverride ?? settingsMode;

  const [attempts, setAttempts, attemptsHydrated] = useStoredState('practice.attempts', Attempts, EMPTY_ATTEMPTS);
  const [kind, setKind] = useState<DrillKind>('branch_classification');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const summary = useMemo(() => summarizeAttempts(attempts), [attempts]);

  function recordResult(result: DrillResult, nodeId?: string) {
    const now = new Date().toISOString();
    const attempt = attemptFromResult({
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      mode,
      script_version_id: scriptVersionId,
      result,
      started_at: now,
      node_id: nodeId,
    });
    setAttempts((prev) => [...prev, attempt].slice(-200));
    setLastSaved(`Saved attempt (${isAssisted(mode) ? 'assisted' : 'unassisted'}, ${result.kind.replace(/_/g, ' ')}).`);
  }

  if (nodes.length === 0) {
    return (
      <EmptyState title="The script seed is not authored yet" increment="Increment 1" owner="M-script">
        <p>
          Practice drills are built from script nodes (primary lines, answer examples, branches, mirrors). Once
          {placeholder ? ' the placeholder seed is replaced with' : ''} real nodes exist in the script seed, every drill on this page lights up. Nothing is
          imagined in the meantime.
        </p>
      </EmptyState>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ---------------- left: mode + drill picker ---------------- */}
      <div className={styles.column}>
        <Card title="Assistance mode" headingLevel="h2">
          <Field
            id="practice-mode"
            label="Mode for this session"
            help={settingsHydrated && modeOverride === null ? 'Default from Settings.' : 'Changed for this page only; Settings keeps its default.'}
          >
            {(control) => (
              <Select {...control} value={mode} onChange={(e) => setModeOverride(AssistanceMode.parse(e.target.value))} options={AssistanceMode.options.map((m) => ({ value: m, label: MODE_LABELS[m] }))} />
            )}
          </Field>
          <p className={styles.modeCopy}>{MODE_DESCRIPTIONS[mode]}</p>
          <p className={styles.modeCopy} data-mode-copy>
            {MODE_COPY}
          </p>
          <Inline gap={2} style={{ marginTop: 'var(--space-2)' }}>
            <Badge variant="neutral">{isAssisted(mode) ? 'tracked as assisted' : 'tracked as unassisted'}</Badge>
          </Inline>
        </Card>

        <Card title="Drills" headingLevel="h2">
          <ul className={styles.picker} aria-label="Drill picker">
            {DRILLS.map((d) => (
              <li key={d.kind}>
                <button type="button" className={styles.pickerButton} aria-pressed={kind === d.kind} onClick={() => setKind(d.kind)} data-drill-pick={d.kind}>
                  <span className={styles.pickerName}>{d.name}</span>
                  <span className={styles.pickerHint}>{d.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---------------- right: drill + history ---------------- */}
      <div className={styles.column}>
        <div className={styles.status} role="status" data-practice-status>
          <Inline gap={2}>
            <Badge variant="neutral">{nodes.length} nodes · version {scriptVersionId}</Badge>
            <Badge variant="warning">all nodes draft — training only</Badge>
            <Badge variant="neutral">{TONE_NOTE}</Badge>
            {lastSaved ? <span className={styles.muted}>{lastSaved}</span> : null}
          </Inline>
        </div>

        {kind === 'full_mock' ? (
          <MockPanel nodes={nodes} mode={mode} onResult={recordResult} />
        ) : (
          <DrillPanel key={kind} kind={kind as NodeDrillKind} nodes={nodes} mode={mode} scriptVersionId={scriptVersionId} onResult={recordResult} />
        )}

        <Card title="History" headingLevel="h2">
          <Stack gap={3}>
            <p className={styles.muted}>
              Assisted and unassisted attempts are summarised separately and never mixed. {MEMORIZATION_LABEL} and {CONVERSATION_LABEL} are separate scores. {TONE_NOTE}.
            </p>
            {!attemptsHydrated ? (
              <p className={styles.muted}>Reading local history…</p>
            ) : (
              <div className={styles.summaryGrid} data-history-summary>
                <SummaryColumn title="Assisted" bucket={summary.assisted} />
                <SummaryColumn title="Unassisted" bucket={summary.unassisted} />
              </div>
            )}
            {attemptsHydrated && attempts.length > 0 ? (
              <>
                <table className={styles.historyTable}>
                  <caption className={styles.muted} style={{ textAlign: 'left' }}>
                    Last {Math.min(attempts.length, 10)} of {attempts.length} attempts (stored locally)
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Drill</th>
                      <th scope="col">Mode</th>
                      <th scope="col">{MEMORIZATION_LABEL}</th>
                      <th scope="col">{CONVERSATION_LABEL}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts
                      .slice(-10)
                      .reverse()
                      .map((a) => (
                        <tr key={a.id}>
                          <td>{a.started_at.slice(0, 16).replace('T', ' ')}</td>
                          <td>{a.drill_kind.replace(/_/g, ' ')}</td>
                          <td>{a.assisted ? 'assisted' : 'unassisted'}</td>
                          <td>{a.memorization_score ? `${pct(a.memorization_score.exact_match_ratio)} / ${pct(a.memorization_score.word_order_ratio)}` : '—'}</td>
                          <td>{a.conversation_score ? (a.conversation_score.objective_satisfied ? 'satisfied' : 'not satisfied') : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div>
                  <Button variant="danger" onClick={() => setAttempts([])}>
                    Clear practice history
                  </Button>
                </div>
              </>
            ) : attemptsHydrated ? (
              <p className={styles.muted}>No attempts yet.</p>
            ) : null}
          </Stack>
        </Card>
      </div>
    </div>
  );
}

function SummaryColumn({ title, bucket }: { title: string; bucket: BucketSummary }) {
  return (
    <div className={styles.summaryCol}>
      <span className={styles.summaryHead}>{title}</span>
      <span>{bucket.attempts} attempt(s)</span>
      <span>
        <strong>{MEMORIZATION_LABEL}:</strong>{' '}
        {bucket.memorization.attempts > 0
          ? `${bucket.memorization.attempts} scored · mean exact ${pct(bucket.memorization.mean_exact_match_ratio ?? 0)} · mean order ${pct(bucket.memorization.mean_word_order_ratio ?? 0)}`
          : 'none scored'}
      </span>
      <span>
        <strong>{CONVERSATION_LABEL}:</strong>{' '}
        {bucket.conversation.attempts > 0
          ? `${bucket.conversation.attempts} scored · ${bucket.conversation.objective_satisfied} objective satisfied · ${bucket.conversation.branch_choices_correct}/${bucket.conversation.branch_choices} branch choices · ${bucket.conversation.accurate_disqualifications} accurate disqualification(s)`
          : 'none scored'}
      </span>
    </div>
  );
}
