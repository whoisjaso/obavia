# STATE
Active slice: S001-A existing-sale workspace (approved 2026-09-18, ADR-0002). SPEC v0.1 draft → v0.2 finalization pending; no PLAN.md, no code yet.
Branch: kit/build-os (kit on top of legacy main; not yet merged; draft PR to be opened)
Last commit: see git log
Next safe action: interview — ADR-0008 data home (Supabase project) next, then 0004/0003/0006 → finalize SPEC v0.2 → PLAN.md → review packet. No application code before SPEC v0.2 is approved.
Open blockers: repo still public · branch claude/admiring-cray-v05pza still on remote (Jason) · Vercel build override still red (Jason) · ADR-0003/0004/0006 undecided, ADR-0008 data home pending · Apohenia Supabase project njzfiodjmbzyfvxusaem not reachable from this session's Supabase MCP · 5 of 8 research inputs missing (research/SOURCES.md) · no Obavia Supabase project or env vars · Vercel build override fails on kit pushes.
Session log:
- 2026-09-18 kit assembled and committed to kit/build-os via GitHub API (no code written).
- 2026-09-18 bootstrap audit (read-only) run in cloud session. Verified: 3 skills, 7 agents, 3 hooks loaded and hooks block live; Superpowers not loaded in cloud; BMAD script not run; no tests; legacy rental site classified (13 HTML pages, src/App.tsx, 38 MB uploads/). Found: open draft PR #1 (Sales OS dialer) also claims repo; Vercel project linked and red; Apohenia source in 6 separate private repos; Supabase has only triple-j-auto-investment. ADR-0001 RECORDED with Superpowers amendment. Planning edits applied under one bounded approval (DECISIONS, INBOX, INDEX, SOURCES, session prompt, STATE).
- 2026-09-18 ADR-0007 RECORDED: Jason chose delete rental site + Sales OS completely. Rental files removed from kit/build-os (history intact); PR #1 closed (branch delete refused by session git proxy → Jason deletes in GitHub UI); README replaced; CLAUDE.md/INDEX/PRODUCT/ARCHITECTURE legacy notes updated.
- 2026-09-18 ADR-0002 RECORDED: S001 = Candidate A; canonical Apohenia repo = apohenia-deal-packet-checker. Excluded scopes parked in INBOX. Candidate B parked.
- 2026-09-18 Apohenia repo audited read-only (explorer); facts recorded in docs/architecture/ARCHITECTURE.md. Only paying pilot named in that repo is Triple J itself.
- 2026-09-18 ADR-0005 RECORDED: web-first; stack = TypeScript, Next.js on Vercel, Supabase, Apohenia core forked as package.
