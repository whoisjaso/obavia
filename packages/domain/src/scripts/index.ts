/**
 * Script engine — owning module agent: M-script.
 *
 * Pure TypeScript (no React, no browser APIs). Implements brief §6:
 * - version graph loading, entrypoints, branch resolution, stage ordering;
 * - evidence-satisfied transitions (never ask twice — scenario 3);
 * - node-card rendering with slot interpolation ONLY from confirmed facts / approved offer
 *   attributes (missing slot → visible cue; null price → "Price not approved yet" — scenarios 6, 38);
 * - assistance-mode masking (full_script default);
 * - graph validation against the 207 source records (no study_only in primary citations);
 * - immutable publication with a real SHA-256 content hash (pure implementation, no deps);
 * - own-words WordTrackVariant helpers that never touch primary_word_track (scenario 29).
 */
import type { SourceQuestionRecord, UseClassification } from '../schemas/sources';
import type { OfferVersion } from '../schemas/offers';
import type { AssistanceMode } from '../schemas/practice';
import {
  ScriptEntrypoint,
  ScriptStage,
  type ScriptBranch,
  type ScriptNode,
  type ScriptPublication,
  type ScriptVersion,
  type WordTrackVariant,
} from '../schemas/scripts';
import { isApprovedForQuoting, quotedPriceSentence } from '../offers';

export const MODULE = 'scripts' as const;

// ------------------------------------------------------------------ stages

export const STAGE_ORDER: readonly ScriptStage[] = ScriptStage.options;

export const STAGE_LABELS: Record<ScriptStage, string> = {
  entry: 'Entry',
  intent: 'Intent',
  logical_certainty: 'Logical certainty',
  setter_transition: 'Setter transition',
  emotional_certainty: 'Emotional certainty',
  future: 'Positive future',
  consequence: 'Consequence',
  commitment: 'Commitment',
  pitch: 'Pitch',
  decision: 'Decision',
  concern: 'Concern',
  exit: 'Exit',
  follow_up: 'Follow-up',
  referral: 'Referral',
  upsell: 'Upsell',
};

/** Display index of a stage; unknown stages sort last. */
export function stageOrder(stage: string): number {
  const i = (STAGE_ORDER as readonly string[]).indexOf(stage);
  return i === -1 ? STAGE_ORDER.length : i;
}

export function stageLabel(stage: string): string {
  return (STAGE_LABELS as Record<string, string>)[stage] ?? stage;
}

export const ENTRYPOINTS: readonly ScriptEntrypoint[] = ScriptEntrypoint.options;

// ------------------------------------------------------------------ classification glyphs

export interface ClassificationGlyph {
  glyph: string;
  /** ≤2 visible words. */
  word: string;
  /** The whole truth, for the accessible name (DESIGN_SYSTEM §0.6). */
  name: string;
  tone: 'teal' | 'orange' | 'purple';
  /** True only for `adapt` — the only classification a live node may cite. */
  liveEligible: boolean;
}

/** Glyph + accessible meaning for a source record's use classification (never an approval). */
export function classificationGlyph(c: UseClassification): ClassificationGlyph {
  switch (c) {
    case 'adapt':
      return { glyph: '◔', word: 'Adapt', name: 'Adapt: study material a live line may cite in its own words; not live approval', tone: 'teal', liveEligible: true };
    case 'study_only':
      return { glyph: '⊘', word: 'Study only', name: 'Study only: readable for study; never a live recommendation and never cited by a live line', tone: 'orange', liveEligible: false };
    case 'private_training':
      return { glyph: '◌', word: 'Private', name: 'Private training: may be cited only by a practice-only line; never live', tone: 'purple', liveEligible: false };
    default:
      return { glyph: '?', word: String(c), name: `Unknown classification ${String(c)}`, tone: 'orange', liveEligible: false };
  }
}

// ------------------------------------------------------------------ graph

export interface VersionGraph {
  version: ScriptVersion;
  /** Nodes of this version in `version.node_ids` order. */
  nodes: ScriptNode[];
  byId: ReadonlyMap<string, ScriptNode>;
  /** Stage → nodes, stages in STAGE_ORDER, nodes in version order. */
  byStage: ReadonlyMap<string, ScriptNode[]>;
}

