# Conventions for module agents

This file is the contract between the shared skeleton and the module agents that work in parallel
on it. Read `CLAUDE.md`, `docs/00-codex-master-v2.md` (§3–§9, §13, §14, §20–§22),
`docs/05-personal-meaning-listener-addendum-v3.md`, `docs/DESIGN_SYSTEM.md` (v2 "Arena"), then this
file, before editing.

## 1. Module ownership map (v2 — tab-shaped)

Ownership follows the four tabs plus the Dial tab's secondary screens. Each agent owns **exactly**
the paths listed and must not edit any other path. If you need something from a shared file,
request it in your report — do not edit it.

| Agent | Tab / screens | Owns (create/overwrite freely) |
|---|---|---|
| **M-core** (dial) | Dial `/` (idle, arming, dialing, ringing, in-call, outcome), `/call-room` redirect | `apps/web/src/app/{page.tsx,DialClient.tsx,InCall.tsx,OutcomeSheet.tsx,dial-lib.ts,dial.module.css}`, `apps/web/src/app/call-room/**`, `packages/domain/src/dialer/**`, `packages/domain/src/schemas/dialer.ts` (additive), `data/synthetic_prospects.json`, `packages/domain/test/dialer.test.ts`, `tests/e2e/dial.spec.ts`, `tests/e2e/screenshots.spec.ts` |
| **M-train** | Train `/practice` | `packages/domain/src/practice/**`, `packages/domain/src/schemas/practice.ts` (additive), `apps/web/src/app/practice/**`, `packages/domain/test/practice.test.ts`, `tests/e2e/practice.spec.ts` |
| **M-script** | Script `/scripts`, `/sources`, `/offers` | `data/apohenia_script_nodes.json`, `data/offers.json`, `data/source_missing_resources.json`, `packages/domain/src/{scripts,offers,sources}/**`, `packages/domain/src/schemas/{scripts,offers,sources}.ts` (additive), `apps/web/src/app/{scripts,sources,offers}/**`, `scripts/verify-source-offsets.mjs`, `packages/domain/test/{scripts,offers,sources,sources-library}.test.ts`, `tests/e2e/{scripts,sources,offers}.spec.ts`, `docs/03-apohenia-draft-scripts.md`, `SCRIPT_APPROVALS.md`, `SOURCE_COVERAGE.md` |
| **M-me** | Me `/today`, `/onboarding/identity`, `/profile`, `/insights`, `/settings` | `data/identity_interview.json`, `packages/domain/src/interview/**`, `packages/domain/src/schemas/interview.ts` (additive), `apps/web/src/app/{today,onboarding,profile,insights,settings}/**`, `packages/domain/test/interview.test.ts`, `tests/e2e/interview.spec.ts`, `docs/04-identity-interview.md`, `INTERVIEW_FLOW.md` |
| **M-queue** | Queue `/prospects`, History `/calls`, Follow-ups `/pipeline` (Dial's secondary screens) | `apps/web/src/app/{prospects,calls,pipeline}/**`, `packages/domain/src/vocabulary/**`, `packages/domain/src/listener/**`, `packages/domain/src/schemas/{vocabulary,listener,transcript}.ts` (additive), `data/synthetic_transcripts.json`, `packages/domain/test/{vocabulary,listener,queue-history}.test.ts`, `tests/e2e/calls.spec.ts`, `docs/06-listener-implementation.md` |

**Shared (skeleton-owned — do not edit without saying so in your report):**
`packages/domain/src/schemas/index.ts`, `packages/domain/src/seeds.ts`, `packages/domain/src/index.ts`,
`packages/domain/package.json`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/shell.module.css`,
`apps/web/src/components/**` (the kit), `apps/web/src/lib/**`, `apps/web/src/styles/**`, every config
file (`package.json`, `tsconfig*`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`,
`playwright.config.ts`, `vercel.json`), `tests/e2e/smoke.spec.ts`, `README.md`, `.env.example`,
`scripts/parse-question-bank.mjs`, `data/source_question_records.json`, `data/source_sections.json`,
`data/source_package_validation.json`, `docs/00-*`, `docs/01-*`, `docs/02-*`, `docs/05-*`,
`docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, `docs/SETUP.md`,
`docs/SOURCE_REGISTER.md`, `IMPLEMENTATION_STATUS.md`, `legacy/**` (frozen, never).

Additive schema changes are allowed in your own schema file: new optional fields, new enum members,
new exported schemas. Never rename, remove, or tighten an existing field, and state every addition
in your report. `schemas/transcript.ts` is shared between M-core and M-queue; announce changes to both.

The listener (`packages/domain/src/listener/**`) is M-queue's, but its **public API is frozen**
(`docs/06-listener-implementation.md` §2): M-core consumes `listenerFromTurns`, `applyTurn`,
`suggestPrimary`, `toCards`, `visibleCards` and the lifecycle functions through
`@apohenia/domain/listener` and never reaches into its internals.

Tests: domain tests in `packages/domain/test/<module>.test.ts` (or `src/<module>/*.test.ts`), page
tests in `tests/e2e/<module>.spec.ts`. Do not edit `smoke.spec.ts`.

## 2. Hard rules during module work

- **No `npm install`, no new dependencies, no lockfile changes.** The stack is pinned:
  next 16.3.4, react 19.3.0, typescript 5.9.3, zod 4.6.1, vitest 4.1.11, @playwright/test 1.63.0.
- **No `next build` / `npm run build` / `npm run e2e` during module work** (they collide when
  several agents run in parallel). Use `npm run typecheck`, `npx vitest run <path>` and
  `npx eslint <your paths> --max-warnings 0`. To check a page, run a private dev server on a port
  other than 3000 and point Playwright at it with `E2E_DEV=1` only in your own sandbox. The
  orchestrator runs build + e2e after merge.
- Do not touch `legacy/**`.
- Do not commit; the orchestrator commits.
- Keep every page file **self-contained** so a later overwrite is clean: a page imports only
  from `@/components/ui`, `@/lib/*`, `@apohenia/domain/*` subpaths, and files inside its own route folder.
- Never simulate a later increment as live (no fake dialing, no fake transcription, no fake model).
  If a control needs Increment N, it opens a sheet that says so (`◔ Increment N` chip, one line).

## 3. How to add or replace a screen (v2 kit)

A route is a server `page.tsx` that loads seeds and a client `*Client.tsx` that renders on the
Stage. Every screen has one hero control, one visually hidden `h1`, a `TopBar` with the `◐ Demo`
pill, and no tables, sidebars or paragraphs (DESIGN_SYSTEM §0).

```tsx
// apps/web/src/app/practice/page.tsx  (server component — no 'use client')
import type { Metadata } from 'next';
import { loadScriptNodes } from '@apohenia/domain/seeds';   // seeds load on the server only
import { PracticeClient } from './PracticeClient';

export const metadata: Metadata = { title: 'Train' };

export default function PracticePage() {
  const seed = loadScriptNodes();                            // throws if the JSON is invalid — intended
  return (
    <>
      <h1 className="sr-only">Practice</h1>                  {/* the ONLY h1; text from lib/routes.ts APP_ROUTES */}
      <PracticeClient nodes={seed.nodes} versions={seed.versions} />
    </>
  );
}
```

```tsx
// apps/web/src/app/practice/PracticeClient.tsx
'use client';
import { useState } from 'react';
import { z } from 'zod';
import type { ScriptNode, ScriptVersion } from '@apohenia/domain/schemas';
import { IconButton, Sheet, Tile, TileGrid, TopBar } from '@/components/ui';
import { useStoredState } from '@/lib/storage';

