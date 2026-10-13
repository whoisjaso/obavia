// Obavia cloud sound kit v2: deterministic synthesis, no dependencies.
// Spec: docs/design/cloud-system.md, section 3 (Sound); the press timing is section 2 and section 8.
// Run:  node tools/cloud-sfx/make.mjs
// Writes 16-bit PCM stereo WAV at 44.1 kHz into assets/cloud-sfx/, copies the UI files into every
// surface, then runs measure.mjs (README table) and contact.mjs (contact.png).
// Every random value comes from a seeded PRNG (and the dither too), so the output is byte-identical on every run.

import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SR, ms, TAU, mulberry32, white, pink, biquad, sweep, smooth, envAD, mul, scale, addInto, peakOf, pan,
  room, truePeakOf, wavBytes,
} from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'assets/cloud-sfx');
const SURFACES = ['obavia-co/audio/cloud', 'desk/public/sfx/cloud', 'auction/assets/sfx/cloud'];
const EDGE_FADE_MS = 2;
const db = (x) => Math.pow(10, x / 20);

// ---------- building blocks ----------
const stereo = (n) => [new Float64Array(n), new Float64Array(n)];
const addSt = (dst, [l, r], g = 1, at = 0) => { addInto(dst[0], l, g, at); addInto(dst[1], r, g, at); return dst; };
const mulSt = ([l, r], e) => [mul(l, e), mul(r, e)];
const peakSt = (s) => peakOf(s[0], s[1]);
const normSt = (s, to = 1) => { const g = to / peakSt(s); return [scale(s[0], g), scale(s[1], g)]; };
// mid plus a little decorrelated side: width without losing the centre
function airPair(n, seedM, seedS, width, gen = white) {
  const m = gen(n, seedM), s = gen(n, seedS);
  return [m.map((v, i) => v + width * s[i]), m.map((v, i) => v - width * s[i])];
}
const filtSt = (s, ...a) => [biquad(s[0], ...a), biquad(s[1], ...a)];

function edgeFades([l, r]) {
  const f = ms(EDGE_FADE_MS);
  const L = Float64Array.from(l), R = Float64Array.from(r);
  for (let i = 0; i < f; i++) {
    const g = smooth(i / f);
    L[i] *= g; R[i] *= g; L[L.length - 1 - i] *= g; R[R.length - 1 - i] *= g;
  }
  return [L, R];
}

// ---------- the puff: a granular air body over a soft thump ----------
// 64 grains of band-passed noise, 5 to 16 ms each, centre pitch spread across a fifth (1250 to 1870 Hz),
// onsets clustered at the front, each grain panned a little; a broad air bed under them; the whole
// shaped by a 4 ms raised-cosine attack and an exponential decay. Under it, a sine gliding 90 to 70 Hz
// for 30 ms at -24 dB so the finger feels mass (phone speakers barely reproduce it; the haptic carries it there).
function puff(n, seed) {
  const r = mulberry32(seed);
  const grains = stereo(n);
  const GRAINS = 64;
  for (let k = 0; k < GRAINS; k++) {
    const onset = k < 6 ? (k / 6) * 0.004 : 0.002 + -Math.log(1 - r() * 0.97) * 0.016;
    const len = ms(5 + r() * 11);
    const fc = 1250 * Math.pow(2, (r() * 7) / 12);
    const warm = ms(4);
    const nz = biquad(biquad(white(len + warm, (seed * 131 + k * 7919) >>> 0), 'bp', fc, 2.4), 'bp', fc, 2.4).subarray(warm);
    const g = new Float64Array(len);
    for (let i = 0; i < len; i++) g[i] = nz[i] * Math.sin((Math.PI * i) / len) ** 2 * (0.7 + 0.3 * r());
    addSt(grains, pan(g, (r() * 2 - 1) * 0.35), 1, ms(onset * 1000));
  }
  const bed = filtSt(filtSt(airPair(n, seed + 1, seed + 2, 0.3), 'hp', 650, 0.7), 'lp', 3600, 0.7);
  const body = addSt(normSt(grains), normSt(bed), 0.45);
  const shaped = normSt(mulSt(body, envAD(n, 0.004, 0.09)));
  const tn = ms(30), th = new Float64Array(n);
  let ph = 0;
  for (let i = 0; i < tn; i++) {
    const t = i / tn;
    ph += (TAU * (90 - 20 * t)) / SR;
    th[i] = Math.sin(ph) * smooth(i / ms(3)) * Math.cos((Math.PI / 2) * t) ** 2;
  }
  return addSt(shaped, [th, th], db(-24));
}

