// The reads count: the words a person must read to act, per screen, against the committed baseline.
// node reads.mjs <shotdir> <baseline.json> [--write-baseline] [--strict]
// Reads <shotdir>/walk.json and every NN-key.json the walk wrote; writes <shotdir>/reads.json and
// <shotdir>/report.md; prints the table. Exits 1 when the walk failed, when a screen gains reads over its
// baseline, when a screen is new to the baseline, or (with --strict) when a screen is over the ceiling.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DIR = args.find(a => !a.startsWith('--'));
const BASE = args.filter(a => !a.startsWith('--'))[1];
const WRITE = args.includes('--write-baseline');
const STRICT = args.includes('--strict');
if (!DIR || !BASE) { console.error('usage: node reads.mjs <shotdir> <baseline.json> [--write-baseline] [--strict]'); process.exit(2); }

const CEILING = 3;   // DOCTRINE §4 rules 9 and 15 and CP1: three words to act on a scanner surface, the kept reads aside

/* Names and places the fixture shows in the platform face: scanned like a sign, not read. Bodoni names
   are scanned by face. Add a line here only for a proper noun, never for a sentence. */
const NAMES = [/^Triple J Auto( · \w+)?$/, /^\d+ Example (St|Ave|Ln)\b/, /^Marisol Treviño$/, /^Maximiliano Echeverría-Ortiz$/];
/* The deposit line, wherever it lands (the deposit page, the held line under Bid): a kept read. */
const DEPOSIT_LINE = /(refunded|back) if you lose/i;

const words = s => s.split(/\s+/).filter(w => /\p{L}/u.test(w));
const isBodoni = t => /bodoni/i.test(t.fam);
const isNumber = t => !/\p{L}/u.test(t.text) || (/\d/.test(t.text) && words(t.text).length <= 3);
const centre = t => [t.r[0] + t.r[2] / 2, t.r[1] + t.r[3] / 2];
/* a label of one or two words touching a number or a Bodoni figure (Retail beside $7,995, Balance over
   $6,499, Where over the dealer): the Lego placement, scanned with the thing it names */
function labelOnAThing(t, all) {
  if (words(t.text).length > 2) return false;
  const [x, y] = centre(t);
  return all.some(o => o !== t && (isBodoni(o) || isNumber(o)) && (() => {
    const [ox, oy] = centre(o);
    const sameRow = Math.abs(oy - y) < 20;
    const stacked = Math.abs(ox - x) < 140 && Math.abs(oy - y) < 80;
    return sameRow || stacked;
  })());
}

/* Every run lands in exactly one class. Only `verb` and `read` are reads; `kept` is shown apart. */
function classify(shot) {
  const out = [];
  const primaryTaps = new Set(shot.tappables.filter(t => t.primary).map(t => t.i));
  const firstInTap = new Set();
  for (const t of shot.text) {
    const n = words(t.text).length;
    let cls;
    if (t.terms) cls = 'kept:terms';
    else if (DEPOSIT_LINE.test(t.text)) cls = 'kept:deposit';
    else if (shot.kept === 'document' && !t.primary) cls = 'kept:document';
    else if (t.primary || (t.tap !== null && primaryTaps.has(t.tap)) || (shot.choices && t.tap !== null)) {
      // the one action's word (or each choice's word, when the decision is a set of words); a second run
      // inside the same control is its detail (Bank: "transfer, clears Fri"; Buyers Guide: "next"), scanned
      cls = firstInTap.has(t.tap) ? 'detail' : 'verb'; firstInTap.add(t.tap);
    }
    else if (n === 0) cls = 'scan';
    else if (isBodoni(t)) cls = 'scan';                     // money and names
    else if (isNumber(t)) cls = 'scan';                     // a count, a time, a code
    else if (NAMES.some(rx => rx.test(t.text))) cls = 'scan';
    else if (t.tap !== null) cls = 'offer';                 // a secondary on the glass, not read to act
    else if (labelOnAThing(t, shot.text)) cls = 'scan';
    else cls = 'read';
    out.push({ text: t.text, cls, words: n });
  }
  // a carved verb drawn as an image has no DOM text; the spec names the word on the cloud
  if (shot.verb && !out.some(o => o.cls === 'verb')) out.push({ text: shot.verb, cls: 'verb', words: words(shot.verb).length });
  const sum = c => out.filter(o => c(o.cls)).reduce((a, o) => a + o.words, 0);
  return { runs: out, verb: sum(c => c === 'verb'), read: sum(c => c === 'read'), kept: sum(c => c.startsWith('kept')), keptWhich: [...new Set(out.filter(o => o.cls.startsWith('kept')).map(o => o.cls.slice(5)))] };
}

const walk = JSON.parse(fs.readFileSync(path.join(DIR, 'walk.json'), 'utf8'));
const files = fs.readdirSync(DIR).filter(f => /^\d\d-.+\.json$/.test(f)).sort();
const rows = files.map(f => {
  const shot = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const c = classify(shot);
  return { key: shot.key, title: shot.title, file: shot.file, first: shot.firstTappable, checks: shot.checks, ...c, must: c.verb + c.read };
});

const baseline = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : null;
const problems = [];
for (const r of rows) {
  const b = baseline?.screens?.[r.key];
  r.base = b ? b.must : null;
  if (!baseline) r.verdict = 'no baseline';
  else if (!b) { r.verdict = 'new screen'; problems.push(`${r.key}: not in the baseline (a new screen; write its row in one-action.md, then --write-baseline)`); }
  else if (r.must > b.must) { r.verdict = `+${r.must - b.must} reads`; problems.push(`${r.key}: ${r.must} words to read, baseline ${b.must} (${r.runs.filter(o => o.cls === 'read' || o.cls === 'verb').map(o => `"${o.text}"`).join(', ')})`); }
  else if (r.must < b.must) r.verdict = `${r.must - b.must} reads`;
  else r.verdict = 'same';
  r.over = r.must > CEILING;
  if (STRICT && r.over) problems.push(`${r.key}: ${r.must} words to read, over the ceiling of ${CEILING}`);
}
const missing = baseline ? Object.keys(baseline.screens).filter(k => !rows.some(r => r.key === k)) : [];

