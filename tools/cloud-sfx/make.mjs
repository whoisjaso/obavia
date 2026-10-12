// Obavia cloud sound kit: deterministic synthesis, no dependencies.
// Spec: docs/design/cloud-system.md, section 3 (Sound).
// Run:  node tools/cloud-sfx/make.mjs
// Writes 16-bit PCM mono WAV at 44.1 kHz into assets/cloud-sfx/, plus waveforms.svg.
// Every random value comes from a seeded PRNG, so the output is byte-identical on every run.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../assets/cloud-sfx');
const SR = 44100;
const PEAK_DBFS = -18;
const PEAK = Math.pow(10, PEAK_DBFS / 20); // 0.1259
const EDGE_FADE_MS = 2;
const ROOM_MS = 180; // shared reverb tail
const ROOM_WET = 0.22;

const ms = (x) => Math.round((x / 1000) * SR);

// ---------- seeded PRNG (mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function white(n, seed) {
  const r = mulberry32(seed);
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
  return x;
}

// Paul Kellet's refined pink filter over seeded white noise.
function pink(n, seed) {
  const w = white(n, seed);
  const x = new Float64Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const v = w[i];
    b0 = 0.99886 * b0 + v * 0.0555179;
    b1 = 0.99332 * b1 + v * 0.0750759;
    b2 = 0.969 * b2 + v * 0.153852;
    b3 = 0.8665 * b3 + v * 0.3104856;
    b4 = 0.55 * b4 + v * 0.5329522;
    b5 = -0.7616 * b5 - v * 0.016898;
    x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + v * 0.5362) * 0.11;
    b6 = v * 0.115926;
  }
  return x;
}

// ---------- biquad (RBJ cookbook), time-varying ----------
// kind: 'bp' (constant 0 dB peak), 'lp', 'hp'. freq: number or (i) => Hz. q: number.
function biquad(input, kind, freq, q) {
  const n = input.length;
  const out = new Float64Array(n);
  const fAt = typeof freq === 'function' ? freq : () => freq;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0, b1, b2, a1, a2;
  const BLOCK = 16; // recompute coefficients every 16 samples (0.36 ms), smooth enough for slow sweeps
  for (let i = 0; i < n; i++) {
    if (i % BLOCK === 0) {
      const f = Math.min(Math.max(fAt(i), 10), SR * 0.45);
      const w0 = (2 * Math.PI * f) / SR;
      const cw = Math.cos(w0), sw = Math.sin(w0);
      const alpha = sw / (2 * q);
      const a0 = 1 + alpha;
      if (kind === 'bp') { b0 = alpha; b1 = 0; b2 = -alpha; }
      else if (kind === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
      else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
      b0 /= a0; b1 /= a0; b2 /= a0;
      a1 = (-2 * cw) / a0; a2 = (1 - alpha) / a0;
    }
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

// Exponential (perceptually even) sweep from f0 to f1 across n samples, optionally over a sub-span.
const sweep = (f0, f1, n) => (i) => f0 * Math.pow(f1 / f0, Math.min(1, Math.max(0, i / (n - 1))));

// Band between lo and hi: geometric centre, Q = centre / bandwidth. Two stages for softer skirts.
function band(x, lo, hi) {
  const fc = Math.sqrt(lo * hi);
  const q = fc / (hi - lo);
  return biquad(biquad(x, 'bp', fc, q), 'bp', fc, q);
}

// ---------- envelopes ----------
const smooth = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t))); // raised cosine 0..1

// attack (raised cosine) then exponential decay reaching -60 dB at decayEnd.
function envAD(n, attackS, decayEndS) {
  const e = new Float64Array(n);
  const a = Math.max(1, attackS * SR);
  const d = Math.max(1, (decayEndS - attackS) * SR);
  for (let i = 0; i < n; i++) {
    e[i] = i < a ? smooth(i / a) : Math.exp((-6.9 * (i - a)) / d);
  }
  return e;
}

function mul(x, e) { const y = new Float64Array(x.length); for (let i = 0; i < x.length; i++) y[i] = x[i] * e[i]; return y; }
function add(x, y, gy = 1) { const z = new Float64Array(x.length); for (let i = 0; i < x.length; i++) z[i] = x[i] + gy * y[i]; return z; }
function peakOf(x) { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; }
function scale(x, g) { const y = new Float64Array(x.length); for (let i = 0; i < x.length; i++) y[i] = x[i] * g; return y; }

// ---------- the one room ----------
// A tiny convolution reverb: 180 ms of seeded decaying noise (-60 dB at 180 ms),
// softened by a one-pole low-pass so the tail is air, not hiss. Every sound goes through it.
const ROOM = (() => {
  const n = ms(ROOM_MS);
  const w = white(n, 0x0b4c1a);
  const ir = new Float64Array(n);
  let lp = 0;
  const k = 1 - Math.exp((-2 * Math.PI * 3500) / SR);
  for (let i = 0; i < n; i++) {
    lp += k * (w[i] - lp);
    const t = i / n;
    const onset = smooth(i / ms(6)); // 6 ms pre-diffusion, no hard first reflection
    ir[i] = lp * Math.exp(-6.9 * t) * onset;
  }
  let energy = 0; for (const v of ir) energy += v * v;
  const g = 1 / Math.sqrt(energy);
  for (let i = 0; i < n; i++) ir[i] *= g;
  return ir;
})();

