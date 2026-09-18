# SPEC — S001-A Existing-sale workspace (Candidate A — recommended)
Version 0.1 · Status: draft (awaiting ADR-0002) · Approved by: — · Commit baseline: —

## User outcome
A verified pilot dealer can turn a sale that already happened (or is in progress) into a shared workspace: attach the packet, run the Apohenia pre-submission check, invite the customer securely; the customer accepts the association and sees their documents, the separate status facts (paperwork / payment / delivery / registration), and the next action — without an app install, and without a paywall ever.

## Why this slice now
Value with zero marketplace demand. Reuses Apohenia's packet checker (Stage 0) as the deal/document state machine. Tests the costliest uncertainty: will a dealer's customer accept a secure association and does the dealer find the status/packet workflow worth paying for.

## In scope
Dealer org + membership + roles · dealer creates Deal (cash retail, Texas, ordinary title docs) · attach/upload DocumentVersions with controlled links · packet check producing NO KNOWN BLOCKER DETECTED / REVIEW REQUIRED / BLOCKING ISSUE DETECTED · secure customer invitation (SMS/email link; light account) · customer accepts DealerCustomerRelationship · buyer status page with the six dimensions · dealer records delivery with evidence · registration task list (dealer submits under own webDEALER; Obavia tracks with evidence upload) · review invitation trigger stub (records eligibility; no public reviews yet) · EN/ES on all screens · audit events.

## Explicit non-goals
Listings, search, inquiries · e-signature execution (status tracking of signatures only; execution in S003) · financed deals · payments · credit · BHPH ledger · private sellers · AI messaging · public reviews · any webDEALER integration · DMS integration · native app · Meta.

## User journey
1. Dealer signs in (MFA), org verified by founder manually for pilot. 2. "New workspace" → vehicle (VIN via NHTSA vPIC), buyer name + phone/email, sale type cash. 3. Upload packet pages (130-U, bill of sale, odometer, title front/back, ID redacted per policy). 4. Run check → one of three states + focused questions. 5. "Invite customer" → secure link. 6. Customer opens on phone, verifies contact channel, sees "Triple J wants to share your purchase records — accept?" 7. Accepts → status page. 8. Dealer marks delivery with evidence → customer sees "Vehicle delivered. Registration in progress." 9. Dealer uploads submission evidence → "Registration submitted." 10. Eligibility for review recorded.

## UX states
Per obavia-ux-standards: all eleven states for: workspace list · new workspace · packet upload · check result · invitation · customer accept · buyer status · registration tasks.

## Data
DealerOrganization, Membership, Deal, Vehicle, DocumentVersion, DealerCustomerRelationship, Person, DeliveryEvent, RegistrationCase, Consent, AuditEvent. State dimensions per DOMAIN.md.

## Permissions
Dealer staff: own org's deals only (RLS). Customer: own relationships only. Founder admin: verification only, no document read without dealer grant. DOA tests required.

## Interfaces
`POST /deals`, `POST /deals/:id/documents`, `POST /deals/:id/check`, `POST /deals/:id/invite`, `POST /relationships/:token/accept`, `POST /deals/:id/delivery`, `POST /deals/:id/registration/evidence`, `GET /me/deals/:id/status`. Frozen after architect review.

## Dependencies & external access
Supabase (verify) · NHTSA vPIC (free, verify uptime) · SMS or email for invitation (email first; Twilio needs 10DLC → may be a blocker for SMS) · OCR pipeline from Apohenia (Gemini/Claude keys as env vars).

## Failure modes
OCR unreadable → REVIEW REQUIRED with question, never a guess · invite link forwarded/expired → no data; re-invite · customer declines → dealer sees declined; no data shared · customer disputes association → dispute flag, nothing deleted · dealer stops paying → customer access persists · duplicate upload → dedupe by hash · VIN decode down → manual entry with flag.

## Acceptance criteria (→ tests)
AC-1 dealer cannot open another dealer's deal by URL (DOA) · AC-2 customer sees only accepted relationships · AC-3 check never outputs approval-implying language (banned-phrase test) · AC-4 unknown facts produce questions, not values · AC-5 six status dimensions render independently; delivered + registration pending both visible · AC-6 executed DocumentVersion immutable after profile edit · AC-7 forwarded/expired link yields nothing · AC-8 dispute opens review, record persists · AC-9 non-payment does not paywall buyer · AC-10 all screens pass EN/ES snapshot + native review of financial/legal strings · AC-11 audit event for every transition · AC-12 no bare "Verified"/"Sold" labels (registry lint).

## AI evals
Packet checker: banned-language test; hallucination test on redacted/blank fields; consistency across EN/ES.
## Security checks
RLS + storage policy DOA tests; upload type/size validation; secrets only in env; consent record for invitation message.
## Guardrail check
NL-2: dealer submits webDEALER themselves — Obavia only stores evidence. NL-1/3/4/5 untouched. Fee framing: "software the dealer's employee uses" — RESEARCH item on title-service stays open before any external paid pilot expansion.
## Telemetry
time-to-first-check · check state distribution · invitation acceptance rate · questions per packet · support minutes per deal · paid continuation.
## Operational support
Jason handles pilot failures; log every manual intervention as a product gap.
## Rollback
Feature-flag the customer invitation; deals remain dealer-only if disabled.
## Cost limits
OCR ≈ $0.03/packet; invitation email free tier; cap 200 checks/month in pilot.
## Validation commands
`npm test` · `npx playwright test e2e/s001` · `npm run lint:claims`
## Exit criteria
Triple J runs 5 real deals through it; 2 external pilot dealers run ≥1 each; all AC pass; STATE and docs reconciled.
## Unlocks next
S003 supported paperwork + signing; S005 registration accountability; then S001-B marketplace.
