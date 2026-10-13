/* The buyer's balance as an invoice, the money news that settles it, the lender-first split, and the chargeback evidence
   (Wave 3-A; gap table §4 W3-A; phases.md Phase 3 Payments; collateral.md §1 "The balance", §2 "After pickup").

   HELD (gap table deviation 2). phases.md:76 says "the balance as a Whop invoice to the buyer"; decisions §9 D5 says "the
   dealer is payee of price and tax; Obavia touches only the refundable deposit" (Tax Code §152.0411, §152.063(g)); collateral.md
   §4 says "no holding a buyer's balance". So the balance invoice can only ever be created on the dealer's own connected
   account, and whether Whop lets Obavia create one there on the dealer's behalf is UNVERIFIED. Until the owner's line names
   the account (platform.balance_payee, migration 0016; the only value the code takes is 'dealer'), `balanceFor` writes the
   lane's own row (held, with the amount) and creates nothing on Whop. The gate is read on every call, so the day the line is
   written the next call opens the invoice; no code changes.

   Routes (mounted by W3-B from index.ts on /invoices/, the sign.ts pattern):
     GET  /invoices/:lot          buyer of the sale | the lot's dealer | admin   { balance, fee }; the fee only to the dealer and the admin
     POST /invoices/:lot          the lot's dealer | admin | buyer of the sale  { email? } -> the balance row; Whop asked only when the gate is open and an email is given
     POST /invoices/:lot/paid     the lot's dealer | admin                      cash at the lot: the row paid_at_lot, the open Whop invoice voided, the split written
   Exports for W3-B: balanceFor(lot, env, { email? }), markPaidAtLot(lotId, env), splitFor(lot, env), onWebhook(type, data, env),
   uploadEvidence(disputeId, bytes, env). Nothing here touches index.ts, auction.ts or the glass. */
import { buyerFrom, dealerFrom } from './auth';
import type { Env } from './env';
import { Whop, type WhopInvoice, type WhopTransfer } from './whop';
import { outTheDoor, type Fees } from '../../src/engine/money';
import { dealerOf, insertHeld, invoiceByWhopId, invoiceId, invoiceOut, openOnWhop, platformRow, readInvoice, trim, type InvoiceRow } from './fees';

/** The same $250 the object holds (src/auction.ts DEPOSIT_USD); not imported from there so this file never loads the object. */
export const DEPOSIT_USD = 250;

const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
const fail = (error: string, status: number) => json({ error }, status);

/* ---------------------------------------------------------------- the lot as read here */

export type BalanceLot = {
  id: string; dealer?: string;
  car?: { year?: number; make?: string; model?: string; dealer?: { fees?: Fees } | null; collateral?: { title?: { status?: string; lienholder?: string; payoff?: number } | null } | null } | null;
  sale?: { buyer: string; hammer: number; wonAt?: number; deadlineAt: number; paidAt?: number; startedAt?: number; voidedAt?: number; forfeitedAt?: number } | null;
};

async function readLot(env: Env, id: string): Promise<BalanceLot | null> {
  const r = await env.AUCTION.get(env.AUCTION.idFromName(id)).fetch(new Request(`https://lot/lots/${id}`));
  if (!r.ok) return null;
  const lot = await r.json<BalanceLot>();
  lot.dealer = (await dealerOf(env, lot)) ?? undefined;
  return lot;
}

/** The balance in cents: the out-the-door total less the deposit; null without the dealer's fees or a sale. */
export function balanceCents(lot: BalanceLot): number | null {
  const fees = lot.car?.dealer?.fees; if (!lot.sale || !fees) return null;
  return Math.max(0, Math.round(outTheDoor(lot.sale.hammer, fees).total * 100) - DEPOSIT_USD * 100);
}

const carName = (lot: BalanceLot) => lot.car ? [lot.car.year, lot.car.make, lot.car.model].filter(Boolean).join(' ') : lot.id;
const emailOk = (v: unknown): v is string => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ---------------------------------------------------------------- the balance */

