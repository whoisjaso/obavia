import type { Metadata } from 'next';
import { loadScriptNodes } from '@apohenia/domain/seeds';
import { PracticeClient } from './PracticeClient';

export const metadata: Metadata = { title: 'Train' };

/** Owner: M-train. Server component: loads the script seed and passes plain nodes down. */
export default function PracticePage() {
  const seed = loadScriptNodes();
  const placeholder = seed._status !== undefined;
  const version = seed.versions[0];
  return (
    <>
      <h1 className="sr-only">Practice</h1>
      <PracticeClient nodes={seed.nodes} scriptVersionId={version?.id ?? 'none'} placeholder={placeholder} />
    </>
  );
}
