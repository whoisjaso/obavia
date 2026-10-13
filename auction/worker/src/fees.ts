/* Obavia's fee, behind the GDN (Wave 3-A; gap table §4 W3-A; growth plan line 88; 43 TAC §215.85; decisions §0, §1 Fee).

   The flat seller-side fee is invoiced to the dealer on Whop, once per started car, and only after Obavia's own GDN
   issued. The gate is the `platform` row (migration 0016): while `gdn_issued_at` is null, `feeFor` returns null and
   writes nothing, so money_events carries zero rows WHERE type LIKE 'fee.%'. The numbers are typed by the owner
   through W3-B's POST /admin/gdn (`setPlatform`), never written here (gap table deviation 9: $199 and $299 are
   ASSUMPTIONS). A car started before the GDN issued carries no fee either. The fee is never taken from the buyer's
   balance: it is its own invoice, on Obavia's account, to the dealer. Nothing here puts a fee or a date on the glass.

   This file also holds what the two invoice kinds share (the `invoices` row, migration 0016), so src/invoice.ts
   imports from here and nothing imports in a circle. */
import type { Env } from './env';
import { Whop, type WhopInvoice } from './whop';

/* ---------------------------------------------------------------- the platform row */

export type PlatformRow = { gdnIssuedAt: number | null; feePerCarCents: number | null; feeMonthlyCents: number | null; balancePayee: 'dealer' | null; updatedAt: number };
type PlatformDb = { gdn_issued_at: number | null; fee_per_car_cents: number | null; fee_monthly_cents: number | null; balance_payee: string | null; updated_at: number };

/** The one platform row, or null while the owner has set nothing. */
export async function platformRow(env: Env): Promise<PlatformRow | null> {
  const r = await env.DB.prepare('SELECT gdn_issued_at, fee_per_car_cents, fee_monthly_cents, balance_payee, updated_at FROM platform WHERE id = 1').first<PlatformDb>();
  if (!r) return null;
  return { gdnIssuedAt: r.gdn_issued_at, feePerCarCents: r.fee_per_car_cents, feeMonthlyCents: r.fee_monthly_cents, balancePayee: r.balance_payee === 'dealer' ? 'dealer' : null, updatedAt: r.updated_at };
}

export type PlatformPatch = Partial<{ gdnIssuedAt: number | null; feePerCarCents: number | null; feeMonthlyCents: number | null; balancePayee: 'dealer' | null }>;

/** W3-B's POST /admin/gdn writes through here: only the fields given move; a field not given keeps its value. Cents are
    whole non-negative integers; gdnIssuedAt is a time in ms; balancePayee is 'dealer' or null (gap table deviation 2).
    Throws 'bad_platform' on anything else and writes nothing. The money event (admin.gdn) is the route's to write. */
export async function setPlatform(env: Env, patch: PlatformPatch, now = Date.now()): Promise<PlatformRow> {
  const cents = (v: unknown) => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100_000_000);
  if (!(patch.gdnIssuedAt === undefined || patch.gdnIssuedAt === null || (typeof patch.gdnIssuedAt === 'number' && Number.isFinite(patch.gdnIssuedAt) && patch.gdnIssuedAt > 0))) throw new Error('bad_platform');
  if (!(patch.feePerCarCents === undefined || cents(patch.feePerCarCents)) || !(patch.feeMonthlyCents === undefined || cents(patch.feeMonthlyCents))) throw new Error('bad_platform');
  if (!(patch.balancePayee === undefined || patch.balancePayee === null || patch.balancePayee === 'dealer')) throw new Error('bad_platform');
  const cur = await platformRow(env);
  const next = {
    gdnIssuedAt: patch.gdnIssuedAt === undefined ? cur?.gdnIssuedAt ?? null : patch.gdnIssuedAt,
    feePerCarCents: patch.feePerCarCents === undefined ? cur?.feePerCarCents ?? null : patch.feePerCarCents,
    feeMonthlyCents: patch.feeMonthlyCents === undefined ? cur?.feeMonthlyCents ?? null : patch.feeMonthlyCents,
    balancePayee: patch.balancePayee === undefined ? cur?.balancePayee ?? null : patch.balancePayee,
  };
  await env.DB.prepare(`INSERT INTO platform (id, gdn_issued_at, fee_per_car_cents, fee_monthly_cents, balance_payee, updated_at) VALUES (1, ?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(id) DO UPDATE SET gdn_issued_at = ?1, fee_per_car_cents = ?2, fee_monthly_cents = ?3, balance_payee = ?4, updated_at = ?5`)
    .bind(next.gdnIssuedAt, next.feePerCarCents, next.feeMonthlyCents, next.balancePayee, now).run();
  return { ...next, updatedAt: now };
}

