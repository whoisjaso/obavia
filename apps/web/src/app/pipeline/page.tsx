import type { Metadata } from 'next';
import { PipelineClient } from './PipelineClient';

export const metadata: Metadata = { title: 'Follow-ups' };

/**
 * Follow-ups (DESIGN_SYSTEM §3.7): lanes as horizontally scrollable columns of cards, fed by the
 * dispositions recorded in `dial.history` (a callback lands in Agreed follow-up with its time chip).
 * The source's 1/2/4/6/8-week view sits behind the info button: a view, never permission to message.
 */
export default function PipelinePage() {
  return (
    <>
      <h1 className="sr-only">Pipeline</h1>
      <PipelineClient />
    </>
  );
}
