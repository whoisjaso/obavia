/* "Obavia Desk", the landing-page film (16:9), and the short silent loops
   for each section of the page. All screens are real Desk captures. */
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { Fonts, Mark, Sfx, clampOpts } from "./kit";
import { Caption, Grade, Phone, WideSky, timeline, type Shot } from "./desk";

const B = 795; // the dock button, in screen points
export const FIND: Shot[] = [
  { src: "01-state", s: 1.5, tap: [106, 467] }, { src: "02-search", s: 0.8 },
  { src: "03-type-0", s: 0.32, cut: true }, { src: "03-type-1", s: 0.32, cut: true }, { src: "03-type-2", s: 0.32, cut: true },
  { src: "03-type-3", s: 1.2, cut: true, tap: [190, 700] }, { src: "04-isthisyou", s: 1.4, tap: [180, 530] },
  { src: "05-code", s: 0.45 }, { src: "05-code-0", s: 0.2, cut: true }, { src: "05-code-1", s: 0.2, cut: true }, { src: "05-code-2", s: 0.2, cut: true }, { src: "05-code-3", s: 0.5, cut: true },
];
export const PAPER: Shot[] = [
  { src: "07-colour", s: 0.9 }, { src: "07b-colour-pick", s: 1.0, cut: true, tap: [195, B] }, { src: "09-paper", s: 1.3 }, { src: "09b-paper-mid", s: 1.0, cut: true },
];
export const SALE: Shot[] = [
  { src: "10-sales", s: 1.0, tap: [195, B] }, { src: "11-car", s: 1.0, tap: [190, 300] }, { src: "12-odo", s: 0.9, tap: [195, B] }, { src: "13-title", s: 0.9, tap: [195, 292] },
  { src: "14b-name-typed", s: 0.9 }, { src: "15-readback", s: 1.2, tap: [195, B] }, { src: "17-funding", s: 0.8 }, { src: "18b-paid-typed", s: 1.4, tap: [195, 782] }, { src: "19-price", s: 0.9 },
];
export const SIGN: Shot[] = [
  { src: "22-bos-review", s: 1.0 }, { src: "22b-signed", s: 1.1, cut: true, tap: [195, 734] }, { src: "24-packet", s: 1.0 },
  { src: "25-ceremony", s: 0.9, tap: [195, B] }, { src: "27-ceremony-signed", s: 1.2, tap: [195, B] }, { src: "28-done", s: 1.3 },
];
export const REACH: Shot[] = [{ src: "31-reach", s: 1.5 }, { src: "32-marketplace", s: 1.8 }];

const FPS = 30;
const len = (s: Shot[]) => timeline(s, FPS).total;
const BOS_HOLD = Math.round(3.4 * FPS);
// scene starts, in frames
const T0 = 0, T_FIND = 96, T_PAPER = T_FIND + len(FIND), T_BOS = T_PAPER + len(PAPER), T_SALE = T_BOS + BOS_HOLD, T_SIGN = T_SALE + len(SALE), T_REACH = T_SIGN + len(SIGN), T_END = T_REACH + len(REACH);
export const DESK_FILM_FRAMES = T_END + 150;
const ALL: Shot[] = [...FIND, ...PAPER, { src: "09b-paper-mid", s: BOS_HOLD / FPS, cut: true }, ...SALE, ...SIGN, ...REACH];

/** Ticks where a finger lands. */
const Taps: React.FC<{ shots: Shot[]; start: number }> = ({ shots, start }) => {
  const { at } = timeline(shots, FPS);
  return <>{shots.map((s, i) => s.tap ? <Sfx key={i} name="tick" at={start + at[i] + Math.round(s.s * FPS) - 14} volume={0.35} dur={12} /> : null)}</>;
};

