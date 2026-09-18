# Obavia Build Kit — START HERE

**Runtime:** Claude Code (cloud sessions at claude.ai/code, mobile Code tab, or `claude --cloud`).
**Date assembled:** 2026-09-18. Everything here is a *proposal* until recorded as a decision in `docs/decisions/DECISIONS.md`.

## What this kit is
A repo-ready governance layer for building Obavia one complete vertical slice at a time. It contains:
- `CLAUDE.md` — the short router every session reads.
- `.claude/skills/` — three project skills (Build OS, Texas guardrails, UX standards). Committed here, so cloud sessions load them.
- `.claude/agents/` — seven bounded subagents. Cloud sessions pick these up automatically.
- `.claude/hooks/` + `.claude/settings.json` — destructive-command and secrets blockers.
- `docs/` — the one canonical source map (product, UX, domain, architecture, security, integrations, decisions, roadmap, state, inbox, risks, claims registry).
- `specs/` — the two first-slice candidates, one to be approved.
- `prompts/` — the bootstrap prompt (rewritten for Claude Code) and the review-packet prompt.
- `research/` — immutable inputs: original docs + the Pessimist's Case + the Solutions report.

## How to start (10 minutes)
1. This branch (`kit/build-os`) holds the kit. Review it, then merge to `main` (or keep working on the branch).
2. Make the repo PRIVATE (it is currently public and now contains strategy docs). Install the Claude GitHub App on the repo.
3. In claude.ai/code, create a cloud environment. Network: Trusted. Add env var `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` only if you want agent teams (off by default; not needed for slice 1).
4. Start a cloud session on the repo. Paste `prompts/01_BOOTSTRAP.md`. Permission mode: default (not auto-accept) for the first session.
5. The first response should contain: read-only audit, proposed planning setup, first-slice recommendation, first interview question. Nothing else.

## Non-negotiables (the never-list, until licensed and capitalized)
Never hold or route buyer money. Never submit to webDEALER on a dealer's behalf for a fee. Never pull consumer credit. Never tie any fee to a lead or a sale. Never let AI make a factual commitment (price, availability, approval) without a validated source-of-truth. See `.claude/skills/obavia-texas-guardrails/SKILL.md`.

## Rate-limit note
Cloud sessions share your account's rate limits. Seven subagents in parallel on Pro will stall; Max is the realistic floor for the full team. Slice 1 needs main session + one implementer + one reviewer.
