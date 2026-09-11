import type { Metadata } from 'next';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = { title: 'Settings' };

/** Owner: M-me. Default assistance mode, local data export/delete — local demo mode only. */
export default function SettingsPage() {
  return (
    <>
      <h1 className="sr-only">Settings</h1>
      <SettingsClient />
    </>
  );
}
