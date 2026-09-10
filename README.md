# Apohenia Sales OS

A private, desktop-first application that develops Jason's ability to sell through a
self-directed identity interview, a specific approved offer, an exact repeatable script,
branch practice, human-led calling, prominent prospect-language reminders and
evidence-based review. The authoritative specification is
[`docs/00-codex-master-v2.md`](docs/00-codex-master-v2.md).

This repository is at **Increment 1 — skeleton**. It runs with **no credentials**.

## Demo mode statement

Everything in this build is **local demo mode**: synthetic data only, stored in your
browser's `localStorage` under the `apohenia.v1.` namespace. It **cannot dial** a phone
number, cannot transcribe audio, and calls no model API. No integration in this repository
has been live-tested; none exists yet. The header badge says so on every screen.

## Setup

Requires Node 22 and npm 10. Chromium for E2E is expected pre-installed at
`PLAYWRIGHT_BROWSERS_PATH` (`/opt/pw-browsers`); the Playwright config falls back to the
pinned binary automatically. Never run `playwright install` in this environment.

```bash
npm install            # workspaces: apps/web, packages/domain (lockfile committed)
npm run seed:validate  # re-parse docs/02-organized-question-bank.md → data/*.json, verify 207 records
npm run typecheck      # tsc --noEmit for packages/domain, apps/web, tests
npm run lint           # eslint . --max-warnings 0 (eslint-config-next flat config)
npm test               # vitest: domain schemas/index/seeds + storage lib
npm run build          # next build (Turbopack) for apps/web
npm run e2e            # playwright: builds + starts apps/web, visits every route
npm run dev            # next dev on http://localhost:3000
```

If `npm install` ever fails with `Cannot read properties of null (reading 'edgesOut')`
that is an npm arborist bug triggered while resolving vitest 4.1's optional peer set
without a lockfile. Keep `package-lock.json`; with it present, plain `npm install` and
`npm ci` both work. (The lockfile was generated once with `--legacy-peer-deps`.)

## Layout

```
apps/web/            Next 16 App Router app (src/app routes, src/components/ui, src/lib/storage.ts, src/styles)
packages/domain/     @apohenia/domain — zod schemas, seed loaders, source index (pure TS, no React)
data/                JSON seeds. 3 real (source package) + 4 placeholders awaiting module agents
docs/                Brief, source framework, question bank, CONVENTIONS.md for module agents
scripts/             parse-question-bank.mjs (validator; `npm run seed:validate`)
tests/e2e/           Playwright smoke tests
legacy/obavia/       Frozen previous project. Never touch.
```

## Increment plan

Section 20 of the brief defines seven increments. This skeleton is the ground for
Increment 1 (working source, interview and exact-script training core), which five parallel
module agents fill in per [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md). Increment 2 adds
secure persistence; 3 the first consented real call; 4 consented transcription and grounded
coaching; 5 voice simulation and metrics; 6 permissioned sources and sequencing; 7 hardening.
`.env.example` lists the variables later increments will need — Increment 1 needs none.

## Honesty rules (short form)

Study records are not live approval. A placeholder is labelled a placeholder. A draft is
labelled a draft. The fictional practice offer is banded "FICTIONAL TRAINING OFFER — NOT A
REAL QUOTE". Nothing claims to have been tested unless it actually ran.
