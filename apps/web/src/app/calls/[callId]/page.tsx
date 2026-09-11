import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadScriptNodes, loadSyntheticProspects, loadSyntheticTranscripts } from '@apohenia/domain/seeds';
import { buildQueue, knownFactsFor } from '@apohenia/domain/dialer';
import { entryNode, resolveSlots } from '@apohenia/domain/scripts';
import { analyzeCall } from '@apohenia/domain/vocabulary';
import { CallDetailClient } from '../CallDetailClient';
import { companyFromTitle, toKnownFacts } from '../review-lib';

export const metadata: Metadata = { title: 'Call review' };

/** Facts the rule-based extractor can establish; nodes needing only these are considered "covered". */
const DERIVABLE = new Set(['{prospect_name}', '{dealership_name}', '{stated_goal}', '{stated_problem}', '{their_word}', '{reconnect_window}']);

export function generateStaticParams() {
  return loadSyntheticTranscripts().transcripts.map((t) => ({ callId: t.call_id }));
}

/**
 * Call review (DESIGN_SYSTEM §3.7): the in-call layout replayed read-only — the entry line for this
 * record, THEIR WORDS, THEIR REFERENCES — then four review cards, the `—` tone glyph, and the
 * corrections sheet. Everything here is derived from the synthetic transcript and the seeds.
 */
export default async function CallDetailPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  const transcript = loadSyntheticTranscripts().transcripts.find((t) => t.call_id === decodeURIComponent(callId));
  if (!transcript) notFound();

  const scripts = loadScriptNodes();
  const version = scripts.versions[0] ?? null;
  const queue = buildQueue(loadSyntheticProspects(), { mode: 'demo' });
  const item = queue.find((q) => q.call_id === transcript.call_id) ?? null;
  const analysis = analyzeCall(transcript.turns);
  const facts = new Map(analysis.facts.map((f) => [f.key, f.value] as const));
  // Record facts (first name, dealership) win — they are what you would say; transcript facts fill the rest.
  const knownFacts = { ...toKnownFacts(analysis.facts), ...(item ? knownFactsFor(item) : {}) };
  const node = version ? (entryNode(version, scripts.nodes, item?.entrypoint ?? 'cold') ?? entryNode(version, scripts.nodes, 'cold') ?? null) : null;
  const line = node ? resolveSlots(node.primary_word_track, { knownFacts }).text : '';
  const nodesCovered = scripts.nodes.filter((n) => n.required_context.every((k) => DERIVABLE.has(k))).map((n) => ({ id: n.id, stage: n.stage, required_context: n.required_context }));

  return (
    <>
      <h1 className="sr-only">Call review</h1>
      <CallDetailClient
        transcript={transcript}
        node={node}
        line={line}
        contact={item?.contact ?? facts.get('{prospect_name}') ?? 'Unknown'}
        company={item?.company ?? facts.get('{dealership_name}') ?? companyFromTitle(transcript.title) ?? '—'}
        nodesCovered={nodesCovered}
      />
    </>
  );
}
