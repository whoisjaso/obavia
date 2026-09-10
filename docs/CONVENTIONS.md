# Conventions for module agents (Increment 1)

This file is the contract between the skeleton and the five parallel module agents. Read
`CLAUDE.md`, `docs/00-codex-master-v2.md` (§3–§8, §13, §20), then this file, before editing.

## 1. Module ownership map

Each agent owns **exactly** the paths listed and must not edit any other path. If you need
something from a shared file, request it in your report — do not edit it.

| Agent | Owns (create/overwrite freely) |
|---|---|
| **M-interview** | `data/identity_interview.json`, `packages/domain/src/interview/**`, `apps/web/src/app/onboarding/**`, `apps/web/src/app/profile/**`, `apps/web/src/app/today/**`, `docs/04-identity-interview.md`, `INTERVIEW_FLOW.md` |
| **M-script** | `data/apohenia_script_nodes.json`, `data/offers.json`, `packages/domain/src/scripts/**`, `packages/domain/src/offers/**`, `apps/web/src/app/scripts/**`, `apps/web/src/app/offers/**`, `docs/03-apohenia-draft-scripts.md`, `SCRIPT_APPROVALS.md` |
| **M-sources** | `packages/domain/src/sources/**` (extend — keep existing exports working), `apps/web/src/app/sources/**`, `data/source_missing_resources.json`, `SOURCE_COVERAGE.md` |
| **M-practice** | `packages/domain/src/practice/**`, `apps/web/src/app/practice/**` |
| **M-vocab** | `packages/domain/src/vocabulary/**`, `data/synthetic_transcripts.json`, `apps/web/src/app/call-room/**`, `apps/web/src/app/calls/**`, `apps/web/src/app/prospects/**`, `apps/web/src/app/pipeline/**`, `apps/web/src/app/insights/**` |

