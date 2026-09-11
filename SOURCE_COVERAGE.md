# Source coverage — what is supplied, what is missing, how it is guarded

Owner: M-sources (Increment 1). Every number below is computed by `coverageReport()` in
`packages/domain/src/sources/index.ts` from the seeded package and asserted by
`packages/domain/test/sources-library.test.ts`. If this file and the report disagree, the
report is right and this file is stale.

All of this is **study material**. `adapt` is not live approval; `study_only` and
`private_training` are readable for study and are never live recommendations. The source
archive is **private to this project** by default.

## 1. Supplied

| Item | Supplied as | Count |
|---|---|---|
| Curated source-derived question records | `data/source_question_records.json` (parsed from `docs/02-organized-question-bank.md` by `scripts/parse-question-bank.mjs`) | **207** (expected 207) |
| Records by classification | `use_classification` | **adapt 160 · study_only 33 · private_training 14** |
| Records by source | `source` | **Source A 144 · Source B 63** |
| Records from the reviewed Yosh call | family `V`, section A13 | 48 |
| Sections with records | `data/source_sections.json`, `records_supplied: true` | **26** |
| Sections named only (no records) | `data/source_sections.json`, `records_supplied: false` | **13** — A08, B00, B01, B02, B06, B12, B13, B14, B15, B16, B22, B23, B25 |
| Sections total | | **39** (the brief claims 41 — see §2) |
| Package hash | SHA-256 of `docs/02-organized-question-bank.md` in `data/source_package_validation.json` | 1 (this is *not* a hash of the raw transcripts) |
| Named-but-missing register | `data/source_missing_resources.json` | 11 entries |
| Own-script counterparts | `data/apohenia_script_nodes.json` (`source_question_ids`), mapped by `ownScriptCounterparts()` | read live from the authored 51-node draft seed |

### Per-family table

| Family | Label | Total | adapt | study_only | private_training | Source A | Source B |
|---|---|---|---|---|---|---|---|
| I | Intent | 8 | 8 | 0 | 0 | 8 | 0 |
| L | Logical certainty | 14 | 13 | 1 | 0 | 14 | 0 |
| S | Setter transition | 5 | 5 | 0 | 0 | 5 | 0 |
| E | Decision history | 8 | 8 | 0 | 0 | 8 | 0 |
| F | Future | 12 | 11 | 1 | 0 | 12 | 0 |
| C | Consequence | 6 | 5 | 1 | 0 | 5 | 1 |
| P | Pitch / commitment | 12 | 12 | 0 | 0 | 10 | 2 |
| M | Mirror | 6 | 4 | 0 | 2 | 3 | 3 |
| O | Objection | 31 | 13 | 17 | 1 | 26 | 5 |
| U | Follow-up | 9 | 7 | 2 | 0 | 0 | 9 |
| R | Referral | 7 | 6 | 1 | 0 | 0 | 7 |
| X | Upsell setting | 11 | 9 | 2 | 0 | 0 | 11 |
| Y | Upsell closing | 11 | 11 | 0 | 0 | 0 | 11 |
| V | Reviewed call | 48 | 48 | 0 | 0 | 48 | 0 |
| D | Identity / status / needs (study) | 13 | 0 | 8 | 5 | 5 | 8 |
| T | Training (private) | 6 | 0 | 0 | 6 | 0 | 6 |
| **Σ** | | **207** | **160** | **33** | **14** | **144** | **63** |

Delivery values as described in the source text (count): curious 56, not_audio_verified 48,
casual 36, skeptical 15, concern 12, confident 9, training 6, curious-upward 5, reflection 4,
casual-curious 3, curious-skeptical 3, slow 3, casual-confident 2, casual-hypothetical 1,
confident-slow 1, curious-concern 1, curious-downward 1, teasing 1. All 48
`not_audio_verified` records are the reviewed call (family V): no audio was inspected, so no
cue is asserted. Every other value is an instructor-described cue in text, not measured
physiology (`deliveryCueNote()` says so beside every record).

## 2. Missing or unverifiable — marked missing, not reconstructed

The full register is `data/source_missing_resources.json` (rendered on `/sources` under
"Named but missing resources"). Summary:

