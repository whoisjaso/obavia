import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Call Room' };

/** Owner: M-vocab. Replace this file wholesale. */
export default function CallRoomPage() {
  return (
    <>
      <PageHeader
        title="Call Room"
        purpose="The operating workspace: business context and permission state on the left, the large exact script line with stage, bridge and controls in the center, and the conspicuous THEIR WORDS strip, confirmed facts and one missing field on the right."
      />
      <EmptyState title="The Call Room is not built yet" increment="Increment 1 (synthetic) · Increment 3–4 (live)" owner="M-vocab">
        <p>
          Increment 1 builds the three-column layout driven by synthetic transcripts from{' '}
          <code>data/synthetic_transcripts.json</code>: large stable keyword pins (24–36px), provenance labels
          (prospect said / seller proposed and confirmed / seller only / hypothesis), corrections such as &ldquo;profit, not
          revenue&rdquo;, and interim text shown as provisional. Real dialing (Increment 3) and consented transcription with
          grounded coaching (Increment 4) come later. This demo cannot dial.
        </p>
      </EmptyState>
    </>
  );
}
