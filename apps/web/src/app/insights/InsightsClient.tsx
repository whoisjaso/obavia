'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { PracticeAttempt } from '@apohenia/domain/schemas';
import { summarizeAttempts } from '@apohenia/domain/practice';
import type { FunnelStage, RubricDefinition } from '@apohenia/domain/vocabulary';
import { Chip, Icon, IconButton, NotAssessedLabel, Ring, Sheet, Tile, TopBar } from '@/components/ui';
import { listStoredKeys, readStored, useStoredState } from '@/lib/storage';
import styles from './insights.module.css';

const Attempts = z.array(PracticeAttempt);
const EMPTY_ATTEMPTS: PracticeAttempt[] = [];
/** Shape of a `today.<yyyy-mm-dd>` record (read-only here; Today owns it). */
const DayRecord = z.object({ done: z.record(z.string(), z.boolean()).default({}), minimum_day: z.boolean().default(false) });

export interface InsightsClientProps {
  funnel: FunnelStage[];
  rubric: RubricDefinition;
}

const TONE_NAME = 'Tone not assessed (text-only)';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Plain display form of a domain label that carries a dash separator ("internal training rubric, not validated"). */
function plainLabel(label: string): string {
  return label.replace(/\s+[—–]\s+/g, ', ');
}

/**
 * Insights (DESIGN_SYSTEM §3.6): rings and numbers with "n of N" captions; an empty mark where
 * nothing is counted; the rubric behind a sheet. Real calls: none yet, so every funnel stage reads
 * "None yet" and is never rendered as zero performance. Practice numbers come from local, synthetic
 * drills only.
 */