/* ---------------------------------------------------------------- the invoices row, shared by both kinds */

export type InvoiceKind = 'balance' | 'fee';
export type InvoiceState = 'held' | 'open' | 'paid' | 'paid_at_lot' | 'void';
export type InvoiceRow = {
  id: string; lot_id: string; kind: InvoiceKind; payer: string; payee: string | null; whop_id: string | null; state: InvoiceState;
  amount_cents: number; currency: string; pay_url: string | null; payment_ref: string | null; error: string | null;
  created_at: number; paid_at: number | null; updated_at: number;
};
/** The row as the Desk and the phone read it (W3-C's payout page, W3-D's Pay chips). Never the error's text beyond its code. */
export type InvoiceOut = { id: string; lotId: string; kind: InvoiceKind; state: InvoiceState; amountCents: number; amountUsd: number; payUrl: string | null; whopId: string | null; paymentRef: string | null; held: string | null; createdAt: number; paidAt: number | null };
export const invoiceOut = (r: InvoiceRow): InvoiceOut => ({
  id: r.id, lotId: r.lot_id, kind: r.kind, state: r.state, amountCents: r.amount_cents, amountUsd: r.amount_cents / 100, payUrl: r.pay_url, whopId: r.whop_id, paymentRef: r.payment_ref,
  held: r.state === 'held' ? r.error : null, createdAt: r.created_at, paidAt: r.paid_at,
});

export const invoiceId = (kind: InvoiceKind, lot: string) => `${kind}:${lot}`;
export const readInvoice = (env: Env, id: string) => env.DB.prepare('SELECT * FROM invoices WHERE id = ?1').bind(id).first<InvoiceRow>();
export const invoiceByWhopId = (env: Env, whopId: string) => env.DB.prepare('SELECT * FROM invoices WHERE whop_id = ?1').bind(whopId).first<InvoiceRow>();
export const trim = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 240);

/** The row, once, as held: it exists before anything is asked of Whop (the record never runs behind the money). */
export async function insertHeld(env: Env, row: { id: string; lotId: string; kind: InvoiceKind; payer: string; amountCents: number; why: string }, now: number): Promise<InvoiceRow> {
  await env.DB.prepare(`INSERT OR IGNORE INTO invoices (id, lot_id, kind, payer, payee, whop_id, state, amount_cents, currency, error, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, NULL, NULL, 'held', ?5, 'usd', ?6, ?7, ?7)`).bind(row.id, row.lotId, row.kind, row.payer, row.amountCents, row.why, now).run();
  return (await readInvoice(env, row.id))!;
}

const WHOP_INVOICE_ID = /^inv_[A-Za-z0-9]+$/;
const INVOICE_STATES: readonly string[] = ['draft', 'open', 'paid', 'past_due', 'uncollectible', 'void'];

