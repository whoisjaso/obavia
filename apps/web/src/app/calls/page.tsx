import type { Metadata } from 'next';
import Link from 'next/link';
import { loadSyntheticTranscripts } from '@apohenia/domain/seeds';
import { analyzeCall, callDurationSeconds, callOutcome, outcomeLabel } from '@apohenia/domain/vocabulary';
import { Badge, Card, PageHeader, Stack } from '@/components/ui';
import styles from './calls.module.css';

export const metadata: Metadata = { title: 'Calls' };

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Owner: M-vocab. Synthetic call history; each row opens the post-call review. */
export default function CallsPage() {
  const seed = loadSyntheticTranscripts();
  const rows = seed.transcripts.map((t) => {
    const analysis = analyzeCall(t.turns);
    const prospect = analysis.facts.find((f) => f.key === '{prospect_name}')?.value ?? 'Unknown';
    const dealership = analysis.facts.find((f) => f.key === '{dealership_name}')?.value ?? '';
    return {
      id: t.call_id,
      title: t.title,
      prospect,
      dealership,
      turns: analysis.turns.length,
      duration: formatDuration(callDurationSeconds(t.turns)),
      outcome: callOutcome(analysis),
      optOut: analysis.opt_out !== null,
    };
  });

  return (
    <>
      <PageHeader
        title="Calls"
        purpose="Call history: transcript turns, vocabulary events, dispositions and grounded post-call review with one next drill — synthetic transcripts only in Increment 1."
        aside={<Badge variant="warning">Synthetic calls only</Badge>}
      />
      <Stack gap={5}>
        <Card title={`${rows.length} synthetic calls`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Call</th>
                <th scope="col">Prospect</th>
                <th scope="col">Turns</th>
                <th scope="col">Duration</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/calls/${encodeURIComponent(r.id)}`}>{r.title}</Link>
                    <div className={styles.muted}>
                      <code>{r.id}</code>
                    </div>
                  </td>
                  <td>
                    {r.prospect}
                    {r.dealership ? <div className={styles.muted}>{r.dealership} (fictional)</div> : null}
                  </td>
                  <td>{r.turns}</td>
                  <td>{r.duration}</td>
                  <td>{r.optOut ? <Badge variant="warning">{outcomeLabel(r.outcome)}</Badge> : outcomeLabel(r.outcome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className={styles.muted}>
          Durations are derived from provider timestamps. Outcomes are derived from the prospect&apos;s own words (opt-out, agreed follow-up,
          deferral) — never from a model.
        </p>
      </Stack>
    </>
  );
}
