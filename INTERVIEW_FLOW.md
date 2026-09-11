# INTERVIEW_FLOW — identity interview state machine, invalidation, profile, plan, Today, privacy

Owner: M-me (formerly M-interview). Code: `packages/domain/src/interview/index.ts` (pure), UI under
`apps/web/src/app/onboarding/identity`, `/profile`, `/today` (plus `/settings`, `/insights` on the Me tab).
Seed catalogue: `docs/04-identity-interview.md`. Visual system: `docs/DESIGN_SYSTEM.md` §3.6 (Arena v2).

## 1. Objects

| Object | Where | Notes |
|---|---|---|
| `InterviewVersion` | `data/identity_interview.json` | 33 screens (30 base, 3 conditional), sorted by `order`. `faith_context` is multi-select (max 3). |
| `InterviewSession` | browser key `interview.session` | `answers` keyed by screen id, `current_screen_id` (a screen id or `__review__`), `status`. |
| `IdentityProfile` | browser key `interview.profile` | Only ever written by "Endorse". Carries `endorsed`, `endorsed_at`, sections with `answer_ids`, `unknowns`. |
| Day record | browser key `today.<yyyy-mm-dd>` (**local** date) | `{ done: { rehearse\|mock\|review\|minimum: bool }, minimum_day: bool }`. |
| Today prefs | browser key `today.prefs` | `{ duration_minutes: number \| null }` — a duration chosen on Today when the interview left it open. `null` = not chosen, never a default. |
| Evidence journal | browser key `today.evidence` | `{ id, date (local day key), text, source: preset\|free }[]`. |
| Practice attempts | browser key `practice.attempts` (owned by Train) | Read-only on Today/Insights: a drill logged today fills the Rehearse (non-mock) or Mock ring automatically. |

Storage goes through `useStoredState` (zod-validated, namespaced `apohenia.v1.`). Nothing is read on the
server; screens render their TopBar and an sr-only "Reading…" status until hydrated. The old `today.routine`
key (v1 editable routine) is no longer read; Settings' export/delete still covers it.

## 2. Session state machine

```
                 createSession(version)
                          │
                          ▼
   ┌─────────────── in_progress ───────────────┐
   │   current_screen_id = a visible screen     │
   │                                            │
   │  Next (valid selection) → applyAnswer(answered) → invalidateDependents → goTo(nextScreenId)
   │  Skip                   → applyAnswer(skipped)  → invalidateDependents → goTo(nextScreenId)
   │  Back                   → goTo(prevScreenId)   (no write to answers)
   │  Go to review / last Next → goTo(__review__)   → status: reviewed
   └────────────────────────────────────────────┘
                          │
                          ▼
                     reviewed  ── Edit (chip on a review card) → goTo(screen) → editing (status stays reviewed)
                          │
                          ▼   /profile → Endorse (hero tile)
                     endorsed  (session.endorsed_at set; profile written with endorsed: true)
                          │
                          └── any applyAnswer afterwards → status back to in_progress, endorsed_at removed;
                              isProfileCurrent() becomes false → /profile shows ↺ Stale, /today shows its
                              empty state ("No plan yet" + Interview / Endorse tiles) until endorsed again.
                              Start over (review → Start over → confirm tile) creates a fresh session: same effect.
```

The pointer is resolved defensively on render: if `current_screen_id` names a screen that is no longer
visible (its condition stopped holding), the UI shows the first remaining visible screen instead.

## 3. Answer statuses

| Persisted `status` | Set by | Counted as |
|---|---|---|
| `answered` | Next with a valid selection | answered — unless `invalidated_by` is set (then **needs re-answer**, counted as remaining) |
| `skipped` | Skip | skipped (never answered) |
| `not_applicable` | `invalidateDependents` when a conditional's condition stops holding | not visible; counted in `not_applicable` |
| (absent) | never touched, or re-entered after `not_applicable` | remaining |

`displayStatus(session, screenId)` → `answered | skipped | not_applicable | needs_reanswer | unanswered`.
`progress()` → `{ answered, skipped, not_applicable, remaining, total_visible }` over visible screens;
`not_applicable` counts conditional screens whose condition does not hold. `isComplete` ⇔ `remaining === 0`.

On the stage these are glyph chips: `✓ Answered` · `→ Skipped` · `⊘ N/A` · `↺ Re-check` · `○ Open`, each
with the full `DISPLAY_STATUS_LABEL` as its accessible name.

## 4. Selection rules (`toggleSelection`, `selectionProblem`)

