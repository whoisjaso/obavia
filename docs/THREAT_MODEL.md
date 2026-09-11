# Threat model — initial (Increment 1)

Scope: the repository as it exists on 2026-09-11 — a static Next.js app over synthetic JSON seeds with
browser-local state and no network calls. This is an *initial* model; each later increment must extend it before
it merges. It lists what can go wrong now, what already prevents it, and what is deferred.

## 1. Assets

| Asset | Sensitivity | Where |
|---|---|---|
| Jason's identity-interview answers, profile, training plan, evidence | private, personal | `localStorage` `apohenia.v1.interview.*`, `today.*` (this browser only) |
| Own script word tracks, publication snapshots, offer statuses | business-confidential | `apohenia.v1.scripts.*`, `offers.status` |
| Source study package (207 records, excerpts) | licensed / private to this project | `data/source_*.json`, `docs/01`, `docs/02` — shipped in the build's server bundle, rendered on `/sources` |
| Synthetic prospects and transcripts | none (fictional) | `data/synthetic_*.json` |
| Dial history, suppression list, corrections | would be sensitive if real; synthetic today | `apohenia.v1.dial.*`, `calls.corrections.*` |
| Credentials | **none exist** | `.env.example` is comments only |

## 2. Trust boundaries

1. **Seeds → app**: JSON is parsed by zod loaders; invalid data fails the page rather than rendering partially.
2. **Stored state → app**: every read is schema-validated; invalid stored values fall back to the initial value
   and are left in place for inspection; writes that fail validation are refused (`storage.test.ts`).
3. **Source / transcript text → app**: text is data. No engine treats any string as an instruction; there is no
   model, tool surface or permission system for text to influence. This is a design invariant (brief §3, §21 #20,
   #42), not yet a tested negative case — see §5.
4. **Practice scenario hidden facts → coach**: `coachView` is typed and runtime-stripped of `hidden_fact_sheet`;
   `evaluatorView` is the only holder (`practice.test.ts`, `listener.test.ts` item 19).
5. **Interview → prospect context**: `exportForProspectContext` always throws `InterviewPrivacyError`.
6. **Browser → phone network / providers**: no path exists. `DialClient` builds only `{ mode: 'demo' }`;
   `liveGateReasons` refuses `mode: 'live'` without telephony + reviewed policy + sequential flag, and even then
   there is no provider client to call.

## 3. Threats considered now

| Threat | Likelihood today | Mitigation in place | Gap |
|---|---|---|---|
| Fabricated source material presented as real (invented timestamps, speakers, missing frames) | design risk | missing register rendered as ⊘; `no hh:mm:ss` test; `>>` turn markers kept without names; `hash_verified: false` shown | raw-source hash verification pending inputs |
| Study material recommended live (`study_only` leaking into a script or coach) | medium (authoring error) | `isLiveEligibleForCitation` adapt-only; `ownScriptCounterparts` warns; `scripts.test.ts` forbids study_only ids in primary citations | none for Increment 1 |
| A price or claim invented by the app | medium (template error) | `resolveSlots` gates offer slots on published status; `null` price → cue; fictional price never interpolated; listener offer guard rejects guarantees / discounts | model-generated text (Increment 4) will need the same guard at the output boundary |
| The app implying it can dial / is compliant | medium (UI drift) | `◐ Demo` pill with full name on every route (smoke test); no "compliant" badge; Import sheet says Increment 2 | keep asserting per screen |
| Personal answers reaching a prospect-facing surface | low | structural throw; no prospect-facing surface exists | re-check when profiles gain a server side |
| Psychological labelling of Jason or a prospect | medium (feature creep) | tests forbid scores / diagnoses / readiness language; tone `not assessed`; basketball = observed lens | keep as tests on every new lens |
| Prompt injection via transcript or source text | low now (no model) | text is data; no tool surface | add a negative test when a model is wired |
| Local data loss / exposure on a shared machine | medium | Settings lists, exports and deletes the namespace; nothing leaves the device | no encryption at rest; `localStorage` is readable by any script on the origin — acceptable only for synthetic data |
| Supply chain (dependencies) | medium | lockfile committed; pinned Next / React / TS / zod / vitest / Playwright; `npm ci` works; no runtime font or CDN fetch | no automated audit in CI; no CI |
| Secrets committed | low | `.gitignore` excludes `.env*` except `.env.example`, which holds no values | pre-commit secret scan not configured |
| Source package leaking through the public build | **real** if deployed | the source records are in the server bundle and rendered on `/sources`; the archive is "private to this project" | **do not deploy publicly**; any deployment needs authentication first (Increment 2) |

## 4. Out of scope until the named increment (must be modelled before merge)

| Increment | Threats to model then |
|---|---|
| 2 | tenant isolation (RLS on every table, storage links, realtime, search, exports); real-data mode never falling back to `localStorage`; deletion and export honouring scope and dependents; negative tenant tests |
| 3 | duplicate dial intents (two clicks, two tabs, lost response, retry) → at most one provider call; webhook signature validation; active-call lease; caller-ID rules; jurisdiction / timezone blocking; suppression checked immediately before every dial; inbound caller-ID not proving identity |
| 4 | consent unknown / denied → zero provider requests; consent withdrawal → stop + discard + stale suppression; provider stop failure → visible failsafe; leg mapping; out-of-order and duplicate events; model output rejected without transcript evidence; injection through transcript into the coach |
| 5 | long-lived keys off the client; per-session budget, duration and tool limits server-side; hidden-persona isolation over audio; practice sessions unable to invoke telephony |
| 6 | SSRF-safe fetcher (private-network redirect blocked); bounded scheduling; permissioned adapters that explain rather than fabricate; durable suppression across imports |
| 7 | outage simulations, spend stops, restore exercise, axe, security negatives, release checklist |

## 5. Authorization process for anything beyond demo

No agent or contributor may, without an explicit written instruction from the owner recorded in the session:
acquire or store credentials, purchase a number or service, place or receive a call, send a message, deploy, or
retrieve a different transcript to substitute for the supplied Source A/B. Live tests are separately authorized,
consenting, allowlisted events (brief §20 Increment 3). Until then the honest state is the one in
`IMPLEMENTATION_STATUS.md`.
