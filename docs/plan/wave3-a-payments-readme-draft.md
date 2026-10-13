# Wave 3-A: the README rows and sections for W3-B to paste into auction/worker/README.md

Written 2026-10-13 by payments (W3-A). W3-B owns README.md and index.ts; this file is the draft it mounts from. Every line here matches the code in `auction/worker/src/fees.ts`, `src/invoice.ts`, `src/whop.ts`, `migrations/0016_invoices.sql` and `test/invoice.test.ts` on the day written. No em or en dashes.

## The interfaces W3-B mounts (exact signatures)

```ts
// src/invoice.ts
export async function invoices(req: Request, env: Env): Promise<Response>                                     // mount: if (url.pathname.startsWith('/invoices/')) return (await import('./invoice')).invoices(req, env);
export async function onWebhook(type: string, data: unknown, env: Env, now?: number): Promise<WebhookResult>  // from /webhooks/whop after verifyWebhook and the raw money_events row; for invoice.paid, invoice.voided, transfer.completed
export async function uploadEvidence(disputeId: string, bytes: ArrayBuffer | Uint8Array, env: Env, now?: number): Promise<EvidenceResult>   // from dispute.created after W3-F's evidencePack; put the result on the pack row
export async function balanceFor(lot: BalanceLot, env: Env, opts?: { email?: string }, now?: number): Promise<InvoiceRow | null>          // the balance row at the hammer (optional: the routes do it on the first call after)
export async function markPaidAtLot(lotId: string, env: Env, now?: number): Promise<InvoiceRow | null>                                      // optional: after the object's POST /paid answered 200, if the Desk is not calling POST /invoices/:lot/paid
export async function splitFor(lot: BalanceLot, env: Env, now?: number): Promise<{ lender: SplitRow | null; net: SplitRow } | null>        // the lender-first split; markPaidAtLot and invoice.paid already call it
export type WebhookResult = { handled: boolean; reason?: string; kind?: 'balance' | 'fee' | 'payout'; lotId?: string; replay?: boolean };
export type EvidenceResult = { sent: true; fileId: string; at: number } | { sent: false; reason: string };

// src/fees.ts
export async function feeFor(lot: FeeLot, env: Env, now?: number): Promise<InvoiceRow | null>          // call after startedAt is written (the object's POST /pickup path, or the nightly cron for every started lot): null and nothing written while the platform row is null
export async function platformRow(env: Env): Promise<PlatformRow | null>                               // GET /admin/exposure: obaviaFeesOwed reads feesOwedCents; the GDN row reads this
export async function setPlatform(env: Env, patch: PlatformPatch, now?: number): Promise<PlatformRow>  // POST /admin/gdn { issuedAt, feePerCarCents, feeMonthlyCents } -> setPlatform(env, { gdnIssuedAt: issuedAt, feePerCarCents, feeMonthlyCents }); throws 'bad_platform' (400) and writes nothing on a bad number; the route writes money event admin.gdn
export async function feesOwedCents(env: Env): Promise<number>                                         // the sum of fee rows held or open; 0 by construction while the platform row is null
export type PlatformRow = { gdnIssuedAt: number | null; feePerCarCents: number | null; feeMonthlyCents: number | null; balancePayee: 'dealer' | null; updatedAt: number };
export type PlatformPatch = Partial<{ gdnIssuedAt: number | null; feePerCarCents: number | null; feeMonthlyCents: number | null; balancePayee: 'dealer' | null }>;
export type InvoiceRow = { id; lot_id; kind: 'balance' | 'fee'; payer; payee; whop_id; state: 'held' | 'open' | 'paid' | 'paid_at_lot' | 'void'; amount_cents; currency; pay_url; payment_ref; error; created_at; paid_at; updated_at };
export const invoiceOut: (r: InvoiceRow) => InvoiceOut                                                 // the wire shape: { id, lotId, kind, state, amountCents, amountUsd, payUrl, whopId, paymentRef, held, createdAt, paidAt }
```

The webhook delegation, in words: after `verifyWebhook` and the raw `money_events` row, `const r = await onWebhook(type, d, env);` for every type; it answers `{ handled: false, reason: 'ignored' }` for the types index.ts already handles (payment.*, refund.*, dispute.*), so the order does not matter. Nothing in it throws.

The lot's `sale.invoiceUrl` for W3-D's Pay chips is `invoices.pay_url` of the `balance:<lot>` row (GET /invoices/:lot as the buyer, `balance.payUrl`); null while held. W3-B can also fold it into GET /lots/:id for the sale's buyer from the same row.

## Routes (rows for the table)

