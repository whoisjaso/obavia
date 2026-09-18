---
name: obavia-build-os
description: Obavia's governance loop for planning, scoping, building, reviewing and reconciling one vertical slice at a time. Use for any request that adds an idea, changes scope, starts a slice, plans implementation, reviews work, or closes a slice. Enforces one canonical truth, one active outcome, dependency-ordered build, observable acceptance, and reconciliation before the next slice.
---

# Obavia Build OS

The loop: **Explore → Decide → Slice → Plan → Build → Verify → Reconcile → Release.**
Six rules: one canonical truth; one active vertical outcome; every idea captured without changing active scope; dependencies decide order; nothing advances without observable acceptance and verification; every completed slice reconciles roadmap, architecture, decisions and code before the next begins.

Core question for every agent: *What is the smallest complete user journey we must make true next, such that it creates the correct foundation for the journey after it?*

## Explore (a new idea or request arrives)
Do not code it. Answer in writing: What user problem? Which side (buyer / dealer / private seller / staff / platform)? Which existing capability does it depend on? Does it contradict a recorded decision? Does it need research? Does it alter the current slice? Research subagents (`explorer`, `product-ux-investigator`) may run in parallel because research does not mutate code.

## Decide
Every idea gets exactly one disposition, written to `docs/delivery/INBOX.md`, and if consequential, a record in `docs/decisions/DECISIONS.md` using `references/decision-record-template.md`:
`ACCEPT-current-prerequisite | ACCEPT-next | ACCEPT-later | RESEARCH | DUPLICATE | SUPERSEDED | REJECT`.
Founder decides product tradeoffs. You recommend, give two alternatives and the tradeoff, then wait.

## Slice
Produce the smallest complete vertical journey: UI + state transitions + server behavior + storage + authorization + error handling + instrumentation + tests. Never a horizontal layer ("build auth", "build API"). Prefer slices that close a real user task, test a costly uncertainty, reuse what exists, and unlock a nearby outcome. WIP limit: one slice.

## Plan
Write `specs/S###-<outcome>/SPEC.md` from `references/slice-contract-template.md`. Non-goals are mandatory. Then `PLAN.md`: repo-grounded tasks, dependencies, validation commands, rollback. Unknown external permission (API access, provider account, legal authority) is a **blocker**, not an inferred approval.

## Build
Hand bounded contracts to fresh `implementer` subagents. Parallel only when interfaces are frozen and files are isolated (worktrees). Schema/auth/shared-state changes have one owner and land before dependent UI. TDD where the behavior is specifiable. Small commits. Workers return evidence (command + output), never "done".

## Verify
Prove: builds; tests pass; the complete journey works end to end; permissions work (test direct-object access across tenants); known failure states work; result matches the SPEC rather than resembling it. Run `spec-reviewer` (spec compliance) and `code-quality-reviewer` separately. Trigger `security-data-reviewer` for identity, authz, documents, money, signatures, uploads, external integrations, AI messaging.

## Reconcile
Answer in `EVIDENCE.md`: planned vs built; what changed and why; architecture changes; new constraints; lost requirements; new future work; roadmap updates. Then update `docs/` so code and documents do not diverge. This is not optional cleanup.

## Release
Only when SPEC exit criteria are met. Statuses are distinct: `ready-for-local-review` → `ready-for-pilot` → `released`. Then, and only then, select the next slice from ROADMAP.

## Review packets for Claude.ai
Use `references/review-packet-template.md`. Pin to a commit SHA and SPEC version. Exclude credentials and real customer documents. Reviewer findings: ID, severity, exact evidence, affected acceptance criterion, proposed correction, blocks-release yes/no. Resolve each as accepted / rejected-with-evidence / deferred-with-scope-and-risk / needs-founder-decision. Disagreement on law or security is never settled by vote.

## Session discipline
Start: read `docs/delivery/STATE.md`, the active SPEC, and the relevant diff. State what will become true this session.
End: update STATE.md with branch/commit, touched work, observed evidence, unresolved issues, next safe action.

See `references/` for the product constitution, planning protocol, agent contracts and templates.
