# Architecture (provisional until repo audit)
Keep the existing credible stack. One deployable modular app; clear domain/provider boundaries; no microservices; no universal integration engine before a real connector needs it.

Provisional: Next.js (TypeScript) mobile-first web · Supabase Postgres with RLS + Storage with policies · server-side privileged keys only · Vercel · Vitest + Playwright.
Provider adapters (each behind an interface, swappable): e-sign (BoldSign / Dropbox Sign / Documenso self-host) · SMS (Twilio, 10DLC) · IDV (Stripe Identity) · payments (Stripe Connect, dealer as MoR — NL-1) · VIN decode (NHTSA vPIC free → DataOne later) · LLM (Claude Haiku 4.5 for conversation drafting, Sonnet for reasoning; all output through claims registry) · OCR for packet checking (Gemini/Claude per Apohenia pipeline).
Runtime for building: Claude Code cloud sessions (ADR-0001).
Legacy: this repo currently contains a static/React rental-membership site (root .dc.html pages, src/App.tsx, obavia-*.js). It is not the transaction platform; classify and relocate in M0.