/** The balance row for a sold lot, once (`balance:<lot>`), written at the hammer or on the first call after it; null with nothing
    written when the lot carries no sale, the sale is voided or forfeited, or the dealer's fees are unknown. Whop is asked only when
    the row is still held, platform.balance_payee is 'dealer' (deviation 2), the dealer has a connected account, Whop is configured,
    and `email` is given (the buyer's address for the invoice; kept nowhere here). Otherwise the row stays held and `held` says why. */
export async function balanceFor(lot: BalanceLot, env: Env, opts: { email?: string } = {}, now = Date.now()): Promise<InvoiceRow | null> {
  const s = lot.sale;
  if (!s || s.voidedAt || s.forfeitedAt) return null;
  const cents = balanceCents(lot); if (cents == null) return null;
  const dealer = await dealerOf(env, lot); if (!dealer) return null;
  const id = invoiceId('balance', lot.id);
  let row = await readInvoice(env, id);
  if (!row) row = await insertHeld(env, { id, lotId: lot.id, kind: 'balance', payer: s.buyer, amountCents: cents, why: 'payee_unnamed' }, now);
  if (row.state !== 'held') return row;
  const p = await platformRow(env);
  const whop = new Whop(env);
  const acct = p?.balancePayee === 'dealer' ? (await env.DB.prepare('SELECT whop_account FROM dealers WHERE gdn = ?1').bind(dealer).first<{ whop_account: string | null }>())?.whop_account ?? null : null;
  const why = p?.balancePayee !== 'dealer' ? 'payee_unnamed' : !acct ? 'dealer_account_unknown' : !whop.ready ? 'whop_unavailable' : !emailOk(opts.email) ? 'email_unknown' : null;
  if (why || !acct || !emailOk(opts.email)) {
    if (row.error !== why) await env.DB.prepare('UPDATE invoices SET error = ?2, updated_at = ?3 WHERE id = ?1 AND state = ?4').bind(id, why, now, 'held').run();
    return (await readInvoice(env, id))!;
  }
  const buyer = await env.DB.prepare('SELECT name FROM buyers WHERE id = ?1').bind(s.buyer).first<{ name: string | null }>();
  return openOnWhop(env, row, whop, { accountId: acct, email: opts.email, customerName: buyer?.name || 'Buyer', title: `Balance · ${carName(lot)}`, label: `Balance · ${carName(lot)} · less the $${DEPOSIT_USD} deposit`, dueAt: s.deadlineAt },
    { type: 'balance.invoiced', body: { lotId: lot.id, dealer, buyer: s.buyer, kind: 'balance', hammer: s.hammer, deadlineAt: s.deadlineAt } }, now);
}

/** Cash at the lot (Paid At The Lot on the Desk, the object's POST /paid): the balance row becomes paid_at_lot (created now if the
    hammer never wrote it), the open Whop invoice is voided so it cannot be paid twice (a refusal is kept on the row, the state
    still moves: the lot's money is the dealer's own), money event invoice.settled, then the lender-first split. Once: a second
    call answers the same row and writes nothing. Null when the lot carries no payable sale. */
export async function markPaidAtLot(lotId: string, env: Env, now = Date.now()): Promise<InvoiceRow | null> {
  const lot = await readLot(env, lotId); if (!lot) return null;
  let row = await balanceFor(lot, env, {}, now); if (!row) return null;
  if (row.state === 'paid' || row.state === 'paid_at_lot') return row;
  let error: string | null = null;
  if (row.state === 'open' && row.whop_id) {
    const whop = new Whop(env);
    if (whop.ready) { try { await whop.markInvoicePaid(row.whop_id); } catch (e) { error = trim(e); } }
  }
  await env.DB.batch([
    env.DB.prepare(`UPDATE invoices SET state = 'paid_at_lot', paid_at = ?2, error = ?3, updated_at = ?2 WHERE id = ?1 AND state IN ('held', 'open')`).bind(row.id, now, error),
    env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(`settled:${row.id}`, 'invoice.settled', JSON.stringify({ lotId, dealer: lot.dealer, buyer: lot.sale!.buyer, kind: 'balance', how: 'at_lot', invoiceId: row.id, whopId: row.whop_id, amountCents: row.amount_cents, actor: 'dealer' }), now),
  ]);
  await splitFor(lot, env, now);
  return (await readInvoice(env, row.id))!;
}