/** The finished bill of sale, as paper, drifting up. */
const Paper: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < at - 1 || f > out + 12) return null;
  const p = spring({ frame: f - at, fps, config: theme.spring.smooth });
  const e = interpolate(f, [out, out + 12], [0, 1], { ...clampOpts, easing: theme.ease.in });
  const drift = interpolate(f, [at, out], [0, -260], { ...clampOpts, easing: theme.ease.inOut });
  return (
    <div style={{ position: "absolute", right: 170, top: 70, width: 720, height: 940, borderRadius: 18, overflow: "hidden", background: "#fff",
      boxShadow: "0 80px 140px -60px rgba(28,36,54,.5), 0 0 0 1px rgba(28,36,54,.06)", opacity: Math.min(1, p) * (1 - e),
      transform: `translateY(${(1 - p) * 120 - e * 40}px) rotate(${(1 - p) * 2.5 + 0.6}deg) scale(${0.96 + 0.04 * p})` }}>
      <Img src={staticFile("desk/bos-full.png")} style={{ width: "100%", transform: `translateY(${drift}px) scale(${1 + (f - at) / 3000})`, transformOrigin: "top center" }} />
    </div>
  );
};

export const DeskFilm: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  // the phone enters from below, steps aside for the paper, then leaves for the end card
  const pin = spring({ frame: f - (T_FIND - 14), fps, config: theme.spring.smooth });
  const aside = interpolate(f, [T_BOS - 8, T_BOS + 10, T_SALE - 10, T_SALE + 8], [0, 1, 1, 0], { ...clampOpts, easing: theme.ease.inOut });
  const leave = interpolate(f, [T_END - 4, T_END + 12], [0, 1], { ...clampOpts, easing: theme.ease.in });
  const breathe = Math.sin(f / 40) * 6;
  const showPhone = f >= T_FIND - 16 && leave < 1;
  return (
    <AbsoluteFill style={{ fontFamily: theme.font }}>
      <Fonts />
      <WideSky />
      {/* 1. open */}
      <OpenCard out={T_FIND - 12} />
      {/* phone */}
      {showPhone && <div style={{ position: "absolute", left: 1130, top: 62, opacity: (1 - aside) * (1 - leave), transform: `translate(${-aside * 1300}px, ${(1 - pin) * 900 + breathe + leave * 80}px) scale(${1 - aside * 0.12})`, filter: aside > 0.01 ? `blur(${aside * 3}px)` : undefined }}>
        <Phone shots={ALL} start={T_FIND} width={450} tilt={-4 + aside * 8} />
      </div>}
      <Paper at={T_BOS} out={T_SALE - 12} />
      {/* captions */}
      <div style={{ position: "absolute", left: 170, top: 330 }}>
        <Caption at={T_FIND} out={T_PAPER - 10} kicker="Onboarding" title="Find your dealership." em={["dealership."]} sub="Search the state’s list of 19,666 licensed Texas dealers. A code to the phone on your licence proves it’s you." />
        <Caption at={T_PAPER} out={T_BOS - 10} kicker="Paperwork" title="In your name, from day one." em={["name,"]} sub="Your logo and colour on every document you print." />
      </div>
      <div style={{ position: "absolute", left: 170, top: 330 }}>
        <Caption at={T_SALE} out={T_SIGN - 10} kicker="Handle a sale" title="One question per screen." em={["One"]} sub="Car, buyer, ID and money, in order. Tax, title and fees are worked out as you go." />
        <Caption at={T_SIGN} out={T_REACH - 10} kicker="Signing" title="Signed at the desk." em={["Signed"]} sub="The buyer reads each page and signs on the screen. The packet is ready to file." />
        <Caption at={T_REACH} out={T_END - 10} kicker="Coming next" soon title="Post each car once." em={["once."]} sub="Reach lists it on Facebook Marketplace from your phone, only after you agree to the terms." />
      </div>
      <div style={{ position: "absolute", left: 170, top: 360, width: 760 }}>
        <Caption at={T_BOS + 4} out={T_SALE - 14} kicker="The bill of sale" title="Every detail, already filled." em={["already"]} sub="Licence, address, vehicle, odometer statement, the price to the cent, and the doc-fee notice." width={720} size={70} />
      </div>
      {/* end */}
      <EndCard at={T_END + 16} />
      <Grade />
      <Audio src={staticFile("sfx/bed_sales.mp3")} volume={fr => interpolate(fr, [0, 20, DESK_FILM_FRAMES - 40, DESK_FILM_FRAMES], [0, 0.22, 0.22, 0], clampOpts)} />
      <Sfx name="whoosh" at={T_FIND - 16} volume={0.3} />
      <Sfx name="whoosh" at={T_BOS - 8} volume={0.25} />
      <Sfx name="stamp" at={T_BOS + 4} volume={0.25} />
      <Sfx name="chime" at={T_END + 18} volume={0.35} />
      <Taps shots={ALL} start={T_FIND} />
    </AbsoluteFill>
  );
};

