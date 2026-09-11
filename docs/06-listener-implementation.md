# Personal Meaning Listener — implementation notes (addendum v3)

**Status:** implemented as a pure-TypeScript domain module with deterministic fixtures. No model, no
network, no live transcript provider is wired in this increment; every claim below is backed by a named
test in `packages/domain/test/listener.test.ts`. Nothing here is an assertion about live-model quality.

**Module:** `packages/domain/src/listener/**` (owner: M-listener). Schema: `packages/domain/src/schemas/listener.ts`.
Fixtures: the `syn-l-*` calls appended to `data/synthetic_transcripts.json` (synthetic, fictional, labelled;
the original eight `syn-a…h` calls are untouched). Import path for the app: `@apohenia/domain/vocabulary`
re-exports the whole listener (the `./listener` subpath needs a `package.json` change — see "open items").

---

## 1. Design in one paragraph

Prospect turns are scanned sentence by sentence for a **distinctive expression together with its
relationship** — "like a hockey team **where nobody knows who is defending**", not "hockey". A first mention is
eligible immediately. The reference is stored with four separated kinds of information (observed evidence,
interpretation of this sentence, possible later use, confirmed personal meaning), an **origin** decided from
the preceding turns, and a **valence attached to its object** (the setback, not basketball). References are
tagged with **concept ids** derived from the relationship clause; a later turn is mapped to concepts by
topic words, so "robotic" retrieves the jazz-band comparison with no music word present. At most **one**
suggestion is produced at a time from a template grounded in the prospect's own word, gated by an offer
guard (no guarantees, promises, discounts or unapproved prices) and a metric guard (profit never becomes
revenue). Everything is rebuilt deterministically from a small persisted **memory** (raw provider events +
rep/UI action log + one-suggestion slot), which is what makes revisions, duplicates, late outputs and
replays safe.

```
provider events ─▶ normalizeTranscript (dedupe · revisions · display order)   [vocabulary pipeline, reused]
               ─▶ extractReferences   (rules below, prospect turns only)
               ─▶ applyRevisions      (phrase retracted → state: invalidated + reason + correction entry)
               ─▶ invalidateFailedEvidence (span must still read exactly in the current text)
               ─▶ applyListenerActions (pin/keep/dismiss/correct/use/reaction … replayed in order)
               ─▶ ListenerState { references, not_eligible, normalized, memory, context }
                    ├─ retrieveByConcept(state, turnText, stageId)  → Reference[]
                    ├─ suggestPrimary(state, { node })              → ReferenceSuggestion | null
                    └─ toCards(state)                                → ReferenceCard[]
```

---

## 2. Frozen public API (`packages/domain/src/listener/index.ts`)

Every function is pure and returns a new value. `ListenerState` is the only object the call room holds;
persist `state.memory` per call (`ListenerMemory` is a zod schema) and restore with `listenerFromMemory`.