| Method | Path | Who | What |
| --- | --- | --- | --- |
| GET | `/invoices/:lot` | the sale's buyer, the lot's dealer, admin | `{ lotId, balance, fee }`, each `{ id, lotId, kind, state, amountCents, amountUsd, payUrl, whopId, paymentRef, held, createdAt, paidAt }` or null. `fee` is null for the buyer: the fee is the dealer's, never the buyer's to see. 403 `not_yours` for anyone else; 404 `no_lot` |
| POST | `/invoices/:lot` | the lot's dealer, admin, the sale's buyer | `{ email? }` -> the balance row (`balance:<lot>`, the out-the-door total less the $250 deposit, in cents), written once at the first call after the hammer. State `held` with `held` saying why (`payee_unnamed` until the owner's line for gap table deviation 2 sets `platform.balance_payee = 'dealer'`; then `dealer_account_unknown`, `whop_unavailable`, `email_unknown`), or `open` with Whop's id and `payUrl` once all four are met: the invoice is created on the dealer's connected account (`account_id = dealers.whop_account`, never Obavia's: decisions §9 D5), due at `sale.deadlineAt`, money event `balance.invoiced` (id `invoice:balance:<lot>`). The email goes to Whop and is kept nowhere. 409 `no_sale`, `sale_voided`, `sale_forfeited`, `fees_unknown`; 400 `bad_email`. Idempotent: the row once, Whop asked once |
| POST | `/invoices/:lot/paid` | the lot's dealer, admin | Cash at the lot: the balance row becomes `paid_at_lot` (written now if the hammer never did), the open Whop invoice is voided (`POST /invoices/{id}/void`; Whop documents no "mark paid" call, so the lane's own row is the record and the void stops a second payment; a refusal is kept on the row and the state still moves), money event `invoice.settled` (id `settled:balance:<lot>`, `how: 'at_lot'`), then the lender-first split below. Once. 403 `dealer_only` for the buyer. This route does not call the object's `POST /paid`; the Desk's Paid At The Lot still does, and index.ts should call `markPaidAtLot(lotId, env)` after that 200 so one tap does both |

## Migration 0016 (invoices, the platform row, cleared transfers, the dealer's billing email)

`platform` (one row, id 1): `gdn_issued_at`, `fee_per_car_cents`, `fee_monthly_cents`, `balance_payee`, `updated_at`. Null until the owner sets it through `POST /admin/gdn`. `fee_monthly_cents` is stored and not applied (the monthly plan at volume is a model line, not a Worker rule). `balance_payee` takes only `'dealer'` (deviation 2).

`invoices`: one row per lane invoice, id `balance:<lot>` or `fee:<lot>` (the idempotency key); `payer` (the buyer id or the dealer's GDN), `payee` (the Whop account it was created on), `whop_id` (only ever Whop's own `inv_` id), `state` (`held`, `open`, `paid`, `paid_at_lot`, `void`), `amount_cents`, `pay_url`, `payment_ref` (the `pay_` that settled it), `error` (why it is held, or Whop's last refusal, at most 240 characters, never a key).

`dealer_payouts.cleared_at`: set by `transfer.completed`. `dealers.billing_email`: the address Obavia's fee invoice goes to, set by the admin only (the email a dealer gives `POST /dealers/account/start` is still passed to Whop and kept nowhere); without it the fee row is held with `billing_email_unknown`. W3-B: `POST /dealers/:gdn/billing` or a field on the admin's dealer row is the place to set it; W3-A did not add a route.

## The fee (`src/fees.ts`; growth plan line 88; 43 TAC §215.85)

No fee of any kind before Obavia's own GDN. `feeFor(lot, env)` returns null and writes nothing while the platform row is missing, `gdn_issued_at` is null, or `fee_per_car_cents` is unset or zero; also for a car not started, voided or forfeited, or started before `gdn_issued_at`. `test/invoice.test.ts` §1 proves it: a hammer, a start and a simulated `invoice.paid` with no platform row leave zero rows `WHERE type LIKE 'fee.%'` and no fee invoice.

When the row is set: one fee invoice per started car, `fee:<lot>`, to the dealer, on Obavia's account (`WHOP_ACCOUNT_ID`), `email_address = dealers.billing_email`, `customer_name = dealers.name`, due 14 days after the start, one money event `fee.invoiced` (id `invoice:fee:<lot>`, `amountCents`, `amount` in dollars, `actor: 'lane'`). Never taken from the buyer's balance: the balance row is the out-the-door total less the deposit and nothing else. Called again, it returns the row and asks Whop only while the row is still held. A refusal or an answer that is not an invoice leaves the row held with the reason and no money event. `feesOwedCents(env)` is the sum of fee rows held or open; `GET /admin/exposure` should read it in place of the constant 0 and the Money page says "None until the GDN issues" while `platformRow` is null.

## The buyer's balance (`src/invoice.ts`; HELD on gap table deviation 2)

phases.md:76 ("the balance as a Whop invoice to the buyer") conflicts with decisions §9 D5 ("the dealer is payee of price and tax; Obavia touches only the refundable deposit") and collateral.md §4 ("no holding a buyer's balance"). The code resolves nothing: the lane's own row is written at the hammer with the amount, and nothing is created on Whop until `platform.balance_payee` is `'dealer'`. The only payee the code will ever use is the dealer's connected account. Whether Whop lets Obavia create an invoice on a connected account on the dealer's behalf is UNVERIFIED (researcher-architect, against the live API, before the owner's line). The invoice response shape is coded to Whop's documented v1 shape (docs.whop.com/api-reference/invoices/create-invoice, read 2026-10-13: `POST /invoices { account_id, collection_method: 'send_invoice', email_address, customer_name, due_date, plan: { plan_type: 'one_time', initial_price, currency }, product: { title }, line_items }` -> `{ id: inv_..., status, number, pay_online_url, payment: { id } | null, payment_processing }`) and is UNVERIFIED in the sandbox; an answer without an `inv_` id and a known status stores nothing.

