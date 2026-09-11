'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';
import type { ScriptNode, Transcript, VocabularyEvent } from '@apohenia/domain/schemas';
import { HumanCorrection } from '@apohenia/domain/schemas';
import { stageLabel } from '@apohenia/domain/scripts';
import { EMPTY_PIN_STATE, analyzeCall, callDurationSeconds, callOutcome, outcomeGlyph, postCallReview, provenanceLabel, resolvePins, rubricDefinition, type NodeLike } from '@apohenia/domain/vocabulary';
import { listenerFromTurns, toCards, visibleCards } from '@apohenia/domain/listener';
import { Avatar, Card, Chip, DemoPill, IconButton, LineCard, NotAssessedGlyph, REF_MEANING_GLYPH, RefCard, Sheet, Toast, WordCard, useToast } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { bridgeParts } from '@/lib/line-parts';
import { formatDuration, wordCorrection, wordProvenance } from './review-lib';
import { splitRefLabel } from '../dial-lib';
import styles from './calls.module.css';

const Corrections = z.array(HumanCorrection);
const NO_CORRECTIONS: HumanCorrection[] = [];

export interface CallDetailClientProps {
  transcript: Transcript;
  /** Entry node for this record's entrypoint (null only if the script seed has no entry). */
  node: ScriptNode | null;
  /** The entry line with slots resolved from record facts — rendered verbatim, never re-flowed. */
  line: string;
  contact: string;
  company: string;
  nodesCovered: NodeLike[];
}

type SheetKind = { kind: 'info' } | { kind: 'word'; id: string } | { kind: 'ref'; id: string } | { kind: 'transcript' } | { kind: 'uncertain' } | { kind: 'corrections' };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
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
      <mark key={e.id} className={styles.phrase} title={provenanceLabel(e)}>
        {text.slice(e.span.start, e.span.end)}
      </mark>,
    );
    pos = e.span.end;
  }
  out.push(text.slice(pos));
  return out;
}

/**
 * Read-only replay of the in-call screen (§3.2 layout, nothing advances) + the review block as four
 * cards (Strength · Fix · Ask instead · Drill), the `—` tone glyph, and a corrections sheet whose
 * entries persist locally with the original meaning kept beside them.
 */
