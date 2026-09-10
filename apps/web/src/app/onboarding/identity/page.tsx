import type { Metadata } from 'next';
import { isPlaceholderSeed, loadIdentityInterview } from '@apohenia/domain/seeds';
import { PageHeader } from '@/components/ui';
import { InterviewClient } from './InterviewClient';

export const metadata: Metadata = { title: 'Identity interview' };

/** Owner: M-interview. Server page: loads the seeded interview version and hands plain data to the client flow. */
export default function IdentityInterviewPage() {
  const seed = loadIdentityInterview();
  const placeholder = isPlaceholderSeed(seed);
  const { id, version, title, screens } = seed;
  return (
    <>
      <PageHeader
        title="Identity interview"
        purpose="A self-directed, click-through interview — 30 base screens and up to 3 conditional screens, no typing required — that produces a profile you review and endorse before anything uses it."
      />
      <InterviewClient version={{ id, version, title, screens }} placeholder={placeholder} />
    </>
  );
}
