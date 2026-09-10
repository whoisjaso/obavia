import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Pipeline' };

/** Owner: M-vocab. Replace this file wholesale. */
export default function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Pipeline"
        purpose="Agreed follow-ups with stage and reason, resource type, dates and timezone, permissions, delivery milestones, referral introductions and possible expansions — lanes are a view, not authorization to message."
      />
      <EmptyState title="The pipeline is not built yet" increment="Increment 2" owner="M-vocab">
        <p>
          Will be built here: follow-up tasks and opportunities with the source&apos;s 1/2/4/6/8-week lanes as an
          optional view, and own reasons including budget, authority, implementation, no fit, deferral and no contact.
          Requires secure persistence (Increment 2).
        </p>
      </EmptyState>
    </>
  );
}
