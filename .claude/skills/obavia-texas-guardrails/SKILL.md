---
name: obavia-texas-guardrails
description: Legal and safety guardrails for Obavia in Texas. Auto-apply to any code, copy, prompt, schema, or integration touching money, deposits, credit, prequalification, financing terms, titles, registration, webDEALER, AI-generated messages, reviews, ratings, consumer personal data, or e-signatures. Contains the never-list, the claims registry rules, evidence-defined statuses, and the regulatory map with cure paths.
---

# Obavia Texas guardrails

These are constitutional until a recorded ADR, signed by the founder after counsel, changes them. If a task would cross one, stop and return a blocker with the rule ID.

## The never-list (NL-1 … NL-5)
- **NL-1 Money.** Never hold, route, escrow, or take custody of buyer funds. If payment flows through Obavia at all, the dealer is merchant of record (Stripe Connect direct charges / `on_behalf_of`). Refundable deposits held by Obavia would break any agent-of-payee exemption under Tex. Fin. Code Ch. 152 (app $10k; bond $100k–$500k). Payment status displays its *source*; a claim that money was sent is not settlement.
- **NL-2 Titles / webDEALER.** Never submit title or registration to webDEALER on a dealer's behalf, and never hold webDEALER credentials. The dealer's own authorized employee submits under the dealer's GDN (Transp. Code §520.063 exemption). Obavia prepares and checks packets; it does not "manage registration" as a service for a fee (Ch. 520 Subch. E title-service license threshold: counties ≥500k — Harris qualifies).
- **NL-3 Credit.** Never pull, store raw, or decide on consumer credit. Prequal, if ever, runs through a licensed partner (700Credit or a lender widget) under the dealer's/lender's permissible purpose; Obavia is a technology conduit. No "realistic fit" that is secretly a credit decision. Never hold or take assignment of retail installment contracts (OCCC Ch. 348 MVSF license; Bulletin B23-1).
- **NL-4 Brokering.** Never tie any fee to a lead, referral, appointment, or sale. Flat subscription and per-workspace/per-packet only. Never set, suggest, or advertise vehicle prices "through Obavia." (Occ. Code §2301.006; TrueCar precedent.)
- **NL-5 AI commitments.** The AI never asserts a fact about price, availability, mileage, fees, approval, or terms unless it resolves against a source-of-truth record via the claims registry. Otherwise it defers to a human. (Moffatt v. Air Canada, 2024 BCCRT 149.) AI disclosure to consumers is required (TRAIGA, HB 149, eff. 2026-01-01; NIST AI RMF safe harbor).

## Claims registry (CR)
Every user-facing factual claim — in UI labels, AI messages, marketing copy, support macros — is a typed claim with an allowed condition:
| Claim | Allowed only when |
|---|---|
| "Available" | inventory status fresh within threshold OR dealer confirmed |
| "Dealer-confirmed price" | dealer-entered price record with version + timestamp |
| "Registration submitted" | submission evidence or authorized integration event |
| "Financing prequalified" | authorized provider returned a result |
| "Strong match" | defined non-credit algorithm met threshold |
| "No hidden fees" | NEVER as platform promise; use "see the dealer-confirmed price breakdown and changes" |
| "Verified" (bare) | NEVER; use the specific indicator (contact verified / identity checked / dealership verified / authorized user / listing authority reviewed / transaction recorded) |
Registry lives at `docs/CLAIMS_REGISTRY.md`. Add before use; tests assert AI output only contains resolvable claims.

## Evidence-defined statuses
No `sold` boolean. Independent dimensions: documentation · funding · delivery · commercial deal · registration · servicing. Each transition names its evidence class. Printing ≠ signing. Signing ≠ delivery. Delivery ≠ registration. Seller-reported sale ≠ verified sale. Cancelling software ≠ unwinding a legal obligation.

## Consumer data & messaging
- TDPSA (Bus. & Com. Code Ch. 541): §541.107 sensitive-data consent applies even to small businesses. Collect the minimum; no IDs or SSNs to browse; sensitive files only via controlled upload with retention rules.
- GLBA Safeguards: Obavia is a service provider to dealers. Encryption at rest/in transit, MFA, access logging, WISP, incident plan. Target SOC 2 Type 1 before handling real NPI at scale.
- TCPA: prior express written consent captured and stored per channel; STOP/revocation honored within 10 business days; quiet hours; A2P 10DLC registered. Every automated outbound message is logged with its consent record.
- Reviews (FTC rule 2024): no selective invitation, no suppression tools, no fabricated verified badges, one finalized review per author per transaction with append-only corrections. No public buyer financial reputation (FCRA CRA risk).
- E-sign: UETA Tex. Bus. & Com. Code Ch. 322 for cash deals; financed RISCs hand off to certified eContracting (RouteOne/Dealertrack) — Obavia does not replace the vault. Paper Form 130-U still requires original buyer signature when filed on paper.

## Marketing claims
Distinguish "planned" / "pilot" / "available". Consumer pages describe actual inventory coverage (one metro), never national availability. Never say "dealers are shady." Never say "nobody is buying cars." Allowed: "Does your lot feel slower than it used to?"

## When a task touches a rule
Return: `GUARDRAIL BLOCK — <rule id> — what the task would do — the compliant alternative — whether founder+counsel decision is needed`. Do not proceed.
