# S00P — Persistence (ADR-0008, ADR-0015)
Outcome: buyer inquiries and dealer workspaces survive restarts and serverless instances; the same authorization rules hold in the database.

## Acceptance criteria
- AC-P1 The app runs unchanged on the in-memory store when DATABASE_URL is unset, and on Postgres when it is set. Same screens, same tests.
- AC-P2 Every store call site awaits one `Store` interface (`lib/store/types.ts`); no page or action imports the memory module directly.
- AC-P3 Schema in `supabase/migrations/0001_init.sql` covers orgs, memberships, people, deals (six-state jsonb), documents (versioned, hash), checks, relationships (invite tokens), deliveries, registration evidence, audit events, inquiries.
- AC-P4 RLS enabled on every table; `authenticated` can read only its org's rows (staff) or its accepted/disputed deals (customer); audit is staff-only; no write policies for `authenticated` (server writes with the service role after `lib/store` authorization).
- AC-P5 Executed document versions cannot be updated or deleted (trigger).
- AC-P6 DOA tests run against a real Postgres: cross-tenant staff read, forwarded token, wrong person, nobody; buyer cannot read audit.
- AC-P7 Playwright journeys pass with DATABASE_URL set (tap flow → inquiry → dealer Today; dealer workspace journey).

## Non-goals
Real auth (Supabase Auth) — the cookie principal stub stays; file storage; Apohenia rules core; listings; conversations.

## Evidence (2026-09-19)
tsc clean · vitest 28 unit + 6 db (local Postgres 16) · next build ok · Playwright 3/3 on memory and 3/3 on Postgres.
Not done: migration applied to a Supabase project (none exists yet; creation is a spend decision for Jason); Supabase Auth; storage buckets.
