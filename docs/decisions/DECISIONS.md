# Decisions
Recorded decisions govern. "Proposed" ADRs await Jason's approval — the bootstrap session will ask for them one at a time.

## ADR-0001 Runtime is Claude Code (cloud sessions) — RECORDED 2026-09-18 (Jason)
Context: Playbook/Bootstrap were written for Codex + GPT-6 Astra. Cloud sessions (claude.ai/code, mobile, `claude --cloud`) support project skills in `.claude/skills/`, subagents in `.claude/agents/`, hooks via committed `.claude/settings.json`, and parallel sessions/projects. Personal `~/.claude` skills and user-only plugins do not sync; `/plugin` is unavailable in cloud.
Decision: Claude Code is the single execution runtime. CLAUDE.md is the router; AGENTS.md is a thin pointer for any Codex use. BMAD/Spec Kit/Superpowers are reference methodologies; if any is installed it is committed to the repo and does not become a second roadmap authority.
Alternatives: Codex-native (original plan; loses cloud/mobile steering and this kit's skills) · dual runtime (two sources of truth — rejected).
Consequences: all skills/agents must be committed; background subagents are not restored after VM reclaim → state lives in files; rate limits shared → Max plan for full team.
Amendment (2026-09-18, verified in bootstrap session): the Superpowers plugin registered in `.claude/settings.json` does not load in cloud sessions. It stays registered for desktop use only; no prompt or skill may depend on it. Cloud sessions use the committed skills and agents exclusively.
Revisit: Codex ships equivalent cloud + skills sync and Jason prefers it.

## ADR-0002 First slice = existing-sale workspace (Candidate A), marketplace listing-to-conversation is Candidate B — RECORDED 2026-09-18 (Jason)
Context: Spec v0.2 and the Codex prompt default to listing→inquiry→reply (needs buyer demand). Apohenia is in a paid pilot with a document/registration pain that exists today. Pessimist's Case: no marketplace value at 10 dealers; Solutions report: single-sided first, tenant zero = Triple J.
Decision (recommended): Candidate A — dealer creates an existing-sale workspace → customer accepts secure association → dealer attaches permitted evidence/packet (Apohenia check) → customer sees documents/status/next action. Candidate B follows once ≥10 paying dealers retain.
Alternatives: B first (validates marketplace UX earlier; zero revenue) · both (rejected: WIP limit).
Decision (Jason, 2026-09-18): Candidate A approved as S001. Canonical Apohenia checker source: `whoisjaso/apohenia-deal-packet-checker` (private). Candidate B parked behind the ≥10-paying-dealers gate. SPEC v0.1 is a draft; v0.2 must be finalized (all sections, non-goals) before PLAN.md and any code.
Revisit: paid-pilot evidence shows dealers value inquiry handling over paperwork.

## ADR-0003 Pricing shape — proposed
Decision: buyer $0; dealer marketplace $0; Dealer Workspace $199/location/mo incl. 20 managed workspaces + $99/10 pack; Apohenia per-packet pricing continues; metered pass-through for voice/IDV/reports/credit/ad spend; no $99 lifetime founding lock (24-month founding term at most, core software only). Billable unit begins when the dealer activates the document/operating workflow — never on a sale (NL-4). Numbers are hypotheses to test.
## ADR-0004 Never-list is constitutional — proposed
Decision: NL-1..NL-5 (guardrails skill) bind all code, copy, and AI until a counsel-reviewed ADR supersedes any item.
## ADR-0005 Web is the reference client — RECORDED 2026-09-18 (Jason)
Decision: mobile-first responsive web first; native iOS (SwiftUI) only after a buyer has an active-deal reason to install. Frontend research's SwiftUI-first recommendation is deferred.
Stack amendment (Jason, 2026-09-18): TypeScript throughout. Backend = Supabase (Postgres + RLS + Storage + Auth; edge functions where a server boundary is needed). The Apohenia rules/normalization/extraction core (`api/service/core/` in whoisjaso/apohenia-deal-packet-checker) is forked in as a package, not shared at the database. Front-end = Next.js on Vercel, App Router, server-enforced authorization on every sensitive read/write, EN/ES routing, Playwright + Vitest. Vanilla-JS uniformity with Apohenia was considered and rejected for lack of routing, i18n and test scaffolding.
Open (next ADR): which Supabase project Obavia's data lives in.
## ADR-0006 Reputation is metrics-based, not opinion-based; Triple J disclosed as founding design partner — proposed
Decision: dealer reputation = observable transaction/operational metrics (response, status accuracy, registration completion) + buyer reviews; no editorial rating by Obavia; Obavia entity separate from Triple J and the family trust; Triple J disclosed as founding design partner and excluded from any ranking it could influence.
## ADR-0007 Repository disposition — RECORDED 2026-09-18 (Jason)
Context: `whoisjaso/obavia` already held a public rental-membership site under the same name.
Complication found in bootstrap audit (2026-09-18): open draft PR #1 (branch `claude/admiring-cray-v05pza`, "Apohenia Sales OS" dialer/training app) also claims this repo's root and moves the rental site to `legacy/obavia/`. A Vercel project `obavia` is git-linked to this repo and builds every push with a `vite build` override (fails on kit branch: no root package.json). Three codebases contend for one repo.
Decision (recommended): make the repo private; move legacy rental files to `legacy/rental-site/` in M0 with history preserved; the transaction platform owns the root; PR #1 is dispositioned separately (close, or re-home to its own repo) before any merge to main; Vercel build override corrected or unlinked.
Alternatives: (b) new repo `obavia-platform`, leave this repo to the rental site and PR #1 · (c) merge PR #1 first and layer the platform kit on top (rejected: two products, one roadmap authority).
Decision (Jason, 2026-09-18): delete the rental site and the Sales OS completely. Rental files removed from `kit/build-os` in one commit (recoverable from history before 923de8f; no history rewrite). PR #1 closed; deleting its branch `claude/admiring-cray-v05pza` was refused by the cloud session's git proxy (Jason deletes it in GitHub UI; commits remain reachable via the PR ref). This repo is the transaction platform only. Still Jason's: make the repo private; fix or unlink the Vercel project's `vite build` override; merge PR #2 to `main` when ready (that replaces what production serves).

## ADR-0008 Obavia data home — RECORDED 2026-09-18 (Jason), execution BLOCKED
Context: Apohenia's Supabase project (`njzfiodjmbzyfvxusaem`) holds live pilot packet data; `triple-j-auto-investment` (`mhdzezmiwntkzxshznvl`) is tenant zero's own operating data.
Decision: Obavia gets its own dedicated Supabase project (free tier for the pilot); Apohenia core enters as code, never as a shared database; tenant zero is a tenant, not the host. Jason authorized Claude to create it.
Blocker (observed 2026-09-18): Supabase refused creation — the account has reached the 2-active-free-project limit. Options, all Jason's: pause/delete another free project, upgrade the org to Pro (~$25/mo recurring → spend approval), or create the project under a different Supabase account and grant this session access. No project exists yet.
Consequences: S001-A migrations and RLS/DOA tests cannot start until the project exists. SPEC v0.2 and PLAN.md can still be written.

## ADR-0009 Front end first for S001-A — RECORDED 2026-09-19 (Jason)
Context: Supabase project creation is blocked (ADR-0008) and Jason said "just build the front end first, skip all this."
Decision: Build the S001-A screens and journey now against a typed in-memory data layer (`lib/store/memory.ts`) with server-enforced authorization in the same functions the Supabase repository will implement. Session is a cookie stub (`lib/auth.ts`). The packet checker is a presence-only stub behind the same signature the Apohenia rules core will take. No production data, no persistence across restarts.
Consequences: this is a horizontal layer, not a complete slice; nothing is pilot-ready until the Supabase backend, real auth, storage, and the Apohenia core land. Acceptance criteria AC-1..AC-12 are covered at the store/UI level by unit and Playwright tests, not by RLS. ADR-0003/0004/0006 remain proposed.
Revisit: when the Obavia Supabase project exists.

## ADR-0010 Buyer-first: the product is an AI buying assistant — RECORDED 2026-09-19 (Jason)
Context: Jason: "an AI powered CarGurus where there's a chat interface that allows buyers to say they have a 700 credit score, want a Tesla, can afford $600 down, and the AI figures out the math, the jargon, which vehicle would most likely be associated with this client, the probability of getting their desire; the AI has an idea of market prices and dealers." He rejected the paperwork-first workspace UI as the face of the product and asked for a simple, clean, iOS-like, easily navigable front end.
Decision: The buyer chat is the front door and the first slice. S001-A dealer workspace screens stay in the repo as the dealer side but are no longer the first thing built or shown. Front end: iOS-style system UI (system font stack, white/grey surfaces, large titles, inset grouped lists, blue accent), replacing the ink/ivory brand treatment.
Guardrails that survive the pivot (never-list, constitution #2/#6): buyer inputs are self-reported; Obavia never pulls credit, never decides credit, never says "approved" or "prequalified"; every number is labeled an estimate with its basis; market prices come from a seeded estimate table until a real listing/market feed exists; a "fit" is a math estimate, not a lender decision. AI runs through the Anthropic API with a deterministic engine doing the arithmetic; when no API credential is present the same engine answers with templated text so the product still works.
Consequences: ROADMAP NOW changes: S001 = "What can I actually get?" buyer chat (this was already the consumer campaign hypothesis in INBOX). Dealer workspace becomes S002. Research gates on prequal (NL-3) and market data remain.
Revisit: when a licensed prequalification partner or real market feed is connected.
