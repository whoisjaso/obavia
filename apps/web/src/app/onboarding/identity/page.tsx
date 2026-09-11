import type { Metadata } from 'next';
import { isPlaceholderSeed, loadIdentityInterview } from '@apohenia/domain/seeds';
import { InterviewClient } from './InterviewClient';

export const metadata: Metadata = { title: 'Identity interview' };

/**
 * Owner: M-me. Server page: loads the seeded interview version and hands plain data to the
 * click-only flow (30 base + 3 conditional screens, one per screen, no typing required).
 */
export default function IdentityInterviewPage() {
  const seed = loadIdentityInterview();
  const placeholder = isPlaceholderSeed(seed);
  const { id, version, title, screens } = seed;
  return (
    <>
      <h1 className="sr-only">Identity interview</h1>
      <InterviewClient version={{ id, version, title, screens }} placeholder={placeholder} />
    </>
  );
}