| Export | Signature | Notes |
|---|---|---|
| `listenerFromTurns` | `(turns: readonly TranscriptTurn[], ctx?: ListenerOptions) → ListenerState` | The ONE path for live and mock. `ctx.window: 'partial'` ⇒ origin `unknown` when nothing precedes a turn. |
| `listenerFromMemory` | `(memory: ListenerMemory, ctx?: ListenerContext) → ListenerState` | Reload / replay. |
| `applyTurn` | `(state, turn: TranscriptTurn, ctx?) → ListenerState` | Incremental; equals a full rebuild (tested over every fixture). Duplicates change nothing; a new final prospect turn drops the queued suggestion. |
| `invalidateForRevision` | `(state, revisedTurn) → ListenerState` | Drops a queued suggestion built on that utterance, then `applyTurn`. |
| `retrieveByConcept` | `(state \| readonly Reference[], currentTurnText, stageId?) → Reference[]` | Concept match, whole conversation, reusable references only, best first. `rankByConcept` gives the scored form. |
| `suggestPrimary` | `(state, { node, current_turn?, approved_offer?, forced_reference_id?, clarify_reference_id? }) → ReferenceSuggestion \| null` | One or none. `decideForState` returns the same plus a `reason`. |
| `queueSuggestion` | `(state, suggestion \| null) → ListenerState` | Puts the one suggestion in the slot; refuses stale/unusable ones. |
| `pinReference` / `unpinReference` | `(state, referenceId) → ListenerState` | Position, not accuracy. Pin is ignored on rejected/invalidated. |
| `keepReference` | `(state, referenceId) → ListenerState` | KEEP FOR LATER. |
| `dismissReference` | `(state, referenceId, reason?) → ListenerState` | Never resurrected by a late output. |
| `forbidReuse` | `(state, referenceId) → ListenerState` | "Do not reuse this reference"; card stays as evidence. |
| `rejectReference` | `(state, referenceId, turnId?) → ListenerState` | Prospect rejected it ⇒ `rejected`, never suggested again. |
| `correctReference` | `(state, referenceId, field: 'relationship' \| 'explained_meaning' \| 'business_target', to, note) → ListenerState` | Original kept in `correction_history`; quote never rewritten. |
| `clarifyReference` | `(state, referenceId) → ListenerState` | CLARIFY MEANING. |
| `markUsed` | `(state, referenceId, turnId?) → ListenerState` | USE NOW / line said: `used_at`, no immediate repeat, slot cleared. |
| `recordReaction` | `(state, referenceId, 'accepted' \| 'rejected' \| 'unknown', turnId?) → ListenerState` | `unknown` is neither acceptance nor rejection. |
| `declineSuggestion` | `(state, referenceId) → ListenerState` | "Not now" — hidden from the policy at this event version only. |
| `toCards` | `(state) → ReferenceCard[]` | First-appearance order; the queued suggestion rides on its card. `visibleCards(cards, max=7)` applies the 3–7 default without reordering. |

Lower-level, also exported and stable: `extractReferences`, `extractTurn`, `validateEvidence`,
`validateProposal`, `applyRevisions`, `invalidateFailedEvidence`, `applyAction`, `applyListenerActions`,
`applySuggestion`, `suggestionStillValid`, `offerClaimGuard`, `metricGuard`, `labelFigure`, `templateFor`,
the concept lexicon (`CONCEPTS`, `conceptsForTurn`, `conceptsForRelationship`) and the word lexicons.

### Card contract (`ReferenceCard`, zod)

```
{ id, label, meaning_line, meaning_status: observed|inferred|confirmed|unknown,
  glyph: ◉|◌|✓|?|⊘, glyph_name, origin, origin_label, valence: { polarity, object },
  evidence: { quote, turn_id, exact_expression, status, timestamp? },
  state: held|pinned|dismissed|rejected|invalidated, state_line?, pinned, kept_for_later, do_not_reuse, painful,
  represents, useful_when, confirmed_meaning?, prohibited_inferences[], clarification?,
  actions: { keep, use, clarify }, suggestion?, concept_ids[], source_domain? }
```

Collapsed card = `label` + `meaning_line`. Expanded = evidence (`quote` is the only quotation), `represents`,
glyph + `glyph_name` (full accessible name), `useful_when`, and `suggestion` when present. Invalidated cards
carry `⊘`, a strike-through-worthy `state`, and the reason in `meaning_line` — they are never silently dropped.

### Suggestion contract (`ReferenceSuggestion`)

`{ reference_id, text, purpose, concept_id?, evidence_turn_id, script_node_id, script_version_id,
input_event_version, input_action_count?, trigger_turn_id? }` — every suggestion names its evidence turn, the
script node/version it was computed for and the versions it was computed from. `suggestionStillValid` refuses
it when the reference is gone, dismissed/rejected/invalidated, do-not-reuse, changed at a later event
version, or when any rep/UI action happened since (`input_action_count`).

---

## 3. Extractor rules (`extract.ts`) and their limits

Rules run on **prospect** turns only, sentence by sentence, on finalized text (interim text yields
`provisional` evidence that is never retrieved or suggested). Spans are Unicode code-point offsets and must
slice back to the exact expression (`validateEvidence`), so a proposal from any future model goes through the
same validator.

