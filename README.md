# Apohenia Sales OS

A private, desktop-first app that develops Jason's ability to sell: a click-only identity interview, one
approved offer, an exact repeatable script, branch practice, human-led calling, prominent prospect-language
reminders (THEIR WORDS / THEIR REFERENCES) and evidence-based review. The specification is
[`docs/00-codex-master-v2.md`](docs/00-codex-master-v2.md); the UI follows
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) (v2 "Arena": dark stage, one hero, tab bar Dial · Train · Script · Me).

**State: Increment 1, local demo mode.** Synthetic data only, stored in this browser under `apohenia.v1.*`.
The dialer is a **simulator** over fictional prospects; it cannot dial, transcribe, record or call a model, and
every screen carries the `◐ Demo` pill that says so. Live sequential dialing is intentionally disabled pending
telephony, a reviewed contact policy and the sequential-session flag. Nothing has been deployed.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000 — the Dial front door
```

Gates, in order: `npm run seed:validate` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` ·
`npm run e2e`. Full commands, prerequisites and the last real results: [`docs/SETUP.md`](docs/SETUP.md) and
[`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).

## Where things are

```
apps/web/            Next 16 App Router — screens (src/app), kit (src/components/ui), storage (src/lib), tokens (src/styles)
packages/domain/     @apohenia/domain — zod schemas + pure engines: sources, interview, scripts, offers, practice, vocabulary, listener, dialer
data/                JSON seeds (provenance table in CLAUDE.md; hashes in docs/SOURCE_REGISTER.md)
docs/                Brief, source framework, question bank, addendum, design system, ARCHITECTURE, SETUP, THREAT_MODEL, CONVENTIONS
scripts/             parse-question-bank.mjs (seed:validate), verify-source-offsets.mjs (verify:offsets)
tests/e2e/           Playwright specs (9 files) + reference screenshots in docs/screenshots/v2
legacy/obavia/       Frozen previous project — never touched
```

Status documents kept truthful after every slice: `IMPLEMENTATION_STATUS.md`, `SOURCE_COVERAGE.md`,
`SCRIPT_APPROVALS.md`, `INTERVIEW_FLOW.md`.

## Honesty rules (short form)

Study records are not live approval. Every script node and offer is a labelled draft. The fictional practice
offer is banded "FICTIONAL TRAINING OFFER / NOT A REAL QUOTE" (two lines on the stage) and never enters live pricing. A blank price is
`null`. Text-only practice marks tone "not assessed". No test is claimed unless it ran.
