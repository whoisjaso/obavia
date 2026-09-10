import type { Metadata } from 'next';
import { funnelDefinitions, rubricDefinition } from '@apohenia/domain/vocabulary';
import { Badge, Card, EmptyState, PageHeader, Stack } from '@/components/ui';
import styles from './insights.module.css';

export const metadata: Metadata = { title: 'Insights' };

/** Owner: M-vocab. Definitions only in Increment 1 — nothing is counted until real calls exist. */
export default function InsightsPage() {
  const funnel = funnelDefinitions();
  const rubric = rubricDefinition();
  return (
    <>
      <PageHeader
        title="Insights"
        purpose="Evidence-based measurement: funnel denominators, assisted vs unassisted ability, drill completion and honest gaps — never an unmeasured claim."
        aside={<Badge variant="neutral">Definitions only</Badge>}
      />
      <Stack gap={5}>
        <EmptyState title="No real calls yet — nothing is counted" increment="Increment 5" owner="M-vocab">
          <p>
            Synthetic calls are never counted. When real, consented calls exist, every metric below shows its numerator, denominator, date range,
            offer and script version, inbound/outbound source and sample size. A tiny sample never supports a claim that a script caused growth.
          </p>
        </EmptyState>

        <Card title="Funnel definitions">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Numerator</th>
                <th scope="col">Denominator</th>
                <th scope="col">Date range</th>
                <th scope="col">Offer / script version</th>
                <th scope="col">Source</th>
                <th scope="col">Sample size</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td>{s.numerator}</td>
                  <td>{s.denominator}</td>
                  <td className={styles.muted}>—</td>
                  <td className={styles.muted}>—</td>
                  <td className={styles.muted}>inbound / outbound — none</td>
                  <td className={styles.muted}>0 (nothing counted)</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>
            Missing data is reported as missing, never as zero performance. No dollar-valued opportunity estimates unless amounts and assumptions are
            entered and labelled.
          </p>
        </Card>

        <Card title={rubric.label}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Criterion</th>
                <th scope="col">Weight</th>
                <th scope="col">What it looks at</th>
              </tr>
            </thead>
            <tbody>
              {rubric.criteria.map((c) => (
                <tr key={c.key}>
                  <td>{c.label}</td>
                  <td>{c.weight}</td>
                  <td>{c.description}</td>
                </tr>
              ))}
              <tr>
                <td>Total</td>
                <td>{rubric.total}</td>
                <td>Internal training rubric — not a validated universal model.</td>
              </tr>
            </tbody>
          </table>
          <ul className={styles.notes}>
            <li>Automatic fail regardless of score: {rubric.automatic_fail.join(', ')}.</li>
            {rubric.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            <li>Text-only reviews mark tone &ldquo;not assessed&rdquo; — never an invented acoustic rating.</li>
          </ul>
        </Card>
      </Stack>
    </>
  );
}
