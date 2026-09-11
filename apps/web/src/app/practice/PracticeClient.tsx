'use client';

import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { AssistanceMode, DEFAULT_ASSISTANCE_MODE, PracticeAttempt, type DrillKind, type DrillResult, type ScriptNode } from '@apohenia/domain/schemas';
import { MODE_COPY, NOT_A_VOICE_CALL, TONE_NOTE, attemptFromResult, summarizeAttempts, type BucketSummary } from '@apohenia/domain/practice';
import { Chip, FictionalPill, GlyphPill, IconButton, NotAssessedGlyph, Ring, Sheet, Stat, Tile, TileGrid, Toast, TopBar, useToast } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { DrillScreen, type NodeDrillKind } from './DrillScreen';
import { MockScreen } from './MockScreen';
import { ModeControl } from './ModeControl';
import { EmptyGlyph, TONE_NAME } from './parts';
import { DRILLS, drillRing, modeName, pct } from './practice-lib';
import styles from './practice.module.css';

const Attempts = z.array(PracticeAttempt);
const EMPTY_ATTEMPTS: PracticeAttempt[] = [];

export interface PracticeClientProps {
  nodes: ScriptNode[];
  scriptVersionId: string;
  placeholder: boolean;
}

/**
 * Train (DESIGN_SYSTEM §3.4): a 5-glyph assistance control, a 2-column grid of ten drill tiles
 * with two rings each (assisted / unassisted, from stored attempts), and one drill at a time on
 * the same route. Attempts persist to `practice.attempts`; the mode default comes from
 * `settings.assistance_mode` and changing it here is for this visit only (reversible).
 */
