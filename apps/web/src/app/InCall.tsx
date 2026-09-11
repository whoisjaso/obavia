'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import type { Attempt, ListenerAction, QueueItem, ScriptNode, ScriptVersion, Transcript, TranscriptTurn } from '@apohenia/domain/schemas';
import { loadVersionGraph, stageLabel } from '@apohenia/domain/scripts';
import { analyzeCall, pinPhrase, resolvePins, unpinPhrase } from '@apohenia/domain/vocabulary';
import { formatClock, knownFactsFor, nextScriptNodeHint } from '@apohenia/domain/dialer';
import { Avatar, Card, Chip, IconButton, LineCard, RefCard, Sheet, Tile, TileGrid, WordCard } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import {
  EMPTY_IN_CALL,
  InCallState,
  bridgeShape,
  candidateById,
  decideOverlay,
  defaultNextNodeId,
  listenerOver,
  refMeaningLine,
  refMeaningName,
  refMeaningStatus,
  referencesForRail,
  resolveLine,
  toKnownFacts,
  wordCorrection,
  wordProvenance,
  wordProvenanceName,
} from './dial-lib';
import styles from './dial.module.css';

export interface InCallProps {
  item: QueueItem;
  attempt: Attempt;
  transcript: Transcript | null;
  /** Raw provider events that have arrived so far (arrival order). */
  played: TranscriptTurn[];
  talkMs: number;
  nodes: ScriptNode[];
  versions: ScriptVersion[];
  /** Wrap-up: the outcome sheet is up; the call view stays underneath, dimmed. */
  dimmed?: boolean;
  onEnd: () => void;
  onNotify: (text: string, tone?: 'neutral' | 'red' | 'green') => void;
}

type SheetKind = { kind: 'info' } | { kind: 'more' } | { kind: 'word'; id: string } | { kind: 'ref'; id: string } | { kind: 'transcript' };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** A rep/UI listener action before it is stamped with the event version. */
type CardAction = DistributiveOmit<ListenerAction, 'event_version'>;

const MAX_CHIPS = 4;

/**
 * In-call (DESIGN_SYSTEM §3.2): header, the script LineCard (never re-flows), branch chips,
 * THEIR WORDS (vocabulary pipeline) and THEIR REFERENCES (listener) rails, one optional suggestion
 * overlay that never auto-applies, the red End control, and a swipe-up transcript sheet.
 */
