/* One Phone, One Evening.

   A dealer's evening on one phone, scored only with the phone's own sounds:
   the lock button, a notification, finger taps, the keypad, the delete key,
   and the done chime with its haptic. No music. One room.

   7:00 PM. Tonight's Text arrives. The owner opens the Desk, counts the drawer
   (types 25, deletes, 240), closes the day. The phone sleeps. The next
   evening's text says nothing needs them. Pull back to the mark.

   Every screen is the Desk's own: Tonight's Text, Payments, Close The Day.
   Figures are illustrative; the dealer is the Desk's fictional example. */
import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Finish, Fonts, Mark, Sky, clampOpts } from "../kit";
import { T, f as F } from "./timeline";

const C = theme.colors;
export const K = 2;                                  // px per iPhone point
export const SW = 390, SH = 844;                     // screen, in points
export const BEZEL = 9;
const DEALER = "Example Motors";
const TEXT_1 = `${DEALER} today: $1,180.00 in from 6 payments (3 autopay, 2 by text link, 1 cash at the counter). 1 thing needs you: close the drawer ($240.00 cash).`;
const TEXT_2 = `${DEALER} today: $860.00 in from 4 payments (3 autopay, 1 by text link). Nothing needs you.`;
const BANNER = { x: 10, y: 470, w: 370, h: 124 };

export const ease = (fr: number, a: number, b: number, e = theme.ease.out) => interpolate(fr, [a, b], [0, 1], { ...clampOpts, easing: e });
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- the pieces inside the screen (all in points) ---------- */

export const Island: React.FC = () => <div style={{ position: "absolute", left: (SW - 124) / 2, top: 11, width: 124, height: 36, borderRadius: 20, background: "#000", zIndex: 50 }} />;

export const StatusBar: React.FC<{ time: string; dark?: boolean }> = ({ time, dark }) => {
  const ink = dark ? "#fff" : C.ink;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 54, zIndex: 40, fontFamily: theme.font, color: ink }}>
      <div style={{ position: "absolute", left: 44, top: 19, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{time}</div>
      <div style={{ position: "absolute", right: 30, top: 21, display: "flex", alignItems: "flex-end", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>{[5, 7, 9, 11].map(h => <div key={h} style={{ width: 3, height: h, borderRadius: 1, background: ink }} />)}</div>
        <div style={{ width: 24, height: 11.5, borderRadius: 3.5, boxShadow: `inset 0 0 0 1px ${dark ? "rgba(255,255,255,.5)" : "rgba(28,36,54,.4)"}`, padding: 2, boxSizing: "border-box" }}>
          <div style={{ width: "78%", height: "100%", borderRadius: 1.5, background: ink }} />
        </div>
      </div>
    </div>
  );
};

/* the wallpaper is the site's own sky, cropped to the screen */
export const Wallpaper: React.FC<{ light: number }> = ({ light }) => {
  const s = SH / 1920;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: (SW - 1080 * s) / 2, top: 0, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <Sky light={light} />
      </div>
    </div>
  );
};

export const AppIcon: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.23, background: "linear-gradient(180deg,#FFFFFF,#E9EFFD)", display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 .5px rgba(28,36,54,.12)" }}>
    <Mark size={size * 0.7} />
  </div>
);

const Banner: React.FC<{ at: number; text: string; morph?: number }> = ({ at, text, morph = 0 }) => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  if (fr < at) return null;
  const p = spring({ frame: fr - at, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
  return (
    <div style={{ position: "absolute", left: BANNER.x, top: BANNER.y, width: BANNER.w, minHeight: BANNER.h, boxSizing: "border-box", padding: "13px 15px 14px", borderRadius: 24,
      background: "rgba(246,249,255,0.78)", backdropFilter: "blur(18px)", boxShadow: "0 18px 40px -22px rgba(14,20,38,.55)",
      fontFamily: theme.font, color: C.ink, opacity: Math.min(1, p * 1.4) * (1 - morph), transform: `translateY(${(1 - p) * -34}px) scale(${0.92 + 0.08 * p})`, transformOrigin: "50% 0" }}>
      <div style={{ display: "flex", gap: 11 }}>
        <AppIcon size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <b style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Obavia</b>
            <span style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>now</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 14.5, lineHeight: 1.32, fontWeight: 500, color: C.body, letterSpacing: "-0.005em" }}>{text}</div>
        </div>
      </div>
    </div>
  );
};

export const LockScreen: React.FC<{ light: number; time: string; date: string; children?: React.ReactNode }> = ({ light, time, date, children }) => {
  const ink = light > 0.5 ? C.navy : "#fff";
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Wallpaper light={light} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 96, textAlign: "center", fontFamily: theme.font, color: ink }}>
        <div style={{ fontSize: 19, fontWeight: 650, opacity: 0.85 }}>{date}</div>
        <div style={{ fontSize: 104, fontWeight: 650, letterSpacing: "-0.055em", lineHeight: 1, marginTop: 2 }}>{time}</div>
      </div>
      <div style={{ position: "absolute", left: (SW - 140) / 2, bottom: 9, width: 140, height: 5, borderRadius: 3, background: ink, opacity: 0.85 }} />
      {children}
    </div>
  );
};