/** Whop's answer, checked before anything is stored: an inv_ id and a known status, or null (a bad shape stores nothing). */
export function goodInvoice(x: unknown): WhopInvoice | null {
  if (!x || typeof x !== 'object') return null;
  const i = x as Record<string, unknown>;
  if (typeof i.id !== 'string' || !WHOP_INVOICE_ID.test(i.id) || typeof i.status !== 'string' || !INVOICE_STATES.includes(i.status)) return null;
  if (i.pay_online_url != null && (typeof i.pay_online_url !== 'string' || !/^https:\/\//.test(i.pay_online_url) || i.pay_online_url.length > 600)) return null;
  return x as WhopInvoice;
}

/** A held row asks Whop for its invoice. The answer moves the row to open with Whop's id and pay URL in one write; a refusal or
    a bad shape leaves it held with the reason. `event` is the one money_events row written with the move (its id is the
    idempotency key, so a retried call writes it once). Returns the row as it now stands. */
export async function openOnWhop(env: Env, row: InvoiceRow, whop: Whop, input: { accountId: string; email: string; customerName: string; title: string; label: string; dueAt: number }, event: { type: string; body: Record<string, unknown> }, now = Date.now()): Promise<InvoiceRow> {
  let inv: WhopInvoice | null = null;
  try {
    inv = goodInvoice(await whop.createInvoice({ ...input, amountUsd: row.amount_cents / 100, key: row.id }));
    if (!inv) throw new Error('whop_bad_invoice');
  } catch (e) {
    await env.DB.prepare('UPDATE invoices SET error = ?2, updated_at = ?3 WHERE id = ?1 AND state = ?4').bind(row.id, trim(e), now, 'held').run();
    return (await readInvoice(env, row.id))!;
  }
  const state: InvoiceState = inv.status === 'paid' ? 'paid' : inv.status === 'void' ? 'void' : 'open';
  await env.DB.batch([
    env.DB.prepare(`UPDATE invoices SET state = ?2, whop_id = ?3, payee = ?4, pay_url = ?5, payment_ref = ?6, error = NULL, updated_at = ?7 WHERE id = ?1 AND state = 'held'`)
      .bind(row.id, state, inv.id, input.accountId, inv.pay_online_url ?? null, inv.payment?.id ?? null, now),
    env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(`invoice:${row.id}`, event.type, JSON.stringify({ ...event.body, invoiceId: row.id, whopId: inv.id, amountCents: row.amount_cents, amount: row.amount_cents / 100, actor: 'lane' }), now),
  ]);
  return (await readInvoice(env, row.id))!;
}

/* ---------------------------------------------------------------- the fee */

/** What feeFor reads of a lot: the public lot (GET /lots/:id) or the object's own; `dealer` is on the copy, not the wire. */
export type FeeLot = { id: string; dealer?: string; car?: { year?: number; make?: string; model?: string } | null; sale?: { startedAt?: number; voidedAt?: number; forfeitedAt?: number } | null };
/** The fee is due this long after the start. */
export const FEE_DUE_MS = 14 * 86_400_000;

/** The lot's dealer: on the lot when the caller has it, else the D1 copy. */
export async function dealerOf(env: Env, lot: { id: string; dealer?: string }): Promise<string | null> {
  if (lot.dealer && lot.dealer !== '*') return lot.dealer;
  return (await env.DB.prepare('SELECT dealer FROM lots WHERE id = ?1').bind(lot.id).first<{ dealer: string }>())?.dealer ?? null;
}

/** The one fee invoice for a started car, or null with nothing written: while the platform row is missing or gdn_issued_at is
    null (growth plan line 88), while fee_per_car_cents is unset or zero, for a car not started, voided or forfeited, or started
    before the GDN issued. When the fee is due: the row `fee:<lot>` once (held), then Whop asked once when it is configured and
    the dealer's billing_email is known (migration 0016); the answer moves it to open with money event fee.invoiced. Called
    again, it returns the row and asks Whop only if the row is still held. Never throws for a Whop refusal: the row keeps it. */
export async function feeFor(lot: FeeLot, env: Env, now = Date.now()): Promise<InvoiceRow | null> {
  const p = await platformRow(env);
  if (!p || p.gdnIssuedAt == null || !p.feePerCarCents) return null;
  const s = lot.sale;
  if (!s?.startedAt || s.voidedAt || s.forfeitedAt || s.startedAt < p.gdnIssuedAt) return null;
  const dealer = await dealerOf(env, lot);
  if (!dealer) return null;
  const id = invoiceId('fee', lot.id);
  let row = await readInvoice(env, id);
  if (!row) row = await insertHeld(env, { id, lotId: lot.id, kind: 'fee', payer: dealer, amountCents: p.feePerCarCents, why: 'not_asked' }, now);
  if (row.state !== 'held') return row;
  const whop = new Whop(env);
  const d = await env.DB.prepare('SELECT name, billing_email FROM dealers WHERE gdn = ?1').bind(dealer).first<{ name: string; billing_email: string | null }>();
  const why = !whop.ready || !env.WHOP_ACCOUNT_ID ? 'whop_unavailable' : !d ? 'no_such_dealer' : !d.billing_email ? 'billing_email_unknown' : null;
  if (why || !d?.billing_email) {
    if (row.error !== why) await env.DB.prepare('UPDATE invoices SET error = ?2, updated_at = ?3 WHERE id = ?1 AND state = ?4').bind(id, why, now, 'held').run();
    return (await readInvoice(env, id))!;
  }
  const car = lot.car ? [lot.car.year, lot.car.make, lot.car.model].filter(Boolean).join(' ') : lot.id;
  return openOnWhop(env, row, whop, { accountId: env.WHOP_ACCOUNT_ID!, email: d.billing_email, customerName: d.name, title: 'Obavia seller fee', label: `Seller fee · ${car}`, dueAt: s.startedAt + FEE_DUE_MS },
    { type: 'fee.invoiced', body: { lotId: lot.id, dealer, kind: 'fee', startedAt: s.startedAt, gdnIssuedAt: p.gdnIssuedAt } }, now);
}

/** Fees owed to Obavia in cents (open, held and past due fee rows), for GET /admin/exposure (W3-B) and the Money page (W3-E).
    Zero, by construction, while the platform row is null: no fee row can exist. */
export async function feesOwedCents(env: Env): Promise<number> {
  const r = await env.DB.prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS cents FROM invoices WHERE kind = 'fee' AND state IN ('held', 'open')`).first<{ cents: number }>();
  return r?.cents ?? 0;
}
