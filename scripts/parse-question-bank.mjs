#!/usr/bin/env node
/**
 * Import validator: docs/02-organized-question-bank.md -> data/source_question_records.json
 *                                                        -> data/source_sections.json
 *                                                        -> data/source_package_validation.json
 *
 * The markdown is the supplied study package. This script is a lossless parser plus validator.
 * It never rewrites source text. Excerpts are copied byte-for-byte from the markdown blockquote.
 *
 * Offset convention (recorded in data/source_package_validation.json):
 *   "original characters [start, end)" are half-open Unicode code-point offsets into the
 *   ORIGINAL single-line transcript (Source A or Source B). The raw sources are NOT part of
 *   the supplied package, so offsets are recorded as claimed and marked `hash_verified: false`.
 *   When the raw sources arrive, run `node scripts/verify-source-offsets.mjs` (to be added)
 *   to confirm `source.slice(start, end) === excerpt` and record SHA-256 of each source.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const inputPath = resolve(root, 'docs/02-organized-question-bank.md');
const outDir = resolve(root, 'data');
mkdirSync(outDir, { recursive: true });

const md = readFileSync(inputPath, 'utf8');
const packageHash = createHash('sha256').update(md).digest('hex');
const lines = md.split('\n');

const SECTION_RE = /^## ([AB]\d{2}): (.+)$/;
const RECORD_RE = /^### ([A-Z]\d{2}) — (.+)$/;
const TEMPLATE_RE = /^\*\*Template:\*\* (.*)$/;
const PURPOSE_RE = /^\*\*Instructor's intended purpose:\*\* (.*)$/;
const DELIVERY_RE = /^\*\*Delivery described in source:\*\* ([a-z_-]+)\. \*\*Use classification:\*\* `([a-z_]+)`\.$/;
const REFERENCE_RE = /^\*\*Reference:\*\* ([AB]), ([AB]\d{2}), original characters \[(\d+), (\d+)\)\.$/;
const EXCERPT_RE = /^> (.*)$/;

const CLASSIFICATIONS = new Set(['adapt', 'study_only', 'private_training']);

const sections = [];
const records = [];
const errors = [];
let currentSection = null;
let cur = null;
let inDetails = false;

function finish() {
  if (!cur) return;
  const required = ['template', 'purpose', 'delivery', 'use_classification', 'source', 'section_id', 'offset_start', 'offset_end', 'excerpt'];
  for (const k of required) {
    if (cur[k] === undefined || cur[k] === null || cur[k] === '') errors.push(`${cur.id}: missing ${k}`);
  }
  records.push(cur);
  cur = null;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let m;
  if ((m = SECTION_RE.exec(line))) {
    finish();
    currentSection = { id: m[1], source: m[1][0], title: m[2], heading_line: i + 1, record_ids: [] };
    sections.push(currentSection);
    continue;
  }
  if ((m = RECORD_RE.exec(line))) {
    finish();
    if (!currentSection) { errors.push(`record ${m[1]} before any section`); }
    cur = {
      id: m[1],
      title: m[2],
      family: m[1][0],
      section_id: currentSection?.id ?? null,
      section_title: currentSection?.title ?? null,
      source: null,
      template: null,
      purpose: null,
      delivery: null,
      use_classification: null,
      offset_start: null,
      offset_end: null,
      excerpt: null,
      excerpt_length: null,
      claimed_length: null,
      length_matches_offsets: null,
      hash_verified: false,
      markdown_line: i + 1,
    };
    currentSection?.record_ids.push(m[1]);
    continue;
  }
  if (!cur) continue;
  if ((m = TEMPLATE_RE.exec(line))) { cur.template = m[1]; continue; }
  if ((m = PURPOSE_RE.exec(line))) { cur.purpose = m[1]; continue; }
  if ((m = DELIVERY_RE.exec(line))) {
    cur.delivery = m[1];
    cur.use_classification = m[2];
    if (!CLASSIFICATIONS.has(m[2])) errors.push(`${cur.id}: unknown classification ${m[2]}`);
    continue;
  }
  if ((m = REFERENCE_RE.exec(line))) {
    cur.source = m[1];
    if (m[2] !== cur.section_id) errors.push(`${cur.id}: reference section ${m[2]} != heading section ${cur.section_id}`);
    cur.offset_start = Number(m[3]);
    cur.offset_end = Number(m[4]);
    if (!(cur.offset_end > cur.offset_start)) errors.push(`${cur.id}: bad offsets`);
    cur.claimed_length = cur.offset_end - cur.offset_start;
    continue;
  }
  if (line === '<details><summary>Unchanged source excerpt</summary>') { inDetails = true; continue; }
  if (line === '</details>') { inDetails = false; continue; }
  if (inDetails && (m = EXCERPT_RE.exec(line))) {
    if (cur.excerpt !== null) errors.push(`${cur.id}: multiple excerpt lines`);
    cur.excerpt = m[1];
    cur.excerpt_length = Array.from(m[1]).length; // code points, matching the offset convention
    cur.length_matches_offsets = cur.excerpt_length === cur.claimed_length;
    continue;
  }
  if (line.trim() === '') continue;
  errors.push(`${cur.id}: unrecognized line ${i + 1}: ${line.slice(0, 60)}`);
}
finish();

// Uniqueness
const ids = new Set();
for (const r of records) {
  if (ids.has(r.id)) errors.push(`duplicate id ${r.id}`);
  ids.add(r.id);
}

// Sections that the framework names but that have no records in the supplied bank.
// These are recorded as named, not fabricated. Titles come from docs/01-source-framework.md prose.
const namedOnly = [
  { id: 'A08', source: 'A', title: 'Verbal cueing and interjection bridge (named in framework; no records supplied)' },
  { id: 'B00', source: 'B', title: 'Course overview and four phases (named in framework; no records supplied)' },
  { id: 'B01', source: 'B', title: 'Intent and logical certainty overview (named in framework; no records supplied)' },
  { id: 'B02', source: 'B', title: 'Setting call structure (named in framework; no records supplied)' },
  { id: 'B06', source: 'B', title: 'Process orientation and repetition (named in framework; no records supplied)' },
  { id: 'B12', source: 'B', title: 'Named in framework range B12–B16 (delivery/tonality); no records supplied' },
  { id: 'B13', source: 'B', title: 'Named in framework range B13–B16 (verbal cueing); no records supplied' },
  { id: 'B14', source: 'B', title: 'Named in framework range B13–B16 (delivery); no records supplied' },
  { id: 'B15', source: 'B', title: 'Named in framework range B13–B16 (delivery); no records supplied' },
  { id: 'B16', source: 'B', title: 'Pacing (named in framework; internal wording ambiguity noted); no records supplied' },
  { id: 'B22', source: 'B', title: 'Physiology/anchors claims (named in framework; not validated); no records supplied' },
  { id: 'B23', source: 'B', title: 'Sleep/isolation/burnout claims (named in framework; not validated); no records supplied' },
  { id: 'B25', source: 'B', title: 'Named in framework range B22–B25; no records supplied' },
];

const sectionsOut = sections
  .map((s) => ({ ...s, record_count: s.record_ids.length, records_supplied: true }))
  .concat(namedOnly.map((s) => ({ ...s, heading_line: null, record_ids: [], record_count: 0, records_supplied: false })))
  .sort((a, b) => a.id.localeCompare(b.id));

const byClass = {};
const byFamily = {};
const bySource = {};
for (const r of records) {
  byClass[r.use_classification] = (byClass[r.use_classification] ?? 0) + 1;
  byFamily[r.family] = (byFamily[r.family] ?? 0) + 1;
  bySource[r.source] = (bySource[r.source] ?? 0) + 1;
}
const lengthMismatches = records.filter((r) => r.length_matches_offsets === false).map((r) => ({ id: r.id, claimed: r.claimed_length, actual: r.excerpt_length }));

const validation = {
  generated_from: 'docs/02-organized-question-bank.md',
  package_sha256: packageHash,
  offset_convention: 'half-open [start, end) Unicode code-point offsets into the original single-line transcript for the named source (A or B)',
  raw_sources_supplied: false,
  hash_verification: 'pending — raw Source A / Source B transcripts are not in the supplied package; excerpts recorded as supplied',
  expected_record_count: 207,
  record_count: records.length,
  section_count_with_records: sections.length,
  section_count_named_only: namedOnly.length,
  brief_claims_section_count: 41,
  section_count_note: 'The brief states 41 source sections. Only 26 sections carry records in the supplied bank; 13 more are named in the framework. The remaining IDs cannot be reconciled from supplied files and are not invented.',
  by_classification: byClass,
  by_family: byFamily,
  by_source: bySource,
  excerpt_length_mismatches: lengthMismatches,
  errors,
  ok: errors.length === 0 && records.length === 207,
};

writeFileSync(resolve(outDir, 'source_question_records.json'), JSON.stringify(records, null, 2) + '\n');
writeFileSync(resolve(outDir, 'source_sections.json'), JSON.stringify(sectionsOut, null, 2) + '\n');
writeFileSync(resolve(outDir, 'source_package_validation.json'), JSON.stringify(validation, null, 2) + '\n');

console.log(JSON.stringify({ ok: validation.ok, records: records.length, sections: sections.length, byClass, byFamily, bySource, lengthMismatches: lengthMismatches.length, errors: errors.slice(0, 10) }, null, 2));
process.exit(validation.ok ? 0 : 1);