export function nodeById(nodes: readonly ScriptNode[], id: string): ScriptNode | undefined {
  return nodes.find((n) => n.id === id);
}

/** Build the graph for one version from the full node list. Unknown ids in `node_ids` are skipped (validateGraph reports them). */
export function loadVersionGraph(version: ScriptVersion, nodes: readonly ScriptNode[]): VersionGraph {
  const all = new Map(nodes.filter((n) => n.script_version_id === version.id).map((n) => [n.id, n]));
  const ordered: ScriptNode[] = [];
  for (const id of version.node_ids) {
    const n = all.get(id);
    if (n) ordered.push(n);
  }
  const byStage = new Map<string, ScriptNode[]>();
  const sorted = [...ordered].sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage) || 0);
  for (const n of sorted) {
    const list = byStage.get(n.stage);
    if (list) list.push(n);
    else byStage.set(n.stage, [n]);
  }
  return { version, nodes: ordered, byId: new Map(ordered.map((n) => [n.id, n])), byStage };
}

/** Entry node for an entrypoint, or undefined when the version does not declare it. */
export function entryNode(version: ScriptVersion, nodes: readonly ScriptNode[], entrypoint: string): ScriptNode | undefined {
  const id = version.entry_node_ids[entrypoint];
  return id ? nodeById(nodes, id) : undefined;
}

export interface BranchResolution {
  branch: EffectiveBranch;
  /** Null = end of sequence / hand back to human. */
  next: ScriptNode | null;
}

// ------------------------------------------------------------------ global stop rule (B-1)

/** The answer category that always means "stop now". */
export const STOP_ANSWER_CATEGORY = 'opt_out' as const;
/** Node id used when a version does not declare `stop_node_id`. */
export const DEFAULT_STOP_NODE_ID = 'exit-stop' as const;
/** Label of the implicit branch the engine adds to every node. */
export const GLOBAL_STOP_BRANCH_LABEL = 'Asks to stop' as const;
export const GLOBAL_STOP_BRANCH_NOTE = 'Global stop rule: an opt-out from any node goes straight to the stop node and the call ends.' as const;

/** A node branch plus whether the engine synthesised it (the global opt-out route). */
export interface EffectiveBranch extends ScriptBranch {
  implicit?: boolean;
}

export function stopNodeId(version?: Pick<ScriptVersion, 'stop_node_id'> | null): string {
  return version?.stop_node_id ?? DEFAULT_STOP_NODE_ID;
}

/** The stop node of a version (undefined only on an invalid graph — validateGraph reports it). */
export function stopNode(version: Pick<ScriptVersion, 'stop_node_id'> | null | undefined, nodes: readonly ScriptNode[]): ScriptNode | undefined {
  return nodeById(nodes, stopNodeId(version));
}

/**
 * The branches a node really offers: its own, plus — unless the node IS the stop node or already
 * routes `opt_out` explicitly — an implicit `opt_out → stop node` branch (brief scenario 40:
 * "caller asks to stop: stop immediately", from EVERY node).
 */
export function effectiveBranches(node: ScriptNode, version?: Pick<ScriptVersion, 'stop_node_id'> | null): EffectiveBranch[] {
  const stopId = stopNodeId(version);
  const own: EffectiveBranch[] = node.branches.map((b) => ({ ...b }));
  if (node.id === stopId || own.some((b) => b.answer_category === STOP_ANSWER_CATEGORY)) return own;
  return [...own, { label: GLOBAL_STOP_BRANCH_LABEL, answer_category: STOP_ANSWER_CATEGORY, next_node_id: stopId, note: GLOBAL_STOP_BRANCH_NOTE, implicit: true }];
}

/**
 * Resolve a branch by answer category. `opt_out` resolves from every node (global stop rule).
 * Undefined when the node has no such branch.
 */
export function nextNodeForBranch(
  node: ScriptNode,
  answerCategory: string,
  nodes: readonly ScriptNode[],
  version?: Pick<ScriptVersion, 'stop_node_id'> | null,
): BranchResolution | undefined {
  const branch = effectiveBranches(node, version).find((b) => b.answer_category === answerCategory);
  if (!branch) return undefined;
  const next = branch.next_node_id === null ? null : (nodeById(nodes, branch.next_node_id) ?? null);
  return { branch, next };
}