- Substantive options: single screens replace; multi screens add up to `max_select`, then refuse (the
  UI shows a `◫ Max N` chip whose name is "You have chosen N. Unselect one to choose another.").
- `uncertainty_option` and `none_option` are each exclusive: selecting one clears everything else;
  selecting a substantive option clears them. They are also exclusive with each other. They render as a
  quieter two-tile row under the substantive tiles.
- `answered` with an empty selection is rejected ("Choose an option, or skip this question."); the UI
  disables Next and shows the reason **visibly** (`◌ Pick one`) with the full sentence as sr-only text
  that Next references through `aria-describedby` (review finding A-6 — never a tooltip alone).
- Foreign option ids are rejected.

## 5. Visibility and conditions

`conditionHolds(condition, answers)` is true only when the trigger answer exists, has status
`answered`, is not invalidated, and includes any id in `any_of`. `visibleScreens` = all base screens +
conditional screens whose condition holds, in `order`. Skipped or not-sure triggers never unlock a
conditional. Declared conditions in v1:

| Conditional screen | Trigger | Unlocking options |
|---|---|---|
| `faith_practice_standard` | `faith_context` (multi, max 3) | any of `faith_reason`, `faith_people`, `faith_identity` |
| `repetition_block_length` | `learning_style` | `repetition_blocks` |
| `offer_least_control` | `offer_hypothesis` | `dealership_follow_through` |

A conditional screen shows a `↳ Follow-up` chip; a trigger with an answered dependent shows `⇢ Has follow-up`
("Changing this answer resets the answer that depends on it…").

## 6. Back-edit invalidation (`invalidateDependents`)

Runs whenever `applyAnswer` detects that a screen's answer actually changed (status or selection).
For each dependent (transitively):

1. Condition no longer holds → dependent answer becomes `{ status: not_applicable, selected: [], invalidated_by: <changed screen> }`.
2. Condition holds again after being not applicable → the stale answer is removed; the screen re-enters as remaining.
3. Condition still holds but the trigger changed → the existing answer keeps its status and gains
   `invalidated_by`; it is removed from completion until the person confirms or changes it (the screen
   shows a `↺ Re-check` chip: "An earlier answer this question depends on changed. Confirm or change your answer.").

Re-answering a trigger with the *same* selection changes nothing. The UI shows a calm orange note card on the
next screen (`↺ Reset · <summary label>`, full sentence sr-only, `role="status"`). The review list shows each
such card as `↺ Re-check` or `⊘ N/A`.

## 7. Profile mapping (`buildProfile`)

For each `profile_field` (fixed order, see `PROFILE_SECTIONS`) over the *visible* screens:

- `answered` → `answer_ids += [screen.id, ...selected_option_ids]`; summary sentence
  `"<summary_label>: <label 1>; <label 2>; and <label 3>."`.
- uncertainty chosen → `"<summary_label>: not settled yet."` + an unknown.
- none chosen → `"<summary_label>: none of the listed options."` + an unknown (except on the unknowns screen).
- `skipped` / `needs_reanswer` / unanswered → a sentence saying so + an unknown.
- The `unknowns` screen's chosen labels are appended to `unknowns` verbatim.

The profile has `endorsed: false`, no numeric fields in sections, no scores, percentages, readiness or
diagnoses (tested). `profileFingerprint` (sections + unknowns + version + session id) is compared with
the stored endorsed profile to detect "answers changed since endorsement".

`isProfileCurrent(profile, version, session)` — the single check both `/profile` and `/today` use: endorsed
AND same session id AND identical fingerprint. Anything else (back-edit, Start over, deleted session) is
"not current": Profile shows `↺ Stale` or `◌ Draft`; Today shows its empty state (review finding A-1).

`selectedOptions(profile, version, screenId)` / `selectedOption` read a screen's chosen options back from
`answer_ids` only (uncertainty/none/skip ⇒ none). Today uses them for the next drill (`next_drill`), the
primary statement (`identity_primary`) and the difficult-day minimum (`difficult_day_minimum`) — never the
first plan item (review finding A-3).

On `/profile` each section is one card with its summary and mono answer-id chips; the `unknowns` section
renders the `unknowns` list as chips instead of its summary, so "Explicit unknowns" is one heading, not
two (review finding A-10). The plan and the scoped export/delete live in sheets.

## 8. Endorsement and training plan

- `endorseProfile(profile, now)` → `{ ...profile, endorsed: true, endorsed_at }`. The UI writes it to
  `interview.profile` and sets the session to `endorsed`.
