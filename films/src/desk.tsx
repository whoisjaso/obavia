/* Obavia Desk films. Every screen is a real capture of the Desk
   (public/desk/*.png, 390×844 at 3×, made by walking the app), set in a
   phone and cut together. Nothing on a screen is drawn for the film. */
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { clampOpts } from "./kit";

export type Shot = { src: string; s: number; cut?: boolean; tap?: [number, number]; tapAt?: number };

/** Frame offsets for a reel; total length in frames. */
export function timeline(shots: Shot[], fps: number) {
  let t = 0;
  const at = shots.map(sh => { const a = t; t += Math.round(sh.s * fps); return a; });
  return { at, total: t };
}

const PUSH = 12; // frames for an iOS-style push between screens

/** The phone and its screens. Width is the outside width of the device. */
export const Phone: React.FC<{ shots: Shot[]; start?: number; width?: number; style?: React.CSSProperties; tilt?: number }> = ({ shots, start = 0, width = 430, style, tilt = 0 }) => {
  const f = useCurrentFrame() - start; const { fps } = useVideoConfig();
  const { at } = timeline(shots, fps);
  const bez = width * 0.045, screenW = width - bez * 2, screenH = screenW * (844 / 390), r = width * 0.16;
  let cur = 0; for (let i = 0; i < shots.length; i++) if (f >= at[i]) cur = i;
  const layers: React.ReactNode[] = [];
  for (const i of [cur - 1, cur]) {
    if (i < 0) continue;
    const sh = shots[i], local = f - at[i];
    const next = shots[i + 1];
    // the outgoing screen stays under the incoming one until the push ends
    if (i === cur - 1 && f - at[cur] > PUSH) continue;
    let tx = 0, op = 1;
    if (i === cur && i > 0 && local < PUSH) {
      const p = interpolate(local, [0, PUSH], [0, 1], { ...clampOpts, easing: theme.ease.out });
      if (sh.cut) op = p; else { tx = (1 - p) * screenW * 0.32; op = p; }
    }
    if (i === cur - 1 && next) {
      const p = interpolate(f - at[cur], [0, PUSH], [0, 1], { ...clampOpts, easing: theme.ease.out });
      if (!shots[cur].cut) tx = -p * screenW * 0.12;
    }
    layers.push(<Img key={i} src={staticFile(`desk/${sh.src}.png`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `translateX(${tx}px)`, opacity: op }} />);
  }
  // a tap: a soft ring where the finger lands, just before the next screen
  const sh = shots[cur], local = f - at[cur], dur = Math.round(sh.s * fps);
  let tap: React.ReactNode = null;
  if (sh.tap) {
    const t0 = sh.tapAt !== undefined ? Math.round(sh.tapAt * fps) : dur - 14;
    const k = local - t0;
    if (k >= 0 && k < 18) {
      const p = interpolate(k, [0, 18], [0, 1], { ...clampOpts, easing: theme.ease.out });
      const sx = screenW / 390;
      tap = <div style={{ position: "absolute", left: sh.tap[0] * sx, top: sh.tap[1] * sx, width: 0, height: 0 }}>
        <div style={{ position: "absolute", left: -38 * sx, top: -38 * sx, width: 76 * sx, height: 76 * sx, borderRadius: "50%", background: "rgba(40,52,79,.16)", border: `${2 * sx}px solid rgba(40,52,79,.32)`, transform: `scale(${0.5 + p * 0.7})`, opacity: 1 - p }} />
        <div style={{ position: "absolute", left: -14 * sx, top: -14 * sx, width: 28 * sx, height: 28 * sx, borderRadius: "50%", background: "rgba(40,52,79,.28)", transform: `scale(${1 - p * 0.4})`, opacity: k < 9 ? 1 : 1 - (k - 9) / 9 }} />
      </div>;
    }
  }
  return (
    <div style={{ position: "relative", width, height: screenH + bez * 2, borderRadius: r, background: "linear-gradient(145deg,#2B3550,#151B2B)", padding: bez, boxSizing: "border-box",
      boxShadow: "0 80px 140px -60px rgba(28,36,54,.55), 0 30px 60px -40px rgba(28,36,54,.4), inset 0 0 0 2px rgba(255,255,255,.08)", transform: `perspective(2400px) rotateY(${tilt}deg)`, ...style }}>
      <div style={{ position: "relative", width: screenW, height: screenH, borderRadius: r - bez, overflow: "hidden", background: "#F2F6FF" }}>
        {layers}{tap}
        <div style={{ position: "absolute", top: screenW * 0.025, left: "50%", width: screenW * 0.3, height: screenW * 0.085, marginLeft: -screenW * 0.15, borderRadius: 999, background: "#0B0F19" }} />
      </div>
    </div>
  );
};

