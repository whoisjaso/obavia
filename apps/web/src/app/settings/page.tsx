import type { Metadata } from 'next';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = { title: 'Settings' };

/** Skeleton-owned. Local storage inspector, export/delete, default assistance mode. */
export default function SettingsPage() {
  return <SettingsClient />;
}
