# Implementation status — Apohenia Sales OS

Truthful state after the Arena v2 (Design System v2) integration pass, visual-critic fix round 1 and
integration round 2 on 2026-09-11. Categories follow
CLAUDE.md: **verified by automated tests** · **manually inspected** · **integration built but live test
pending** · **intentionally disabled pending permission/credentials** · **not implemented**.

## Gates (last full pass, run in this order, one run each)

| Gate | Command | Result |
|---|---|---|
| Seeds | `npm run seed:validate` | 207 records, 0 length mismatches, 0 errors; parser outputs byte-identical |
| Types | `npm run typecheck` | clean (domain, web, tests) |
| Lint | `npm run lint` (`--max-warnings 0`) | clean |
| Unit | `npm test` (vitest) | 13 files, 264 passed, 2 todo (adds `apps/web/src/lib/line-parts.test.ts`: no `[missing:`, `{`, `⟨` on any rendered line) |
| Build | `npm run build` (Next 16, Turbopack) | 246 static pages; `/scripts`, `/today` dynamic |
| E2E | `npm run e2e` (Playwright, Chromium, production build) | 88 passed, 0 failed, 0 skipped |

## Verified by automated tests
- Dial front door `/`: hero is the largest object, < 15 visible words, tap → 3 s countdown (cancel by tap/Esc,
  Space resumes), dialing → ringing → in-call crossfade, entry line equals the domain's resolved line and never
  moves or grows while THEIR WORDS / REFERENCES arrive (≥3 words, ≥1 reference, ≥24 px, no overlap with the
  line), branch chips ≤4 + more, End → 9 outcome tiles (Esc does not dismiss), Callback → 4 time tiles,
  disposition → 5 s cooldown → next record arms automatically, ⏸ pauses, ✕ ends with a summary sheet
  (`tests/e2e/dial.spec.ts`, both 430×932 and 1440×900).
- "Do not call" writes durable suppression, survives reload, and removes the number from later dials; a fully
  suppressed queue shows `∅` with one tile to `/prospects` and no hero (`dial.spec.ts`).
- Shell: no sidebar, no table, four tabs with `aria-current`, one visually hidden `h1` per route, one visible
  `◐ Demo` pill with its full accessible name, dark stage, no console errors on all 13 routes, `/call-room`
  redirects to `/` (`smoke.spec.ts`).
- Train, Script, Sources, Offers (price `—` / "Price not set", `✦ Fictional` pill), Me / Interview (click-only,
  skip / uncertainty / none), History, Pipeline: see the per-route specs in `tests/e2e/`.
- Domain: dialer reducer (one active call, precheck before every dial, live-gate refusal, DNC suppression,
  pause-on-inbound, queue-empty end), simulator, listener (addendum v3 items 1–20), interview, scripts,
  practice, vocabulary (`packages/domain/test/*`).

## Visual-critic fix round 1 (verified by the e2e specs named)
- In-call is a fixed, non-scrolling stage: the tab bar hides while a call is on (`data-immersive` on `<html>`),
  ↑ transcript + End sit in a docked bottom bar, the THEIR WORDS strip is a fixed 120 px row on a phone (dark
  while empty), the line's text scrolls inside the card, branch chips are one row (2 on a phone, 3 on a wide
  stage, + more) that never overlap End; the wide rail uses the full height (`dial.spec.ts`).
- No developer tokens on the stage: slots render as `‹name›` chips whose accessible name says what fills them
  (`SlotLine`), offer/price gates as `◔` chips, the bridge as three glyph cues (◐ ack · ● their word · ? question);
  mirrors and Train lines resolve against the record / a fictional practice prospect (`line-parts.test.ts`,
  `scripts.spec.ts`, `practice.spec.ts`, `dial.spec.ts`, `calls.spec.ts`).
- One panel system: a reference whose term is a pinned word merges into that word card (purple edge, meaning
  line ≤8 words, `● said`), corrections read `not ~~revenue~~` in red at 15 px, provenance at 13 px.
