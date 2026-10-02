/* The Bill. The money pain first; the Desk's own title step last.
   Beats, words and the source of every figure are in ./timeline.ts. */
import React from "react";
import { AbsoluteFill, Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Finish, Fonts, Mark, Sky } from "../kit";
import { BEZEL, CloudButton, Desk, Island, K, LockScreen, Page, SH, SW, Touch, ease, mix } from "../evening/Evening";
import { Glyph } from "../pain/DayFortyFour";
import { TypedLine } from "../pain/typed";
import type { Note } from "../pain/timeline";
import { ITEMS, LINES, NOTE_INVOICE, PLATE, RUNNER, T, TOTAL, f as F, plateAt } from "./timeline";

const C = theme.colors;
const usd = (c: number) => "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* a notification banner: on the lock screen it sits mid-screen; over an open app it drops from the top */
const Banner: React.FC<{ n: Note; y: number }> = ({ n, y }) => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const at = F(n.t);
  if (fr < at) return null;
  const p = spring({ frame: fr - at, fps, config: { damping: 15, stiffness: 190, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: 10, width: SW - 20, top: y, boxSizing: "border-box", padding: "12px 14px", borderRadius: 22, zIndex: 45,
      background: "rgba(246,249,255,0.86)", backdropFilter: "blur(18px)", boxShadow: "0 16px 36px -18px rgba(14,20,38,.55)", fontFamily: theme.font, color: C.ink,
      opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * -40}px) scale(${0.92 + 0.08 * p})`, transformOrigin: "50% 0" }}>
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Glyph app={n.app} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <b style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{n.from}</b>
            <span style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>now</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 14.5, lineHeight: 1.3, fontWeight: 500, color: C.body }}>{n.text}</div>
        </div>
      </div>
    </div>
  );
};

/* the invoice, as a plain mail-style page: lines land one by one, the total climbs */
const Invoice: React.FC = () => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const landed = ITEMS.reduce((t, it, i) => t + it.cents * Math.min(1, spring({ frame: fr - F(T.rows[i]), fps, config: { damping: 20, stiffness: 140 } })), 0);
  const totalP = spring({ frame: fr - F(T.total), fps, config: theme.spring.bouncy });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#FBFCFF", fontFamily: theme.font, color: C.ink }}>
      <div style={{ position: "absolute", left: 24, top: 70, right: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 650, color: C.slate }}>Billing · Invoice #10-2026</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", marginTop: 4 }}>October</div>
      </div>
      {ITEMS.map((it, i) => {
        const p = spring({ frame: fr - F(T.rows[i]), fps, config: { damping: 16, stiffness: 180, mass: 0.6 } });
        if (fr < F(T.rows[i])) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 24, right: 24, top: 150 + i * 48, height: 48, display: "flex", alignItems: "center", borderBottom: "1px solid #E6EBF7",
            opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * 26}px)` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>{it.label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 550, color: C.slate }}>{it.detail}</div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{usd(it.cents)}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 24, right: 24, top: 600, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 17, fontWeight: 650, color: C.slate }}>Amount due</div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", color: fr >= F(T.total) ? "#9E2F27" : C.ink,
          transform: `scale(${1 + (fr >= F(T.total) ? (1 - totalP) * 0.12 : 0)})`, transformOrigin: "100% 50%" }}>{usd(Math.round(landed))}</div>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 660, fontSize: 13, fontWeight: 550, color: C.slate, opacity: ease(fr, F(T.total) + 4, F(T.total) + 14) }}>
        Plus title work, billed separately.
      </div>
    </div>
  );
};

const FIELDS: [string, string][] = [
  ["VIN", "1HGCV1F3XLA012345"], ["Year, make, model", "2020 Honda Accord"], ["Odometer", "61240"], ["Buyer", "Marcus Reed"],
  ["County", "Harris"], ["Sales price", "14900.00"], ["Tax", "931.25"], ["Lienholder", "Example Motors LLC"],
];

