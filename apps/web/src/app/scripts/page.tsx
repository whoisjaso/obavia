import type { Metadata } from 'next';
import { loadOffers, loadScriptNodes, loadSourceQuestionRecords } from '@apohenia/domain/seeds';
import { validateGraph } from '@apohenia/domain/scripts';
import { ScriptsClient, type CitationInfo } from './ScriptsClient';

export const metadata: Metadata = { title: 'Script' };

/**
 * Owner: M-script. Script stage (DESIGN_SYSTEM §3.5): a horizontal stage rail, the node lines of
 * that stage as LineCards, a sheet per node, a publish tile. Server component: loads the seeds,
 * validates the graph once, passes plain data down. Only the CITED records travel to the client.
 */
export default async function ScriptsPage({ searchParams }: { searchParams: Promise<{ node?: string | string[] }> }) {
  // `/scripts?node=<id>` (Source Library counterpart links) selects that node. Next 16: searchParams is a Promise.
  const { node } = await searchParams;
  const initialNodeId = typeof node === 'string' && node.length > 0 ? node : null;
  const seed = loadScriptNodes();
  const offers = loadOffers().offer_versions;
  const records = loadSourceQuestionRecords();

  const validations = seed.versions.map((v) => ({ version_id: v.id, result: validateGraph(v, seed.nodes, records) }));

  const cited = new Set(seed.nodes.flatMap((n) => n.source_question_ids));
  const citations: Record<string, CitationInfo> = {};
  for (const r of records) {
    if (!cited.has(r.id)) continue;
    citations[r.id] = {
      id: r.id,
      title: r.title,
      classification: r.use_classification,
      purpose: r.purpose,
      template: r.template,
      source: r.source,
      section_id: r.section_id,
      section_title: r.section_title,
      delivery: r.delivery,
    };
  }

  return (
    <>
      <h1 className="sr-only">Scripts</h1>
      <ScriptsClient
        versions={seed.versions}
        nodes={seed.nodes}
        seedVariants={seed.word_track_variants}
        offers={offers}
        citations={citations}
        validations={validations}
        placeholder={seed._status !== undefined}
        initialNodeId={initialNodeId}
      />
    </>
  );
}