| Kind | Trigger (open, not a closed list) | Captures |
|---|---|---|
| analogy | `like a/an X <where\|that\|when\|who\|and\|with\|…> Y` — head noun X plus a ≥2-word relationship clause | `label = NOUN / RELATIONSHIP`, `relationship = "<target>: <clause>"`, domain if recognisable, concept ids from the clause |
| comparison | `as <bad\|good\|hard\|…> as Y`, `worse/better than <a …>` | meaning `inferred`; valence polarity from the degree word; object = the business target |
| image | `is a X where Y`, `it's a X situation where Y`, capitalised rare noun `a Frankenstein of Y` | same as analogy; without a relationship clause ⇒ **low priority, no card** |
| emotional_descriptor | `I/we felt/was/got <word> [by/about/with …]`, any `felt <participle>`, plus the open lexicon (ambushed, boxed in, breathing room, …) | exact word, object it attaches to, meaning `unknown` + a clarification question; **no cause is inferred** |
| outcome_label | `X is what matters`, `what matters (to me) is X` | with the previous sentence's `Y is fine/okay` ⇒ `distinct from Y` |
| defined_term | `by X I mean Y`, `what we call X` | `confirmed` with the definition as evidence |
| correction | `X, not Y` | explicit correction; `Y` is the set-aside metric |

**Origin** (`detectOrigin`): third-party attribution in the sentence itself (`my partner follows hockey; she
says…`) ⇒ `third_party` and `do_not_reuse`; a preceding representative turn that used the domain word/term ⇒
`seller_introduced_prospect_confirmed` (the seller turn is named in `lifecycle.reason`); a preceding
representative turn that asked for a comparison ⇒ `prompted`; no preceding context in a `partial` window ⇒
`unknown` (never spontaneous by default); otherwise `prospect_spontaneous`.

**Valence object** (`valenceObjectFor`): decided by the concept — effort-then-failure ⇒ "the result after
the effort (not cooking…)", role ownership ⇒ "the lack of clear ownership (not the sport…)", setback ⇒ "the
setback". Painful comparisons (`PAINFUL_WORDS`: injury, death, illness…) are flagged `painful`: the only
allowed reuse is a neutral acknowledgment with **no domain word** (`templateFor`), and the disallowed list
carries "slam dunk" explicitly.

**Filters:** commonplace idioms (`touch base`, `ballpark`, `home run`, `curveball`, …) are recorded in
`not_eligible` with the reason and never become cards; a domain word without a relationship or emotional
marker is `not_eligible`; rare nouns without a relationship are `priority: 'low'`, never a card. Negated
comparisons ("it's not like a …") are skipped. Known proper names (dealership, first names) are excluded from
the rare-noun rule.

**Later evidence:** `linkExplanations` upgrades an `unknown` emotional descriptor to `confirmed` only when a
representative question names the term and the prospect answers substantively; the answer turn is stored
as `explained_meaning.evidence_turn_id`. `applyTranscriptRejections` turns "please don't bring up the jazz
thing" into `rejected` + a recorded reaction.