| id | Resource | Status |
|---|---|---|
| `raw_source_a` | Raw Source A transcript (`sources/source_a.txt`) | not supplied → 144 records `hash_verified: false` |
| `raw_source_b` | Raw Source B transcript (`sources/source_b.txt`) | not supplied → 63 records `hash_verified: false` |
| `punctuation_audit_1449` | 1,449-occurrence punctuation audit (527 A / 922 B) | counts only; the audit rows are not in the package and are never shown as 1,449 approved questions |
| `package_validation_report_original` | Upstream validation report that hashed the raw sources | not supplied; the local report hashes only the markdown |
| `four_frame_fear_set` | Complete island / what's riskier / fat person / $4,000 set | only two fully worked certainty examples exist (A11 worker-vs-entrepreneur, B05 beach); the rest are named or fragmentary |
| `screen_only_slides` | Slides / on-screen resources | not supplied; spoken text only |
| `video_timestamps` | Timing data | none — untimed text; no timestamp is ever rendered (tested) |
| `speaker_diarization` | Speaker labels | uncertain; the reviewed call has `>>` turn markers only, shown unchanged, no speaker named |
| `named_only_sections` | Records for the 13 named-only sections | none; listed with a "no records supplied" badge |
| `narrator_10000_paid_in_full` | $10,000 paid-in-full outcome of the reviewed call | narrator's claim, not observed in the excerpt; reported as a claim |
| `section_count_41_vs_39` | The brief's 41 sections vs 39 supplied ids | two ids cannot be reconciled and are not invented |

## 3. Offset convention

Every record carries `offset_start` / `offset_end` = **half-open `[start, end)` Unicode
code-point offsets into the original single-line transcript of the named source (A or B)**.
Code points, not UTF-16 units: `Array.from(text).slice(start, end).join('')`, never
`text.slice(start, end)`. Each record also stores `excerpt_length` (code points of the
excerpt as supplied) and `claimed_length` (`end − start`); `length_matches_offsets` is true
for all 207. The UI prints the reference as
`original characters [start, end) — code-point offsets`.

## 4. Hash verification status and the exact command

Status today: **0 verified · 207 pending** (`raw_sources_supplied: false`,
`hash_verification: "pending — raw Source A / Source B transcripts are not in the supplied
package; excerpts recorded as supplied"`). Every excerpt is labelled
*"Unchanged source excerpt · verification pending (raw sources not supplied)"*.

When the raw transcripts arrive, place them at `sources/source_a.txt` and
`sources/source_b.txt` and run, from the repo root:

```
node scripts/verify-source-offsets.mjs
```

The verifier computes SHA-256 of each present file, checks
`Array.from(text).slice(offset_start, offset_end).join('') === excerpt` for every record of
that source, and writes a **sibling** report `data/source_offset_verification.json`
(`hash_verified` per record, per-source hash and code-point length, verified / mismatch /
pending counts). It never overwrites the parser's `data/source_package_validation.json` and
never edits an excerpt to fit an offset. Exit codes: 0 with
"raw sources not supplied — verification pending" when neither file exists; 0 when every
supplied source verifies; 1 listing each mismatching record otherwise. The root
`package.json` exposes it as `npm run verify:offsets`.

## 5. The four-representation rule (brief §3)

Each question exists in four distinct representations that are never collapsed into one:

1. **Raw source span and provenance** — `excerpt` + `[offset_start, offset_end)` + `source`
   + `section_id` + `markdown_line` + `hash_verified`. Shown in a `<blockquote>` as selectable
   text, labelled unchanged and (until hashed) verification-pending.
2. **Editorially normalized source template** — `template`, always labelled
   *"normalized template — not verbatim"*. Never presented as a quote (scenario 34).
3. **Jason's editable own word track and branch** — script nodes in
   `data/apohenia_script_nodes.json`, which cite record ids in `source_question_ids`. The
   library shows them under "Own-script counterpart" as links to `/scripts?node=<id>` with
   their approval badge; they are original wording and are never shown as source quotes.
4. **Immutable published script version** — `ScriptPublication`; not the library's concern
   beyond showing a node's `approval.status`.

## 6. How the library keeps `study_only` out of live use (scenario 31)

- `isLiveEligibleForCitation(record)` is true **only** for `adapt`. `study_only` and
  `private_training` records are readable in `/sources` and `/sources/[id]` but the detail
  page opens with a prominent text notice — *"Source-only: readable for study; not a live
  recommendation"* — and states *Live-eligible for citation: no*.
- `ownScriptCounterparts()` attaches a `citation_warning` to any non-`practice_only` script
  node that cites a non-adapt record, so a leak is reported next to the record rather than
  hidden; the domain test asserts the authored seed produces such a warning whenever that
  situation exists.
- `adapt` is labelled as *not live approval* in its one-line definition everywhere it is
  shown; approval lives on the script node, never on the source record.
- Source A and Source B are two source chips with separate section tiles and separate
  counts (Design System v2); results are split by `record.source` and never merged into one list.
- The raw excerpt is rendered unchanged, the template is labelled normalized, no timestamp
  pattern appears in any template or excerpt (tested), and speaker turns in the reviewed
  call keep their `>>` markers without an invented speaker name.
- Source content is private to this project (notice at the top of `/sources`).
