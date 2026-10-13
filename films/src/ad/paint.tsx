/* Paint on top of the photographs: strokes that draw on like a brush,
   with a slightly rough edge, in the brand's ice and blue (or white). */
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export const C = {
  ink: "#171A20", navy: "#28344F", blue: "#4E6AA8", ice: "#C8D6FC", tint: "#E7EEFE", white: "#FFFFFF", slate: "#626873",
};
export const outQ = Easing.bezier(0.16, 1, 0.3, 1);
export const inQ = Easing.bezier(0.7, 0, 0.84, 0);
export const io = Easing.bezier(0.65, 0, 0.35, 1);
export const prog = (f: number, a: number, d: number, e = outQ) => interpolate(f, [a, a + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** A hand-drawn loop: a little more than one turn, wobbling, never quite closing. */
export function loopPath(cx: number, cy: number, rx: number, ry: number, rot = -8, turns = 1.12, seed = 1) {
  const pts: string[] = [];
  const n = 90, r = (rot * Math.PI) / 180;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * turns * Math.PI * 2 - Math.PI * 0.6;
    const wob = 1 + 0.035 * Math.sin(3 * t + seed) + 0.02 * Math.sin(5 * t + seed * 2);
    const drift = 1 + (i / n) * 0.06;                      // the second pass runs a touch wider
    const x = Math.cos(t) * rx * wob * drift, y = Math.sin(t) * ry * wob * drift;
    pts.push(`${(cx + x * Math.cos(r) - y * Math.sin(r)).toFixed(1)},${(cy + x * Math.sin(r) + y * Math.cos(r)).toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}

const Rough: React.FC<{ id: string; amount?: number }> = ({ id, amount = 4 }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-400} y={-400} width={1880} height={2720}>
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
    <feDisplacementMap in="SourceGraphic" scale={amount} />
  </filter>
);

/** One brush stroke drawing on from `at` over `dur` frames; optional fade out at `out`. */
export const Stroke: React.FC<{ d: string; at: number; dur: number; color?: string; width?: number; out?: number; rough?: number; opacity?: number; ease?: (t: number) => number }> =
  ({ d, at, dur, color = C.blue, width = 14, out, rough = 3, opacity = 1, ease = outQ }) => {
    const f = useCurrentFrame();
    const p = prog(f, at, dur, ease);
    const o = out === undefined ? 1 : 1 - prog(f, out, 8, inQ);
    if (p <= 0 || o <= 0) return null;
    const id = `r${Math.abs(hash(d)) % 100000}`;
    return (
      <g opacity={o * opacity}>
        <defs><Rough id={id} amount={rough} /></defs>
        <g filter={rough ? `url(#${id})` : undefined}>
          <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
          <path d={d} pathLength={1} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={width * 0.35} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - Math.max(0, p - 0.04)} transform={`translate(${width * 0.28} ${-width * 0.22})`} />
        </g>
      </g>
    );
  };

/** A painted band: a fat brush swipe, left to right, for type to sit on. */
export const Band: React.FC<{ x: number; y: number; w: number; h: number; at: number; dur?: number; color?: string; out?: number; tilt?: number }> =
  ({ x, y, w, h, at, dur = 12, color = C.white, out, tilt = -1.5 }) => {
    const d = `M${x},${y + h * 0.04} C${x + w * 0.3},${y - h * 0.05} ${x + w * 0.7},${y + h * 0.06} ${x + w},${y - h * 0.02}`;
    return <g transform={`rotate(${tilt} ${x + w / 2} ${y})`}><Stroke d={d} at={at} dur={dur} color={color} width={h} rough={6} out={out} ease={io} /></g>;
  };

/** A four-point sparkle that pops and settles. */
export const Sparkle: React.FC<{ x: number; y: number; r: number; at: number; color?: string; out?: number }> = ({ x, y, r, at, color = C.blue, out }) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0) return null;
  const s = t < 6 ? outQ(t / 6) * 1.25 : 1.25 - 0.25 * outQ(Math.min(1, (t - 6) / 10));
  const o = out === undefined ? 1 : 1 - prog(f, out, 6, inQ);
  const k = r * 0.22;
  return <path transform={`translate(${x} ${y}) rotate(${t * 1.5}) scale(${s})`} opacity={o} fill={color}
    d={`M0,${-r} C${k},${-k} ${k},${-k} ${r},0 C${k},${k} ${k},${k} 0,${r} C${-k},${k} ${-k},${k} ${-r},0 C${-k},${-k} ${-k},${-k} 0,${-r}Z`} />;
};

/** Viewfinder corners around a rectangle. */
export const Corners: React.FC<{ x: number; y: number; w: number; h: number; at: number; color?: string; len?: number; out?: number }> = ({ x, y, w, h, at, color = C.blue, len = 90, out }) => (
  <>
    {[[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].map(([cx, cy, sx, sy], i) => (
      <Stroke key={i} d={`M${cx},${cy + sy * len} L${cx},${cy} L${cx + sx * len},${cy}`} at={at + i * 2} dur={10} color={color} width={12} rough={2} out={out} />
    ))}
  </>
);

export const Check: React.FC<{ x: number; y: number; s: number; at: number; color?: string; out?: number }> = ({ x, y, s, at, color = C.blue, out }) => (
  <Stroke d={`M${x - s * 0.5},${y} L${x - s * 0.12},${y + s * 0.38} L${x + s * 0.6},${y - s * 0.45}`} at={at} dur={9} color={color} width={s * 0.16} rough={2} out={out} />
);

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