/* the Desk's own look: light sky, Manrope, the white cloud button */
export const Desk: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#E3EBFD 0%,#F2F6FF 36%,#F6F9FF 100%)", fontFamily: theme.font, color: C.ink }}>
    <StatusBar time="7:01" />
    {children}
  </div>
);

export const CloudButton: React.FC<{ label: string; y: number; dim?: boolean; pressed?: number }> = ({ label, y, dim, pressed = 0 }) => (
  <div style={{ position: "absolute", left: 20, right: 20, top: y, height: 58, borderRadius: 999, display: "grid", placeItems: "center",
    background: "linear-gradient(180deg,#FFFFFF 0%,#FBFCFF 46%,#EAF0FE 100%)", boxShadow: "inset 0 -10px 18px -10px rgba(150,176,232,.55), inset 0 1.5px 0 #fff, 0 12px 22px -10px rgba(78,106,168,.35)",
    fontSize: 17, fontWeight: 750, letterSpacing: "-0.01em", color: C.ink, opacity: dim ? 0.55 : 1, transform: `scale(${1 - pressed * 0.03})` }}>{label}</div>
);

const Row: React.FC<{ y: number; title: string; gloss?: string; warn?: boolean; pressed?: number }> = ({ y, title, gloss, warn, pressed = 0 }) => (
  <div style={{ position: "absolute", left: 20, right: 20, top: y, height: 66, borderRadius: 18, padding: "0 18px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12,
    background: `rgba(255,255,255,${0.88 - pressed * 0.2})`, boxShadow: "0 0 0 1px #DCE4FA", transform: `scale(${1 - pressed * 0.02})` }}>
    {warn && <span style={{ width: 9, height: 9, borderRadius: 5, background: "#D9A441" }} />}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 16.5, fontWeight: 750, letterSpacing: "-0.015em" }}>{title}</div>
      {gloss && <div style={{ fontSize: 13.5, fontWeight: 550, color: C.slate, marginTop: 2 }}>{gloss}</div>}
    </div>
    <svg width="9" height="15" viewBox="0 0 9 15"><path d="M1.5 1.5 7.5 7.5 1.5 13.5" stroke="#9AA1B0" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

const Payments: React.FC<{ press: number }> = ({ press }) => (
  <Desk>
    <div style={{ position: "absolute", left: 0, right: 0, top: 128, textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: "#6B7385" }}>In <em style={{ fontStyle: "normal", color: "#4E6AA8" }}>today</em></div>
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1, marginTop: 6 }}>$1,180</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: "#6B7385", marginTop: 12 }}>from 6 payments</div>
    </div>
    <Row y={330} title="Close The Day" gloss="$240.00 cash to count" warn pressed={press} />
    <Row y={408} title="Every Account" gloss="42 notes" />
    <Row y={486} title="Tonight’s Text" gloss="Sent to you at 7:00 PM" />
  </Desk>
);

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];
const SUBS: Record<string, string> = { "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ" };
const Keypad: React.FC<{ down: string | null }> = ({ down }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 291, background: "rgba(214,222,240,0.92)", backdropFilter: "blur(20px)", padding: "8px 6px 0", boxSizing: "border-box",
    display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: 52, gap: 6, alignContent: "start" }}>
    {KEYS.map(k => {
      const isDown = down === k, plain = k === "." || k === "del";
      return (
        <div key={k} style={{ borderRadius: 7, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: plain ? (isDown ? "#fff" : "transparent") : isDown ? "#BCC6DC" : "#fff", boxShadow: plain ? "none" : "0 1px 0 rgba(28,36,54,.28)" }}>
          {k === "del"
            ? <svg width="26" height="19" viewBox="0 0 26 19"><path d="M8.5 1.5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-14L1.5 9.5z" fill="none" stroke={C.ink} strokeWidth="1.7" strokeLinejoin="round" /><path d="m12 6 7 7m0-7-7 7" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round" /></svg>
            : <><span style={{ fontSize: 25, fontWeight: 500, lineHeight: 1, color: C.ink }}>{k}</span>{SUBS[k] && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: C.ink, marginTop: 1 }}>{SUBS[k]}</span>}</>}
        </div>
      );
    })}
  </div>
);

