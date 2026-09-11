# Script approvals — states, traceability and publication rules

Owner: M-script. Applies to `data/apohenia_script_nodes.json`, `data/offers.json`, the `/scripts` and `/offers` pages, and the engines in `packages/domain/src/scripts` and `packages/domain/src/offers`.

## 1. Approval states and what each means

Both script nodes (`approval.status`) and offer versions (`status`) use the same four states. They are **separate** from the source record classification (`adapt` / `study_only` / `private_training`), which is study metadata and never an approval.

| State | Meaning | Rendered as | Who moves it |
|---|---|---|---|
| `draft` | Written, not reviewed. May be edited freely. Never live. | `◔ Draft` glyph pill on every render; accessible name "Draft — written, not reviewed; never rendered as approved and never live" | author (M-script / Jason) |
| `reviewed` | Owner (Jason) has read it and accepts the wording and routing as a candidate. Still not live. | `◑ Reviewed` glyph pill | Jason only |
| `published` | Approved for live use and **frozen**. Wording cannot change; a change means a new version. | `✓ Published` glyph pill | Jason only, with explicit confirmation |
| `retired` | No longer used; kept for history. Read-only. | `— Retired` glyph pill | Jason only |

Allowed moves: `draft → reviewed → published → retired`. Nothing moves backwards; a rejected `reviewed` item is re-authored as a new draft. The engine enforces this for offers (`canTransitionOffer`, `transitionOffer`, `assertOfferEditable`) and for script versions (`assertPrimaryEditable`, `editPrimaryWordTrack` throw once a version is published or immutable).

A `draft` is never rendered as if approved. `adapt` on a source record is not live approval. `study_only` never becomes a live recommendation (the graph validator rejects any study_only id in a node's primary citation list). `private_training` records may appear only on nodes flagged `practice_only`, which are never entry nodes and are skipped in live calls.

### Global stop rule (review finding B-1)

An opt-out must reach the stop node from **every** node, not only from the nodes that happen to list an `opt_out` branch. The engine enforces this structurally:

- `ScriptVersion.stop_node_id` (additive, default `"exit-stop"`) names the stop node.
- `effectiveBranches(node, version)` returns the node's own branches **plus an implicit `opt_out → stop node` branch** (`implicit: true`, label "Asks to stop") unless the node is the stop node or already routes `opt_out` explicitly. `nextNodeForBranch(node, 'opt_out', nodes, version)` therefore resolves from every node, and `renderNodeCard` shows the route on every card.
- `validateGraph` asserts: the stop node exists, sits in the `exit` stage, is not practice-only, is terminal (every branch → `null`), every explicit `opt_out` branch points to it, and `opt_out` resolves to it from every other node.

The `/scripts` sheet renders the implicit branch as a red `⊘` chip whose accessible name says "Global stop rule…".

### Offer slots are filled only by a published offer (B-2, B-3)

`{approved_price}`, `{pillar_N_name}` and `{pillar_N_delivery}` are **offer slots**. `resolveSlots` never reads them from the known-facts map (a "fact" named `approved_price` is ignored — B-3) and fills pillar wording only when the linked offer's status is `published` (B-2). Until then the line shows `[Offer not approved: pillar 1 name]` and a routing note; the price additionally needs a non-fictional offer with a complete price ("Price not approved yet — route to scope conversation"). The status `/scripts` uses is the one the Offer Studio persists under the single storage key `offers.status` (`OFFER_STATUS_STORAGE_KEY`, B-12); a stored status only ever moves an offer forward and never touches a fictional/practice fixture.

### Evidence-satisfied transitions (B-11, B-6)

`isEvidenceSatisfied` returns the **quoted sentence** inside `facts_already_known_rule` (slots resolved) as `transition`, and the full rule as `rule`. A rule with guidance but no quoted line yields `transition: null`; the UI then shows the rule as an instruction, never as something to say. `validateGraph` rejects a quoted transition whose slots are neither declared in `required_context` nor listed in `satisfied_by_facts`, and a node that quotes a transition without any `satisfied_by_facts` (the B-6 fault: `emotional-prevented-shifted` now declares `satisfied_by_facts: ["shift_reason"]`). Every slot spoken in a primary line or mirror must be declared in `required_context` (B-10: `pitch-fit` now declares `{key_pillar}`).

## 2. Current state (Increment 1)

- Script version `dealership-inquiry-follow-through-v0.1`: **draft**, `immutable: false`, `price_placement: after_pillars`, 51 nodes, **all 51 `draft`**. Entry nodes exist for cold, inbound, handoff, follow_up, referral, upsell. `validateGraph` passes against the 207 records.
- Offer `draft-research-offer-v0` (Dealership website inquiry follow-through): **draft**, `fictional: false`, price `null`/`null` (rendered "Not set"), `supported_proof: []` ("none yet"), `approved_claims: []`.
- Offer `fictional-demo-inquiry-pilot` (Demo Inquiry Follow-Through Pilot): `fictional: true`, `practice_only: true`, banner "FICTIONAL TRAINING OFFER / NOT A REAL QUOTE" (rendered on two lines), fixture price USD 750 setup + USD 150 for one 30-day period. Excluded from the live list structurally (`liveOffers()`); its price can never be quoted (`canQuotePrice()` is false for fictional/practice-only offers).
- Status changes made on the `/offers` page are stored locally under `offers.status` (`OFFER_STATUS_STORAGE_KEY`) — the single store of truth that `/scripts` also reads (B-12); the seed files remain draft until Jason edits them.
- `concern-certainty`'s second mirror was a certainty-seeking pushback from the source ("Could that be why this has not been fixed…"); it is now a real mirror that seeks the same answer type (B-4).

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
- **Node approval is not changed by publishing.** `publicationApproval(pub)` labels a snapshot `frozen draft` when every node is still draft, `published` only when every node is published, and `frozen mixed` otherwise; the `/scripts` page shows that label on every publication and in the toast (B-5). Publishing 51 draft nodes never marks them published, silently or otherwise. Owner approval of nodes (draft → reviewed → published) is a separate act.
- **Publish always confirms.** The Publish tile opens a sheet ("Wording freezes · approval unchanged") with two tiles, Publish · Cancel; nothing is stored until Publish is chosen.
- Once a version is published/immutable, `editPrimaryWordTrack` and `assertPrimaryEditable` reject any change to `primary_word_track`. Changing wording means creating a new version (new id, `version + 1`) and a new publication.
- Own words (`WordTrackVariant`) and mirror selection never modify `primary_word_track` in any state (scenario 29). `verifyPublication` recomputes the hash to detect tampering.

## 6. Checklist before moving a node to `reviewed`

1. `validateGraph` is ok (51 nodes, unique ids, citations resolve, no study_only in primary citations, closed graph, six entry nodes, no orphans, all reachable).
2. The line is first person, natural, and original — not a paraphrase of a source excerpt.
3. Every slot in the line appears in `required_context`, and the line reads correctly with the missing cue shown.
4. `completion_criteria` require no specific emotional word.
5. Declined branches exist wherever they make sense. Opt-out reaches `exit-stop` from every node by the global stop rule; an explicit `opt_out` branch, where present, must also point to the stop node.
7. Every slot in every mirror and in the quoted transition line is declared (`required_context` or `satisfied_by_facts`); `validateGraph` fails otherwise.
6. `source_note` explains every Apohenia addition or deviation from the source's routing.