// ---------- the six sounds (dry; the room and the fades come after) ----------

// cloud-touch, 110 ms: press down. The puff.
const cloudTouch = () => puff(ms(110), 0x7101);

// cloud-rise, 240 ms: release, the re-inflation. Noise sweeping 600 to 2200 Hz, two peaking
// resonances climbing with it (formant-like), slow attack, a faint high breath of air at the end.
function cloudRise() {
  const n = ms(240);
  let s = airPair(n, 0x7201, 0x7202, 0.35);
  const f = sweep(600, 2200, 0, n);
  s = filtSt(filtSt(s, 'bp', f, 1.1), 'bp', f, 1.1);
  s = filtSt(s, 'peak', sweep(750, 1500, 0, n), 5, 8);
  s = filtSt(s, 'peak', sweep(1700, 2900, 0, n), 6, 6);
  const e = new Float64Array(n);
  const pk = 0.6;
  for (let i = 0; i < n; i++) { const t = i / n; e[i] = t < pk ? smooth(t / pk) ** 1.4 : Math.exp((-4.6 * (t - pk)) / (1 - pk)); }
  s = normSt(mulSt(s, e));
  let br = filtSt(airPair(n, 0x7203, 0x7204, 0.6), 'hp', 5200, 0.7);
  const eb = new Float64Array(n);
  for (let i = 0; i < n; i++) { const t = (i / SR - 0.165) / 0.07; eb[i] = t > 0 && t < 1 ? Math.sin(Math.PI * t) ** 2 : 0; }
  br = normSt(mulSt(br, eb));
  return addSt(s, br, db(-18));
}

// cloud-settle, 420 ms: a page or sheet lands. Air leaving: low-passed noise falling 500 to 220 Hz,
// long decay; above it, a very soft wide shimmer of two detuned narrow noise bands panned apart.
function cloudSettle() {
  const n = ms(420);
  let s = airPair(n, 0x7301, 0x7302, 0.25);
  const f = sweep(500, 220, 0, n);
  s = filtSt(filtSt(filtSt(s, 'lp', f, 0.707), 'lp', f, 0.707), 'hp', 70, 0.707);
  s = normSt(mulSt(s, envAD(n, 0.06, 0.75))); // 60 ms in: the sheet arrives on air, it does not hit
  const band = (seed, fc) => normSt([biquad(biquad(white(n, seed), 'bp', fc, 14), 'bp', fc, 14), new Float64Array(n)])[0];
  const es = new Float64Array(n);
  for (let i = 0; i < n; i++) { const t = i / n; es[i] = t < 0.25 ? smooth(t / 0.25) : Math.exp((-4 * (t - 0.25)) / 0.75); }
  const a = mul(band(0x7303, 2950), es), b = mul(band(0x7304, 3110), es);
  addSt(s, pan(a, -0.8), db(-22));
  addSt(s, pan(b, 0.8), db(-22));
  return s;
}

