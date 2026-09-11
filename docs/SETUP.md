# Setup — real commands for this repository

Everything here runs with **no credentials** and cannot contact a phone number, a transcription service or a model.
Last verified on 2026-09-11 (see `IMPLEMENTATION_STATUS.md` §1 for the exact results).

## 1. Requirements

- Node **22** (`package.json` `engines.node >= 22`; verified with v22.22.2) and npm 10 (verified 10.9.7).
- Chromium for Playwright pre-installed under `PLAYWRIGHT_BROWSERS_PATH` (default `/opt/pw-browsers`).
  `playwright.config.ts` falls back to the pinned binary automatically. **Never run `playwright install`** in
  this environment.
- No `.env` file. `.env.example` contains only commented placeholders for Increments 2–5; leave it as-is.

## 2. Install

```bash
npm install          # workspaces: apps/web, packages/domain; lockfile committed (npm ci also works)
```

If `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`, that is an npm arborist bug
triggered while resolving vitest 4.1's optional peers *without* a lockfile. Keep `package-lock.json`.

## 3. Gates (run from the repo root, in this order)

```bash
npm run seed:validate   # node scripts/parse-question-bank.mjs → data/source_*.json; expect 207 records, 0 errors, unchanged tree
npm run typecheck       # tsc --noEmit for packages/domain, apps/web, tests
npm run lint            # eslint . --max-warnings 0
npm test                # vitest run — 13 files (last run: 264 passed, 2 todo)
npm run build           # next build (Turbopack) — 246 static pages, /scripts and /today dynamic
npm run e2e             # playwright test — builds + starts apps/web on :3000, Chromium (last run: 88 passed)
```

Optional:

```bash
npm run verify:offsets  # node scripts/verify-source-offsets.mjs — exits 0 "pending" until sources/source_a.txt and source_b.txt exist
npx vitest run packages/domain/test/listener.test.ts        # one file
npx playwright test tests/e2e/dial.spec.ts --reporter=list  # one spec (uses the production server)
E2E_DEV=1 npx playwright test tests/e2e/smoke.spec.ts       # against `next dev` instead of a build
```

Before `npm run build` or `npm run e2e` after a `next dev` session: `git checkout -- apps/web/next-env.d.ts` and
make sure no stray `next dev` process holds port 3000 (`npm run e2e` reuses an existing server if one answers).

## 4. Run the demo

```bash
npm run dev             # http://localhost:3000 — the Dial front door
```

What you can do: tap the hero → 3-s countdown → a simulated call over a synthetic prospect (THEIR WORDS and
THEIR REFERENCES fill in as synthetic turns arrive) → End → pick an outcome → the next record arms. Train,
Script (+ Sources, Offers) and Me (+ interview, profile, insights, settings) are all usable. Everything is stored in
this browser under `localStorage` keys `apohenia.v1.*`; Settings → Export / Delete all.

Demo playback speed has no UI. To speed the synthetic transcript up (as the e2e specs do) set
`localStorage.setItem('apohenia.v1.dial.prefs', JSON.stringify({ playback_rate: 8 }))` in the console and reload.

## 5. Regenerate the reference screenshots

```bash
npm run e2e -- tests/e2e/screenshots.spec.ts   # writes docs/screenshots/v2/*.png at 430x932 and 1440x900
```

Inspect every PNG before committing; only the clock in the next-up card should differ between runs.

## 6. Deployment

None has been performed. `vercel.json` describes the build (`npm run build -w apps/web`, output
`apps/web/.next`) but **do not deploy publicly**: the licensed source package is rendered on `/sources` and the app
has no authentication until Increment 2 (`docs/THREAT_MODEL.md` §3). There is no Docker file.

## 7. Later increments — required external fields (none present, none needed now)

| Increment | Variables (server-only unless `NEXT_PUBLIC_`) | Also required |
|---|---|---|
| 2 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | migrations, RLS policies, private auth |
| 3 | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_TWIML_APP_SID`, `TWILIO_CALLER_ID`, `PUBLIC_CALLBACK_URL` | a number the workspace is authorized to present; approved contact/recording policy; a separately authorized live test |
| 4/5 | `OPENAI_API_KEY` | chosen model ids from the live model list, budget limits |

Never put a real value in `.env.example`, in a log, or in client-exposed variables.
