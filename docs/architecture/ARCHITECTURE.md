# Architecture (provisional until repo audit)
Keep the existing credible stack. One deployable modular app; clear domain/provider boundaries; no microservices; no universal integration engine before a real connector needs it.

Provisional: Next.js (TypeScript) mobile-first web · Supabase Postgres with RLS + Storage with policies · server-side privileged keys only · Vercel · Vitest + Playwright.
Provider adapters (each behind an interface, swappable): e-sign (BoldSign / Dropbox Sign / Documenso self-host) · SMS (Twilio, 10DLC) · IDV (Stripe Identity) · payments (Stripe Connect, dealer as MoR — NL-1) · VIN decode (NHTSA vPIC free → DataOne later) · LLM (Claude Haiku 4.5 for conversation drafting, Sonnet for reasoning; all output through claims registry) · OCR for packet checking (Gemini/Claude per Apohenia pipeline).
Runtime for building: Claude Code cloud sessions (ADR-0001).
Legacy: the rental-membership site was removed per ADR-0007 (2026-09-18). The repo root belongs to the transaction platform. Stack choice for S001 is still to be verified (no package.json yet).