/* ---------------------------------------------------------------- the lender-first split */

export type SplitRow = { id: string; reason: 'lender' | 'applied_net'; amount: number; state: string; held: number; note: string | null };

/** The hammer, split as the dealer's money will go once it can: the lienholder's payoff first (reason `lender`, the payoff capped
    at the hammer, the lienholder's name as the note), then the dealer's net (reason `applied_net`: the hammer less the payoff less
    the $250 already on its own `applied:<lot>` row). Two dealer_payouts rows, both `owed`, both `held = 0`: Obavia holds none of
    this money (decisions §9 D5), so the nightly retry (held = 1 only) sends nothing and the reconciliation counts nothing, until the
    owner's line for gap table deviation 5 names how a lender is paid. Written once per lot (the ids are the keys); the lender row
    only when a payoff is on the collateral. Money event payout.split, once. Null without a sale. */
export async function splitFor(lot: BalanceLot, env: Env, now = Date.now()): Promise<{ lender: SplitRow | null; net: SplitRow } | null> {
  const s = lot.sale; if (!s) return null;
  const dealer = await dealerOf(env, lot); if (!dealer) return null;
  const t = lot.car?.collateral?.title;
  const payoff = typeof t?.payoff === 'number' && Number.isFinite(t.payoff) && t.payoff > 0 ? Math.round(t.payoff) : 0;
  const lender = Math.min(payoff, Math.round(s.hammer));
  const net = Math.max(0, Math.round(s.hammer) - lender - DEPOSIT_USD);
  const ins = (id: string, reason: 'lender' | 'applied_net', amount: number, note: string | null) =>
    env.DB.prepare(`INSERT OR IGNORE INTO dealer_payouts (id, lot_id, dealer, buyer, amount, reason, note, held, state, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 'owed', ?8)`)
      .bind(id, lot.id, dealer, s.buyer, amount, reason, note, now);
  const stmts = [
    ...(lender > 0 ? [ins(`lender:${lot.id}`, 'lender', lender, (t?.lienholder ?? '').slice(0, 240) || null)] : []),
    ins(`applied_net:${lot.id}`, 'applied_net', net, null),
    env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(`split:${lot.id}`, 'payout.split', JSON.stringify({ lotId: lot.id, dealer, buyer: s.buyer, hammer: s.hammer, lender, net, deposit: DEPOSIT_USD, lienholder: t?.lienholder ?? null, actor: 'lane' }), now),
  ];
  await env.DB.batch(stmts);
  const rows = (await env.DB.prepare(`SELECT id, reason, amount, state, held, note FROM dealer_payouts WHERE lot_id = ?1 AND reason IN ('lender', 'applied_net')`).bind(lot.id).all<SplitRow>()).results;
  return { lender: rows.find(r => r.reason === 'lender') ?? null, net: rows.find(r => r.reason === 'applied_net')! };
}

/* ---------------------------------------------------------------- the money news */

export type WebhookResult = { handled: boolean; reason?: string; kind?: 'balance' | 'fee' | 'payout'; lotId?: string; replay?: boolean };

/** Called by W3-B's /webhooks/whop after the signature check and the raw row: invoice.paid, invoice.voided and transfer.completed.
    Matches by the id the lane stored (invoices.whop_id, dealer_payouts.transfer_id or the transfer's metadata.key); anything it
    cannot match, or a shape it cannot read, is `handled: false` with the reason and nothing written. Never throws. A replay is
    `handled: true, replay: true` with nothing written. A paid balance tells the lot's object (POST /paid, as the Worker) so the
    pass can turn, and writes the split; a paid fee only settles its row. */
