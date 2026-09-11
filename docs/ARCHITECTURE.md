# Architecture — Apohenia Sales OS (Increment 1 state)

What the repository actually is on 2026-09-11. Nothing here describes a component that does not
exist; later increments are named only to show where they would attach.

## 1. Shape

```
┌──────────────────────────── browser (the only runtime) ────────────────────────────┐
│  apps/web  Next 16 App Router, React 19, TypeScript strict                          │
│    server components: load JSON seeds → props           (no database, no API calls) │
│    client components: screens on the Stage, state in localStorage `apohenia.v1.*`   │
│    kit: apps/web/src/components/ui  (Design System v2 "Arena")                      │
│                          │ imports                                                  │
│  packages/domain  @apohenia/domain — pure TS, zod 4, no React, no window            │
│    schemas/  (single source of shape truth)                                         │
│    seeds.ts  (loaders over ../../data/*.json, throw on invalid JSON)                 │
│    sources/ interview/ scripts/ offers/ practice/ vocabulary/ listener/ dialer/     │
└──────────────────────────────────────────────────────────────────────────────────────┘
          data/*.json (seeds)      docs/ (brief, sources, design)      scripts/ (parsers)
```

There is **no server-side state, no network I/O and no credential** anywhere in the code path.
`grep` for `fetch(`, `WebSocket`, `XMLHttpRequest`, `getUserMedia` across `apps/web/src` and
`packages/domain/src` returns nothing. The build is static except `/scripts` and `/today` (dynamic
because they read search params / storage at request time).

## 2. Packages

### `packages/domain` (`@apohenia/domain`)

Subpath exports (`package.json` `exports`): `.`, `./schemas`, `./seeds`, `./sources`, `./interview`,
`./scripts`, `./offers`, `./practice`, `./vocabulary`, `./listener`, `./dialer`. Client components
import subpaths so the 250 KB source-record JSON never enters a client bundle.

| Module | Purpose | Key pure functions |
|---|---|---|
| `schemas/` | zod 4 schemas for sources, interview, scripts, offers, transcript events, vocabulary, practice, listener, dialer | types are inferred from schemas; seeds and stored state are parsed, never trusted |
| `seeds.ts` | loaders: `loadSourceQuestionRecords`, `loadSourceSections`, `loadPackageValidation`, `loadMissingResourceRegister`, `loadIdentityInterview`, `loadScriptNodes`, `loadOffers`, `loadSyntheticTranscripts`, `loadSyntheticProspects`, `validateAllSeeds`; `isPlaceholderSeed` | server-only in practice (JSON import) |
| `sources/` | index, search, facets, `isLiveEligibleForCitation` (adapt only), `ownScriptCounterparts`, `coverageReport` | study material, never approval |
| `interview/` | screen visibility from declared conditions, selection rules, `applyAnswer`, `invalidateDependents`, `buildProfile`, `endorseProfile`, `buildTrainingPlan`, `isProfileCurrent`, `exportForProspectContext` (always throws) | click-only state machine |
| `scripts/` | version graph, `effectiveBranches` / `nextNodeForBranch` with the global stop rule, `isEvidenceSatisfied`, `resolveSlots` (offer-approval and price gates), `renderNodeCard` (six parts), `maskForMode`, `validateGraph`, `publishVersion` / `verifyPublication` (canonical JSON + SHA-256) | primary wording is stable within a version |
| `offers/` | status guard draft→reviewed→published→retired, `formatMoney(null) = "Not set"`, `liveOffers` excludes fictional, `OFFER_STATUS_STORAGE_KEY` | blank price is `null` |
| `practice/` | modes, drills (recall, order, lookup, branch, mirror duel, meaning, delivery, full mock, practice-this-moment), scenarios with `coachView` / `evaluatorView`, scoring, attempts summary | typed only; `tone_assessed: false` literal |
| `vocabulary/` | transcript normalization (`dedupeEvents`, `applyRevision`), extraction, ranking (corrections > counts), provenance classes, pins (3–7, stable slots), facts, `postCallReview`, `rubricDefinition`, funnel definitions, CRM lanes | THEIR WORDS engine |
| `listener/` | Personal Meaning Listener: `extractTurn`, concept index, `retrieveByConcept`, `suggestPrimary` (one slot, offer guard), lifecycle (`pin`, `dismiss`, `rejectReference`, `forbidReuse`, `clarify`, `correct`, `invalidateForRevision`), `listenerFromTurns` ≡ replayed `applyTurn`, `toCards` / `visibleCards`, persistable memory | THEIR REFERENCES engine; frozen API (docs/06 §2) |
| `dialer/` | queue from the prospect seed with per-mode `policy_status`, `precheck` / `liveGateReasons`, session reducer (idle → arming → dialing → ringing → connected → wrapup → cooldown → …), deterministic simulator over synthetic transcripts, stats without inference | demo only in the UI; `mode: 'live'` refuses without the gate |

