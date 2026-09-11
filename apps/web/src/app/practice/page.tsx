import type { Metadata } from 'next';
import { loadScriptNodes } from '@apohenia/domain/seeds';
import { demoQueue, knownFactsFor } from '@apohenia/domain/dialer';
import { PracticeClient } from './PracticeClient';

export const metadata: Metadata = { title: 'Train' };

/** Owner: M-train. Server component: loads the script seed and passes plain nodes down. */
export default function PracticePage() {
  const seed = loadScriptNodes();
  const placeholder = seed._status !== undefined;
  const version = seed.versions[0];
  // Slots in Train resolve against one FICTIONAL practice prospect (the first synthetic record) — never a real person.
  const practice = demoQueue()[0];
  const practiceFacts = practice ? knownFactsFor(practice) : {};
  const practiceLabel = practice ? `${practiceFacts['prospect_name'] ?? practice.contact} at ${practice.company}` : 'no record';
  return (
    <>
      <h1 className="sr-only">Practice</h1>
      <PracticeClient nodes={seed.nodes} scriptVersionId={version?.id ?? 'none'} placeholder={placeholder} practiceFacts={practiceFacts} practiceLabel={practiceLabel} />
    </>
  );
}
