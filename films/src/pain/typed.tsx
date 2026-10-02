/* A line typed on black, with a caret and an optional source note. It leaves quicker than it came. */
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { ease } from "../evening/Evening";

export type Line = { t: number; text: string; size: number; note?: string };
const CPS = 17;   // thumb-typing pace, a little brisk for film
export const typedAt = (l: Line, i: number) => l.t + i / CPS;
export const lineEnd = (l: Line) => typedAt(l, l.text.length);
/** One key sound per typed character, spaces silent. */
export const keyCues = (lines: Line[]) =>
  lines.flatMap(l => [...l.text].map((ch, i) => ({ ch, t: typedAt(l, i), i })).filter(x => x.ch !== " ").map(x => ({ t: x.t, kind: "key" as const, v: x.i })));

export const TypedLine: React.FC<{ line: Line; out: number }> = ({ line: l, out: outS }) => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const F = (s: number) => Math.round(s * fps);
  const out = F(outS);
  if (fr < F(l.t) - 1 || fr > out + 8) return null;
  let n = 0; for (let k = 0; k < l.text.length; k++) if (fr >= F(typedAt(l, k))) n = k + 1;
  const done = fr >= F(lineEnd(l));
  const caret = !done || Math.floor(fr / 15) % 2 === 0;
  const e = ease(fr, out, out + 8, theme.ease.in);
  const noteP = spring({ frame: fr - F(lineEnd(l)) - 6, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - e, transform: `translateY(${-e * 30}px)` }}>
      <div style={{ width: 900, textAlign: "center", fontFamily: theme.font, fontWeight: 800, fontSize: l.size, lineHeight: 1.06, letterSpacing: "-0.045em", color: "#F2F5FD" }}>
        {l.text.slice(0, n)}<span style={{ display: "inline-block", width: 7, height: l.size * 0.82, marginLeft: 6, verticalAlign: "-0.08em", borderRadius: 3, background: theme.colors.peri, opacity: caret ? 1 : 0 }} />
      </div>
      {l.note && <div style={{ marginTop: 34, fontFamily: theme.font, fontWeight: 600, fontSize: 30, color: "rgba(214,223,247,0.55)", opacity: noteP, transform: `translateY(${(1 - noteP) * 14}px)` }}>{l.note}</div>}
    </AbsoluteFill>
  );
};