**Shared (skeleton-owned — do not edit without saying so in your report):**
`packages/domain/src/schemas/**`, `packages/domain/src/seeds.ts`, `packages/domain/src/index.ts`,
`apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/settings/**`,
`apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/web/src/styles/**`, every config
file (`package.json`, `tsconfig*`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`,
`playwright.config.ts`), `tests/e2e/smoke.spec.ts`, `README.md`, `.env.example`, `scripts/**`,
`data/source_*.json`, `docs/00-*`, `docs/01-*`, `docs/02-*`, `legacy/**` (frozen, never).

Exception: an agent **may add fields to its own schema file additively**
(`schemas/interview.ts` → M-interview; `schemas/scripts.ts`, `schemas/offers.ts` → M-script;
`schemas/practice.ts` → M-practice; `schemas/vocabulary.ts` → M-vocab; `schemas/sources.ts`
→ M-sources). Additive means: new optional fields, new enum members, new exported schemas.
Never rename, remove, or tighten an existing field, and state every addition in your report.
`schemas/transcript.ts` and `seeds.ts` are shared; if a seed envelope needs a new field, add it
additively in `seeds.ts` and say so.

Tests: put domain tests in `packages/domain/test/<module>.test.ts` (or `src/<module>/*.test.ts`)
and page tests in `tests/e2e/<module>.spec.ts`. Do not edit `smoke.spec.ts`.

## 2. Hard rules during module work

- **No `npm install`, no new dependencies, no lockfile changes.** The stack is pinned:
  next 16.3.4, react 19.3.0, typescript 5.9.3, zod 4.6.1, vitest 4.1.11, @playwright/test 1.63.0.
- **No `next build` / `npm run build` / `npm run e2e` during module work** (they collide when
  five agents run in parallel). Use `npm run typecheck` and `npx vitest run <path>` and
  `npx eslint <your paths> --max-warnings 0`. The orchestrator runs build + e2e after merge.
- Do not touch `legacy/**`.
- Do not commit; the orchestrator commits.
- Keep every page file **self-contained** so a later overwrite is clean: a page imports only
  from `@/components/ui`, `@/lib/*`, `@apohenia/domain*`, and files inside its own route folder.

## 3. How to add or replace a page

Server page + client component pattern:

```tsx
// apps/web/src/app/scripts/page.tsx  (server component — no 'use client')
import type { Metadata } from 'next';
import { loadScriptNodes } from '@apohenia/domain/seeds';   // seeds load on the server
import { PageHeader } from '@/components/ui';
import { ScriptsClient } from './ScriptsClient';

export const metadata: Metadata = { title: 'Scripts' };

export default function ScriptsPage() {
  const seed = loadScriptNodes();                            // throws if the JSON is invalid
  return (
    <>
      <PageHeader title="Scripts" purpose="One sentence from the brief." />
      <ScriptsClient nodes={seed.nodes} versions={seed.versions} placeholder={seed._status !== undefined} />
    </>
  );
}
```

```tsx
// apps/web/src/app/scripts/ScriptsClient.tsx
'use client';
import { z } from 'zod';
import type { ScriptNode } from '@apohenia/domain/schemas';
import { useStoredState } from '@/lib/storage';

const Draft = z.object({ node_id: z.string(), own_text: z.string() });

export function ScriptsClient({ nodes }: { nodes: ScriptNode[] }) {
  const [draft, setDraft, hydrated] = useStoredState('scripts.draft', Draft, { node_id: '', own_text: '' });
  // Render `nodes`; render `draft` only once `hydrated` is true if it affects layout.
}
```

Rules:
- Exactly one `<h1>` per page, via `PageHeader`. The `purpose` is one sentence from the brief.
- Seeds: import loaders from `@apohenia/domain/seeds` in **server** components; pass plain
  data down as props. Loaders throw on invalid JSON — that is intended.
- Client state: `useStoredState(key, zodSchema, initial)` from `@/lib/storage`. Keys are
  short dotted names (`interview.session`, `practice.attempts`); the namespace prefix is
  added for you. Never use `localStorage` directly. Never write invalid data (writes are
  validated and refused).
- Prefer `@apohenia/domain/schemas` / `/seeds` / `/<module>` subpath imports in client
  components so the 200 KB source JSON is not pulled into a client bundle.
- Route folders may contain any number of colocated files (`*Client.tsx`, `*.module.css`,
  `lib.ts`). Do not create routes outside your ownership.

## 4. How to write a domain test

```ts
// packages/domain/test/interview.test.ts
import { describe, expect, it } from 'vitest';
import { loadIdentityInterview } from '../src/seeds';
import { nextScreen } from '../src/interview';

describe('interview engine', () => {
  it('renders conditional screens only when the declared condition holds', () => {
    const version = loadIdentityInterview();
    expect(version.screens.filter((s) => s.base_or_conditional === 'conditional')).toHaveLength(3);
    // ...
  });
});
```

Run with `npx vitest run packages/domain/test/interview.test.ts`. Tests are plain Node
(no jsdom). Domain code must not import React or touch `window`.

## 5. How to write an E2E test

```ts
// tests/e2e/interview.spec.ts
import { expect, test } from '@playwright/test';

test('interview needs no typing', async ({ page }) => {
  await page.goto('/onboarding/identity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Identity interview');
  await page.getByRole('button', { name: /a specific revenue figure/i }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  // ...
});
```

Use roles and accessible names, `data-*` hooks only where a role is ambiguous. Do not run
the suite during module work; write it so `npm run e2e` (which builds and starts the app on
port 3000) will pass after merge. Assert no console errors where reasonable (see
`smoke.spec.ts` for the helper pattern).

## 6. Styling rules

- Plain CSS with tokens from `apps/web/src/styles/tokens.css`; CSS Modules colocated with
  the component (`foo.module.css`). No Tailwind, no CSS-in-JS, no runtime font fetching —
  system font stack only.
- Use spacing (`--space-N`), type (`--font-size-*`), color, radius and focus tokens; do not
  hard-code hex colors. THEIR WORDS text uses `--font-size-their-words`.
- Calm desktop UI: strong text hierarchy, restrained decoration, no flashing, no bouncing.
  Transitions are killed under `prefers-reduced-motion` globally — do not re-enable.
- Reuse `@/components/ui` (Button, Card, PageHeader, Badge, Field, Select, EmptyState,
  Dialog, Tabs, KeyboardHint, VisuallyHidden, Stack, Inline). If you need a new shared
  component, build it inside your route folder and propose promotion in your report.

## 7. Accessibility checklist (every screen)

- One `h1`; headings in order; landmarks intact (the shell provides header/nav/main).
- Every control keyboard-operable with a visible focus ring (never `outline: none`).
- State never by color alone: pair with text or a glyph (see `Badge`).
- Form controls linked via `Field` (label, help, error with `aria-invalid`).
- Dialogs use `Dialog` (native `<dialog>`, focus contained, Esc closes).
- Large answer cards and script lines are real buttons/links, not clickable divs.
- Text contrast ≥ 4.5:1 against `--color-paper` / `--color-surface`.
- Respect `prefers-reduced-motion`; no auto-playing motion.

## 8. Honesty rules (labels are mandatory)

- **Placeholder** seeds carry `"_status": "placeholder — to be authored"`. Remove the marker
  only when the content is real. UI must show "placeholder" while it is present.
- **Draft** script nodes and offers show their `approval.status` / `status` badge on every
  render. `draft` is never rendered as if approved. `adapt` (source classification) is not
  live approval; `study_only` never becomes a live recommendation.
- **Fictional** offers always render `fictional_banner` ("FICTIONAL TRAINING OFFER — NOT A
  REAL QUOTE") and never populate the live offer list.
- **Unapproved / unknown** values render as a missing-information cue — never a fabricated
  slot value, never a default price of 0 (`null` means unset).
- **Synthetic** transcripts are labelled synthetic; interim text is labelled provisional;
  provenance (prospect said / seller proposed and confirmed / seller only / hypothesis) is
  always visible on a vocabulary pin.
- **Pre-qualification, readiness, personality**: no scores, percentages or labels about the
  user. Decision lenses are tentative and correctable.
- In your report: list exactly which commands you ran and their real results. Never claim
  a test passed if it did not run.
