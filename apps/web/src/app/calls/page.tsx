import type { Metadata } from 'next';
import { loadSyntheticProspects, loadSyntheticTranscripts } from '@apohenia/domain/seeds';
import { analyzeCall, callDurationSeconds, callOutcome } from '@apohenia/domain/vocabulary';
import { CallsClient } from './CallsClient';
import { companyFromTitle, tagFromTitle, type CallRow } from './review-lib';

export const metadata: Metadata = { title: 'History' };

/**
 * History (DESIGN_SYSTEM §3.7): a card per ended demo session (from the browser's `dial.history`)
 * and a card per synthetic call. Rows are computed here on the server from the seeds; outcomes are
 * derived from the prospect's own words, never from a model.
 */
export default function CallsPage() {
  const transcripts = loadSyntheticTranscripts().transcripts;
  const seed = loadSyntheticProspects();
  const rows: CallRow[] = transcripts.map((t) => {
    const analysis = analyzeCall(t.turns);
    const contact = seed.contacts.find((c) => c.call_id === t.call_id) ?? null;
    const location = contact ? (seed.locations.find((l) => l.id === contact.location_id) ?? null) : null;
    const facts = new Map(analysis.facts.map((f) => [f.key, f.value] as const));
    return {
      id: t.call_id,
      contact: contact?.name ?? facts.get('{prospect_name}') ?? 'Unknown',
      company: location?.name ?? facts.get('{dealership_name}') ?? companyFromTitle(t.title) ?? '—',
      duration_s: callDurationSeconds(t.turns),
      turns: analysis.turns.length,
      outcome: callOutcome(analysis),
      tag: tagFromTitle(t.title),
    };
  });
  return (
    <>
      <h1 className="sr-only">Calls</h1>
      <CallsClient calls={rows} />
    </>
  );
}
