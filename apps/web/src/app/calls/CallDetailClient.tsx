'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';
import type { ScriptNode, Transcript, VocabularyEvent } from '@apohenia/domain/schemas';
import { HumanCorrection } from '@apohenia/domain/schemas';
import { stageLabel } from '@apohenia/domain/scripts';
import { EMPTY_PIN_STATE, analyzeCall, callDurationSeconds, callOutcome, outcomeGlyph, postCallReview, provenanceLabel, resolvePins, rubricDefinition, type NodeLike } from '@apohenia/domain/vocabulary';
import { listenerFromTurns, toCards, visibleCards } from '@apohenia/domain/listener';
import { Avatar, Card, Chip, Icon, IconButton, LineCard, NotAssessedLabel, REF_MEANING_GLYPH, RefCard, Sheet, Tile, Toast, WordCard, useToast, type IconName, type WordReference } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { formatDuration, toKnownFacts, wordCorrection, wordProvenance } from './review-lib';
import { resolveBridge, splitRefLabel } from '../dial-lib';
import styles from './calls.module.css';

const Corrections = z.array(HumanCorrection);
const NO_CORRECTIONS: HumanCorrection[] = [];

export interface CallDetailClientProps {
  transcript: Transcript;
  /** Entry node for this record's entrypoint (null only if the script seed has no entry). */
  node: ScriptNode | null;
  /** The entry line with slots resolved from record facts, rendered verbatim, never re-flowed. */
  line: string;
  contact: string;
  company: string;
  nodesCovered: NodeLike[];
}

type SheetKind = { kind: 'info' } | { kind: 'word'; id: string } | { kind: 'ref'; id: string } | { kind: 'transcript' } | { kind: 'uncertain' } | { kind: 'corrections' } | { kind: 'status' };

/** Replay state, one row each: the whole truth of what this screen is (and is not). */
const REPLAY_STATUS_ROWS: readonly { id: 'call' | 'transcription' | 'recording' | 'coach'; icon: IconName; label: string; state: string; detail: string }[] = [
  { id: 'call', icon: 'phone', label: 'Call', state: 'Replay', detail: 'A synthetic transcript played back read-only. No phone line, no real call.' },
  { id: 'transcription', icon: 'chat', label: 'Transcription', state: 'Off', detail: 'Nothing was transcribed. The words are authored text, not a microphone.' },
  { id: 'recording', icon: 'record', label: 'Recording', state: 'Off', detail: 'Nothing is recorded or stored beyond the corrections you save in this browser.' },
  { id: 'coach', icon: 'spark', label: 'Coach', state: 'Off', detail: 'No model runs. The review is rule-based over the text alone.' },
];
const REPLAY_STATUS_NAME = 'Demo replay: a synthetic transcript, no real call was placed. Transcription off, recording off, coach off. Open replay status.';

/** Display form of a domain label (labels carry no dash separators; this only guards seed text). */
function plainLabel(label: string): string {
  return label.replace(/\s+[—–]\s+/g, ', ');
}

