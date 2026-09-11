'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { z } from 'zod';
import { ScriptPublication, WordTrackVariant, type OfferVersion, type ScriptNode, type ScriptVersion, type SourceId, type UseClassification } from '@apohenia/domain/schemas';
import {
  OWN_WORDS_NOTE,
  STAGE_ORDER,
  STOP_ANSWER_CATEGORY,
  classificationGlyph,
  isOfferSlot,
  loadVersionGraph,
  publicationApproval,
  publishVersion,
  renderNodeCard,
  slotLabel,
  stageLabel,
  upsertWordTrackVariant,
  wordTrackVariantFor,
  type GraphValidation,
  type KnownFacts,
  type NodeCard,
} from '@apohenia/domain/scripts';
import { EMPTY_OFFER_STATUS_MAP, OFFER_STATUS_STORAGE_KEY, OfferStatusMap, applyOfferStatuses, statusGlyph } from '@apohenia/domain/offers';
import { Card, Chip, GlyphPill, Icon, IconButton, Sheet, SlotLine, Tile, TileGrid, Toast, TopBar, useToast } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './scripts.module.css';

export interface CitationInfo {
  id: string;
  title: string;
  classification: UseClassification;
  purpose: string;
  template: string;
  source: SourceId;
  section_id: string;
  section_title: string;
  delivery: string;
}

interface Props {
  versions: ScriptVersion[];
  nodes: ScriptNode[];
  seedVariants: WordTrackVariant[];
  offers: OfferVersion[];
  citations: Record<string, CitationInfo>;
  validations: { version_id: string; result: GraphValidation }[];
  placeholder: boolean;
  /** Node to select on first render (from `/scripts?node=<id>`, e.g. Source Library counterpart links). */
  initialNodeId?: string | null;
}

const Variants = z.array(WordTrackVariant);
const Publications = z.array(ScriptPublication);
const View = z.object({ stage: z.string(), sample_facts: z.boolean() });
type View = z.infer<typeof View>;

const EMPTY_VARIANTS: WordTrackVariant[] = [];
const EMPTY_PUBLICATIONS: ScriptPublication[] = [];
const INITIAL_VIEW: View = { stage: 'entry', sample_facts: false };

/** Fictional sample facts (demo only) — fill slots and show evidence-satisfied transitions. */
const SAMPLE_FACTS: KnownFacts = {
  prospect_name: 'Dana',
  dealership_name: 'Northgate Motors',
  documented_action: 'downloaded the inquiry checklist',
  stated_goal: 'every web inquiry answered the same day',
  stated_problem: 'evening and Saturday inquiries sit until the next working day',
  current_process: 'the sales@ inbox, whoever is on the desk',
  stated_impact: 'about a dozen missed appointments a month',
  their_word: 'control',
  setter_notes: 'goal: same-day answers; problem: unowned evening inquiries; impact: missed appointments',
  resource: 'the one-page inquiry checklist',
  reconnect_window: 'in two or three days',
  target_metric: 'nine in ten inquiries answered within an hour',
  new_goal: 'the same follow-through for phone-ups',
  original_promise: 'the weekly export',
  shift_reason: 'the new internet manager owns the desk now',
  key_pillar: 'the named handoff',
};
const NO_FACTS: KnownFacts = {};
const SAMPLE_FACTS_NAME = 'Sample facts (fictional, demo): fill slots with Northgate Motors sample answers to show interpolation and evidence-satisfied transitions. Off: slots show missing cues.';

type SheetState = { kind: 'node'; id: string } | { kind: 'source'; id: string; from: string } | { kind: 'publish' } | { kind: 'publication'; id: string } | { kind: 'status' } | null;

