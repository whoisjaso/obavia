'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';
import {
  AssistanceMode,
  DEFAULT_ASSISTANCE_MODE,
  ScriptPublication,
  WordTrackVariant,
  type OfferVersion,
  type ScriptNode,
  type ScriptVersion,
  type UseClassification,
} from '@apohenia/domain/schemas';
import {
  ENTRYPOINTS,
  OWN_WORDS_NOTE,
  entryNode,
  loadVersionGraph,
  publishVersion,
  renderNodeCard,
  stageLabel,
  upsertWordTrackVariant,
  wordTrackVariantFor,
  type GraphValidation,
  type KnownFacts,
} from '@apohenia/domain/scripts';
import { Badge, Button, Card, Field, Inline, Select, Stack } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './scripts.module.css';

export interface CitationInfo {
  id: string;
  title: string;
  classification: UseClassification;
  purpose: string;
}

interface Props {
  versions: ScriptVersion[];
  nodes: ScriptNode[];
  seedVariants: WordTrackVariant[];
  offers: OfferVersion[];
  citations: Record<string, CitationInfo>;
  validations: { version_id: string; result: GraphValidation }[];
  placeholder: boolean;
  /** Node to open on first render (from `/scripts?node=<id>`, e.g. Source Library counterpart links). */
  initialNodeId?: string | null;
}

const Variants = z.array(WordTrackVariant);
const Publications = z.array(ScriptPublication);
const EMPTY_VARIANTS: WordTrackVariant[] = [];
const EMPTY_PUBLICATIONS: ScriptPublication[] = [];

/** Sample confirmed facts for the demo — all FICTIONAL, labelled as such in the UI. */
const SAMPLE_FACTS: { key: string; value: string }[] = [
  { key: 'prospect_name', value: 'Dana' },
  { key: 'dealership_name', value: 'Northgate Motors (fictional)' },
  { key: 'documented_action', value: 'downloaded the inquiry checklist' },
  { key: 'stated_goal', value: 'every web inquiry answered the same day' },
  { key: 'stated_problem', value: 'evening and Saturday inquiries sit until the next working day' },
  { key: 'current_process', value: 'the sales@ inbox, whoever is on the desk' },
  { key: 'stated_impact', value: 'about a dozen missed appointments a month' },
  { key: 'their_word', value: 'control' },
  { key: 'setter_notes', value: 'goal: same-day answers; problem: unowned evening inquiries; impact: missed appointments' },
  { key: 'resource', value: 'the one-page inquiry checklist' },
  { key: 'reconnect_window', value: 'in two or three days' },
  { key: 'target_metric', value: 'nine in ten inquiries answered within an hour' },
  { key: 'new_goal', value: 'the same follow-through for phone-ups' },
  { key: 'original_promise', value: 'the weekly export' },
];

const MODE_LABELS: Record<AssistanceMode, string> = {
  full_script: 'Full exact script (default)',
  recall_with_reveal: 'Recall with reveal',
  primary_plus_mirror: 'Primary line plus mirror',
  stage_purpose_cue: 'Stage-purpose cue',
  unassisted: 'Unassisted',
};

const CLASS_BADGE: Record<UseClassification, { variant: 'neutral' | 'info' | 'warning'; label: string }> = {
  adapt: { variant: 'info', label: 'adapt (not live approval)' },
  study_only: { variant: 'warning', label: 'study only' },
  private_training: { variant: 'warning', label: 'private training' },
};

