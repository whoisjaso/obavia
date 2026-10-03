/* "The Desk keeps the books": a 16:9 launch film for Desk payments, cut in the
   grammar of an agent film. Words sharpen in one at a time, the camera pushes
   into the product, the Desk's work shimmers while it runs and ticks off as it
   finishes, and big caption beats sit between the scenes.
   Every figure is example data; every capability shown exists in the Desk. */
import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { Fonts, Mark, Sfx, clampOpts } from "./kit";
import { WideSky } from "./desk";

const C = theme.colors;
const ICE = "#C8D6FC", ICE2 = "#9FB6EC", GOOD = "#5BD6A0", AMBER = "#F2B866", RED = "#F07A7A";
const GLOW = "rgba(140,170,236,0.55)";
const F = theme.font;

/* ---------- motion primitives ---------- */

/** 0 → 1 → 0: a spring in at `at`, a quicker eased exit at `out`. */
function useLife(at: number, out = 1e9, cfg: keyof typeof theme.spring = "smooth") {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const inn = spring({ frame: f - at, fps, config: theme.spring[cfg] });
  const ex = interpolate(f, [out, out + 9], [0, 1], { ...clampOpts, easing: theme.ease.in });
  return { f, inn, ex, on: f >= at - 1 && f <= out + 10 };
}

/** Anything, sharpening in: blur, rise and scale together; out the same way, faster. */
const Sharpen: React.FC<{ at: number; out?: number; children: React.ReactNode; y?: number; style?: React.CSSProperties; blur?: number }> = ({ at, out, children, y = 26, style, blur = 16 }) => {
  const { inn, ex, on } = useLife(at, out);
  if (!on) return null;
  const v = Math.min(1, inn) * (1 - ex);
  return <div style={{ opacity: v, filter: `blur(${(1 - Math.min(1, inn)) * blur + ex * blur}px)`, transform: `translateY(${(1 - inn) * y - ex * 10}px) scale(${0.96 + 0.04 * inn + ex * 0.02})`, ...style }}>{children}</div>;
};

/** A line that arrives one word at a time. Tokens may be words or inline things (an icon, a picture). */
type Tok = string | { node: React.ReactNode; w: number };
const Line: React.FC<{ toks: Tok[]; at: number; out?: number; size?: number; per?: number; color?: string; em?: number[]; weight?: number }> =
  ({ toks, at, out = 1e9, size = 96, per = 5, color = C.ink, em = [], weight = 700 }) => {
    const f = useCurrentFrame(); const { fps } = useVideoConfig();
    if (f < at - 1 || f > out + 12) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.26, font: `${weight} ${size}px/1.1 ${F}`, letterSpacing: "-0.035em", color, whiteSpace: "nowrap" }}>
        {toks.map((t, i) => {
          const s = spring({ frame: f - at - i * per, fps, config: typeof t === "string" ? theme.spring.smooth : theme.spring.bouncy });
          const e = interpolate(f, [out + i * 1.5, out + i * 1.5 + 9], [0, 1], { ...clampOpts, easing: theme.ease.in });
          const v = Math.min(1, s) * (1 - e);
          const style: React.CSSProperties = { display: "inline-block", opacity: v, filter: `blur(${(1 - Math.min(1, s)) * 14 + e * 12}px)`, transform: `translateY(${(1 - s) * 22}px) scale(${typeof t === "string" ? 1 : 0.4 + 0.6 * s})` };
          if (typeof t !== "string") return <span key={i} style={{ ...style, width: t.w, display: "inline-flex", justifyContent: "center" }}>{t.node}</span>;
          const hi = em.includes(i);
          return <span key={i} style={{ ...style, ...(hi ? { background: `linear-gradient(100deg, ${ICE2}, #fff 55%, ${ICE})`, WebkitBackgroundClip: "text", color: "transparent" } : {}) }}>{t}</span>;
        })}
      </div>
    );
  };

