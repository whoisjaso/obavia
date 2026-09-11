# Implementation status — Apohenia Sales OS

State of branch `claude/admiring-cray-v05pza` on 2026-09-11, after the Arena v2 (Design System v2)
integration pass, visual-critic fix rounds 1–2, integration rounds 2–3 and a third visual-critic review
(verdict *fix*, score 7/10 — its open findings are listed under **Remaining risks**).

Every line below was written from the code and the tests as they exist, not from intent. The five
categories are the ones the brief §22 and `CLAUDE.md` require:

| Category | Meaning here |
|---|---|
| **Verified by automated tests** | a named vitest or Playwright test asserts it and passed in the last full run |
| **Manually inspected** | seen in a screenshot or in the code; no test asserts it |
| **Integration built but live test pending** | provider code exists but has never talked to the provider |
| **Intentionally disabled pending permission / credentials** | deliberately not wired; the UI says so |
| **Not implemented** | nothing in the repo does it |

The increment being delivered is **Increment 1** (brief §20): a no-credential core over synthetic data. The
in-browser dialer session is a **demo simulator**; live sequential dialing is *intentionally disabled pending
telephony, reviewed policy and the sequential-session flag*.

---

## 1. Gates — exact commands and real results (integration round 3, one run each, in this order)

Pre-flight: `git checkout -- apps/web/next-env.d.ts`, stray `next dev` processes killed.

| # | Command | Result |
|---|---|---|
| 1 | `npm run seed:validate` | 207 records, 0 length mismatches, 0 errors; parser outputs byte-identical (working tree unchanged after the rerun) |
| 2 | `npm run typecheck` | clean — `tsc --noEmit` for `packages/domain`, `apps/web`, `tests` |
| 3 | `npm run lint` | clean — `eslint . --max-warnings 0`, no output |
| 4 | `npm test` | vitest: 13 files, **264 passed, 2 todo**, 0 failed |
| 5 | `npm run build` | Next 16 (Turbopack): 246 static pages; `/scripts` and `/today` dynamic |
| 6 | `npm run e2e` | Playwright (Chromium, production server): **88 passed, 0 failed, 0 skipped**, 1.9 min, single run; `tests/e2e/dial.spec.ts:140` (desktop full loop) passed |
| 7 | `tests/e2e/screenshots.spec.ts` (inside gate 6) | 28 PNGs regenerated into `docs/screenshots/v2/` and each one inspected |

`npm run verify:offsets` (`node scripts/verify-source-offsets.mjs`) exits 0 with *raw sources not supplied —
verification pending* because `sources/source_a.txt` / `sources/source_b.txt` are not in the repo. No
accessibility scanner (axe) has been run. No Docker build exists. Nothing has been deployed.

Unit-test file inventory (13): `packages/domain/test/{dialer,interview,listener,offers,practice,queue-history,
schemas,scripts,sources-library,sources,vocabulary}.test.ts`, `apps/web/src/lib/{line-parts,storage}.test.ts`.
E2E spec inventory (9): `tests/e2e/{calls,dial,interview,offers,practice,screenshots,scripts,smoke,sources}.spec.ts`.

---

## 2. Requirement areas → files, tests, observed outcome, status

### 2.1 Brief §3 — Package authority and source model

| Requirement | Files | Tests (file → name) | Observed | Status |
|---|---|---|---|---|
| 207 curated records parsed losslessly; excerpt lengths match claimed offsets; code-point offset convention recorded | `scripts/parse-question-bank.mjs`, `data/source_question_records.json`, `data/source_sections.json`, `data/source_package_validation.json`, `packages/domain/src/schemas/sources.ts` | `sources.test.ts` → *parses all 207 records strictly*, *parses all 39 sections (26 with records + 13 named-only)*, *package validation report matches the loaded data*; `seed:validate` gate | 207 / 0 errors; 39 sections (brief says 41; remainder not invented) | Verified by automated tests |
| Raw Source A/B immutable, hashed, offsets verified | `scripts/verify-source-offsets.mjs`, `data/source_missing_resources.json` | `sources-library.test.ts` → *named-but-missing register…*, *contains the raw sources, the four-frame fear set and the other named gaps* | Raw transcripts **not supplied**; every record `hash_verified: false`; verifier exits 0 "pending" | Intentionally pending (inputs missing) — never fabricated |
| Four representations per question, never collapsed | `schemas/sources.ts` (excerpt + offsets + template), `schemas/scripts.ts` (`primary_word_track`, own word track), `scripts/index.ts` (`publishVersion`), `SOURCE_COVERAGE.md` §5 | `scripts.test.ts` → *own-word edit never touches primary_word_track*, *publishVersion yields a stable 64-hex hash…*; `sources.spec.ts` → *D01 (study_only) carries the ⊘ Source-only glyph, offsets and the verification-pending glyph*, `[data-template-label]` "normalized template — not verbatim" (line 177) | Own lines link to records by id; never shown as quotes | Verified by automated tests |
| `adapt` ≠ live approval; `study_only` never live-recommended; `private_training` reflection only | `packages/domain/src/sources/{index,pure}.ts` (`isLiveEligibleForCitation`, `ownScriptCounterparts`), `apps/web/src/app/sources/**` | `sources-library.test.ts` → *isLiveEligibleForCitation is true only for adapt*, *maps record id → citing nodes, flags a non-practice node that cites a non-adapt record…*; `scripts.test.ts` → *cites only real records and never a study_only id in a primary citation list*; `sources.spec.ts` → *study_only chip filters to 33 across both sources with the ⊘ glyph…* | 160 adapt · 33 study_only · 14 private_training | Verified by automated tests |
| A/B kept separate; no invented timestamps / diarization / four-frame set | `data/source_missing_resources.json`, `apps/web/src/app/sources/SourcesClient.tsx` | `sources-library.test.ts` → *no record template or excerpt contains an hh:mm:ss or mm:ss pattern*; `sources.spec.ts` → *Source A and Source B are two chips and two lists, never merged…*, *the missing register is a sheet of ⊘ cards; the four-frame entry states exactly what is supplied (B-7)* | 11 missing-register entries rendered as ⊘ | Verified by automated tests |
| 1,449-occurrence punctuation audit | — | — | Counts only (527 A / 922 B) are known; rows not supplied; never shown as questions | Not supplied (marked missing) |

