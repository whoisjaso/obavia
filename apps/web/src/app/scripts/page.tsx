import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Scripts' };

/** Owner: M-script. Replace this file wholesale. */
export default function ScriptsPage() {
  return (
    <>
      <PageHeader
        title="Scripts"
        purpose="Own-script editor: exact primary word tracks (stable within a version), source question ids, answer objectives, mirror variants, bridges, branches and approval state — with immutable published versions."
      />
      <EmptyState title="The script editor is not built yet" increment="Increment 1" owner="M-script">
        <p>
          Will be built here: the 51-node draft graph from <code>data/apohenia_script_nodes.json</code> (currently a
          placeholder) shown as Say this / Why this now / What to listen for / Mirror if unclear / Tone and pacing /
          Next likely branches; Jason&apos;s own-words track kept separate from the primary line; version publish with a
          content hash. Every node stays labelled draft until owner review; nothing here is live sales policy.
        </p>
      </EmptyState>
    </>
  );
}
