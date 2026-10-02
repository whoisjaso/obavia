/* Day 44. Pain first: one sale's paperwork, felt on the owner's own phone.
   The timeline (./timeline.ts) holds the beats, the words and their sources. */
import React from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Finish, Fonts, Mark, Sky } from "../kit";
import { AppIcon, BEZEL, CloudButton, Desk, Island, K, LockScreen, Page, SH, SW, Touch, ease, mix } from "../evening/Evening";
import { LINES, NOTES, T, f as F, type Note } from "./timeline";
import { TypedLine } from "./typed";

const C = theme.colors;
const ROW = 88, TOP = 252;

/* the other apps' marks: plain shapes in the film's palette, no one's logo */
export const Glyph: React.FC<{ app: Note["app"] }> = ({ app }) => {
  if (app === "Messages" || app === "Mail" || app === "Reminders" || app === "Phone") {
    const bg = app === "Mail" ? "#C9524A" : app === "Phone" ? "#5E6B85" : app === "Reminders" ? "#E2E7F3" : "#6D84B8";
    const ink = app === "Reminders" ? C.navy : "#fff";
    return (
      <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: "grid", placeItems: "center" }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {app === "Messages" && <path d="M4 5.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3v-3H4A1.5 1.5 0 0 1 2.5 14V7A1.5 1.5 0 0 1 4 5.5z" />}
          {app === "Mail" && <><rect x="2.5" y="5" width="17" height="12" rx="2" /><path d="m3.5 6.5 7.5 5.5 7.5-5.5" /></>}
          {app === "Reminders" && <><circle cx="11" cy="11" r="8" /><path d="M11 6.5V11l3 2" /></>}
          {app === "Phone" && <path d="M6 3.5h3l1.5 4-2 1.3a10 10 0 0 0 4.7 4.7l1.3-2 4 1.5v3a1.8 1.8 0 0 1-2 1.8A15 15 0 0 1 4.2 5.5 1.8 1.8 0 0 1 6 3.5z" />}
        </svg>
      </div>
    );
  }
  return <AppIcon size={38} />;
};

export const Stacked: React.FC<{ n: Note; i: number }> = ({ n, i }) => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const at = F(n.t);
  if (fr < at) return null;
  const p = spring({ frame: fr - at, fps, config: { damping: 15, stiffness: 190, mass: 0.6 } });
  // every later arrival pushes this one down a row
  const pushed = NOTES.slice(i + 1).reduce((y, m) => y + spring({ frame: fr - F(m.t), fps, config: { damping: 18, stiffness: 160, mass: 0.7 } }) * ROW, 0);
  const urgent = n.app === "Mail";
  return (
    <div style={{ position: "absolute", left: 10, width: SW - 20, top: TOP + pushed, height: ROW - 8, boxSizing: "border-box", padding: "11px 14px", borderRadius: 22,
      background: urgent ? "rgba(255,244,242,0.9)" : "rgba(246,249,255,0.78)", backdropFilter: "blur(18px)", boxShadow: "0 16px 36px -22px rgba(0,0,0,.7)",
      fontFamily: theme.font, color: C.ink, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * -30}px) scale(${0.9 + 0.1 * p})`, transformOrigin: "50% 0" }}>
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Glyph app={n.app} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <b style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", color: urgent ? "#9E2F27" : C.ink }}>{n.from}</b>
            <span style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>now</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 14.5, lineHeight: 1.3, fontWeight: 500, color: C.body, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.text}</div>
        </div>
      </div>
    </div>
  );
};

/* the Desk's own title screen: Payments › the note › Title And Tax */
const TitleScreen: React.FC<{ press: number }> = ({ press }) => (
  <Desk>
    <div style={{ position: "absolute", left: 18, top: 62, display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 650, color: "#4E6AA8" }}>
      <svg width="10" height="17" viewBox="0 0 10 17"><path d="M8 2 2 8.5 8 15" stroke="#4E6AA8" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>The Note
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: "#6B7385" }}>Days left to <em style={{ fontStyle: "normal", color: "#4E6AA8" }}>file the title</em></div>
      <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1, marginTop: 8 }}>3</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15.5, fontWeight: 500, color: "#6B7385", marginTop: 16 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: "#D9A441" }} />Due October 5 · Marcus’s sale was August 21
      </div>
    </div>
    <CloudButton label="Filed It Today" y={700} pressed={press} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 772, textAlign: "center", fontSize: 15, fontWeight: 650, color: "#4E6AA8" }}>Filed On Another Day</div>
  </Desk>
);

const FiledScreen: React.FC<{ at: number }> = ({ at }) => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: fr - at, fps, config: theme.spring.bouncy });
  const draw = ease(fr, at + 3, at + 15);
  return (
    <Desk>
      <div style={{ position: "absolute", left: (SW - 104) / 2, top: 220, width: 104, height: 104, borderRadius: 52, background: "linear-gradient(180deg,#FFFFFF,#EAF0FE)",
        boxShadow: "inset 0 -10px 18px -10px rgba(150,176,232,.6), 0 18px 34px -16px rgba(78,106,168,.45)", display: "grid", placeItems: "center", transform: `scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 1.5) }}>
        <svg width="50" height="50" viewBox="0 0 50 50"><path d="M12 26.5 21 35 38 16" fill="none" stroke="#4E6AA8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="44" strokeDashoffset={44 * (1 - draw)} /></svg>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 362, textAlign: "center", opacity: Math.min(1, p) }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: "#6B7385" }}>Title application</div>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.04em", marginTop: 6 }}>Filed <span style={{ color: "#4E6AA8" }}>October 2.</span></div>
      </div>
    </Desk>
  );
};

