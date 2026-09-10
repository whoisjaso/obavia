import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Today' };

/** Owner: M-interview. Replace this file wholesale. */
export default function TodayPage() {
  return (
    <>
      <PageHeader
        title="Today"
        purpose="Your one next drill from the endorsed training plan, today's practice minimum, and what to review from recent calls."
      />
      <EmptyState title="Today's plan is not built yet" increment="Increment 1" owner="M-interview">
        <p>
          This screen will show the single next drill derived from your endorsed standards (cue → exact action →
          chosen duration → completion evidence), the difficult-day minimum, and recovery after a missed session. It
          appears only after the identity interview is completed and the profile is endorsed. A missed practice never
          erases previous work.
        </p>
      </EmptyState>
    </>
  );
}