// Linear convolution truncated to input length (tail inside the file), or circular for loops.
function room(dry, { circular = false } = {}) {
  const n = dry.length, m = ROOM.length;
  const wet = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = dry[i];
    if (v === 0) continue;
    for (let j = 0; j < m; j++) {
      let k = i + j;
      if (k >= n) { if (!circular) break; k -= n; }
      wet[k] += v * ROOM[j];
    }
  }
  return add(dry, wet, ROOM_WET);
}

function edgeFades(x) {
  const y = Float64Array.from(x);
  const f = ms(EDGE_FADE_MS);
  for (let i = 0; i < f; i++) {
    const g = smooth(i / f);
    y[i] *= g;
    y[y.length - 1 - i] *= g;
  }
  return y;
}

// ---------- the five sounds ----------

// cloud-touch: 90 ms, band-passed noise 900 to 2400 Hz, fast attack, soft decay. The puff.
function puff(n, seed) {
  const nz = band(white(n, seed), 900, 2400);
  return mul(nz, envAD(n, 0.004, 0.06));
}
function cloudTouch() {
  const n = ms(90);
  return edgeFades(room(puff(n, 0x7001)));
}

// cloud-rise: 220 ms, noise sweeping upward 700 to 1800 Hz, slow attack. The breath in.
function cloudRise() {
  const n = ms(220);
  const f = sweep(700, 1800, n);
  const nz = biquad(biquad(white(n, 0x7002), 'bp', f, 2.2), 'bp', f, 2.2);
  const e = new Float64Array(n);
  const peakAt = 0.62; // slow attack to 62 percent of the length, then soft release
  for (let i = 0; i < n; i++) {
    const t = i / n;
    e[i] = t < peakAt ? Math.pow(smooth(t / peakAt), 1.4) : Math.exp((-5.5 * (t - peakAt)) / (1 - peakAt));
  }
  return edgeFades(room(mul(nz, e)));
}

// cloud-settle: 380 ms, low-passed noise, cutoff 200 to 600 Hz, long decay. The air leaving.
function cloudSettle() {
  const n = ms(380);
  const f = sweep(200, 600, n);
  const nz = biquad(biquad(white(n, 0x7003), 'lp', f, 0.707), 'lp', f, 0.707);
  return edgeFades(room(mul(nz, envAD(n, 0.03, 0.55)))); // about -40 dB at the last sample: a long exhale, not a thump
}

// cloud-drift: 1.2 s seamless loop, pink noise through 400 to 1200 Hz, no transient.
// Rendered long, then the loop point is crossfaded (equal power, 120 ms) so the wrap is continuous.
// No edge fades here: a fade at both ends of a loop would put a 4 ms hole at every wrap.
// The surface starts it at zero gain (gain follows finger velocity), so the first start cannot click.
function cloudDrift() {
  const N = ms(1200);
  const X = ms(120);
  const WARM = ms(400); // let the filters and the room settle before the part we keep
  const total = WARM + N + X;
  let b = pink(total, 0x7004);
  b = biquad(biquad(b, 'hp', 400, 0.707), 'hp', 400, 0.707);
  b = biquad(biquad(b, 'lp', 1200, 0.707), 'lp', 1200, 0.707);
  b = room(b);
  b = b.subarray(WARM);
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) out[i] = b[i];
  for (let i = 0; i < X; i++) {
    const t = (i + 0.5) / X;
    const gin = Math.sin((Math.PI / 2) * t);
    const gout = Math.cos((Math.PI / 2) * t);
    out[i] = b[i] * gin + b[N + i] * gout; // tail of the loop flows into its head
  }
  // One slow breath per loop (8 percent depth), periodic in the loop length so it stays seamless.
  for (let i = 0; i < N; i++) out[i] *= 1 + 0.08 * Math.sin((2 * Math.PI * i) / N);
  return out;
}

// cloud-landed: 520 ms, the puff plus a soft air swell with a slight upward sweep. The one swell.
function cloudLanded() {
  const n = ms(520);
  const p = puff(n, 0x7005);
  const f = sweep(650, 1100, n);
  const sw = biquad(biquad(white(n, 0x7006), 'bp', f, 1.4), 'bp', f, 1.4);
  const e = new Float64Array(n);
  const peakAt = 0.48;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    e[i] = t < peakAt ? smooth(t / peakAt) : Math.exp((-6.2 * (t - peakAt)) / (1 - peakAt));
  }
  // Swell sits under the puff: matched so the puff leads and the swell carries.
  const swell = mul(sw, e);
  const mix = add(scale(p, 1 / peakOf(p)), scale(swell, 0.62 / peakOf(swell)));
  return edgeFades(room(mix));
}