/** Text the Desk is working on: a light sweeping across it, the way a thinking line shimmers. */
const Shimmer: React.FC<{ text: string; size?: number; f0?: number }> = ({ text, size = 34, f0 = 0 }) => {
  const f = useCurrentFrame();
  const p = ((f - f0) % 45) / 45;
  const mask = `linear-gradient(90deg, transparent ${p * 100 - 20}%, #000 ${p * 100}%, transparent ${p * 100 + 20}%)`;
  return (
    <span style={{ position: "relative", display: "inline-block", font: `600 ${size}px/1.2 ${F}`, letterSpacing: "-0.01em" }}>
      <span style={{ color: "rgba(200,214,252,.5)" }}>{text}</span>
      <span style={{ position: "absolute", left: 0, top: 0, color: "#fff", WebkitMaskImage: mask, maskImage: mask }}>{text}</span>
    </span>
  );
};

const Tick: React.FC<{ s?: number; color?: string }> = ({ s = 26, color = GOOD }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/** A step the Desk is on: shimmering while it runs, ticked once done. */
const Step: React.FC<{ at: number; done: number; text: string; doneText?: string; size?: number }> = ({ at, done, text, doneText, size = 42 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < at) return null;
  const s = spring({ frame: f - at, fps, config: theme.spring.smooth });
  const d = spring({ frame: f - done, fps, config: theme.spring.bouncy });
  const isDone = f >= done;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: size * 1.5, opacity: Math.min(1, s) ** 2, transform: `translateY(${(1 - s) * 14}px)` }}>
      <span style={{ width: size * 0.9, display: "inline-flex", justifyContent: "center", transform: `scale(${isDone ? d : 1})` }}>
        {isDone ? <Tick s={size * 0.85} /> : <Mark size={size * 0.8} style={{ filter: `drop-shadow(0 0 10px ${GLOW})` }} />}
      </span>
      {isDone ? <span style={{ font: `600 ${size}px/1.2 ${F}`, color: "rgba(214,223,247,.82)", letterSpacing: "-0.01em" }}>{doneText ?? text}</span> : <Shimmer text={text} size={size} f0={at} />}
    </div>
  );
};

/** A dark glass card with an icy edge and glow. */
const Glass: React.FC<{ children: React.ReactNode; w: number; style?: React.CSSProperties; glow?: number; tone?: string }> = ({ children, w, style, glow = 1, tone = ICE }) => (
  <div style={{ width: w, borderRadius: 26, padding: "26px 30px", background: "linear-gradient(160deg, rgba(40,52,84,.82), rgba(20,28,48,.88))",
    boxShadow: `0 0 0 1.5px ${tone}33, 0 0 ${70 * glow}px -12px ${tone}${Math.round(glow * 120).toString(16).padStart(2, "0")}, 0 40px 80px -40px rgba(0,0,0,.8)`, color: "#fff", fontFamily: F, ...style }}>{children}</div>
);

/** A card flying in from depth: scale, blur and a little tilt settle together. */
const Fly: React.FC<{ at: number; out?: number; x: number; y: number; from?: [number, number]; children: React.ReactNode; rot?: number; zoom?: number }> = ({ at, out = 1e9, x, y, from = [0, 140], children, rot = 0, zoom = 1.3 }) => {
  const { f, inn, ex, on } = useLife(at, out);
  if (!on) return null;
  const k = Math.min(1, inn);
  return <div style={{ position: "absolute", left: x, top: y, opacity: k * (1 - ex), filter: `blur(${(1 - k) * 22 + ex * 14}px)`,
    transform: `translate(${(1 - inn) * from[0]}px, ${(1 - inn) * from[1] + Math.sin((f - at) / 34) * 4 - ex * 30}px) scale(${0.82 + 0.18 * inn - ex * 0.04}) rotate(${(1 - inn) * rot}deg)` }}><div style={{ zoom }}>{children}</div></div>;
};

