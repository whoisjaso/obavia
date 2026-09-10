import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Offers' };

/** Owner: M-script. Replace this file wholesale. */
export default function OffersPage() {
  return (
    <>
      <PageHeader
        title="Offers"
        purpose="Offer Studio: versioned offers with buyer type, problem, prerequisites, deliverables, exclusions, three genuine pillars, price (null until set — never 0), estimated vs committed timing, and draft/reviewed/published/retired status."
      />
      <EmptyState title="Offer Studio is not built yet" increment="Increment 1" owner="M-script">
        <p>
          Will be built here: the draft research offer (dealership inquiry follow-through) as an editable draft, the
          fictional practice offer clearly banded FICTIONAL TRAINING OFFER — NOT A REAL QUOTE and isolated from live
          offers, and the version lifecycle. Seeded from <code>data/offers.json</code> (currently a placeholder). No
          live price or proposal actions until a real offer is approved.
        </p>
      </EmptyState>
    </>
  );
}
