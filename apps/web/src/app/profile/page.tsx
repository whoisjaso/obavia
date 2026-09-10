import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Profile' };

/** Owner: M-interview. Replace this file wholesale. */
export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        purpose="Your reviewable identity profile — definitions of success, chosen standards, friction, preferred phrases, learning style, explicit unknowns — with source answer ids, endorsed by you before use."
      />
      <EmptyState title="The profile is not built yet" increment="Increment 1" owner="M-interview">
        <p>
          Will be built here: each profile section with the answer ids it was built from, an explicit unknowns list,
          an endorse action (nothing downstream reads an unendorsed profile), correction and scoped export/delete, and
          the training plan derived from endorsed standards. No shame scores, readiness percentages or moral labels.
          Private beliefs never enter prospect-visible context.
        </p>
      </EmptyState>
    </>
  );
}
