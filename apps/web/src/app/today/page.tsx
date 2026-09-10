import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { TodayClient } from './TodayClient';

export const metadata: Metadata = { title: 'Today' };

/** Rendered per request so the date is today's, not the build's. */
export const dynamic = 'force-dynamic';

/** Owner: M-interview. Server page: passes today's date (UTC, yyyy-mm-dd) so the client's day key matches on both renders. */
export default function TodayPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        title="Today"
        purpose="Your one next drill from the endorsed training plan, today's practice minimum, and what to review from recent calls."
      />
      <TodayClient today={today} />
    </>
  );
}