const OpenCard: React.FC<{ out: number }> = ({ out }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f > out + 12) return null;
  const m = spring({ frame: f - 4, fps, config: theme.spring.bouncy });
  const e = interpolate(f, [out, out + 12], [0, 1], { ...clampOpts, easing: theme.ease.in });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - e, transform: `scale(${1 + e * 0.04})`, filter: e > 0 ? `blur(${e * 10}px)` : undefined }}>
      <div style={{ transform: `translateY(${(1 - m) * 40 + Math.sin(f / 30) * 4}px) scale(${0.7 + 0.3 * m})`, opacity: Math.min(1, m) }}><Mark size={128} /></div>
      <div style={{ marginTop: 44 }}><Caption at={12} out={out + 40} title="Every sale, start to signed." em={["signed."]} align="center" width={1400} size={110} /></div>
      <div style={{ marginTop: 22 }}><Caption at={34} out={out + 40} title="" sub="Obavia Desk, for independent dealers in Texas." align="center" width={1200} size={90} /></div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < at - 1) return null;
  const m = spring({ frame: f - at, fps, config: theme.spring.bouncy });
  const u = spring({ frame: f - at - 30, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: Math.min(1, m), transform: `translateY(${(1 - m) * 40 + Math.sin(f / 30) * 4}px) scale(${0.7 + 0.3 * m})` }}><Mark size={118} /></div>
      <div style={{ marginTop: 40 }}><Caption at={at + 8} out={at + 999} title="Obavia Desk." em={["Desk."]} align="center" width={1200} size={120} sub="Now onboarding Texas dealers." /></div>
      <div style={{ marginTop: 34, padding: "18px 34px", borderRadius: 999, background: theme.colors.navy, color: "#fff", font: `700 34px/1 ${theme.font}`, letterSpacing: "-0.01em", opacity: u, transform: `translateY(${(1 - u) * 24}px)` }}>obavia.co</div>
    </AbsoluteFill>
  );
};

/* ---------- the section loops: one phone, one job, silent ---------- */
export const loopFrames = (s: Shot[]) => len(s) + 18;
export const Loop: React.FC<{ shots: Shot[] }> = ({ shots }) => {
  const f = useCurrentFrame(); const { durationInFrames: D, height: H } = useVideoConfig();
  const fade = interpolate(f, [0, 10, D - 12, D], [0, 1, 1, 0], clampOpts);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <WideSky />
      <div style={{ opacity: 0.35 + fade * 0.65, transform: `translateY(${Math.sin(f / 40) * 5}px)` }}>
        <Phone shots={shots} start={0} width={H * 0.43} />
      </div>
      <Grade />
    </AbsoluteFill>
  );
};
export const LoopFind: React.FC = () => <Loop shots={FIND} />;
export const LoopSale: React.FC = () => <Loop shots={SALE} />;
export const LoopSign: React.FC = () => <Loop shots={SIGN} />;
export const LoopPaper: React.FC = () => <Loop shots={PAPER} />;
export { Sequence };
