/* Text that morphs from one word to the next: letters the two words share
   slide to their new places; the rest blur out and in. Positions come from
   the real font metrics, so the move lands exactly on the new word. */
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, outQ, prog } from "./paint";

const FONT = "Geist";
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number[]>();

/** x of each letter's left edge, and the word's width, at this size and weight. */
function layout(text: string, size: number, weight: number, tracking: number): { xs: number[]; w: number } {
  const key = `${weight}|${size}|${tracking}|${text}|${typeof document !== "undefined" && document.fonts?.check(`${weight} ${size}px ${FONT}`)}`;
  let xs = cache.get(key);
  if (!xs) {
    ctx ??= document.createElement("canvas").getContext("2d");
    ctx!.font = `${weight} ${size}px ${FONT}`;
    xs = [];
    for (let i = 0; i <= text.length; i++) xs.push(ctx!.measureText(text.slice(0, i)).width + i * tracking * size);
    cache.set(key, xs);
  }
  return { xs: xs.slice(0, -1), w: xs[xs.length - 1] - tracking * size };
}

/** Pair each letter of the new word with an unused, identical letter of the old one, in order. */
function match(a: string, b: string): (number | -1)[] {
  const used = new Set<number>();
  let from = 0;
  return [...b].map(ch => {
    for (let j = from; j < a.length; j++) if (!used.has(j) && a[j] === ch) { used.add(j); from = j + 1; return j; }
    return -1;
  });
}

export type Word = { at: number; text: string };

export const Morph: React.FC<{
  words: readonly Word[]; y: number; size: number; weight?: number; color?: string; tracking?: number; dur?: number; out?: number; x?: number;
}> = ({ words, y, size, weight = 800, color = C.ink, tracking = -0.045, dur = 14, out, x = 540 }) => {
  const f = useCurrentFrame();
  const i = words.reduce((k, w, n) => (f >= w.at ? n : k), -1);
  if (i < 0) return null;
  const outP = out === undefined ? 0 : prog(f, out, 10);
  if (outP >= 1) return null;
  const cur = words[i], prev = words[i - 1];
  const p = prev ? prog(f, cur.at, dur, outQ) : 1;
  const enterP = !prev ? prog(f, cur.at, dur + 4, outQ) : 1;
  const L = layout(cur.text, size, weight, tracking);
  const spans: React.ReactNode[] = [];
  const style = (left: number, op: number, dy: number, blur: number, k: string | number, ch: string) => (
    <span key={k} style={{ position: "absolute", left, top: 0, opacity: op, transform: `translateY(${dy}px)`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, whiteSpace: "pre" }}>{ch}</span>
  );

  if (prev && p < 1) {
    const P = layout(prev.text, size, weight, tracking);
    const m = match(prev.text, cur.text);
    const kept = new Set(m.filter(j => j >= 0));
    // letters leaving
    [...prev.text].forEach((ch, j) => {
      if (kept.has(j)) return;
      const q = Math.min(1, p * 1.8 + j * 0.02);
      spans.push(style(P.xs[j] - P.w / 2, 1 - q, -q * size * 0.32, q * 10, `o${j}`, ch));
    });
    // letters arriving, and letters carried across
    [...cur.text].forEach((ch, j) => {
      const from = m[j];
      if (from >= 0) {
        const xa = P.xs[from] - P.w / 2, xb = L.xs[j] - L.w / 2;
        spans.push(style(xa + (xb - xa) * p, 1, 0, 0, `n${j}`, ch));
      } else {
        const q = Math.max(0, Math.min(1, (p - 0.18 - j * 0.025) / 0.7));
        spans.push(style(L.xs[j] - L.w / 2, q, (1 - q) * size * 0.38, (1 - q) * 12, `n${j}`, ch));
      }
    });
  } else {
    [...cur.text].forEach((ch, j) => {
      const q = Math.max(0, Math.min(1, (enterP - j * 0.04) / 0.75));
      spans.push(style(L.xs[j] - L.w / 2, q, (1 - q) * size * 0.4, (1 - q) * 12, `n${j}`, ch));
    });
  }
  return (
    <div style={{ position: "absolute", left: x, top: y - size * 0.82, height: size, fontFamily: FONT, fontWeight: weight, fontSize: size, lineHeight: 1, color,
      letterSpacing: `${tracking}em`, opacity: 1 - outP, transform: `translateY(${-outP * 40}px)`, filter: outP > 0.02 ? `blur(${outP * 10}px)` : undefined }}>
      {spans}
    </div>
  );
};