/* the Desk's own title step: every webDEALER field ready to copy, then the plate */
const TitleStep: React.FC<{ press: number }> = ({ press }) => {
  const fr = useCurrentFrame();
  const n = [...PLATE].filter((_, i) => fr >= F(plateAt(i))).length;
  const plate = PLATE.slice(0, n);
  const typing = n > 0 && n < PLATE.length;
  return (
    <Desk>
      <div style={{ position: "absolute", left: 18, top: 62, display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 650, color: "#4E6AA8" }}>
        <svg width="10" height="17" viewBox="0 0 10 17"><path d="M8 2 2 8.5 8 15" stroke="#4E6AA8" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>The Sale
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, top: 100, textAlign: "center", fontSize: 28, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1 }}>File The Title And Get Plates.</div>
      <div style={{ position: "absolute", left: 16, right: 16, top: 180, borderRadius: 18, background: "rgba(255,255,255,.9)", boxShadow: "0 0 0 1px #DCE4FA", overflow: "hidden" }}>
        {FIELDS.map(([k, v], i) => {
          const copied = T.copies.some((t, j) => j === i && fr >= F(t) && fr < F(t) + 24);
          return (
            <div key={k} style={{ height: 50, padding: "0 14px", display: "flex", alignItems: "center", borderTop: i ? "1px solid #EDF1FA" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.slate }}>{k}</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{v}</div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: copied ? "#fff" : "#4E6AA8", background: copied ? "#4E6AA8" : "#EEF3FF", borderRadius: 999, padding: "5px 11px" }}>{copied ? "Copied" : "Copy"}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 20, right: 20, top: 600 }}>
        <div style={{ fontSize: 13, fontWeight: 650, color: C.slate, marginBottom: 6 }}>The plate they issued</div>
        <div style={{ height: 50, borderRadius: 16, background: "rgba(255,255,255,.92)", boxShadow: `0 0 0 ${n ? 2 : 1}px ${n ? "#AFC1EE" : "#DCE4FA"}`, display: "flex", alignItems: "center", padding: "0 16px",
          fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", color: n ? C.navy : "#9AA1B0" }}>
          {plate || "ABC 1234"}{(typing || (n === PLATE.length && Math.floor(fr / 15) % 2 === 0)) && <span style={{ width: 2.5, height: 24, marginLeft: 2, background: "#4E6AA8", borderRadius: 2 }} />}
        </div>
      </div>
      <CloudButton label="Plates Are On" y={726} dim={n < PLATE.length} pressed={press} />
    </Desk>
  );
};

const PlatesOn: React.FC<{ at: number }> = ({ at }) => {
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
        <div style={{ fontSize: 17, fontWeight: 500, color: "#6B7385" }}>Marcus Reed · 2020 Honda Accord</div>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.04em", marginTop: 6 }}>Plates <span style={{ color: "#4E6AA8" }}>are on.</span></div>
      </div>
    </Desk>
  );
};

export const TheBill: React.FC = () => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const wake = F(T.wake), open = F(T.open), sleep = F(T.sleep), desk = F(T.desk), on = F(T.on), pull = F(T.pull);
  const act1 = fr < sleep + 14, act3 = fr >= desk - 4;

  const lit = act1 ? ease(fr, wake - 6, wake) * (1 - ease(fr, sleep, sleep + 5, theme.ease.in)) : ease(fr, desk, desk + 5);
  const phoneIn = act1 ? 1 - ease(fr, sleep + 4, sleep + 14, theme.ease.in) : ease(fr, desk - 4, desk + 14);
  const creep = act1 ? ease(fr, F(T.rows[0]), F(T.total) + 20, theme.ease.inOut) : 0;
  const pullP = ease(fr, pull, pull + 42, theme.ease.inOut);
  const scale = act1 ? 1 + creep * 0.1 : mix(0.96 + 0.04 * phoneIn, 0.4, pullP);
  const lift = act1 ? creep * 90 : mix((1 - phoneIn) * 60, -360, pullP);
  const skyLight = act3 ? ease(fr, pull + 6, pull + 50, theme.ease.inOut) : 0;
  const skyDim = act1 ? 0.55 : act3 ? ease(fr, desk - 4, desk + 20) : 0;

  const screen = (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 47, background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, opacity: lit }}>
        {act1 && <>
          {fr < open + 8 && <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(fr, open + 1, open + 6, theme.ease.in) }}><LockScreen light={0} time="8:12" date="Friday, October 2"><Banner n={NOTE_INVOICE} y={470} /></LockScreen></div>}
          <Page from={open + 5}><Invoice /></Page>
          {RUNNER.map((n, i) => <Banner key={i} n={n} y={56 + i * 6} />)}
          <Touch at={open} x={200} y={510} />
        </>}
        {act3 && <>
          <Page from={desk} to={on + 3}><TitleStep press={ease(fr, on - 2, on + 1) * (1 - ease(fr, on + 2, on + 6))} /></Page>
          <Page from={on + 6}><PlatesOn at={on + 6} /></Page>
          {T.copies.map((t, i) => <Touch key={i} at={F(t)} x={340} y={205 + i * 50} />)}
          <Touch at={on} x={195} y={755} />
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
          opacity: phoneIn, transform: `translateY(${lift}px) scale(${scale})`, transformOrigin: "50% 50%" }}>
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
          <div key="w" style={{ marginTop: 26, fontSize: 64, fontWeight: 800, letterSpacing: "-0.045em", color: C.ink }}>Obavia Desk</div>,
          <div key="t" style={{ marginTop: 14, fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: C.deep }}>File your own titles. In minutes.</div>,
          <div key="d" style={{ marginTop: 110, width: 860, textAlign: "center", fontSize: 22, lineHeight: 1.35, fontWeight: 600, color: C.slate, opacity: 0.85 }}>Dramatization. Invoice lines: one DMS’s published prices, October 2026.</div>,
        ].map((el, i) => <div key={i} style={{ opacity: endIn(i), transform: `translateY(${(1 - endIn(i)) * 30}px) scale(${0.97 + 0.03 * endIn(i)})` }}>{el}</div>)}
      </div>
      <Finish dark={1 - skyLight} />
      <Audio src={staticFile("sfx/bill/mix.wav")} />
    </AbsoluteFill>
  );
};
