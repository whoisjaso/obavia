# Source register — authority files and seeds with SHA-256

Computed on 2026-09-11 with Node 22 (`crypto.createHash('sha256')` over the file bytes). Recompute with:

```bash
node -e "const c=require('crypto'),fs=require('fs');for(const f of process.argv.slice(1)){console.log(c.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),f)}" \
  docs/00-codex-master-v2.md docs/01-source-framework.md docs/02-organized-question-bank.md \
  docs/05-personal-meaning-listener-addendum-v3.md data/*.json
```

If a hash below no longer matches, the file changed after this register was written; update the register in the
same commit as the change and say why in `IMPLEMENTATION_STATUS.md`.

## 1. Authority documents (read in this order — `CLAUDE.md`)

| # | File | Bytes | SHA-256 | Role |
|---|---|---|---|---|
| 1 | `docs/00-codex-master-v2.md` | 66,734 | `72575c3fc11ae870541b34873f6fe13d72a88fd874377fb330d90b3121afbfec` | Authoritative implementation brief (wins on conflict) |
| 2 | `docs/01-source-framework.md` | 30,229 | `b55200694e9c6792e512de87e4a7e16af1e4917cacac94a844862a10abb97e00` | Source study of the Impact Formula transcripts — study material, not app policy |
| 3 | `docs/02-organized-question-bank.md` | 209,835 | `99bd74bdc164b6e9fd849d83cc27b0c0e4b81a2755c9fc86f9c4d622c8c9749a` | 207 curated records with unchanged excerpts and claimed code-point offsets. This hash is also `package_sha256` in `data/source_package_validation.json` |
| 5 | `docs/05-personal-meaning-listener-addendum-v3.md` | 20,211 | `ae966edef9871553b6ec1c4192d2ed52561a0db5ba0ac7cb2a582db625ee93fd` | Listener addendum; refines language-listening rules, everything else in the brief stands |

Not hashed here (repo-authored drafts, not authority): `docs/03-apohenia-draft-scripts.md`,
`docs/04-identity-interview.md`, `docs/06-listener-implementation.md`, `docs/DESIGN_SYSTEM.md`.

## 2. Machine seeds (`data/*.json`)

| File | Bytes | SHA-256 | Origin | Contents |
|---|---|---|---|---|
| `data/source_question_records.json` | 250,399 | `80ed9d2180e4feaeee17b9a97711a5edadd218c683397f5e24719e87f64ac9a1` | parsed losslessly from doc 3 by `scripts/parse-question-bank.mjs` | 207 records; Source A 144 · B 63; adapt 160 · study_only 33 · private_training 14; every record `hash_verified: false` |
| `data/source_sections.json` | 10,728 | `3631f8e55881f7b66a3494d9c47109cd8180b29a7358c5cdf0876c5a4859ac53` | same parser | 26 sections with records + 13 named-only = 39 (brief says 41; not reconciled, not invented) |
| `data/source_package_validation.json` | 1,289 | `ceed2baf50c130a8279da42ab5f792d0eaf0cbda58db3dc28b0de181e5df2f5a` | same parser | counts, offset convention, `raw_sources_supplied: false` |
| `data/source_missing_resources.json` | 9,180 | `426c06fada1c60eab68ac5577b91ebdf7aa55e6fba823f0ba03cca20eb36352a` | authored in this repo (M-sources) | 11 named-but-missing resources, each "marked missing — not reconstructed" |
| `data/identity_interview.json` | 48,725 | `a78b94bbe5e9478e2b2abe6b7ca37c725fd1b70af9aa40562f79782e31658ac2` | authored in this repo from brief §4 (package JSON not supplied) | 33 screens (30 base + 3 conditional) |
| `data/apohenia_script_nodes.json` | 171,073 | `5ba64731417e9caa71781942b6e9a5fefa87268e9aa6e820a67d73a59601ab31` | authored in this repo from brief §5–§6 and doc 2 | 1 draft version, 51 nodes, six entrypoints, `exit-stop`; cites record ids; all `draft` |
| `data/offers.json` | 10,157 | `1bef9ab1d2c1126703ec884969b7ede40ed37235067b7b785eecf84251e80904` | authored from brief §5 | draft research offer (price `null`) + fictional practice pilot (USD 750 + 150, bannered) |
| `data/synthetic_transcripts.json` | 185,501 | `ea11073f5bc735e9ddac315dd987b32b944e4acdb7535d36f37bcaa8506f87ad` | authored from brief §7 and addendum §7/§10 | 23 synthetic calls: `syn-a…syn-h` (8, vocabulary cases) + `syn-l-*` (15, listener fixtures); `provider: "synthetic"`, no hidden mock facts |
| `data/synthetic_prospects.json` | 7,565 | `6a1d4230a0ff08570dc92e95912f825fc9ce565b36f657ae882a8b6a084ce4f8` | authored from brief §9 | fictional CRM: 8 companies, 9 locations, 9 endpoints, 10 contacts; `+1 555-01xx` numbers, jurisdiction `unknown`, contact policy `requires_review`, one opt-out contact |

## 3. Not in the repository (never reconstructed)

| Item | Where it is expected | Effect today |
|---|---|---|
| Raw Source A transcript `sources/source_a.txt` | private archive; path is gitignored | 144 records pending hash/offset verification |
| Raw Source B transcript `sources/source_b.txt` | same | 63 records pending |
| 1,449-occurrence punctuation audit (527 A / 922 B) | not supplied | counts only; never shown as questions |
| Upstream package validation report (hashed the raw sources) | not supplied | local report hashes only the markdown |
| Four-frame fear set, screen-only slides, video timestamps, speaker diarization, two of the brief's 41 sections | not supplied | each listed in `data/source_missing_resources.json` and rendered as ⊘ |

When the raw transcripts arrive: place them at the paths above and run `npm run verify:offsets`; it writes
`data/source_offset_verification.json` (gitignored sibling) and never edits an excerpt.

## 4. External implementation references (brief §23)

Inherited from the earlier technical plan and **not re-verified** in this repo — nothing in the code uses them yet:
Twilio Voice JS SDK, Calls Transcriptions subresource, transcription callbacks, Media Streams, US voice pricing;
OpenAI voice-WebRTC, structured outputs, data controls, pricing, separate billing; Supabase RLS and realtime
authorization; Vercel WebSockets / function limits; 16 CFR 310 (TSR), 47 CFR 64.1200; Reddit Data API terms.
Recheck each official page before Increments 2–6 use any method, model id, policy or price.
