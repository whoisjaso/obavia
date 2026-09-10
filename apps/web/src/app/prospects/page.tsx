import type { Metadata } from 'next';
import { prospectRows } from '@apohenia/domain/vocabulary';
import { Badge, Button, Card, PageHeader, Stack } from '@/components/ui';
import styles from './prospects.module.css';

export const metadata: Metadata = { title: 'Prospects' };

/** Owner: M-vocab. Synthetic CRM records only; nothing here authorizes a call. */
export default function ProspectsPage() {
  const rows = prospectRows();
  return (
    <>
      <PageHeader
        title="Prospects"
        purpose="Companies, contacts, phone endpoints and contact-policy state for the prospects you are permitted to call — synthetic records only in demo mode."
        aside={<Badge variant="warning">FICTIONAL records</Badge>}
      />
      <Stack gap={5}>
        <p className={styles.notice} role="note">
          <strong>CSV import — Increment 2.</strong> Manual entry and validated CSV import arrive with secure persistence. A CSV row is never permission
          to call. Numbers below are fake (+1 555-01xx range), unverified, jurisdiction unknown.
        </p>
        <Card title={`${rows.length} synthetic contacts`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Contact</th>
                <th scope="col">Location / company</th>
                <th scope="col">Phone endpoints</th>
                <th scope="col">Contact policy</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.contact.id}>
                  <td>
                    <strong>{r.contact.name}</strong>
                    <div className={styles.muted}>{r.contact.role}</div>
                    {r.contact.call_id ? (
                      <div className={styles.muted}>
                        synthetic call: <code>{r.contact.call_id}</code>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {r.location.name}
                    <div className={styles.muted}>
                      {r.company.name} ({r.company.kind === 'dealer_group' ? 'dealer group' : 'single store'}) · {r.location.city}, {r.location.state} · {r.location.timezone}
                    </div>
                    {r.location.switchboard_endpoint_id ? <div className={styles.muted}>shares a switchboard with another location</div> : null}
                  </td>
                  <td>
                    <ul className={styles.endpoints}>
                      {r.endpoints.map((e) => (
                        <li key={e.id}>
                          <code>{e.e164}</code>
                          <div className={styles.muted}>
                            {e.label} · source: {e.source} · verified: never
                          </div>
                        </li>
                      ))}
                    </ul>
                    {r.shares_number_with.length > 0 ? <div className={styles.muted}>number shared with: {r.shares_number_with.join(', ')}</div> : null}
                  </td>
                  <td>
                    <div>Contact policy: requires_review (no reviewed policy yet)</div>
                    {r.suppression ? <Badge variant="warning">opt-out requested — suppressed</Badge> : null}
                  </td>
                  <td>
                    <Button disabled aria-disabled="true" title="No telephony in Increment 1 and no authorized campaign">
                      Call — unavailable: no telephony in Increment 1 and no authorized campaign
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className={styles.muted}>
          Deduplication keeps companies, locations, contacts and endpoints separate: a dealer group with two locations on one switchboard stays two
          locations; two contacts on one number stay two contacts.
        </p>
      </Stack>
    </>
  );
}
