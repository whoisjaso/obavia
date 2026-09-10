import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadScriptNodes, loadSyntheticTranscripts } from '@apohenia/domain/seeds';
import { Badge, PageHeader } from '@/components/ui';
import { CallDetailClient } from '../CallDetailClient';

export const metadata: Metadata = { title: 'Call review' };

/** Facts the rule-based extractor can establish; nodes needing only these are considered "covered". */
const DERIVABLE = new Set(['{prospect_name}', '{dealership_name}', '{stated_goal}', '{stated_problem}', '{their_word}', '{reconnect_window}']);

export function generateStaticParams() {
  return loadSyntheticTranscripts().transcripts.map((t) => ({ callId: t.call_id }));
}

/** Owner: M-vocab. One synthetic call: review, rubric, transcript with provenance, human corrections. */
export default async function CallDetailPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  const transcript = loadSyntheticTranscripts().transcripts.find((t) => t.call_id === decodeURIComponent(callId));
  if (!transcript) notFound();
  const nodes = loadScriptNodes().nodes.filter((n) => n.required_context.every((k) => DERIVABLE.has(k)));
  return (
    <>
      <PageHeader
        title="Call review"
        purpose="Grounded post-call review of one synthetic call: one strength, one correction, a better question, one drill, the outcome, and the uncertainties."
        aside={<Badge variant="warning">Synthetic</Badge>}
      />
      <p style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/calls">← All calls</Link>
      </p>
      <CallDetailClient transcript={transcript} nodesCovered={nodes.map((n) => ({ id: n.id, stage: n.stage, required_context: n.required_context }))} />
    </>
  );
}