export function InsightsClient({ funnel, rubric }: InsightsClientProps) {
  const [attempts, , hydrated] = useStoredState<PracticeAttempt[]>('practice.attempts', Attempts, EMPTY_ATTEMPTS);
  const [days, setDays] = useState<{ recorded: number; kept: number } | null>(null);
  const [sheet, setSheet] = useState<'none' | 'rubric' | 'about' | 'stages'>('none');
  const [stage, setStage] = useState<FunnelStage | null>(null);

  useEffect(() => {
    // Day records live under today.<date>; read them once after mount.
    let recorded = 0;
    let kept = 0;
    for (const { key } of listStoredKeys()) {
      if (!/^today\.\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const rec = readStored(key, DayRecord, null);
      if (!rec) continue;
      recorded += 1;
      if (Object.values(rec.done).some(Boolean)) kept += 1;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount read of localStorage
    setDays({ recorded, kept });
  }, [attempts]);

  const summary = useMemo(() => summarizeAttempts(attempts), [attempts]);
  const mem = { n: summary.assisted.memorization.attempts + summary.unassisted.memorization.attempts };
  const memMean = (() => {
    const a = summary.assisted.memorization;
    const u = summary.unassisted.memorization;
    const total = a.attempts + u.attempts;
    if (total === 0) return null;
    return ((a.mean_exact_match_ratio ?? 0) * a.attempts + (u.mean_exact_match_ratio ?? 0) * u.attempts) / total;
  })();
  const conv = {
    n: summary.assisted.conversation.objective_satisfied + summary.unassisted.conversation.objective_satisfied,
    N: summary.assisted.conversation.attempts + summary.unassisted.conversation.attempts,
  };

  return (
    <div className={styles.root} data-insights data-hydrated={hydrated ? 'true' : 'false'}>
      <TopBar
        title="Insights"
        right={
          <>
            <IconButton icon="info" label="About Insights: nothing is counted until real, consented calls exist; missing data is reported as missing, never as zero performance" onClick={() => setSheet('about')} data-about-open />
            <IconButton icon="star" label={`Review rubric: ${rubric.label}`} onClick={() => setSheet('rubric')} data-rubric-open />
          </>
        }
      />

      {/* ---- calls: nothing counted → one ∅ tile for the whole group; the nine stage definitions live behind a chip ---- */}
      <section className={styles.block} aria-labelledby="ins-calls">
        <span id="ins-calls" className={styles.kicker}>
          Calls
        </span>
        <div className={styles.callsRow}>
          <div className={styles.emptyTile} data-calls-empty role="group" aria-label="Calls: nothing counted. No real, consented calls exist yet; synthetic calls are never counted">
            <span className={styles.emptyGlyph} aria-hidden="true">
              <Icon name="empty" size={56} weight="bold" />
            </span>
            <span className={styles.emptyLabel}>Nothing counted</span>
          </div>
          <div className={styles.callsSide}>
            <Tile icon="phone" label="Dial" href="/" name="Dial: demo mode, synthetic prospects" />
            <Chip label={`${funnel.length} stages`} icon="hourglass" name={`${funnel.length} funnel stages: definitions only; nothing is counted until real calls exist. Open.`} onClick={() => setSheet('stages')} data-stages-open />
          </div>
        </div>
      </section>

      {/* ---- practice (local, synthetic) ---- */}
      <section className={styles.block} aria-labelledby="ins-practice">
        <span id="ins-practice" className={styles.kicker}>
          Practice
        </span>
        <div className={styles.rings} data-practice-rings>
          <RingStat label="Drills" value={attempts.length > 0 ? 1 : 0} scored={attempts.length > 0} center={attempts.length > 0 ? String(attempts.length) : null} caption={attempts.length > 0 ? `${attempts.length} logged` : 'None yet'} color="var(--green)" name={attempts.length > 0 ? `Drills: ${attempts.length} attempts stored locally (${summary.assisted.attempts} assisted, ${summary.unassisted.attempts} unassisted)` : 'Drills: no attempts yet'} hook="drills" />
          <RingStat label="Memory" value={memMean ?? 0} scored={memMean !== null} center={memMean !== null ? String(Math.round(memMean * 100)) : null} caption={`${mem.n} of ${attempts.length}`} color="var(--blue)" name={memMean !== null ? `Memory: mean exact match ${pct(memMean)} over ${mem.n} of ${attempts.length} attempts that were memory-scored` : `Memory: nothing scored yet (0 of ${attempts.length})`} hook="memory" />
          <RingStat label="Objective" value={conv.N > 0 ? conv.n / conv.N : 0} scored={conv.N > 0} center={conv.N > 0 ? `${conv.n}` : null} caption={`${conv.n} of ${conv.N}`} color="var(--teal)" name={conv.N > 0 ? `Objective satisfied in ${conv.n} of ${conv.N} conversation-scored attempts` : 'Objective: nothing scored yet (0 of 0)'} hook="objective" />
        </div>
        <div className={styles.chips}>
          <Chip static icon="list" label={`${summary.assisted.attempts} assisted`} tone="green" name={`${summary.assisted.attempts} assisted attempts`} />
          <Chip static icon="circle" label={`${summary.unassisted.attempts} unassisted`} tone="blue" name={`${summary.unassisted.attempts} unassisted attempts`} />
          <NotAssessedLabel label="Tone: Not assessed" name={TONE_NAME} />
        </div>
      </section>

      {/* ---- days ---- */}
      <section className={styles.block} aria-labelledby="ins-days">
        <span id="ins-days" className={styles.kicker}>
          Days
        </span>
        <div className={styles.rings} data-days-rings>
          <RingStat
            label="Kept"
            value={days && days.recorded > 0 ? days.kept / days.recorded : 0}
            scored={Boolean(days && days.recorded > 0)}
            center={days && days.recorded > 0 ? String(days.kept) : null}
            caption={days && days.recorded > 0 ? `${days.kept} of ${days.recorded}` : 'None yet'}
            color="var(--purple)"
            name={days && days.recorded > 0 ? `Days with completion evidence: ${days.kept} of ${days.recorded} days recorded on Today. No streaks; a missed day is information, not a verdict.` : 'Days: no Today records yet'}
            hook="days"
          />
        </div>
      </section>

      {/* ---- the nine stages: a 3-by-3 grid of empty rings until anything is counted ---- */}
      <Sheet open={sheet === 'stages'} onClose={() => setSheet('none')} title="Stages" data-sheet="stages" tall>
        <div className={styles.stageGrid} aria-label="Funnel stages: definitions only, nothing counted" data-funnel>
          {funnel.map((s) => (
            <button key={s.key} type="button" className={styles.stageTile} onClick={() => setStage(s)} aria-label={`${s.label}: not counted. Numerator: ${s.numerator}. Denominator: ${s.denominator}.`} data-funnel-stage={s.key}>
              <Ring value={0} size={44} stroke={4} color="var(--ink-3)" track="rgba(255,255,255,0.16)">
                <span className={styles.ringDash} aria-hidden="true">
                  <Icon name="empty" size={16} weight="bold" />
                </span>
              </Ring>
              <span className={styles.stageTileLabel} aria-hidden="true">
                {s.label}
              </span>
              <span className={styles.ratio} aria-hidden="true">
                None yet
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* ---- funnel stage definition ---- */}
      <Sheet open={stage !== null} onClose={() => setStage(null)} title="Stage" data-sheet="funnel-stage">
        {stage ? (
          <div className={styles.sheetStack}>
            <p className={styles.sheetBig}>{stage.label}</p>
            <div className={styles.sheetRow}>
              <span className={styles.sheetKey}>n</span>
              <span className={styles.sheetText}>{stage.numerator}</span>
            </div>
            <div className={styles.sheetRow}>
              <span className={styles.sheetKey}>N</span>
              <span className={styles.sheetText}>{stage.denominator}</span>
            </div>
            <div className={styles.chips}>
              <Chip static icon="empty" label="not counted" name="Not counted: no real, consented calls exist yet" />
              <Chip static icon="hourglass" label="Increment 5" name="Counted from Increment 5 onward, with date range, offer and script version, source and sample size" />
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* ---- about ---- */}
      <Sheet open={sheet === 'about'} onClose={() => setSheet('none')} title="Insights" data-sheet="insights-about">
        <div className={styles.sheetStack}>
          <p className={styles.sheetBig}>No real calls yet. Nothing is counted.</p>
          <p className={styles.sheetText}>Synthetic calls are never counted. When real, consented calls exist, every metric shows its numerator, denominator, date range, offer and script version, inbound/outbound source and sample size. A tiny sample never supports a claim that a script caused growth.</p>
          <p className={styles.sheetText}>Practice numbers come from local drills on synthetic material. Assisted and unassisted attempts are summarised separately; Memory and Objective are separate scores. Tone is never assessed in text-only practice.</p>
          <p className={styles.sheetMuted}>Missing data is reported as missing, never as zero performance. No dollar-valued estimates unless amounts and assumptions are entered and labelled.</p>
        </div>
      </Sheet>

      {/* ---- rubric ---- */}
      <Sheet open={sheet === 'rubric'} onClose={() => setSheet('none')} title={plainLabel(rubric.label)} tall data-sheet="rubric">
        <div className={styles.sheetStack}>
          <ul className={styles.criteria} data-rubric>
            {rubric.criteria.map((c) => (
              <li key={c.key} className={styles.criterion}>
                <Ring value={c.weight / rubric.total} size={52} stroke={6} color="var(--gold)" label={`${c.label}: weight ${c.weight} of ${rubric.total}`}>
                  <span className={styles.weight} aria-hidden="true">
                    {c.weight}
                  </span>
                </Ring>
                <div className={styles.criterionText}>
                  <span className={styles.criterionLabel}>{c.label}</span>
                  <span className={styles.criterionDesc}>{c.description}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.chips} aria-label="Automatic fail regardless of score">
            {rubric.automatic_fail.map((f) => (
              <Chip key={f} static icon="x" label={f} tone="red" name={`Automatic fail regardless of score: ${f}`} />
            ))}
          </div>
          {rubric.notes.map((n) => (
            <p key={n} className={styles.sheetMuted}>
              {n}
            </p>
          ))}
          <p className={styles.sheetMuted}>Text-only reviews mark tone “not assessed”, never an invented acoustic rating.</p>
        </div>
      </Sheet>
    </div>
  );
}

/** A ring with a big number, a one-word label and an "n of N" caption; unscored = empty mark in the ring, "None yet" caption. */
function RingStat({ label, value, scored, center, caption, color, name, hook }: { label: string; value: number; scored: boolean; center: string | null; caption: string; color: string; name: string; hook: string }) {
  return (
    <div className={styles.ringStat} role="group" aria-label={name} data-ring-stat={hook} data-scored={scored ? 'true' : 'false'}>
      <Ring value={scored ? value : 0} size={84} stroke={8} color={scored ? color : 'var(--ink-3)'}>
        <span className={[styles.ringCenter, center === null ? styles.ringCenterEmpty : ''].join(' ').trim()} aria-hidden="true">
          {center === null ? <Icon name="empty" size={28} weight="bold" /> : center}
        </span>
      </Ring>
      <span className={styles.ringLabel} aria-hidden="true">
        {label}
      </span>
      <span className={styles.ratio} aria-hidden="true" data-ratio={caption}>
        {caption}
      </span>
    </div>
  );
}
