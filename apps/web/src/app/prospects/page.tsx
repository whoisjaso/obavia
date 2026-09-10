import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Prospects' };

/** Owner: M-vocab. Replace this file wholesale. */
export default function ProspectsPage() {
  return (
    <>
      <PageHeader
        title="Prospects"
        purpose="Companies, contacts, phone endpoints and contact-policy state for the prospects you are permitted to call — synthetic records only in demo mode."
      />
      <EmptyState title="Prospects are not built yet" increment="Increment 2" owner="M-vocab">
        <p>
          Will be built here: a synthetic prospect list in Increment 1 for practice context; real CRM import,
          contact-policy reviews and suppression arrive with secure persistence in Increment 2; approved external
          sources in Increment 6. Nothing here authorizes contacting anyone.
        </p>
      </EmptyState>
    </>
  );
}