export function PracticeClient({ nodes, scriptVersionId, placeholder }: PracticeClientProps) {
  const [settingsMode] = useStoredState<AssistanceMode>('settings.assistance_mode', AssistanceMode, DEFAULT_ASSISTANCE_MODE);
  const [override, setOverride] = useState<AssistanceMode | null>(null);
  const mode: AssistanceMode = override ?? settingsMode;

  const [attempts, setAttempts, hydrated] = useStoredState('practice.attempts', Attempts, EMPTY_ATTEMPTS);
  const [drill, setDrill] = useState<DrillKind | null>(null);
  const [sheet, setSheet] = useState<'none' | 'info' | 'history'>('none');
  const [confirmClear, setConfirmClear] = useState(false);
  const [live, setLive] = useState('');
  const [toast, showToast] = useToast();

  const summary = useMemo(() => summarizeAttempts(attempts), [attempts]);

  const record = useCallback(
    (result: DrillResult, nodeId?: string) => {
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
    },
    [mode, scriptVersionId, setAttempts],
  );

  const close = useCallback(() => setDrill(null), []);

  function changeMode(next: AssistanceMode) {
    setOverride(next);
    setLive(`Assistance mode: ${modeName(next)}`);
  }

  if (nodes.length === 0) {
    return (
      <div className={styles.screen}>
        <TopBar title="Train" left={placeholder ? <GlyphPill glyph="◔" label="Placeholder" name="Placeholder script seed — to be authored; nothing is imagined in the meantime" tone="orange" /> : null} />
        <EmptyGlyph glyph="∅" label="No script">
          <Tile icon="script" label="Script" href="/scripts" />
        </EmptyGlyph>
      </div>
    );
  }

  return (
    <div className={styles.root} data-practice data-hydrated={hydrated ? 'true' : 'false'} data-mode={mode}>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-practice-live>
        {live}
      </div>

      {drill === null ? (
        <div className={styles.screen} data-drill-grid-screen>
          <TopBar
            title="Train"
            left={placeholder ? <GlyphPill glyph="◔" label="Placeholder" name="Placeholder script seed — to be authored" tone="orange" /> : null}
            right={
              <>
                <IconButton icon="history" label="History — assisted and unassisted attempts, summarised separately" onClick={() => setSheet('history')} data-history-open />
                <IconButton icon="info" label={`About Train: ${NOT_A_VOICE_CALL}. ${TONE_NOTE}. ${MODE_COPY}`} onClick={() => setSheet('info')} data-info-open />
              </>
            }
          />

          <ModeControl value={mode} onChange={changeMode} />

          <TileGrid columns={2} data-drill-grid>
            {DRILLS.map((d) => {
              const a = drillRing(attempts, d, true);
              const u = drillRing(attempts, d, false);
              return (
                <Tile key={d.kind} icon={d.icon} label={d.label} name={`${d.label}: ${d.hint} ${a.name}. ${u.name}.`} size="lg" onClick={() => setDrill(d.kind)} data-drill-tile={d.kind} className={styles.drillTile}>
                  <span className={styles.tileRings} aria-hidden="true">
                    <span data-tile-ring="assisted" data-count={a.count} data-scored={a.scored ? 'true' : 'false'} data-value={a.value.toFixed(2)}>
                      <Ring value={a.value} size={26} stroke={4} color="var(--green)">
                        <span className={styles.ringGlyph}>≡</span>
                      </Ring>
                    </span>
                    <span data-tile-ring="unassisted" data-count={u.count} data-scored={u.scored ? 'true' : 'false'} data-value={u.value.toFixed(2)}>
                      <Ring value={u.value} size={26} stroke={4} color="var(--blue)">
                        <span className={styles.ringDot}>○</span>
                      </Ring>
                    </span>
                  </span>
                </Tile>
              );
            })}
          </TileGrid>
        </div>
      ) : drill === 'full_mock' ? (
        <MockScreen key="mock" nodes={nodes} mode={mode} onResult={record} onClose={close} onLive={setLive} />
      ) : (
        <DrillScreen key={drill} kind={drill as NodeDrillKind} nodes={nodes} mode={mode} onResult={record} onClose={close} onLive={setLive} />
      )}

      {/* History: two buckets, never mixed. */}
      <Sheet open={sheet === 'history'} onClose={() => { setSheet('none'); setConfirmClear(false); }} title="History" data-sheet="history">
        <div className={styles.history} data-history-summary>
          <BucketCard title="Assisted" glyph="≡" bucket={summary.assisted} color="var(--green)" />
          <BucketCard title="Unassisted" glyph="○" bucket={summary.unassisted} color="var(--blue)" />
        </div>
        <div className={styles.historyFoot}>
          <NotAssessedGlyph name={TONE_NAME} />
          <Chip static label={`${attempts.length} stored`} name={`${attempts.length} attempts stored locally (last 200)`} />
        </div>
        {attempts.length > 0 ? (
          confirmClear ? (
            <TileGrid columns={2}>
              <Tile
                icon="x"
                label="Clear"
                name="Clear practice history for good"
                tone="red"
                onClick={() => {
                  setAttempts([]);
                  setConfirmClear(false);
                  showToast('History cleared');
                }}
                data-clear-confirm
              />
              <Tile icon="check" label="Keep" onClick={() => setConfirmClear(false)} />
            </TileGrid>
          ) : (
            <Tile icon="x" label="Clear" name="Clear practice history (asks once more)" tone="red" onClick={() => setConfirmClear(true)} data-clear-history />
          )
        ) : null}
      </Sheet>

      {/* ⓘ — the honest labels, in full sentences, off the stage. */}
      <Sheet open={sheet === 'info'} onClose={() => setSheet('none')} title="Train" data-sheet="train-info">
        <div className={styles.sheetStack}>
          <div className={styles.chipRow}>
            <FictionalPill />
            <Chip static label={`${nodes.length} nodes`} name={`${nodes.length} script nodes, version ${scriptVersionId}`} />
            <Chip static glyph="◔" label="draft" name="All nodes are draft — training only" tone="teal" />
          </div>
          <p className={styles.sheetBig}>{NOT_A_VOICE_CALL}.</p>
          <p className={styles.sheetText}>{TONE_NOTE}. Memory and Conversation are separate scores and never mixed.</p>
          <p className={styles.sheetText}>Assisted and unassisted attempts are summarised separately. {MODE_COPY} Nothing here ranks you.</p>
          <p className={styles.sheetMuted}>Mode now: {modeName(mode)}</p>
        </div>
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}

function BucketCard({ title, glyph, bucket, color }: { title: string; glyph: string; bucket: BucketSummary; color: string }) {
  const mem = bucket.memorization;
  const conv = bucket.conversation;
  const memValue = mem.mean_exact_match_ratio ?? 0;
  const convValue = conv.attempts > 0 ? conv.objective_satisfied / conv.attempts : 0;
  return (
    <div className={styles.bucket} role="group" aria-label={`${title}: ${bucket.attempts} attempts`} data-bucket={title.toLowerCase()}>
      <span className={styles.bucketHead}>
        <span aria-hidden="true" className={styles.bucketGlyph} style={{ color }}>
          {glyph}
        </span>
        {title}
      </span>
      <Stat value={bucket.attempts} icon="target" name="Attempts" />
      <div className={styles.bucketRings}>
        <div className={styles.score} data-scored={mem.attempts > 0 ? 'true' : 'false'}>
          <Ring value={memValue} size={64} stroke={6} color={mem.attempts > 0 ? color : 'var(--ink-3)'} label={mem.attempts > 0 ? `Memory: ${mem.attempts} scored, mean exact match ${pct(memValue)}, mean word order ${pct(mem.mean_word_order_ratio ?? 0)}` : 'Memory: none scored'}>
            <span className={styles.scoreCenterSmall} aria-hidden="true">
              {mem.attempts > 0 ? Math.round(memValue * 100) : '—'}
            </span>
          </Ring>
          <span className={styles.scoreLabel} aria-hidden="true">
            Memory
          </span>
        </div>
        <div className={styles.score} data-scored={conv.attempts > 0 ? 'true' : 'false'}>
          <Ring
            value={convValue}
            size={64}
            stroke={6}
            color={conv.attempts > 0 ? 'var(--teal)' : 'var(--ink-3)'}
            label={conv.attempts > 0 ? `Conversation: ${conv.attempts} scored, ${conv.objective_satisfied} objective satisfied, ${conv.branch_choices_correct} of ${conv.branch_choices} branch choices, ${conv.accurate_disqualifications} accurate disqualifications` : 'Conversation: none scored'}
          >
            <span className={styles.scoreCenterSmall} aria-hidden="true">
              {conv.attempts > 0 ? Math.round(convValue * 100) : '—'}
            </span>
          </Ring>
          <span className={styles.scoreLabel} aria-hidden="true">
            Conversation
          </span>
        </div>
      </div>
    </div>
  );
}
