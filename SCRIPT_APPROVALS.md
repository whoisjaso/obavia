# Script approvals — states, traceability and publication rules

Owner: M-script. Applies to `data/apohenia_script_nodes.json`, `data/offers.json`, the `/scripts` and `/offers` pages, and the engines in `packages/domain/src/scripts` and `packages/domain/src/offers`.

## 1. Approval states and what each means

Both script nodes (`approval.status`) and offer versions (`status`) use the same four states. They are **separate** from the source record classification (`adapt` / `study_only` / `private_training`), which is study metadata and never an approval.

| State | Meaning | Rendered as | Who moves it |
|---|---|---|---|
| `draft` | Written, not reviewed. May be edited freely. Never live. | warning badge "draft" on every render | author (M-script / Jason) |
| `reviewed` | Owner (Jason) has read it and accepts the wording and routing as a candidate. Still not live. | info badge "reviewed" | Jason only |
| `published` | Approved for live use and **frozen**. Wording cannot change; a change means a new version. | success badge "published" | Jason only, with explicit confirmation |
| `retired` | No longer used; kept for history. Read-only. | neutral badge "retired" | Jason only |

Allowed moves: `draft → reviewed → published → retired`. Nothing moves backwards; a rejected `reviewed` item is re-authored as a new draft. The engine enforces this for offers (`canTransitionOffer`, `transitionOffer`, `assertOfferEditable`) and for script versions (`assertPrimaryEditable`, `editPrimaryWordTrack` throw once a version is published or immutable).

A `draft` is never rendered as if approved. `adapt` on a source record is not live approval. `study_only` never becomes a live recommendation (the graph validator rejects any study_only id in a node's primary citation list). `private_training` records may appear only on nodes flagged `practice_only`, which are never entry nodes and are skipped in live calls.

## 2. Current state (Increment 1)

- Script version `dealership-inquiry-follow-through-v0.1`: **draft**, `immutable: false`, `price_placement: after_pillars`, 51 nodes, **all 51 `draft`**. Entry nodes exist for cold, inbound, handoff, follow_up, referral, upsell. `validateGraph` passes against the 207 records.
- Offer `draft-research-offer-v0` (Dealership website inquiry follow-through): **draft**, `fictional: false`, price `null`/`null` (rendered "Not set"), `supported_proof: []` ("none yet"), `approved_claims: []`.
- Offer `fictional-demo-inquiry-pilot` (Demo Inquiry Follow-Through Pilot): `fictional: true`, `practice_only: true`, banner "FICTIONAL TRAINING OFFER — NOT A REAL QUOTE", fixture price USD 750 setup + USD 150 for one 30-day period. Excluded from the live list structurally (`liveOffers()`); its price can never be quoted (`canQuotePrice()` is false for fictional/practice-only offers).
- Status changes made on the `/offers` page are stored locally (`offers.status`) as a demo of the guard; the seed files remain draft until Jason edits them.

Nothing in this repository is live sales policy. Owner review is required before any node or offer is used with a real prospect.

## 3. How to trace an own line to a source record — never a source quote

Each node has four separate representations (brief §3), stored in separate places:

1. **Raw source span** — the exact excerpt with character offsets: `SourceQuestionRecord.excerpt` (Source Library only, private).
2. **Normalized source template** — editorial reconstruction, not a quote: `SourceQuestionRecord.template`.
3. **Jason's own line** — `ScriptNode.primary_word_track` (stable within a version) and `WordTrackVariant.own_text` (his personal rewording, stored under `scripts.wordtracks`, never overwriting the primary).
4. **Immutable published snapshot** — `ScriptPublication` (`scripts.publications`).

Trace path: node → `source_question_ids` → `/sources/<id>` (badge shows the record's classification) → template and excerpt. The own line is displayed as **Say this**; the record's template is displayed only in the Source Library. The UI never presents an own line as a quotation of Andrés or Yosh, and never presents a source template as approved wording. Nodes with no source counterpart have an empty `source_question_ids` and a `source_note` beginning "Apohenia addition". Study-only ids appear only inside `source_note` text (e.g. "L06 … cited here only as a note").

Delivery cues (`delivery_overlay`) are labelled **instructor-described**: they are text descriptions from the transcripts, not audio-verified or measured. Text-only practice never emits tonality or body-language scores.

## 4. Price-placement variant policy

The source has two variants: price **after** the pillars (Source A, A07) and price **first** (Source B, B04 — that instructor prefers it). Both belong in the library.

- A variant is a **version-level** choice: `ScriptVersion.price_placement` is `after_pillars` or `price_first`. The current draft is `after_pillars`.
- A price-first script is a **separate `ScriptVersion`** with its own node order and its own publication. It is never produced by re-ordering nodes at call time.
- One variant is locked for a practice cohort or a memorization period; the app does not alternate variants while Jason is memorizing.
- Whatever the placement, the price slot `{approved_price}` is filled only from a **published, non-fictional offer with a complete price**. Otherwise the node renders "Price not approved yet — route to scope conversation" and routes to the follow-up/scope node. No number is ever invented; a fictional fixture price never reaches live pricing (scenarios 6, 38).

## 5. Publishing freezes wording

`publishVersion(version, nodes)` creates a `ScriptPublication`:

- `content_hash` = SHA-256 (FIPS 180-4, pure TypeScript in `scripts/index.ts`, verified against the standard vectors) of the canonical JSON (keys sorted recursively, no whitespace) of `{ version, nodes }`, with `published_at` excluded so the same content always yields the same hash regardless of when it is published.
- The snapshot's version copy is marked `status: published`, `immutable: true`; the snapshot's nodes are deep-frozen copies. The inputs are not mutated.
- **Node approval is not changed by publishing.** A publication of draft nodes is a "frozen wording snapshot — nodes still draft"; the `/scripts` page labels it as such. Owner approval of nodes (draft → reviewed → published) is a separate act.
- Once a version is published/immutable, `editPrimaryWordTrack` and `assertPrimaryEditable` reject any change to `primary_word_track`. Changing wording means creating a new version (new id, `version + 1`) and a new publication.
- Own words (`WordTrackVariant`) and mirror selection never modify `primary_word_track` in any state (scenario 29). `verifyPublication` recomputes the hash to detect tampering.

## 6. Checklist before moving a node to `reviewed`

1. `validateGraph` is ok (51 nodes, unique ids, citations resolve, no study_only in primary citations, closed graph, six entry nodes, no orphans, all reachable).
2. The line is first person, natural, and original — not a paraphrase of a source excerpt.
3. Every slot in the line appears in `required_context`, and the line reads correctly with the missing cue shown.
4. `completion_criteria` require no specific emotional word.
5. Declined / opt-out branches exist wherever they make sense; opt-out routes to `exit-stop`.
6. `source_note` explains every Apohenia addition or deviation from the source's routing.