// cloud-drift, 1.6 s seamless loop: pink noise through two slowly moving band-passes, stereo width,
// no transient. The modulation is periodic in the loop (one cycle per 1.6 s, 0.625 Hz): a 0.2 Hz LFO
// cannot close inside 1.6 s, so it would jump at every wrap. Depth is shallow (a third of an octave)
// so the motion still reads slow. Rendered long, then the tail is crossfaded into the head
// (equal power, 200 ms). No edge fades on a loop: a fade at both ends would put a hole in every cycle.
// Surfaces start it at zero gain and let finger velocity bring it up.
function cloudDrift() {
  const N = ms(1600), X = ms(200), WARM = ms(700);
  const total = WARM + N + X;
  const lfo = (phase0, lo, hi) => (i) => {
    const p = (((i - WARM) % N) + N) % N / N;
    return lo * Math.pow(hi / lo, 0.5 + 0.5 * Math.sin(TAU * p + phase0));
  };
  const src = airPair(total, 0x7401, 0x7402, 0.5, pink);
  const ch = src.map((x, c) => {
    const off = c * 0.9; // left and right breathe out of phase: the image moves
    const a = biquad(biquad(x, 'bp', lfo(off, 480, 760), 1.3), 'bp', lfo(off, 480, 760), 1.3);
    const b = biquad(biquad(x, 'bp', lfo(off + 2.2, 1150, 1700), 1.6), 'bp', lfo(off + 2.2, 1150, 1700), 1.6);
    return a.map((v, i) => v + 0.6 * b[i]);
  });
  const wet = room(ch);
  return wet.map((b) => {
    const out = new Float64Array(N);
    for (let i = 0; i < N; i++) out[i] = b[WARM + i];
    for (let i = 0; i < X; i++) {
      const t = (i + 0.5) / X;
      out[i] = b[WARM + i] * Math.sin((Math.PI / 2) * t) + b[WARM + N + i] * Math.cos((Math.PI / 2) * t);
    }
    return out;
  });
}

// cloud-landed, 560 ms: an action completes. The puff, an upward air swell, and one soft harmonic
// bloom (C major triad, 1047, 1319, 1568 Hz, the Desk chime key) at BLOOM_DB for 200 ms, under the air.
// The brief set the bloom at -20 dB under the file peak. Measured there, each partial stood only 6 to 9 dB over
// the air per 5 Hz bin, about 7 dB under the air in its own critical band: masked, so not positive. It sits at
// -12 dB (-30 dBFS), 12 to 16 dB over the air per bin: audible as a soft harmony, still under the air.
const BLOOM_DB = -12;
function cloudLanded() {
  const n = ms(560);
  const s = normSt(puff(n, 0x7501));
  let sw = airPair(n, 0x7502, 0x7503, 0.4);
  const f = sweep(500, 1600, 0, ms(380));
  sw = filtSt(filtSt(sw, 'bp', f, 1.3), 'bp', f, 1.3);
  const e = new Float64Array(n);
  const pk = 0.42;
  for (let i = 0; i < n; i++) { const t = i / n; e[i] = t < pk ? smooth(t / pk) : Math.exp((-6 * (t - pk)) / (1 - pk)); }
  addSt(s, normSt(mulSt(sw, e)), 0.6);
  const bl = stereo(n), on = ms(130), bn = ms(200);
  [[1046.5, 1], [1318.51, 0.7], [1567.98, 0.5]].forEach(([hz, a], k) => {
    for (let c = 0; c < 2; c++) {
      const hzc = hz + (c ? 0.7 : -0.7); // a hair of detune between the ears: width, not a beat
      for (let i = 0; i < bn; i++) {
        const t = i / bn;
        const env = t < 0.14 ? smooth(t / 0.14) : Math.cos((Math.PI / 2) * ((t - 0.14) / 0.86)) ** 2;
        bl[c][on + i] += a * env * Math.sin((TAU * hzc * i) / SR + k);
      }
    }
  });
  return addSt(s, normSt(bl, peakSt(s)), db(BLOOM_DB));
}

