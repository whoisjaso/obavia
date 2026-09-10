'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';
import type { Transcript, VocabularyEvent } from '@apohenia/domain/schemas';
import { HumanCorrection } from '@apohenia/domain/schemas';
import { analyzeCall, postCallReview, provenanceLabel, rubricDefinition, type NodeLike } from '@apohenia/domain/vocabulary';
import { Badge, Button, Card, Field, Select, Stack } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './calls.module.css';

const Corrections = z.array(HumanCorrection);
const NO_CORRECTIONS: HumanCorrection[] = [];
const SPEAKER: Record<string, string> = { representative: 'Rep', prospect: 'Prospect', unknown: 'Unknown' };

export interface CallDetailClientProps {
  transcript: Transcript;
  nodesCovered: NodeLike[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

/** Wrap each event occurrence in the turn text with a provenance tag. */
function tagPhrases(text: string, events: VocabularyEvent[], turnId: string): ReactNode {
  const here = events.filter((e) => e.turn_id === turnId).sort((a, b) => a.span.start - b.span.start);
  if (here.length === 0) return text;
  const out: ReactNode[] = [];
  let pos = 0;
  for (const e of here) {
    if (e.span.start < pos) continue;
    out.push(text.slice(pos, e.span.start));
    out.push(
      <span key={e.id} className={styles.phrase} title={provenanceLabel(e)}>
        {text.slice(e.span.start, e.span.end)}
      </span>,
    );
    pos = e.span.end;
  }
  out.push(text.slice(pos));
  return out;
}

export function CallDetailClient({ transcript, nodesCovered }: CallDetailClientProps) {
  const analysis = useMemo(() => analyzeCall(transcript.turns), [transcript]);
  const review = useMemo(() => postCallReview(transcript, nodesCovered), [transcript, nodesCovered]);
  const rubric = rubricDefinition();
  const [corrections, setCorrections, hydrated] = useStoredState(`calls.corrections.${transcript.call_id}`, Corrections, NO_CORRECTIONS);
  const [eventId, setEventId] = useState(analysis.events[0]?.id ?? '');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  const selected = analysis.events.find((e) => e.id === eventId);

  function save() {
    if (!selected || text.trim().length === 0) {
      setStatus('Choose a phrase and write the corrected meaning first.');
      return;
    }
    const entry: HumanCorrection = {
      event_id: selected.id,
      original_meaning: selected.meaning ?? null,
      corrected_meaning: text.trim(),
      corrected_at: new Date().toISOString(),
      corrected_by: 'rep',
    };
    setCorrections((prev) => [...prev, entry]);
    setText('');
    setStatus(`Correction saved for "${selected.exact_text}". The original stays visible.`);
  }

  const quoteText = (turnId: string | null) => {
    if (!turnId) return null;
    const t = analysis.turns.find((x) => x.utterance_id === turnId);
    return t ? `${SPEAKER[t.speaker_role]} · ${turnId}: “${t.text}”` : turnId;
  };

  return (
    <Stack gap={5}>
      <Card title={transcript.title}>
        <p className={styles.muted}>
          <code>{transcript.call_id}</code> · {analysis.turns.length} turns · {analysis.events.length} vocabulary events ·{' '}
          {analysis.dropped.length} duplicate provider event(s) dropped · {analysis.revisions.length} revision(s)
        </p>
      </Card>

      <Card title="Post-call review">
        <dl className={styles.review} data-review>
          <dt>Strength</dt>
          <dd>
            {review.strength.text}
            {review.strength.quote_turn_id ? <div className={styles.quote}>{quoteText(review.strength.quote_turn_id)}</div> : null}
          </dd>
          <dt>Highest-leverage correction</dt>
          <dd>
            {review.correction.text}
            {review.correction.quote_turn_id ? <div className={styles.quote}>{quoteText(review.correction.quote_turn_id)}</div> : null}
          </dd>
          <dt>Better question</dt>
          <dd>{review.better_question}</dd>
          <dt>Drill</dt>
          <dd>{review.drill}</dd>
          <dt>Next step / outcome</dt>
          <dd>{review.next_step_or_outcome}</dd>
          <dt>Uncertainties</dt>
          <dd>
            <ul>
              {review.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </dd>
          <dt>Tone</dt>
          <dd data-review-tone>{review.tone}</dd>
        </dl>
      </Card>

      <Card title={rubric.label}>
        <table className={[styles.table, styles.rubric].join(' ')}>
          <thead>
            <tr>
              <th scope="col">Criterion</th>
              <th scope="col">Weight</th>
              <th scope="col">What it looks at</th>
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.key}>
                <td>{c.label}</td>
                <td>{c.weight}</td>
                <td>{c.description}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              <td>{rubric.total}</td>
              <td>Not scored in Increment 1 — no score is shown for a synthetic call.</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.muted}>Automatic fail regardless of score: {rubric.automatic_fail.join(', ')}.</p>
      </Card>

      <Card title="Transcript with provenance">
        <ol className={styles.turns} aria-label="Transcript turns">
          {analysis.turns.map((t) => {
            const here = analysis.events.filter((e) => e.turn_id === t.utterance_id);
            return (
              <li key={t.utterance_id} className={styles.turn}>
                <div className={styles.turnMeta}>
                  <strong>{SPEAKER[t.speaker_role]}</strong>
                  <div>{t.utterance_id.split('-').pop()}</div>
                  <div>{t.stability === 'interim' ? 'provisional' : 'final'}</div>
                  {t.revision > 0 ? <div>rev {t.revision}</div> : null}
                </div>
                <div>
                  <div>{tagPhrases(t.text, analysis.events, t.utterance_id)}</div>
                  {here.length > 0 ? (
                    <div className={styles.tags}>
                      {here.map((e) => (
                        <Badge key={e.id} variant="neutral">
                          {e.exact_text}: {provenanceLabel(e)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {analysis.opt_out ? <p className={styles.muted}>Opt-out at {analysis.opt_out.turn_id} — the call must stop there.</p> : null}
      </Card>

      <Card title="Human corrections">
        <Stack gap={3}>
          <p className={styles.muted}>
            Correct a phrase&apos;s meaning. The original stays visible; corrections are retained for evaluation, not treated as permanent ground truth.
          </p>
          <Field id="correction-phrase" label="Phrase">
            {(control) => (
              <Select
                {...control}
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                options={analysis.events.map((e) => ({ value: e.id, label: `${e.exact_text} — ${provenanceLabel(e)}` }))}
              />
            )}
          </Field>
          {selected ? (
            <p className={styles.muted}>
              Current meaning: {selected.meaning ? `“${selected.meaning}”` : 'unknown (not explained by the prospect)'} · status {selected.meaning_status}
            </p>
          ) : null}
          <Field id="correction-text" label="Corrected meaning" help="In the prospect's terms. Leave blank to cancel.">
            {(control) => <textarea {...control} className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <div>
            <Button variant="primary" onClick={save} disabled={!hydrated}>
              Save correction
            </Button>
          </div>
          <p className={styles.muted} role="status" aria-live="polite">
            {status}
          </p>
          {corrections.length > 0 ? (
            <ul className={styles.corrections} data-corrections>
              {corrections.map((c, i) => {
                const ev = analysis.events.find((e) => e.id === c.event_id);
                return (
                  <li key={`${c.event_id}-${i}`} className={styles.correction}>
                    <div>
                      <strong>{ev?.exact_text ?? c.event_id}</strong> — corrected by rep on {formatDate(c.corrected_at)}
                    </div>
                    <div>Corrected meaning: {c.corrected_meaning}</div>
                    <div className={styles.original}>Original meaning: {c.original_meaning ?? 'unknown (not explained by the prospect)'}</div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.muted}>{hydrated ? 'No corrections yet.' : 'Reading local storage…'}</p>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
