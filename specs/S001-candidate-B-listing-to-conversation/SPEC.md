# SPEC — S001-B Listing to conversation (Candidate B)
Version 0.1 · Status: PARKED 2026-09-18 (ADR-0002) until ≥10 paying dealers retain · Commit baseline: —

## User outcome
A verified dealer publishes one authorized vehicle; a free buyer inquires without an account wall; the dealer opens that exact buyer–vehicle case and replies; both see the same conversation state.

## Why
Validates marketplace UX and the inquiry dedupe/permission model earliest. Cost: zero revenue and no buyer demand at 10 dealers (Pessimist's Case P3). Choose only if paid-pilot evidence shows inquiry handling is the dealer's dominant pain.

## In scope
Dealer org/membership · Listing with authority indicator · public browse (no account) · inquiry with light account (contact-verified) · dedupe (person, listing, active case) · ShoppingCase with VehicleInterests · dealer inbox grouped by vehicle (stage, last interaction, owner, next action) · reply thread · mark sold (seller-reported; listing hidden; no verified badge) · EN/ES · audit.
## Non-goals
Deals, documents, signatures, delivery, registration, payments, credit, AI replies, syndication, Meta, search ranking, private sellers, reviews.
## Acceptance (→ tests)
Browse without account · repeated inquiry updates existing (no duplicate person/app/billing) · two devices, same relationship · similar names not merged · three vehicles = one case, three interests · two buyers on one VIN both visible, no false reservation · two staff allocate simultaneously → one wins, conflict explicit · dealer phone lookup of non-customer denied · seller-reported sale hides listing, no verified reputation · cross-tenant thread URL denied · EN/ES parity.
## Guardrails
No per-lead fee, no "Verified" bare label, no AI. Listing copy through claims registry.
## Exit
Triple J + 2 external dealers each complete ≥3 real inquiry threads; AC pass; docs reconciled.