/** Routing notes that are not already carried by a missing-slot chip. */
function otherNotes(card: NodeCard): string[] {
  return card.routing_notes.filter((n) => !/^(Missing "|Offer not approved|Price not approved|Fictional offer)/.test(n));
}

function substageLabel(node: ScriptNode): string {
  return (node.substage ?? node.id).replace(/_/g, ' ');
}

/** Render text with `[missing: …]` / `[Price …]` / `[Offer …]` cues as slot chips (never invented values, never brackets on the stage). */
function withCues(text: string): ReactNode {
  return <SlotLine text={text} />;
}

function Caption({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className={styles.caption}>
      {children}
    </h3>
  );
}

export function ScriptsClient({ versions, nodes, seedVariants, offers, citations, validations, placeholder, initialNodeId = null }: Props) {
  const version = versions[0];
  const graph = useMemo(() => (version ? loadVersionGraph(version, nodes) : null), [version, nodes]);
  const validation = validations.find((v) => v.version_id === version?.id)?.result;

  // Deep link: `?node=<id>` selects that node's stage and opens its sheet; unknown ids are ignored.
  const linkedNode = initialNodeId ? (nodes.find((n) => n.id === initialNodeId) ?? null) : null;

  const [view, setView, viewHydrated] = useStoredState('scripts.view', View, INITIAL_VIEW);
  const [stageOverride, setStageOverride] = useState<string | null>(linkedNode?.stage ?? null);
  const stage = stageOverride ?? (viewHydrated ? view.stage : 'entry');
  const [currentId, setCurrentId] = useState<string | null>(linkedNode?.id ?? null);
  const [sheet, setSheet] = useState<SheetState>(linkedNode ? { kind: 'node', id: linkedNode.id } : null);
  const [toast, showToast] = useToast();

  const [variants, setVariants, variantsHydrated] = useStoredState('scripts.wordtracks', Variants, EMPTY_VARIANTS);
  const [publications, setPublications, pubsHydrated] = useStoredState('scripts.publications', Publications, EMPTY_PUBLICATIONS);
  // B-12: the Offer Studio's status store is the ONLY place an offer's status comes from.
  const [offerStatuses, , offersHydrated] = useStoredState(OFFER_STATUS_STORAGE_KEY, OfferStatusMap, EMPTY_OFFER_STATUS_MAP);
  const offer = useMemo(() => {
    const live = applyOfferStatuses(offers, offersHydrated ? offerStatuses : EMPTY_OFFER_STATUS_MAP);
    return live.find((o) => o.id === version?.offer_version_id) ?? null;
  }, [offers, offerStatuses, offersHydrated, version]);

  const sampleFacts = viewHydrated && view.sample_facts;
  const knownFacts = sampleFacts ? SAMPLE_FACTS : NO_FACTS;
  const allVariants = variantsHydrated ? variants : seedVariants;

  const chooseStage = useCallback(
    (s: string) => {
      setStageOverride(s);
      setView((v) => ({ ...v, stage: s }));
    },
    [setView],
  );

  const openNode = useCallback(
    (id: string) => {
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      setCurrentId(n.id);
      if (n.stage !== stage) chooseStage(n.stage);
      setSheet({ kind: 'node', id: n.id });
    },
    [nodes, stage, chooseStage],
  );

  // Scroll the deep-linked / newly selected card into view (no state changes here).
  useEffect(() => {
    if (!currentId) return;
    const el = document.querySelector<HTMLElement>(`[data-node-card][data-node-id="${CSS.escape(currentId)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [currentId, stage]);

  const stageNodes = useMemo(() => graph?.byStage.get(stage) ?? [], [graph, stage]);
  const stages = useMemo(() => STAGE_ORDER.filter((s) => (graph?.byStage.get(s)?.length ?? 0) > 0), [graph]);
  const railRef = useRef<HTMLDivElement>(null);

  function onRailKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = stages.indexOf(stage as (typeof stages)[number]);
    const next = stages[(i + (e.key === 'ArrowRight' ? 1 : -1) + stages.length) % stages.length];
    if (!next) return;
    chooseStage(next);
    railRef.current?.querySelector<HTMLButtonElement>(`[data-stage="${next}"]`)?.focus();
  }

  const cards = useMemo(() => {
    const out = new Map<string, NodeCard>();
    for (const n of stageNodes) out.set(n.id, renderNodeCard(n, { knownFacts, offer, version }));
    return out;
  }, [stageNodes, knownFacts, offer, version]);

  const sheetNode = sheet?.kind === 'node' ? (nodes.find((n) => n.id === sheet.id) ?? null) : null;
  const sheetCard = useMemo(() => (sheetNode ? renderNodeCard(sheetNode, { knownFacts, offer, version }) : null), [sheetNode, knownFacts, offer, version]);
  const sheetCitation = sheet?.kind === 'source' ? (citations[sheet.id] ?? null) : null;
  const sheetPublication = sheet?.kind === 'publication' ? (publications.find((p) => p.id === sheet.id) ?? null) : null;

  const versionPublications = useMemo(() => publications.filter((p) => p.version.id === version?.id), [publications, version]);
  const draftCount = graph ? graph.nodes.filter((n) => n.approval.status === 'draft').length : 0;

  function followBranch(nextId: string | null) {
    if (nextId === null) {
      setSheet(null);
      showToast('End of script · hand back');
      return;
    }
    openNode(nextId);
  }

  function publish() {
    if (!version) return;
    const pub = publishVersion(version, nodes);
    setPublications((prev) => [...prev.filter((p) => p.content_hash !== pub.content_hash || p.version.id !== pub.version.id), pub]);
    const approval = publicationApproval(pub);
    setSheet(null);
    showToast(`${approval.label === 'frozen draft' ? 'Frozen draft' : approval.label === 'published' ? 'Published' : 'Frozen · mixed'} · ${pub.content_hash.slice(0, 12)}`, 'green');
  }

  if (!version || !graph) {
    return (
      <div className={styles.empty} role="status">
        <span className={styles.emptyGlyph} aria-hidden="true">
          ∅
        </span>
        <span className={styles.emptyLabel}>{placeholder ? 'Placeholder' : 'No script'}</span>
      </div>
    );
  }

  const offerGlyph = offer ? statusGlyph(offer.status) : null;
  const versionGlyph = statusGlyph(version.status);

  return (
    <div className={styles.root} data-scripts data-stage={stage} data-current-node={currentId ?? ''} data-hydrated={viewHydrated && variantsHydrated && pubsHydrated && offersHydrated ? 'true' : 'false'}>
      <TopBar
        title="Script"
        right={
          <>
            <IconButton icon="info" label={`Version status: ${version.status}, ${draftCount} of ${graph.nodes.length} nodes draft; graph ${validation?.ok ? 'valid' : 'not validated'}; offer ${offer ? offer.status : 'none'}. Open.`} onClick={() => setSheet({ kind: 'status' })} data-status-open />
            <IconButton icon="bookmark" label="Sources" href="/sources" />
          </>
        }
      />

      {/* ---- stage rail ---- */}
      <div ref={railRef} className={styles.rail} role="group" aria-label="Stages" onKeyDown={onRailKey} data-stage-rail>
        {stages.map((s) => {
          const count = graph.byStage.get(s)?.length ?? 0;
          return (
            <Chip
              key={s}
              label={stageLabel(s)}
              name={`${stageLabel(s)}, ${count} ${count === 1 ? 'line' : 'lines'}`}
              toggle
              selected={s === stage}
              onClick={() => chooseStage(s)}
              data-stage={s}
              className={styles.railChip}
            />
          );
        })}
      </div>

      {/* ---- the lines of this stage: compact cards (stage chip · the line at 22px, faded · chevron) ---- */}
      <div className={styles.lines} data-stage-lines>
        {stageNodes.map((n) => {
          const card = cards.get(n.id);
          if (!card) return null;
          const approval = statusGlyph(card.approval_status);
          return (
            <div key={n.id} className={[styles.lineWrap, n.id === currentId ? styles.lineCurrent : ''].join(' ').trim()} data-node-card data-node-id={n.id} aria-current={n.id === currentId ? 'true' : undefined}>
              <Card onPress={() => openNode(n.id)} name={`${substageLabel(n)} — open`} data-line-next>
                <div className={styles.cardHead}>
                  <Chip static label={substageLabel(n)} tone="teal" name={`Stage ${substageLabel(n)}`} />
                  <GlyphPill glyph={approval.glyph} tone={approval.tone} name={`${approval.name} (node ${n.id})`} data-approval={card.approval_status} />
                  {card.practice_only ? <GlyphPill glyph="⊘" tone="purple" name="Study/practice only — never a live recommendation" data-practice-only /> : null}
                  {card.evidence.satisfied ? <GlyphPill glyph="✓" tone="teal" name="Already answered from known facts — offer the transition instead of asking twice" data-evidence-pill /> : null}
                </div>
                <div className={styles.cardLineBox}>
                  <span className={styles.cardLine} data-primary-line data-node-id={n.id}>
                    <SlotLine text={card.say_this ?? ''} />
                  </span>
                  <span className={styles.cardFade} aria-hidden="true" />
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* ---- publications + the docked Publish hero ---- */}
      {versionPublications.length > 0 ? (
        <div className={styles.publications} data-publications>
          {versionPublications.map((p) => {
            const approval = publicationApproval(p);
            return (
              <Card key={p.id} dense onPress={() => setSheet({ kind: 'publication', id: p.id })} name={`${approval.name}, ${new Date(p.published_at).toLocaleString()}. Open.`} data-publication data-publication-hash={p.content_hash} data-publication-label={approval.label}>
                <div className={styles.pubRow}>
                  <Icon name="lock" size={18} className={styles.pubIcon} />
                  <span className={styles.pubLabel}>{approval.label}</span>
                  <span className={styles.mono} aria-hidden="true">
                    {p.content_hash.slice(0, 12)}
                  </span>
                  <span className="sr-only">{p.content_hash}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
      <div className={styles.publishDock} data-publish-dock>
        <Tile icon="lock" label="Publish" size="lg" tone="green" name="Publish this version: freeze the wording as an immutable snapshot with a content hash. Node approval is not changed." onClick={() => setSheet({ kind: 'publish' })} disabled={!pubsHydrated} data-publish className={styles.publishTile} />
      </div>

      {/* ================= status sheet: version · graph · offer ================= */}
      <Sheet open={sheet?.kind === 'status'} onClose={() => setSheet(null)} title="Status" data-sheet="status">
        <div className={styles.sheetBody}>
          <div className={styles.pills} data-status-pills>
            <GlyphPill glyph={versionGlyph.glyph} label={versionGlyph.word} tone={versionGlyph.tone} name={`Version ${version.status}: ${draftCount} of ${graph.nodes.length} nodes draft — owner review required before live use`} data-version-pill />
            {validation?.ok ? (
              <GlyphPill glyph="✓" label="Graph" tone="green" name={`Graph valid: ${validation.stats.nodes} nodes, ${validation.stats.cited_record_ids} records cited, ${validation.stats.entrypoints} entrypoints, closed; opt-out reaches the stop node from every node`} data-graph-pill="ok" />
            ) : (
              <GlyphPill glyph="!" label="Graph" tone="orange" name={validation ? `Graph has ${validation.errors.length} error(s): ${validation.errors.join('; ')}` : 'Graph not validated'} data-graph-pill="error" />
            )}
            {offer && offerGlyph ? (
              <GlyphPill
                glyph={offerGlyph.glyph}
                label="Offer"
                tone={offerGlyph.tone}
                name={
                  offer.status === 'published'
                    ? `Linked offer "${offer.name}" is published — pillar wording may be spoken; the price is quoted only when it is set`
                    : `Linked offer "${offer.name}" is ${offer.status} — pillar and price slots render as cues until it is published in the Offer Studio`
                }
                data-offer-pill={offer.status}
              />
            ) : (
              <GlyphPill glyph="—" label="Offer" tone="neutral" name="No offer linked — pillar and price slots render as cues" data-offer-pill="none" />
            )}
          </div>
          <div className={styles.countRow}>
            <div className={styles.count} role="group" aria-label={`${draftCount} of ${graph.nodes.length} nodes draft`}>
              <span className={styles.countValue} aria-hidden="true">
                {draftCount}
              </span>
              <span className={styles.countKey} aria-hidden="true">
                draft
              </span>
            </div>
            <div className={styles.count} role="group" aria-label={`${graph.nodes.length} nodes`}>
              <span className={styles.countValue} aria-hidden="true">
                {graph.nodes.length}
              </span>
              <span className={styles.countKey} aria-hidden="true">
                nodes
              </span>
            </div>
            <div className={styles.count} role="group" aria-label={`${validation?.stats.cited_record_ids ?? 0} records cited`}>
              <span className={styles.countValue} aria-hidden="true">
                {validation?.stats.cited_record_ids ?? 0}
              </span>
              <span className={styles.countKey} aria-hidden="true">
                cited
              </span>
            </div>
            <div className={styles.count} role="group" aria-label={`${validation?.stats.entrypoints ?? 0} entrypoints`}>
              <span className={styles.countValue} aria-hidden="true">
                {validation?.stats.entrypoints ?? 0}
              </span>
              <span className={styles.countKey} aria-hidden="true">
                entries
              </span>
            </div>
          </div>
          <TileGrid columns={2}>
            <Tile icon="star" label="Offers" href="/offers" name="Offer Studio — the only place an offer status comes from" />
            <Tile icon="bookmark" label="Sources" href="/sources" name="Source Library" />
          </TileGrid>
        </div>
      </Sheet>

      {/* ================= node sheet ================= */}
      <Sheet open={sheet?.kind === 'node' && sheetNode !== null} onClose={() => setSheet(null)} title={sheetNode ? substageLabel(sheetNode) : 'Line'} data-sheet="node" tall>
        {sheetNode && sheetCard ? (
          <div className={styles.sheetBody} data-node-sheet={sheetNode.id}>
            <div className={styles.sheetHead}>
              <Chip static label={sheetCard.stage_label} tone="teal" name={`Stage ${sheetCard.stage_label}`} />
              <GlyphPill glyph={statusGlyph(sheetCard.approval_status).glyph} label={statusGlyph(sheetCard.approval_status).word} tone={statusGlyph(sheetCard.approval_status).tone} name={statusGlyph(sheetCard.approval_status).name} data-sheet-approval={sheetCard.approval_status} />
              {sheetCard.practice_only ? <GlyphPill glyph="⊘" label="Study" tone="purple" name="Study/practice only — never a live recommendation" /> : null}
              <Chip label="Facts" glyph="✦" toggle selected={sampleFacts} tone="purple" name={SAMPLE_FACTS_NAME} onClick={() => setView((v) => ({ ...v, sample_facts: !v.sample_facts }))} data-sample-facts className={styles.factsChip} />
            </div>

            <p className={styles.sayThis} data-say-this>
              {withCues(sheetCard.say_this ?? '')}
            </p>

            {sheetCard.evidence.satisfied ? (
              <Card tone="green" dense data-evidence-transition>
                <Caption>Already answered</Caption>
                <p className={styles.transition}>{sheetCard.evidence.transition ? withCues(sheetCard.evidence.transition) : sheetCard.evidence.rule}</p>
              </Card>
            ) : null}

            {sheetCard.missing_slots.length > 0 ? (
              <div className={styles.branches} role="group" aria-label="Missing before this line can be said" data-missing-slots>
                {sheetCard.missing_slots.map((slot) => {
                  const note = sheetCard.routing_notes.find((n) => n.startsWith(`Missing "${slotLabel(slot)}"`)) ?? `Missing "${slotLabel(slot)}"`;
                  const offerSlot = isOfferSlot(slot);
                  return <GlyphPill key={slot} glyph={offerSlot ? '◔' : '?'} label={slotLabel(slot)} tone="orange" name={offerSlot ? (sheetCard.routing_notes.find((n) => n.startsWith('Offer not approved') || n.startsWith('Price not approved') || n.startsWith('Fictional')) ?? note) : note} data-missing-slot={slot} />;
                })}
              </div>
            ) : null}
            {otherNotes(sheetCard).length > 0 ? (
              <ul className={styles.notes} data-routing-notes>
                {otherNotes(sheetCard).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}

            {sheetCard.why_this_now ? (
              <section aria-labelledby="why-now">
                <Caption id="why-now">Why now</Caption>
                <p className={styles.body}>{sheetCard.why_this_now}</p>
              </section>
            ) : null}

            {sheetCard.what_to_listen_for ? (
              <section aria-labelledby="listen-for">
                <Caption id="listen-for">Listen for</Caption>
                <p className={styles.body}>{sheetCard.what_to_listen_for}</p>
              </section>
            ) : null}

            {sheetCard.mirror_if_unclear.length > 0 ? (
              <section aria-labelledby="mirrors">
                <Caption id="mirrors">Mirrors</Caption>
                <div className={styles.mirrors}>
                  {sheetCard.mirror_if_unclear.map((m) => (
                    <div key={m} className={styles.mirror} data-mirror>
                      {withCues(m)}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {sheetCard.tone_pacing ? (
              <section aria-labelledby="tone">
                <Caption id="tone">
                  Tone <GlyphPill glyph="◔" label="Described" tone="neutral" name="Instructor-described cue — text from the transcripts, not audio-verified or measured" />
                </Caption>
                <p className={styles.body}>{sheetCard.tone_pacing.tone_cue}</p>
                <p className={styles.body}>{sheetCard.tone_pacing.pacing_cue}</p>
              </section>
            ) : null}

            <section aria-labelledby="branches">
              <Caption id="branches">Branches</Caption>
              <div className={styles.branches}>
                {sheetCard.next_branches.map((b) => {
                  const stop = b.answer_category === STOP_ANSWER_CATEGORY;
                  const end = b.next_node_id === null;
                  const target = b.next_node_id ? nodes.find((n) => n.id === b.next_node_id) : null;
                  const name = `${b.label}${end ? ' — end of script, hand back' : target ? ` — go to ${substageLabel(target)}` : ''}${b.note ? `. ${b.note}` : ''}`;
                  return (
                    <Chip
                      key={b.answer_category}
                      label={b.label}
                      glyph={stop ? '⊘' : end ? '∅' : undefined}
                      tone={stop ? 'red' : 'neutral'}
                      name={name}
                      onClick={() => followBranch(b.next_node_id)}
                      data-branch={b.answer_category}
                      data-implicit={b.implicit ? 'true' : undefined}
                      className={styles.branchChip}
                    />
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="sources">
              <Caption id="sources">Sources</Caption>
              <div className={styles.branches}>
                {sheetCard.source_question_ids.length === 0 ? (
                  <GlyphPill glyph="✦" label="Apohenia" tone="purple" name={`Apohenia addition — no source counterpart. ${sheetCard.source_note ?? ''}`} data-apohenia-addition />
                ) : (
                  sheetCard.source_question_ids.map((id) => {
                    const c = citations[id];
                    const g = c ? classificationGlyph(c.classification) : null;
                    return (
                      <Chip
                        key={id}
                        label={id}
                        glyph={g?.glyph ?? '?'}
                        tone={g ? (g.tone === 'orange' ? 'gold' : g.tone) : 'gold'}
                        name={c && g ? `${id} — ${c.title}. ${g.name}. Open record.` : `${id} — not in the source package`}
                        onClick={() => setSheet({ kind: 'source', id, from: sheetNode.id })}
                        data-citation={id}
                        className={styles.mono}
                      />
                    );
                  })
                )}
              </div>
              {sheetCard.source_note ? <p className={styles.note}>{sheetCard.source_note}</p> : null}
            </section>

            <section aria-labelledby="your-words">
              <Caption id="your-words">Your words</Caption>
              <div className={styles.locked} data-primary-unchanged>
                <Icon name="lock" size={16} label="Primary line, locked — your words never change it" className={styles.lockIcon} />
                <span>{sheetNode.primary_word_track}</span>
              </div>
              <textarea
                className={styles.textarea}
                value={wordTrackVariantFor(allVariants, sheetNode.id)?.own_text ?? ''}
                disabled={!variantsHydrated}
                onChange={(e) => setVariants((prev) => upsertWordTrackVariant(prev, sheetNode.id, e.target.value))}
                aria-label={`Your words for ${sheetNode.id}`}
                aria-describedby="own-words-note"
                rows={3}
                data-own-words
              />
              <span id="own-words-note" className="sr-only">
                {OWN_WORDS_NOTE}
              </span>
            </section>
          </div>
        ) : null}
      </Sheet>

      {/* ================= source record sheet ================= */}
      <Sheet open={sheet?.kind === 'source'} onClose={() => setSheet(sheet?.kind === 'source' ? { kind: 'node', id: sheet.from } : null)} title={sheet?.kind === 'source' ? sheet.id : 'Source'} data-sheet="source">
        {sheet?.kind === 'source' ? (
          sheetCitation ? (
            <div className={styles.sheetBody} data-source-sheet={sheetCitation.id}>
              <div className={styles.sheetHead}>
                <Chip static label={`Source ${sheetCitation.source}`} name={`Source ${sheetCitation.source}`} />
                <Chip static label={sheetCitation.section_id} name={`Section ${sheetCitation.section_id} — ${sheetCitation.section_title}`} className={styles.mono} />
                {(() => {
                  const g = classificationGlyph(sheetCitation.classification);
                  return <GlyphPill glyph={g.glyph} label={g.word} tone={g.tone} name={g.name} data-classification={sheetCitation.classification} />;
                })()}
              </div>
              <p className={styles.sourceTitle}>{sheetCitation.title}</p>
              <section aria-labelledby="src-template">
                <Caption id="src-template">
                  Template <GlyphPill glyph="≈" label="Normalized" tone="neutral" name="Normalized template — an editorial reconstruction, not verbatim; the unchanged excerpt is in the record" />
                </Caption>
                <p className={styles.template}>{sheetCitation.template}</p>
              </section>
              <section aria-labelledby="src-purpose">
                <Caption id="src-purpose">Purpose</Caption>
                <p className={styles.body}>{sheetCitation.purpose}</p>
              </section>
              <TileGrid columns={2}>
                <Tile icon="bookmark" label="Open record" href={`/sources/${encodeURIComponent(sheetCitation.id)}`} name={`Open record ${sheetCitation.id} in the Source Library`} />
                <Tile icon="arrow-left" label="Back" onClick={() => setSheet({ kind: 'node', id: sheet.from })} />
              </TileGrid>
            </div>
          ) : (
            <div className={styles.sheetBody}>
              <GlyphPill glyph="—" label="Not supplied" tone="orange" name={`Record ${sheet.id} is not in the supplied source package`} />
            </div>
          )
        ) : null}
      </Sheet>

      {/* ================= publish confirm ================= */}
      <Sheet open={sheet?.kind === 'publish'} onClose={() => setSheet(null)} title="Publish" data-sheet="publish">
        <p className={styles.confirmCaption} data-publish-caption>
          Wording freezes · approval unchanged
        </p>
        <span className="sr-only">
          Publishing stores an immutable snapshot of every line with a SHA-256 content hash. It does not approve any node: {draftCount} of {graph.nodes.length} nodes stay draft and the snapshot is labelled a frozen draft.
        </span>
        <TileGrid columns={2}>
          <Tile icon="lock" label="Publish" tone="green" onClick={publish} data-confirm-publish name="Publish: freeze wording now" />
          <Tile icon="x" label="Cancel" onClick={() => setSheet(null)} data-cancel-publish />
        </TileGrid>
      </Sheet>

      {/* ================= publication detail ================= */}
      <Sheet open={sheet?.kind === 'publication' && sheetPublication !== null} onClose={() => setSheet(null)} title="Snapshot" data-sheet="publication">
        {sheetPublication ? (
          (() => {
            const approval = publicationApproval(sheetPublication);
            return (
              <div className={styles.sheetBody} data-publication-sheet={sheetPublication.id}>
                <div className={styles.sheetHead}>
                  <GlyphPill glyph="🔒" label={approval.label} tone={approval.label === 'published' ? 'green' : 'orange'} name={approval.name} data-publication-approval={approval.label} />
                </div>
                <div className={styles.countRow}>
                  {(Object.keys(approval.counts) as (keyof typeof approval.counts)[]).map((k) => {
                    const g = statusGlyph(k);
                    return (
                      <div key={k} className={styles.count} role="group" aria-label={`${g.word}: ${approval.counts[k]} nodes`}>
                        <span className={styles.countValue} aria-hidden="true">
                          {approval.counts[k]}
                        </span>
                        <span className={styles.countKey} aria-hidden="true">
                          {g.glyph} {g.word}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <section aria-labelledby="pub-hash">
                  <Caption id="pub-hash">Hash</Caption>
                  <p className={[styles.mono, styles.hash].join(' ')} data-publication-full-hash>
                    {sheetPublication.content_hash}
                  </p>
                </section>
                <section aria-labelledby="pub-when">
                  <Caption id="pub-when">When</Caption>
                  <p className={styles.body}>{new Date(sheetPublication.published_at).toLocaleString()}</p>
                </section>
              </div>
            );
          })()
        ) : null}
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}
