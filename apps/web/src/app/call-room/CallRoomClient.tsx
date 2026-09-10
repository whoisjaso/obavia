'use client';

import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { z } from 'zod';
import type { ScriptNode, ScriptVersion, Transcript } from '@apohenia/domain/schemas';
import { PinState } from '@apohenia/domain/schemas';
import {
  EMPTY_PIN_STATE,
  PIN_MAX,
  analyzeCall,
  correctionLines,
  missingFields,
  pinCountLabel,
  pinPhrase,
  prospectRows,
  provenanceLabel,
  resolvePins,
  slotLabel,
  unpinPhrase,
  type Fact,
  type RankedCandidate,
} from '@apohenia/domain/vocabulary';
import { Badge, Button, Card, Inline, KeyboardHint, Select, Stack, VisuallyHidden } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './callroom.module.css';

const SIZE_MIN = 24;
const SIZE_MAX = 40;
const SIZE_STEP = 2;
const TheirWordsSize = z.number().int().min(SIZE_MIN).max(SIZE_MAX);
const DEFAULT_SIZE = 28;

const RoomState = z.object({
  pins: PinState,
  node_id: z.string().nullable(),
  stage_pinned: z.boolean(),
  hide_assistance: z.boolean(),
  clarified: z.array(z.string()),
});
type RoomState = z.infer<typeof RoomState>;
const EMPTY_ROOM: RoomState = { pins: EMPTY_PIN_STATE, node_id: null, stage_pinned: false, hide_assistance: false, clarified: [] };

const PERMISSIONS = ['Contact purpose', 'Recording', 'Live transcription / AI processing', 'Voicemail', 'SMS', 'Email'];
const STATE_CHIPS: { label: string; value: string }[] = [
  { label: 'Human call', value: 'Not connected (demo)' },
  { label: 'Transcription', value: 'Off' },
  { label: 'Recording', value: 'Off' },
  { label: 'Coach', value: 'Off (no model in Increment 1)' },
];

const SPEAKER: Record<string, string> = { representative: 'Rep', prospect: 'Prospect', unknown: 'Unknown' };

export interface CallRoomClientProps {
  transcripts: Transcript[];
  nodes: ScriptNode[];
  versions: ScriptVersion[];
  nodesPlaceholder: boolean;
}

function renderPrimaryLine(text: string, facts: Fact[]): ReactNode {
  const known = new Map(facts.map((f) => [f.key, f]));
  const parts = text.split(/(\{[a-z_0-9]+\})/g);
  return parts.map((part, i) => {
    if (!/^\{[a-z_0-9]+\}$/.test(part)) return <span key={i}>{part}</span>;
    const fact = known.get(part);
    if (fact) return <span key={i}>{fact.value}</span>;
    return (
      <span key={i} className={styles.slotUnknown} title="No evidence for this slot yet">
        {part}
      </span>
    );
  });
}

