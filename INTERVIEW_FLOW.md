# INTERVIEW_FLOW — identity interview state machine, invalidation, profile, plan, privacy

Owner: M-interview. Code: `packages/domain/src/interview/index.ts` (pure), UI under
`apps/web/src/app/onboarding/identity`, `/profile`, `/today`. Seed catalogue: `docs/04-identity-interview.md`.

## 1. Objects

| Object | Where | Notes |
|---|---|---|
| `InterviewVersion` | `data/identity_interview.json` | 33 screens (30 base, 3 conditional), sorted by `order`. |
| `InterviewSession` | browser key `interview.session` | `answers` keyed by screen id, `current_screen_id` (a screen id or `__review__`), `status`. |
| `IdentityProfile` | browser key `interview.profile` | Only ever written by "Endorse". Carries `endorsed`, `endorsed_at`, sections with `answer_ids`, `unknowns`. |
| Day record | browser key `today.<yyyy-mm-dd>` | `{ done: {itemId: bool}, minimum_day: bool }`. |
| Routine | browser key `today.routine` | Editable list; `null` means "use the suggested routine". |
| Evidence journal | browser key `today.evidence` | `{ id, date, text, source: preset|free }[]`. |

Storage goes through `useStoredState` (zod-validated, namespaced `apohenia.v1.`). Nothing is read on the
server; pages render a "Reading saved answers…" status until hydrated.

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
                     reviewed  ── Edit (row) → goTo(screen) → in_progress-like editing (status stays reviewed)
                          │
                          ▼   /profile → Endorse
                     endorsed  (session.endorsed_at set; profile written with endorsed: true)
                          │
                          └── any applyAnswer afterwards → status back to in_progress, endorsed_at removed;
                              the stored profile's fingerprint no longer matches → "endorse again".
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

## 4. Selection rules (`toggleSelection`, `selectionProblem`)

- Substantive options: single screens replace; multi screens add up to `max_select`, then refuse (the
  UI shows "You have chosen N. Unselect one to choose another.").
- `uncertainty_option` and `none_option` are each exclusive: selecting one clears everything else;
  selecting a substantive option clears them. They are also exclusive with each other.
- `answered` with an empty selection is rejected ("Choose an option, or skip this question."); the UI
  disables Next until `selectionProblem` is null.
- Foreign option ids are rejected.

## 5. Visibility and conditions

`conditionHolds(condition, answers)` is true only when the trigger answer exists, has status
`answered`, is not invalidated, and includes any id in `any_of`. `visibleScreens` = all base screens +
conditional screens whose condition holds, in `order`. Skipped or not-sure triggers never unlock a
conditional. Declared conditions in v1:

| Conditional screen | Trigger | Unlocking options |
|---|---|---|
| `faith_practice_standard` | `faith_context` | `faith_reason`, `faith_people`, `faith_identity` |
| `repetition_block_length` | `learning_style` | `repetition_blocks` |
| `offer_least_control` | `offer_hypothesis` | `dealership_follow_through` |

## 6. Back-edit invalidation (`invalidateDependents`)

Runs whenever `applyAnswer` detects that a screen's answer actually changed (status or selection).
For each dependent (transitively):

1. Condition no longer holds → dependent answer becomes `{ status: not_applicable, selected: [], invalidated_by: <changed screen> }`.
2. Condition holds again after being not applicable → the stale answer is removed; the screen re-enters as remaining.
3. Condition still holds but the trigger changed → the existing answer keeps its status and gains
   `invalidated_by`; it is removed from completion until the person confirms or changes it (the screen
   shows "An earlier answer this question depends on changed. Confirm or change your answer.").

Re-answering a trigger with the *same* selection changes nothing. The UI shows a calm note on the next
screen naming the dependent answers that were reset. The review screen shows each such row as
"Needs re-answer" or "Not applicable".

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

## 8. Endorsement and training plan

- `endorseProfile(profile, now)` → `{ ...profile, endorsed: true, endorsed_at }`. The UI writes it to
  `interview.profile` and sets the session to `endorsed`.
- `buildTrainingPlan(profile)` returns `[]` for an unendorsed profile. For an endorsed one it maps each
  chosen standard option id (`std_*`, `faithstd_*`) through `STANDARD_TEMPLATES` to
  cue → exact action → frequency/duration → completion evidence → review → recovery rule, using
  `planSettings(profile)` (duration from `dur_*`, frequency from `freq_*`, cue from `cue_*`, recovery from
  `rec_*`; documented defaults otherwise).
- Today reads the endorsed profile only; the suggested routine (rehearse exact wording and one
  transition · one focused mock scenario · approved calling block [Not available in Increment 1 (no
  telephony)] · review two conversations [none yet] · change one behavior) is editable and per-day
  completion is evidence-based. Minimum-action day keeps progress. No streaks, no deductions.

## 9. Privacy boundary

- `exportForProspectContext(...)` is the only export whose name mentions prospects; it discards its
  arguments and always throws `InterviewPrivacyError`. There is no serializer in the module that accepts
  a prospect, call, scenario or transcript. Any attempt to feed answers into a prospect context fails at
  runtime and in tests (scenario 30).
- Export on /profile is scoped to `interview.*` keys; Delete removes only those keys (never the global
  `clearAllStored`). Today's routine and evidence entries are untouched by that delete.
- Framework §7: the interview never runs a closing sequence on the person; no option is a pressure line.

## 10. Test map

- Domain: `packages/domain/test/interview.test.ts` — 28 tests: seed counts (30/3/33), option limits and
  uniqueness, optional-lens wording, no shame/readiness language, condition gating, next/prev, max_select,
  exclusivity, empty/foreign selections, skip never counts as answered, separate statuses, completion,
  invalidation (not_applicable, needs re-answer, same-answer no-op, re-entry, direct call), profile ids and
  order, unknowns, no numeric scores, endorse, training plan example mapping, privacy guard.
- E2E: `tests/e2e/interview.spec.ts` — click-only completion with one skip, conditional unlock,
  back-edit (conditional disappears + note), review statuses, edit + resume, endorse, answer ids, scoped
  export, Today routine + persistence + minimum-action day + evidence; empty states; keyboard operation.
