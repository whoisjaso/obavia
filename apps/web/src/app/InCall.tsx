'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { ArrowsLeftRight, CaretRight, CheckCircle, CircleDashed, CircleHalf, DotsThree, Ear, Eye, Headset, Lightbulb, MusicNote, PhoneCall, Prohibit, PushPin, Question, Record, Sparkle, Subtitles, UserSound, type Icon } from '@phosphor-icons/react';
import type { Attempt, ListenerAction, QueueItem, ScriptNode, ScriptVersion, Transcript, TranscriptTurn } from '@apohenia/domain/schemas';
import { loadVersionGraph, stageLabel } from '@apohenia/domain/scripts';
import { analyzeCall, pinPhrase, resolvePins, unpinPhrase } from '@apohenia/domain/vocabulary';
import { formatClock, knownFactsFor, nextScriptNodeHint } from '@apohenia/domain/dialer';
import { Avatar, Card, Chip, IconButton, LineCard, RefCard, Sheet, SlotLine, Tile, TileGrid, WordCard, type RefMeaningStatus, type WordReference } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { useImmersive } from '@/lib/immersive';
import { useWide } from '@/lib/use-wide';
import {
  CALL_STATUS_NAME,
  CALL_STATUS_ROWS,
  EMPTY_IN_CALL,
  InCallState,
  branchIcon,
  candidateById,
  chipLabel,
  decideOverlay,
  defaultNextNodeId,
  listenerOver,
  longestPrimaryLine,
  panelKey,
  plain,
  plainMeaning,
  refMeaningName,
  refMeaningStatus,
  refTitle,
  referencesForRail,
  resolveBridge,
  resolveLine,
  resolveMirror,
  splitRefLabel,
  toKnownFacts,
  guidanceLine,
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

type SheetKind = { kind: 'info' } | { kind: 'more' } | { kind: 'word'; id: string } | { kind: 'ref'; id: string } | { kind: 'transcript' } | { kind: 'status' };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** A rep/UI listener action before it is stamped with the event version. */
type CardAction = DistributiveOmit<ListenerAction, 'event_version'>;

/** Branch chips in one row: 2 on a phone, 3 on a wide stage (+ "more"); labels never truncate. */
const MAX_CHIPS_NARROW = 2;
const MAX_CHIPS_WIDE = 3;
/** Mirrors LineCard: lines past this many words step down one size. */
const LONG_LINE_WORDS = 24;

const STATUS_ICON: Record<(typeof CALL_STATUS_ROWS)[number]['id'], Icon> = { call: PhoneCall, transcription: Subtitles, recording: Record, coach: Lightbulb };
const MEANING_ICON: Record<RefMeaningStatus, Icon> = { observed: Eye, inferred: CircleDashed, confirmed: CheckCircle, unknown: Question };

/**
 * In-call (DESIGN_SYSTEM §3.2): a fixed, non-scrolling stage. Header with one status chip, THEIR
 * WORDS strip (phone) or rail (wide), the script LineCard sized to the version's longest line (so
 * nothing below it moves between nodes), one row of branch chips, one optional suggestion overlay
 * that never auto-applies, and a docked bottom bar with the transcript and the red End control.
 * The tab bar is hidden while a call is on.
 */
export function InCall({ item, attempt, transcript, played, talkMs, nodes, versions, dimmed, onEnd, onNotify }: InCallProps) {
  useImmersive(true);
  const wide = useWide();
  const version = versions[0] ?? null;
  const graph = useMemo(() => (version ? loadVersionGraph(version, nodes) : null), [version, nodes]);
  const entryNodeId = version?.entry_node_ids[item.entrypoint] ?? version?.entry_node_ids['cold'] ?? nodes[0]?.id ?? null;
  const recordFacts = useMemo(() => knownFactsFor(item), [item]);
  // The ghost line: the longest line of this version with the record's facts. Stable for the whole call.
  const ghostLine = useMemo(() => longestPrimaryLine(nodes, version?.id ?? null, recordFacts), [nodes, version?.id, recordFacts]);
  const ghostLong = ghostLine.trim().split(/\s+/).length > LONG_LINE_WORDS;

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
  // Record facts (first name, dealership) win: they are what you say on the phone; transcript facts fill the rest (their word, stated problem).
  const facts = useMemo(() => ({ ...toKnownFacts(analysis.facts), ...recordFacts }), [recordFacts, analysis.facts]);
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
  const bridgeLine = node ? resolveBridge(node.bridge_template, facts) : null;

  const goTo = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) {
        onNotify('End of script. Hand back.');
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
    onNotify(`Used: ${suggestedRef ? refTitle(suggestedRef).toLowerCase() : 'reference'}`);
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
      onNotify(`Unpinned: ${cand?.event.exact_text ?? ''}`);
      return;
    }
    const r = pinPhrase(resolved.state, eventId);
    update({ pins: r.state });
    onNotify(r.ok ? `Pinned: ${cand?.event.exact_text ?? ''}` : plain(r.reason ?? 'Not pinned'));
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

  // ---- one panel system: a reference whose term is a pinned word lives on that word card (once);
  //      analogies and other real references keep their own purple card with the relationship line ----
  const rail = referencesForRail(listener.references);
  const merged = useMemo(() => {
    const byKey = new Map<string, (typeof rail)[number]>();
    for (const r of rail) byKey.set(panelKey(r.label), r);
    const wordRefs = new Map<string, (typeof rail)[number]>();
    for (const c of resolved.pinned) {
      const r = byKey.get(panelKey(c.event.exact_text));
      if (r) wordRefs.set(c.event.id, r);
    }
    const mergedIds = new Set([...wordRefs.values()].map((r) => r.id));
    return { wordRefs, refs: rail.filter((r) => !mergedIds.has(r.id)) };
  }, [rail, resolved.pinned]);

  const maxChips = wide ? MAX_CHIPS_WIDE : MAX_CHIPS_NARROW;
  const chips = node ? node.branches.slice(0, maxChips) : [];
  const moreCount = node ? Math.max(0, node.branches.length - maxChips) : 0;
  const selectedWord = sheet?.kind === 'word' ? (byId.get(sheet.id) ?? analysis.excluded.find((c) => c.event.id === sheet.id) ?? null) : null;
  const selectedRef = sheet?.kind === 'ref' ? (listener.references.find((r) => r.id === sheet.id) ?? null) : null;
  const refActive = (r: { lifecycle: { state: string } }) => r.lifecycle.state === 'held' || r.lifecycle.state === 'pinned';

  const words = (
    <>
      {resolved.pinned.map((c) => {
        const r = merged.wordRefs.get(c.event.id);
        const reference: WordReference | undefined = r
          ? { referenceId: r.id, meaning: plainMeaning(r), status: refMeaningStatus(r), statusName: refMeaningName(r), invalidated: r.lifecycle.state === 'invalidated', pinned: r.lifecycle.state === 'pinned', kept: r.lifecycle.kept_for_later }
          : undefined;
        return (
          <WordCard
            key={c.event.id}
            word={c.event.exact_text}
            provenance={wordProvenance(c.event)}
            provenanceName={wordProvenanceName(c.event)}
            correction={wordCorrection(c.event)}
            pinned={resolved.state.manual.includes(c.event.id)}
            provisional={c.event.stability === 'interim'}
            reference={reference}
            eventId={c.event.id}
            onPress={() => setSheet(r ? { kind: 'ref', id: r.id } : { kind: 'word', id: c.event.id })}
          />
        );
      })}
    </>
  );
  const refs = (
    <>
      {merged.refs.map((r) => (
        <RefCard
          key={r.id}
          label={refTitle(r)}
          meaning={plainMeaning(r)}
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
  const panelEmpty = resolved.pinned.length + merged.refs.length === 0;
  const selectedRefIcon = selectedRef ? (selectedRef.lifecycle.state === 'invalidated' ? Prohibit : MEANING_ICON[refMeaningStatus(selectedRef)]) : null;

  return (
    <div className={[styles.incall, dimmed ? styles.dimmed : ''].join(' ').trim()} data-stage-wide data-incall data-immersive-stage data-attempt-id={attempt.id} data-node-id={node?.id}>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-incall-live>
        {liveText}
      </div>

      {/* header: one status chip carries the whole truth; the sheet lists the four states */}
      <div className={styles.callHead} data-topbar>
        <div className={styles.callHeadInner}>
          <button type="button" className={styles.status} onClick={() => setSheet({ kind: 'status' })} aria-label={CALL_STATUS_NAME} title={CALL_STATUS_NAME} data-call-status data-demo-pill>
            <CircleHalf size={14} weight="fill" aria-hidden="true" />
            <span className={styles.statusWord} aria-hidden="true">
              Demo call
            </span>
          </button>
          <Avatar name={item.contact} size={40} />
          <div className={styles.callWho}>
            <span className={styles.callName}>{item.contact}</span>
            <span className={styles.callCompany}>{item.company}</span>
          </div>
          <span className={styles.callTimer} data-call-timer aria-label={`Call time ${formatClock(talkMs)}`}>
            {formatClock(talkMs)}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        {/* center: the line */}
        <div className={styles.lineCol}>
          {/* narrow: words strip above the line, fixed height, simply dark while empty */}
          {!wide ? (
            <div className={styles.strip} ref={railRef} data-words-strip aria-label="Their words and references" data-empty={panelEmpty ? 'true' : undefined}>
              {words}
              {refs}
            </div>
          ) : null}

          {node ? (
            <div className={styles.lineWrap} data-line-wrap>
              <div className={styles.ghost} aria-hidden="true" data-line-ghost>
                <div className={styles.ghostHead} />
                <span className={[styles.ghostText, ghostLong ? styles.ghostLong : ''].join(' ').trim()}>{ghostLine}</span>
              </div>
              <LineCard stage={stageLabel(node.stage)} line={st.line_text} bridge={bridgeLine ?? undefined} fill onNext={next} nextName={`${st.line_text}. Next line`} onInfo={() => setSheet({ kind: 'info' })} nodeId={node.id} />
            </div>
          ) : null}

          {node ? (
            <div className={styles.chips} role="group" aria-label="Branches">
              {chips.map((b, i) => {
                const matches = hint?.branch.answer_category === b.answer_category;
                return (
                  <Chip
                    key={b.answer_category}
                    label={chipLabel(b)}
                    kbd={String(i + 1)}
                    glyph={matches ? <Sparkle size={14} weight="fill" aria-hidden="true" /> : undefined}
                    tone={matches ? 'teal' : 'neutral'}
                    name={`${plain(b.label)}${matches ? '. Matches what they just said' : ''}${b.next_node_id ? '' : '. End of sequence'}`}
                    onClick={() => goTo(b.next_node_id)}
                    data-branch={b.answer_category}
                    className={styles.chip}
                  />
                );
              })}
              {moreCount > 0 ? <Chip label="more" glyph={<DotsThree size={16} weight="bold" aria-hidden="true" />} name={`${moreCount} more branches`} onClick={() => setSheet({ kind: 'more' })} data-branch-more className={styles.chip} /> : null}
            </div>
          ) : null}

          {suggestion ? (
            <div className={styles.suggestWrap}>
              <Card tone="purple" data-suggestion-overlay className={styles.suggest}>
                <div className={styles.suggestHead}>
                  <span className={styles.suggestTag}>Suggested</span>
                  <span className={styles.suggestRef}>{suggestedRef ? refTitle(suggestedRef) : ''}</span>
                </div>
                <p className={styles.suggestText} data-suggestion-text>
                  {suggestion.text}
                </p>
                <div className={styles.suggestActions}>
                  <Chip label="Use" tone="purple" selected onClick={useSuggestion} name="Use this line now. Records that you said it" />
                  <Chip label="Not now" onClick={notNow} />
                  <Chip label="Never" onClick={never} name="Never suggest this reference again" />
                </div>
              </Card>
            </div>
          ) : null}
        </div>

        {/* wide: rail, full height, scrolls on its own; the purple lane exists only when a real reference does */}
        {wide ? (
          <aside className={styles.rail} ref={railRef} aria-label="Their words and references">
            <div className={styles.railHead}>
              <Chip static label="Their words" tone="gold" className={styles.railLabel} />
            </div>
            <div className={styles.railList} data-words-rail data-empty={resolved.pinned.length === 0 ? 'true' : undefined}>
              {words}
            </div>
            {merged.refs.length > 0 ? (
              <>
                <div className={styles.railHead}>
                  <Chip static label="Their refs" tone="purple" className={styles.railLabel} name={`Their references: ${merged.refs.length}`} />
                </div>
                <div className={styles.railList} data-refs-rail>
                  {refs}
                </div>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* docked bottom bar: transcript · End · previous */}
      <div className={styles.callFoot} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-call-foot>
        <div className={styles.callFootInner}>
          <IconButton icon="arrow-up" label="Transcript" onClick={() => setSheet({ kind: 'transcript' })} data-transcript-button />
          <IconButton icon="phone-off" label="End call" tone="red" solid size={72} onClick={onEnd} className={styles.endButton} data-end-call />
          <IconButton icon="arrow-left" label="Previous line" onClick={goBack} disabled={st.history.length === 0} className={styles.backButton} data-line-prev />
        </div>
      </div>

      {/* ---- sheets ---- */}
      <Sheet open={sheet?.kind === 'status'} onClose={() => setSheet(null)} title="Call status" data-sheet="status">
        <div className={styles.statusRows} role="list">
          {CALL_STATUS_ROWS.map((r) => {
            const Glyph = STATUS_ICON[r.id];
            return (
              <div key={r.id} className={[styles.statusRow, r.on ? styles.statusOn : ''].join(' ').trim()} role="listitem" data-status-row={r.id} data-status-on={r.on ? 'true' : 'false'}>
                <Glyph size={24} weight="regular" className={styles.statusIcon} aria-hidden="true" />
                <span className={styles.statusLabel}>{r.label}</span>
                <span className={styles.statusState}>{r.state}</span>
                <span className={styles.statusDetail}>{r.detail}</span>
              </div>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={sheet?.kind === 'info'} onClose={() => setSheet(null)} title="Why now" data-sheet="info">
        {node ? (
          <div className={styles.info}>
            <p className={styles.infoBig}>{plain(node.why_this_now)}</p>
            {node.approval.status !== 'published' ? (
              <p className={styles.infoNote} data-script-status={node.approval.status}>
                Draft script. Not approved for live use.
              </p>
            ) : null}
            <InfoRow label="Listen for" icon={Ear}>
              <p>{plain(node.what_to_listen_for)}</p>
            </InfoRow>
            {node.mirror_variants.length > 0 ? (
              <InfoRow label="Mirrors" icon={ArrowsLeftRight} tone="teal">
                <ul className={styles.infoList}>
                  {node.mirror_variants.map((m) => (
                    <li key={m} data-mirror>
                      <SlotLine text={plain(resolveMirror(m, facts))} />
                    </li>
                  ))}
                </ul>
              </InfoRow>
            ) : null}
            <InfoRow label="Tone" icon={MusicNote}>
              <p>{plain(node.delivery_overlay.tone_cue)}</p>
            </InfoRow>
            <InfoRow label="Done when" icon={CheckCircle}>
              <p>{plain(node.completion_criteria)}</p>
            </InfoRow>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={sheet?.kind === 'more'} onClose={() => setSheet(null)} title="Branches" data-sheet="branches">
        {node ? (
          <TileGrid columns={2}>
            {node.branches.map((b, i) => (
              <Tile
                key={b.answer_category}
                label={chipLabel(b)}
                icon={branchIcon(b)}
                tone={b.answer_category === 'opt_out' ? 'red' : b.next_node_id ? 'neutral' : 'orange'}
                name={`${i + 1}. ${plain(b.label)}${b.note ? `. ${plain(b.note)}` : ''}${b.next_node_id ? '' : '. End of sequence'}`}
                onClick={() => {
                  setSheet(null);
                  goTo(b.next_node_id);
                }}
                data-branch-tile={b.answer_category}
              />
            ))}
          </TileGrid>
        ) : null}
      </Sheet>

      <Sheet open={selectedWord !== null} onClose={() => setSheet(null)} title="Their word" data-sheet="word">
        {selectedWord ? (
          <div className={styles.detail}>
            <span className={styles.detailWord}>{selectedWord.event.exact_text}</span>
            <p className={styles.detailLine}>{plain(wordProvenanceName(selectedWord.event))}</p>
            {selectedWord.event.meaning ? <p className={styles.detailLine}>means: {selectedWord.event.meaning}</p> : null}
            {selectedWord.event.correction_or_negation ? (
              <p className={styles.detailCorrection}>
                not <s>{selectedWord.event.correction_or_negation.rejects}</s>
              </p>
            ) : null}
            {selectedWord.event.cue ? <p className={styles.detailCue}>{plain(selectedWord.event.cue)}</p> : null}
            {selectedWord.exclusion ? <p className={styles.detailCue}>{plain(selectedWord.exclusion)}</p> : null}
            <div className={styles.detailActions}>
              {selectedWord.eligible ? (
                <Chip
                  label={pinnedIds.has(selectedWord.event.id) ? 'Unpin' : 'Pin'}
                  glyph={<PushPin size={14} weight={pinnedIds.has(selectedWord.event.id) ? 'fill' : 'regular'} aria-hidden="true" />}
                  toggle
                  selected={pinnedIds.has(selectedWord.event.id)}
                  tone="gold"
                  onClick={() => togglePin(selectedWord.event.id)}
                />
              ) : null}
              {selectedWord.event.meaning_status === 'invalidated' ? (
                <Chip label="Clarify" tone="teal" onClick={() => update((prev) => ({ clarified: prev.clarified.includes(selectedWord.event.id) ? prev.clarified : [...prev.clarified, selectedWord.event.id] }))} />
              ) : null}
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={selectedRef !== null}
        onClose={() => setSheet(null)}
        title="Their reference"
        data-sheet="ref"
        actions={
          selectedRef ? (
            <>
              <IconButton
                icon="bookmark"
                label={selectedRef.lifecycle.state === 'pinned' ? 'Unpin. Position no longer protected' : 'Pin. Protects the card position, not its accuracy'}
                tone={selectedRef.lifecycle.state === 'pinned' ? 'blue' : 'neutral'}
                solid={selectedRef.lifecycle.state === 'pinned'}
                aria-pressed={selectedRef.lifecycle.state === 'pinned'}
                disabled={selectedRef.lifecycle.state === 'invalidated' || selectedRef.lifecycle.state === 'rejected'}
                onClick={() => refAction({ type: selectedRef.lifecycle.state === 'pinned' ? 'unpin' : 'pin', reference_id: selectedRef.id })}
                data-ref-pin
              />
              <IconButton
                icon="ban"
                label="Dismiss this reference"
                tone="red"
                disabled={selectedRef.lifecycle.state === 'invalidated' || selectedRef.lifecycle.state === 'dismissed'}
                onClick={() => {
                  refAction({ type: 'dismiss', reference_id: selectedRef.id });
                  setSheet(null);
                }}
                data-ref-dismiss
              />
            </>
          ) : null
        }
        footer={
          selectedRef ? (
            <TileGrid columns={3}>
              <Tile
                icon="bookmark"
                label="Keep"
                tone="blue"
                selected={selectedRef.lifecycle.kept_for_later}
                disabled={!refActive(selectedRef)}
                name={selectedRef.lifecycle.kept_for_later ? 'Kept for later' : 'Keep for later'}
                onClick={() => {
                  refAction({ type: 'keep', reference_id: selectedRef.id });
                  onNotify('Kept for later');
                }}
                data-ref-keep
              />
              <Tile
                icon="spark"
                label="Use"
                tone="purple"
                disabled={selectedRef.reuse.do_not_reuse || !refActive(selectedRef)}
                name="Use now. Shows one suggested bridge, never auto-applied"
                onClick={() => {
                  update({ overlay: { kind: 'use', reference_id: selectedRef.id } });
                  setSheet(null);
                }}
                data-ref-use
              />
              <Tile
                icon="search"
                label="Clarify"
                tone="blue"
                disabled={!refActive(selectedRef)}
                name="Clarify meaning. Asks what it means for them, before assuming"
                onClick={() => {
                  refAction({ type: 'clarify', reference_id: selectedRef.id });
                  update({ overlay: { kind: 'clarify', reference_id: selectedRef.id } });
                  setSheet(null);
                }}
                data-ref-clarify
              />
            </TileGrid>
          ) : null
        }
      >
        {selectedRef && selectedRefIcon ? (
          <div className={styles.detail}>
            <span className={styles.detailRef} data-ref-title>
              {splitRefLabel(refTitle(selectedRef)).title}
            </span>
            <div className={styles.detailChips}>
              {splitRefLabel(selectedRef.label).aside ? (
                <span className={styles.detailAside} data-ref-aside>
                  not <s>{splitRefLabel(selectedRef.label).aside!.replace(/^not\s+/i, '')}</s>
                </span>
              ) : null}
              <Chip
                static
                glyph={<StatusIcon icon={selectedRefIcon} />}
                label={selectedRef.lifecycle.state === 'invalidated' ? 'invalidated' : refMeaningStatus(selectedRef)}
                tone="purple"
                name={selectedRef.lifecycle.state === 'invalidated' ? 'Invalidated. Evidence retracted' : plain(refMeaningName(selectedRef))}
                data-ref-status
              />
            </div>
            <q className={styles.detailQuote}>{selectedRef.evidence.supporting_quote}</q>
            <p className={styles.detailLine}>{plain(selectedRef.semantics.relationship)}</p>
            {guidanceLine(selectedRef) ? (
              <p className={styles.detailUse} data-ref-use-line>
                {guidanceLine(selectedRef)}
              </p>
            ) : null}
            {selectedRef.semantics.prohibited_inferences.length > 0 ? (
              <InfoRow label="Use it right" icon={Sparkle} tone="purple">
                <ul className={styles.infoList} data-ref-prohibited>
                  {selectedRef.semantics.prohibited_inferences.map((x) => (
                    <li key={x}>{plain(x)}</li>
                  ))}
                </ul>
              </InfoRow>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet open={sheet?.kind === 'transcript'} onClose={() => setSheet(null)} title="Transcript" tall data-sheet="transcript">
        <ol className={styles.transcript} aria-label="Synthetic transcript so far">
          {listener.normalized.turns.map((t) => (
            <li key={`${t.utterance_id}-${t.revision}`} className={[styles.turn, t.speaker_role === 'prospect' ? styles.turnProspect : styles.turnRep].join(' ')}>
              <span className={styles.turnWho} aria-hidden="true">
                {t.speaker_role === 'prospect' ? <UserSound size={16} weight="fill" /> : <Headset size={16} weight="regular" />}
              </span>
              <span className="sr-only">{t.speaker_role === 'prospect' ? 'Prospect' : 'You'}:</span>
              <span className={styles.turnText}>{t.text}</span>
              {!t.is_final ? <span className={styles.turnInterim}>provisional</span> : null}
            </li>
          ))}
        </ol>
        {listener.normalized.turns.length === 0 ? <span className={styles.noneYet}>None yet</span> : null}
      </Sheet>
    </div>
  );
}

/** A 14px icon inside a static chip. */
function StatusIcon({ icon }: { icon: Icon }) {
  const Glyph = icon;
  return <Glyph size={14} weight="bold" aria-hidden="true" />;
}

/** A collapsible row in the ⓘ sheet: tap the label row to open its text (why-now stays the hero). */
function InfoRow({ label, icon, tone, children }: { label: string; icon: Icon; tone?: 'teal' | 'purple'; children: ReactNode }) {
  const Glyph = icon;
  return (
    <details className={styles.infoRow} data-info-row={label.toLowerCase().replace(/\s+/g, '-')}>
      <summary className={[styles.infoSummary, tone === 'teal' ? styles.infoTeal : '', tone === 'purple' ? styles.infoPurple : ''].join(' ').trim()}>
        <span className={styles.infoIcon} aria-hidden="true">
          <Glyph size={20} weight="regular" />
        </span>
        <span>{label}</span>
        <span className={styles.infoChevron} aria-hidden="true">
          <CaretRight size={16} weight="bold" />
        </span>
      </summary>
      <div className={styles.infoBody}>{children}</div>
    </details>
  );
}
