import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, continueRender, delayRender } from "remotion";
import { theme } from "./theme";

export const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const useSec = () => { const { fps } = useVideoConfig(); return (s: number) => Math.round(s * fps); };
export const ramp = (f: number, a: number, b: number, ease = theme.ease.out) =>
  interpolate(f, [a, b], [0, 1], { ...clampOpts, easing: ease });

/* fonts, loaded from the project (no network at render time) */
const FACES = [400, 600, 700, 800].map(w => `@font-face{font-family:Manrope;font-weight:${w};src:url(${staticFile(`fonts/manrope-latin-${w}-normal.woff2`)}) format('woff2');}`).join("");
export const Fonts: React.FC = () => {
  const [h] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => { Promise.all([400, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Manrope`))).then(() => continueRender(h)); }, [h]);
  return <style>{FACES}</style>;
};

/* sky: the site's own procedural clouds drifting on a soft gradient; night: the same world at dusk */
const CLOUDS = [
  { i: 0, x: -140, y: 180, w: 900, s: 14, o: 0.9 }, { i: 1, x: 520, y: 60, w: 820, s: -10, o: 0.75 },
  { i: 2, x: -260, y: 1250, w: 1100, s: 12, o: 0.95 }, { i: 3, x: 480, y: 1420, w: 1000, s: -16, o: 0.9 },
  { i: 4, x: 200, y: 760, w: 760, s: 9, o: 0.4 }, { i: 5, x: -300, y: 620, w: 700, s: -8, o: 0.35 },
];
export const Sky: React.FC<{ light: number }> = ({ light }) => {
  const f = useCurrentFrame();
  const d1 = Math.sin(f / 60) * 60, d2 = Math.cos(f / 75) * 50;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${theme.colors.night2} 0%, ${theme.colors.night} 55%, #0E1426 100%)` }}>
        <div style={{ position: "absolute", width: 1300, height: 1300, borderRadius: "50%", left: -420 + d1, top: -380, filter: "blur(60px)",
          background: `radial-gradient(circle, ${theme.colors.nightGlow}, transparent 62%)` }} />
        <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", right: -380 - d2, bottom: -300, filter: "blur(80px)",
          background: "radial-gradient(circle, rgba(200,214,252,0.18), transparent 65%)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: light, background: `linear-gradient(180deg, ${theme.colors.skyTop} 0%, ${theme.colors.sky} 48%, #EEF3FF 100%)` }}>
        {CLOUDS.map((c, k) => (
          <Img key={k} src={staticFile(`clouds/c${c.i}.png`)} style={{ position: "absolute", left: c.x + (f * c.s) / 30, top: c.y + Math.sin(f / 50 + k) * 8, width: c.w, opacity: c.o }} />
        ))}
        <div style={{ position: "absolute", left: 90, right: 90, top: 520, height: 700, borderRadius: "50%", filter: "blur(60px)", background: "radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0))" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Finish: React.FC<{ dark: number }> = ({ dark }) => {
  const f = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <>
      <AbsoluteFill style={{ pointerEvents: "none", background: `linear-gradient(180deg, rgba(28,36,54,${0.06 + dark * 0.1}), transparent 26%, transparent 74%, rgba(28,36,54,${0.08 + dark * 0.14}))` }} />
      <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: noise, backgroundSize: "220px", backgroundPosition: `${(f * 7) % 220}px ${(f * 13) % 220}px`, opacity: 0.06, mixBlendMode: dark > 0.5 ? "overlay" : "multiply" }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, transparent 58%, rgba(14,20,38,${0.16 + dark * 0.2}) 100%)` }} />
    </>
  );
};

/* type: words rise in, staggered; exits are quicker */
export const Words: React.FC<{ text: string; at: number; out?: number; size?: number; color?: string; em?: string[]; emColor?: string; weight?: number; per?: number; align?: "center" | "left"; width?: number; lh?: number }> =
  ({ text, at, out, size = 96, color = theme.colors.ink, em = [], emColor = theme.colors.deep, weight = 800, per = 3, align = "center", width = 900, lh = 1.06 }) => {
    const f = useCurrentFrame(); const { fps } = useVideoConfig();
    const exitP = out === undefined ? 0 : interpolate(f, [out, out + 9], [0, 1], { ...clampOpts, easing: theme.ease.in });
    if (f < at - 1 || exitP >= 1) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", columnGap: size * 0.26, rowGap: 0, width, fontFamily: theme.font, fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: "-0.045em", color,
        opacity: 1 - exitP, transform: `translateY(${-exitP * 36}px)` }}>
        {text.split(" ").map((w, i) => {
          const p = spring({ frame: f - at - i * per, fps, config: theme.spring.snappy });
          const bare = w.replace(/[.,?!“”]/g, "");
          return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 34}px) scale(${0.96 + 0.04 * p})`, color: em.includes(bare) ? emColor : undefined }}>{w}</span>;
        })}
      </div>
    );
  };

/* typewriter with caret and key clicks */
export const Typed: React.FC<{ text: string; at: number; cps?: number; style?: React.CSSProperties; caret?: string; render?: (shown: string) => React.ReactNode }> =
  ({ text, at, cps = 30, style, caret = theme.colors.deep, render }) => {
    const f = useCurrentFrame(); const { fps } = useVideoConfig();
    const n = Math.max(0, Math.min(text.length, Math.floor(((f - at) / fps) * cps)));
    const typing = n > 0 && n < text.length;
    const blink = typing || Math.floor(f / 15) % 2 === 0;
    const shown = text.slice(0, n);
    return (
      <div style={style}>
        {render ? render(shown) : shown}
        {f >= at && <span style={{ display: "inline-block", width: 5, height: "0.9em", marginLeft: 4, verticalAlign: "-0.1em", background: caret, opacity: blink && n < text.length + 1 ? 1 : 0, borderRadius: 3 }} />}
      </div>
    );
  };