const Count: React.FC<{ value: string; down: string | null; press: number; caret: boolean }> = ({ value, down, press, caret }) => {
  const shown = value === "" ? "0" : value;
  return (
    <Desk>
      <div style={{ position: "absolute", left: 18, top: 62, display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 650, color: "#4E6AA8" }}>
        <svg width="10" height="17" viewBox="0 0 10 17"><path d="M8 2 2 8.5 8 15" stroke="#4E6AA8" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>Payments
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 128, textAlign: "center", fontSize: 34, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.08 }}>How Much Is There?</div>
      <div style={{ position: "absolute", left: 20, right: 20, top: 196, height: 76, borderRadius: 18, background: "rgba(255,255,255,.9)", boxShadow: `0 0 0 ${value ? 2 : 1}px ${value ? "#AFC1EE" : "#DCE4FA"}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", color: value ? C.navy : "#9AA1B0" }}>
        <span>${shown}</span>
        <span style={{ width: 2.5, height: 38, marginLeft: 3, borderRadius: 2, background: "#4E6AA8", opacity: caret ? 1 : 0 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center", fontSize: 15.5, fontWeight: 500, color: "#6B7385" }}>The Desk recorded $240.00</div>
      <CloudButton label="Close The Day" y={472} dim={!value} pressed={press} />
      <Keypad down={down} />
    </Desk>
  );
};

const Closed: React.FC<{ at: number }> = ({ at }) => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: fr - at, fps, config: theme.spring.bouncy });
  const draw = ease(fr, at + 3, at + 15);
  const line = (i: number) => spring({ frame: fr - at - 6 - i * 4, fps, config: theme.spring.smooth });
  return (
    <Desk>
      <div style={{ position: "absolute", left: (SW - 104) / 2, top: 196, width: 104, height: 104, borderRadius: 52, background: "linear-gradient(180deg,#FFFFFF,#EAF0FE)",
        boxShadow: "inset 0 -10px 18px -10px rgba(150,176,232,.6), 0 18px 34px -16px rgba(78,106,168,.45)", display: "grid", placeItems: "center", transform: `scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 1.5) }}>
        <svg width="50" height="50" viewBox="0 0 50 50"><path d="M12 26.5 21 35 38 16" fill="none" stroke="#4E6AA8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="44" strokeDashoffset={44 * (1 - draw)} /></svg>
      </div>
      {[
        <div key="h" style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.04em" }}>Day Closed.</div>,
        <div key="s" style={{ fontSize: 16, fontWeight: 500, color: "#6B7385", marginTop: 10 }}>Counted $240.00 · Waiting for the bank</div>,
      ].map((el, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 336 + i * 44, textAlign: "center", opacity: line(i), transform: `translateY(${(1 - line(i)) * 10}px)` }}>{el}</div>)}
    </Desk>
  );
};

/* a finger: a soft ring that blooms and lets go */
export const Touch: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const fr = useCurrentFrame();
  const p = ease(fr, at - 2, at + 9);
  if (fr < at - 2 || p >= 1) return null;
  return <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, zIndex: 60, background: "rgba(78,106,168,.22)", boxShadow: "0 0 0 1.5px rgba(78,106,168,.35)",
    opacity: Math.sin(p * Math.PI), transform: `scale(${0.7 + p * 0.5})` }} />;
};

/* the Desk's page change: out .16s with a 4pt lift, in .4s rising 8pt */
export const Page: React.FC<{ from: number; to?: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const fr = useCurrentFrame();
  if (fr < from || (to !== undefined && fr >= to + 5)) return null;
  const inP = ease(fr, from, from + 12, theme.ease.out);
  const outP = to === undefined ? 0 : ease(fr, to, to + 5, theme.ease.in);
  return <div style={{ position: "absolute", inset: 0, opacity: inP * (1 - outP), transform: `translateY(${(1 - inP) * 8 - outP * 4}px)` }}>{children}</div>;
};

/* ---------- the film ---------- */

