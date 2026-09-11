/**
 * UI-ready cards (addendum §5): collapsed = large label + one meaning line; expanded = exact phrase and
 * evidence, what the comparison represents here, meaning status, when it may be useful later, and the one
 * suggested question/bridge when there is one. The UI renders these fields as-is; nothing here is a
 * quotation except `evidence.quote`.
 */
import type { MeaningGlyph, Reference, ReferenceCard } from '../schemas/listener';
import { CONCEPT_BY_ID } from './concepts';
import type { ListenerState } from './state';

/** Human-readable meaning-status text for a card (accessible name of the glyph). */
export function meaningStatusText(r: Reference): string {
  const labels: Record<Reference['semantics']['meaning_status'], string> = {
    observed: 'observed: the relationship was stated in the turn',
    inferred: 'inferred: interpretation of this sentence, not confirmed',
    confirmed: 'confirmed: meaning supplied by the prospect',
    unknown: 'unknown: ask before assuming',
  };
  return labels[r.semantics.meaning_status];
}

/** Design-system glyph for a meaning status (⊘ once the evidence was retracted). */
export function meaningGlyph(r: Reference): MeaningGlyph {
  if (r.lifecycle.state === 'invalidated') return '⊘';
  const glyphs: Record<Reference['semantics']['meaning_status'], MeaningGlyph> = { observed: '◉', inferred: '◌', confirmed: '✓', unknown: '?' };
  return glyphs[r.semantics.meaning_status];
}

/** One short meaning line for the collapsed card. */
export function shortMeaning(r: Reference): string {
  if (r.lifecycle.state === 'invalidated') return `Invalidated: ${r.lifecycle.reason ?? 'evidence retracted'}`;
  if (r.lifecycle.state === 'rejected') return 'Rejected by the prospect, not used again';
  const rel = r.semantics.relationship.replace(/^[^:]+:\s*/, '');
  return rel.length > 90 ? `${rel.slice(0, 87)}…` : rel;
}

export function originLabel(origin: Reference['semantics']['origin']): string {
  const labels: Record<Reference['semantics']['origin'], string> = {
    prospect_spontaneous: 'prospect said it unprompted',
    prompted: 'prospect said it when asked for a comparison',
    seller_introduced_prospect_confirmed: 'seller introduced, prospect confirmed (shared term)',
    third_party: "someone else's frame, not the prospect's",
    unknown: 'origin unknown (no preceding context)',
  };
  return labels[origin];
}

function stateLine(r: Reference): string | undefined {
  switch (r.lifecycle.state) {
    case 'invalidated':
      return `Invalidated: ${r.lifecycle.reason ?? 'the evidence was retracted'}`;
    case 'rejected':
      return 'Rejected by the prospect, not used again';
    case 'dismissed':
      return `Dismissed: ${r.lifecycle.reason ?? 'by the representative'}`;
    case 'pinned':
      return 'Pinned: position protected; accuracy is not certified by pinning';
    default:
      return r.reuse.do_not_reuse ? 'Held as evidence, marked do not reuse' : undefined;
  }
}

function usefulWhen(r: Reference): string {
  const concepts = r.semantics.concept_ids.map((id) => CONCEPT_BY_ID.get(id)?.label ?? id);
  const stages = r.reuse.candidate_purposes.filter((p) => !r.semantics.concept_ids.includes(p));
  if (r.semantics.painful) return 'Hold it. Reuse only as a neutral acknowledgment of the setback, never the image itself.';
  if (r.semantics.origin === 'third_party') return "Not for reuse: it is someone else's frame, not the prospect's.";
  if (concepts.length === 0) return 'No concept tag yet: reuse only if the same topic returns.';
  return `When ${concepts.join(' or ')} comes up${stages.length > 0 ? ` (usually in ${stages.join(', ')})` : ''}, even without the same words.`;
}