/** A slow camera push across a scene, so nothing ever sits still. */
const Push: React.FC<{ a: number; b: number; children: React.ReactNode; to?: number; origin?: string }> = ({ a, b, children, to = 1.06, origin = "50% 50%" }) => {
  const f = useCurrentFrame();
  if (f < a || f >= b) return null;
  const k = interpolate(f, [a, b], [1, to], { ...clampOpts, easing: theme.ease.inOut });
  return <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

/** The pointer: eased between points, squashing when it clicks. */
const Cursor: React.FC<{ path: [number, number, number][]; clicks?: number[]; size?: number }> = ({ path, clicks = [], size = 46 }) => {
  const f = useCurrentFrame();
  if (f < path[0][0] - 8 || f > path[path.length - 1][0] + 12) return null;
  const fr = path.map(p => p[0]);
  const x = interpolate(f, fr, path.map(p => p[1]), { ...clampOpts, easing: theme.ease.inOut });
  const y = interpolate(f, fr, path.map(p => p[2]), { ...clampOpts, easing: theme.ease.inOut });
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(f, [c - 3, c, c + 6], [0, 1, 0], clampOpts)), 0);
  const fade = interpolate(f, [fr[0] - 8, fr[0], fr[fr.length - 1], fr[fr.length - 1] + 12], [0, 1, 1, 0], clampOpts);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: fade, transform: `scale(${1 - press * 0.18})`, transformOrigin: "0 0", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.45))" }}>
      <svg width={size} height={size * 1.2} viewBox="0 0 20 24"><path d="M2 1.5 L2 19.5 L7 15 L10.4 22.5 L13.6 21 L10.3 13.8 L17 13.8 Z" fill="#fff" stroke="#0E1426" strokeWidth={1.4} strokeLinejoin="round" /></svg>
    </div>
  );
};

/** Background: the light sky that becomes night, misty clouds, an icy glow that breathes. */
const World: React.FC<{ night: number }> = ({ night }) => {
  const f = useCurrentFrame();
  return (
    <>
      <WideSky night={night} />
      <AbsoluteFill style={{ opacity: night, pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: 360 + Math.sin(f / 70) * 80, top: -380, width: 1200, height: 900, borderRadius: "50%", filter: "blur(90px)", background: "radial-gradient(closest-side, rgba(125,151,199,.30), transparent)" }} />
        <div style={{ position: "absolute", right: -260 - Math.cos(f / 80) * 60, bottom: -420, width: 1100, height: 900, borderRadius: "50%", filter: "blur(100px)", background: "radial-gradient(closest-side, rgba(200,214,252,.12), transparent)" }} />
        {[0, 3, 5].map((c, i) => <Img key={i} src={staticFile(`clouds/c${c}.png`)} style={{ position: "absolute", width: 1100, left: -300 + i * 760 + ((f * (i % 2 ? -6 : 7)) / 30), top: [720, -200, 840][i], opacity: 0.035, filter: "blur(18px)" }} />)}
      </AbsoluteFill>
    </>
  );
};