/** Nodes sorted by stage order, then by their position in the given list. */
export function sortNodesByStage(nodes: readonly ScriptNode[]): ScriptNode[] {
  return nodes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => stageOrder(a.n.stage) - stageOrder(b.n.stage) || a.i - b.i)
    .map((x) => x.n);
}

// ------------------------------------------------------------------ evidence

/** Confirmed facts keyed by slot/fact name (without braces), e.g. { dealership_name: "Northgate Motors" }. */
export type KnownFacts = Readonly<Record<string, string>>;

export interface EvidenceCheck {
  satisfied: boolean;
  matched: string[];
  missing: string[];
  /**
   * The line to SAY instead of asking twice — the quoted sentence inside `facts_already_known_rule`,
   * with slots resolved. Null when the node is not satisfied, or when the rule gives guidance but no
   * spoken line (then `rule` is the instruction to follow).
   */
  transition: string | null;
  /** The node's full facts-already-known rule (instruction for the rep), null when not satisfied. */
  rule: string | null;
}

const DEFAULT_KNOWN_RULE = 'Already answered: offer a transition instead of asking again.';

/** The spoken transition inside a facts-already-known rule: the first double-quoted sentence, if any. */
export function transitionLineOf(rule: string | undefined): string | null {
  if (!rule) return null;
  const m = /[“"]([^”"]{8,})[”"]/.exec(rule);
  return m?.[1]?.trim() ?? null;
}

/**
 * A node is evidence-satisfied when every key in `satisfied_by_facts` has a non-empty value in
 * `knownFacts`. Nodes without `satisfied_by_facts` are never auto-satisfied. When satisfied, the
 * spoken transition is the quoted line of the rule (never the rule sentence itself — B-11).
 */
export function isEvidenceSatisfied(node: ScriptNode, knownFacts: KnownFacts): EvidenceCheck {
  const keys = node.satisfied_by_facts ?? [];
  if (keys.length === 0) return { satisfied: false, matched: [], missing: [], transition: null, rule: null };
  const matched = keys.filter((k) => (knownFacts[k] ?? '').trim().length > 0);
  const missing = keys.filter((k) => !matched.includes(k));
  if (missing.length > 0) return { satisfied: false, matched, missing, transition: null, rule: null };
  const rule = node.facts_already_known_rule ?? DEFAULT_KNOWN_RULE;
  const quoted = transitionLineOf(node.facts_already_known_rule);
  const transition = quoted ? resolveSlots(quoted, { knownFacts }).text : null;
  return { satisfied: true, matched, missing, transition, rule };
}

// ------------------------------------------------------------------ slots

const SLOT_RE = /\{([a-z0-9_|]+)\}/gi;

export function slotName(slot: string): string {
  return slot.replace(/^\{|\}$/g, '');
}

/** Slot names (without braces or `|` modifiers) used in a template, in order of appearance. */
export function slotsIn(template: string): string[] {
  return [...template.matchAll(SLOT_RE)].map((m) => (m[1] ?? '').split('|')[0] ?? '');
}

export function slotLabel(name: string): string {
  return name.replace(/\|.*$/, '').replace(/_/g, ' ');
}

export const PRICE_NOT_APPROVED_CUE = 'Price not approved yet: route to scope conversation' as const;
export const FICTIONAL_PRICE_CUE = 'Fictional offer, not a real quote; no price may be spoken' as const;
/** Prefix of the cue shown for a pillar slot while the linked offer is not published (B-2). */
export const OFFER_NOT_APPROVED_CUE = 'Offer not approved' as const;

/** Slot names only the offer object may fill — never a confirmed "fact" (B-3). */
export const OFFER_SLOT_RE = /^(approved_price|pillar_[123]_(name|delivery))$/;

export function isOfferSlot(name: string): boolean {
  return OFFER_SLOT_RE.test(name);
}

export interface SlotResolution {
  text: string;
  /** Slot names that could not be resolved from confirmed facts / approved offer attributes. */
  missing: string[];
  /** Routing notes produced while resolving (e.g. price not approved). */
  notes: string[];
}