### 2.2 Brief §4 — Identity interview

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| 30 base + 3 conditional screens, click-only, one question per screen, large answer cards, limits stated, skip / uncertainty / none mutually exclusive | `data/identity_interview.json` (authored here), `packages/domain/src/interview/index.ts`, `apps/web/src/app/onboarding/identity/**` | `interview.test.ts` → *has exactly 30 base screens and 3 conditional screens (33 total)*, *every screen has 3–7 options, allows skip, has an uncertainty option, and multi screens state their limit*, *uncertainty clears substantive options and vice versa…*, *enforces max_select…*; `interview.spec.ts` → *completes with clicks only, handles skip, conditionals and back-edits, endorses, and feeds Today*, *options are keyboard operable: arrows move focus, Space toggles* | Whole flow completes with clicks only | Verified by automated tests |
| Conditional screens from declared conditions; back-edits invalidate dependents; `skipped` / `answered` / `not_applicable` persisted separately | same | `interview.test.ts` → *gates each conditional screen on its declared condition holding on an ANSWERED answer*, *marks a dependent not_applicable with invalidated_by…*, *persists answered, skipped and not_applicable separately…*, *is complete only when every visible screen is answered or skipped* | | Verified by automated tests |
| Reviewable profile with answer ids; endorsement before use; no shame / readiness / diagnosis; training plan cue→action→…→recovery | `interview/index.ts` (`buildProfile`, `endorseProfile`, `buildTrainingPlan`, `isProfileCurrent`), `apps/web/src/app/{profile,today}/**` | `interview.test.ts` → *never emits scores, percentages or diagnoses*, *uses no shame or readiness language*, *builds a training plan only from an endorsed profile…*, *an unchosen practice duration is null, never a default number…* | | Verified by automated tests |
| Private answers never enter prospect context | `interview/index.ts` (`exportForProspectContext`) | `interview.test.ts` → *exportForProspectContext is structurally blocked* | The function always throws `InterviewPrivacyError` | Verified by automated tests (structural; no prospect context exists yet to leak into) |
| Save / resume / review; scoped export / delete | `apps/web/src/lib/storage.ts` (`interview.session`, `interview.profile`), `apps/web/src/app/settings/SettingsClient.tsx` | `storage.test.ts` → *namespaces, validates, lists, exports and clears*; `interview.spec.ts` → *…endorses, and feeds Today* | Export = JSON of the `apohenia.v1.*` namespace; delete = whole namespace | Verified (local, whole-namespace); *per-scope* delete Not implemented |
| Optional voice reflection | — | — | | Not implemented (later enhancement by the brief's own wording) |

### 2.3 Brief §5 — Offer Studio and original scripts

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Offer version fields; blank price `null`; draft/reviewed/published/retired | `data/offers.json`, `packages/domain/src/schemas/offers.ts`, `packages/domain/src/offers/index.ts`, `apps/web/src/app/offers/**` | `schemas.test.ts` → *accepts null prices and requires exactly three pillars*; `offers.test.ts` → *formatMoney(null) is "Not set" — never $0*, *allows only draft→reviewed→published→retired*; `offers.spec.ts` → *default list is "Offers": the draft research offer with a — price…*, *status moves draft → reviewed → published through a confirm sheet, then is read-only, persists, and /scripts reads it (B-12)* | Draft research offer price is `null` and renders `—` | Verified by automated tests |
| Fictional pilot (USD 750 + USD 150) practice-only, always bannered, never in live Offer Studio | same | `offers.test.ts` → *fictional pilot carries the banner, the practice flag and the fixture price*, *fictional / practice-only offers are excluded from liveOffers structurally*; `offers.spec.ts` → *the fictional fixture appears only under Practice, with ✦ Fictional, its banner and no status controls* | | Verified by automated tests |
| Dealership script = original draft; live rendering interpolates only confirmed facts / approved attributes, else a cue | `data/apohenia_script_nodes.json` (51 nodes, one draft version), `packages/domain/src/scripts/index.ts` (`resolveSlots`), `apps/web/src/lib/line-parts.ts` | `scripts.test.ts` → *draft offer with null price renders the cue and no digits in say_this*, *B-2: a draft offer's pillar wording is NOT spoken…*, *B-3: known facts named like offer slots never bypass the offer-approval gate*; `line-parts.test.ts` → *never leaves a bracket, brace or angle token visible for any seed line…* | Slots render as `‹name›` chips with accessible names | Verified by automated tests |
| Evidence-satisfied nodes offer a transition; refusal accepted | `scripts/index.ts` | `scripts.test.ts` → *offers a transition instead of asking twice when the fact is known*, *declined is an accepted branch on the decision-history and price nodes* | | Verified by automated tests |
| Owner review before live use | `SCRIPT_APPROVALS.md`, `approval.status` on every node | `scripts.test.ts` → *B-5: publishing freezes wording only — 51 draft nodes stay draft and the snapshot is a "frozen draft"* | All 51 nodes are `draft`; nothing is approved | Verified by automated tests (state), and no live mode exists to approve into |

### 2.4 Brief §6 — Script engine

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Five training modes, default full script, reversible | `packages/domain/src/practice/modes.ts`, `scripts/index.ts` (`maskForMode`), `apps/web/src/app/practice/ModeControl.tsx`, key `settings.assistance_mode` | `scripts.test.ts` → *full_script shows everything by default*, *recall_with_reveal hides the line until revealed*, *primary_plus_mirror, stage_purpose_cue and unassisted mask as documented*; `practice.spec.ts` → *assistance mode is reversible…* | | Verified by automated tests |
| Node shape (id, version, stage/substage, roles, primary track, source ids, answer type, examples, known facts, mirrors, bridge, overlay, completion, branches, stop/skip, approval) | `schemas/scripts.ts`, `data/apohenia_script_nodes.json` | `scripts.test.ts` → *every node fills every field meaningfully (2+ examples, 2+ mirrors, bridge, overlay, branches)*, *validateGraph is ok against the 207 records* | | Verified by automated tests |
| Primary wording stable within a version; mirror never overwrites; publish = immutable hash | `scripts/index.ts` (`publishVersion`, `verifyPublication`), key `scripts.publications` | `scripts.test.ts` → *selecting a mirror does not overwrite the primary line*, *a published version rejects primary edits; a draft accepts them*, *publishVersion yields a stable 64-hex hash…*; `scripts.spec.ts` → *own words are stored separately and the primary line stays locked (scenario 29)*, *publish asks first, then stores an immutable "frozen draft" snapshot with its hash (B-5)* | | Verified by automated tests |
| Decision-tree additions (mixed, still-active provider, changed priorities, no problem, no authority/budget, unknown, declined); opt-out reaches stop from every node | `data/apohenia_script_nodes.json`, `scripts/index.ts` (`effectiveBranches`, `nextNodeForBranch`, `validateGraph`) | `scripts.test.ts` → *opt_out resolves to exit-stop from every one of the 51 nodes, explicit or implicit*, *Apohenia additions carry a source_note…*; `scripts.spec.ts` → *branch chips navigate the graph; opt-out reaches exit-stop… (B-1)* | | Verified by automated tests |
| No required emotional word (incl. "regret") | node `completion_criteria` | `scripts.test.ts` → *completion criteria contain no required feeling word* | | Verified by automated tests |
| Say this / Why this now / What to listen for / Mirror if unclear / Tone and pacing cue / Next likely branches | `apps/web/src/app/scripts/ScriptsClient.tsx` (sheet), `apps/web/src/app/InCall.tsx` (ⓘ sheet), `components/ui/LineCard.tsx` | `scripts.spec.ts` → *tap a line → sheet with the six parts; missing cues; sample facts fill slots…* | In-call: line is the hero, the other five parts sit behind ⓘ (collapsed during calls, as the brief allows) | Verified by automated tests |
| Model proposes node + slot values with evidence; override recorded | — | — | No model is wired; manual advance / previous / branch chips exist and the in-call state is stored (`dial.incall`) but no "override log" object exists | Not implemented (Increment 4) |

### 2.5 Brief §7 — THEIR WORDS strip and decision meaning

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Strip beside the script, 3–7 pins, 24–36 px desktop default, overflow scroll, no flashing, keyboard | `packages/domain/src/vocabulary/{pins,rank,extract,analyze}.ts`, `apps/web/src/app/InCall.tsx`, `components/ui/WordCard.tsx`, `--fs-their-words` | `vocabulary.test.ts` → *auto-fills at least three when available and refuses an eighth manual pin*, *a pinned item keeps its slot while new evidence arrives…*; `dial.spec.ts` → *full loop: … in-call (entry line, ≥3 words, ≥1 reference)…* asserts ≥24 px and no overlap with the line at 430×932 and 1440×900; `calls.spec.ts` → *call review replays the in-call layout read-only (entry line, ≥3 words at ≥24px, tone —)…* | Gold 40 px words on desktop | Verified by automated tests (1440×900, 430×932); **1280×800 not tested** |
| Per-phrase fields (text, speaker, span, confidence, meaning, status, first/last, repetition, emphasis, correction, role, pin, edits) | `schemas/vocabulary.ts` | `vocabulary.test.ts` → *is authored…, with the §12 fields on every event* | | Verified by automated tests |
| Corrections/negations outrank counts; interim never confirmed; provenance classes distinct | `vocabulary/{rank,provenance,review}.ts` | `vocabulary.test.ts` → *prioritizes PROFIT as the prospect's word*, *an interim turn cannot be confirmed; a final one can*, *is labelled confirmed shared term, never "prospect said"*, *classifies profit as seller_only…* | | Verified by automated tests |
| Revision invalidates dependent interpretation (profit → prophet) | `vocabulary/normalize.ts` (`applyRevision`) | `vocabulary.test.ts` → *applyRevision reports the superseded utterance and the profit → Prophet change*, *invalidates the provisional "profit" meaning and drops it from pins until clarified* | | Verified by automated tests |
| Basketball = observed analogy, not archetype; quoted-other / rejected terms never top-ranked | `vocabulary/rank.ts` | `vocabulary.test.ts` → *call E: basketball is a tentative lens, never an archetype*, *call F: revenue rejected, another owner's goal quoted, retention is the priority* | | Verified by automated tests |
| Six needs / alpha-beta / identity labels = separate study modules; no diagnosis, deception detection, emotion scores | family `D`/`T` records stay `study_only`/`private_training`; no such engine exists | `sources-library.test.ts` → facet counts; `practice.test.ts` → *is self-rated: tone_assessed false and no numeric tone anywhere* | | Verified by absence + tests |
| Rep corrections persist beside the original | `apps/web/src/app/calls/CallDetailClient.tsx`, key `calls.corrections.<call_id>` | `vocabulary.test.ts` → *refuses a seller or model synonym; keeps human corrections beside the original*; `calls.spec.ts` → *…four review cards and a persisted correction* | | Verified by automated tests |

### 2.6 Brief §8 — Screens (as re-shaped by Design System v2)

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Routes present; `/call-room` → `/` | `apps/web/src/lib/routes.ts` (`APP_ROUTES`), `apps/web/src/app/call-room/page.tsx` | `smoke.spec.ts` → *route … : 200, one visually hidden h1, tab bar (or exit on an immersive screen), one visible demo pill, no console errors* (13 routes), */call-room redirects to the front door* | | Verified by automated tests |
| In-call: large exact line centre, stage, bridge, controls; words strip beside; transcript secondary; call/transcription/recording/coach states independent | `apps/web/src/app/InCall.tsx`, `OutcomeSheet.tsx`, `dial-lib.ts` | `dial.spec.ts` full loop (line never moves or grows while words arrive; chips ≤4 + more; ↑ transcript sheet) | Transcription/recording/coach states are demo constants (nothing is live) shown as glyphs | Verified by automated tests (layout); state independence Manually inspected (no live states exist to switch) |
| Source Library: A/B, section index, search, excerpt + offsets, normalized wording, own-script counterpart, source-only flag, missing register, private | `apps/web/src/app/sources/**` | `sources.spec.ts` (9 tests) | | Verified by automated tests |
| Practice modes list (§8) | see §2.8 | | | see §2.8 |
| Pipeline lanes / reasons | `packages/domain/src/vocabulary/crm.ts`, `apps/web/src/app/pipeline/**` | `queue-history.test.ts` → *maps every disposition kind to a lane that exists, without inventing budget/authority/implementation*; `calls.spec.ts` → *lanes scroll horizontally; dispositions land in lanes…* | Lanes are a view; nothing schedules or sends messages | Verified by automated tests |

### 2.7 Brief §9 — CRM and sequential dialing

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Separate companies / locations / contacts / endpoints; shared switchboard; shared numbers | `data/synthetic_prospects.json` (8 companies, 9 locations, 9 endpoints, 10 contacts, all fictional), `schemas/dialer.ts`, `dialer/seed.ts`, `vocabulary/crm.ts` | `dialer.test.ts` → *parses, is fictional, keeps locations/contacts/endpoints separate, and validates every item*, *crm.ts reads the same seed (one source of truth)* | | Verified by automated tests |
| Manual entry / validated CSV import | `apps/web/src/app/prospects/ProspectsClient.tsx` (Import sheet) | `calls.spec.ts` → *cards with … search and Import sheets* | Import sheet explains what CSV import will require; **it does not import** | Not implemented (Increment 2); UI is an honest placeholder |
| Human-initiated preview dialing with cancellable countdown; checks re-run before every dial; wrap-up disposition required; pause on inbound / unresolved disposition / suppression | `packages/domain/src/dialer/{session,queue,simulator,stats}.ts`, `apps/web/src/app/DialClient.tsx` | `dialer.test.ts` → *starts in demo, arms the first allowed record, counts 3 → 2 → 1, then dials and rings*, *re-runs the checks at the end of the countdown…*, *connected → END_CALL → wrapup requires a disposition before the cooldown…*, *an inbound ring during an active call never drops the call…*, *an inbound ring while ringing cancels that dial…*; `dial.spec.ts` → *tap → countdown → Esc cancels (paused); Space resumes; tap again cancels*, full loop | **Demo simulator only**: the "call" is a synthetic transcript played on a schedule (`dialer/simulator.ts`); nothing is dialed | Verified by automated tests (simulator); live = Intentionally disabled |
| Sequential session mode behind an admin policy flag; automatic dialing disabled until campaign/jurisdiction review | `dialer/session.ts` (`liveGateReasons`: `telephony_configured` ∧ `policy_reviewed` ∧ `sequential_session_flag`) | `dialer.test.ts` → *a live session REFUSES to start unless telephony, reviewed policy and the sequential flag are all true*, *in live mode refuses without the gate and returns requires_review with it*, *with the live gate satisfied but every record requires_review, the checks skip each record and the session ends queue_empty — nothing is dialed* | `DialClient.tsx` only ever builds `{ mode: 'demo' }`; no UI path reaches `mode: 'live'` | **Intentionally disabled pending telephony, reviewed policy and the sequential-session flag** |
| Statuses attempted … do-not-call; connected ≠ qualified; "won" user-confirmed | `schemas/dialer.ts` (`DispositionKind`), `dialer/stats.ts` | `dialer.test.ts` → *counts dials, connects, conversations and next steps without inference*; `queue-history.test.ts` → *every glyph carries a full accessible name, and the outcome glyph never claims more than the label* | 9 disposition tiles; no "won" (needs a real outcome) | Verified by automated tests |
| Do-not-call durable suppression | key `dial.suppression`, `dialer/queue.ts` | `dialer.test.ts` → *do_not_call writes a suppression entry and that number is never dialed again in the session*; `dial.spec.ts` → *"Do not call" removes that number from later dials and a toast confirms it*, *a queue with nothing dialable shows ∅ and one tile to the queue* | Survives reload in this browser only | Verified by automated tests (browser-local); durable server-side suppression Not implemented (Increment 2/6) |
| Inbound calls routed to the browser; no recording of unknown inbound callers | reducer event `INBOUND_RING` only | `dialer.test.ts` (above) | No inbound path exists | Not implemented (Increment 3) |
| E.164 numbers, jurisdiction, verification timestamps | seed carries E.164 (`+1555…`), `timezone`, `jurisdiction: unknown`, `policy_status: requires_review` | `dialer.test.ts` → *marks demo items allow, live items requires_review, and the opt-out contact suppressed in both modes* | | Verified by automated tests |

### 2.8 Brief §13 — Practice Studio

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Typed practice without audio or paid APIs; five modes | `packages/domain/src/practice/**`, `apps/web/src/app/practice/**` | `practice.test.ts` → *maskForMode…*; `practice.spec.ts` → *grid at …: hidden h1, 5-glyph mode control, ten tiles with two rings…* | | Verified by automated tests |
| Drills: exact recall, order, random lookup, branch classification, mirror duel, vocabulary meaning, delivery replay, full mock, practice-this-moment | `practice/drills.ts` | `practice.test.ts` → *grades typed recall with separate ratios and records a reveal*, *order rehearsal shuffles deterministically…*, *random node lookup offers four primary lines…*, *insufficient examples require a mirror…*, *correct set is exactly the node mirror variants…*, *correct is "ask what it means" when unknown…*, *is self-rated: tone_assessed false…*, *walks entry → next by branch…*, *offers the node primary + mirrors and returns a comparison with the simulation disclaimer*; `practice.spec.ts` → *branches: …*, *exact recall …*, *full mock: …*, *practice this moment …* | 10 tiles on Train | Verified by automated tests |
| Ten fictional scenarios; hidden fact sheet isolated from the coach view; no-fit rewarded; never-converts not coerced | `practice/scenarios.ts`, `practice/mocks.ts`, `practice/scoring.ts` | `practice.test.ts` → *ships the ten fictional scenarios*, *coachView lacks hidden_fact_sheet (typed and at runtime); evaluatorView has it*, *rewards accurate disqualification and scores a pushed close on a never-converts scenario zero*; `listener.test.ts` §10 item 19 | | Verified by automated tests |
| Memorization vs conversation scores separate; assisted vs unassisted tracked separately | `practice/attempts.ts`, key `practice.attempts` | `practice.test.ts` → *summarizeAttempts keeps assisted and unassisted apart and memorization apart from conversation* | Two rings per tile | Verified by automated tests |
| Text-only never claims tone | `schemas/practice.ts` (`tone_assessed: false` literal) | `schemas.test.ts` → *keeps tone_assessed literally false for text-only attempts* | `—` glyph "not assessed" | Verified by automated tests |
| Voice roleplay (WebRTC + server-authorized Realtime), interrupt/pause/stop, generic voice | — | — | | Not implemented (Increment 5); no key, no route |
| Scripts stay untouched by every drill builder | `practice/drills.ts` | `practice.test.ts` → *running every drill builder leaves primary_word_track and every node deep-equal* | | Verified by automated tests |

### 2.9 Brief §14 — Coaching, measurement, identity evidence

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Post-call review: one strength with evidence, one correction, better question, one drill, next step, uncertainties | `packages/domain/src/vocabulary/review.ts` (`postCallReview`), `apps/web/src/app/calls/CallDetailClient.tsx` | `vocabulary.test.ts` → *every review has tone "not assessed (text-only)" and the §14 shape*, *a strength cites an evidence turn…* | Rule-based over synthetic transcripts | Verified by automated tests (rule-based; no model) |
| 100-point rubric labelled internal / not validated; automatic fails | `vocabulary/review.ts` (`rubricDefinition`) | `vocabulary.test.ts` → *rubric is labelled internal and not validated, sums to 100, with automatic fails* | Definition only; no call is scored against it | Verified by automated tests (definition) |
| Funnel metrics with numerator / denominator | `vocabulary/review.ts` (funnel stage definitions), `apps/web/src/app/insights/**` | `vocabulary.test.ts` → *funnel stages each state a numerator and a denominator*; `interview.spec.ts` → *settings and insights render as tiles, rings and sheets…* | Insights shows `∅` for calls (no real calls) and the nine stage definitions | Verified by automated tests (definitions); real metrics Not implemented |
| Identity dashboard from the endorsed profile; evidence entries; minimum-action days | `apps/web/src/app/today/**`, key `today.evidence`, `today.prefs` | `interview.spec.ts` → *…endorses, and feeds Today*, *an unchosen practice duration shows — and is asked on Today…* | | Verified by automated tests |
| Close outcomes separate from process; no automatic promotion; tone not assessed on transcript-only review | `dialer/stats.ts`, `vocabulary/review.ts` | as above; `calls.spec.ts` → *…tone —…* | | Verified by automated tests |

### 2.10 Addendum v3 — Personal Meaning Listener (THEIR REFERENCES)

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| First-mention eligibility; reference + relationship preserved; four kinds of information separate; origin never spontaneous by default; valence on its object; no biography | `packages/domain/src/listener/{extract,concepts,lexicon,cards,memory,retrieve,suggest,state}.ts`, `schemas/listener.ts` | `listener.test.ts` — see §4 below (items 1–20) | | Verified by automated tests (deterministic rule set) |
| THEIR REFERENCES coordinated with THEIR WORDS (one panel system), 3–7 cards at 24–36 px, collapsed/expanded, KEEP · USE · CLARIFY, pin/dismiss/correct/do-not-reuse, invalidation visible | `apps/web/src/app/InCall.tsx`, `dial-lib.ts`, `components/ui/RefCard.tsx` | `dial.spec.ts` full loop asserts ≥1 reference card at ≥24 px beside an unmoving line; the reference sheet has dismiss / clarify controls (`data-ref-dismiss`, `data-ref-clarify`) | KEEP is the default state of a card; USE NOW opens the suggestion overlay; CLARIFY opens the clarify overlay; a reference whose term is already a pinned word merges into that word card | Verified by automated tests (presence/size); the visual-critic still rates the merged-reference presentation a duplicate list (R3-03, open) |
| Delayed recall by concept; one primary suggestion; abstention; no repeat; stop after rejection; no resurrection | `listener/{retrieve,suggest,state}.ts` | items 3, 13, 15, 17 and *abstention and no-repeat policy* | | Verified by automated tests |
| Analogy never introduces an unapproved claim / guarantee / discount | `listener/suggest.ts` (offer guard) | item 18 | | Verified by automated tests |
| Conversation-scoped memory; saving to a profile is explicit | `listener/memory.ts`; no profile-save action exists | *the state carries a persistable memory; listenerFromMemory restores an identical state* | No "save to prospect profile" control exists | Verified (scope); profile save Not implemented |
| Same extractor for live and mock; coaching never sees hidden facts | `listener/index.ts` (`listenerFromTurns` = `applyTurn` path) | item 19; *applyTurn over every event reproduces listenerFromTurns…* | | Verified by automated tests |
| Live model / provider wiring | — | two `it.todo` in `listener.test.ts` | | Not implemented (Increments 2/4) |

### 2.11 Design System v2 ("Arena")

| Requirement | Files | Tests | Observed | Status |
|---|---|---|---|---|
| Dark stage, one hero, 97/3, tab bar (Dial · Train · Script · Me), no sidebar / table / paragraphs | `apps/web/src/app/layout.tsx`, `components/ui/**`, `styles/tokens.css`, `routes.ts` | `smoke.spec.ts` → *the front door is Dial: hero button, tab bar with four tabs, demo pill, no sidebar, no table*; `dial.spec.ts` → *idle: hero is the largest object, fewer than 15 visible words, next-up card, stats at zero*; every route spec asserts "no table / no paragraph" | 13–14 visible words on Dial idle | Verified by automated tests |
| Honesty glyphs with full accessible names (`◐ Demo`, `✦ Fictional`, `—`) | `components/ui/Pill.tsx`, `routes.ts` (`DEMO_PILL_NAME`) | `smoke.spec.ts` (one visible demo pill per route), `offers.spec.ts` (✦ Fictional + banner), `calls.spec.ts` (tone —) | | Verified by automated tests |
| Keyboard operability, visible focus, live regions, reduced motion, ≥4.5:1 | `globals.css` (reduced-motion kill switch), `HeroButton.tsx` / `DialClient.tsx` / `InCall.tsx` (`aria-live="polite"`) | `smoke.spec.ts` → *skip link is first in tab order and lands on main*; `interview.spec.ts` → *options are keyboard operable…*; `dial.spec.ts` → Esc / Space / tap | Reduced motion and contrast: Manually inspected only; no axe run, no screen-reader session | Verified (keyboard) · Manually inspected (motion, contrast, live regions) |
| In-call never re-flows the line; tab bar hides in-call and in the interview | `lib/immersive.ts`, `InCall.tsx` | `dial.spec.ts` full loop; `smoke.spec.ts` immersive check | | Verified by automated tests |
| Inter font shipped via `next/font` | `layout.tsx` | — | Same face on every OS/CI shot | Manually inspected |
| 28 reference screenshots at 430×932 and 1440×900 | `tests/e2e/screenshots.spec.ts` → `docs/screenshots/v2/*.png` | the spec itself (runs inside `npm run e2e`) | All 28 inspected one by one (list in §5) | Manually inspected |

---

## 3. Brief §21 mandatory scenarios (28 + 29–42) → tests and status

| # | Scenario (short) | Test(s) | Status |
|---|---|---|---|
| 1 | profit, not revenue; gross → net | `vocabulary.test.ts` → scenario 1 (4 tests); `listener.test.ts` item 7 | Verified |
| 2 | rep says profit, prospect emphasizes staff time | `vocabulary.test.ts` → scenario 2 (3 tests); `listener.test.ts` item 8 | Verified |
| 3 | later-stage info already given → not asked twice | `scripts.test.ts` → scenario 3 (3 tests); `scripts.spec.ts` (B-11) | Verified |
| 4 | coercive / false source claims flagged on import | `sources-library.test.ts` → *isLiveEligibleForCitation is true only for adapt*; classification comes from the curated bank | **Partial**: study_only material is kept out of live; there is no automated detector of coercive/false claims in the parser — Not implemented |
| 5 | no-fit earns a good review | `practice.test.ts` → *rewards accurate disqualification…*; `practice.spec.ts` → *full mock … no-fit is rewarded* | Verified |
| 6 | no approved price → no generated price | `scripts.test.ts` → scenarios 6 and 38 (5 tests); `offers.test.ts`; `scripts.spec.ts` price node test | Verified |
| 7 | quote absent from transcript → model output rejected | `listener.test.ts` → *validateProposal rejects fabricated quotes, wrong spans, wrong speaker and wrong revision* | Verified for the listener's proposal validator; the coach contract itself (Increment 4) Not implemented |
| 8 | double click / two tabs / lost response / retry → one provider call | — | Not implemented (Increment 3). The reducer allows one active call (`dialer.test.ts`), but there is no provider |
| 9 | parent/child leg mapping | — | Not implemented (Increment 3/4). Synthetic events carry `track` / `speaker_role`; monotonic per track is tested (`vocabulary.test.ts`) |
| 10 | consent unknown/denied → zero provider requests | — | Not implemented (Increment 4). Today **no** code path makes any network request (grep for `fetch(`, `WebSocket`, `getUserMedia` in `apps/web/src` and `packages/domain/src`: none) |
| 11 | consent withdrawn → stop, discard, stale output suppressed | `listener.test.ts` → `it.todo` | Not implemented (Increment 4) |
| 12 | provider stop fails → visible failsafe | — | Not implemented (Increment 4) |
| 13 | duplicate partial/final → no duplicate words | `vocabulary.test.ts` → *a duplicated partial/final callback does not duplicate words or counts*; `listener.test.ts` item 20 | Verified (fixture-driven) |
| 14 | out-of-order track events | `vocabulary.test.ts` → *out-of-order arrival never regresses order or double counts* | Verified (fixture-driven) |
| 15 | late model response after stage/revision change → discarded | `listener.test.ts` item 15, *a new final prospect turn drops the queued suggestion* | Verified for the rule-based suggestion slot; no model exists |
| 16 | AI/network failure → static script stays, no AI audio | — | By construction (no AI, no audio); not tested as an outage — Not implemented as a test |
| 17 | opt-out persists through reimport / other source / scheduling | `dial.spec.ts` → *"Do not call" removes that number from later dials…* (survives reload) | **Partial**: browser-local suppression only; CSV reimport and scheduling do not exist (Increments 2/6) |
| 18 | unknown jurisdiction / suppressed / disallowed → blocked or review | `dialer.test.ts` → *denies suppressed numbers in every mode*, *in live mode refuses without the gate and returns requires_review with it* | Verified in the reducer; no live path |
| 19 | research fetcher blocks private-network redirects | — | Not implemented (Increment 6) |
| 20 | prompt injection in transcript/page → no tool/permission change | — | Design only (source text is data; no model or tool surface exists). No negative test — Not implemented |
| 21 | tenant isolation | `listener.test.ts` → `it.todo` | Not implemented (Increment 2) |
| 22 | mock coach cannot see hidden facts; evaluator access explicit | `practice.test.ts` → *coachView lacks hidden_fact_sheet…*; `listener.test.ts` item 19; `practice.spec.ts` full mock | Verified |
| 23 | non-buyer not coerced or scored as failure | `practice.test.ts` → *rewards accurate disqualification and scores a pushed close on a never-converts scenario zero* | Verified |
| 24 | budget depleted → sessions stop | — | Not implemented (Increment 5); nothing spends |
| 25 | keyboard, focus, zoom, reduced motion, SR announcements | `smoke.spec.ts` skip link; `interview.spec.ts` keyboard; `dial.spec.ts` Esc/Space | **Partial**: keyboard verified; reduced motion / zoom / announcements manually inspected; no axe, no screen-reader run |
| 26 | inbound during wrap-up → queue pauses | `dialer.test.ts` → *an inbound ring during an active call never drops the call: the pause applies after the disposition* | Verified in the reducer with a simulated event; no real inbound |
| 27 | deletion/export honours scope, dependents, legal holds, provider status | `storage.test.ts` → *namespaces, validates, lists, exports and clears* | **Partial**: whole-namespace local export/delete only |
| 28 | demo runs from documented commands, no credentials, cannot contact real numbers | `npm run e2e` runs the production build with no `.env`; `dial.spec.ts`; no network code (see #10) | Verified |
| 29 | primary wording stable across sessions; mirror never overwrites | `scripts.test.ts` → scenario 29 (3 tests); `practice.test.ts` purity; `scripts.spec.ts` | Verified |
| 30 | interview click-only, revise/resume/review; private answers isolated | `interview.test.ts` (whole file); `interview.spec.ts` | Verified |
| 31 | taxonomy modules distinct; source-only never live | `sources-library.test.ts`; `sources.spec.ts` study_only test | Verified |
| 32 | "efficiency" confirmed ≠ prospect-originated | `vocabulary.test.ts` → scenario 32 | Verified |
| 33 | "gratification" keeps its definition | `vocabulary.test.ts` → scenario 33 (3 tests) | Verified |
| 34 | ASR question without punctuation → normalization label | `sources.spec.ts` line 177 (`normalized template, not verbatim`) | Verified |
| 35 | every excerpt matches hash/range; no timestamps without timing | `sources-library.test.ts` → *no record template or excerpt contains an hh:mm:ss or mm:ss pattern*; hash: `verify:offsets` pending | **Partial**: timestamps verified; hash match pending raw sources |
| 36 | ≥3 phrases pinned without overlap at 1440×900 and 1280×800 | `dial.spec.ts` full loop (1440×900 and 430×932) | **Partial**: 1280×800 is not a tested viewport |
| 37 | no budget / needs another owner → not relabelled as fear | `scripts.test.ts` → *declined is an accepted branch…*, *completion criteria contain no required feeling word*; no fear label exists in the node data | Verified (by absence + tests) |
| 38 | fictional 750/150 never populates live pricing | `scripts.test.ts` → *fictional offer price is never interpolated even though it is set*; `offers.test.ts`; `offers.spec.ts` | Verified |
| 39 | expansion shows old/new difference; unfulfilled promise → service repair | nodes `upsell-closer-compare`, `upsell-service-repair` exist in `data/apohenia_script_nodes.json` (graph closure tested) | Manually inspected (routing exists as draft content; no test walks this branch specifically) |
| 40 | caller asks to stop → stop immediately | `scripts.test.ts` → scenario 40 / B-1 (3 tests); `vocabulary.test.ts` → *call H: opt-out is detected and the outcome is do-not-call* | Verified |
| 41 | text-only practice emits no tone score | `schemas.test.ts`, `practice.test.ts` delivery replay, `calls.spec.ts` | Verified |
| 42 | imperatives in sources/pages stay untrusted | — | Design only; no test — Not implemented as a test |

## 4. Addendum v3 §10 acceptance items → `packages/domain/test/listener.test.ts`

Each item has a `describe('§10 item N — …')` block whose `it` names are listed in `docs/06-listener-implementation.md` §5. Items 1–19 pass. Item 20 passes for duplicate events, second mentions, dismissed-stays-dismissed and call boundaries; its tenant/consent/deletion and model-outage halves are `it.todo` (Increments 2/4) and are **not claimed**. Paraphrased and unseen-domain cases (gardening, chess, construction, "felt steamrolled", sailing, "by stickiness I mean") and abstention cases are covered by the *paraphrase and unseen-domain cases* and *abstention and no-repeat policy* blocks. The end-to-end demonstration (one occurrence → large card → intervening conversation → later suggestion → evidence) is exercised by `dial.spec.ts` full loop over synthetic fixtures — a **fixture-driven** demonstration, not a live-model one.

---

## 5. Screenshots inspected

`docs/screenshots/v2/` — 28 PNGs regenerated by `tests/e2e/screenshots.spec.ts` in the last e2e run, each opened and
checked: `dial-idle`, `dial-arming`, `in-call`, `outcome`, `train`, `script`, `me`, `interview`, `sources`,
`profile`, `insights`, `queue`, `history`, `followups`, each at `430x932` and `1440x900`. Findings: Dial idle
hero is the largest object with 13 visible words; arming shows the countdown 3 + CANCEL; in-call shows the entry
line at display size with PROFIT / NET / WHAT WE KEEP gold cards, red correction lines and purple REF chips, no
overlap; outcome sheet 3×3 tiles; Train tile grid with dual rings; Script rail + line cards + docked Publish; Me
rings/cards; Interview one-question tiles; Sources/Profile/Insights/Queue/History/Follow-ups cards only; tab bar
on every tab screen; legible at 430. Pixel differences between runs come only from the clock in the next-up card.

`docs/screenshots/v2/fix-round2/` (20) and `docs/screenshots/v2/critic-round{1,2,3}/` (round 3: 114 files,
gitignored review scratch) are one-off walkthrough shots used by the fix rounds and the visual critic.
`docs/screenshots/increment-1/` (17) shows the superseded v1 console UI and is kept as history only.

---

## 6. Increments 2–7 — Not implemented (what each needs)

| Increment | Needs before it can start | Nothing in the repo pretends otherwise because |
|---|---|---|
| 2 — Secure persistence and permission gates | Supabase project (local or hosted), migrations, private auth, RLS/storage/realtime policies, worker jobs, CRM CSV import with validation, contact-policy review records, durable suppression, budgets, immutable call events; negative tenant tests | `.env.example` keeps every key commented; `storage.ts` header states real-data mode must never fall back to it |
| 3 — One correct real human call and inbound callback | Twilio account + API key, TwiML app SID, a number the workspace may present, public callback URL, signature validation, active-call lease, idempotent call intents, a separately authorized, consenting, allowlisted live test | `liveGateReasons` refuses `mode: 'live'`; the UI never builds a live context |
| 4 — Consented transcript and grounded live coaching | consent transitions, native transcription start/stop, leg mapping, partial/final normalization against signed webhook fixtures, structured coach output with evidence validation, freeze/override, stale suppression, privacy failsafe, latency instrumentation | listener `it.todo`s; no coach contract file exists |
| 5 — Voice simulation, post-call improvement, metrics | OpenAI server key, server-authorized Realtime session, budget limits, hidden-persona isolation over audio, rubric scoring of real calls, funnel numerators from real records | Practice is typed and labelled "not a voice call"; Insights shows `∅` |
| 6 — Permissioned sources and controlled sequencing | approved-source registry, bounded scheduler, SSRF-safe fetcher, adapter fixtures, review queues, dedupe, durable suppression, then the gated single-line sequential session | no fetcher, no scheduler, no registry |
| 7 — Hardening and handoff | axe run, security negative tests, deletion/export jobs, outage simulations, spend checks, restore exercise, release checklist | not started; this document is the honest precursor |

---

## 7. Remaining risks

1. **Visual-critic round 3 findings are open** (verdict *fix*, 7/10): R3-01 Train → Branches drill first view has
   no answers above the fold and the answers are sentence rows, not tiles; R3-02 Train → Recall result card renders
   under the fixed NEXT hero (rings hidden on desktop); R3-03 THEIR REFS duplicates THEIR WORDS for corrected nouns,
   the `◆ REF ◉` badge is jargon, and the front-door demo loop never shows a true analogy reference (the Dana
   transcript has none); R3-04 the `◐ ack · ● their word · ? question` chips inside every LineCard are
   developer jargon on the one card that must be only the line; R3-05 (Script tab) was truncated in the report.
   None of these is a brief-rule violation; all are design-system polish and are not fixed in this state.
2. `tests/e2e/dial.spec.ts:140` (desktop full loop) failed once in an earlier fix round and passed in every run
   since; the cause is unexplained, so treat it as timing-sensitive, not fixed.
3. Raw Source A/B transcripts are absent: every excerpt is `hash_verified: false`; offsets are recorded as
   claimed. Anything that depends on exact spans (listener evidence, source citations) rests on the bank's
   own copy of the excerpt.
4. Brief §21 #36 names 1280×800; only 1440×900 and 430×932 are tested.
5. Accessibility floor beyond keyboard (contrast ≥4.5:1, reduced motion, live-region wording) is inspected, not
   scanned; no screen reader was used.
6. Demo playback rate has no UI; e2e sets `apohenia.v1.dial.prefs` (`playback_rate: 8`) through `localStorage`.
7. The domain branch-drill "category" items carry their question only in `item.prompt`; the phone THEIR WORDS
   strip clamps a word to two lines at 24 px (both unchanged from earlier reports).
8. All 51 script nodes and both offers are `draft`; nothing is approved for live use, and there is no live use.
9. Storage is browser-local (`apohenia.v1.*`); clearing site data deletes every interview answer, drill attempt
   and publication snapshot. Export exists (Settings) but is manual.

## 8. Smallest next authorized step

Fix the four concrete visual-critic findings (R3-01 … R3-04) inside the existing kit — drill answers as a 2×3
tile grid above the Check hero, the recall result as its own non-overlapping state, the reference lane hidden when
every reference is merged into a word card, the bridge chips removed from `LineCard` — and add one genuine analogy
reference (addendum §7 jazz case) to the Dana synthetic transcript so the front door demonstrates a `RefCard`.
Then rerun the six gates. That requires no credentials, no permission and no new dependency.

The smallest step that would let Jason *use* the app beyond demo is Increment 2 (Supabase persistence), which
needs a Supabase project and its keys — none are present, and none should be added without the authorization
process in `docs/THREAT_MODEL.md` §5.

## 9. What is NOT claimed

- No real phone number has been, or can be, dialed by this build. No carrier audio, telephony, transcription,
  recording, or model call has been exercised. No integration is "built but pending" — none exists.
- No legal or contact-policy clearance is implied by any glyph, status or lane. Nothing says "compliant".
- No test proves live-model inference quality; the listener and vocabulary engines are deterministic rule sets
  over synthetic fixtures. Replaying fixtures is not proof of inference capability.
- No accessibility audit tool has run; keyboard operability is the only automated a11y evidence.
- No performance, latency or load figure exists.
- The 1,449-occurrence audit, the raw transcripts, the upstream validation report and two of the brief's 41
  sections are not in the repo and were not reconstructed.
- Nothing has been deployed; `vercel.json` describes a build, not a deployment.
- A green build, 264 unit tests and 88 e2e tests over synthetic data do not mean sales results, verified carrier
  audio, legal clearance or reliable production operation.