const Attempts = z.array(z.object({ drill: z.string(), at: z.string() }));

export function PracticeClient({ nodes }: { nodes: ScriptNode[]; versions: ScriptVersion[] }) {
  const [attempts, setAttempts, hydrated] = useStoredState('practice.attempts', Attempts, []);
  const [sheet, setSheet] = useState<'none' | 'info'>('none');
  return (
    <>
      <TopBar title="Train" right={<IconButton icon="info" label="What Train is" onClick={() => setSheet('info')} />} />
      <TileGrid>
        {/* one Tile per drill: icon + ≤2-word label; rings carry the numbers */}
      </TileGrid>
      {/* the one hero control for this screen, docked above the tab bar */}
      <Sheet open={sheet === 'info'} onClose={() => setSheet('none')} title="Train">
        {/* explanations live here, not on the stage */}
      </Sheet>
    </>
  );
}
```

Rules:
- **One hero per screen.** Dial's is the `HeroButton`; a drill's is the docked Check/Next hero; Script's is the
  docked Publish bar; the interview's is its action bar. Nothing else may look like a primary control.
- **One `<h1>` per route, visually hidden** (`className="sr-only"`), text identical to `APP_ROUTES` in
  `apps/web/src/lib/routes.ts` (the smoke test reads it). The stage shows a one-word `TopBar` title at most.
- **Words ≤3 per visible label**; a full sentence lives only in an accessible `name`, a `Sheet`, or the script
  line itself. Sheets (native `<dialog>`, Esc closes, focus trapped) replace every modal and every explanation.
- **Immersive screens** (in-call, interview) call `useImmersive(true)` from `@/lib/immersive` so the tab bar
  hides, and render their own explicit exit control. Add always-immersive routes to `IMMERSIVE_ROUTES` and mark
  them `immersive: true` in `APP_ROUTES` (both shared — request it).
- Seeds: import loaders from `@apohenia/domain/seeds` in **server** components; pass plain data down as props.
  Loaders throw on invalid JSON — that is intended. Prefer `@apohenia/domain/schemas` / `/seeds` / `/<module>`
  subpath imports in client components so the 250 KB source JSON never enters a client bundle.
- Client state: `useStoredState(key, zodSchema, initial)` from `@/lib/storage` (returns `[value, set, hydrated]`).
  Keys are short dotted names (`practice.attempts`, `dial.suppression`); the `apohenia.v1.` prefix is added for
  you. Never use `localStorage` directly. Writes are validated and refused when invalid. Render stored state
  only once `hydrated` is true if it affects layout.
- Honesty glyphs are kit components, never ad-hoc text: `DemoPill`, `FictionalPill`, `GlyphPill`,
  `NotAssessedGlyph`, `StatusGlyph`. Every glyph carries its full accessible name.
- Route folders may contain any number of colocated files (`*Client.tsx`, `*.module.css`, `*-lib.ts`).
  Do not create routes outside your ownership. Deep links use search params (`/scripts?node=<id>`), never new routes.

## 4. How to write a domain test

```ts
// packages/domain/test/interview.test.ts
import { describe, expect, it } from 'vitest';
import { loadIdentityInterview } from '../src/seeds';
import { visibleScreens } from '../src/interview';

