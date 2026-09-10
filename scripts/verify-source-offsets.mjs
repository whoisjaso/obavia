#!/usr/bin/env node
/**
 * Source offset verifier (M-sources). Run when the raw transcripts arrive:
 *
 *     node scripts/verify-source-offsets.mjs
 *
 * Reads OPTIONAL raw transcripts:
 *   sources/source_a.txt   (Source A — brain-dump lesson + reviewed call)
 *   sources/source_b.txt   (Source B — multi-instructor course)
 *
 * For each present source it computes SHA-256 of the file bytes and, for every record in
 * data/source_question_records.json that belongs to that source, checks
 *
 *     Array.from(text).slice(offset_start, offset_end).join('') === excerpt
 *
 * i.e. the half-open [start, end) UNICODE CODE-POINT convention recorded by the parser
 * (String.prototype.slice would count UTF-16 units and drift after any astral character).
 *
 * Output: data/source_offset_verification.json — a SIBLING file. The parser's output
 * (data/source_package_validation.json) is never overwritten; its `hash_verified: false`
 * per record stays as the parser wrote it until the parser is re-run with the raw sources.
 *
 * When neither raw file exists the script prints "raw sources not supplied — verification
 * pending", still writes the sibling report (every record `source_missing`) and exits 0.
 * A mismatch exits 1. Excerpts are NEVER edited to fit an offset — a mismatch is reported.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const RECORDS_PATH = resolve(root, 'data/source_question_records.json');
const OUTPUT_PATH = resolve(root, 'data/source_offset_verification.json');
const SOURCE_PATHS = {
  A: resolve(root, 'sources/source_a.txt'),
  B: resolve(root, 'sources/source_b.txt'),
};
const OFFSET_CONVENTION =
  'half-open [start, end) Unicode code-point offsets into the original single-line transcript for the named source (A or B)';

/** @type {Array<{id:string, source:'A'|'B', offset_start:number, offset_end:number, excerpt:string}>} */
const records = JSON.parse(readFileSync(RECORDS_PATH, 'utf8'));

/** @type {Record<'A'|'B', {path:string, supplied:boolean, sha256:string|null, code_points:number|null, text:string[]|null}>} */
const sources = {};
for (const [id, path] of Object.entries(SOURCE_PATHS)) {
  if (existsSync(path)) {
    const bytes = readFileSync(path);
    const text = bytes.toString('utf8');
    const codePoints = Array.from(text); // code points, not UTF-16 units
    sources[id] = {
      path: relative(path),
      supplied: true,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      code_points: codePoints.length,
      text: codePoints,
    };
  } else {
    sources[id] = { path: relative(path), supplied: false, sha256: null, code_points: null, text: null };
  }
}

function relative(p) {
  return p.startsWith(root) ? p.slice(root.length + 1) : p;
}

const results = [];
let verified = 0;
let mismatches = 0;
let pending = 0;

for (const r of records) {
  const src = sources[r.source];
  if (!src || !src.supplied || !src.text) {
    pending += 1;
    results.push({ id: r.id, source: r.source, hash_verified: false, status: 'source_missing', note: `raw ${src?.path ?? r.source} not supplied` });
    continue;
  }
  const slice = src.text.slice(r.offset_start, r.offset_end).join('');
  if (slice === r.excerpt) {
    verified += 1;
    results.push({ id: r.id, source: r.source, hash_verified: true, status: 'verified' });
  } else {
    mismatches += 1;
    const firstDiff = firstDifference(slice, r.excerpt);
    results.push({
      id: r.id,
      source: r.source,
      hash_verified: false,
      status: 'mismatch',
      note: `slice length ${Array.from(slice).length} vs excerpt ${Array.from(r.excerpt).length}; first difference at code point ${firstDiff}`,
    });
  }
}

function firstDifference(a, b) {
  const aa = Array.from(a);
  const bb = Array.from(b);
  const n = Math.min(aa.length, bb.length);
  for (let i = 0; i < n; i += 1) if (aa[i] !== bb[i]) return i;
  return n;
}

const anySupplied = Object.values(sources).some((s) => s.supplied);
const report = {
  generated_by: 'scripts/verify-source-offsets.mjs',
  generated_at: new Date().toISOString(),
  offset_convention: OFFSET_CONVENTION,
  sources: Object.fromEntries(
    Object.entries(sources).map(([id, s]) => [id, { path: s.path, supplied: s.supplied, sha256: s.sha256, code_points: s.code_points }]),
  ),
  records: results,
  verified_count: verified,
  mismatch_count: mismatches,
  pending_count: pending,
  ok: mismatches === 0,
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log('Source offset verification');
console.log(`  records:            ${records.length}`);
for (const [id, s] of Object.entries(sources)) {
  console.log(`  Source ${id}:           ${s.supplied ? `${s.path} · sha256 ${s.sha256} · ${s.code_points} code points` : `${s.path} — not supplied`}`);
}
console.log(`  verified:           ${verified}`);
console.log(`  mismatches:         ${mismatches}`);
console.log(`  pending (no raw):   ${pending}`);
console.log(`  report written to:  ${relative(OUTPUT_PATH)}`);

if (!anySupplied) {
  console.log('\nraw sources not supplied — verification pending. Place sources/source_a.txt and sources/source_b.txt and re-run.');
  process.exit(0);
}
if (mismatches > 0) {
  console.error(`\n${mismatches} record(s) do not match their claimed offsets. Excerpts were NOT edited; fix the offsets or the source file, then re-run.`);
  for (const r of results.filter((x) => x.status === 'mismatch')) console.error(`  ${r.id} (${r.source}): ${r.note}`);
  process.exit(1);
}
console.log('\nAll supplied sources verified. Re-run scripts/parse-question-bank.mjs if per-record hash_verified flags should be regenerated by the parser.');
process.exit(0);