const Finish: React.FC<{ night: number }> = ({ night }) => {
  const f = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return <>
    <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: noise, backgroundSize: "220px", backgroundPosition: `${(f * 7) % 220}px ${(f * 13) % 220}px`, opacity: 0.05 + night * 0.02, mixBlendMode: night > 0.5 ? "overlay" : "multiply" }} />
    <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, transparent 55%, rgba(8,12,24,${0.12 + night * 0.38}) 100%)` }} />
  </>;
};

/** A small car, drawn, to sit inside a sentence. */
const Car: React.FC<{ w?: number; color?: string }> = ({ w = 150, color = C.deep }) => (
  <svg viewBox="0 0 170 78" width={w} height={(w * 78) / 170}>
    <ellipse cx="85" cy="70" rx="72" ry="4" fill="rgba(28,36,54,.12)" />
    <path d="M38 44 L56 26 H108 L128 44" fill={color} opacity=".82" />
    <path d="M12 60 V50 Q12 44 22 44 H146 Q158 44 158 52 V60 Z" fill={color} />
    <circle cx="44" cy="61" r="10" fill="#28344F" /><circle cx="44" cy="61" r="4" fill="#C9D2E6" />
    <circle cx="128" cy="61" r="10" fill="#28344F" /><circle cx="128" cy="61" r="4" fill="#C9D2E6" />
  </svg>
);

/* ---------- pieces of the Desk, redrawn for the film ---------- */

const Row: React.FC<{ k: React.ReactNode; v: React.ReactNode; sub?: string; dim?: boolean; tone?: string }> = ({ k, v, sub, dim, tone }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: dim ? 0.42 : 1 }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, background: tone ?? ICE2, boxShadow: `0 0 14px ${tone ?? ICE2}` }} />
    <span style={{ flex: 1 }}>
      <b style={{ display: "block", font: `700 27px/1.2 ${F}`, letterSpacing: "-0.01em", textDecoration: dim ? "line-through" : undefined }}>{k}</b>
      {sub && <small style={{ display: "block", marginTop: 4, font: `500 19px/1.2 ${F}`, color: "rgba(214,223,247,.6)" }}>{sub}</small>}
    </span>
    <b style={{ font: `700 27px/1 ${F}`, fontVariantNumeric: "tabular-nums" }}>{v}</b>
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; tone: string }> = ({ children, tone }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 99, background: `${tone}22`, color: tone, font: `700 18px/1 ${F}`, letterSpacing: ".02em", textTransform: "uppercase" }}>{children}</span>
);

const Match: React.FC<{ name: string; amt: string; why: string; verdict: "Sure" | "Likely"; posted?: string; at: number }> = ({ name, amt, why, verdict, posted, at }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = posted ? spring({ frame: f - at - 26, fps, config: theme.spring.bouncy }) : 0;
  return (
    <Glass w={620} glow={verdict === "Sure" ? 1 : 0.5}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <b style={{ font: `800 32px/1 ${F}`, letterSpacing: "-0.02em" }}>{name}</b>
        <b style={{ font: `800 32px/1 ${F}`, fontVariantNumeric: "tabular-nums" }}>{amt}</b>
      </div>
      <div style={{ marginTop: 14, font: `500 21px/1.3 ${F}`, color: "rgba(214,223,247,.7)" }}>{why}</div>
      <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
        <Badge tone={verdict === "Sure" ? GOOD : AMBER}>{verdict}</Badge>
        {posted && <span style={{ opacity: Math.min(1, p), transform: `scale(${0.6 + 0.4 * p})`, display: "inline-flex" }}><Badge tone={ICE}><Tick s={18} color={ICE} />Posted · {posted}</Badge></span>}
        {!posted && <Badge tone={ICE2}>One tap to confirm</Badge>}
      </div>
    </Glass>
  );
};

/* ---------- the film ---------- */
export const STORY_FRAMES = 1720;

export const DeskStory: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  // light sky → night as the camera dives into Payments
  const night = interpolate(f, [200, 240], [0, 1], { ...clampOpts, easing: theme.ease.inOut });

  // the window pushing in, then the dive into the tab
  const win = spring({ frame: f - 150, fps, config: theme.spring.smooth });
  const dive = interpolate(f, [206, 262], [0, 1], { ...clampOpts, easing: theme.ease.in });
  const diveBlur = interpolate(f, [206, 236, 262], [0, 2, 18], clampOpts);

  // the Yes, Cash punch-in
  const punch = interpolate(f, [1040, 1068, 1100, 1118], [0, 1, 1, 0], { ...clampOpts, easing: theme.ease.inOut });

  return (
    <AbsoluteFill style={{ fontFamily: F, overflow: "hidden" }}>
      <Fonts />
      <World night={night} />

      {/* 1. Imagine if your desk / kept every payment? */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 380 }}>
          <Sharpen at={36} out={74} y={10}><div style={{ display: "flex", justifyContent: "center", marginLeft: 470, marginBottom: 10 }}><Mark size={64} /></div></Sharpen>
        </div>
        <Line at={10} out={76} toks={["Imagine", "if", "your", "desk"]} size={104} per={6} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Line at={86} out={140} toks={["kept", "every", { node: <Car w={170} />, w: 170 }, "payment?"]} size={104} per={6} />
      </AbsoluteFill>

      {/* 2. the Desk window rises, the cursor picks Payments, the camera dives in */}
      {f >= 148 && f < 268 && <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `translateY(${(1 - win) * 520}px) scale(${(0.86 + 0.14 * win) * (1 + dive * 3.4)})`, transformOrigin: "314px 62px", filter: `blur(${diveBlur}px)`, opacity: 1 - interpolate(f, [232, 252], [0, 1], { ...clampOpts, easing: theme.ease.in }) }}>
          <div style={{ width: 1360, height: 760, borderRadius: 36, background: "linear-gradient(180deg, #fff, #F3F6FE)", boxShadow: "0 60px 140px -40px rgba(28,36,54,.45), 0 0 0 1px rgba(28,36,54,.06)", padding: 34 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <Mark size={52} />
              <div style={{ display: "flex", gap: 6, padding: 6, borderRadius: 18, background: "#EDF1FB" }}>
                {["Sales", "Payments", "Reach"].map((t, i) => {
                  const on = i === 1 && f >= 200;
                  return <span key={t} style={{ padding: "14px 26px", borderRadius: 14, font: `700 26px/1 ${F}`, color: on ? "#fff" : C.slate, background: on ? C.navy : i === 0 && f < 200 ? "#fff" : "transparent", boxShadow: on ? `0 0 40px -6px ${GLOW}` : undefined }}>{t}</span>;
                })}
              </div>
            </div>
            <div style={{ marginTop: 70, display: "grid", gap: 22, padding: "0 40px" }}>
              {[0.9, 0.7, 0.8].map((w, i) => <div key={i} style={{ height: 82, width: `${w * 100}%`, borderRadius: 22, background: "#F1F4FC", boxShadow: "0 0 0 1px #E3E9F8" }} />)}
            </div>
          </div>
        </div>
      </AbsoluteFill>}
      <Cursor path={[[160, 1240, 760], [192, 606, 236], [210, 608, 238]]} clicks={[198]} />

      {/* 3. meet / Obavia Desk */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Line at={274} out={312} toks={["meet"]} size={110} color="#fff" />
        <div style={{ position: "absolute" }}>
          <Line at={322} out={392} toks={[{ node: <Mark size={96} style={{ filter: `drop-shadow(0 0 30px ${GLOW})` }} />, w: 110 }, "Obavia", "Desk"]} size={120} color="#fff" em={[2]} weight={800} />
        </div>
        <div style={{ position: "absolute", top: 640 }}>
          <Sharpen at={344} out={392}><span style={{ font: `600 34px/1 ${F}`, color: "rgba(214,223,247,.7)" }}>Payments, for buy here pay here</span></Sharpen>
        </div>
      </AbsoluteFill>

      {/* 4. money arrives, the Desk matches it */}
      <Push a={400} b={650} to={1.05}>
        <div style={{ position: "absolute", left: 110, top: 96 }}>
          <Step at={404} done={444} text="Reading the bank feed" doneText="Read the bank feed" />
          <Step at={446} done={482} text="Reading receipt emails" doneText="Read 2 receipt emails" />
          <Step at={484} done={516} text="Setting aside cash-outs" doneText="Set aside 1 Cash App cash-out" />
          <Step at={518} done={572} text="Matching to the right note" doneText="Matched 3 payments" />
        </div>
        <Fly at={416} out={600} x={110} y={430} from={[-120, 60]} rot={-3} zoom={1.25}><Glass w={640} glow={0.4} style={{ display: "grid", gap: 22 }}>
          <Row k="Zelle from JORDAN RIVERA" sub="Bank feed" v="$81.75" />
          <Row k="D Example sent you $126.30" sub="Cash App receipt email" v="$126.30" />
          <Row k="CASH APP*CASH OUT" sub="Already counted from the receipt" v="$126.30" dim={f >= 500} />
          <Row k="MOBILE DEPOSIT REF 0019" sub="A check, no name" v="$500.00" />
        </Glass></Fly>
        <Fly at={540} out={640} x={1010} y={110} from={[160, 40]} rot={3}><Match at={540} name="Jordan Rivera" amt="$81.75" why="Name matches · amount is what they owe" verdict="Sure" posted="#1043" /></Fly>
        <Fly at={556} out={640} x={1040} y={410} from={[160, 40]} rot={3}><Match at={556} name="Dana Example" amt="$126.30" why="Paid this note before · one payment" verdict="Sure" posted="#1044" /></Fly>
        <Fly at={572} out={640} x={1070} y={710} from={[160, 40]} rot={3}><Match at={572} name="Alex Placeholder" amt="$500.00" why="Amount fits · a check carries no name" verdict="Likely" /></Fly>
      </Push>

      {/* 5. caption beats */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Line at={656} out={712} size={92} color="#fff" em={[0]} toks={["Matches", { node: <MiniStack />, w: 230 }, "every", "payment"]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Line at={722} out={790} size={92} color="#fff" em={[2]} toks={["Posts", "the", "sure", "ones", "for", "you"]} per={4} />
        <div style={{ position: "absolute", top: 640 }}><Sharpen at={750} out={790}><span style={{ font: `600 30px/1 ${F}`, color: "rgba(214,223,247,.66)" }}>Undo any of them for two days</span></Sharpen></div>
      </AbsoluteFill>

      {/* 6. can't pay, or won't pay */}
      <Push a={800} b={1012} to={1.06}>
        <div style={{ position: "absolute", left: 110, top: 96 }}>
          <Step at={804} done={846} text="Reading two failed charges" doneText="Read two failed charges" />
        </div>
        <Fly at={830} out={1000} x={130} y={250} from={[-60, 120]} rot={-4}><Glass w={700} tone={AMBER} glow={0.8}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ font: `800 32px/1 ${F}` }}>Dana Example</b><Badge tone={AMBER}>Short on money</Badge></div>
          <div style={{ marginTop: 16, font: `500 22px/1.4 ${F}`, color: "rgba(214,223,247,.75)" }}>Card declined · code 51 · Not enough money</div>
          <div style={{ marginTop: 8, font: `600 22px/1.4 ${F}`, color: ICE }}>Tries again on payday, Friday</div>
        </Glass></Fly>
        <Fly at={852} out={1000} x={880} y={500} from={[60, 120]} rot={4}><Glass w={700} tone={RED} glow={0.9}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ font: `800 32px/1 ${F}` }}>Chris Sample</b><Badge tone={RED}>On purpose</Badge></div>
          <div style={{ marginTop: 16, font: `500 22px/1.4 ${F}`, color: "rgba(214,223,247,.75)" }}>Bank return · R08 · Stopped this payment</div>
          <div style={{ marginTop: 8, font: `600 22px/1.4 ${F}`, color: RED }}>Never retried · complaint on file 5 days before</div>
        </Glass></Fly>
      </Push>
      {f >= 800 && f < 1012 && <div style={{ position: "absolute", left: 0, right: 0, top: 900, display: "flex", justifyContent: "center" }}>
        <Line at={900} out={998} size={76} color="#fff" em={[1, 4]} toks={["Knows", "can’t", "pay", "from", "won’t", "pay"]} per={4} />
      </div>}

      {/* 7. cash at the counter, with a name on every dollar */}
      {f >= 1012 && f < 1262 && <>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${1 + punch * 1.6})`, transformOrigin: "960px 695px" }}>
          <div style={{ filter: `blur(${interpolate(f, [1040, 1050, 1060], [0, 3, 0], clampOpts) + interpolate(f, [1100, 1112, 1118], [0, 4, 0], clampOpts)}px)` }}>
            <Sharpen at={1016} out={1124}>
              <div style={{ textAlign: "center" }}>
                <div style={{ font: `800 112px/1 ${F}`, color: "#fff", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>$81.75</div>
                <div style={{ marginTop: 14, font: `600 30px/1 ${F}`, color: "rgba(214,223,247,.7)" }}>Due today · 2018 Toyota Corolla</div>
                <div style={{ marginTop: 40, font: `800 64px/1 ${F}`, color: "#fff", letterSpacing: "-0.03em" }}>Jordan Paid Cash?</div>
                <div style={{ margin: "48px auto 0", width: 560, padding: "30px 0", borderRadius: 999, background: f >= 1084 ? C.navy : "rgba(255,255,255,.95)", color: f >= 1084 ? "#fff" : C.navy, font: `800 36px/1 ${F}`, boxShadow: `0 0 ${f >= 1084 ? 80 : 30}px -10px ${GLOW}` }}>Yes, $81.75 Cash</div>
              </div>
            </Sharpen>
          </div>
        </AbsoluteFill>
        <Cursor path={[[1020, 1320, 960], [1052, 1010, 700], [1094, 1012, 702]]} clicks={[1082]} size={52 + punch * 40} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Sharpen at={1132} out={1150}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, font: `700 46px/1 ${F}`, color: "#fff" }}><Tick s={52} />Receipt #1045, texted to Jordan</div>
          </Sharpen>
        </AbsoluteFill>
        <Fly at={1156} out={1252} x={505} y={150} from={[0, 120]}><Glass w={700} tone={AMBER} glow={0.7}>
          <div style={{ font: `700 22px/1 ${F}`, color: "rgba(214,223,247,.6)", letterSpacing: ".08em", textTransform: "uppercase" }}>Close the day</div>
          <div style={{ marginTop: 14, font: `800 54px/1 ${F}`, letterSpacing: "-0.03em" }}>Short $40.00</div>
          <div style={{ marginTop: 10, font: `500 22px/1.3 ${F}`, color: "rgba(214,223,247,.7)" }}>$360.61 counted · $400.61 recorded</div>
          <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
            <Row k="Maria took" v="$318.86" />
            <Row k="Sam took" v="$81.75" />
          </div>
        </Glass></Fly>
        <div style={{ position: "absolute", left: 0, right: 0, top: 870, display: "flex", justifyContent: "center" }}>
          <Line at={1184} out={1250} size={80} color="#fff" em={[2]} toks={["Every", "dollar", "has", "a", "name"]} per={4} />
        </div>
      </>}

      {/* 8. one text, tonight */}
      {f >= 1262 && f < 1440 && <>
        <div style={{ position: "absolute", left: 110, top: 470 }}>
          <Line at={1266} out={1426} size={96} color="#fff" em={[1]} toks={["One", "text", "tonight"]} per={5} />
        </div>
        <Fly at={1290} out={1426} x={1010} y={250} from={[120, 40]} rot={3} zoom={1.1}>
          <div style={{ width: 760, fontFamily: F }}>
            <div style={{ font: `600 20px/1 ${F}`, color: "rgba(214,223,247,.55)", marginBottom: 14, marginLeft: 8 }}>You · 7:00 PM</div>
            <div style={{ padding: "26px 30px", borderRadius: "30px 30px 30px 10px", background: "linear-gradient(160deg, #3A5288, #28344F)", color: "#fff", font: `600 27px/1.42 ${F}`, boxShadow: `0 0 70px -14px ${GLOW}` }}>
              Your dealership today: $1,284.20 in from 9 payments (4 autopay, 3 matched from the bank, 2 cash at the counter). 2 things need you: Chris: stopped this payment; today’s cash is short.
            </div>
            <div style={{ marginTop: 18, marginLeft: 8, font: `600 20px/1.3 ${F}`, color: "rgba(214,223,247,.55)" }}>Buyers get theirs in English or Spanish</div>
          </div>
        </Fly>
      </>}

      {/* 9. close */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Line at={1446} out={1508} size={96} color="#fff" em={[2]} toks={["Let", "the", "Desk", "keep", "the", "books"]} per={4} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Line at={1516} out={1570} size={96} color="#fff" em={[1]} toks={["while", "you", "sell", "cars"]} per={5} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Sharpen at={1582}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <Mark size={110} style={{ filter: `drop-shadow(0 0 40px ${GLOW})` }} />
          <div style={{ font: `800 84px/1 ${F}`, color: "#fff", letterSpacing: "-0.04em" }}>Obavia Desk</div>
        </div></Sharpen>
        <div style={{ marginTop: 34 }}><Sharpen at={1606}><span style={{ display: "inline-block", padding: "18px 34px", borderRadius: 999, background: "rgba(255,255,255,.95)", color: C.navy, font: `800 32px/1 ${F}` }}>obavia.co</span></Sharpen></div>
      </AbsoluteFill>

      <Finish night={night} />

      {/* sound */}
      <Audio src={staticFile("sfx/bed_sales.mp3")} volume={fr => interpolate(fr, [0, 24, STORY_FRAMES - 50, STORY_FRAMES], [0, 0.24, 0.24, 0], clampOpts)} />
      <Sfx name="pop" at={34} volume={0.25} />
      <Sfx name="pop" at={98} volume={0.25} />
      <Sfx name="whoosh" at={148} volume={0.3} />
      <Sfx name="tick" at={196} volume={0.45} dur={12} />
      <Sfx name="whoosh_long" at={204} volume={0.35} />
      <Sfx name="riser" at={300} volume={0.18} />
      <Sfx name="hit" at={322} volume={0.3} />
      {[444, 482, 516, 572, 846].map(t => <Sfx key={t} name="tick" at={t} volume={0.3} dur={12} />)}
      {[416, 540, 556, 572, 830, 852, 1156, 1290].map(t => <Sfx key={"p" + t} name="pop" at={t - 2} volume={0.18} />)}
      <Sfx name="whoosh" at={1036} volume={0.28} />
      <Sfx name="tick" at={1080} volume={0.5} dur={12} />
      <Sfx name="cash" at={1086} volume={0.35} />
      <Sfx name="chime" at={1584} volume={0.35} />
    </AbsoluteFill>
  );
};

/** Three small match cards stacked: the picture inside "Matches ▢ every payment". */
const MiniStack: React.FC = () => (
  <div style={{ position: "relative", width: 220, height: 130 }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ position: "absolute", left: i * 34, top: (2 - i) * 14, width: 150, height: 96, borderRadius: 16, background: "linear-gradient(160deg, #3A4A74, #1E2846)", boxShadow: `0 0 0 1.5px ${ICE}44, 0 0 40px -8px ${GLOW}`, transform: `rotate(${(i - 1) * 6}deg)`, padding: 14 }}>
        <div style={{ height: 10, width: "70%", borderRadius: 6, background: "rgba(214,223,247,.7)" }} />
        <div style={{ height: 8, width: "45%", marginTop: 10, borderRadius: 6, background: "rgba(214,223,247,.35)" }} />
        <div style={{ marginTop: 16, height: 18, width: 58, borderRadius: 99, background: `${GOOD}55` }} />
      </div>
    ))}
  </div>
);