export const TypeSfx: React.FC<{ text: string; at: number; cps?: number; volume?: number }> = ({ text, at, cps = 30, volume = 0.5 }) => {
  const { fps } = useVideoConfig();
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i += 2) {
    if (text[i] === " ") continue;
    ticks.push(<Sequence key={i} from={Math.round(at + (i / cps) * fps)} durationInFrames={6}><Audio src={staticFile(`sfx/type${i % 3}.wav`)} volume={volume * (0.8 + ((i * 7) % 5) / 12)} /></Sequence>);
  }
  return <>{ticks}</>;
};

export const Sfx: React.FC<{ name: string; at: number; volume?: number; dur?: number }> = ({ name, at, volume = 0.7, dur = 120 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={dur}><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
);

/* the Obavia mark, as on the site */
export const Mark: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <Img src={staticFile("mark.svg")} style={{ width: size, height: size, ...style }} />
);

export const Pill: React.FC<{ children: React.ReactNode; dark?: boolean; size?: number; style?: React.CSSProperties }> = ({ children, dark, size = 38, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, height: size * 2, padding: `0 ${size * 0.8}px`, borderRadius: 999, fontFamily: theme.font, fontWeight: 700, fontSize: size,
    letterSpacing: "-0.02em", background: dark ? theme.colors.navy : "#EEF3FF", color: dark ? "#fff" : theme.colors.navy, boxShadow: dark ? "0 30px 60px -30px rgba(28,36,54,.6)" : `inset 0 0 0 2px #AFC1EE`, ...style }}>
    <span style={{ width: size * 0.34, height: size * 0.34, borderRadius: "50%", background: dark ? theme.colors.peri : theme.colors.deep }} />
    {children}
  </div>
);

/* pop-in wrapper: fade + rise + scale, spring */
export const Pop: React.FC<{ at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number; cfg?: keyof typeof theme.spring }> = ({ at, out, children, style, from = 50, cfg = "smooth" }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: theme.spring[cfg] });
  const e = out === undefined ? 0 : interpolate(f, [out, out + 10], [0, 1], { ...clampOpts, easing: theme.ease.in });
  if (f < at - 1 || e >= 1) return null;
  return <div style={{ ...style, opacity: Math.min(1, p) * (1 - e), transform: `${style?.transform || ""} translateY(${(1 - p) * from - e * 40}px) scale(${0.94 + 0.06 * Math.min(1, p) - e * 0.03})` }}>{children}</div>;
};

/* a voiced line, and the music bed ducking under every line */
export type VO = { file: string; text: string; sec: number };
export const Voice: React.FC<{ vo: VO; at: number }> = ({ vo, at }) => {
  const { fps } = useVideoConfig();
  return <Sequence from={at} durationInFrames={Math.ceil(vo.sec * fps) + 6}><Audio src={staticFile(vo.file)} volume={1} /></Sequence>;
};
export const Bed: React.FC<{ file: string; lines: { at: number; len: number }[] }> = ({ file, lines }) => (
  <Audio src={staticFile(file)} volume={(f) => {
    let v = 0.3;
    for (const l of lines) { const k = interpolate(f, [l.at - 6, l.at, l.at + l.len, l.at + l.len + 10], [0, 1, 1, 0], clampOpts); v = Math.min(v, 0.3 - k * 0.17); }
    return v;
  }} />
);

/* a scene window: mounts between a and b (absolute frames), leaves with a quick lift + blur */
export const Span: React.FC<{ a: number; b: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ a, b, children, style }) => {
  const f = useCurrentFrame();
  if (f < a - 1 || f > b) return null;
  const e = interpolate(f, [b - 10, b], [0, 1], { ...clampOpts, easing: theme.ease.in });
  return <AbsoluteFill style={{ ...style, opacity: 1 - e, transform: `translateY(${-e * 60}px) scale(${1 - e * 0.02})`, filter: e > 0 ? `blur(${e * 10}px)` : undefined }}>{children}</AbsoluteFill>;
};

/* centered column helper */
export const Col: React.FC<{ top: number; children: React.ReactNode; gap?: number }> = ({ top, children, gap = 0 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap }}>{children}</div>
);

/* white card, as on the site */
export const Card: React.FC<{ children: React.ReactNode; w?: number; dark?: boolean; style?: React.CSSProperties }> = ({ children, w = 880, dark, style }) => (
  <div style={{ width: w, boxSizing: "border-box", borderRadius: 44, padding: "48px 54px", fontFamily: theme.font,
    background: dark ? "rgba(40,52,79,0.72)" : "rgba(255,255,255,0.94)", color: dark ? "#fff" : theme.colors.ink,
    boxShadow: dark ? "inset 0 0 0 2px rgba(200,214,252,0.16), 0 50px 100px -50px rgba(0,0,0,.7)" : "0 60px 120px -60px rgba(40,52,79,.45), inset 0 0 0 2px rgba(220,228,250,.9)",
    backdropFilter: "blur(20px)", ...style }}>{children}</div>
);
