import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Calls' };

/** Owner: M-vocab. Replace this file wholesale. */
export default function CallsPage() {
  return (
    <>
      <PageHeader
        title="Calls"
        purpose="Call history: transcript turns, vocabulary events, dispositions and grounded post-call review with one next drill — synthetic transcripts only in Increment 1."
      />
      <EmptyState title="Call history is not built yet" increment="Increment 1 (synthetic) · Increment 4 (real)" owner="M-vocab">
        <p>
          Will be built here: a list of synthetic calls with their turns and vocabulary events, then in Increment 4
          immutable call events, consent epochs and transcript revisions from real consented calls. Transcript quotes
          stay separate from the representative&apos;s summary.
        </p>
      </EmptyState>
    </>
  );
}
