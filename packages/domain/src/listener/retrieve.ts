/**
 * Delayed recall (addendum §6): retrieve earlier references by the CONCEPT under discussion in the
 * current turn — not by matching nouns. Works over the whole conversation store, independent of any
 * recent-turn window.
 */
import type { Reference } from '../schemas/listener';
import { CONCEPT_BY_ID, conceptsForTurn } from './concepts';

export interface RetrievedReference {
  reference: Reference;
  /** Concepts shared between the current turn and the reference. */
  matched_concepts: string[];
  stage_match: boolean;
  score: number;
}

/** A reference the policy may still draw on: held/pinned, final evidence, not third-party, not rejected. */
export function isReusable(r: Reference): boolean {
  if (r.lifecycle.state !== 'held' && r.lifecycle.state !== 'pinned') return false;
  if (r.reuse.do_not_reuse) return false;
  if (r.evidence.status === 'provisional') return false;
  if (r.semantics.origin === 'third_party') return false;
  if (r.reuse.reactions.some((x) => x.reaction === 'rejected')) return false;
  return true;
}

export function retrieveByConcept(currentTurnText: string, references: readonly Reference[], stage?: string): RetrievedReference[] {
  const turnConcepts = conceptsForTurn(currentTurnText);
  if (turnConcepts.length === 0) return [];
  const out: RetrievedReference[] = [];
  references.forEach((reference, index) => {
    if (!isReusable(reference)) return;
    const matched = reference.semantics.concept_ids.filter((c) => turnConcepts.includes(c));
    if (matched.length === 0) return;
    const stage_match = stage !== undefined && matched.some((c) => (CONCEPT_BY_ID.get(c)?.stages ?? []).includes(stage));
    const score = matched.length * 10 + (stage_match ? 5 : 0) + (reference.lifecycle.state === 'pinned' ? 3 : 0) + (reference.lifecycle.kept_for_later ? 2 : 0) - index * 0.01;
    out.push({ reference, matched_concepts: matched, stage_match, score });
  });
  return out.sort((a, b) => b.score - a.score);
}
