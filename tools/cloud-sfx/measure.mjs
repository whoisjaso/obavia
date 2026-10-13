// Obavia cloud sound kit v2: verification. Reads the WAVs back from assets/cloud-sfx/ (what ships,
// not what was intended), prints the measurements, and rewrites the table in the README between
// the measurements markers. Run alone:  node tools/cloud-sfx/measure.mjs  (make.mjs runs it too).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, ms, readWav, truePeakOf, roomIR, rt60Of, ROOM, fft } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../assets/cloud-sfx');
const FILES = ['cloud-hover', 'cloud-touch', 'cloud-rise', 'cloud-settle', 'cloud-drift', 'cloud-landed', 'cloud-press-full'];
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-inf');

// 8 ms RMS envelope of the mono sum, one value per millisecond
function envelope(m) {
  const w = ms(8), h = ms(1), e = [];
  for (let i = 0; i + w <= m.length; i += h) { let s = 0; for (let j = i; j < i + w; j++) s += m[j] * m[j]; e.push(Math.sqrt(s / w)); }
  return e;
}
// spectral centroid (Hz) of the mono sum over [a, b)
function centroid(m, a, b) {
  const N = 1024; let num = 0, den = 0;
  for (let s = a; s < b; s += N / 4) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N && s + i < b; i++) re[i] = m[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; num += p * (k * SR) / N; den += p; }
  }
  return den ? num / den : 0;
}

export function measure(name) {
  const w = readWav(readFileSync(join(OUT, `${name}.wav`)));
  const [L, R] = w.chans;
  const mono = L.map((v, i) => (v + (R ? R[i] : v)) / 2);
  let pk = 0, ss = 0, lr = 0, ll = 0, rr = 0;
  for (const c of w.chans) for (const v of c) { pk = Math.max(pk, Math.abs(v)); ss += v * v; }
  for (let i = 0; i < w.n; i++) { lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i]; }
  const tp = Math.max(...w.chans.map(truePeakOf));
  const env = envelope(mono);
  const top = env.indexOf(Math.max(...env));
  let down = -1;
  for (let i = top; i < env.length; i++) if (env[i] < env[top] * 0.1) { down = i; break; }
  const third = Math.floor(w.n / 3);
  const r = {
    name, ch: w.ch, bits: w.bits, sr: w.sr,
    durMs: (w.n / w.sr) * 1000,
    peak: dB(pk), truePeak: dB(tp), rms: dB(Math.sqrt(ss / (w.n * w.ch))),
    peakAtMs: top + 4, minus20Ms: down < 0 ? null : down - top,
    cStart: centroid(mono, 0, third), cEnd: centroid(mono, 2 * third, w.n),
    corr: lr / Math.sqrt(ll * rr),
    ends: w.chans.map((c) => [Math.round(c[0] * 32768), Math.round(c[w.n - 1] * 32768)]),
  };
  if (name === 'cloud-landed') {
    // the bloom: each partial's level against the median of the air around it (plus or minus 150 Hz), 130 to 330 ms
    const N = 8192, a = ms(130), re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < ms(200); i++) re[i] = mono[a + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / ms(200)));
    fft(re, im);
    const P = (k) => re[k] * re[k] + im[k] * im[k];
    r.bloom = [1046.5, 1318.51, 1567.98].map((hz) => {
      const k0 = Math.round((hz * N) / SR), span = Math.round((150 * N) / SR), guard = Math.round((15 * N) / SR);
      let pk = 0; for (let k = k0 - 2; k <= k0 + 2; k++) pk = Math.max(pk, P(k));
      const around = [];
      for (let k = k0 - span; k <= k0 + span; k++) if (Math.abs(k - k0) > guard) around.push(P(k));
      around.sort((x, y) => x - y);
      return 10 * Math.log10(pk / around[around.length >> 1]);
    });
  }
  if (name === 'cloud-drift') {
    // the wrap: the step from the last sample back to the first, against every other step in the file
    const steps = [];
    let wrap = 0;
    for (const c of w.chans) {
      for (let i = 1; i < w.n; i++) steps.push(Math.abs(c[i] - c[i - 1]));
      wrap = Math.max(wrap, Math.abs(c[0] - c[w.n - 1]));
    }
    steps.sort((a, b) => a - b);
    const q = (p) => steps[Math.floor(p * (steps.length - 1))];
    const rank = steps.findIndex((s) => s >= wrap) / steps.length;
    const win = ms(50); let a = 0, b = 0;
    for (const c of w.chans) for (let i = 0; i < win; i++) { a += c[w.n - win + i] ** 2; b += c[i] ** 2; }
    r.loop = { wrapLsb: wrap * 32768, medianLsb: q(0.5) * 32768, p99Lsb: q(0.99) * 32768, rank, edgeRmsDb: 10 * Math.log10(b / a) };
  }
  return r;
}

const ir = roomIR();
const rt = Math.min(rt60Of(ir[0]), rt60Of(ir[1]));
const rows = FILES.map(measure);

let t = `| File | Ch | Length | Sample peak | True peak | RMS | Peak at | Peak to -20 dB | Centroid, first third to last third | L/R correlation |\n`;
t += `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
for (const r of rows) {
  t += `| \`${r.name}.wav\` | ${r.ch} | ${r.durMs.toFixed(1)} ms | ${f1(r.peak)} dBFS | ${f1(r.truePeak)} dBFS | ${f1(r.rms)} dBFS | ${r.peakAtMs} ms | ${r.minus20Ms == null ? 'n/a' : r.minus20Ms + ' ms'} | ${Math.round(r.cStart)} Hz to ${Math.round(r.cEnd)} Hz | ${r.corr.toFixed(2)} |\n`;
}
const d = rows.find((r) => r.name === 'cloud-drift').loop;
t += `\nDrift loop point: the wrap step (last sample to first) is ${d.wrapLsb.toFixed(0)} LSB against a median sample step of ${d.medianLsb.toFixed(0)} LSB and a 99th percentile of ${d.p99Lsb.toFixed(0)} LSB; it ranks at percentile ${(d.rank * 100).toFixed(0)} of all steps in the file, so the wrap is an ordinary sample step, not a click. RMS of the first 50 ms against the last 50 ms: ${d.edgeRmsDb >= 0 ? '+' : ''}${d.edgeRmsDb.toFixed(1)} dB.\n`;
const bl = rows.find((r) => r.name === 'cloud-landed').bloom;
t += `\nLanded bloom: the three partials stand ${bl.map((v) => v.toFixed(1)).join(', ')} dB above the median of the air within 150 Hz of each (1047, 1319 and 1568 Hz, 130 to 330 ms).\n`;
t += `\nRoom: measured RT60 ${(rt * 1000).toFixed(0)} ms (T20, Schroeder backward integration of the impulse response), pre-delay ${ROOM.preDelayMs} ms, damping low-pass ${ROOM.dampHz} Hz inside every loop, the same send on every file.\n`;
t += `\nOne-shot end samples (L first/last, R first/last): ${rows.filter((r) => r.name !== 'cloud-drift').map((r) => `${r.name.replace('cloud-', '')} ${r.ends.map((e) => e.join('/')).join(', ')}`).join('; ')}.\n`;

console.log('\n' + t);
const readme = join(OUT, 'README.md');
const src = readFileSync(readme, 'utf8');
const A = '<!-- measurements -->', B = '<!-- /measurements -->';
if (src.includes(A) && src.includes(B)) {
  writeFileSync(readme, src.slice(0, src.indexOf(A) + A.length) + '\n' + t + src.slice(src.indexOf(B)));
  console.log('README measurements updated');
}
export { rows, rt };