export interface SlotContext {
  knownFacts?: KnownFacts;
  offer?: OfferVersion | null;
}

/**
 * Resolve `{slot}` placeholders. Facts come only from `knownFacts`; offer attributes
 * (pillar_N_name, pillar_N_delivery, approved_price) come ONLY from a PUBLISHED offer — a known
 * fact under an offer slot name is ignored (B-3), and a draft/reviewed offer's pillar wording is
 * never spoken (B-2). The price additionally needs a non-fictional offer with a complete price.
 * Everything else renders a visible "[missing: …]" cue. Never invents a value.
 */
export function resolveSlots(template: string, ctx: SlotContext): SlotResolution {
  const facts = ctx.knownFacts ?? {};
  const offer = ctx.offer ?? null;
  const missing: string[] = [];
  const notes: string[] = [];
  const text = template.replace(SLOT_RE, (_m, raw: string) => {
    const name = raw.split('|')[0] ?? raw;

    if (name === 'approved_price') {
      if (offer && (offer.fictional || offer.practice_only)) {
        notes.push(FICTIONAL_PRICE_CUE);
        missing.push(name);
        return `[${FICTIONAL_PRICE_CUE}]`;
      }
      if (offer && isApprovedForQuoting(offer)) {
        const sentence = quotedPriceSentence(offer);
        if (sentence) return sentence;
      }
      notes.push(PRICE_NOT_APPROVED_CUE);
      missing.push(name);
      return `[${PRICE_NOT_APPROVED_CUE}]`;
    }

    const pillar = /^pillar_([123])_(name|delivery)$/.exec(name);
    if (pillar) {
      const p = offer?.pillars[Number(pillar[1]) - 1];
      if (offer && p && offer.status === 'published') return pillar[2] === 'name' ? p.name : p.delivery;
      missing.push(name);
      if (offer && p) {
        notes.push(`${OFFER_NOT_APPROVED_CUE}: "${offer.name}" is ${offer.status}; pillar wording is not spoken until the offer is published.`);
        return `[${OFFER_NOT_APPROVED_CUE}: ${slotLabel(name)}]`;
      }
      return `[missing: ${slotLabel(name)}]`;
    }

    const fact = facts[name];
    if (fact !== undefined && fact.trim().length > 0) return fact;

    missing.push(name);
    return `[missing: ${slotLabel(name)}]`;
  });
  return { text, missing: [...new Set(missing)], notes: [...new Set(notes)] };
}

// ------------------------------------------------------------------ node card

export interface NodeCardBranch {
  label: string;
  answer_category: string;
  next_node_id: string | null;
  note?: string;
  /** True for the engine-added global opt-out route (B-1). */
  implicit?: boolean;
}

export interface NodeCard {
  node_id: string;
  stage: string;
  stage_label: string;
  substage?: string;
  approval_status: ScriptNode['approval']['status'];
  practice_only: boolean;
  assistance_mode: AssistanceMode;
  /** Null when masked by the assistance mode. */
  say_this: string | null;
  say_this_hidden: boolean;
  why_this_now: string | null;
  what_to_listen_for: string | null;
  mirror_if_unclear: string[];
  tone_pacing: { label: 'instructor-described'; tone_cue: string; pacing_cue: string } | null;
  next_branches: NodeCardBranch[];
  missing_slots: string[];
  routing_notes: string[];
  evidence: EvidenceCheck;
  source_question_ids: string[];
  source_note?: string;
}

export interface RenderOptions extends SlotContext {
  assistanceMode?: AssistanceMode;
  /** For recall_with_reveal: true once the user has chosen to reveal the line. */
  revealed?: boolean;
  /** The owning version (for its `stop_node_id`); defaults to the "exit-stop" convention. */
  version?: Pick<ScriptVersion, 'stop_node_id'> | null;
}

/**
 * Render the six-part card for a node and mask it per assistance mode:
 *  full_script          → everything
 *  recall_with_reveal   → line, mirrors and tone hidden until `revealed`
 *  primary_plus_mirror  → line + mirrors (+ branches); no why/listen/tone
 *  stage_purpose_cue    → only why_this_now (+ branches for navigation)
 *  unassisted           → stage name only (no branches)
 */