## The lender-first split (HELD on gap table deviation 5)

When the balance is paid (at the lot, or by `invoice.paid`), `splitFor` writes the hammer as the dealer's money will go: `lender:<lot>` (reason `lender`, the payoff from `car.collateral.title.payoff` capped at the hammer, the lienholder's name as the note; only when a payoff is on the collateral) and `applied_net:<lot>` (reason `applied_net`, the hammer less the payoff less the $250 already on `applied:<lot>`). Both `owed`, both `held = 0`: Obavia holds none of this money (D5), so the nightly retry (`held = 1` only) sends nothing, `POST /dealers/account` sends nothing, and the reconciliation counts nothing, until the owner's line names how a lender is paid (a Whop destination the lender holds, a payout by hand, or a check the dealer carries). Money event `payout.split` once (`hammer, lender, net, deposit`). The Desk's payout page (W3-C) reads these two rows beside `applied:<lot>`.

## The money news (`onWebhook`)

`invoice.paid`: matched by `invoices.whop_id` (an invoice carries no metadata); the row `paid` with `payment_ref`, money event `invoice.settled` (id `settled:<row id>`, `how: 'whop'`); a balance also tells the lot's object (`POST /paid`, as the Worker, no `x-dealer`) and writes the split; a fee only settles. `invoice.voided`: the row `void` unless paid. `transfer.completed`: matched by `dealer_payouts.transfer_id` or the transfer's `metadata.key`; `cleared_at` set, money event `payout.cleared` (id `cleared:<transfer id>`). A replay is `{ handled: true, replay: true }` and writes nothing; an unknown id or a shape it cannot read is `{ handled: false, reason }` and writes nothing; it never throws. Note for W3-B: the object's `POST /paid` writes `balance.paid_at_lot` whatever told it; when `onWebhook` is the caller the honest type is `balance.paid` (auction.ts is yours).

`WHOP_EVENTS` now lists `dispute.updated` and `invoice.voided` as well; register the webhook with the full list.

## The chargeback evidence (`uploadEvidence`)

From `dispute.created`, after W3-F's `evidencePack` wrote the pack row: `uploadEvidence(disputeId, bytes, env)`. `POST /files { filename, visibility: 'private' }` -> the bytes `PUT` to the presigned `upload_url` with Whop's `upload_headers` -> `PATCH /disputes/{id} { evidence: { uncategorized_attachment: { id }, notes } }` (docs.whop.com/api-reference/beta/disputes/update-dispute and beta/files/create-file, read 2026-10-13; UNVERIFIED in the sandbox). Attaches only: `submit_evidence` is irreversible and stays the owner's hand on the dashboard. Without `WHOP_API_KEY`: `{ sent: false, reason: 'whop_unavailable' }` and nothing leaves; the admin's disputes rows show "Not sent". A sent pack is one money event `dispute.evidence` (id `evidence:<dispute>`, the file id and the byte count, never the bytes). A file answer that is not a `file_` id stores nothing and uploads nothing.

## Not yet (add to the list)

- Whop's `POST /invoices` response, `POST /files` and `PATCH /disputes/{id}` shapes are coded from the docs read 2026-10-13 and not yet proven in the Whop sandbox; the callers store nothing from an answer they cannot read.
- Whether an invoice can be created on a dealer's connected account on the dealer's behalf (deviation 2) is unverified; until then every balance row is `held` with `payee_unnamed`.
- No "mark invoice paid" call exists in Whop's API; a balance paid at the lot voids the open Whop invoice and the lane's row is the record.
- The fee invoice needs `dealers.billing_email`, which no route sets yet; the monthly plan (`fee_monthly_cents`) is stored and not applied.
- The lender and net payout rows are written and never sent (deviation 5).

## Run (the migrations line)

`npx wrangler d1 migrations apply obavia-auction   # 0016 before this code (platform, invoices, dealer_payouts.cleared_at, dealers.billing_email)`
