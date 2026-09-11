import type { Metadata } from 'next';
import { loadScriptNodes, loadSyntheticProspects, loadSyntheticTranscripts } from '@apohenia/domain/seeds';
import { DialClient } from './DialClient';

export const metadata: Metadata = { title: 'Dial' };

/**
 * The front door (DESIGN_SYSTEM §3.1): one hero — the Call button — that starts a timed
 * sequential session in demo mode (synthetic prospects; nothing dials a phone). Server component:
 * loads the seeds and passes plain data down; the client owns the session.
 */
export default function DialPage() {
  const scripts = loadScriptNodes();
  const transcripts = loadSyntheticTranscripts();
  const prospects = loadSyntheticProspects();
  return (
    <>
      <h1 className="sr-only">Dial</h1>
      <DialClient nodes={scripts.nodes} versions={scripts.versions} transcripts={transcripts.transcripts} prospects={prospects} />
    </>
  );
}