export const Evening: React.FC = () => {
  const fr = useCurrentFrame(); const { fps } = useVideoConfig();
  const wake = F(T.wake), note = F(T.note), open = F(T.open), row = F(T.row), close = F(T.close), sleep = F(T.sleep), morning = F(T.morning), pull = F(T.pull);

  // the count, as typed: 2, 5, delete, 4, 0
  let value = ""; let down: string | null = null;
  for (const k of T.keys) {
    const at = F(k.t);
    if (fr >= at) value = k.k === "del" ? value.slice(0, -1) : value + k.k;
    if (fr >= at && fr < at + 4) down = k.k;
  }
  const typing = T.keys.some(k => fr >= F(k.t) && fr < F(k.t) + 10);
  const caret = typing || Math.floor(fr / 16) % 2 === 0;

  // the screen's light: on at the lock click, off at the next, on again with the text
  const lit = fr < wake ? 0 : fr < sleep ? ease(fr, wake, wake + 5) : fr < morning - 2 ? 1 - ease(fr, sleep, sleep + 6, theme.ease.in) : ease(fr, morning - 2, morning + 4);
  const morph = ease(fr, open + 1, open + 14, theme.ease.inOut);

  // camera: still, a slow lean in for the count, back for the close, then the pull
  const lean = ease(fr, row + 4, row + 30, theme.ease.inOut) * (1 - ease(fr, close + 4, close + 26, theme.ease.inOut));
  const pullP = ease(fr, pull, pull + 42, theme.ease.inOut);
  const scale = mix(1 + lean * 0.035 + ease(fr, 0, wake + 30) * -0.02 + 0.02, 0.4, pullP);
  const lift = mix(0, -360, pullP);
  const sway = Math.sin(fr / 47) * 3 * (1 - pullP);
  const skyLight = ease(fr, pull + 6, pull + 50, theme.ease.inOut);

  const screen = (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 47, background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, opacity: lit }}>
        {fr < sleep + 8 && fr < open + 16 && (
          <LockScreen light={0} time="7:00" date="Friday, October 2">
            <Banner at={note} text={TEXT_1} morph={ease(fr, open + 6, open + 12)} />
          </LockScreen>
        )}
        {fr >= open && fr < sleep + 8 && (
          <div style={{ position: "absolute", left: mix(BANNER.x, 0, morph), top: mix(BANNER.y, 0, morph), width: mix(BANNER.w, SW, morph), height: mix(BANNER.h, SH, morph),
            borderRadius: mix(24, 47, morph), overflow: "hidden", background: "#F2F6FF" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH, opacity: ease(fr, open + 10, open + 20) }}>
              <Page from={open + 10} to={row + 3}><Payments press={ease(fr, row - 2, row + 1) * (1 - ease(fr, row + 2, row + 6))} /></Page>
              <Page from={row + 8} to={close + 3}><Count value={value} down={down} caret={caret} press={ease(fr, close - 2, close + 1) * (1 - ease(fr, close + 2, close + 6))} /></Page>
              <Page from={close + 8}><Closed at={close + 8} /></Page>
            </div>
          </div>
        )}
        {fr >= morning - 2 && (
          <LockScreen light={0} time="7:00" date="Saturday, October 3">
            <Banner at={morning} text={TEXT_2} />
          </LockScreen>
        )}
        <Touch at={open} x={200} y={BANNER.y + 60} />
        <Touch at={row} x={200} y={363} />
        {T.keys.map(k => { const i = KEYS.indexOf(k.k); return <Touch key={k.t} at={F(k.t)} x={66 + (i % 3) * 129} y={SH - 291 + 8 + Math.floor(i / 3) * 58 + 26} />; })}
        <Touch at={close} x={195} y={501} />
      </div>
      <Island />
      {/* glass: a faint sheen that shows most when the screen is dark */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 38%)", opacity: 1 - lit * 0.7, pointerEvents: "none" }} />
    </div>
  );

  // end card
  const endIn = (i: number) => spring({ frame: fr - pull - 26 - i * 5, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill style={{ background: "#0B1020" }}>
      <Fonts />
      <AbsoluteFill style={{ opacity: ease(fr, 0, 14) }}><Sky light={skyLight} /></AbsoluteFill>
      <div style={{ position: "absolute", left: 540 - ((SW + BEZEL * 2) * K) / 2, top: 960 - ((SH + BEZEL * 2) * K) / 2, width: (SW + BEZEL * 2) * K, height: (SH + BEZEL * 2) * K,
        transform: `translateY(${lift + sway}px) scale(${scale})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${K})`, transformOrigin: "0 0", width: SW + BEZEL * 2, height: SH + BEZEL * 2 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 56, background: "linear-gradient(145deg,#2A3044,#0C0F18 40%,#1B2030)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.7), inset 0 0 0 1.2px rgba(200,214,252,.18)" }} />
          <div style={{ position: "absolute", left: BEZEL, top: BEZEL, width: SW, height: SH }}>{screen}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1180, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: theme.font }}>
        {[
          <Mark key="m" size={112} />,
          <div key="w" style={{ marginTop: 26, fontSize: 64, fontWeight: 800, letterSpacing: "-0.045em", color: C.ink }}>Obavia</div>,
          <div key="t" style={{ marginTop: 14, fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: C.deep }}>Close the day from your phone.</div>,
          <div key="d" style={{ marginTop: 120, fontSize: 24, fontWeight: 600, color: C.slate, opacity: 0.85 }}>Demonstration. Figures are illustrative.</div>,
        ].map((el, i) => <div key={i} style={{ opacity: endIn(i), transform: `translateY(${(1 - endIn(i)) * 30}px) scale(${0.97 + 0.03 * endIn(i)})` }}>{el}</div>)}
      </div>
      <Finish dark={1 - skyLight} />
      <Audio src={staticFile("sfx/evening/mix.wav")} />
    </AbsoluteFill>
  );
};