export function CallRoomClient({ transcripts, nodes, versions, nodesPlaceholder }: CallRoomClientProps) {
  const [callId, setCallId] = useState(transcripts[0]?.call_id ?? '');
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState('');
  const [size, setSize] = useStoredState('callroom.their_words_size', TheirWordsSize, DEFAULT_SIZE);
  const [room, setRoom, roomHydrated] = useStoredState(`callroom.${callId}`, RoomState, EMPTY_ROOM);

  const transcript = transcripts.find((t) => t.call_id === callId) ?? transcripts[0];
  const rawTurns = useMemo(() => transcript?.turns ?? [], [transcript]);
  const played = useMemo(() => rawTurns.slice(0, cursor), [rawTurns, cursor]);
  const analysis = useMemo(() => analyzeCall(played.length > 0 ? played : [], { clarified: room.clarified }), [played, room.clarified]);
  const resolved = useMemo(() => resolvePins(room.pins, analysis.ranked), [room.pins, analysis.ranked]);
  const prospect = useMemo(() => prospectRows().find((r) => r.contact.call_id === callId) ?? null, [callId]);

  // ---- script navigation ----
  const version = versions[0];
  const orderedIds = version?.node_ids ?? nodes.map((n) => n.id);
  const entryId = version?.entry_node_ids['cold'] ?? orderedIds[0] ?? null;
  const currentNode = nodes.find((n) => n.id === room.node_id) ?? nodes.find((n) => n.id === entryId) ?? null;
  const currentIndex = currentNode ? orderedIds.indexOf(currentNode.id) : -1;
  const facts = analysis.facts;
  const missing = currentNode ? missingFields(currentNode.required_context, facts) : [];

  function goTo(nodeId: string | null) {
    setRoom((prev) => ({ ...prev, node_id: nodeId }));
  }

  // ---- player ----
  function advance(to: number) {
    const next = Math.max(0, Math.min(rawTurns.length, to));
    const nextAnalysis = analyzeCall(rawTurns.slice(0, next), { clarified: room.clarified });
    const nextPins = resolvePins(room.pins, nextAnalysis.ranked).state;
    setRoom((prev) => ({ ...prev, pins: nextPins }));
    setCursor(next);
  }

  function selectCall(id: string) {
    setCallId(id);
    setCursor(0);
    setMessage('');
  }

  // ---- pins ----
  const eligibleById = new Map(analysis.ranked.map((r) => [r.event.id, r] as const));
  const pinnedIds = new Set(resolved.state.order);

  function togglePin(eventId: string) {
    const cand = eligibleById.get(eventId);
    if (pinnedIds.has(eventId)) {
      const r = unpinPhrase(resolved.state, eventId);
      setRoom((prev) => ({ ...prev, pins: r.state }));
      setMessage(`Unpinned ${cand?.event.exact_text ?? 'phrase'}.`);
      return;
    }
    if (!cand) {
      const excluded = analysis.excluded.find((e) => e.event.id === eventId);
      setMessage(excluded ? `Cannot pin: ${excluded.exclusion}.` : 'Cannot pin this phrase.');
      return;
    }
    const r = pinPhrase(resolved.state, eventId);
    setRoom((prev) => ({ ...prev, pins: r.state }));
    setMessage(r.ok ? `Pinned ${cand.event.exact_text}.` : (r.reason ?? 'Not pinned.'));
  }

  function unpin(eventId: string) {
    if (!pinnedIds.has(eventId)) return;
    const r = unpinPhrase(resolved.state, eventId);
    setRoom((prev) => ({ ...prev, pins: r.state }));
    setMessage(`Unpinned ${eligibleById.get(eventId)?.event.exact_text ?? 'phrase'}.`);
  }

  function onStripKeyDown(e: KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    const id = target.dataset['eventId'];
    if (!id) return;
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePin(id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      unpin(id);
    }
  }

  function clarify(eventId: string) {
    setRoom((prev) => ({ ...prev, clarified: prev.clarified.includes(eventId) ? prev.clarified : [...prev.clarified, eventId] }));
    setMessage('Clarification requested — the word returns as "asked"; nothing is assumed.');
  }

  const corrections = correctionLines(analysis.events);
  const stripStyle = { '--font-size-their-words': `${size}px` } as CSSProperties;
  const candidates: RankedCandidate[] = [...resolved.overflow, ...analysis.excluded];

  return (
    <div>
      <div className={styles.notice} role="note">
        <span className={styles.noticeText}>Demo: synthetic transcript. No microphone, no phone, no model.</span>
        <label>
          <VisuallyHidden>Synthetic call</VisuallyHidden>
          <Select
            aria-label="Synthetic call"
            style={{ maxWidth: '100%' }}
            value={transcript?.call_id ?? ''}
            onChange={(e) => selectCall(e.target.value)}
            options={transcripts.map((t) => ({ value: t.call_id, label: t.title }))}
          />
        </label>
      </div>

      <div className={styles.grid}>
        {/* ---------------- LEFT ---------------- */}
        <div className={styles.column}>
          <Card title="Business & contact" headingLevel="h2">
            {prospect ? (
              <dl className={styles.kv}>
                <dt>Company</dt>
                <dd>
                  {prospect.company.name} <Badge variant="neutral">FICTIONAL</Badge>
                </dd>
                <dt>Location</dt>
                <dd>
                  {prospect.location.name}, {prospect.location.state} · {prospect.location.timezone}
                </dd>
                <dt>Contact</dt>
                <dd>
                  {prospect.contact.name} — {prospect.contact.role}
                </dd>
                <dt>Number</dt>
                <dd>{prospect.endpoints.map((e) => e.e164).join(', ')} (fake)</dd>
                <dt>Policy</dt>
                <dd>requires_review (no reviewed policy yet)</dd>
              </dl>
            ) : (
              <p className={styles.empty}>No synthetic prospect record for this call.</p>
            )}
          </Card>
          <Card title="Permission state" headingLevel="h2">
            <ul className={styles.list}>
              {PERMISSIONS.map((p) => (
                <li key={p} className={styles.stateRow}>
                  <span>{p}</span>
                  <span>
                    <span className={styles.glyph} aria-hidden="true">
                      ×
                    </span>
                    Not granted · demo
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Call state" headingLevel="h2">
            <ul className={styles.list}>
              {STATE_CHIPS.map((c) => (
                <li key={c.label} className={styles.stateRow}>
                  <span>{c.label}</span>
                  <Badge variant="neutral">
                    <span className={styles.glyph} aria-hidden="true">
                      ○
                    </span>
                    {c.value}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------- CENTER ---------------- */}
        <div className={styles.column}>
          <Card>
            {currentNode ? (
              <>
                <div className={styles.stage}>
                  <Badge variant="info">Stage: {currentNode.stage}</Badge>
                  {currentNode.substage ? <span>· {currentNode.substage}</span> : null}
                  <Badge variant={currentNode.approval.status === 'published' ? 'success' : 'warning'}>{currentNode.approval.status}</Badge>
                  {room.stage_pinned ? <Badge variant="neutral">Stage pinned (frozen)</Badge> : null}
                  <span>
                    Node {currentIndex + 1} of {orderedIds.length}: <code>{currentNode.id}</code>
                  </span>
                </div>
                {room.hide_assistance ? (
                  <p className={styles.hiddenAssist}>Assistance hidden. The exact line stays available — press &ldquo;Show assistance&rdquo; to bring it back.</p>
                ) : (
                  <>
                    <p className={styles.primaryLine} data-primary-line>
                      {renderPrimaryLine(currentNode.primary_word_track, facts)}
                    </p>
                    <p className={styles.bridge}>Bridge: {currentNode.bridge_template}</p>
                  </>
                )}
                <div className={styles.controls}>
                  <Button onClick={() => goTo(orderedIds[currentIndex - 1] ?? null)} disabled={currentIndex <= 0 || room.stage_pinned}>
                    Previous
                  </Button>
                  <Button onClick={() => goTo(orderedIds[currentIndex + 1] ?? null)} disabled={currentIndex < 0 || currentIndex >= orderedIds.length - 1 || room.stage_pinned}>
                    Next node
                  </Button>
                  <label>
                    <VisuallyHidden>Select branch</VisuallyHidden>
                    <Select
                      aria-label="Select branch"
                      value=""
                      disabled={room.stage_pinned || currentNode.branches.length === 0}
                      onChange={(e) => {
                        const b = currentNode.branches.find((x) => x.answer_category === e.target.value);
                        if (!b) return;
                        if (b.next_node_id) goTo(b.next_node_id);
                        else setMessage('End of sequence — hand back to the human.');
                      }}
                      options={[
                        { value: '', label: 'Select branch…', disabled: true },
                        ...currentNode.branches.map((b) => ({ value: b.answer_category, label: `${b.label} → ${b.next_node_id ?? 'end of sequence'}` })),
                      ]}
                    />
                  </label>
                  <Button aria-pressed={room.stage_pinned} onClick={() => setRoom((prev) => ({ ...prev, stage_pinned: !prev.stage_pinned }))}>
                    {room.stage_pinned ? 'Unpin stage' : 'Pin stage'}
                  </Button>
                  <Button aria-pressed={room.hide_assistance} onClick={() => setRoom((prev) => ({ ...prev, hide_assistance: !prev.hide_assistance }))}>
                    {room.hide_assistance ? 'Show assistance' : 'Hide assistance'}
                  </Button>
                </div>
                <p className={styles.note}>
                  Manual advance: the stage you pinned is never overwritten — not by new transcript evidence and, later, not by a model recommendation.
                </p>
                <details className={styles.explain}>
                  <summary>Show stage explanation (Why this now)</summary>
                  <Stack gap={2}>
                    <p>{currentNode.why_this_now}</p>
                    <p>
                      <strong>Listen for:</strong> {currentNode.what_to_listen_for}
                    </p>
                    <p>
                      <strong>Complete when:</strong> {currentNode.completion_criteria}
                    </p>
                  </Stack>
                </details>
              </>
            ) : (
              <p className={styles.primaryLine}>{nodesPlaceholder ? 'Script nodes are not authored yet — placeholder line.' : 'No script node available.'}</p>
            )}
          </Card>
        </div>

        {/* ---------------- RIGHT ---------------- */}
        <div className={styles.column} onKeyDown={onStripKeyDown}>
          <section className={styles.strip} style={stripStyle} aria-labelledby="their-words-heading" data-their-words>
            <div className={styles.stripHead}>
              <h2 id="their-words-heading" className={styles.stripTitle}>
                Their words
              </h2>
              <div className={styles.sizeControls}>
                <button type="button" className={styles.sizeButton} aria-label="Decrease their-words size" disabled={size <= SIZE_MIN} onClick={() => setSize(Math.max(SIZE_MIN, size - SIZE_STEP))}>
                  A−
                </button>
                <span aria-live="polite">{size}px</span>
                <button type="button" className={styles.sizeButton} aria-label="Increase their-words size" disabled={size >= SIZE_MAX} onClick={() => setSize(Math.min(SIZE_MAX, size + SIZE_STEP))}>
                  A+
                </button>
              </div>
            </div>
            {resolved.pinned.length === 0 ? (
              <p className={styles.empty}>{played.length === 0 ? 'Nothing played yet. Use the synthetic player below.' : 'No pinnable phrase yet — keep playing turns.'}</p>
            ) : (
              <ol className={styles.pinList} aria-label="Pinned phrases">
                {resolved.pinned.map((c) => (
                  <li key={c.event.id}>
                    <button
                      type="button"
                      className={styles.pin}
                      data-pin
                      data-event-id={c.event.id}
                      aria-label={`${c.event.exact_text}: ${provenanceLabel(c.event)}. Pinned. Press P or Delete to unpin.`}
                      onClick={() => togglePin(c.event.id)}
                    >
                      <span className={styles.pinText} data-pin-text>
                        {c.event.exact_text}
                      </span>
                      <span className={styles.pinMeta}>
                        {provenanceLabel(c.event)}
                        {resolved.state.manual.includes(c.event.id) ? ' · pinned by you' : ''}
                      </span>
                      {c.event.meaning ? <span className={styles.pinMeaning}>means: {c.event.meaning}</span> : null}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {corrections.length > 0 ? (
              <div className={styles.corrections}>
                {corrections.map((c) => (
                  <p key={c.event_id}>
                    <span className={styles.correctionLine}>{c.line}</span>
                    {c.cue ? <span> — {c.cue}</span> : null}
                  </p>
                ))}
              </div>
            ) : null}
            <details className={styles.overflow}>
              <summary>
                {pinCountLabel(resolved.pinned.length, analysis.ranked.length)} · overflow ({resolved.overflow.length})
              </summary>
              {resolved.overflow.length === 0 ? (
                <p className={styles.empty}>No overflow.</p>
              ) : (
                <ul className={styles.overflowList}>
                  {resolved.overflow.map((c) => (
                    <li key={c.event.id}>
                      <button type="button" className={styles.pin} data-event-id={c.event.id} onClick={() => togglePin(c.event.id)}>
                        <span className={styles.pinText}>{c.event.exact_text}</span>
                        <span className={styles.pinMeta}>{provenanceLabel(c.event)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </details>
            <div className={styles.hint}>
              <KeyboardHint keys={['P']} action="pin / unpin the focused phrase" />
              <KeyboardHint keys={['Delete']} action="unpin the focused phrase" />
            </div>
            <p className={styles.status} role="status" aria-live="polite" data-strip-status>
              {message}
            </p>
          </section>

          <Card title="Confirmed facts" headingLevel="h2">
            {facts.length === 0 ? (
              <p className={styles.empty}>No facts yet.</p>
            ) : (
              <dl className={styles.factList}>
                {facts.map((f) => (
                  <div key={f.key} style={{ display: 'contents' }}>
                    <dt>{slotLabel(f.key)}</dt>
                    <dd>
                      {f.value} <Badge variant="neutral">{f.status.replace('_', ' ')}</Badge>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card title="One most useful missing field" headingLevel="h2">
            {currentNode ? (
              missing.length > 0 ? (
                <p className={styles.missing}>{slotLabel(missing[0]!)}</p>
              ) : (
                <p className={styles.empty}>Every slot this node needs is evidence-backed.</p>
              )
            ) : (
              <p className={styles.empty}>No node selected.</p>
            )}
            {analysis.lenses.length > 0 ? (
              <p className={styles.note}>
                Observed: {analysis.lenses.map((l) => `${l.label} (${l.status}, ${l.evidence_strength})`).join('; ')}
              </p>
            ) : null}
          </Card>

          <Card title="Candidates" headingLevel="h2">
            {candidates.length === 0 ? (
              <p className={styles.empty}>No further candidates.</p>
            ) : (
              <ul className={styles.candidateList}>
                {candidates.map((c) => (
                  <li key={c.event.id}>
                    <button
                      type="button"
                      className={styles.candidate}
                      data-candidate
                      data-event-id={c.event.id}
                      data-eligible={c.eligible ? 'true' : 'false'}
                      aria-label={`${c.event.exact_text}: ${c.exclusion ?? provenanceLabel(c.event)}${c.eligible ? '. Press P to pin.' : ''}`}
                      onClick={() => togglePin(c.event.id)}
                    >
                      <span className={styles.candidateText}>{c.event.exact_text}</span>
                      <span className={styles.candidateMeta}>{c.exclusion ?? provenanceLabel(c.event)}</span>
                      {c.event.invalidation ? (
                        <span className={styles.candidateMeta}>
                          now reads &ldquo;{c.event.invalidation.now_reads}&rdquo; ·{' '}
                          {room.clarified.includes(c.event.id) ? (
                            'clarification requested'
                          ) : (
                            <Button
                              variant="quiet"
                              onClick={(e) => {
                                e.stopPropagation();
                                clarify(c.event.id);
                              }}
                            >
                              Clarify
                            </Button>
                          )}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ---------------- BOTTOM ---------------- */}
        <details className={styles.bottom} open>
          <summary>Transcript &amp; synthetic player (secondary)</summary>
          <div className={styles.player}>
            <Button variant="primary" onClick={() => advance(cursor + 1)} disabled={cursor >= rawTurns.length}>
              Play next turn
            </Button>
            <Button onClick={() => advance(rawTurns.length)} disabled={cursor >= rawTurns.length}>
              Play all
            </Button>
            <Button variant="quiet" onClick={() => advance(0)} disabled={cursor === 0}>
              Reset
            </Button>
            <span>
              {cursor} of {rawTurns.length} provider events played
              {analysis.dropped.length > 0 ? ` · ${analysis.dropped.length} duplicate(s) dropped` : ''}
              {analysis.revisions.length > 0 ? ` · ${analysis.revisions.length} revision(s) applied` : ''}
            </span>
            {!roomHydrated ? <span className={styles.note}>Restoring pins…</span> : null}
          </div>
          {analysis.turns.length === 0 ? (
            <p className={styles.empty}>No turns played.</p>
          ) : (
            <ol className={styles.turns} aria-label="Transcript turns">
              {analysis.turns.map((t) => (
                <li key={t.utterance_id} className={[styles.turn, t.stability === 'interim' ? styles.turnInterim : ''].join(' ')}>
                  <div className={styles.turnMeta}>
                    <strong>{SPEAKER[t.speaker_role]}</strong>
                    <span>track: {t.track}</span>
                    <span>{t.stability === 'interim' ? 'provisional (interim)' : 'final'}</span>
                    {t.revision > 0 ? <span>revision {t.revision}</span> : null}
                    <Inline gap={1}>
                      <Badge variant="neutral">seq {t.provider_sequence}</Badge>
                    </Inline>
                  </div>
                  <div>{t.text}</div>
                </li>
              ))}
            </ol>
          )}
          {analysis.opt_out ? (
            <p className={styles.note}>
              Opt-out detected at {analysis.opt_out.turn_id}: stop immediately. No reframe, no second question.
            </p>
          ) : null}
          <p className={styles.note}>Pins cap at {PIN_MAX}. Interim text is shown as provisional and can never become a confirmed quote.</p>
        </details>
      </div>
    </div>
  );
}
