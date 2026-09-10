import type { Metadata } from 'next';
import Link from 'next/link';
import { CALL_STATUSES, FOLLOW_UP_WEEK_NOTE, FOLLOW_UP_WEEK_VIEW, PIPELINE_LANES, SYNTHETIC_PIPELINE_CARDS } from '@apohenia/domain/vocabulary';
import { Badge, Card, PageHeader, Stack } from '@/components/ui';
import styles from './pipeline.module.css';

export const metadata: Metadata = { title: 'Pipeline' };

/** Owner: M-vocab. Lanes are a view of agreed follow-ups and reasons — never permission to message. */
export default function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Pipeline"
        purpose="Agreed follow-ups with stage and reason, resource type, dates and timezone, permissions, delivery milestones, referral introductions and possible expansions — lanes are a view, not authorization to message."
        aside={<Badge variant="warning">Synthetic example cards</Badge>}
      />
      <Stack gap={5}>
        <section aria-labelledby="week-view">
          <h2 id="week-view" className={styles.h2}>
            Week view (display only)
          </h2>
          <p className={styles.note}>
            The source&apos;s {FOLLOW_UP_WEEK_VIEW.join(' / ')}-week lanes: {FOLLOW_UP_WEEK_NOTE}
          </p>
          <ul className={styles.weeks} aria-label="Week lanes">
            {FOLLOW_UP_WEEK_VIEW.map((w) => (
              <li key={w} className={styles.week}>
                Week {w}
                <div className={styles.muted}>a view, not permission to message</div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="lanes">
          <h2 id="lanes" className={styles.h2}>
            Lanes by stage / reason
          </h2>
          <div className={styles.lanes}>
            {PIPELINE_LANES.map((lane) => {
              const cards = SYNTHETIC_PIPELINE_CARDS.filter((c) => c.lane === lane.key);
              return (
                <Card key={lane.key} title={lane.label} headingLevel="h3" className={styles.lane}>
                  <p className={styles.definition}>{lane.definition}</p>
                  {cards.length === 0 ? (
                    <p className={styles.muted}>No example.</p>
                  ) : (
                    <ul className={styles.cards}>
                      {cards.map((c) => (
                        <li key={c.id} className={styles.card}>
                          <div className={styles.cardHead}>
                            <strong>{c.company}</strong>
                            <Badge variant="neutral">SYNTHETIC</Badge>
                          </div>
                          <div className={styles.muted}>{c.contact}</div>
                          <p>{c.summary}</p>
                          <div className={styles.muted}>
                            {c.agreed_when ? `Agreed: ${c.agreed_when} · ` : 'No date agreed · '}
                            {c.timezone}
                            {c.call_id ? (
                              <>
                                {' · '}
                                <Link href={`/calls/${encodeURIComponent(c.call_id)}`}>call review</Link>
                              </>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        <Card title="Call statuses (brief §9)">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Definition</th>
              </tr>
            </thead>
            <tbody>
              {CALL_STATUSES.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td>{s.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>No dialing exists in Increment 1. Statuses describe records; they never trigger a call.</p>
        </Card>
      </Stack>
    </>
  );
}
