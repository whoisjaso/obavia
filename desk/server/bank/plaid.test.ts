import { describe, expect, it } from 'vitest';
import { syncDeposits, toMoney, type PlaidTx } from './plaid';

const tx = (o: Partial<PlaidTx>): PlaidTx => ({ transaction_id: 't1', date: '2026-10-09', amount: -126.28, name: 'ZELLE FROM MARIA EXAMPLE', pending: false, ...o });

describe('Plaid bank feed', () => {
  it('keeps posted money coming in, in cents, with the person who sent it', () => {
    expect(toMoney(tx({ counterparties: [{ name: 'Maria Example', type: 'person' }] })))
      .toEqual({ id: 'plaid:t1', source: 'bank', on: '2026-10-09', cents: 12628, text: 'ZELLE FROM MARIA EXAMPLE', from: 'Maria Example' });
    expect(toMoney(tx({ amount: 45.1 }))).toBeNull();          // money going out
    expect(toMoney(tx({ pending: true }))).toBeNull();
    expect(toMoney(tx({ counterparties: [{ name: 'Zelle', type: 'payment_app' }] }))?.from).toBeUndefined();
  });
  it('pages through transactions/sync and returns the next cursor', async () => {
    const calls: unknown[] = [];
    const pages = [
      { added: [tx({ transaction_id: 'a' })], modified: [], removed: [], next_cursor: 'c1', has_more: true },
      { added: [tx({ transaction_id: 'b', amount: 20 })], modified: [], removed: [{ transaction_id: 'z' }], next_cursor: 'c2', has_more: false },
    ];
    const fake = (async (_u: string, init: RequestInit) => { calls.push(JSON.parse(String(init.body))); return new Response(JSON.stringify(pages.shift())); }) as typeof fetch;
    const r = await syncDeposits({ base: 'https://sandbox.plaid.com', clientId: 'id', secret: 's' }, 'access-x', '', fake);
    expect(r).toMatchObject({ cursor: 'c2', removed: ['plaid:z'] });
    expect(r.added.map(m => m.id)).toEqual(['plaid:a']);
    expect(calls[1]).toMatchObject({ access_token: 'access-x', cursor: 'c1' });
  });
});