export function InCall({ item, attempt, transcript, played, talkMs, nodes, versions, dimmed, onEnd, onNotify }: InCallProps) {
  const graph = useMemo(() => (versions[0] ? loadVersionGraph(versions[0], nodes) : null), [versions, nodes]);
  const entryNodeId = versions[0]?.entry_node_ids[item.entrypoint] ?? versions[0]?.entry_node_ids['cold'] ?? nodes[0]?.id ?? null;
  const recordFacts = useMemo(() => knownFactsFor(item), [item]);

  const [stored, setStored] = useStoredState('dial.incall', InCallState, EMPTY_IN_CALL);
  const fresh = useMemo<InCallState>(() => {
    const entry = entryNodeId ? (graph?.byId.get(entryNodeId) ?? nodes.find((n) => n.id === entryNodeId) ?? null) : null;
    return { ...EMPTY_IN_CALL, attempt_id: attempt.id, node_id: entry?.id ?? null, line_text: entry ? resolveLine(entry, recordFacts) : '' };
  }, [attempt.id, entryNodeId, graph, nodes, recordFacts]);
  const st = stored.attempt_id === attempt.id ? stored : fresh;
  const update = useCallback(
    (patch: Partial<InCallState> | ((prev: InCallState) => Partial<InCallState>)) => {
      setStored((prev) => {
        const base = prev.attempt_id === attempt.id ? prev : fresh;
        const p = typeof patch === 'function' ? patch(base) : patch;
        return { ...base, ...p };
      });
    },
    [setStored, attempt.id, fresh],
  );

  // ---- pipelines over the played turns ----
  const analysis = useMemo(() => analyzeCall(played, { clarified: st.clarified }), [played, st.clarified]);
  const resolved = useMemo(() => resolvePins(st.pins, analysis.ranked), [st.pins, analysis.ranked]);
  const listener = useMemo(() => listenerOver(played, transcript?.call_id ?? attempt.id, st.ref_actions), [played, transcript?.call_id, attempt.id, st.ref_actions]);
  const facts = useMemo(() => ({ ...recordFacts, ...toKnownFacts(analysis.facts) }), [recordFacts, analysis.facts]);
  const byId = useMemo(() => candidateById(analysis.ranked), [analysis.ranked]);

  // Persist stable pin slots as turns arrive (slots never reshuffle; the resolved order is the truth).
  const orderKey = resolved.state.order.join('|');
  const storedOrderKey = st.pins.order.join('|');
  useEffect(() => {
    if (orderKey === storedOrderKey) return;
    update({ pins: resolved.state });
  }, [orderKey, storedOrderKey, resolved.state, update]);

  // ---- script ----
  const node = st.node_id ? (graph?.byId.get(st.node_id) ?? nodes.find((n) => n.id === st.node_id) ?? null) : null;
  const lastProspect = useMemo(() => [...listener.normalized.turns].reverse().find((t) => t.speaker_role === 'prospect' && t.is_final) ?? null, [listener.normalized.turns]);
  const hint = useMemo(() => (node ? nextScriptNodeHint(node, lastProspect?.text ?? null) : null), [node, lastProspect]);

  const goTo = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) {
        onNotify('End of script — hand back');
        return;
      }
      const target = graph?.byId.get(nodeId) ?? nodes.find((n) => n.id === nodeId);
      if (!target) return;
      update((prev) => ({ node_id: target.id, history: prev.node_id ? [...prev.history, prev.node_id] : prev.history, line_text: resolveLine(target, facts), overlay: null }));
    },
    [graph, nodes, facts, update, onNotify],
  );
  const goBack = useCallback(() => {
    const prevId = st.history[st.history.length - 1];
    if (!prevId) return;
    const target = graph?.byId.get(prevId) ?? nodes.find((n) => n.id === prevId);
    if (!target) return;
    update((prev) => ({ node_id: target.id, history: prev.history.slice(0, -1), line_text: resolveLine(target, facts), overlay: null }));
  }, [st.history, graph, nodes, facts, update]);
  const next = useCallback(() => goTo(node ? defaultNextNodeId(node) : null), [goTo, node]);

  // ---- suggestion overlay (at most one; never auto-applied) ----
  const decision = useMemo(
    () => decideOverlay({ references: listener.references, normalizedTurns: listener.normalized.turns, node, eventVersion: listener.event_version, lastUsedReferenceId: st.last_used_ref, notNow: st.not_now, overlay: st.overlay }),
    [listener, node, st.last_used_ref, st.not_now, st.overlay],
  );
  const suggestion = decision.suggestion;
  const suggestedRef = suggestion ? (listener.references.find((r) => r.id === suggestion.reference_id) ?? null) : null;

  function refAction(action: CardAction) {
    update((prev) => ({ ref_actions: [...prev.ref_actions, { ...action, event_version: listener.event_version } as ListenerAction] }));
  }
  function useSuggestion() {
    if (!suggestion || !lastProspect) return;
    refAction({ type: 'use', reference_id: suggestion.reference_id, turn_id: lastProspect.utterance_id });
    update({ last_used_ref: suggestion.reference_id, overlay: null });
    onNotify(`Used · ${suggestedRef?.label ?? 'reference'}`);
  }
  function notNow() {
    if (!suggestion) return;
    update((prev) => ({ not_now: [...prev.not_now, { reference_id: suggestion.reference_id, event_version: listener.event_version }], overlay: null }));
  }
  function never() {
    if (!suggestion || !lastProspect) return;
    refAction({ type: 'reaction', reference_id: suggestion.reference_id, turn_id: lastProspect.utterance_id, reaction: 'rejected' });
    update({ overlay: null });
  }

  // ---- pins ----
  const pinnedIds = new Set(resolved.state.order);
  function togglePin(eventId: string) {
    const cand = byId.get(eventId);
    if (pinnedIds.has(eventId)) {
      update({ pins: unpinPhrase(resolved.state, eventId).state });
      onNotify(`Unpinned · ${cand?.event.exact_text ?? ''}`);
      return;
    }
    const r = pinPhrase(resolved.state, eventId);
    update({ pins: r.state });
    onNotify(r.ok ? `Pinned · ${cand?.event.exact_text ?? ''}` : (r.reason ?? 'Not pinned'));
  }

  // ---- sheets ----
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const touchY = useRef<number | null>(null);

  // ---- live region: connection + new pins ----
  const [liveText, setLiveText] = useState(`Connected to ${item.contact}, ${item.company}. Simulated call.`);
  const prevPinned = useRef<string[]>([]);
  useEffect(() => {
    const added = resolved.state.order.filter((id) => !prevPinned.current.includes(id));
    prevPinned.current = resolved.state.order;
    if (added.length === 0) return;
    const words = added.map((id) => byId.get(id)?.event.exact_text).filter(Boolean).join(', ');
    if (words) setLiveText(`Pinned: ${words}`);
  }, [resolved.state.order, byId]);

  // ---- keyboard map (§3.2) ----
  useEffect(() => {
    if (dimmed) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (document.querySelector('dialog[open]')) return;
      const key = e.key;
      const focusedWord = target?.closest<HTMLElement>('[data-word-card]');
      const focusedRef = target?.closest<HTMLElement>('[data-ref-card]');
      if (key === ' ' || key === 'ArrowRight') {
        if (target?.closest('button') && key === ' ' && !target.closest('[data-line-next]')) return; // let Space press the focused control
        e.preventDefault();
        next();
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (/^[1-9]$/.test(key) && node) {
        const b = node.branches[Number(key) - 1];
        if (b) {
          e.preventDefault();
          goTo(b.next_node_id);
        }
      } else if (key === 'w' || key === 'W') {
        e.preventDefault();
        railRef.current?.querySelector<HTMLElement>('[data-word-card], [data-ref-card]')?.focus();
      } else if ((key === 'p' || key === 'P') && focusedWord?.dataset['eventId']) {
        e.preventDefault();
        togglePin(focusedWord.dataset['eventId']);
      } else if ((key === 'p' || key === 'P') && focusedRef?.dataset['refId']) {
        e.preventDefault();
        const r = listener.references.find((x) => x.id === focusedRef.dataset['refId']);
        if (r) refAction({ type: r.lifecycle.state === 'pinned' ? 'unpin' : 'pin', reference_id: r.id });
      } else if ((key === 'k' || key === 'K') && focusedRef?.dataset['refId']) {
        e.preventDefault();
        refAction({ type: 'keep', reference_id: focusedRef.dataset['refId'] });
        onNotify('Kept for later');
      } else if ((key === 'u' || key === 'U') && focusedRef?.dataset['refId']) {
        e.preventDefault();
        update({ overlay: { kind: 'use', reference_id: focusedRef.dataset['refId'] } });
      } else if ((key === 'c' || key === 'C') && focusedRef?.dataset['refId']) {
        e.preventDefault();
        refAction({ type: 'clarify', reference_id: focusedRef.dataset['refId'] });
        update({ overlay: { kind: 'clarify', reference_id: focusedRef.dataset['refId'] } });
      } else if (key === 'Escape') {
        e.preventDefault();
        onEnd();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // togglePin/refAction are stable per render; the handler is re-bound on every render on purpose
  });

  function onTouchStart(e: TouchEvent) {
    touchY.current = e.touches[0]?.clientY ?? null;
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touchY.current;
    const end = e.changedTouches[0]?.clientY ?? null;
    touchY.current = null;
    if (start !== null && end !== null && start - end > 40) setSheet({ kind: 'transcript' });
  }

  const rail = referencesForRail(listener.references);
  const chips = node ? node.branches.slice(0, MAX_CHIPS) : [];
  const moreCount = node ? Math.max(0, node.branches.length - MAX_CHIPS) : 0;
  const selectedWord = sheet?.kind === 'word' ? (byId.get(sheet.id) ?? analysis.excluded.find((c) => c.event.id === sheet.id) ?? null) : null;
  const selectedRef = sheet?.kind === 'ref' ? (listener.references.find((r) => r.id === sheet.id) ?? null) : null;
  const stateDots = [
    { id: 'call', on: true, tone: styles.dotGreen, name: 'Call: simulated, connected (demo — no phone line)' },
    { id: 'transcribe', on: false, tone: styles.dotOff, name: 'Transcription: off — synthetic transcript, no microphone' },
    { id: 'coach', on: false, tone: styles.dotOff, name: 'Coach: off — no model; suggestions are rule-based templates' },
  ];

  const words = (
    <>
      {resolved.pinned.map((c) => (
        <WordCard
          key={c.event.id}
          word={c.event.exact_text}
          provenance={wordProvenance(c.event)}
          provenanceName={wordProvenanceName(c.event)}
          correction={wordCorrection(c.event)}
          pinned={resolved.state.manual.includes(c.event.id)}
          provisional={c.event.stability === 'interim'}
          eventId={c.event.id}
          onPress={() => setSheet({ kind: 'word', id: c.event.id })}
        />
      ))}
    </>
  );
  const refs = (
    <>
      {rail.map((r) => (
        <RefCard
          key={r.id}
          label={r.label}
          meaning={refMeaningLine(r)}
          status={refMeaningStatus(r)}
          statusName={refMeaningName(r)}
          invalidated={r.lifecycle.state === 'invalidated'}
          muted={r.lifecycle.state === 'dismissed' || r.lifecycle.state === 'rejected'}
          pinned={r.lifecycle.state === 'pinned'}
          kept={r.lifecycle.kept_for_later}
          referenceId={r.id}
          onPress={() => setSheet({ kind: 'ref', id: r.id })}
        />
      ))}
    </>
  );

  return (
    <div className={[styles.incall, dimmed ? styles.dimmed : ''].join(' ').trim()} data-stage-wide data-incall data-attempt-id={attempt.id} data-node-id={node?.id}>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-incall-live>
        {liveText}
      </div>

      {/* header */}
      <div className={styles.callHead}>
        <Avatar name={item.contact} size={40} />
        <div className={styles.callWho}>
          <span className={styles.callName}>{item.contact}</span>
          <span className={styles.callCompany}>{item.company}</span>
        </div>
        <span className={styles.callTimer} data-call-timer aria-label={`Call time ${formatClock(talkMs)}`}>
          {formatClock(talkMs)}
        </span>
        <span className={styles.dots} role="group" aria-label="Call state">
          {stateDots.map((d) => (
            <span key={d.id} className={[styles.dot, d.tone].join(' ')} role="img" aria-label={d.name} title={d.name} data-state-dot={d.id} />
          ))}
        </span>
      </div>

      {/* narrow: words strip above the line */}
      <div className={styles.strip} ref={railRef} data-words-strip aria-label="Their words and references">
        {resolved.pinned.length + rail.length === 0 ? (
          <span className={styles.stripEmpty} aria-hidden="true">
            ◌
          </span>
        ) : null}
        {words}
        {refs}
      </div>

      <div className={styles.columns}>
        {/* center: the line */}
        <div className={styles.lineCol}>
          {node ? (
            <LineCard
              stage={stageLabel(node.stage)}
              line={st.line_text}
              bridge={bridgeShape(node.bridge_template)}
              onNext={next}
              nextName={`${st.line_text} — next line`}
              onInfo={() => setSheet({ kind: 'info' })}
              nodeId={node.id}
              meta={node.approval.status !== 'published' ? <Chip static glyph="◇" label={node.approval.status} tone="teal" name={`Script status: ${node.approval.status} — not approved for live use`} /> : undefined}
            />
          ) : null}

          {node ? (
            <div className={styles.chips} role="group" aria-label="Branches">
              {chips.map((b, i) => (
                <Chip
                  key={b.answer_category}
                  label={b.label}
                  kbd={String(i + 1)}
                  glyph={hint?.branch.answer_category === b.answer_category ? '◆' : undefined}
                  tone={hint?.branch.answer_category === b.answer_category ? 'teal' : 'neutral'}
                  name={`${b.label}${hint?.branch.answer_category === b.answer_category ? ' — matches what they just said' : ''}${b.next_node_id ? '' : ' (end of sequence)'}`}
                  onClick={() => goTo(b.next_node_id)}
                  data-branch={b.answer_category}
                />
              ))}
              {moreCount > 0 ? <Chip label="more" glyph="…" name={`${moreCount} more branches`} onClick={() => setSheet({ kind: 'more' })} data-branch-more /> : null}
              {st.history.length > 0 ? <IconButton icon="arrow-left" label="Previous line" onClick={goBack} /> : null}
            </div>
          ) : null}

          {suggestion ? (
            <Card tone="purple" data-suggestion-overlay>
              <div className={styles.suggestHead}>
                <span className={styles.suggestTag}>Suggested</span>
                <span className={styles.suggestRef}>{suggestedRef?.label ?? ''}</span>
              </div>
              <p className={styles.suggestText} data-suggestion-text>
                {suggestion.text}
              </p>
              <div className={styles.suggestActions}>
                <Chip label="Use" tone="purple" selected onClick={useSuggestion} name="Use this line now — records that you said it" />
                <Chip label="Not now" onClick={notNow} />
                <Chip label="Never" onClick={never} name="Never suggest this reference again" />
              </div>
            </Card>
          ) : null}

          <div className={styles.callFoot} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <IconButton icon="arrow-up" label="Transcript" onClick={() => setSheet({ kind: 'transcript' })} data-transcript-button />
            <IconButton icon="phone-off" label="End call" tone="red" solid size={72} onClick={onEnd} data-end-call />
            <span className={styles.footSpacer} aria-hidden="true" />
          </div>
        </div>

        {/* wide: rail */}
        <aside className={styles.rail} aria-label="Their words and references">
          <div className={styles.railHead}>
            <Chip static label="Their words" tone="gold" />
          </div>
          <div className={styles.railList} data-words-rail>
            {resolved.pinned.length === 0 ? <span className={styles.railEmpty} aria-hidden="true">◌</span> : words}
          </div>
          <div className={styles.railHead}>
            <Chip static label="Their refs" tone="purple" />
          </div>
          <div className={styles.railList} data-refs-rail>
            {rail.length === 0 ? <span className={styles.railEmpty} aria-hidden="true">◌</span> : refs}
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

      <Sheet open={sheet?.kind === 'more'} onClose={() => setSheet(null)} title="Branches" data-sheet="branches">
        {node ? (
          <TileGrid columns={2}>
            {node.branches.map((b, i) => (
              <Tile
                key={b.answer_category}
                label={b.label}
                icon={b.next_node_id ? 'next' : 'flag'}
                name={`${i + 1}. ${b.label}${b.note ? ` — ${b.note}` : ''}${b.next_node_id ? '' : ' (end of sequence)'}`}
                onClick={() => {
                  setSheet(null);
                  goTo(b.next_node_id);
                }}
              />
            ))}
          </TileGrid>
        ) : null}
      </Sheet>

      <Sheet open={selectedWord !== null} onClose={() => setSheet(null)} title="Their word" data-sheet="word">
        {selectedWord ? (
          <div className={styles.detail}>
            <span className={styles.detailWord}>{selectedWord.event.exact_text}</span>
            <p className={styles.detailLine}>{wordProvenanceName(selectedWord.event)}</p>
            {selectedWord.event.meaning ? <p className={styles.detailLine}>means: {selectedWord.event.meaning}</p> : null}
            {selectedWord.event.correction_or_negation ? <p className={styles.detailLine}>{wordCorrection(selectedWord.event)}</p> : null}
            {selectedWord.event.cue ? <p className={styles.detailCue}>{selectedWord.event.cue}</p> : null}
            {selectedWord.exclusion ? <p className={styles.detailCue}>{selectedWord.exclusion}</p> : null}
            <div className={styles.detailActions}>
              {selectedWord.eligible ? (
                <Chip label={pinnedIds.has(selectedWord.event.id) ? 'Unpin' : 'Pin'} glyph="⌖" toggle selected={pinnedIds.has(selectedWord.event.id)} tone="gold" onClick={() => togglePin(selectedWord.event.id)} />
              ) : null}
              {selectedWord.event.meaning_status === 'invalidated' ? (
                <Chip label="Clarify" tone="teal" onClick={() => update((prev) => ({ clarified: prev.clarified.includes(selectedWord.event.id) ? prev.clarified : [...prev.clarified, selectedWord.event.id] }))} />
              ) : null}
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={selectedRef !== null} onClose={() => setSheet(null)} title="Their reference" data-sheet="ref">
        {selectedRef ? (
          <div className={styles.detail}>
            <span className={styles.detailRef}>{selectedRef.label}</span>
            <q className={styles.detailQuote}>{selectedRef.evidence.supporting_quote}</q>
            <p className={styles.detailLine}>{selectedRef.semantics.relationship}</p>
            <p className={styles.detailCue}>{refMeaningName(selectedRef)}</p>
            {selectedRef.semantics.prohibited_inferences.length > 0 ? <p className={styles.detailCue}>not inferred: {selectedRef.semantics.prohibited_inferences.join('; ')}</p> : null}
            <div className={styles.detailActions}>
              <Chip
                label="Keep"
                glyph="◇"
                tone="teal"
                toggle
                selected={selectedRef.lifecycle.kept_for_later}
                disabled={!(selectedRef.lifecycle.state === 'held' || selectedRef.lifecycle.state === 'pinned')}
                onClick={() => {
                  refAction({ type: 'keep', reference_id: selectedRef.id });
                  onNotify('Kept for later');
                }}
              />
              <Chip
                label="Use"
                tone="purple"
                disabled={selectedRef.reuse.do_not_reuse || !(selectedRef.lifecycle.state === 'held' || selectedRef.lifecycle.state === 'pinned')}
                onClick={() => {
                  update({ overlay: { kind: 'use', reference_id: selectedRef.id } });
                  setSheet(null);
                }}
              />
              <Chip
                label="Clarify"
                tone="teal"
                disabled={!(selectedRef.lifecycle.state === 'held' || selectedRef.lifecycle.state === 'pinned')}
                onClick={() => {
                  refAction({ type: 'clarify', reference_id: selectedRef.id });
                  update({ overlay: { kind: 'clarify', reference_id: selectedRef.id } });
                  setSheet(null);
                }}
              />
              <Chip
                label={selectedRef.lifecycle.state === 'pinned' ? 'Unpin' : 'Pin'}
                glyph="⌖"
                toggle
                selected={selectedRef.lifecycle.state === 'pinned'}
                disabled={selectedRef.lifecycle.state === 'invalidated' || selectedRef.lifecycle.state === 'rejected'}
                onClick={() => refAction({ type: selectedRef.lifecycle.state === 'pinned' ? 'unpin' : 'pin', reference_id: selectedRef.id })}
              />
              <Chip
                label="Dismiss"
                tone="red"
                disabled={selectedRef.lifecycle.state === 'invalidated' || selectedRef.lifecycle.state === 'dismissed'}
                onClick={() => {
                  refAction({ type: 'dismiss', reference_id: selectedRef.id });
                  setSheet(null);
                }}
              />
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={sheet?.kind === 'transcript'} onClose={() => setSheet(null)} title="Transcript" tall data-sheet="transcript">
        <ol className={styles.transcript} aria-label="Synthetic transcript so far">
          {listener.normalized.turns.map((t) => (
            <li key={`${t.utterance_id}-${t.revision}`} className={[styles.turn, t.speaker_role === 'prospect' ? styles.turnProspect : styles.turnRep].join(' ')}>
              <span className={styles.turnWho} aria-hidden="true">
                {t.speaker_role === 'prospect' ? '●' : '○'}
              </span>
              <span className="sr-only">{t.speaker_role === 'prospect' ? 'Prospect' : 'You'}:</span>
              <span className={styles.turnText}>{t.text}</span>
              {!t.is_final ? <span className={styles.turnInterim}>provisional</span> : null}
            </li>
          ))}
        </ol>
        {listener.normalized.turns.length === 0 ? <span className={styles.railEmpty}>◌</span> : null}
      </Sheet>
    </div>
  );
}
