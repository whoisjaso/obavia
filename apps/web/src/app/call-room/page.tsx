import type { Metadata } from 'next';
import { loadScriptNodes, loadSyntheticTranscripts } from '@apohenia/domain/seeds';
import { PageHeader } from '@/components/ui';
import { CallRoomClient } from './CallRoomClient';

export const metadata: Metadata = { title: 'Call Room' };

/** Owner: M-vocab. Server page: loads seeds, passes plain data to the client workspace. */
export default function CallRoomPage() {
  const scripts = loadScriptNodes();
  const transcripts = loadSyntheticTranscripts();
  return (
    <>
      <PageHeader
        title="Call Room"
        purpose="The operating workspace: business context and permission state on the left, the large exact script line with stage, bridge and controls in the center, and the conspicuous THEIR WORDS strip, confirmed facts and one missing field on the right."
      />
      <CallRoomClient
        transcripts={transcripts.transcripts}
        nodes={scripts.nodes}
        versions={scripts.versions}
        nodesPlaceholder={scripts._status !== undefined || scripts.nodes.length === 0}
      />
    </>
  );
}