// cloud-hover, 260 ms: pointer enter. The gentlest: pink noise rising through 500 to 1400 Hz,
// 120 ms attack, soft release. Mastered 8 dB under the kit. Once on enter, never on leave.
function cloudHover() {
  const n = ms(260);
  let s = airPair(n, 0x7601, 0x7602, 0.3, pink);
  const f = sweep(500, 1400, 0, n);
  s = filtSt(filtSt(s, 'bp', f, 1.2), 'bp', f, 1.2);
  const e = new Float64Array(n), a = ms(120);
  for (let i = 0; i < n; i++) e[i] = i < a ? smooth(i / a) : Math.exp((-6.2 * (i - a)) / (n - a));
  return mulSt(s, e);
}

// ---------- mastering: room, fades, true-peak-safe gain, seeded TPDF dither ----------
function master(st, peakDbfs, { loop = false } = {}) {
  let s = loop ? st : edgeFades(room(st));
  const tp = Math.max(truePeakOf(s[0]), truePeakOf(s[1]), peakSt(s));
  const target = db(peakDbfs) - 2 / 32768; // two LSB of headroom for the dither
  const g = target / tp;
  const r = mulberry32(0xd17e + Math.round(-peakDbfs * 10));
  const pcm = s.map((x) => {
    const p = new Int16Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const d = (r() - r()) * 0.5; // TPDF, half an LSB each way
      p[i] = Math.max(-32768, Math.min(32767, Math.round(x[i] * g * 32768 + d)));
    }
    return p;
  });
  if (!loop) for (const p of pcm) { p[0] = 0; p[p.length - 1] = 0; } // the dither must not undo the fade's zero ends
  return { pcm, float: s.map((x) => scale(x, g)) };
}

const KIT = [
  ['cloud-hover', cloudHover, -26],
  ['cloud-touch', cloudTouch, -18],
  ['cloud-rise', cloudRise, -18],
  ['cloud-settle', cloudSettle, -18],
  ['cloud-drift', cloudDrift, -18, { loop: true }],
  ['cloud-landed', cloudLanded, -18],
];

mkdirSync(OUT, { recursive: true });
const done = {};
for (const [name, fn, peak, opt] of KIT) {
  const m = master(fn(), peak, opt);
  done[name] = m;
  writeFileSync(join(OUT, `${name}.wav`), wavBytes(m.pcm));
  console.log(`wrote ${name}.wav`);
}

// cloud-press-full.wav: the shipped touch and rise, placed where the 3D button plays them
// (sink 0 to 100 ms: touch at 0; release puff 100 to 260 ms: rise at 100; settle to 400 ms).
// Both at the gain the UI plays them (1). For the contact sheet and the films, not for the UI.
{
  const n = ms(400);
  const s = stereo(n);
  addSt(s, done['cloud-touch'].float, 1, 0);
  addSt(s, done['cloud-rise'].float, 1, ms(100));
  const tp = Math.max(truePeakOf(s[0]), truePeakOf(s[1]));
  const lim = db(-18) - 2 / 32768;
  const g = tp > lim ? lim / tp : 1; // only ever lowered, to stay inside -18 dBFS
  const pcm = s.map((x) => Int16Array.from(x, (v) => Math.max(-32768, Math.min(32767, Math.round(v * g * 32768)))));
  writeFileSync(join(OUT, 'cloud-press-full.wav'), wavBytes(pcm));
  console.log(`wrote cloud-press-full.wav (overlap gain ${(20 * Math.log10(g)).toFixed(2)} dB)`);
}

// ---------- copy step: the UI files into every surface (press-full stays here) ----------
for (const dir of SURFACES) {
  const to = join(REPO, dir);
  mkdirSync(to, { recursive: true });
  for (const [name] of KIT) copyFileSync(join(OUT, `${name}.wav`), join(to, `${name}.wav`));
  console.log(`copied ${KIT.length} files to ${dir}/`);
}

await import('./measure.mjs');
await import('./contact.mjs');
