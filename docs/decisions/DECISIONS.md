# Decisions
Recorded decisions govern. "Proposed" ADRs await Jason's approval — the bootstrap session will ask for them one at a time.

## ADR-0001 Runtime is Claude Code (cloud sessions) — proposed
Context: Playbook/Bootstrap were written for Codex + GPT-6 Astra. Cloud sessions (claude.ai/code, mobile, `claude --cloud`) support project skills in `.claude/skills/`, subagents in `.claude/agents/`, hooks via committed `.claude/settings.json`, and parallel sessions/projects. Personal `~/.claude` skills and user-only plugins do not sync; `/plugin` is unavailable in cloud.
Decision: Claude Code is the single execution runtime. CLAUDE.md is the router; AGENTS.md is a thin pointer for any Codex use. BMAD/Spec Kit/Superpowers are reference methodologies; if any is installed it is committed to the repo and does not become a second roadmap authority.
Alternatives: Codex-native (original plan; loses cloud/mobile steering and this kit's skills) · dual runtime (two sources of truth — rejected).
Consequences: all skills/agents must be committed; background subagents are not restored after VM reclaim → state lives in files; rate limits shared → Max plan for full team.
Revisit: Codex ships equivalent cloud + skills sync and Jason prefers it.

## ADR-0002 First slice = existing-sale workspace (Candidate A), marketplace listing-to-conversation is Candidate B — proposed
Context: Spec v0.2 and the Codex prompt default to listing→inquiry→reply (needs buyer demand). Apohenia is in a paid pilot with a document/registration pain that exists today. Pessimist's Case: no marketplace value at 10 dealers; Solutions report: single-sided first, tenant zero = Triple J.
Decision (recommended): Candidate A — dealer creates an existing-sale workspace → customer accepts secure association → dealer attaches permitted evidence/packet (Apohenia check) → customer sees documents/status/next action. Candidate B follows once ≥10 paying dealers retain.
Alternatives: B first (validates marketplace UX earlier; zero revenue) · both (rejected: WIP limit).
Revisit: paid-pilot evidence shows dealers value inquiry handling over paperwork.

## ADR-0003 Pricing shape — proposed
Decision: buyer $0; dealer marketplace $0; Dealer Workspace $199/location/mo incl. 20 managed workspaces + $99/10 pack; Apohenia per-packet pricing continues; metered pass-through for voice/IDV/reports/credit/ad spend; no $99 lifetime founding lock (24-month founding term at most, core software only). Billable unit begins when the dealer activates the document/operating workflow — never on a sale (NL-4). Numbers are hypotheses to test.
## ADR-0004 Never-list is constitutional — proposed
Decision: NL-1..NL-5 (guardrails skill) bind all code, copy, and AI until a counsel-reviewed ADR supersedes any item.
## ADR-0005 Web is the reference client — proposed
Decision: mobile-first responsive web first; native iOS (SwiftUI) only after a buyer has an active-deal reason to install. Frontend research's SwiftUI-first recommendation is deferred.
## ADR-0006 Reputation is metrics-based, not opinion-based; Triple J disclosed as founding design partner — proposed
Decision: dealer reputation = observable transaction/operational metrics (response, status accuracy, registration completion) + buyer reviews; no editorial rating by Obavia; Obavia entity separate from Triple J and the family trust; Triple J disclosed as founding design partner and excluded from any ranking it could influence.
## ADR-0007 Repository disposition — proposed
Context: `whoisjaso/obavia` already held a public rental-membership site under the same name.
Decision (recommended): make the repo private; move legacy rental files to `legacy/rental-site/` (or a separate repo `obavia-rental`) in M0; the transaction platform owns the root. Alternative: new repo `obavia-platform` and leave this one alone.