export function renderNodeCard(node: ScriptNode, opts: RenderOptions = {}): NodeCard {
  const mode: AssistanceMode = opts.assistanceMode ?? 'full_script';
  const say = resolveSlots(node.primary_word_track, opts);
  const mirrors = node.mirror_variants.map((m) => resolveSlots(m, opts));
  const evidence = isEvidenceSatisfied(node, opts.knownFacts ?? {});
  const routing = [...say.notes];
  if (evidence.satisfied) routing.push('Evidence-satisfied: offer the transition instead of asking twice.');
  for (const m of say.missing) routing.push(`Missing "${slotLabel(m)}": confirm it with the prospect or route to the question that establishes it.`);
  if (node.practice_only) routing.push('Study and practice only: never a live recommendation.');

  const base: NodeCard = {
    node_id: node.id,
    stage: node.stage,
    stage_label: stageLabel(node.stage),
    substage: node.substage,
    approval_status: node.approval.status,
    practice_only: node.practice_only === true,
    assistance_mode: mode,
    say_this: say.text,
    say_this_hidden: false,
    why_this_now: node.why_this_now,
    what_to_listen_for: node.what_to_listen_for,
    mirror_if_unclear: mirrors.map((m) => m.text),
    tone_pacing: { label: 'instructor-described', ...node.delivery_overlay },
    next_branches: effectiveBranches(node, opts.version).map((b) => ({
      label: b.label,
      answer_category: b.answer_category,
      next_node_id: b.next_node_id,
      ...(b.note ? { note: b.note } : {}),
      ...(b.implicit ? { implicit: true } : {}),
    })),
    missing_slots: say.missing,
    routing_notes: [...new Set(routing)],
    evidence,
    source_question_ids: [...node.source_question_ids],
    ...(node.source_note ? { source_note: node.source_note } : {}),
  };

  switch (mode) {
    case 'full_script':
      return base;
    case 'recall_with_reveal':
      if (opts.revealed) return base;
      return { ...base, say_this: null, say_this_hidden: true, mirror_if_unclear: [], tone_pacing: null };
    case 'primary_plus_mirror':
      return { ...base, why_this_now: null, what_to_listen_for: null, tone_pacing: null };
    case 'stage_purpose_cue':
      return { ...base, say_this: null, say_this_hidden: true, what_to_listen_for: null, mirror_if_unclear: [], tone_pacing: null, missing_slots: [], routing_notes: [] };
    case 'unassisted':
      return {
        ...base,
        say_this: null,
        say_this_hidden: true,
        why_this_now: null,
        what_to_listen_for: null,
        mirror_if_unclear: [],
        tone_pacing: null,
        next_branches: [],
        missing_slots: [],
        routing_notes: [],
      };
    default:
      return base;
  }
}

// ------------------------------------------------------------------ validation

export const EXPECTED_NODE_COUNT = 51 as const;

export interface GraphValidation {
  ok: boolean;
  errors: string[];
  /** Informational counts. */
  stats: { nodes: number; cited_record_ids: number; entrypoints: number };
}

/**
 * Validate a version against its nodes and the source records:
 * exactly 51 nodes, unique ids, node_ids ↔ nodes agree, citations resolve, no study_only in
 * primary citations, private_training only on practice_only nodes, closed graph, all six
 * entrypoints present, no orphan nodes, everything reachable from an entry, known stages,
 * the global stop rule (stop node exists, is terminal, sits in the exit stage, is not practice-only,
 * and every explicit opt_out branch routes to it — B-1), and slot hygiene: every slot spoken in the
 * primary line or a mirror is declared in required_context (B-10), and every slot in a
 * facts-already-known transition line is declared or is one of the satisfying facts (B-6).
 */
