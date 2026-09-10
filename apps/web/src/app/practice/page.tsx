import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Practice' };

/** Owner: M-practice. Replace this file wholesale. */
export default function PracticePage() {
  return (
    <>
      <PageHeader
        title="Practice"
        purpose="Practice Studio: exact recall, randomized node lookup, order rehearsal, branch classification, mirror duel and typed mock scenarios across five assistance modes — no paid API needed for the first screen."
      />
      <EmptyState title="Practice Studio is not built yet" increment="Increment 1" owner="M-practice">
        <p>
          Will be built here: choice-based drills against a published script version with memorization and
          conversation scores kept separate, assisted vs unassisted tracked separately, and text-only attempts marked
          tone_assessed: false. Choice-based synthetic practice is explicitly not a real AI voice call; voice roleplay
          arrives in Increment 5.
        </p>
      </EmptyState>
    </>
  );
}
