import type { Metadata } from 'next';
import { loadSyntheticProspects } from '@apohenia/domain/seeds';
import { ProspectsClient } from './ProspectsClient';

export const metadata: Metadata = { title: 'Queue' };

/**
 * Queue (DESIGN_SYSTEM §3.7): the records the session will dial, as cards — Avatar, company, contact,
 * city, one status glyph chip. No dial control lives here; the session dials from `/`. Every record
 * is fictional; suppression comes from `dial.suppression` in the browser.
 */
export default function ProspectsPage() {
  const seed = loadSyntheticProspects();
  return (
    <>
      <h1 className="sr-only">Prospects</h1>
      <ProspectsClient seed={seed} />
    </>
  );
}
