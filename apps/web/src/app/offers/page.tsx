import type { Metadata } from 'next';
import { loadOffers } from '@apohenia/domain/seeds';
import { Badge, PageHeader } from '@/components/ui';
import { OffersClient } from './OffersClient';

export const metadata: Metadata = { title: 'Offers' };

/** Owner: M-script. Server component: loads the offers seed and passes plain data down. */
export default function OffersPage() {
  const seed = loadOffers();
  const placeholder = seed._status !== undefined;
  return (
    <>
      <PageHeader
        title="Offers"
        purpose="Offer Studio: versioned offers with buyer type, problem, prerequisites, deliverables, exclusions, three genuine pillars, price (null until set — never 0), estimated vs committed timing, and draft/reviewed/published/retired status."
        aside={placeholder ? <Badge variant="warning">placeholder — to be authored</Badge> : <Badge variant="warning">Draft offers · nothing here is live sales policy</Badge>}
      />
      <OffersClient offers={seed.offer_versions} placeholder={placeholder} />
    </>
  );
}