export function CallDetailClient({ transcript, node, line, contact, company, nodesCovered }: CallDetailClientProps) {
  const analysis = useMemo(() => analyzeCall(transcript.turns), [transcript]);
  const resolved = useMemo(() => resolvePins(EMPTY_PIN_STATE, analysis.ranked), [analysis.ranked]);
  const refCards = useMemo(() => visibleCards(toCards(listenerFromTurns(transcript.turns, { call_id: transcript.call_id }))), [transcript]);
  const review = useMemo(() => postCallReview(transcript, nodesCovered), [transcript, nodesCovered]);
  const rubric = rubricDefinition();
  const outcome = outcomeGlyph(callOutcome(analysis));
  const duration = formatDuration(callDurationSeconds(transcript.turns));

  const [corrections, setCorrections, hydrated] = useStoredState(`calls.corrections.${transcript.call_id}`, Corrections, NO_CORRECTIONS);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [text, setText] = useState('');
  const [toast, showToast] = useToast();

  const byId = useMemo(() => new Map(analysis.events.map((e) => [e.id, e] as const)), [analysis.events]);
  const selectedWord = sheet?.kind === 'word' ? (byId.get(sheet.id) ?? null) : null;
  const selectedRef = sheet?.kind === 'ref' ? (refCards.find((r) => r.id === sheet.id) ?? null) : null;
  const wordCorrections = selectedWord ? corrections.filter((c) => c.event_id === selectedWord.id) : [];

  function save() {
    if (!selectedWord || text.trim().length === 0) return;
    const entry: HumanCorrection = {
      event_id: selectedWord.id,
      original_meaning: selectedWord.meaning ?? null,
      corrected_meaning: text.trim(),
      corrected_at: new Date().toISOString(),
      corrected_by: 'rep',
    };
    setCorrections((prev) => [...prev, entry]);
    setText('');
    showToast(`Saved · ${selectedWord.exact_text} · original kept`, 'green');
  }

  const stateDots = [
    { id: 'call', name: 'Call: replay of a synthetic transcript — no phone line' },
    { id: 'transcribe', name: 'Transcription: none — authored text, no microphone' },
    { id: 'coach', name: 'Coach: off — no model; the review is rule-based' },
  ];

  const words = resolved.pinned.map((c) => (
    <WordCard
      key={c.event.id}
      word={c.event.exact_text}
      provenance={wordProvenance(c.event)}
      provenanceName={provenanceLabel(c.event)}
      correction={wordCorrection(c.event)}
      provisional={c.event.stability === 'interim'}
      eventId={c.event.id}
      onPress={() => setSheet({ kind: 'word', id: c.event.id })}
    />
  ));
  const refs = refCards.map((r) => (
    <RefCard
      key={r.id}
      label={r.label}
      meaning={r.meaning_line}
      status={r.meaning_status}
      statusName={r.glyph_name}
      invalidated={r.state === 'invalidated'}
      muted={r.state === 'dismissed' || r.state === 'rejected'}
      pinned={r.pinned}
      kept={r.kept_for_later}
      referenceId={r.id}
      onPress={() => setSheet({ kind: 'ref', id: r.id })}
    />
  ));

  const quoteFor = (turnId: string | null): string | null => {
    if (!turnId) return null;
    return analysis.turns.find((t) => t.utterance_id === turnId)?.text ?? null;
  };

  const reviewCard = (key: string, label: string, glyph: string, tone: 'green' | 'orange' | 'purple' | 'neutral', body: string, quote: string | null, href?: string) => (
    <Card tone={tone} data-review={key} href={href} name={href ? `${label}: ${body} — open Train` : undefined} dense={Boolean(href)}>
      <div className={styles.reviewHead}>
        <Chip static glyph={glyph} label={label} tone={tone === 'green' ? 'green' : tone === 'orange' ? 'red' : tone === 'purple' ? 'purple' : 'teal'} />
      </div>
      <p className={styles.reviewText}>{body}</p>
      {quote ? <q className={styles.reviewQuote}>{quote}</q> : null}
    </Card>
  );

  return (
    <div className={styles.replay} data-stage-wide data-call-review data-call-id={transcript.call_id} data-hydrated={hydrated ? 'true' : 'false'}>
      {/* header — same shape as in-call */}
      <div className={styles.callHead} data-topbar>
        <DemoPill compact />
        <IconButton icon="arrow-left" label="Back to History" href="/calls" />
        <Avatar name={contact} size={40} />
        <div className={styles.callWho}>
          <span className={styles.callName}>{contact}</span>
          <span className={styles.callCompany}>{company}</span>
        </div>
        <span className={styles.callTimer} aria-label={`Call length ${duration}`}>
          {duration}
        </span>
        <span className={styles.dots} role="group" aria-label="Replay state">
          {stateDots.map((d) => (
            <span key={d.id} className={[styles.dot, styles.dotOff].join(' ')} role="img" aria-label={d.name} title={d.name} data-state-dot={d.id} />
          ))}
        </span>
      </div>

      {/* narrow: words strip above the line */}
      <div className={styles.strip} data-words-strip aria-label="Their words and references">
        {words.length + refs.length === 0 ? (
          <span className={styles.stripEmpty} aria-hidden="true">
            ◌
          </span>
        ) : null}
        {words}
        {refs}
      </div>

      <div className={styles.columns}>
        <div className={styles.lineCol}>
          {node ? (
            <LineCard
              stage={stageLabel(node.stage)}
              line={line}
              shape={bridgeParts(node.bridge_template)}
              onInfo={() => setSheet({ kind: 'info' })}
              nodeId={node.id}
              locked
              meta={<Chip static glyph="▶" label="replay" name="Read-only replay — the line does not advance" tone="neutral" />}
            />
          ) : null}

          {/* outcome + tone + ⓘ */}
          <div className={styles.outcomeRow} data-review-outcome>
            <Chip static glyph={outcome.glyph} label={outcome.word} name={outcome.name} tone={outcome.glyph === '✓' ? 'green' : outcome.glyph === '⊘' ? 'red' : outcome.glyph === '◔' ? 'teal' : 'neutral'} />
            <NotAssessedGlyph name="Tone not assessed (text-only)" data-review-tone />
            <span className={styles.outcomeTools}>
              <IconButton icon="list" label="Transcript" onClick={() => setSheet({ kind: 'transcript' })} data-transcript-button />
              <IconButton icon="bookmark" label={`Corrections (${corrections.length})`} onClick={() => setSheet({ kind: 'corrections' })} data-corrections-button />
              <IconButton icon="info" label="Uncertainties and rubric" onClick={() => setSheet({ kind: 'uncertain' })} data-uncertainties />
            </span>
          </div>

          {/* the review block: four cards */}
          <div className={styles.reviewGrid} data-review-block>
            {reviewCard('strength', 'Strength', '◆', 'green', review.strength.text, quoteFor(review.strength.quote_turn_id))}
            {reviewCard('fix', 'Fix', '△', 'orange', review.correction.text, quoteFor(review.correction.quote_turn_id))}
            {reviewCard('ask', 'Ask instead', '?', 'purple', review.better_question, null)}
            {reviewCard('drill', 'Drill', '◎', 'neutral', review.drill, null, '/practice')}
          </div>
        </div>

        {/* wide: rail */}
        <aside className={styles.rail} aria-label="Their words and references">
          <div className={styles.railHead}>
            <Chip static label="Their words" tone="gold" />
          </div>
          <div className={styles.railList} data-words-rail>
            {words.length === 0 ? <span className={styles.railEmpty} aria-hidden="true">◌</span> : words}
          </div>
          <div className={styles.railHead}>
            <Chip static label="Their refs" tone="purple" />
          </div>
          <div className={styles.railList} data-refs-rail>
            {refs.length === 0 ? <span className={styles.railEmpty} aria-hidden="true">◌</span> : refs}
          </div>
        </aside>
      </div>

      {/* ---- sheets ---- */}
      <Sheet open={sheet?.kind === 'info'} onClose={() => setSheet(null)} title="Why now" data-sheet="info">
        {node ? (
          <div className={styles.info}>
            <p className={styles.infoBig}>{node.why_this_now}</p>
            <div className={styles.infoRow}>
              <Chip static label="Listen for" />
              <p>{node.what_to_listen_for}</p>
            </div>
            {node.mirror_variants.length > 0 ? (
              <div className={styles.infoRow}>
                <Chip static label="Mirrors" tone="teal" />
                <ul className={styles.infoList}>
                  {node.mirror_variants.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className={styles.infoRow}>
              <Chip static label="Tone" />
              <p>{node.delivery_overlay.tone_cue}</p>
            </div>
            <div className={styles.infoRow}>
              <Chip static label="Done when" />
              <p>{node.completion_criteria}</p>
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={selectedWord !== null} onClose={() => setSheet(null)} title="Their word" data-sheet="word">
        {selectedWord ? (
          <div className={styles.detail}>
            <span className={styles.detailWord}>{selectedWord.exact_text}</span>
            <p className={styles.detailLine}>{provenanceLabel(selectedWord)}</p>
            <p className={styles.detailLine} data-word-meaning>
              {selectedWord.meaning ? `means: ${selectedWord.meaning}` : 'meaning unknown — not explained by the prospect'}
            </p>
            {selectedWord.correction_or_negation ? (
              <p className={styles.detailLine}>
                not <s>{selectedWord.correction_or_negation.rejects}</s>
              </p>
            ) : null}
            {selectedWord.cue ? <p className={styles.detailCue}>{selectedWord.cue}</p> : null}

            <div className={styles.correctionForm}>
              <Chip static glyph="✎" label="Correct meaning" name="Correct this phrase's meaning in the prospect's terms — the original stays visible" tone="teal" />
              <textarea className={styles.textarea} aria-label="Corrected meaning" placeholder="In their terms…" value={text} onChange={(e) => setText(e.target.value)} rows={3} data-correction-text />
              <div className={styles.detailActions}>
                <Chip label="Save" glyph="✓" tone="blue" selected disabled={!hydrated || text.trim().length === 0} onClick={save} data-correction-save />
              </div>
            </div>

            {wordCorrections.length > 0 ? (
              <ul className={styles.correctionList} data-word-corrections>
                {wordCorrections.map((c, i) => (
                  <li key={`${c.event_id}-${i}`} className={styles.correction}>
                    <span className={styles.correctionText}>{c.corrected_meaning}</span>
                    <span className={styles.correctionOriginal}>was: {c.original_meaning ?? 'unknown'}</span>
                    <span className={styles.correctionMeta}>rep · {formatDate(c.corrected_at)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet open={selectedRef !== null} onClose={() => setSheet(null)} title="Their reference" data-sheet="ref">
        {selectedRef ? (
          <div className={styles.detail}>
            <span className={styles.detailRef} data-ref-title>
              {splitRefLabel(selectedRef.label).title}
            </span>
            <div className={styles.detailChips}>
              {splitRefLabel(selectedRef.label).aside ? (
                <span className={styles.detailAside} data-ref-aside>
                  not <s>{splitRefLabel(selectedRef.label).aside!.replace(/^not\s+/i, '')}</s>
                </span>
              ) : null}
              <Chip static glyph={selectedRef.state === 'invalidated' ? '⊘' : REF_MEANING_GLYPH[selectedRef.meaning_status]} label={selectedRef.state === 'invalidated' ? 'invalidated' : selectedRef.meaning_status} tone="purple" name={selectedRef.glyph_name} data-ref-status />
              <Chip static glyph="○" label={selectedRef.origin_label.split(/\s[—–-]\s|:/)[0] ?? selectedRef.origin_label} name={selectedRef.origin_label} />
            </div>
            <q className={styles.detailQuote}>{selectedRef.evidence.quote}</q>
            <p className={styles.detailLine}>{selectedRef.represents}</p>
            {selectedRef.useful_when ? <p className={styles.detailLine}>later: {selectedRef.useful_when}</p> : null}
            {selectedRef.prohibited_inferences.length > 0 ? (
              <details className={styles.useRight} data-ref-use-right>
                <summary className={styles.useRightSummary}>
                  <span aria-hidden="true">◆ </span>Use it right
                </summary>
                <ul className={styles.infoList} data-ref-prohibited>
                  {selectedRef.prohibited_inferences.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            {selectedRef.state_line ? <p className={styles.detailCue}>{selectedRef.state_line}</p> : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet open={sheet?.kind === 'uncertain'} onClose={() => setSheet(null)} title="Uncertain" data-sheet="uncertainties">
        <div className={styles.info}>
          <p className={styles.infoBig}>{review.next_step_or_outcome}</p>
          <ul className={styles.infoList} data-uncertainty-list>
            {review.uncertainties.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <div className={styles.infoRow}>
            <Chip static glyph="◔" label="Rubric" name={`${rubric.label}; ${rubric.notes.join(' ')}`} tone="teal" />
            <div className={styles.rubricChips}>
              {rubric.criteria.map((c) => (
                <Chip key={c.key} static glyph={String(c.weight)} label={c.label} name={`${c.label}, weight ${c.weight}: ${c.description}`} />
              ))}
            </div>
            <p className={styles.detailCue}>Not scored — {rubric.label}.</p>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet?.kind === 'corrections'} onClose={() => setSheet(null)} title="Corrections" data-sheet="corrections">
        <div className={styles.detail}>
          {corrections.length === 0 ? (
            <span className={styles.railEmpty} aria-label="No corrections yet">
              ∅
            </span>
          ) : (
            <ul className={styles.correctionList} data-corrections>
              {corrections.map((c, i) => {
                const ev = byId.get(c.event_id);
                return (
                  <li key={`${c.event_id}-${i}`} className={styles.correction}>
                    <span className={styles.correctionWord}>{ev?.exact_text ?? c.event_id}</span>
                    <span className={styles.correctionText}>{c.corrected_meaning}</span>
                    <span className={styles.correctionOriginal}>was: {c.original_meaning ?? 'unknown'}</span>
                    <span className={styles.correctionMeta}>rep · {formatDate(c.corrected_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet?.kind === 'transcript'} onClose={() => setSheet(null)} title="Transcript" tall data-sheet="transcript">
        <ol className={styles.transcript} aria-label="Synthetic transcript">
          {analysis.turns.map((t) => (
            <li key={`${t.utterance_id}-${t.revision}`} className={[styles.turn, t.speaker_role === 'prospect' ? styles.turnProspect : styles.turnRep].join(' ')}>
              <span className={styles.turnWho} aria-hidden="true">
                {t.speaker_role === 'prospect' ? '●' : '○'}
              </span>
              <span className="sr-only">{t.speaker_role === 'prospect' ? 'Prospect' : 'You'}:</span>
              <span className={styles.turnText}>{tagPhrases(t.text, analysis.events, t.utterance_id)}</span>
              {!t.is_final ? <span className={styles.turnInterim}>provisional</span> : null}
              {t.revision > 0 ? <span className={styles.turnInterim}>rev {t.revision}</span> : null}
            </li>
          ))}
        </ol>
        {analysis.opt_out ? <p className={styles.detailCue}>⊘ opt-out at {analysis.opt_out.turn_id} — the call stops there.</p> : null}
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}