/** Render text with `[missing: …]` / `[Price …]` cues visibly marked. */
function withCues(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) =>
    /^\[[^\]]+\]$/.test(p) ? (
      <mark key={i} className={styles.missingCue} data-missing-cue>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function ScriptsClient({ versions, nodes, seedVariants, offers, citations, validations, placeholder, initialNodeId = null }: Props) {
  // Deep link: `?node=<id>` selects that node (and its owning version) on first render; ignored when unknown.
  const linkedNode = initialNodeId ? nodes.find((n) => n.id === initialNodeId) ?? null : null;
  const linkedVersion = linkedNode ? versions.find((v) => v.node_ids.includes(linkedNode.id)) : undefined;
  const [versionId, setVersionId] = useState(linkedVersion?.id ?? versions[0]?.id ?? '');
  const version = versions.find((v) => v.id === versionId) ?? versions[0];
  const graph = useMemo(() => (version ? loadVersionGraph(version, nodes) : null), [version, nodes]);
  const offer = useMemo(() => offers.find((o) => o.id === version?.offer_version_id) ?? null, [offers, version]);
  const validation = validations.find((v) => v.version_id === version?.id)?.result;

  const [entrypoint, setEntrypoint] = useState<string>('inbound');
  const [currentId, setCurrentId] = useState<string | null>(linkedNode?.id ?? null);
  const [facts, setFacts] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const [path, setPath] = useState<string[]>([]);
  const [endNotice, setEndNotice] = useState<string | null>(null);

  const [settingsMode, , settingsHydrated] = useStoredState<AssistanceMode>('settings.assistance_mode', AssistanceMode, DEFAULT_ASSISTANCE_MODE);
  const [modeOverride, setModeOverride] = useState<AssistanceMode | null>(null);
  const mode: AssistanceMode = modeOverride ?? settingsMode;

  const [variants, setVariants, variantsHydrated] = useStoredState('scripts.wordtracks', Variants, EMPTY_VARIANTS);
  const [publications, setPublications, pubsHydrated] = useStoredState('scripts.publications', Publications, EMPTY_PUBLICATIONS);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  const entry = version ? entryNode(version, nodes, entrypoint) : undefined;
  const current = (currentId ? graph?.byId.get(currentId) : undefined) ?? entry ?? graph?.nodes[0];

  // Scroll the deep-linked node's list entry into view once after mount (no state changes here).
  useEffect(() => {
    if (!linkedNode) return;
    document.querySelector(`[data-node-id="${CSS.escape(linkedNode.id)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [linkedNode]);

  const knownFacts: KnownFacts = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of SAMPLE_FACTS) if (facts[f.key]) out[f.key] = f.value;
    return out;
  }, [facts]);

  const card = current ? renderNodeCard(current, { knownFacts, offer, assistanceMode: mode, revealed }) : null;

  const allVariants = variantsHydrated ? variants : seedVariants;
  const ownVariant = current ? wordTrackVariantFor(allVariants, current.id) : undefined;
  const versionPublications = publications.filter((p) => p.version.id === version?.id);

  function goTo(id: string | null) {
    setRevealed(false);
    if (id === null) {
      setEndNotice(`End of sequence after ${current?.id ?? 'this node'} — hand back to the human. Nothing further is scripted.`);
      return;
    }
    setEndNotice(null);
    setPath((p) => (current ? [...p, current.id] : p));
    setCurrentId(id);
  }

  function chooseEntry(ep: string) {
    setEntrypoint(ep);
    setPath([]);
    setRevealed(false);
    setEndNotice(null);
    const n = version ? entryNode(version, nodes, ep) : undefined;
    setCurrentId(n?.id ?? null);
  }

  function onPublish() {
    if (!version) return;
    const pub = publishVersion(version, nodes);
    setPublications((prev) => [...prev.filter((p) => p.content_hash !== pub.content_hash || p.version.id !== pub.version.id), pub]);
    setPublishNotice(`Published snapshot ${pub.content_hash.slice(0, 12)}… at ${pub.published_at}. Wording is frozen; node approval stays as recorded.`);
  }

  if (!version || !graph || !current || !card) {
    return <p role="status">No script version is available{placeholder ? ' (placeholder seed)' : ''}.</p>;
  }

  const stageGroups = [...graph.byStage.entries()];
  const draftNodes = graph.nodes.filter((n) => n.approval.status === 'draft').length;

  return (
    <Stack gap={4}>
      <div className={styles.statusLine} data-validate-status role="status">
        <strong>Graph check:</strong>
        {validation?.ok ? (
          <Badge variant="success">valid — {validation.stats.nodes} nodes, {validation.stats.cited_record_ids} records cited, {validation.stats.entrypoints} entrypoints, closed graph</Badge>
        ) : (
          <Badge variant="warning">{validation ? `${validation.errors.length} error(s)` : 'not validated'}</Badge>
        )}
        <Badge variant="warning">{draftNodes} of {graph.nodes.length} nodes draft</Badge>
        <Badge variant="neutral">price placement: {version.price_placement.replace('_', ' ')}</Badge>
        {offer ? <Badge variant={offer.status === 'published' ? 'success' : 'warning'}>offer: {offer.name} · {offer.status}</Badge> : <Badge variant="warning">no offer linked</Badge>}
      </div>
      {validation && !validation.ok ? (
        <ul className={styles.list}>
          {validation.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.layout}>
        {/* ---------------- left: selectors + node list ---------------- */}
        <div className={styles.column}>
          <Card title="Version and entrypoint" headingLevel="h2">
            <Stack gap={3}>
              <Field id="script-version" label="Script version">
                {(control) => (
                  <Select
                    {...control}
                    value={version.id}
                    onChange={(e) => {
                      setVersionId(e.target.value);
                      setCurrentId(null);
                      setPath([]);
                    }}
                    options={versions.map((v) => ({ value: v.id, label: `${v.name} (${v.status})` }))}
                  />
                )}
              </Field>
              <Field id="script-entrypoint" label="Entrypoint">
                {(control) => (
                  <Select {...control} value={entrypoint} onChange={(e) => chooseEntry(e.target.value)} options={ENTRYPOINTS.map((ep) => ({ value: ep, label: ep.replace('_', ' ') }))} />
                )}
              </Field>
              <Field id="assistance-mode" label="Assistance mode" help={settingsHydrated && modeOverride === null ? 'Default from Settings. Reducing assistance is optional and reversible.' : 'Changed for this page only; Settings keeps its default.'}>
                {(control) => (
                  <Select {...control} value={mode} onChange={(e) => setModeOverride(AssistanceMode.parse(e.target.value))} options={AssistanceMode.options.map((m) => ({ value: m, label: MODE_LABELS[m] }))} />
                )}
              </Field>
            </Stack>
          </Card>

          <Card title="Nodes by stage" headingLevel="h2">
            <nav aria-label="Script nodes">
              {stageGroups.map(([stage, list]) => (
                <div key={stage}>
                  <h3 className={styles.stageHeading}>{stageLabel(stage)}</h3>
                  <ul className={styles.stageGroup}>
                    {list.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={[styles.nodeButton, n.id === current.id ? styles.nodeButtonActive : ''].join(' ')}
                          aria-current={n.id === current.id ? 'true' : undefined}
                          onClick={() => {
                            setRevealed(false);
                            setEndNotice(null);
                            setCurrentId(n.id);
                          }}
                          data-node-id={n.id}
                        >
                          <span>
                            {n.substage?.replace(/_/g, ' ') ?? n.id}
                            {n.practice_only ? ' · study/practice only' : ''}
                          </span>
                          <Badge variant={n.approval.status === 'draft' ? 'warning' : n.approval.status === 'published' ? 'success' : 'info'}>{n.approval.status}</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </Card>
        </div>

        {/* ---------------- center: node card ---------------- */}
        <div className={styles.column}>
          <Card headingLevel="h2" data-node-card data-current-node={current.id}>
            <Stack gap={4}>
              <div className={styles.headerRow}>
                <div>
                  <h2>{card.stage_label}{card.substage ? ` · ${card.substage.replace(/_/g, ' ')}` : ''}</h2>
                  <span className={styles.nodeId}>{current.id}</span>
                </div>
                <Inline gap={2}>
                  <Badge variant={card.approval_status === 'draft' ? 'warning' : 'success'}>{card.approval_status}</Badge>
                  {card.practice_only ? <Badge variant="warning">study/practice only</Badge> : null}
                  <Badge variant="neutral">{current.role_applicability.join(' · ')}</Badge>
                </Inline>
              </div>

              {card.evidence.satisfied && card.evidence.transition ? (
                <div className={styles.transition} data-evidence-transition>
                  <strong>Evidence-satisfied — offer this transition instead of asking twice:</strong> {withCues(card.evidence.transition)}
                </div>
              ) : null}

              <section aria-labelledby="say-this-heading">
                <h3 id="say-this-heading" className={styles.sectionTitle}>
                  Say this
                </h3>
                {card.say_this !== null ? (
                  <p className={styles.sayThis} data-say-this>
                    {withCues(card.say_this)}
                  </p>
                ) : (
                  <div>
                    <p className={[styles.sayThis, styles.sayThisHidden].join(' ')} data-say-this-hidden>
                      {mode === 'recall_with_reveal' ? 'Line hidden — recall it, then reveal.' : `Hidden in “${MODE_LABELS[mode]}” mode. Stage: ${card.stage_label}.`}
                    </p>
                    {mode === 'recall_with_reveal' ? (
                      <Button onClick={() => setRevealed(true)} style={{ marginTop: 'var(--space-2)' }}>
                        Reveal the line
                      </Button>
                    ) : null}
                  </div>
                )}
                {card.routing_notes.length > 0 ? (
                  <ul className={styles.list} data-routing-notes style={{ marginTop: 'var(--space-2)' }}>
                    {card.routing_notes.map((n) => (
                      <li key={n} className={styles.note}>
                        {n}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {card.why_this_now ? (
                <section aria-labelledby="why-heading">
                  <h3 id="why-heading" className={styles.sectionTitle}>
                    Why this now
                  </h3>
                  <p className={styles.sectionBody}>{card.why_this_now}</p>
                </section>
              ) : null}

              {card.what_to_listen_for ? (
                <section aria-labelledby="listen-heading">
                  <h3 id="listen-heading" className={styles.sectionTitle}>
                    What to listen for
                  </h3>
                  <p className={styles.sectionBody}>{card.what_to_listen_for}</p>
                </section>
              ) : null}

              {card.mirror_if_unclear.length > 0 ? (
                <section aria-labelledby="mirror-heading">
                  <h3 id="mirror-heading" className={styles.sectionTitle}>
                    Mirror if unclear
                  </h3>
                  <ul className={styles.mirrorList}>
                    {card.mirror_if_unclear.map((m) => (
                      <li key={m} className={styles.mirrorItem} data-mirror>
                        {withCues(m)}
                      </li>
                    ))}
                  </ul>
                  <p className={styles.note}>Mirrors seek the same answer type. Choosing one never changes the primary line.</p>
                </section>
              ) : null}

              {card.tone_pacing ? (
                <section aria-labelledby="tone-heading">
                  <h3 id="tone-heading" className={styles.sectionTitle}>
                    Tone and pacing cue <Badge variant="neutral">instructor-described</Badge>
                  </h3>
                  <p className={styles.sectionBody}>
                    <strong>Tone:</strong> {card.tone_pacing.tone_cue}
                  </p>
                  <p className={styles.sectionBody}>
                    <strong>Pacing:</strong> {card.tone_pacing.pacing_cue}
                  </p>
                </section>
              ) : null}

              {card.next_branches.length > 0 ? (
                <section aria-labelledby="branches-heading">
                  <h3 id="branches-heading" className={styles.sectionTitle}>
                    Next likely branches
                  </h3>
                  <div className={styles.branchGrid}>
                    {card.next_branches.map((b) => (
                      <Button key={b.answer_category} onClick={() => goTo(b.next_node_id)} data-branch={b.answer_category} title={b.note}>
                        {b.label}
                        {b.next_node_id === null ? ' (end)' : ''}
                      </Button>
                    ))}
                  </div>
                  {card.next_branches.some((b) => b.note) ? (
                    <ul className={styles.list} style={{ marginTop: 'var(--space-2)' }}>
                      {card.next_branches
                        .filter((b) => b.note)
                        .map((b) => (
                          <li key={b.answer_category} className={styles.note}>
                            <strong>{b.label}:</strong> {b.note}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}

              {endNotice ? (
                <p role="status" className={styles.transition} data-end-notice>
                  {endNotice}
                </p>
              ) : null}

              {path.length > 0 ? (
                <p className={styles.note} data-path>
                  Path: {path.join(' → ')} → <strong>{current.id}</strong>
                </p>
              ) : null}

              <details>
                <summary>Completion criteria, stop conditions, answer examples</summary>
                <Stack gap={2} style={{ marginTop: 'var(--space-2)' }}>
                  <p>
                    <strong>Intended answer type:</strong> {current.intended_answer_type}
                  </p>
                  <p>
                    <strong>Completion:</strong> {current.completion_criteria}
                  </p>
                  <p>
                    <strong>Bridge:</strong> <code>{current.bridge_template}</code>
                  </p>
                  <p>
                    <strong>Sufficient:</strong> {current.sufficient_answer_examples.join(' · ')}
                  </p>
                  <p>
                    <strong>Insufficient:</strong> {current.insufficient_answer_examples.join(' · ')}
                  </p>
                  <p>
                    <strong>Stop / skip:</strong> {current.stop_or_skip_conditions.join(' ')}
                  </p>
                  {current.facts_already_known_rule ? (
                    <p>
                      <strong>Facts already known:</strong> {current.facts_already_known_rule}
                    </p>
                  ) : null}
                </Stack>
              </details>
            </Stack>
          </Card>

          <Card title="Source citations" headingLevel="h2">
            {current.source_question_ids.length === 0 ? (
              <p className={styles.note}>No source citation — Apohenia addition.</p>
            ) : (
              <ul className={styles.citationList}>
                {current.source_question_ids.map((id) => {
                  const c = citations[id];
                  const badge = c ? CLASS_BADGE[c.classification] : { variant: 'warning' as const, label: 'unknown record' };
                  return (
                    <li key={id} className={styles.citationItem}>
                      <Link href={`/sources/${id}`} data-citation={id}>
                        {id}
                      </Link>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className={styles.note}>{c?.title ?? 'not in the source package'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {current.source_note ? (
              <p className={styles.note} style={{ marginTop: 'var(--space-3)' }}>
                <strong>Source note:</strong> {current.source_note}
              </p>
            ) : null}
            <p className={styles.note} style={{ marginTop: 'var(--space-2)' }}>
              Own lines cite record ids. They are never source quotes; the source template lives in the Source Library.
            </p>
          </Card>
        </div>

        {/* ---------------- right: facts, own words, publish ---------------- */}
        <div className={styles.column}>
          <Card title="Facts known (sample, fictional)" headingLevel="h2">
            <p className={styles.note} style={{ marginBottom: 'var(--space-2)' }}>
              Toggle confirmed facts to see slot interpolation and evidence-satisfied transitions. A slot without a fact shows a missing cue.
            </p>
            <ul className={styles.factList}>
              {SAMPLE_FACTS.map((f) => (
                <li key={f.key}>
                  <label className={styles.factLabel}>
                    <input type="checkbox" checked={facts[f.key] === true} onChange={(e) => setFacts((prev) => ({ ...prev, [f.key]: e.target.checked }))} data-fact={f.key} />
                    <span>
                      <span className={styles.factKey}>{f.key}</span> — {f.value}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Your own words" headingLevel="h2">
            <Field id="own-words" label={`Own wording for ${current.id}`} help={OWN_WORDS_NOTE}>
              {(control) => (
                <textarea
                  {...control}
                  className={styles.textarea}
                  value={ownVariant?.own_text ?? ''}
                  disabled={!variantsHydrated}
                  onChange={(e) => setVariants((prev) => upsertWordTrackVariant(prev, current.id, e.target.value))}
                  data-own-words
                />
              )}
            </Field>
            <p className={styles.note} data-own-words-note>
              Primary line (unchanged): <q data-primary-unchanged>{current.primary_word_track}</q>
            </p>
            {ownVariant ? <p className={styles.note}>Last edited {ownVariant.edited_at}</p> : null}
          </Card>

          <Card title="Publish this version" headingLevel="h2">
            <Stack gap={2}>
              <p className={styles.note}>
                Publishing stores an immutable snapshot with a SHA-256 content hash. It freezes wording; it does not approve nodes — every node keeps its recorded approval status.
              </p>
              <Button variant="primary" onClick={onPublish} disabled={!pubsHydrated} data-publish>
                Publish this version
              </Button>
              {publishNotice ? (
                <p role="status" className={styles.note} data-publish-notice>
                  {publishNotice}
                </p>
              ) : null}
              {versionPublications.length > 0 ? (
                <ul className={styles.list} data-publications>
                  {versionPublications.map((p) => (
                    <li key={p.id}>
                      <span className={styles.mono} data-publication-hash>
                        {p.content_hash}
                      </span>
                      <br />
                      <span className={styles.note}>{p.published_at} · frozen wording snapshot · nodes still {p.nodes.every((n) => n.approval.status === 'draft') ? 'draft' : 'mixed approval'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.note}>{pubsHydrated ? 'No publications yet.' : 'Reading local storage…'}</p>
              )}
            </Stack>
          </Card>
        </div>
      </div>
    </Stack>
  );
}
