// Obavia cloud sound kit v2: the contact sheet. Waveform and log-frequency spectrogram for every file,
// written straight to PNG (node zlib, a 5x7 bitmap font): no browser, no dependency, deterministic.
// Run alone:  node tools/cloud-sfx/contact.mjs  (make.mjs runs it too). Writes assets/cloud-sfx/contact.png.

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, readWav, fft } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../assets/cloud-sfx');
const FILES = [
  ['cloud-hover', 'POINTER ENTER'],
  ['cloud-touch', 'PRESS DOWN'],
  ['cloud-rise', 'RELEASE'],
  ['cloud-settle', 'PAGE OR SHEET LANDS'],
  ['cloud-drift', 'DRAG, LOOPED'],
  ['cloud-landed', 'ACTION COMPLETED'],
  ['cloud-press-full', 'TOUCH AT 0, RISE AT 100 MS'],
];

// ---------- canvas ----------
const LABEL = 300, WAVE = 560, SPEC = 640, GAP = 40, PAD = 32, ROW = 190, PH = 140;
const W = PAD + LABEL + WAVE + GAP + SPEC + PAD;
const TOPBAND = 76;
const H = PAD + TOPBAND + FILES.length * ROW + PAD;
const px = new Uint8Array(W * H * 3);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex('#1C2436'), ICE = hex('#A9C4F5'), SNOW = hex('#E9EFFE'), DEEP = hex('#2F4468');
function set(x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) px[o + k] = Math.round(px[o + k] * (1 - a) + c[k] * a);
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, INK);

// ---------- 5x7 font, rows top to bottom ----------
const G = {
  A: '01110|10001|10001|11111|10001|10001|10001', B: '11110|10001|10001|11110|10001|10001|11110',
  C: '01110|10001|10000|10000|10000|10001|01110', D: '11110|10001|10001|10001|10001|10001|11110',
  E: '11111|10000|10000|11110|10000|10000|11111', F: '11111|10000|10000|11110|10000|10000|10000',
  G: '01110|10001|10000|10111|10001|10001|01111', H: '10001|10001|10001|11111|10001|10001|10001',
  I: '01110|00100|00100|00100|00100|00100|01110', J: '00111|00010|00010|00010|00010|10010|01100',
  K: '10001|10010|10100|11000|10100|10010|10001', L: '10000|10000|10000|10000|10000|10000|11111',
  M: '10001|11011|10101|10101|10001|10001|10001', N: '10001|11001|10101|10011|10001|10001|10001',
  O: '01110|10001|10001|10001|10001|10001|01110', P: '11110|10001|10001|11110|10000|10000|10000',
  Q: '01110|10001|10001|10001|10101|10010|01101', R: '11110|10001|10001|11110|10100|10010|10001',
  S: '01111|10000|10000|01110|00001|00001|11110', T: '11111|00100|00100|00100|00100|00100|00100',
  U: '10001|10001|10001|10001|10001|10001|01110', V: '10001|10001|10001|10001|10001|01010|00100',
  W: '10001|10001|10001|10101|10101|10101|01010', X: '10001|10001|01010|00100|01010|10001|10001',
  Y: '10001|10001|01010|00100|00100|00100|00100', Z: '11111|00001|00010|00100|01000|10000|11111',
  0: '01110|10001|10011|10101|11001|10001|01110', 1: '00100|01100|00100|00100|00100|00100|01110',
  2: '01110|10001|00001|00010|00100|01000|11111', 3: '11111|00010|00100|00010|00001|10001|01110',
  4: '00010|00110|01010|10010|11111|00010|00010', 5: '11111|10000|11110|00001|00001|10001|01110',
  6: '00110|01000|10000|11110|10001|10001|01110', 7: '11111|00001|00010|00100|01000|01000|01000',
  8: '01110|10001|10001|01110|10001|10001|01110', 9: '01110|10001|10001|01111|00001|00010|01100',
  ' ': '00000|00000|00000|00000|00000|00000|00000', '.': '00000|00000|00000|00000|00000|01100|01100',
  ',': '00000|00000|00000|00000|01100|00100|01000', '-': '00000|00000|00000|01110|00000|00000|00000',
  '/': '00001|00010|00010|00100|01000|01000|10000', ':': '00000|01100|01100|00000|01100|01100|00000',
};
function text(s, x, y, c = SNOW, size = 2, a = 1, track = 1) {
  for (const ch of s.toUpperCase()) {
    const g = G[ch] || G[' '];
    g.split('|').forEach((row, ry) => [...row].forEach((b, rx) => {
      if (b === '1') for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) set(x + rx * size + i, y + ry * size + j, c, a);
    }));
    x += (5 + track) * size;
  }
  return x;
}
const textW = (s, size = 2, track = 1) => s.length * (5 + track) * size;

// ---------- spectrogram colour: ink, deep blue, ice, snow ----------
const STOPS = [[0, INK], [0.35, DEEP], [0.75, ICE], [1, hex('#F7FAFF')]];
function ramp(t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1], [t1, c1] = STOPS[i];
      const u = (t - t0) / (t1 - t0);
      return c0.map((v, k) => v + (c1[k] - v) * u);
    }
  }
  return STOPS[STOPS.length - 1][1];
}
const FLO = 40, FHI = 16000, RANGE = 54;

