import type { Metadata } from 'next';
import { funnelDefinitions, rubricDefinition } from '@apohenia/domain/vocabulary';
import { InsightsClient } from './InsightsClient';

export const metadata: Metadata = { title: 'Insights' };

/**
 * Owner: M-me. Definitions come from the domain (server); counts come from local practice only.
 * Nothing about real calls is counted until real, consented calls exist (Increment 5).
 */
export default function InsightsPage() {
  return (
    <>
      <h1 className="sr-only">Insights</h1>
      <InsightsClient funnel={funnelDefinitions()} rubric={rubricDefinition()} />
    </>
  );
}
