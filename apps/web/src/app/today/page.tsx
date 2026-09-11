import type { Metadata } from 'next';
import { loadIdentityInterview } from '@apohenia/domain/seeds';
import { TodayClient } from './TodayClient';

export const metadata: Metadata = { title: 'Me' };

/** Rendered per request so the fallback date is today's, not the build's. */
export const dynamic = 'force-dynamic';

/**
 * Owner: M-me. Me (DESIGN_SYSTEM §3.6). Server page: loads the interview version (so Today can
 * check the endorsed profile against the current session) and passes the server date only as the
 * pre-hydration fallback; the client re-keys the day on the browser's local date.
 */
export default function TodayPage() {
  const { id, version, title, screens } = loadIdentityInterview();
  const serverDay = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1 className="sr-only">Today</h1>
      <TodayClient version={{ id, version, title, screens }} serverDay={serverDay} />
    </>
  );
}