function row(k, name, role) {
  const w = readWav(readFileSync(join(OUT, `${name}.wav`)));
  const [L, R] = w.chans;
  const m = L.map((v, i) => (v + R[i]) / 2);
  const durMs = (w.n / SR) * 1000;
  const y0 = PAD + TOPBAND + k * ROW;
  const xw = PAD + LABEL, xs = xw + WAVE + GAP;

  text(name.toUpperCase(), PAD, y0 + 30, SNOW, 2, 1, 2);
  text(role, PAD, y0 + 58, SNOW, 1, 0.6, 2);
  text(`${Math.round(durMs)} MS`, PAD, y0 + 78, SNOW, 1, 0.6, 2);

  // waveform: L above the axis in ice, R mirrored below at lower opacity; full scale is -18 dBFS
  const mid = y0 + PH / 2, half = PH / 2 - 6, full = Math.pow(10, -18 / 20);
  for (let x = 0; x < WAVE; x++) set(xw + x, mid, SNOW, 0.12);
  for (let x = 0; x < WAVE; x++) {
    const a = Math.floor((x / WAVE) * w.n), b = Math.max(a + 1, Math.floor(((x + 1) / WAVE) * w.n));
    let lo = 0, hi = 0, s = 0;
    for (let i = a; i < b; i++) { lo = Math.min(lo, L[i], R[i]); hi = Math.max(hi, L[i], R[i]); s += m[i] * m[i]; }
    const rms = Math.sqrt(s / (b - a));
    const yh = Math.round(mid - (hi / full) * half), yl = Math.round(mid - (lo / full) * half);
    for (let y = yh; y <= yl; y++) set(xw + x, y, ICE, 0.55);
    const r = Math.round((rms / full) * half * 1.4);
    for (let y = mid - r; y <= mid + r; y++) set(xw + x, y, SNOW, 0.85);
  }

  // spectrogram: Hann frames scaled to the file (256 under 300 ms, 512 under 1 s, else 1024) zero-padded to 4096, log frequency 40 Hz to 16 kHz, 84 dB range
  const N = durMs < 300 ? 256 : durMs < 1000 ? 512 : 1024, F = 4096;
  const cols = [];
  let top = -Infinity;
  for (let x = 0; x < SPEC; x++) {
    const c = Math.round(((x + 0.5) / SPEC) * w.n);
    const re = new Float64Array(F), im = new Float64Array(F);
    for (let i = 0; i < N; i++) { const j = c - N / 2 + i; if (j >= 0 && j < w.n) re[i] = m[j] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)); }
    fft(re, im);
    const col = new Float64Array(PH);
    for (let y = 0; y < PH; y++) {
      const fa = FLO * Math.pow(FHI / FLO, (PH - 1 - y) / PH), fb = FLO * Math.pow(FHI / FLO, (PH - y) / PH);
      const ka = Math.max(1, Math.floor((fa * F) / SR)), kb = Math.max(ka, Math.ceil((fb * F) / SR));
      let p = 0; for (let kk = ka; kk <= kb; kk++) p = Math.max(p, re[kk] * re[kk] + im[kk] * im[kk]);
      col[y] = 10 * Math.log10(p + 1e-20);
      top = Math.max(top, col[y]);
    }
    cols.push(col);
  }
  cols.forEach((col, x) => col.forEach((v, y) => set(xs + x, y0 + y, ramp((v - top + RANGE) / RANGE))));
  for (const [hz, lab] of [[100, '100'], [1000, '1K'], [10000, '10K']]) {
    const y = Math.round(y0 + PH - (Math.log(hz / FLO) / Math.log(FHI / FLO)) * PH);
    for (let x = 0; x < 6; x++) set(xs - 8 + x, y, SNOW, 0.5);
    text(lab, xs - 12 - textW(lab, 1), y - 3, SNOW, 1, 0.55);
  }

  // time ticks under both panels, every 100 ms (every 200 ms on the loop)
  const step = durMs > 1000 ? 200 : 100;
  for (const [x0, wd] of [[xw, WAVE], [xs, SPEC]]) {
    for (let t = 0; t <= durMs + 0.5; t += step) {
      const x = Math.round(x0 + (t / durMs) * (wd - 1));
      for (let y = 0; y < 5; y++) set(x, y0 + PH + 2 + y, SNOW, 0.5);
      text(`${t}`, x - textW(`${t}`, 1) / 2, y0 + PH + 12, SNOW, 1, 0.5);
    }
  }
}

text('OBAVIA CLOUD SOUND KIT V2', PAD, PAD, SNOW, 2, 1, 2);
text('WAVEFORM, L AND R, RMS IN WHITE, FULL SCALE -18 DBFS', PAD + LABEL, PAD + 50, SNOW, 1, 0.6, 2);
text('SPECTROGRAM, LOG 40 HZ TO 16 KHZ, 54 DB, WINDOW SCALED TO LENGTH', PAD + LABEL + WAVE + GAP, PAD + 50, SNOW, 1, 0.6, 2);
FILES.forEach(([n, r], k) => row(k, n, r));

// ---------- PNG writer ----------
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) { raw[y * (1 + W * 3)] = 0; Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1); }
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
writeFileSync(join(OUT, 'contact.png'), png);
console.log(`wrote contact.png (${W} x ${H})`);