**Known limits (honest):** rule-based, English only, small hand-written concept lexicon (11 concepts); a
paraphrased relationship that hits none of the concept cues yields a card with no concept tag ("hold it;
reuse only if the same topic returns") rather than a retrieval; sentence splitting is punctuation-based;
sarcasm is not detected beyond explicit negation. None of this is an inference-capability claim — see the
model-dependent evaluations deferred in §5.

---

## 4. Memory, revisions, duplicates, late outputs

- **Memory** = `{ turns, actions, last_suggestion_reference_id, queued_suggestion }`. Rebuild is total and
  deterministic; `applyTurn` over each event equals `listenerFromTurns` over all events.
- **Duplicates** (same `provider_event_key`, or same compound key) are dropped by the shared normalizer;
  `occurrence_count` counts distinct final utterances only.
- **Revisions**: a higher `revision` of the same `utterance_id` that no longer contains the phrase ⇒ the
  reference becomes `invalidated` with the reason, a `transcript_revision` correction entry, evidence
  `corrected`, `do_not_reuse`; a queued suggestion on that utterance is dropped before recomputation.
- **Late outputs**: `queueSuggestion` / `applySuggestion` refuse a suggestion whose reference is
  dismissed/rejected/invalidated/do-not-reuse, computed at an older event version, or computed before any
  later rep/UI action. A pin cannot revive a rejected reference.
- **Scope**: conversation-scoped by `call_id`; ids are `<call_id>:ref:<label-slug>` and never collide across
  calls. Saving to a prospect profile is a separate explicit action (`SavedProspectReference`), not automatic.

---

## 5. Acceptance matrix (addendum §10 → test names in `packages/domain/test/listener.test.ts`)

| # | Acceptance item | `describe` → `it` |
|---|---|---|
| 1 | First-mention hockey recognized before repetition | `§10 item 1` → *captures HOCKEY / NOBODY KNOWS WHO IS DEFENDING from the single utterance…*; *suggests "Using your hockey example, who should own the first response…"* |
| 2 | Jazz produces the comparison, not the noun | `§10 item 2` → *preserves individual style vs coordination and the negative object* |
| 3 | Later "robotic" retrieves jazz outside the window | `§10 item 3` → *retrieveByConcept maps "robotic"…*; *the suggestion keeps individual style AND shared structure, never obedience* |
| 4 | Soufflé valence attaches to collapse after effort | `§10 item 4` → *records the object as the result after effort and suggests the rollout question later* |
| 5 | Ambushed stays unresolved until clarified | `§10 item 5` → *is captured as AMBUSHED (not "price objection")…*; *updates the meaning WITH evidence after the prospect explains…* |
| 6 | Basketball injury: no history/preference/gambling/dislike | `§10 item 6` → *holds the comparison with the negative object = the setback, marks it painful, and never produces an upbeat same-domain line*; `frozen API — toCards` → *third-party and painful references are cards with honest reuse text…* |
| 7 | Profit distinct from revenue (wording + calculation) | `§10 item 7` → *captures PROFIT as an explicit priority with revenue set aside…*; *a revenue figure is never relabelled as profit* |
| 8 | Seller repetition manufactures nothing | `§10 item 8` → *seller says "profit" three times, prospect never does…* |
| 9 | "My partner follows hockey" ⇒ no hockey analogies | `§10 item 9` → *the third-party power-play comparison is do-not-reuse and the later responsibilities question gets no hockey suggestion* |
| 10 | Seller-introduced ⇒ prompted/shared, not spontaneous | `§10 item 10` → *relay race: seller_introduced_prospect_confirmed…*; *kitchen: … → prompted*; *without preceding context … origin is unknown* |
| 11 | "Touch base" ⇒ no baseball claim | `§10 item 11` → *idioms are not references* |
| 12 | Rare noun without relationship ⇒ not high priority | `§10 item 12` → *"our CRM is a Frankenstein" is low priority (no card); "the Frankenstein of three tools nobody owns" has a relationship* |
| 13 | Rejected analogy stops being used | `§10 item 13` → *"please don't bring up the jazz thing" → state rejected…*; *a rep-recorded rejection has the same effect*; `frozen API — lifecycle functions` → *rejectReference / recordReaction…* |
| 14 | Revision retracts a phrase ⇒ cards + queued suggestions update | `§10 item 14` → *AMBUSHED is invalidated with a reason and a transcript_revision correction entry; a queued suggestion is dropped*; *a revision that KEEPS the phrase does not invalidate it*; `frozen API — lifecycle functions` → *item 14 through the state: invalidateForRevision…* |
| 15 | Rejected reference not resurrected by a late response | `§10 item 15` → *applySuggestion refuses a stale suggestion…*; `frozen API — lifecycle functions` → *item 15 through the state: a late suggestion cannot be queued after dismiss/reject, and a stale one is refused* |
| 16 | Several references visible beside the script without displacing it (domain side) | `§10 item 16` → *order is first-appearance and stable as turns arrive; pinning never reorders; the script node is never touched*; `frozen API — toCards` → *visibleCards keeps first-appearance order, caps held cards, never drops a pinned one, never shows dismissed* |
| 17 | Irrelevant topic ⇒ no forced analogy | `§10 item 17` → *abstains when the current turn shares no concept…*; *abstains when a matching reference exists but the node purpose does not fit…* |
| 18 | No unapproved offer claim or guarantee | `§10 item 18` → *the offer guard rejects guarantees, promises, discounts, refunds and unapproved prices*; *every suggestion the policy emits over the fixtures passes the guard* |
| 19 | Same path live/mock; hidden mock facts inaccessible | `§10 item 19` → *a practice scenario's REVEALED lines run through listenerFromTurns; nothing from evaluatorView.hidden_fact_sheet is reachable*; `frozen API — listenerFromTurns / applyTurn are the same path` → *applyTurn over every event reproduces listenerFromTurns…* |
| 20 | Boundaries, consent, deletion, duplicates, outage | `§10 item 20` → *duplicate provider events never create duplicate references…*; *a genuine second mention counts once more…*; *a dismissed reference stays dismissed when replayed*; *call boundaries…*; **`it.todo`**: tenant boundary/consent/deletion (Increment 2/4), model-outage fallback (Increment 4) — not faked |

Supplementary: `evidence exactness — Unicode code-point spans` (3), `paraphrase and unseen-domain cases`
(gardening / chess / construction, "felt steamrolled", sailing "as frustrating as", "by stickiness I mean"),
`abstention and no-repeat policy` (4), `frozen API — suggestPrimary(state, ctx) and the one-suggestion slot` (3).

Item 16's **UI half** (24–36px labels, keyboard controls, live regions, no reading-position jump) belongs to
the call room (M-core) and its e2e spec; the domain guarantees only stable order and an untouched script node.

---

## 6. Fixtures (`data/synthetic_transcripts.json`, `syn-l-*`)

L1 hockey → responsibilities · L2 jazz → "robotic" seven turns later · L3 soufflé → rollout/testing ·
L4 ambushed → explained → full costs/exit terms · L5 basketball injury (held, never reused) · L6 "Revenue is
fine. Profit is what matters to me." · L7 seller repeats "profit", prospect never does · L8 "My partner follows
hockey; I don't understand it" · L9 seller-introduced relay-race analogy endorsed · L10 "Let's touch base
tomorrow… ballpark" · L11 Frankenstein with/without a relationship · L12 jazz rejected, later coordination
topic · L13 revision retracts "ambushed" (same utterance, revision 1) · L14 gardening / chess / construction
(paraphrased, unseen domains) · L15 seller asks for a comparison, prospect supplies a kitchen analogy
(prompted). All carry `synthetic: true`, "fictional" in the title, `provider: "synthetic"`, and a
`_listener_fixture_note` stating that no hidden mock facts are part of any transcript.

---

## 7. Checks run (this pass)

- `npx tsc --noEmit -p packages/domain/tsconfig.json` — clean.
- `npx vitest run packages/domain/test/listener.test.ts packages/domain/test/vocabulary.test.ts` — 91 passed,
  2 todo (listener 60 + 2 todo; vocabulary 31).
- `npx eslint packages/domain/src/listener packages/domain/src/schemas/listener.ts packages/domain/test/listener.test.ts --max-warnings 0` — clean.
- `npm run typecheck` — clean across all three projects once the v1 Call Room (`call-room/ReferencesPanel.tsx`,
  `CallRoomClient.tsx`) was deleted; `/call-room` is now a redirect to the Dial front door (`/`).

## 8. Open items

- `packages/domain/package.json` (shared) has no `"./listener"` subpath export; the app imports the listener
  through `@apohenia/domain/vocabulary` (additive re-export) until the skeleton adds
  `"./listener": "./src/listener/index.ts"`.
- `packages/domain/src/index.ts` (shared) does not re-export `MODULE as LISTENER_MODULE`.
- Live provider wiring, tenant/RLS, consent stopping, deletion and model-outage fallback are Increments 2–4;
  the two `it.todo` entries mark them.
- Model-dependent quality evaluation (inference beyond the rule set) is deliberately separate from these
  deterministic evidence/lifecycle tests and is not claimed.