const complete = walk.reached === walk.of;
if (WRITE && !complete) console.log(`baseline NOT written: the walk stopped at step ${walk.reached} of ${walk.of}`);
if (WRITE && complete) {
  const screens = Object.fromEntries(rows.map(r => [r.key, { title: r.title, must: r.must, verb: r.verb, read: r.read, kept: r.kept, words: r.runs.filter(o => o.cls === 'verb' || o.cls === 'read').map(o => o.text) }]));
  fs.writeFileSync(BASE, JSON.stringify({ written: new Date().toISOString().slice(0, 10), from: path.basename(DIR), ceiling: CEILING, screens }, null, 1) + '\n');
}

/* the table */
const pad = (s, n) => String(s).padEnd(n);
const head = `${pad('screen', 18)} ${pad('verb', 4)} ${pad('read', 4)} ${pad('must', 4)} ${pad('base', 4)} ${pad('kept', 9)} ${pad('ceiling', 7)} verdict`;
console.log(head); console.log('-'.repeat(head.length + 10));
for (const r of rows) console.log(`${pad(r.key, 18)} ${pad(r.verb, 4)} ${pad(r.read, 4)} ${pad(r.must, 4)} ${pad(r.base ?? '-', 4)} ${pad(r.kept ? `${r.kept} ${r.keptWhich.join('+')}` : '-', 9)} ${pad(r.over ? 'OVER' : 'ok', 7)} ${r.verdict}`);
for (const k of missing) console.log(`${pad(k, 18)} (in the baseline, not reached this run)`);

const walkFailed = walk.failures.length > 0 || walk.reached < walk.of;
const failed = walkFailed || problems.length > 0;

/* the report beside the shots: the Phase 0 exit evidence */
const md = [];
md.push(`# Phase 0 exit walk, ${walk.at.slice(0, 16).replace('T', ' ')} UTC`);
md.push('');
md.push(`Exit test (docs/plan/obavia-auction-phases.md, Phase 0): the web walkthrough (\`?win=1\`) runs Lane to Won to Plates without a page that needs reading beyond the four kept reads (the deposit line, the terms on the first bid, the Buyers Guide, the bill of sale).`);
md.push('');
md.push(`Result: **${failed ? 'FAIL' : 'PASS'}**. Walk ${walk.reached} of ${walk.of} steps, ${rows.length} screens, ${walk.failures.length} walk failures, ${problems.length} reads failures${baseline ? '' : ' (no baseline yet: this run wrote it)'}. Viewport ${walk.viewport}, local engine, no Worker, seeded fixture.`);
md.push('');
if (walk.failures.length) { md.push('## Walk failures'); md.push(''); for (const f of walk.failures) md.push(`- ${f.screen}: ${f.what}`); md.push(''); }
if (problems.length) { md.push('## Reads failures'); md.push(''); for (const p of problems) md.push(`- ${p}`); md.push(''); }
if (walk.notes.length) { md.push('## Notes'); md.push(''); for (const n of walk.notes) md.push(`- ${n}`); md.push(''); }
md.push('## Reads per screen');
md.push('');
md.push(`verb: words in the one action (or the set of words when the decision is a choice). read: other words on the glass a person must read to act. must = verb + read, compared with the baseline. kept: words of the four kept reads, counted apart and never failed. Ceiling: ${CEILING} (DOCTRINE §4 rule 9); OVER is reported, and fails only with --strict.`);
md.push('');
md.push('| # | Screen | First tappable | Verb | Read | Must | Baseline | Kept | Ceiling | Verdict | Words counted | Kept words |');
md.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
rows.forEach((r, i) => md.push(`| ${i + 1} | ${r.title} | ${(r.first ?? 'none').replace(/\|/g, '/')} | ${r.verb} | ${r.read} | ${r.must} | ${r.base ?? '-'} | ${r.kept ? `${r.kept} (${r.keptWhich.join(', ')})` : '-'} | ${r.over ? 'OVER' : 'ok'} | ${r.verdict}${r.checks.length ? `; walk: ${r.checks.join(', ')}` : ''} | ${r.runs.filter(o => o.cls === 'verb' || o.cls === 'read').map(o => o.text).join(' / ').replace(/\|/g, '/') || 'none'} | ${r.runs.filter(o => o.cls.startsWith('kept')).map(o => o.text).join(' / ').replace(/\|/g, '/') || '-'} |`));
md.push('');
md.push('## Screenshots');
md.push('');
for (const s of walk.shots) md.push(`- \`${path.join(DIR, s.file)}\` ${s.title}`);
md.push('');
fs.writeFileSync(path.join(DIR, 'report.md'), md.join('\n'));
fs.writeFileSync(path.join(DIR, 'reads.json'), JSON.stringify({ rows, problems, missing }, null, 1));

console.log('');
for (const p of problems) console.log(`FAIL ${p}`);
console.log(`reads: ${rows.length} screens, ${problems.length} failures, ${rows.filter(r => r.over).length} over the ceiling of ${CEILING}${WRITE && complete ? `; baseline written to ${BASE}` : ''}`);
console.log(`report: ${path.join(DIR, 'report.md')}`);
process.exit(failed ? 1 : 0);