function represents(r: Reference): string {
  const rel = r.semantics.relationship.replace(/^[^:]+:\s*/, '');
  if (r.semantics.kind === 'emotional_descriptor') {
    return r.semantics.meaning_status === 'confirmed' && r.semantics.explained_meaning
      ? `Their word for ${r.semantics.business_target}; they explained: ${r.semantics.explained_meaning.text}`
      : `Their word for ${r.semantics.business_target === 'not stated' ? 'how it felt' : r.semantics.business_target}; the why is not explained yet.`;
  }
  if (r.semantics.kind === 'outcome_label' || r.semantics.kind === 'correction' || r.semantics.kind === 'defined_term') return rel;
  return `${r.semantics.business_target === 'this' ? 'The situation' : r.semantics.business_target.charAt(0).toUpperCase() + r.semantics.business_target.slice(1)}: ${rel}`;
}

/** Map one reference to its card. `suggestion` is attached by `toCards`. */
export function toCard(r: Reference): ReferenceCard {
  const usable = r.lifecycle.state === 'held' || r.lifecycle.state === 'pinned';
  const reusable = usable && !r.reuse.do_not_reuse && r.evidence.status !== 'provisional' && r.semantics.origin !== 'third_party';
  return {
    id: r.id,
    label: r.label,
    meaning_line: shortMeaning(r),
    meaning_status: r.semantics.meaning_status,
    glyph: meaningGlyph(r),
    glyph_name: r.lifecycle.state === 'invalidated' ? 'invalidated: evidence retracted by a transcript revision' : `meaning ${meaningStatusText(r)}`,
    origin: r.semantics.origin,
    origin_label: originLabel(r.semantics.origin),
    valence: r.semantics.valence,
    evidence: {
      quote: r.evidence.supporting_quote,
      turn_id: r.evidence.turn_id,
      exact_expression: r.evidence.exact_expression,
      status: r.evidence.status,
      ...(r.evidence.timestamp ? { timestamp: r.evidence.timestamp } : {}),
    },
    state: r.lifecycle.state,
    state_line: stateLine(r),
    pinned: r.lifecycle.state === 'pinned',
    kept_for_later: r.lifecycle.kept_for_later,
    do_not_reuse: r.reuse.do_not_reuse,
    painful: r.semantics.painful,
    represents: represents(r),
    useful_when: usefulWhen(r),
    ...(r.semantics.explained_meaning ? { confirmed_meaning: r.semantics.explained_meaning } : {}),
    prohibited_inferences: r.semantics.prohibited_inferences,
    ...(r.reuse.proposed_clarification && usable ? { clarification: r.reuse.proposed_clarification } : {}),
    actions: {
      keep: usable && !r.lifecycle.kept_for_later,
      use: reusable, // painful references get the neutral-acknowledgment line from the policy, never the image
      clarify: usable && r.reuse.proposed_clarification !== undefined,
    },
    concept_ids: r.semantics.concept_ids,
    ...(r.semantics.source_domain ? { source_domain: r.semantics.source_domain } : {}),
  };
}

/**
 * Frozen API. Cards in first-appearance order (stable across turns and pins). Dismissed, rejected and
 * invalidated references are included with their `state` so the UI can strike them through or hide them;
 * the queued suggestion, if any, rides on the card it is grounded in.
 */
export function toCards(state: ListenerState): ReferenceCard[] {
  const queued = state.memory.queued_suggestion;
  return state.references.map((r) => {
    const card = toCard(r);
    return queued && queued.reference_id === r.id ? { ...card, suggestion: queued } : card;
  });
}

/**
 * The 3–7 cards worth showing by default, in first-appearance order (pinning never reorders). Only held
 * and pinned cards are visible; when there are more than `max`, held cards drop from the newest end and
 * pinned cards always survive (pinning protects position). The rest belong in the expandable overflow.
 */
export function visibleCards(cards: readonly ReferenceCard[], max = 7): ReferenceCard[] {
  const limit = Math.max(3, max);
  const live = cards.filter((c) => c.state === 'pinned' || c.state === 'held');
  if (live.length <= limit) return live;
  const pinnedCount = live.filter((c) => c.state === 'pinned').length;
  let heldBudget = Math.max(0, limit - pinnedCount);
  const out: ReferenceCard[] = [];
  for (const c of live) {
    if (c.state === 'pinned') out.push(c);
    else if (heldBudget > 0) {
      out.push(c);
      heldBudget -= 1;
    }
  }
  return out;
}