Engines are pure functions over plain data; vitest runs them in Node with no DOM.

### `apps/web`

| Area | Files | Notes |
|---|---|---|
| Shell | `app/layout.tsx`, `shell.module.css`, `lib/routes.ts`, `lib/immersive.ts` | skip link → `Stage` (`main`) → fixed `TabBar` (Dial · Train · Script · Me). Immersive screens set `data-immersive` on `<html>` to hide the tab bar. Inter via `next/font`. |
| Dial (`/`) | `app/page.tsx`, `DialClient.tsx`, `InCall.tsx`, `OutcomeSheet.tsx`, `dial-lib.ts` | `DialClient` owns the reducer and the simulator clock; `InCall` renders the line (hero), THEIR WORDS / REFERENCES, transcript sheet, ⓘ sheet; `OutcomeSheet` demands a disposition. `/call-room` redirects here. |
| Train (`/practice`) | `app/practice/*` | tile grid → `DrillScreen` / `MockScreen`; `ModeControl` sets `settings.assistance_mode` |
| Script (`/scripts`, `/sources`, `/offers`) | `app/scripts/*`, `app/sources/*`, `app/offers/*` | stage rail, line cards, publish bar; source tiles / record page; offer list + status sheet |
| Me (`/today`, `/onboarding/identity`, `/profile`, `/insights`, `/settings`) | `app/today/*`, `app/onboarding/identity/*`, `app/profile/*`, `app/insights/*`, `app/settings/*` | rings, interview tiles, profile cards, insights `∅`, settings export/delete |
| Queue / History / Follow-ups | `app/prospects/*`, `app/calls/*`, `app/pipeline/*` | cards over the prospect seed, session history, disposition lanes; call review reuses the in-call layout read-only |
| Kit | `components/ui/*` | `Stage TabBar TopBar Pill(DemoPill FictionalPill GlyphPill NotAssessedGlyph StatusGlyph) HeroButton Ring Stat Tile TileGrid Chip Card Sheet Avatar LineCard SlotLine WordCard RefCard Icon IconButton Toast VisuallyHidden` |
| Lib | `lib/storage.ts`, `lib/line-parts.ts`, `lib/use-wide.ts` | storage below; `line-parts` turns slot cues into chips so no developer token reaches the stage |
| Styles | `styles/tokens.css`, `styles/globals.css` | dark-only tokens; global reduced-motion kill switch |

## 3. Data flow

1. **Seeds** (`data/*.json`) are validated by zod loaders in server components and passed as props.
   Invalid seed JSON fails the page, by design.
2. **Client state** lives in `localStorage` under `apohenia.v1.<key>` through `useStoredState(key, schema, initial)`
   (SSR-safe; writes are validated and refused when invalid; reads fall back on invalid data without deleting it).
   Keys in use: `interview.session`, `interview.profile`, `today.prefs`, `today.evidence`,
   `settings.assistance_mode`, `scripts.wordtracks`, `scripts.view`, `scripts.publications`, `offers.status`,
   `sources.filters`, `practice.attempts`, `dial.session`, `dial.incall`, `dial.history`, `dial.suppression`,
   `dial.prefs`, `pipeline.prefs`, `calls.corrections.<call_id>`. Settings can list, export (JSON) and delete
   the whole namespace.
3. **Dial session** (`DialClient`): `START_SESSION` builds the queue from the prospect seed with
   `{ mode: 'demo', suppressed }`; `ARM` starts a 3-s countdown; at zero the checks re-run (`precheck`) and
   `DIAL` fires; the simulator picks a synthetic transcript and a playback schedule; `InCall` feeds arrived
   turns to `analyzeCall` (THEIR WORDS) and `applyTurn` (THEIR REFERENCES); `END_CALL` opens the outcome sheet;
   a disposition writes `dial.history` (and `dial.suppression` for do-not-call), then a 5-s cooldown arms the
   next record. There is no `mode: 'live'` path in the UI.
4. **Scripts**: own word tracks are stored beside, never over, `primary_word_track`; Publish writes an immutable
   snapshot with a content hash to `scripts.publications`; the offer status store (`offers.status`) gates price
   and pillar interpolation in `resolveSlots`.