export function validateGraph(
  version: ScriptVersion,
  nodes: readonly ScriptNode[],
  records: readonly SourceQuestionRecord[],
): GraphValidation {
  const errors: string[] = [];
  const own = nodes.filter((n) => n.script_version_id === version.id);
  const foreign = nodes.filter((n) => n.script_version_id !== version.id);
  if (foreign.length > 0) errors.push(`${foreign.length} node(s) belong to another version: ${foreign.map((n) => n.id).join(', ')}`);
  if (own.length !== EXPECTED_NODE_COUNT) errors.push(`expected ${EXPECTED_NODE_COUNT} nodes, found ${own.length}`);

  const ids = new Set<string>();
  for (const n of own) {
    if (ids.has(n.id)) errors.push(`duplicate node id ${n.id}`);
    ids.add(n.id);
  }
  for (const id of version.node_ids) if (!ids.has(id)) errors.push(`version lists unknown node ${id}`);
  for (const id of ids) if (!version.node_ids.includes(id)) errors.push(`node ${id} is not listed in version.node_ids`);

  const byRecord = new Map(records.map((r) => [r.id, r]));
  const cited = new Set<string>();
  for (const n of own) {
    if (!ScriptStage.safeParse(n.stage).success) errors.push(`node ${n.id} has unknown stage "${n.stage}"`);
    for (const rid of n.source_question_ids) {
      cited.add(rid);
      const r = byRecord.get(rid);
      if (!r) {
        errors.push(`node ${n.id} cites unknown record ${rid}`);
        continue;
      }
      if (r.use_classification === 'study_only') errors.push(`node ${n.id} cites study_only record ${rid} in its primary citations`);
      if (r.use_classification === 'private_training' && !n.practice_only) errors.push(`node ${n.id} cites private_training record ${rid} but is not practice_only`);
    }
    for (const b of n.branches) {
      if (b.next_node_id !== null && !ids.has(b.next_node_id)) errors.push(`node ${n.id} branch "${b.answer_category}" → unknown node ${b.next_node_id}`);
    }
    if (n.branches.length === 0) errors.push(`node ${n.id} has no branches`);
  }

  for (const ep of ENTRYPOINTS) {
    const id = version.entry_node_ids[ep];
    if (!id) errors.push(`missing entry node for entrypoint "${ep}"`);
    else if (!ids.has(id)) errors.push(`entry node for "${ep}" → unknown node ${id}`);
    else if (nodeById(own, id)?.practice_only) errors.push(`entry node for "${ep}" is practice_only`);
  }

  const referenced = new Set<string>(Object.values(version.entry_node_ids));
  for (const n of own) for (const b of n.branches) if (b.next_node_id) referenced.add(b.next_node_id);
  for (const id of ids) if (!referenced.has(id)) errors.push(`orphan node ${id} (not an entry node and not referenced by any branch)`);

  const reachable = new Set<string>();
  const stack = Object.values(version.entry_node_ids).filter((id) => ids.has(id));
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const n = nodeById(own, id);
    if (!n) continue;
    for (const b of n.branches) if (b.next_node_id && !reachable.has(b.next_node_id)) stack.push(b.next_node_id);
  }
  for (const id of ids) if (!reachable.has(id)) errors.push(`node ${id} is unreachable from every entrypoint`);

  // Global stop rule (B-1).
  const stopId = stopNodeId(version);
  const stop = nodeById(own, stopId);
  if (!stop) errors.push(`stop node ${stopId} is missing: opt-out cannot reach a stop from every node`);
  else {
    if (stop.stage !== 'exit') errors.push(`stop node ${stopId} must be in the exit stage (found "${stop.stage}")`);
    if (stop.practice_only) errors.push(`stop node ${stopId} must not be practice_only`);
    if (stop.branches.some((b) => b.next_node_id !== null)) errors.push(`stop node ${stopId} must be terminal (every branch → null)`);
  }
  for (const n of own) {
    for (const b of n.branches) {
      if (b.answer_category === STOP_ANSWER_CATEGORY && b.next_node_id !== stopId) errors.push(`node ${n.id} routes opt_out to ${b.next_node_id ?? 'null'} instead of the stop node ${stopId}`);
    }
    if (stop && n.id !== stopId) {
      const res = nextNodeForBranch(n, STOP_ANSWER_CATEGORY, own, version);
      if (res?.next?.id !== stopId) errors.push(`node ${n.id} cannot reach the stop node on opt_out`);
    }
  }

  // Slot hygiene (B-6, B-10).
  for (const n of own) {
    const declared = new Set(n.required_context.map(slotName));
    const satisfying = new Set(n.satisfied_by_facts ?? []);
    const spoken = [n.primary_word_track, ...n.mirror_variants].flatMap(slotsIn);
    for (const slot of new Set(spoken)) if (!declared.has(slot)) errors.push(`node ${n.id} speaks undeclared slot {${slot}} (add it to required_context)`);
    const transition = transitionLineOf(n.facts_already_known_rule);
    if (transition) {
      for (const slot of new Set(slotsIn(transition))) {
        if (!declared.has(slot) && !satisfying.has(slot)) errors.push(`node ${n.id} transition uses {${slot}} which is neither declared nor a satisfying fact; the transition can never be spoken`);
      }
      if (satisfying.size === 0) errors.push(`node ${n.id} declares a transition line but no satisfied_by_facts; it can never be evidence-satisfied`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: { nodes: own.length, cited_record_ids: cited.size, entrypoints: Object.keys(version.entry_node_ids).length },
  };
}

// ------------------------------------------------------------------ canonical JSON + SHA-256

/** Deterministic JSON: object keys sorted recursively, no whitespace, undefined dropped. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = sortKeys(v);
    }
    return out;
  }
  return value;
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/**
 * SHA-256 (FIPS 180-4) over the UTF-8 bytes of `text`, returned as 64 lowercase hex chars.
 * Pure TypeScript so it runs identically in Node, the browser and tests without dependencies.
 * Verified in tests against the standard vectors ("" and "abc").
 */
export function sha256Hex(text: string): string {
  const msg = new TextEncoder().encode(text);
  const bitLen = msg.length * 8;
  const padLen = ((msg.length + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(padLen);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const view = new DataView(buf.buffer);
  // 64-bit big-endian length; lengths here fit in 53 bits.
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const w15 = w[i - 15] as number;
      const w2 = w[i - 2] as number;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = ((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) >>> 0;
    }
    let a = h[0] as number;
    let b = h[1] as number;
    let c = h[2] as number;
    let d = h[3] as number;
    let e = h[4] as number;
    let f = h[5] as number;
    let g = h[6] as number;
    let hh = h[7] as number;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + (K[i] as number) + (w[i] as number)) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = ((h[0] as number) + a) >>> 0;
    h[1] = ((h[1] as number) + b) >>> 0;
    h[2] = ((h[2] as number) + c) >>> 0;
    h[3] = ((h[3] as number) + d) >>> 0;
    h[4] = ((h[4] as number) + e) >>> 0;
    h[5] = ((h[5] as number) + f) >>> 0;
    h[6] = ((h[6] as number) + g) >>> 0;
    h[7] = ((h[7] as number) + hh) >>> 0;
  }
  let hex = '';
  for (let i = 0; i < 8; i += 1) hex += (h[i] as number).toString(16).padStart(8, '0');
  return hex;
}

// ------------------------------------------------------------------ publication

/** Content hash of a version + its nodes, independent of publish time and of the publication envelope. */
export function contentHash(version: ScriptVersion, nodes: readonly ScriptNode[]): string {
  const ordered = loadVersionGraph(version, nodes).nodes;
  const { published_at: _omit, ...stable } = version;
  void _omit;
  return sha256Hex(canonicalJson({ version: { ...stable, status: 'published', immutable: true }, nodes: ordered }));
}

export function isVersionFrozen(version: Pick<ScriptVersion, 'status' | 'immutable'>): boolean {
  return version.immutable || version.status === 'published' || version.status === 'retired';
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

/**
 * Create an immutable publication snapshot. The version copy is marked published/immutable;
 * node approval statuses are NOT changed (owner approval is a separate act — see
 * SCRIPT_APPROVALS.md). The returned object is deep-frozen; the inputs are untouched.
 */
export function publishVersion(
  version: ScriptVersion,
  nodes: readonly ScriptNode[],
  opts: { publishedAt?: string } = {},
): ScriptPublication {
  const publishedAt = opts.publishedAt ?? new Date().toISOString();
  const hash = contentHash(version, nodes);
  const graph = loadVersionGraph(version, nodes);
  const snapshotVersion: ScriptVersion = { ...version, status: 'published', immutable: true, published_at: publishedAt };
  const snapshotNodes = graph.nodes.map((n) => structuredClone(n));
  return deepFreeze({
    id: `${version.id}#${hash.slice(0, 12)}`,
    version: snapshotVersion,
    nodes: snapshotNodes,
    content_hash: hash,
    published_at: publishedAt,
  });
}

/** How a publication should be labelled: wording is frozen, but approval is whatever the nodes say (B-5). */
export type PublicationLabel = 'frozen draft' | 'published' | 'frozen mixed';

export interface PublicationApproval {
  label: PublicationLabel;
  /** Nodes by approval status inside the snapshot. */
  counts: Record<ScriptNode['approval']['status'], number>;
  /** The whole truth for an accessible name. */
  name: string;
}

/**
 * A publication freezes WORDING only. Nodes keep their recorded approval: when every node is still
 * draft the snapshot is a "frozen draft"; only when every node is published is it "published".
 */
export function publicationApproval(pub: Pick<ScriptPublication, 'nodes' | 'content_hash'>): PublicationApproval {
  const counts: PublicationApproval['counts'] = { draft: 0, reviewed: 0, published: 0, retired: 0 };
  for (const n of pub.nodes) counts[n.approval.status] += 1;
  const total = pub.nodes.length;
  const label: PublicationLabel = counts.draft === total ? 'frozen draft' : counts.published === total ? 'published' : 'frozen mixed';
  const parts = (Object.keys(counts) as (keyof typeof counts)[]).filter((k) => counts[k] > 0).map((k) => `${counts[k]} ${k}`);
  const name =
    label === 'published'
      ? `Published: wording frozen and every node approved (${total} nodes) · ${pub.content_hash.slice(0, 12)}`
      : `${label === 'frozen draft' ? 'Frozen draft' : 'Frozen, mixed approval'}: wording is frozen but nodes are not approved for live use (${parts.join(', ')}) · ${pub.content_hash.slice(0, 12)}`;
  return { label, counts, name };
}

/** True when a publication's stored hash matches its content (tamper check). */
export function verifyPublication(pub: ScriptPublication): boolean {
  return contentHash(pub.version, pub.nodes) === pub.content_hash;
}

export function assertPrimaryEditable(version: Pick<ScriptVersion, 'id' | 'status' | 'immutable'>): void {
  if (isVersionFrozen(version)) {
    throw new Error(`Version ${version.id} is ${version.status}${version.immutable ? ' (immutable)' : ''}; primary word tracks are frozen`);
  }
}

/** Returns a copy of the node with a new primary line — only while the version is a draft. */
export function editPrimaryWordTrack(version: ScriptVersion, node: ScriptNode, primary: string): ScriptNode {
  assertPrimaryEditable(version);
  if (node.script_version_id !== version.id) throw new Error(`node ${node.id} does not belong to version ${version.id}`);
  return { ...node, primary_word_track: primary };
}

// ------------------------------------------------------------------ own words (WordTrackVariant)

/** Find Jason's own-words variant for a node. */
export function wordTrackVariantFor(variants: readonly WordTrackVariant[], nodeId: string): WordTrackVariant | undefined {
  return variants.find((v) => v.node_id === nodeId);
}

/** Insert or replace the variant for a node. Never touches any ScriptNode. */
export function upsertWordTrackVariant(
  variants: readonly WordTrackVariant[],
  nodeId: string,
  ownText: string,
  editedAt: string = new Date().toISOString(),
): WordTrackVariant[] {
  const next: WordTrackVariant = { node_id: nodeId, own_text: ownText, edited_at: editedAt };
  const rest = variants.filter((v) => v.node_id !== nodeId);
  return [...rest, next];
}

export function removeWordTrackVariant(variants: readonly WordTrackVariant[], nodeId: string): WordTrackVariant[] {
  return variants.filter((v) => v.node_id !== nodeId);
}

/** Version-scoped storage key suffix for own words (own text is per node id; node ids are version-scoped). */
export const OWN_WORDS_NOTE = 'Your own words are stored separately. The primary line above stays unchanged.' as const;