/** Review prose from the rule engine. Anything inside double quotes is a transcript quote and stays exactly as spoken. */
function plainReview(text: string): string {
  return text
    .split(/("[^"]*")/)
    .map((part) => (part.startsWith('"') ? part : part.replace(/\s+[—–]\s+/g, ': ')))
    .join('');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One plain clause for a card's meaning line: parentheticals dropped, the first clause before any dash, at most 8 words. */
function shortMeaning(line: string): string {
  const clause = line
    .replace(/\s*\([^)]*\)/g, '')
    .split(/\s+[—–-]\s+/)[0]!
    .replace(/[.;:,\s]+$/g, '')
    .trim();
  const words = clause.split(/\s+/).filter(Boolean);
  return words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : clause;
}

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
 * cards (Strength, Fix, Ask instead, Drill), the tone "not assessed" caption, a docked action bar
 * (transcript, corrections, uncertainties) and a corrections sheet whose entries persist locally
 * with the original meaning kept beside them.
 */
export function CallDetailClient({ transcript, node, line, contact, company, nodesCovered }: CallDetailClientProps) {
  const analysis = useMemo(() => analyzeCall(transcript.turns), [transcript]);
  const resolved = useMemo(() => resolvePins(EMPTY_PIN_STATE, analysis.ranked), [analysis.ranked]);
  const refCards = useMemo(() => visibleCards(toCards(listenerFromTurns(transcript.turns, { call_id: transcript.call_id }))), [transcript]);
  const review = useMemo(() => postCallReview(transcript, nodesCovered), [transcript, nodesCovered]);
  const rubric = rubricDefinition();
  const outcome = outcomeGlyph(callOutcome(analysis));
  const duration = formatDuration(callDurationSeconds(transcript.turns));
  // The bridge renders only when every slot resolves from what the prospect said (their word); otherwise nothing.
  const bridge = node ? resolveBridge(node.bridge_template, toKnownFacts(analysis.facts)) : null;

  const [corrections, setCorrections, hydrated] = useStoredState(`calls.corrections.${transcript.call_id}`, Corrections, NO_CORRECTIONS);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [text, setText] = useState('');
  const [toast, showToast] = useToast();

  const byId = useMemo(() => new Map(analysis.events.map((e) => [e.id, e] as const)), [analysis.events]);
  const selectedWord = sheet?.kind === 'word' ? (byId.get(sheet.id) ?? null) : null;
  const selectedRef = sheet?.kind === 'ref' ? (refCards.find((r) => r.id === sheet.id) ?? null) : null;
  const wordCorrections = selectedWord ? corrections.filter((c) => c.event_id === selectedWord.id) : [];
  /** The reference merged into the selected word's card, if any (one panel system). */
  const selectedWordRef = selectedWord ? (refCards.find((r) => splitRefLabel(r.label).title.trim().toLowerCase() === selectedWord.exact_text.trim().toLowerCase()) ?? null) : null;

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
    showToast(`Saved: ${selectedWord.exact_text}, original kept`, 'green');
  }

  // One panel system (addendum v3): a reference whose term is already a pinned word merges into that
  // word's card (meaning line + status mark) instead of appearing twice, once gold and once purple.
  const refByTerm = new Map(refCards.map((r) => [splitRefLabel(r.label).title.trim().toLowerCase(), r] as const));
  const merged = new Set<string>();
  const words = resolved.pinned.map((c) => {
    const r = refByTerm.get(c.event.exact_text.trim().toLowerCase()) ?? null;
    if (r) merged.add(r.id);
    const reference: WordReference | undefined = r
      ? { referenceId: r.id, meaning: shortMeaning(r.meaning_line), status: r.meaning_status, statusName: r.glyph_name, invalidated: r.state === 'invalidated', pinned: r.pinned, kept: r.kept_for_later }
      : undefined;
    return (
      <WordCard
        key={c.event.id}
        word={c.event.exact_text}
        provenance={wordProvenance(c.event)}
        provenanceName={provenanceLabel(c.event)}
        correction={wordCorrection(c.event)}
        provisional={c.event.stability === 'interim'}
        eventId={c.event.id}
        reference={reference}
        onPress={() => setSheet({ kind: 'word', id: c.event.id })}
      />
    );
  });
  const refs = refCards.filter((r) => !merged.has(r.id)).map((r) => (
    <RefCard
      key={r.id}
      label={r.label}
      meaning={shortMeaning(r.meaning_line)}
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

  const reviewCard = (key: string, label: string, icon: IconName, tone: 'green' | 'orange' | 'purple' | 'neutral', body: string, quote: string | null, href?: string) => (
    <Card tone={tone} data-review={key} href={href} name={href ? `${label}: ${body} Opens Train.` : undefined} dense={Boolean(href)}>
      <div className={styles.reviewHead}>
        <Chip static icon={icon} label={label} tone={tone === 'green' ? 'green' : tone === 'orange' ? 'red' : tone === 'purple' ? 'purple' : 'teal'} />
      </div>
      <p className={styles.reviewText}>{body}</p>
      {quote ? (
        <q className={styles.reviewQuote} data-review-quote>
          {quote}
        </q>
      ) : null}
    </Card>
  );

  return (
    <div className={styles.replay} data-stage-wide data-call-review data-call-id={transcript.call_id} data-hydrated={hydrated ? 'true' : 'false'}>
      {/* header: same shape as in-call, one status chip instead of state dots */}
      <div className={styles.callHead} data-topbar>
        <IconButton icon="arrow-left" label="Back to History" href="/calls" />
        <button type="button" className={styles.status} onClick={() => setSheet({ kind: 'status' })} aria-label={REPLAY_STATUS_NAME} title={REPLAY_STATUS_NAME} data-call-status data-demo-pill>
          <Icon name="circle-half" size={14} weight="fill" />
          <span className={styles.statusWord} aria-hidden="true">
            Replay
          </span>
        </button>
        <Avatar name={contact} size={40} />
        <div className={styles.callWho}>
          <span className={styles.callName}>{contact}</span>
          <span className={styles.callCompany}>{company}</span>
        </div>
        <span className={styles.callTimer} aria-label={`Call length ${duration}`}>
          {duration}
        </span>
      </div>

      {/* narrow: words strip above the line */}
      <div className={styles.strip} data-words-strip aria-label="Their words and references">
        {words.length + refs.length === 0 ? (
          <span className={styles.stripEmpty} aria-hidden="true">
            None yet
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
              bridge={bridge ?? undefined}
              onInfo={() => setSheet({ kind: 'info' })}
              nodeId={node.id}
              locked
              meta={<Chip static icon="play" label="replay" name="Read-only replay: the line does not advance" tone="neutral" />}
            />
          ) : null}

          {/* outcome + tone */}
          <div className={styles.outcomeRow} data-review-outcome>
            <Chip static icon={outcome.glyph === '✓' ? 'check' : outcome.glyph === '⊘' ? 'ban' : outcome.glyph === '◔' ? 'hourglass' : 'circle'} label={outcome.word} name={outcome.name} tone={outcome.glyph === '✓' ? 'green' : outcome.glyph === '⊘' ? 'red' : outcome.glyph === '◔' ? 'teal' : 'neutral'} />
            <NotAssessedLabel label="Tone: Not assessed" name="Tone not assessed (text-only)" data-review-tone />
          </div>

          {/* the review block: four cards */}
          <div className={styles.reviewGrid} data-review-block>
            {reviewCard('strength', 'Strength', 'star', 'green', plainReview(review.strength.text), quoteFor(review.strength.quote_turn_id))}
            {reviewCard('fix', 'Fix', 'warning', 'orange', plainReview(review.correction.text), quoteFor(review.correction.quote_turn_id))}
            {reviewCard('ask', 'Ask instead', 'question', 'purple', plainReview(review.better_question), null)}
            {reviewCard('drill', 'Drill', 'target', 'neutral', plainReview(review.drill), null, '/practice')}
          </div>
        </div>

        {/* wide: rail */}
        <aside className={styles.rail} aria-label="Their words and references">
          <div className={styles.railHead}>
            <Chip static label="Their words" tone="gold" />
          </div>
          <div className={styles.railList} data-words-rail>
            {words.length === 0 ? (
              <span className={styles.railEmpty} aria-hidden="true">
                None yet
              </span>
            ) : (
              words
            )}
          </div>
          <div className={styles.railHead}>
            <Chip static label="Their references" tone="purple" />
          </div>
          <div className={styles.railList} data-refs-rail>
            {refs.length === 0 ? (
              <span className={styles.railEmpty} aria-hidden="true">
                None yet
              </span>
            ) : (
              refs
            )}
          </div>
        </aside>
      </div>

      {/* docked action bar: the review's tools live here, never floating over card text */}
      <div className={styles.reviewBar} data-review-bar>
        <div className={styles.reviewBarInner} role="group" aria-label="Review tools">
          <Tile icon="list" label="Transcript" onClick={() => setSheet({ kind: 'transcript' })} data-transcript-button />
          <Tile icon="bookmark" label="Corrections" name={`Corrections (${corrections.length})`} onClick={() => setSheet({ kind: 'corrections' })} data-corrections-button>
            {corrections.length > 0 ? <span className={styles.barCount}>{corrections.length}</span> : null}
          </Tile>
          <Tile icon="info" label="Uncertain" name="Uncertainties and rubric" onClick={() => setSheet({ kind: 'uncertain' })} data-uncertainties />
        </div>
      </div>

      {/* ---- sheets ---- */}
      <Sheet open={sheet?.kind === 'status'} onClose={() => setSheet(null)} title="Replay status" data-sheet="status">
        <div className={styles.statusRows} role="list">
          {REPLAY_STATUS_ROWS.map((r) => (
            <div key={r.id} className={[styles.statusRow, r.id === 'call' ? styles.statusOn : ''].join(' ').trim()} role="listitem" data-status-row={r.id} data-status-on={r.id === 'call' ? 'true' : 'false'}>
              <Icon name={r.icon} size={24} className={styles.statusIcon} />
              <span className={styles.statusLabel}>{r.label}</span>
              <span className={styles.statusState}>{r.state}</span>
              <span className={styles.statusDetail}>{r.detail}</span>
            </div>
          ))}
        </div>
      </Sheet>
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
              {selectedWordRef
                ? `${selectedWordRef.state === 'invalidated' ? 'Invalidated' : capitalize(selectedWordRef.meaning_status)}; meaning ${selectedWord.meaning ? `given: ${selectedWord.meaning}` : 'not explained by the prospect'}`
                : selectedWord.meaning
                  ? `means: ${selectedWord.meaning}`
                  : 'meaning unknown: not explained by the prospect'}
            </p>
            {selectedWord.correction_or_negation ? (
              <p className={styles.detailLine}>
                not <s>{selectedWord.correction_or_negation.rejects}</s>
              </p>
            ) : null}
            {selectedWord.cue ? <p className={styles.detailCue}>{plainReview(selectedWord.cue)}</p> : null}
            {selectedWordRef ? (
              <div className={styles.mergedRef} data-word-reference={selectedWordRef.id}>
                <div className={styles.detailChips}>
                  <Chip static icon="diamond" label="Reference" tone="purple" name={`This word is also a reference the listener tracks. ${selectedWordRef.glyph_name}`} />
                </div>
                <p className={styles.detailLine}>{plainLabel(selectedWordRef.represents)}</p>
                <div className={styles.detailActions}>
                  <Chip label="Open reference" icon="arrow-right" onClick={() => setSheet({ kind: 'ref', id: selectedWordRef.id })} data-open-reference />
                </div>
              </div>
            ) : null}

            <div className={styles.correctionForm}>
              <Chip static icon="edit" label="Correct meaning" name="Correct this phrase's meaning in the prospect's terms. The original stays visible" tone="teal" />
              <textarea className={styles.textarea} aria-label="Corrected meaning" placeholder="In their terms…" value={text} onChange={(e) => setText(e.target.value)} rows={3} data-correction-text />
              <div className={styles.detailActions}>
                <Chip label="Save" icon="check" tone="blue" selected disabled={!hydrated || text.trim().length === 0} onClick={save} data-correction-save />
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
              <Chip static icon="circle" label={selectedRef.origin_label.split(/\s[—–-]\s|:/)[0] ?? selectedRef.origin_label} name={selectedRef.origin_label} />
            </div>
            <q className={styles.detailQuote}>{selectedRef.evidence.quote}</q>
            <p className={styles.detailLine}>{plainLabel(selectedRef.represents)}</p>
            {selectedRef.useful_when ? <p className={styles.detailLine}>later: {plainLabel(selectedRef.useful_when).replace(/_/g, ' ')}</p> : null}
            {selectedRef.prohibited_inferences.length > 0 ? (
              <details className={styles.useRight} data-ref-use-right>
                <summary className={styles.useRightSummary}>
                  <Icon name="shield" size={18} weight="fill" className={styles.useRightIcon} />
                  Use it right
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
          <p className={styles.infoBig}>{plainReview(review.next_step_or_outcome)}</p>
          <ul className={styles.infoList} data-uncertainty-list>
            {review.uncertainties.map((u) => (
              <li key={u}>{plainReview(u)}</li>
            ))}
          </ul>
          <div className={styles.infoRow}>
            <Chip static icon="hourglass" label="Rubric" name={`${plainLabel(rubric.label)}; ${rubric.notes.join(' ')}`} tone="teal" />
            <div className={styles.rubricChips}>
              {rubric.criteria.map((c) => (
                <Chip key={c.key} static glyph={String(c.weight)} label={c.label} name={`${c.label}, weight ${c.weight}: ${c.description}`} />
              ))}
            </div>
            <p className={styles.detailCue}>Not scored: {plainLabel(rubric.label)}.</p>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet?.kind === 'corrections'} onClose={() => setSheet(null)} title="Corrections" data-sheet="corrections">
        <div className={styles.detail}>
          {corrections.length === 0 ? (
            <span className={styles.railEmpty} role="status" aria-label="No corrections yet">
              None yet
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
                <Icon name="circle" size={10} weight={t.speaker_role === 'prospect' ? 'fill' : 'regular'} />
              </span>
              <span className="sr-only">{t.speaker_role === 'prospect' ? 'Prospect' : 'You'}:</span>
              <span className={styles.turnText}>{tagPhrases(t.text, analysis.events, t.utterance_id)}</span>
              {!t.is_final ? <span className={styles.turnInterim}>provisional</span> : null}
              {t.revision > 0 ? <span className={styles.turnInterim}>rev {t.revision}</span> : null}
            </li>
          ))}
        </ol>
        {analysis.opt_out ? (
          <p className={styles.detailCue} data-opt-out-note>
            <Icon name="ban" size={14} weight="bold" /> Opt-out recorded. The call stops there.
          </p>
        ) : null}
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}
