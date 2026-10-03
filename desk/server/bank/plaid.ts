/* The dealer's bank feed, read-only, through Plaid Transactions.
   POST {base}/transactions/sync with client_id, secret, access_token and the
   last cursor returns added / modified / removed transactions and the next
   cursor; repeat while has_more. Plaid's sign convention: a positive amount
   is money leaving the account, a negative amount is money coming in.
   Only money coming in, and only posted (not pending), becomes a Money line. */
import type { Money } from '../../src/lib/match';

export type PlaidTx = {
  transaction_id: string; date: string; amount: number; name: string; pending: boolean;
  merchant_name?: string | null;
  counterparties?: { name: string; type?: string }[] | null;
};
type SyncPage = { added: PlaidTx[]; modified: PlaidTx[]; removed: { transaction_id: string }[]; next_cursor: string; has_more: boolean };
export type PlaidCreds = { base: string; clientId: string; secret: string };   // base: https://sandbox.plaid.com or https://production.plaid.com

export function toMoney(t: PlaidTx): Money | null {
  if (t.pending || !(t.amount < 0)) return null;
  const person = t.counterparties?.find(c => c.type !== 'financial_institution' && c.type !== 'payment_app')?.name;
  return { id: `plaid:${t.transaction_id}`, source: 'bank', on: t.date, cents: Math.round(-t.amount * 100), text: t.name, from: person ?? undefined };
}

/** Pulls everything new since `cursor`. Returns the deposits and the cursor to keep for next time. */
export async function syncDeposits(creds: PlaidCreds, accessToken: string, cursor = '', fetcher: typeof fetch = fetch) {
  const added: Money[] = [], removed: string[] = [];
  for (let more = true, guard = 0; more && guard < 50; guard++) {
    const r = await fetcher(`${creds.base}/transactions/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: creds.clientId, secret: creds.secret, access_token: accessToken, cursor: cursor || undefined, count: 500 }),
    });
    if (!r.ok) throw new Error(`plaid transactions/sync ${r.status}`);
    const page = await r.json() as SyncPage;
    for (const t of [...page.added, ...page.modified]) { const m = toMoney(t); if (m) added.push(m); }
    removed.push(...page.removed.map(x => `plaid:${x.transaction_id}`));
    cursor = page.next_cursor; more = page.has_more;
  }
  return { added, removed, cursor };
}
