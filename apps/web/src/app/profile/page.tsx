import type { Metadata } from 'next';
import { loadIdentityInterview } from '@apohenia/domain/seeds';
import { PageHeader } from '@/components/ui';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = { title: 'Profile' };

/** Owner: M-interview. Server page: passes the interview version so the client can build the profile from the stored session. */
export default function ProfilePage() {
  const { id, version, title, screens } = loadIdentityInterview();
  return (
    <>
      <PageHeader
        title="Profile"
        purpose="Your reviewable identity profile — definitions of success, chosen standards, friction, preferred phrases, learning style, explicit unknowns — with source answer ids, endorsed by you before use."
      />
      <ProfileClient version={{ id, version, title, screens }} />
    </>
  );
}