export const DayFortyFour: React.FC = () => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const wake = F(T.wake), sleep = F(T.sleep), desk = F(T.desk), tap = F(T.tap), pull = F(T.pull);
  const act1 = fr < sleep + 14, act3 = fr >= desk - 4;

  // act one: the screen lit, the camera creeping closer as the stack grows; act three: the phone returns
  const lit = act1 ? ease(fr, wake - 6, wake) * (1 - ease(fr, sleep, sleep + 5, theme.ease.in)) : ease(fr, desk, desk + 5);
  const phoneIn = act1 ? 1 - ease(fr, sleep + 4, sleep + 14, theme.ease.in) : ease(fr, desk - 4, desk + 14);
  const creep = act1 ? ease(fr, F(0.6), F(8.6), theme.ease.inOut) : 0;
  const pullP = ease(fr, pull, pull + 42, theme.ease.inOut);
  const scale = act1 ? 1 + creep * 0.13 : mix(0.96 + 0.04 * phoneIn, 0.4, pullP);
  const lift = act1 ? creep * 120 : mix((1 - phoneIn) * 60, -360, pullP);
  const jitter = act1 ? Math.sin(fr * 1.7) * creep * 1.6 : 0;
  const skyLight = act3 ? ease(fr, pull + 6, pull + 50, theme.ease.inOut) : 0;
  const skyDim = act1 ? 0.55 : act3 ? ease(fr, desk - 4, desk + 20) : 0;

  const screen = (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 47, background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, opacity: lit }}>
        {act1 && <LockScreen light={0} time="9:47" date="Thursday, October 2">{NOTES.map((n, i) => <Stacked key={i} n={n} i={i} />)}</LockScreen>}
        {act3 && <>
          <Page from={desk} to={tap + 3}><TitleScreen press={ease(fr, tap - 2, tap + 1) * (1 - ease(fr, tap + 2, tap + 6))} /></Page>
          <Page from={tap + 6}><FiledScreen at={tap + 6} /></Page>
          <Touch at={tap} x={195} y={729} />
        </>}
      </div>
      <Island />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 38%)", opacity: 1 - lit * 0.7 }} />
    </div>
  );

  const endIn = (i: number) => spring({ frame: fr - pull - 26 - i * 5, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill style={{ background: "#07090F" }}>
      <Fonts />
      <AbsoluteFill style={{ opacity: skyDim }}><Sky light={skyLight} /></AbsoluteFill>
      {(act1 || act3) && (
        <div style={{ position: "absolute", left: 540 - ((SW + BEZEL * 2) * K) / 2, top: 960 - ((SH + BEZEL * 2) * K) / 2, width: (SW + BEZEL * 2) * K, height: (SH + BEZEL * 2) * K,
          opacity: phoneIn, transform: `translate(${jitter}px, ${lift}px) scale(${scale})`, transformOrigin: "50% 50%" }}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${K})`, transformOrigin: "0 0", width: SW + BEZEL * 2, height: SH + BEZEL * 2 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 56, background: "linear-gradient(145deg,#2A3044,#0C0F18 40%,#1B2030)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.7), inset 0 0 0 1.2px rgba(200,214,252,.18)" }} />
            <div style={{ position: "absolute", left: BEZEL, top: BEZEL, width: SW, height: SH }}>{screen}</div>
          </div>
        </div>
      )}
      {LINES.map((l, i) => <TypedLine key={i} line={l} out={T.linesOut[i]} />)}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1180, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: theme.font }}>
        {[
          <Mark key="m" size={112} />,
          <div key="w" style={{ marginTop: 26, fontSize: 64, fontWeight: 800, letterSpacing: "-0.045em", color: C.ink }}>Obavia</div>,
          <div key="t" style={{ marginTop: 14, fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: C.deep }}>Every title. Every day, counted.</div>,
          <div key="d" style={{ marginTop: 120, fontSize: 24, fontWeight: 600, color: C.slate, opacity: 0.85 }}>Dramatization. Names are fictional.</div>,
        ].map((el, i) => <div key={i} style={{ opacity: endIn(i), transform: `translateY(${(1 - endIn(i)) * 30}px) scale(${0.97 + 0.03 * endIn(i)})` }}>{el}</div>)}
      </div>
      <Finish dark={1 - skyLight} />
      <Audio src={staticFile("sfx/pain/mix.wav")} />
    </AbsoluteFill>
  );
};
