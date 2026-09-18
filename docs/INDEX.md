# Obavia canonical source map
One concept, one authoritative home. If BMAD or another tool later produces prd.md / ARCHITECTURE-SPINE.md etc., point this index there — do not maintain the same truth twice.

| Concept | Authoritative file |
|---|---|
| Product promise, users, scope, non-goals | docs/product/PRODUCT.md |
| Requirements ledger (IDs, source, status, test coverage) | docs/product/REQUIREMENTS.md |
| Journeys, interaction rules, UX standards | docs/product/UX.md + .claude/skills/obavia-ux-standards |
| Domain records, relationships, state invariants | docs/architecture/DOMAIN.md |
| Technical decisions and boundaries | docs/architecture/ARCHITECTURE.md |
| Threats, permissions, data handling | docs/architecture/SECURITY.md |
| Integrations: capability, rights, status, fallback | docs/architecture/INTEGRATIONS.md |
| Decisions (ADRs) | docs/decisions/DECISIONS.md |
| Roadmap (the only one) | docs/delivery/ROADMAP.md |
| Active slice, branch, next safe action | docs/delivery/STATE.md |
| New ideas and dispositions | docs/delivery/INBOX.md |
| Risk register | docs/RISKS.md |
| Claims registry (allowed user-facing claims) | docs/CLAIMS_REGISTRY.md |
| Marketing experiments and claim mapping | docs/marketing/EXPERIMENTS.md |
| Legal guardrails / never-list | .claude/skills/obavia-texas-guardrails/SKILL.md |
| Product constitution | .claude/skills/obavia-build-os/references/product-constitution.md |
| Slice specs, plans, evidence, review packets | specs/S###-<outcome>/ |
| Immutable research inputs | research/ (see research/SOURCES.md) |
| Apohenia checker source (Stage 0) | external repo — canonical one TBD by Jason (candidates: whoisjaso/apohenia-deal-packet-checker, whoisjaso/apohenia-platform); not in this repo |
| Legacy rental-membership site (pre-kit) | root HTML pages, src/, DESIGN.md, PRODUCT.md, screenshots/, uploads/ — to be classified in M0 audit |

Authority order on conflict: platform safety > recorded decisions & validated external constraints > shared product/architecture docs > approved slice SPEC > execution plan > research/chat > code (code shows current behavior; it is not authority to redefine intent). Record contradictions; do not vote; do not rewrite tests to hide disagreement.