- `planSettings(profile, { duration_minutes? })` → `{ duration_minutes: number | null, duration_source:
  'interview' | 'chosen_later' | 'not_chosen', frequency, frequency_chosen, cue, cue_chosen, recovery_rule }`.
  The interview answer (`dur_*`) always wins; a later choice (Today's tile row, stored in `today.prefs`) fills
  the gap only when the interview left it open; otherwise the duration is `null`. There is **no default
  duration** — `TrainingPlanItem.duration_minutes` is nullable and the UI shows `—` with the accessible
  name "Duration not chosen" (review finding A-2).
- `buildTrainingPlan(profile, options)` returns `[]` for an unendorsed profile. For an endorsed one it maps each
  chosen standard option id (`std_*`, `faithstd_*`) through `STANDARD_TEMPLATES` to
  cue → exact action → frequency/duration → completion evidence → review → recovery rule.

## 9. Today (Me tab)

- Reads the endorsed profile only while `isProfileCurrent` holds; otherwise `∅ No plan yet` with an
  Interview tile (and an Endorse tile when a session exists).
- The day key is the **browser's local date** (`localDayKey`), computed after hydration via
  `useSyncExternalStore`; the server's UTC date is only the pre-hydration fallback (review finding A-5).
- Three rings — Rehearse · Mock · Review — are completion evidence: a drill logged in Train today fills
  Rehearse (non-mock) or Mock automatically; any ring can be marked by tapping (`aria-pressed`). An
  auto-filled ring cannot be unmarked (toast "Logged in Train"). No streaks, nothing deducted.
- `min` chip = minimum-action day: the rings collapse into one "Minimum" ring plus the chosen minimum's
  label; marking it keeps progress.
- Next drill card (→ `/practice`): chosen drill label, primary statement, `⏱ N min` or `— not chosen`,
  frequency and cue chips. When the interview left the duration open, a `⏱ min · 10 15 20 30 45` chip row
  asks for it (stored in `today.prefs`, read by the plan on `/profile` too).
- Evidence card: preset chips (≤3 words; the logged line is the full sentence) plus "Own" (free text in the
  journal sheet). The card's count is today's lines; the journal sheet lists Today and Earlier separately so
  the count and the list always agree (review finding A-4).
- Insights (`/insights`) shows practice rings with `n/N` denominators from local drills, `—/—` for every
  funnel stage (nothing counted until real calls), and "Kept days n/N" from `today.*` records.

## 10. Privacy boundary

- `exportForProspectContext(...)` is the only export whose name mentions prospects; it discards its
  arguments and always throws `InterviewPrivacyError`. There is no serializer in the module that accepts
  a prospect, call, scenario or transcript. Any attempt to feed answers into a prospect context fails at
  runtime and in tests (scenario 30).
- Export on /profile is scoped to `interview.*` keys; Delete removes only those keys (never the global
  `clearAllStored`). Today's day records, prefs and evidence entries are untouched by that delete.
- Framework §7: the interview never runs a closing sequence on the person; no option is a pressure line;
  no option description pronounces a verdict on the person (review finding A-9, tested).

## 11. Test map

- Domain: `packages/domain/test/interview.test.ts` — 33 tests: seed counts (30/3/33), option limits and
  uniqueness, optional-lens wording, faith multi-select + `big_vocab` present, neutral descriptions, no
  shame/readiness language, condition gating, next/prev, max_select, exclusivity, empty/foreign selections,
  skip never counts as answered, separate statuses, completion, invalidation (not_applicable, needs
  re-answer, same-answer no-op, re-entry, direct call), profile ids and order, unknowns, no numeric scores,
  endorse, training plan example mapping, nullable duration + later choice precedence, `isProfileCurrent`,
  `selectedOptions`, privacy guard.
- E2E: `tests/e2e/interview.spec.ts` — 5 tests: click-only completion with one skip, conditional unlock,
  back-edit (conditional disappears + note), visible disabled-Next reason, faith multi-select, `big_vocab`
  offered, review cards + statuses, edit + resume, endorse, answer ids, one unknowns heading, plan sheet,
  scoped export, Today rings + local day + minimum-action day + evidence count/list agreement, stale
  profile → Today empty, Start over → Today empty; unchosen duration `—` + Today tile row → plan; empty
  states; keyboard operation; Settings segmented control + export/delete and Insights rings/rubric sheet
  (no table on any Me screen).