/** Landscape or square sky: the site's gradient, drifting clouds and a soft glow. */
export const WideSky: React.FC<{ night?: number }> = ({ night = 0 }) => {
  const f = useCurrentFrame(); const { width: W, height: H } = useVideoConfig();
  const k = W / 1920;
  const C = [
    { i: 0, x: -200, y: -60, w: 1000, s: 10, o: 0.85 }, { i: 1, x: 1180, y: -120, w: 980, s: -8, o: 0.7 },
    { i: 2, x: -260, y: H / k - 380, w: 1200, s: 9, o: 0.9 }, { i: 3, x: 1100, y: H / k - 300, w: 1100, s: -12, o: 0.85 },
    { i: 4, x: 620, y: 300, w: 760, s: 6, o: 0.3 },
  ];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${theme.colors.skyTop} 0%, ${theme.colors.sky} 52%, #EAF0FE 100%)` }}>
        {C.map((c, j) => <Img key={j} src={staticFile(`clouds/c${c.i}.png`)} style={{ position: "absolute", left: (c.x + (f * c.s) / 30) * k, top: (c.y + Math.sin(f / 55 + j) * 8) * k, width: c.w * k, opacity: c.o }} />)}
        <div style={{ position: "absolute", left: "18%", right: "18%", top: "18%", bottom: "18%", borderRadius: "50%", filter: `blur(${70 * k}px)`, background: "radial-gradient(closest-side, rgba(255,255,255,.8), rgba(255,255,255,0))" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: night, background: `radial-gradient(ellipse at 30% 20%, ${theme.colors.night2}, ${theme.colors.night} 60%, #0B1020)` }} />
    </AbsoluteFill>
  );
};

/** Grade, grain and vignette, on top of everything. */
export const Grade: React.FC = () => {
  const f = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return <>
    <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(28,36,54,.05), transparent 22%, transparent 80%, rgba(28,36,54,.07))" }} />
    <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: noise, backgroundSize: "220px", backgroundPosition: `${(f * 7) % 220}px ${(f * 13) % 220}px`, opacity: 0.05, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 62%, rgba(14,20,38,.14) 100%)" }} />
  </>;
};

/** A caption block: a small label, a headline that rises word by word, a quieter line. */
export const Caption: React.FC<{ at: number; out: number; kicker?: string; title: string; em?: string[]; sub?: string; size?: number; width?: number; align?: "left" | "center"; soon?: boolean }> =
  ({ at, out, kicker, title, em = [], sub, size = 84, width = 760, align = "left", soon }) => {
    const f = useCurrentFrame(); const { fps } = useVideoConfig();
    if (f < at - 1 || f > out + 10) return null;
    const e = interpolate(f, [out, out + 10], [0, 1], { ...clampOpts, easing: theme.ease.in });
    const words = title.split(" ");
    const pk = spring({ frame: f - at, fps, config: theme.spring.smooth });
    const ps = spring({ frame: f - at - 6 - words.length * 3, fps, config: theme.spring.smooth });
    return (
      <div style={{ width, fontFamily: theme.font, textAlign: align, opacity: 1 - e, transform: `translateY(${-e * 30}px)`, filter: e > 0 ? `blur(${e * 8}px)` : undefined }}>
        {kicker && <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 26, padding: "10px 20px", borderRadius: 999, background: soon ? "rgba(40,52,79,.08)" : "rgba(255,255,255,.75)", boxShadow: "inset 0 0 0 2px rgba(175,193,238,.7)",
          font: `700 ${size * 0.3}px/1 ${theme.font}`, letterSpacing: "0.02em", color: theme.colors.navy, opacity: pk, transform: `translateY(${(1 - pk) * 18}px)` }}>
          <span style={{ width: size * 0.12, height: size * 0.12, borderRadius: "50%", background: soon ? theme.colors.slate : theme.colors.deep }} />{kicker}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", columnGap: size * 0.24, font: `800 ${size}px/1.04 ${theme.font}`, letterSpacing: "-0.045em", color: theme.colors.ink }}>
          {words.map((w, i) => { const p = spring({ frame: f - at - 4 - i * 3, fps, config: theme.spring.snappy }); const bare = w.replace(/[.,?!]/g, "");
            return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.96 + 0.04 * p})`, color: em.includes(bare) ? theme.colors.deep : undefined }}>{w}</span>; })}
        </div>
        {sub && <div style={{ marginTop: 26, font: `500 ${size * 0.36}px/1.45 ${theme.font}`, color: theme.colors.body, opacity: ps, transform: `translateY(${(1 - ps) * 20}px)` }}>{sub}</div>}
      </div>
    );
  };