// ---------- output ----------
function toPcm16(x) {
  const g = PEAK / peakOf(x);
  const pcm = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = Math.round(x[i] * g * 32767);
    pcm[i] = Math.max(-32768, Math.min(32767, v));
  }
  return pcm;
}

function wav(pcm) {
  const data = pcm.length * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + data, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(data, 40);
  for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
  return buf;
}

const KIT = [
  ['cloud-touch', cloudTouch, 'press down'],
  ['cloud-rise', cloudRise, 'release, re-inflate'],
  ['cloud-settle', cloudSettle, 'page or sheet settles'],
  ['cloud-drift', cloudDrift, 'drag, looped'],
  ['cloud-landed', cloudLanded, 'action completed'],
];

mkdirSync(OUT, { recursive: true });
const rendered = [];
for (const [name, fn, role] of KIT) {
  const pcm = toPcm16(fn());
  writeFileSync(join(OUT, `${name}.wav`), wav(pcm));
  let p = 0; for (const v of pcm) p = Math.max(p, Math.abs(v));
  const durMs = (pcm.length / SR) * 1000;
  const peakDb = 20 * Math.log10(p / 32767);
  rendered.push({ name, role, pcm, durMs, peakDb });
  const extra = name === 'cloud-drift'
    ? `  wrap jump ${Math.abs(pcm[0] - pcm[pcm.length - 1])} (median step ${medianStep(pcm)})`
    : `  ends ${pcm[0]}/${pcm[pcm.length - 1]}`;
  console.log(`${(name + '.wav').padEnd(18)} ${durMs.toFixed(1).padStart(7)} ms  ${pcm.length.toString().padStart(6)} samples  peak ${peakDb.toFixed(2)} dBFS${extra}`);
}

function medianStep(pcm) {
  const d = [];
  for (let i = 1; i < pcm.length; i++) d.push(Math.abs(pcm[i] - pcm[i - 1]));
  d.sort((a, b) => a - b);
  return d[d.length >> 1];
}

// ---------- contact sheet (SVG, no canvas) ----------
// Shared time axis so relative lengths read true. Min/max per column, mirrored, icy blue on ink.
{
  const W = 1200, ROW = 132, PAD = 28, LABEL = 210;
  const plotW = W - LABEL - PAD;
  const maxMs = 1200;
  const H = PAD + rendered.length * ROW + 30;
  const full = 32767 * PEAK; // rows scaled to the -18 dBFS ceiling
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n`;
  s += `<rect width="${W}" height="${H}" fill="#1C2436"/>\n`;
  s += `<g font-family="-apple-system, Helvetica, Arial, sans-serif" fill="#E9EFFE">\n`;
  rendered.forEach((r, k) => {
    const y0 = PAD + k * ROW;
    const mid = y0 + ROW / 2 - 6;
    const half = ROW / 2 - 22;
    const cols = Math.max(1, Math.round((r.durMs / maxMs) * plotW));
    const per = r.pcm.length / cols;
    const top = [], bot = [];
    for (let c = 0; c < cols; c++) {
      let lo = 0, hi = 0;
      const a = Math.floor(c * per), b = Math.min(r.pcm.length, Math.floor((c + 1) * per) + 1);
      for (let i = a; i < b; i++) { const v = r.pcm[i]; if (v > hi) hi = v; if (v < lo) lo = v; }
      const x = (LABEL + c).toFixed(1);
      top.push(`${x},${(mid - (hi / full) * half).toFixed(1)}`);
      bot.unshift(`${x},${(mid - (lo / full) * half).toFixed(1)}`);
    }
    s += `<line x1="${LABEL}" y1="${mid}" x2="${W - PAD}" y2="${mid}" stroke="#E9EFFE" stroke-opacity="0.10"/>\n`;
    s += `<polygon points="${top.join(' ')} ${bot.join(' ')}" fill="#A9C4F5" fill-opacity="0.85"/>\n`;
    s += `<text x="${PAD}" y="${mid - 6}" font-size="15" letter-spacing="1.5">${r.name.toUpperCase()}</text>\n`;
    s += `<text x="${PAD}" y="${mid + 16}" font-size="12" fill-opacity="0.6">${Math.round(r.durMs)} ms, peak ${r.peakDb.toFixed(1)} dBFS</text>\n`;
  });
  for (let t = 0; t <= maxMs; t += 200) {
    const x = LABEL + (t / maxMs) * plotW;
    s += `<text x="${x.toFixed(1)}" y="${H - 12}" font-size="11" fill-opacity="0.5" text-anchor="middle">${t} ms</text>\n`;
  }
  s += `</g>\n</svg>\n`;
  writeFileSync(join(OUT, 'waveforms.svg'), s);
}