5. **Interview → profile → plan → Today**: answers persist per screen with `answered` / `skipped` /
   `not_applicable`; a back-edit invalidates dependents; the profile carries answer ids and must be endorsed
   before `buildTrainingPlan` runs; nothing from it can reach a prospect context.

## 4. Invariants the tests hold

- Four representations per question, never collapsed (`scripts.test.ts`, `sources.spec.ts`).
- `adapt` is not approval; `study_only` never live (`sources-library.test.ts`, `scripts.test.ts`).
- Primary wording stable within a version; mirror never overwrites; publication hash stable (`scripts.test.ts`).
- Blank price `null` → cue, never digits; fictional price never spoken (`scripts.test.ts`, `offers.test.ts`).
- Opt-out reaches the stop node from every one of the 51 nodes (`scripts.test.ts`).
- Corrections outrank counts; interim never confirmed; provenance classes distinct (`vocabulary.test.ts`).
- First-mention references, relationship preserved, origin unknown by default, one suggestion, no resurrection,
  offer guard (`listener.test.ts`).
- One active call; checks re-run before every dial; live refuses without the three-part gate; suppression
  durable within the browser (`dialer.test.ts`, `dial.spec.ts`).
- Hidden scenario facts unreachable from the coach view (`practice.test.ts`, `listener.test.ts`).
- Every drill builder leaves the script deep-equal (`practice.test.ts`).
- No developer token on the stage (`line-parts.test.ts`).

## 5. Build, test and tooling

- npm workspaces, Node 22. `next.config.ts`: `transpilePackages: ['@apohenia/domain']`, `turbopack.root` and
  `outputFileTracingRoot` = repo root (seeds live outside `apps/web`), `agentRules: false`.
- `vitest.config.mts` includes `packages/**/*.test.ts` and `apps/**/*.test.ts` in the Node environment.
- `playwright.config.ts`: Chromium only, 1440×900 default (specs also run 430×932), production build + `next start`
  on port 3000 (`E2E_DEV=1` swaps in `next dev`), pre-installed browser under `PLAYWRIGHT_BROWSERS_PATH`
  with a pinned-binary fallback; never `playwright install`.
- `eslint.config.mjs`: one flat config (`eslint-config-next` core-web-vitals + typescript), `--max-warnings 0`.
- `scripts/parse-question-bank.mjs` (lossless bank parser + validator) and `scripts/verify-source-offsets.mjs`
  (raw-source hash/offset verifier, pending inputs).

## 6. Where later increments attach (none of this exists)

| Increment | Attachment point | What is already shaped for it |
|---|---|---|
| 2 persistence | replace `useStoredState` backends per key with a Supabase client behind explicit real-data mode; RLS; worker jobs | `storage.ts` header forbids silent fallback; every stored value already has a zod schema |
| 3 telephony | a server route that mints Twilio voice tokens and creates idempotent call intents; `DialContext.mode = 'live'` with a real `LiveGate` | `liveGateReasons`, `precheck`, the reducer's `INBOUND_RING` / `PAUSE` events |
| 4 transcription + coach | signed webhook fixtures → `TranscriptEvent` (schema exists: `provider_event_key`, `provider_sequence`, `track`, `revision`, `is_final`, `consent_epoch`) → `dedupeEvents` / `applyRevision` / `applyTurn` | the same event schema is what the synthetic seed already uses |
| 5 voice practice + metrics | server-authorized Realtime session; `evaluatorView` stays server-side | `coachView` / `evaluatorView` split |
| 6 sources + sequencing | registry, SSRF-safe fetcher, scheduler; `sequential_session_flag` in the live gate | the flag is already required by `liveGateReasons` |
| 7 hardening | axe, security negatives, deletion/export jobs | `IMPLEMENTATION_STATUS.md` §7–§9 lists what is not claimed |

## 7. Decisions worth knowing

- **Domain first, React never in the domain.** Every rule the brief cares about is testable without a browser.
- **Seeds are data, docs are authority.** `docs/00` wins over any seed; seeds authored here say so in `CLAUDE.md`.
- **Honesty is a glyph, not a paragraph.** `◐ Demo` (name: "Demo mode: synthetic prospects, no real calls are
  placed"), `✦ Fictional`, `—` not assessed, `◔ Increment N` for controls that exist only to say what is missing.
- **Design System v2 replaced the v1 console.** No tables, sidebars or paragraphs; the in-call line never re-flows;
  the tab bar hides on immersive screens. `docs/screenshots/increment-1` is history.
- **The listener API is frozen** so the call screen and the review screen consume one extractor for live and mock.
