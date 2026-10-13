// Obavia cloud sound kit v2: shared DSP. No dependencies; every random value is seeded.
// Used by make.mjs (synthesis), measure.mjs (verification) and contact.mjs (the contact sheet).

export const SR = 44100;
export const ms = (x) => Math.round((x / 1000) * SR);
export const TAU = 2 * Math.PI;

// ---------- seeded PRNG (mulberry32) ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function white(n, seed) {
  const r = mulberry32(seed);
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
  return x;
}

// Paul Kellet's refined pink filter over seeded white noise.
export function pink(n, seed) {
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
// kind: 'bp' (0 dB peak), 'lp', 'hp', 'peak' (gainDb). freq: Hz or (i) => Hz.
export function biquad(input, kind, freq, q, gainDb = 0) {
  const n = input.length;
  const out = new Float64Array(n);
  const fAt = typeof freq === 'function' ? freq : () => freq;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  const A = Math.pow(10, gainDb / 40);
  const BLOCK = 16; // coefficients every 16 samples (0.36 ms): smooth for any sweep here
  for (let i = 0; i < n; i++) {
    if (i % BLOCK === 0) {
      const f = Math.min(Math.max(fAt(i), 10), SR * 0.45);
      const w0 = (TAU * f) / SR;
      const cw = Math.cos(w0), sw = Math.sin(w0);
      const alpha = sw / (2 * q);
      let a0;
      if (kind === 'bp') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
      else if (kind === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
      else if (kind === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
      else { b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; }
      b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    }
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

// Exponential (perceptually even) sweep f0 to f1 between samples a and b.
export const sweep = (f0, f1, a, b) => (i) => f0 * Math.pow(f1 / f0, Math.min(1, Math.max(0, (i - a) / Math.max(1, b - a))));

// ---------- envelopes and vector helpers ----------
export const smooth = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
// raised-cosine attack, then exponential decay reaching -60 dB at decayEndS
export function envAD(n, attackS, decayEndS, startS = 0) {
  const e = new Float64Array(n);
  const s = startS * SR, a = Math.max(1, attackS * SR), d = Math.max(1, (decayEndS - attackS) * SR);
  for (let i = 0; i < n; i++) {
    const k = i - s;
    e[i] = k < 0 ? 0 : k < a ? smooth(k / a) : Math.exp((-6.9 * (k - a)) / d);
  }
  return e;
}
export const mul = (x, e) => x.map((v, i) => v * e[i]);
export const scale = (x, g) => x.map((v) => v * g);
export function addInto(dst, src, g = 1, at = 0) {
  for (let i = 0; i < src.length && at + i < dst.length; i++) if (at + i >= 0) dst[at + i] += g * src[i];
  return dst;
}
export function peakOf(...xs) { let p = 0; for (const x of xs) for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; }

// Equal-power pan of a mono signal: p in [-1, 1].
export function pan(x, p) {
  const th = ((p + 1) * Math.PI) / 4;
  return [scale(x, Math.cos(th) * Math.SQRT2), scale(x, Math.sin(th) * Math.SQRT2)];
}

// ---------- the one room: a feedback delay network ----------
// Two Schroeder all-pass diffusers smear the onset, then an 8-line FDN with an orthogonal
// Hadamard feedback matrix. Each line's loop gain is set from its length so the broadband
// RT60 is ROOM.rt60 (0.24 s set, which the in-loop damping brings to about 0.2 s measured); a one-pole low-pass inside every loop damps the highs faster (the room is soft).
// Stereo in, stereo out (left feeds lines 0 to 3, right 4 to 7; the outputs tap different sign patterns).
export const ROOM = { rt60: 0.24, preDelayMs: 8, dampHz: 3800, send: 0.3 };
const LINES_MS = [7.1, 8.9, 10.7, 12.3, 14.9, 16.1, 18.7, 21.3];
const DIFF_MS = [1.7, 3.1];
const OUT_L = [1, -1, 1, -1, 1, 1, -1, -1];
const OUT_R = [1, 1, -1, -1, -1, 1, 1, -1];

function fdnRaw(inL, inR) {
  const n = inL.length;
  const pre = ms(ROOM.preDelayMs);
  const len = LINES_MS.map((d) => Math.round((d / 1000) * SR) | 1);
  const g = len.map((L) => Math.pow(10, (-3 * L) / (ROOM.rt60 * SR)));
  const k = 1 - Math.exp((-TAU * ROOM.dampHz) / SR);
  const buf = len.map((L) => new Float64Array(L));
  const pos = new Array(8).fill(0);
  const lp = new Float64Array(8);
  // all-pass diffusers, one chain per input side
  const dl = DIFF_MS.map((d) => Math.round((d / 1000) * SR));
  const ap = [0, 1].map(() => dl.map((L) => ({ b: new Float64Array(L), p: 0 })));
  const diffuse = (side, x) => {
    for (const s of ap[side]) {
      const z = s.b[s.p];
      const y = -0.6 * x + z;
      s.b[s.p] = x + 0.6 * y;
      s.p = (s.p + 1) % s.b.length;
      x = y;
    }
    return x;
  };
  const outL = new Float64Array(n), outR = new Float64Array(n);
  const o = new Float64Array(8);
  const f = new Float64Array(8);
  for (let i = 0; i < n; i++) {
    const xl = i >= pre ? diffuse(0, inL[i - pre]) : diffuse(0, 0);
    const xr = i >= pre ? diffuse(1, inR[i - pre]) : diffuse(1, 0);
    let sl = 0, sr = 0;
    for (let j = 0; j < 8; j++) {
      lp[j] += k * (buf[j][pos[j]] - lp[j]);
      o[j] = lp[j] * g[j];
      sl += OUT_L[j] * o[j];
      sr += OUT_R[j] * o[j];
    }
    // fast Walsh-Hadamard transform, scaled 1/sqrt(8): orthogonal, lossless before the gains
    for (let j = 0; j < 8; j++) f[j] = o[j];
    for (let h = 1; h < 8; h <<= 1) {
      for (let a = 0; a < 8; a += h << 1) {
        for (let b = a; b < a + h; b++) { const u = f[b], v = f[b + h]; f[b] = u + v; f[b + h] = u - v; }
      }
    }
    for (let j = 0; j < 8; j++) {
      buf[j][pos[j]] = f[j] / Math.sqrt(8) + (j < 4 ? xl : xr);
      pos[j] = (pos[j] + 1) % buf[j].length;
    }
    outL[i] = sl; outR[i] = sr;
  }
  return [outL, outR];
}

// The impulse response energy, measured once, sets the wet gain so the send means the same thing everywhere.
const IR_N = ms(1000);
let wetNorm = null;
export function roomIR() {
  const imp = new Float64Array(IR_N); imp[0] = 1;
  return fdnRaw(imp, imp);
}
function norm() {
  if (wetNorm) return wetNorm;
  const [l, r] = roomIR();
  let e = 0; for (let i = 0; i < IR_N; i++) e += (l[i] * l[i] + r[i] * r[i]) / 2;
  wetNorm = 1 / Math.sqrt(e);
  return wetNorm;
}
// dry stereo in, dry plus the shared send out
export function room([l, r]) {
  const [wl, wr] = fdnRaw(l, r);
  const g = ROOM.send * norm();
  return [l.map((v, i) => v + g * wl[i]), r.map((v, i) => v + g * wr[i])];
}

// RT60 from Schroeder backward integration of the IR (T20: -5 to -25 dB, extrapolated to 60 dB).
export function rt60Of(ir) {
  const n = ir.length;
  const edc = new Float64Array(n);
  let s = 0;
  for (let i = n - 1; i >= 0; i--) { s += ir[i] * ir[i]; edc[i] = s; }
  const db = (i) => 10 * Math.log10(edc[i] / edc[0]);
  let a = -1, b = -1;
  for (let i = 0; i < n; i++) { if (a < 0 && db(i) <= -5) a = i; if (b < 0 && db(i) <= -25) { b = i; break; } }
  return ((b - a) / SR) * 3;
}

// ---------- true peak: 4x oversampling with a windowed-sinc interpolator ----------
const OS = 4, TAPS = 32;
const KERNEL = (() => {
  const k = [];
  for (let p = 0; p < OS; p++) {
    const row = new Float64Array(TAPS);
    for (let t = 0; t < TAPS; t++) {
      const x = t - TAPS / 2 + 1 - p / OS;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / (TAPS / 2));
      row[t] = sinc * w;
    }
    k.push(row);
  }
  return k;
})();
export function truePeakOf(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    for (let ph = 0; ph < OS; ph++) {
      let s = 0;
      const row = KERNEL[ph];
      for (let t = 0; t < TAPS; t++) {
        const j = i + t - TAPS / 2 + 1;
        if (j >= 0 && j < x.length) s += x[j] * row[t];
      }
      p = Math.max(p, Math.abs(s));
    }
  }
  return p;
}

// ---------- FFT (radix 2, in place) ----------
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -TAU / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j], ai = im[i + j];
        const br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi;
        re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// ---------- WAV io (16-bit PCM, interleaved) ----------
export function wavBytes(chans) {
  const ch = chans.length, n = chans[0].length;
  const data = n * ch * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0, 'ascii'); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii'); buf.writeUInt32LE(data, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) buf.writeInt16LE(chans[c][i], 44 + (i * ch + c) * 2);
  return buf;
}
export function readWav(buf) {
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: buf.readUInt16LE(p + 10), sr: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') data = buf.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size & 1);
  }
  const n = data.length / (2 * fmt.ch);
  const chans = Array.from({ length: fmt.ch }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.ch; c++) chans[c][i] = data.readInt16LE((i * fmt.ch + c) * 2) / 32768;
  return { ...fmt, n, chans };
}
