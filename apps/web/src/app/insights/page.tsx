import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Insights' };

/** Owner: M-vocab. Replace this file wholesale. */
export default function InsightsPage() {
  return (
    <>
      <PageHeader
        title="Insights"
        purpose="Evidence-based measurement: funnel denominators, assisted vs unassisted ability, drill completion and honest gaps — never an unmeasured claim."
      />
      <EmptyState title="Insights are not built yet" increment="Increment 5" owner="M-vocab">
        <p>
          Will be built here: memorization and conversation metrics kept separate, practice completion evidence, and
          call funnel counts with denominators. Increment 1 may show practice-attempt counts from local storage only.
        </p>
      </EmptyState>
    </>
  );
}
