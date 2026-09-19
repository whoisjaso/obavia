# Requirements ledger
Columns: ID · Requirement · Source · Class (constraint / verified-external / proposal / hypothesis / anecdote / integration-assumption / parked) · Status (accepted / proposed / research / rejected) · Acceptance test · Owner

| ID | Requirement | Source | Class | Status | Test | Owner |
|---|---|---|---|---|---|---|
| R-001 | No buyer platform fee anywhere in the core journey | constitution #2 | constraint | accepted | AT-billing-01 | Jason |
| R-002 | Repeated inquiry updates existing inquiry; no duplicate customer/application/billing | spec v0.2 §5 | proposal | proposed | AT-inq-02 | — |
| R-003 | One shopping case may hold multiple vehicle interests at one dealer | spec v0.2 §5 | proposal | proposed | AT-inq-06 | — |
| R-004 | Only an authorized allocation reserves a vehicle; one exclusive allocation per inventory record | spec v0.2 §5 | proposal | proposed | AT-inq-08 | — |
| R-005 | Dealer cannot look up non-customers by phone; sees only authorized relationships | spec v0.2 §6, constitution #6 | constraint | accepted | AT-authz-09 | Jason |
| R-006 | Completion is six independent evidence-defined dimensions; no `sold` boolean | spec v0.2 §9, guardrails | constraint | accepted | AT-state-17..20 | Jason |
| R-007 | Print ≠ signed; upload ≠ authentic; executed docs immutable after profile change | spec v0.2 §8 | proposal | proposed | AT-doc-15,16,17 | — |
| R-008 | One finalized review per author per transaction; append-only corrections; independent triggering | spec v0.2 §10, constitution #10 | constraint | accepted | AT-rev-22..25 | Jason |
| R-009 | Dealer non-payment never paywalls buyer records | spec v0.2 §11–12 | constraint | accepted | AT-billing-26 | Jason |
| R-010 | Never-list NL-1..NL-5 | guardrails | verified-external | accepted | guardrail tests | Jason + counsel |
| R-011 | Mobile-first web; no app install to finish a transaction | constitution #8, ADR-0005 | constraint | accepted | manual walkthrough | Jason |
| R-012 | EN/ES parity for onboarding, key CRM interactions, buyer flow, support | constitution #7 | constraint | accepted | i18n test + native review | Jason |
| R-013 | Pricing: flat subscription + per-workspace packs; no per-lead/per-sale | spec v0.2 §11, ADR-0003 | proposal | proposed (numbers are hypotheses) | AT-billing-27 | Jason |
| R-014 | webDEALER submission by dealer's own employee only | guardrails NL-2 | verified-external | accepted | design review | counsel |
| R-015 | Financed RISC signing hands off to certified eContracting; cash deals use generic e-sign | guardrails, solutions report | integration-assumption | research | — | — |
