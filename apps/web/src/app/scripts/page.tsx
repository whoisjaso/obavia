import type { Metadata } from 'next';
import { loadOffers, loadScriptNodes, loadSourceQuestionRecords } from '@apohenia/domain/seeds';
import { validateGraph } from '@apohenia/domain/scripts';
import { Badge, PageHeader } from '@/components/ui';
import { ScriptsClient, type CitationInfo } from './ScriptsClient';

export const metadata: Metadata = { title: 'Scripts' };

/** Owner: M-script. Server component: loads seeds, validates the graph, passes plain data down. */
export default async function ScriptsPage({ searchParams }: { searchParams: Promise<{ node?: string | string[] }> }) {
  // `/scripts?node=<id>` (Source Library counterpart links) opens that node. Next 16: searchParams is a Promise.
  const { node } = await searchParams;
  const initialNodeId = typeof node === 'string' && node.length > 0 ? node : null;
  const seed = loadScriptNodes();
  const offers = loadOffers().offer_versions;
  const records = loadSourceQuestionRecords();

  const validations = seed.versions.map((v) => ({ version_id: v.id, result: validateGraph(v, seed.nodes, records) }));

  // Only the cited records travel to the client (never the whole 200 KB source package).
  const cited = new Set(seed.nodes.flatMap((n) => n.source_question_ids));
  const citations: Record<string, CitationInfo> = {};
  for (const r of records) {
    if (cited.has(r.id)) citations[r.id] = { id: r.id, title: r.title, classification: r.use_classification, purpose: r.purpose };
  }

  const placeholder = seed._status !== undefined;

  return (
    <>
      <PageHeader
        title="Scripts"
        purpose="Own-script editor: exact primary word tracks (stable within a version), source question ids, answer objectives, mirror variants, bridges, branches and approval state — with immutable published versions."
        aside={placeholder ? <Badge variant="warning">placeholder — to be authored</Badge> : <Badge variant="warning">All nodes draft · owner review required before live use</Badge>}
      />
      <ScriptsClient
        versions={seed.versions}
        nodes={seed.nodes}
        seedVariants={seed.word_track_variants}
        offers={offers}
        citations={citations}
        validations={validations}
        placeholder={placeholder}
        initialNodeId={initialNodeId}
      />
    </>
  );
}
