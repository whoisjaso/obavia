# Roadmap — the only roadmap authority
Ideas may change this file. They may not silently change NOW.

## NOW
- S00P Persistence (ADR-0015, 2026-09-19): Supabase schema for the object model, RLS, auth (phone/email OTP), the in-memory store replaced by a Postgres-backed store behind the same interface; buyer inquiries and dealer workspaces survive restarts. Gate: inquiries persist across serverless instances; DOA tests pass against RLS.
- M0 Bootstrap: repo audit (incl. legacy rental site disposition, ADR-0007); source map adopted; ADR-0001..0007 decided; first slice approved; truthful founding-dealer entry page (application + interview path, no credit/ID collection).
- S001 (RE-SCOPED 2026-09-19, ADR-0010): buyer chat "What can I actually get?" — self-reported budget/credit band/desired vehicle → estimated payment, fit, alternatives, path to a dealer. iOS-style front end.
- S002 (was S001-A, ADR-0002): existing-sale dealer workspace (built as front end on in-memory store; backend pending).

## NEXT (dependencies known; order per research/2026-09-19_PROBLEM_AND_SOLUTION.md §10, ADR-0015)
- S002a Dealer onboarding with GDN validation (TxDMV lookup), dealer profile, listings with price versions and evidence labels.
- S002 Conversation → shared deal (permissioned relationship; no silent merge; inquiry ≠ reservation; appointment as a visible commitment).
- S003 Supported paperwork: one Texas dealer cash-retail packet, guided + review modes, signature tracking (electronic/printed/mixed).
- S004 Delivery & ownership: evidence-based delivery, buyer document vault, "My Garage".
- S005 Registration accountability: sourced milestones, missing items, owner, next action (dealer submits under own webDEALER).
- S006 Verified feedback: two-sided per ADR-0011 (operational fields only dealer→buyer; consent-gated aggregate visibility), one record per author per transaction, corrections with history.

## LATER (capability intent + research gate)
- Bounded AI follow-up (draft-and-send under dealer accounts; claims registry; TCPA consent) — gate: consent architecture + evals.
- Buyer marketplace layer + SEO "realistic fit" pages + post-assist for external channels + Meta AIA feed (ADR-0012) — gate: ≥50 paying dealers, positive contribution margin.
- Financed deals via certified eContracting hand-off — gate: partner access.
- Prequal via licensed partner — gate: counsel + partner; NL-3.
- BHPH servicing views (never a holder) — gate: OCCC review.
- Private sellers (ADR-0013) — gate: verification ladder + guided 130-U path.
- App wrapper (ADR-0014) — gate: active-deal install reason; PWA prompt after first inquiry comes earlier.

## RESEARCH
- Does paid pre-submission review constitute a title service in Harris County? (attorney/TxDMV) — blocks any fee framing beyond "software the dealer's employee uses".
- eContracting partner access path and timeline.
- Meta AIA feed requirements for independents.

## PARKED
- Cross-dealer buyer financial scoring (ADR-0011) · autonomous negotiation · universal Marketplace automation (ADR-0012) · nationwide paperwork · public buyer financial ratings · holding funds · per-sale revenue share (ADR-0003).