export async function onWebhook(type: string, data: unknown, env: Env, now = Date.now()): Promise<WebhookResult> {
  try {
    const d = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    if (type === 'invoice.paid' || type === 'invoice.voided') {
      const inv = d as Partial<WhopInvoice>;
      if (typeof inv.id !== 'string' || !/^inv_[A-Za-z0-9]+$/.test(inv.id)) return { handled: false, reason: 'bad_shape' };
      const row = await invoiceByWhopId(env, inv.id);
      if (!row) return { handled: false, reason: 'unknown_invoice' };
      if (type === 'invoice.voided') {
        if (row.state === 'paid' || row.state === 'paid_at_lot' || row.state === 'void') return { handled: true, replay: true, kind: row.kind, lotId: row.lot_id };
        await env.DB.prepare(`UPDATE invoices SET state = 'void', updated_at = ?2 WHERE id = ?1 AND state IN ('held', 'open')`).bind(row.id, now).run();
        return { handled: true, kind: row.kind, lotId: row.lot_id };
      }
      if (row.state === 'paid' || row.state === 'paid_at_lot') return { handled: true, replay: true, kind: row.kind, lotId: row.lot_id };
      const ref = inv.payment && typeof inv.payment === 'object' && typeof inv.payment.id === 'string' ? inv.payment.id.slice(0, 120) : null;
      await env.DB.batch([
        env.DB.prepare(`UPDATE invoices SET state = 'paid', payment_ref = ?2, paid_at = ?3, error = NULL, updated_at = ?3 WHERE id = ?1 AND state IN ('held', 'open', 'void')`).bind(row.id, ref, now),
        env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
          .bind(`settled:${row.id}`, 'invoice.settled', JSON.stringify({ lotId: row.lot_id, buyer: row.kind === 'balance' ? row.payer : null, dealer: row.kind === 'fee' ? row.payer : null, kind: row.kind, how: 'whop', invoiceId: row.id, whopId: inv.id, paymentRef: ref, amountCents: row.amount_cents, actor: 'whop' }), now),
      ]);
      if (row.kind === 'balance') {
        // the lot learns the balance is paid the way the Desk tells it (the object's POST /paid, admin: no x-dealer), then the split
        await env.AUCTION.get(env.AUCTION.idFromName(row.lot_id)).fetch(new Request(`https://lot/lots/${row.lot_id}/paid`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).catch(() => null);
        const lot = await readLot(env, row.lot_id);
        if (lot) await splitFor(lot, env, now);
      }
      return { handled: true, kind: row.kind, lotId: row.lot_id };
    }
    if (type === 'transfer.completed') {
      const t = d as Partial<WhopTransfer>;
      const id = typeof t.id === 'string' && t.id.length > 0 && t.id.length <= 120 ? t.id : null;
      const key = t.metadata && typeof t.metadata === 'object' && typeof t.metadata.key === 'string' ? t.metadata.key.slice(0, 120) : null;
      if (!id) return { handled: false, reason: 'bad_shape' };
      const p = await env.DB.prepare('SELECT id, lot_id, dealer, amount, cleared_at FROM dealer_payouts WHERE transfer_id = ?1 OR (?2 IS NOT NULL AND id = ?2) LIMIT 1').bind(id, key).first<{ id: string; lot_id: string; dealer: string; amount: number; cleared_at: number | null }>();
      if (!p) return { handled: false, reason: 'unknown_transfer' };
      if (p.cleared_at) return { handled: true, replay: true, kind: 'payout', lotId: p.lot_id };
      await env.DB.batch([
        env.DB.prepare('UPDATE dealer_payouts SET cleared_at = ?2 WHERE id = ?1 AND cleared_at IS NULL').bind(p.id, now),
        env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
          .bind(`cleared:${id}`, 'payout.cleared', JSON.stringify({ lotId: p.lot_id, dealer: p.dealer, amount: p.amount, payoutId: p.id, transferId: id, actor: 'whop' }), now),
      ]);
      return { handled: true, kind: 'payout', lotId: p.lot_id };
    }
    return { handled: false, reason: 'ignored' };
  } catch (e) {
    return { handled: false, reason: trim(e) };
  }
}

/* ---------------------------------------------------------------- the chargeback evidence */

export type EvidenceResult = { sent: true; fileId: string; at: number } | { sent: false; reason: string };

/** The evidence pack (W3-F's PDF: the deposit terms line, the signed Buyers Guide, the bill of sale, the pass scan) onto the Whop
    dispute, called by W3-B from dispute.created after the pack row is written. Without WHOP_API_KEY: `{ sent: false, reason:
    'whop_unavailable' }` and no call. A sent pack is one money event dispute.evidence (id evidence:<dispute>), never the bytes.
    Attaches only; the owner submits from the dashboard (Whop's submit_evidence is irreversible). Never throws. */
export async function uploadEvidence(disputeId: string, bytes: ArrayBuffer | Uint8Array, env: Env, now = Date.now()): Promise<EvidenceResult> {
  if (typeof disputeId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(disputeId)) return { sent: false, reason: 'bad_dispute_id' };
  const len = bytes instanceof Uint8Array ? bytes.byteLength : bytes.byteLength;
  if (!len || len > 10_000_000) return { sent: false, reason: 'bad_size' };
  const whop = new Whop(env);
  if (!whop.ready) return { sent: false, reason: 'whop_unavailable' };
  try {
    const { fileId } = await whop.uploadEvidence(disputeId, bytes, `obavia-evidence-${disputeId}.pdf`, 'Obavia deposit: the deposit terms the buyer accepted, the signed Buyers Guide, the bill of sale, and the pickup scan with the VIN and the time.');
    await env.DB.prepare('INSERT OR IGNORE INTO money_events (id, type, body, received_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(`evidence:${disputeId}`, 'dispute.evidence', JSON.stringify({ disputeId, fileId, bytes: len, actor: 'lane' }), now).run();
    return { sent: true, fileId, at: now };
  } catch (e) {
    return { sent: false, reason: trim(e) };
  }
}

/* ---------------------------------------------------------------- the routes */

/** Who is asking about this lot's invoices: its dealer, the admin, or the sale's buyer. */
async function who(req: Request, env: Env, lot: BalanceLot): Promise<'dealer' | 'admin' | 'buyer' | null> {
  const dealer = await dealerFrom(req, env.DEALER_SECRET);
  if (dealer) return dealer === '*' ? 'admin' : dealer === lot.dealer ? 'dealer' : null;
  const buyer = await buyerFrom(req, env);
  return buyer && lot.sale && buyer === lot.sale.buyer ? 'buyer' : null;
}

export async function invoices(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const m = url.pathname.match(/^\/invoices\/([A-Za-z0-9_-]{1,64})(\/paid)?$/);
  if (!m) return fail('not_found', 404);
  const lotId = m[1], sub = m[2] ?? '';
  const lot = await readLot(env, lotId);
  if (!lot) return fail('no_lot', 404);
  const role = await who(req, env, lot);
  if (!role) return fail('not_yours', 403);

  if (req.method === 'GET' && !sub) {
    const balance = await readInvoice(env, invoiceId('balance', lotId));
    const fee = role === 'buyer' ? null : await readInvoice(env, invoiceId('fee', lotId));   // the fee is the dealer's, never the buyer's to see
    return json({ lotId, balance: balance ? invoiceOut(balance) : null, fee: fee ? invoiceOut(fee) : null });
  }
  if (req.method === 'POST' && !sub) {
    if (!lot.sale) return fail('no_sale', 409);
    if (lot.sale.voidedAt || lot.sale.forfeitedAt) return fail(lot.sale.voidedAt ? 'sale_voided' : 'sale_forfeited', 409);
    const b = await req.json<{ email?: unknown }>().catch(() => ({} as { email?: unknown }));
    if (b.email !== undefined && !emailOk(b.email)) return fail('bad_email', 400);
    const row = await balanceFor(lot, env, { email: emailOk(b.email) ? b.email : undefined });
    if (!row) return fail('fees_unknown', 409);
    return json(invoiceOut(row));
  }
  if (req.method === 'POST' && sub === '/paid') {
    if (role === 'buyer') return fail('dealer_only', 403);
    if (!lot.sale) return fail('no_sale', 409);
    if (lot.sale.voidedAt || lot.sale.forfeitedAt) return fail(lot.sale.voidedAt ? 'sale_voided' : 'sale_forfeited', 409);
    const row = await markPaidAtLot(lotId, env);
    if (!row) return fail('fees_unknown', 409);
    return json(invoiceOut(row));
  }
  return fail('not_found', 404);
}