describe('interview engine', () => {
  it('renders conditional screens only when the declared condition holds', () => {
    const version = loadIdentityInterview();
    expect(version.screens.filter((s) => s.base_or_conditional === 'conditional')).toHaveLength(3);
    // ...
  });
});
```

Run with `npx vitest run packages/domain/test/interview.test.ts`. Tests are plain Node (no jsdom).
Domain code must not import React or touch `window`. Name a `describe` after the brief scenario or
addendum item it proves (`scenario 29 — …`, `§10 item 3 — …`) so `IMPLEMENTATION_STATUS.md` can cite
it. Mark behaviour that belongs to a later increment with `it.todo(...)`; never fake it.

## 5. How to write an E2E test

```ts
// tests/e2e/practice.spec.ts
import { expect, test } from '@playwright/test';

test('train tiles carry two rings and no paragraph', async ({ page }) => {
  await page.goto('/practice');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Practice');   // visually hidden
  await expect(page.locator('table')).toHaveCount(0);
  await page.getByRole('button', { name: /Exact recall/i }).click();
  // ...
});
```

Use roles and accessible names; `data-*` hooks only where a role is ambiguous. Assert the
design-system floor in every screen spec: no `table`, no `p` on the stage, one hidden `h1`, the demo pill,
no console errors (see the helper in `smoke.spec.ts`), and no horizontal page scroll at 430 wide. Do not
run the suite during module work; write it so `npm run e2e` (production build on port 3000) passes after
merge. `screenshots.spec.ts` regenerates `docs/screenshots/v2/*.png` — add your screen there via M-core.

## 6. Styling rules (Design System v2 "Arena")

- Plain CSS with tokens from `apps/web/src/styles/tokens.css`; CSS Modules colocated with the
  component (`foo.module.css`). No Tailwind, no CSS-in-JS. Inter ships through `next/font` on `<html>`
  as `--font-sans`; use `var(--font)` and never fetch a font at runtime.
- Use only the v2 tokens: stage `--bg`, `--bg-1/2/3`, `--glass`, `--line`, `--line-strong`; ink
  `--ink`, `--ink-2`, `--ink-3`; signal `--green` `--red` `--gold` (THEIR WORDS) `--purple` (THEIR
  REFERENCES) `--blue` `--orange` `--teal`; type `--fs-micro/caption/body/title/large`, `--fs-display`
  (`--fs-display-long` past ~24 words) for the script line, `--fs-their-words` for word/reference labels,
  `--fs-number` for hero numbers; shape `--r-card/sheet/tile/chip/hero`; space `--s-1…--s-8`; motion
  `--ease`, `--dur-fast/--dur/--dur-slow`; `--focus`; layout `--col`, `--rail`, `--tabbar-h`.
  Do not hard-code hex colors. There is no light palette.
- Dark stage, one hero per screen, 97/3, no tables, no sidebars, no paragraphs on the stage, rings not
  bars, sheets not modals, tiles not dropdowns (`docs/DESIGN_SYSTEM.md`). Motion ≤560 ms and never moves
  the line the rep is reading; `globals.css` collapses every animation under `prefers-reduced-motion` —
  do not re-enable. Route-root keyframes must animate **opacity only** (an animated `transform` on a
  route root becomes the containing block for the fixed TopBar and in-call stage).
- Reuse the v2 kit from `@/components/ui`: `Stage`, `TabBar`, `TopBar`, `DemoPill` / `FictionalPill` /
  `GlyphPill` / `NotAssessedGlyph` / `StatusGlyph`, `HeroButton`, `Ring`, `Stat`, `Tile` / `TileGrid`, `Chip`,
  `Card`, `Sheet`, `Avatar`, `LineCard`, `SlotLine`, `WordCard`, `RefCard`, `Icon` / `IconButton`, `Toast`,
  `VisuallyHidden`. The v1 kit (Button, PageHeader, Badge, Field, Select, EmptyState, Dialog, Tabs,
  Stack/Inline) no longer exists. If you need a new shared component, build it inside your route folder
  and propose promotion in your report.
- Fixed chrome: the TopBar is full-width fixed glass with a constant height; the TabBar is fixed at the bottom
  (`--tabbar-h` + safe area). Anything docked above the tab bar (a hero, the Publish bar) must reserve its
  height on the scrolling body so nothing renders underneath it.
- No developer tokens on the stage: slots render as `SlotLine` chips, never `{slot}` / `[missing:…]` / `⟨…⟩`
  (`apps/web/src/lib/line-parts.ts`, tested by `line-parts.test.ts`). Ids belong in accessible names and
  `data-*` attributes, not in visible text.

## 7. Accessibility checklist (every screen)

- One `h1` (visually hidden); headings in order (`Sheet` titles are `h2`, captions inside are `h3`);
  landmarks intact (the shell provides the skip link, the `main` Stage and the `nav[aria-label="Primary"]` tab bar).
- Every control keyboard-operable with a visible focus ring (`--focus`; never `outline: none`). Tiles in a
  grid support arrow keys and Space.
- State never by color alone: pair with a glyph whose accessible name says the whole truth
  (`GlyphPill`, `NotAssessedGlyph`, `StatusGlyph`).
- Form controls (the rare textarea/search field) carry a real `<label>` or `aria-label`.
- Sheets use `Sheet` (native `<dialog>`, focus contained, Esc closes — except the outcome sheet, which requires
  a disposition and says so).
- Large answer tiles and script lines are real buttons/links, not clickable divs.
- Text contrast ≥ 4.5:1 against `--bg` / `--bg-1` / `--bg-2`.
- State changes that matter mid-call are announced through an `aria-live="polite"` region; nothing else is live.
- Respect `prefers-reduced-motion`; no auto-playing motion; nothing flashes.

## 8. Honesty rules (labels are mandatory)

- **Placeholder** seeds carry `"_status": "placeholder — to be authored"`. Remove the marker
  only when the content is real. UI must show "placeholder" while it is present.
- **Draft** script nodes and offers show their `approval.status` / `status` glyph on every
  render. `draft` is never rendered as if approved. `adapt` (source classification) is not
  live approval; `study_only` never becomes a live recommendation.
- **Fictional** offers always render `fictional_banner` ("FICTIONAL TRAINING OFFER / NOT A
  REAL QUOTE") and never populate the live offer list.
- **Unapproved / unknown** values render as a missing-information cue — never a fabricated
  slot value, never a default price of 0 (`null` means unset).
- **Synthetic** transcripts and prospects are labelled synthetic / fictional; interim text is provisional;
  provenance (prospect said / seller proposed and confirmed / seller only / hypothesis) is always visible on a
  word card; meaning status (observed / inferred / confirmed / unknown) is always visible on a reference card.
- **Demo** is the only mode: the `◐ Demo` pill ("Demo mode: synthetic prospects, no real calls are placed")
  is on every screen. No control may imply a phone, a transcription service or a model is connected.
- **Pre-qualification, readiness, personality**: no scores, percentages or labels about the
  user or the prospect. Decision lenses are tentative and correctable.
- In your report: list exactly which commands you ran and their real results. Never claim
  a test passed if it did not run.
