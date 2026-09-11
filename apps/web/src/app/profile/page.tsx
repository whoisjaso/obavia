import type { Metadata } from 'next';
import { loadIdentityInterview } from '@apohenia/domain/seeds';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = { title: 'Profile' };

/** Owner: M-me. Server page: passes the interview version so the client can build the profile from the stored session. */
export default function ProfilePage() {
  const { id, version, title, screens } = loadIdentityInterview();
  return (
    <>
      <h1 className="sr-only">Profile</h1>
      <ProfileClient version={{ id, version, title, screens }} />
    </>
  );
}
