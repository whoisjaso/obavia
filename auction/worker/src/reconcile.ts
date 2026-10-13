/* The nightly reconciliation (phases.md, Phase 2 server gate: "the nightly
   report says equal seven nights running"). Two comparisons:
   1. Every lot's D1 copy against its Durable Object, the authority. A copy
      that differs is rewritten by the object itself, and the id is recorded.
   2. The Whop balance against what Obavia holds for others (reserve ratio
      must be 1): the deposits held plus the payouts owed to dealers (held,
      not yet sent or paid). GET /ledger_accounts/{biz_…} → balances[].balance
      in USD. Only the settled `balance` is counted; pending and reserve are
      noted, not added.
   One row per run in `reconciliations` (equal 1 or 0, the ids that differed,
   and since 0014 which field of each: `differences`); the admin reads the last
   seven on GET /admin/exposure and the streak on GET /admin/reconcile. */
import type { Env } from './env';
import { Whop } from './whop';

export const DEPOSIT_CENTS = 25_000;

export type Row = {
  id: string; ran_at: number; lots_checked: number; lots_differing: number; differing: string[];
  deposits_held: number; whop_balance_cents: number | null; equal: 0 | 1; note: string;
  payouts_owed: number; payouts_owed_cents: number;
  differences: Difference[];
};
/** One field of one lot where the copy and the object disagreed; `object: null` with `field: 'object'` when the object is gone. */
export type Difference = { lot: string; field: string; copy: unknown; object: unknown };

type LotLike = { high?: number; bids?: number; closesAt?: number; leader?: string; closed?: unknown; sale?: unknown };
const FIELDS = ['high', 'bids', 'closesAt', 'leader', 'closed', 'sale'] as const;

