import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Identity interview' };

/** Owner: M-interview. Replace this file wholesale. */
export default function IdentityInterviewPage() {
  return (
    <>
      <PageHeader
        title="Identity interview"
        purpose="A self-directed, click-through interview — 30 base screens and 3 conditional screens, no typing required — that produces a profile you review and endorse before anything uses it."
      />
      <EmptyState title="The interview is not built yet" increment="Increment 1" owner="M-interview">
        <p>
          Will be built here: one question per screen with large selectable answer cards, clear selected state,
          next/back, skip, and mutually exclusive uncertainty/none choices; multi-select screens state their limit;
          conditional screens render from declared conditions; back edits invalidate dependent answers; answered,
          skipped and not-applicable are persisted separately; save/resume; a review screen. Seeded from{' '}
          <code>data/identity_interview.json</code> (currently a placeholder).
        </p>
      </EmptyState>
    </>
  );
}
