import type { Metadata } from 'next';
import { loadScriptNodes } from '@apohenia/domain/seeds';
import { Badge, PageHeader } from '@/components/ui';
import { PracticeClient } from './PracticeClient';

export const metadata: Metadata = { title: 'Practice' };

/** Owner: M-practice. Server component: loads the script seed and passes plain nodes down. */
export default function PracticePage() {
  const seed = loadScriptNodes();
  const placeholder = seed._status !== undefined;
  const version = seed.versions[0];
  return (
    <>
      <PageHeader
        title="Practice"
        purpose="Exact recall, randomized node lookup, order rehearsal, branch classification, mirror duel, delivery replay, vocabulary meaning, full mock and practice-this-moment — typed, choice-based, no paid API."
        aside={
          placeholder ? (
            <Badge variant="warning">placeholder — to be authored</Badge>
          ) : (
            <Badge variant="warning">Choice-based synthetic practice — not a real AI voice call</Badge>
          )
        }
      />
      <PracticeClient nodes={seed.nodes} scriptVersionId={version?.id ?? 'none'} placeholder={placeholder} />
    </>
  );
}