/** The fields that move money or the hammer. A stable string, so key order never reads as a difference. */
function facts(l: LotLike) {
  return stable({ high: l.high ?? null, bids: l.bids ?? null, closesAt: l.closesAt ?? null, leader: l.leader ?? null, closed: l.closed ?? null, sale: l.sale ?? null });
}
/** Which of the fields differ, with both sides, for the admin to read. */
function fieldDiffs(id: string, copy: LotLike, live: LotLike): Difference[] {
  return FIELDS.filter(f => stable(copy[f] ?? null) !== stable(live[f] ?? null)).map(f => ({ lot: id, field: f, copy: copy[f] ?? null, object: live[f] ?? null }));
}
function stable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.keys(x).sort().filter(k => (x as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable((x as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(x);
}

export async function reconcile(env: Env): Promise<Row> {
  const ranAt = Date.now();
  const notes: string[] = [];
  const differing: string[] = [];
  const unrepaired: string[] = [];
  const differences: Difference[] = [];

  const rows = (await env.DB.prepare('SELECT id, lot FROM lots').all<{ id: string; lot: string }>()).results;
  for (const row of rows) {
    const stub = env.AUCTION.get(env.AUCTION.idFromName(row.id));
    let copy: LotLike;
    try { copy = JSON.parse(row.lot); } catch { copy = {}; }
    let live: LotLike | null = null;
    try {
      const r = await stub.fetch(`https://auction/lots/${encodeURIComponent(row.id)}`);
      if (r.ok) live = await r.json<LotLike>();
    } catch { live = null; }
    if (!live) { differing.push(row.id); unrepaired.push(row.id); differences.push({ lot: row.id, field: 'object', copy: facts(copy), object: null }); continue; }   // a copy with no object: kept for the owner to read, never deleted here
    if (facts(copy) === facts(live)) continue;
    differing.push(row.id);
    differences.push(...fieldDiffs(row.id, copy, live));
    // repair: the object writes its own copy (it holds the dealer and the ceiling the public lot leaves out), then we read it back
    try { await stub.fetch(`https://auction/lots/${encodeURIComponent(row.id)}/copy`, { method: 'POST' }); } catch { /* checked below */ }
    const after = await env.DB.prepare('SELECT lot FROM lots WHERE id = ?1').bind(row.id).first<{ lot: string }>();
    let fixed = false;
    try { fixed = !!after && facts(JSON.parse(after.lot)) === facts(live); } catch { fixed = false; }
    if (!fixed) unrepaired.push(row.id);
  }
  if (differing.length) notes.push(`${differing.length} copy(ies) differed from the object; repaired from the object: ${differing.length - unrepaired.length}`);
  if (unrepaired.length) notes.push(`not repaired (no object or the rewrite did not land): ${unrepaired.join(', ')}`);

  const held = (await env.DB.prepare("SELECT COUNT(*) AS n FROM buyers WHERE deposit_status = 'captured'").first<{ n: number }>())?.n ?? 0;
  // a payout owed is the dealer's money sitting in the balance: a liability like a deposit. A row with held = 0 is not
  // counted: the deposit was never captured at that moment, so nothing came in and nothing is sent (auction.ts payDealer)
  const owed = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS usd FROM dealer_payouts WHERE state = 'owed' AND held = 1").first<{ n: number; usd: number }>();
  const owedN = owed?.n ?? 0, owedCents = Math.round((owed?.usd ?? 0) * 100);
  const liabilities = held * DEPOSIT_CENTS + owedCents;

  let balanceCents: number | null = null;
  const whop = new Whop(env);
  if (!whop.ready) notes.push('Whop not configured: balance not read');
  else if (!env.WHOP_ACCOUNT_ID) notes.push('WHOP_ACCOUNT_ID not set: balance not read');
  else {
    try {
      const b = await whopUsdBalance(env);
      balanceCents = b.balanceCents;
      notes.push(`Whop USD balance ${cents(b.balanceCents)} (pending ${cents(b.pendingCents)}, reserve ${cents(b.reserveCents)} not counted); deposits held ${held} × $250 = ${cents(held * DEPOSIT_CENTS)}; payouts owed ${owedN} = ${cents(owedCents)}; liabilities ${cents(liabilities)}`);
    } catch (e) {
      notes.push(`Whop balance read failed: ${String((e as Error).message ?? e).slice(0, 200)}`);
    }
  }
  const covered = balanceCents === null || balanceCents >= liabilities;
  if (!covered) notes.push('balance below deposits held and payouts owed: reserve ratio under 1');

  const out: Row = {
    id: `rec_${ranAt}_${crypto.randomUUID().slice(0, 8)}`, ran_at: ranAt, lots_checked: rows.length, lots_differing: differing.length, differing,
    deposits_held: held, whop_balance_cents: balanceCents, equal: differing.length === 0 && covered ? 1 : 0, note: notes.join('; ') || 'equal',
    payouts_owed: owedN, payouts_owed_cents: owedCents,
    differences,
  };
  await env.DB.prepare('INSERT INTO reconciliations (id, ran_at, lots_checked, lots_differing, differing, deposits_held, whop_balance_cents, equal, note, payouts_owed, payouts_owed_cents, differences) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)')
    .bind(out.id, out.ran_at, out.lots_checked, out.lots_differing, JSON.stringify(out.differing), out.deposits_held, out.whop_balance_cents, out.equal, out.note, out.payouts_owed, out.payouts_owed_cents, JSON.stringify(out.differences)).run();
  return out;
}

export async function lastReconciliations(env: Env, n = 7): Promise<Row[]> {
  const r = await env.DB.prepare('SELECT * FROM reconciliations ORDER BY ran_at DESC LIMIT ?1').bind(Math.max(1, Math.min(n, 100)))
    .all<Omit<Row, 'differing' | 'differences'> & { differing: string; differences: string | null }>();
  return r.results.map(x => ({ ...x, differing: JSON.parse(x.differing || '[]'), differences: JSON.parse(x.differences || '[]') }));
}

/** How many nights running, newest first, said equal: 0 when the latest did not. The gate reads 7. */
export const equalNights = (rows: Pick<Row, 'equal'>[]): number => { let n = 0; for (const r of rows) { if (r.equal !== 1) break; n += 1; } return n; };

/** GET /ledger_accounts/{id} (permission company:balance:read): `balances[]` of { balance, pending_balance, reserve_balance, currency }, amounts in dollars. */
async function whopUsdBalance(env: Env) {
  const base = (env.WHOP_API_BASE ?? 'https://api.whop.com/api/v1').replace(/\/$/, '');
  const r = await fetch(`${base}/ledger_accounts/${encodeURIComponent(env.WHOP_ACCOUNT_ID!)}`, { headers: { authorization: `Bearer ${env.WHOP_API_KEY}` } });
  if (!r.ok) throw new Error(`whop GET /ledger_accounts: ${r.status}`);
  const body = await r.json<{ balances?: { balance?: number; pending_balance?: number; reserve_balance?: number; currency?: string }[] }>();
  const usd = (body.balances ?? []).find(b => (b.currency ?? '').toLowerCase() === 'usd');
  if (!usd || typeof usd.balance !== 'number') throw new Error('no USD balance on the ledger account');
  return { balanceCents: Math.round(usd.balance * 100), pendingCents: Math.round((usd.pending_balance ?? 0) * 100), reserveCents: Math.round((usd.reserve_balance ?? 0) * 100) };
}

const cents = (c: number) => `$${(c / 100).toFixed(2)}`;

/** The reserve ratio from a reconciliation: the settled Whop balance over the deposits held plus the payouts owed.
    Null when no reconciliation ran or the balance was not read (the admin page says "Not read", never 1.00).
    With nothing held or owed: 1 when the balance read is not negative, else 0. Rounded down to two places: 0.996 shows 0.99, never 1.00. */
export function reserveRatio(r: Pick<Row, 'whop_balance_cents' | 'deposits_held'> & { payouts_owed_cents?: number | null } | undefined): number | null {
  if (!r || r.whop_balance_cents == null) return null;
  const liabilities = r.deposits_held * DEPOSIT_CENTS + (r.payouts_owed_cents ?? 0);
  if (liabilities <= 0) return r.whop_balance_cents >= 0 ? 1 : 0;
  return Math.floor((r.whop_balance_cents / liabilities) * 100) / 100;
}