- Sources = section tiles (glyph · ≤2-word name · count ring), records as one-line cards inside a section or a
  search (behind the 🔍 icon); record provenance (source, section, family, offsets, hash status) lives behind ⓘ
  (`sources.spec.ts`).
- Profile = one card per answered question (caption + 22 px answer; `—` with an accessible name when open); ids
  stay in `data-answer-ids` and the JSON export only. Interview = 2-column option tiles, one progress ring, an
  opaque docked action bar, no tab bar, an explicit ✕ exit (`interview.spec.ts`, `smoke.spec.ts`).
- Script cards clamp the line at 22 px with a fade; version/graph/offer status sits behind ⓘ; Publish is a docked
  hero (`scripts.spec.ts`, `offers.spec.ts`). Train tiles carry two 28 px rings; on Check the result rings replace
  the textarea above the docked hero (`practice.spec.ts`). Me always shows the three rings, a plan card (`∅`
  inside), a next-drill card and the interview tile with a progress ring. Insights shows one `∅` tile for calls
  with the nine stage definitions behind a chip. Queue/History use a 20 px status glyph at the row edge;
  Follow-ups is a segmented chip control over one list (`calls.spec.ts`).
- TopBar is full-width fixed glass with a constant height (session timer at 22 px); hero motion: ink countdown
  ring, outward pulse while dialing, two staggered halos while ringing, opacity-only under reduced motion;
  outcome tiles mark the simulated result as `✦` suggested, never selected.

## Integration round 2 (verified by the same gates; screenshots re-inspected)
- Every route `fadeIn` keyframe is opacity-only (was `translateY(6px)`): an animated `transform` on a route root
  made it the containing block for the fixed TopBar and the fixed in-call stage for the first 320 ms, so the
  bar rendered column-width and then snapped to full width (Insights, Queue, History, Follow-ups screenshots
  caught it mid-animation). Files: `dial`, `insights`, `prospects`, `pipeline`, `calls`, `sources`, `today`,
  `profile`, `scripts`, `offers`, `settings` `*.module.css`.
- Script: the docked Publish tile now sits flush on the tab bar (sticky bottom = tab bar + safe area, solid
  gradient under it) so no card text shows between the tile and the bar.
- Confirmed already removed: `apps/web/src/app/call-room/{CallRoomClient,ReferencesPanel}.tsx`,
  `components/ui/legacy/*`, `tests/e2e/call-room.spec.ts`, `playwright.mscript.config.ts`; every remaining
  `components/ui/*` export is imported by a screen (`VisuallyHidden` is kit-only, kept per DESIGN_SYSTEM §2).

## Manually inspected
- `docs/screenshots/v2/*.png` (28 shots, regenerated by `tests/e2e/screenshots.spec.ts` in the last e2e run):
  Dial idle/arming, In-call, Outcome, Train, Script, Me, Interview, Sources, Profile, Insights, Queue, History,
  Follow-ups at 430×932 and 1440×900. Hero largest on Dial idle; no sidebar, table, board or paragraph on any
  shot; tab bar on every tab screen (hidden in-call and in the interview); text legible at 430 wide.

## Integration built but live test pending
- Nothing claims to be live. The dialer reducer enforces `mode: 'live'` gating (telephony + reviewed policy +
  sequential-session flag) in unit tests only; the UI is demo-only.

## Intentionally disabled pending permission / credentials
- Telephony (Twilio), Supabase persistence, OpenAI/realtime coaching, research adapters: not wired; demo mode
  cannot dial and uses synthetic prospects/transcripts only.

## Not implemented
- Increments 2–7 (see the brief): real-data mode, consent gates, native transcription, structured coach, source
  registry/fetcher, scheduled research, hardening/axe, deletion/export jobs.
- Raw Source A/B hash verification (`hash_verified: false` on every record until the raw sources arrive).
- Demo playback rate has no UI (97/3); e2e sets `apohenia.v1.dial.prefs.playback_rate = 8` via localStorage.
