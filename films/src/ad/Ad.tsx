/* Obavia, 15 seconds, light and fast. Editorial photographs with paint on
   top, letters that carry from word to word, the Desk's own screens, a 3D
   ring of channels, and every image folding into the mark.
   Beats and words are in ./timeline.ts. */
import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, continueRender, delayRender } from "remotion";
import { Band, C, Check, Corners, Sparkle, Stroke, inQ, io, loopPath, outQ, prog } from "./paint";
import { Morph } from "./morph";
import { RING_WORDS, S, WORK, b } from "./timeline";

const W = 1080, H = 1920;
const img = (n: string) => staticFile(`ad/img/${n}.jpg`);
const mix = (a: number, z: number, p: number) => a + (z - a) * p;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* type: Geist for the lines, Instrument Serif italic for the accents */
const FACES = [
  ...[600, 700, 800].map(w => `@font-face{font-family:Geist;font-weight:${w};src:url(${staticFile(`fonts/ad/geist-sans-latin-${w}-normal.woff2`)}) format('woff2');}`),
  `@font-face{font-family:'Instrument Serif';font-style:italic;font-weight:400;src:url(${staticFile("fonts/ad/instrument-serif-latin-400-italic.woff2")}) format('woff2');}`,
].join("");
const Fonts: React.FC = () => {
  const [h] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => {
    Promise.all([...[600, 700, 800].map(w => document.fonts.load(`${w} 80px Geist`)), document.fonts.load("italic 400 80px 'Instrument Serif'")]).then(() => continueRender(h));
  }, [h]);
  return <style>{FACES}</style>;
};

/* a photograph in a rounded card, cropped to cover, with its own slow drift */
const Photo: React.FC<{ src: string; x: number; y: number; w: number; h: number; r?: number; rot?: number; scale?: number; opacity?: number; zoom?: number; fx?: number; fy?: number; shadow?: boolean; style?: React.CSSProperties; z?: number }> =
  ({ src, x, y, w, h, r = 34, rot = 0, scale = 1, opacity = 1, zoom = 1, fx = 50, fy = 50, shadow = true, style, z }) => (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, overflow: "hidden", opacity, zIndex: z,
      transform: `rotate(${rot}deg) scale(${scale})`, boxShadow: shadow ? "0 40px 80px -36px rgba(23,26,32,.38), 0 0 0 1px rgba(23,26,32,.05)" : undefined, background: C.tint, ...style }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx}% ${fy}%`, transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }} />
    </div>
  );

const Svg: React.FC<{ children: React.ReactNode; z?: number }> = ({ children, z = 20 }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, zIndex: z, overflow: "visible" }}>{children}</svg>
);

/* words that rise in one by one; `em` words set in Instrument Serif italic, blue */
const Line: React.FC<{ words: { t: string; at: number; em?: boolean }[]; y: number; size: number; out?: number; color?: string }> = ({ words, y, size, out, color = C.ink }) => {
  const f = useCurrentFrame();
  const o = out === undefined ? 1 : 1 - prog(f, out, 8, inQ);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - size * 0.82, display: "flex", justifyContent: "center", alignItems: "baseline", gap: size * 0.24, zIndex: 30, opacity: o }}>
      {words.map((w, i) => {
        const p = prog(f, w.at, 14);
        return <span key={i} style={{ fontFamily: w.em ? "'Instrument Serif'" : "Geist", fontStyle: w.em ? "italic" : "normal", fontWeight: w.em ? 400 : 800, fontSize: w.em ? size * 1.22 : size,
          letterSpacing: w.em ? "-0.01em" : "-0.055em", color: w.em ? C.blue : color, lineHeight: 1, display: "inline-block",
          opacity: p, transform: `translateY(${(1 - p) * size * 0.45}px)`, filter: p < 0.98 ? `blur(${(1 - p) * 10}px)` : undefined }}>{w.t}</span>;
      })}
    </div>
  );
};

/* ---------- 1. You buy the car. ---------- */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const [a, z] = S.hook;
  if (f >= z + 8) return null;
  const open = prog(f, a, 20);
  const box = { x: 540, y: mix(900, 960, open), w: mix(520, W, open), h: mix(700, H, open), r: mix(40, 0, open) };
  const through = prog(f, z - 12, 18, inQ);                     // zoom through the loop into the work
  const cx = 545, cy = 1250;
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + through * 3.6})`, transformOrigin: `${cx}px ${cy}px`, opacity: 1 - prog(f, z - 2, 8), zIndex: 10 }}>
      <Photo src={img("auction")} x={box.x} y={box.y} w={box.w} h={box.h} r={box.r} rot={mix(-5, 0, open)} zoom={mix(1.32, 1.04, prog(f, a, 70))} fx={50} fy={64} shadow={false} />
      <Svg>
        <Band x={500} y={926} w={300} h={84} at={6} dur={8} />
        <Band x={30} y={1430} w={1020} h={200} at={8} dur={12} />
        <path d={loopPath(cx, cy, 520, 330, -6, 1.1, 2)} fill="none" />
        <Stroke d={loopPath(cx, cy, 520, 330, -6, 1.1, 2)} at={26} dur={22} color={C.blue} width={16} />
        <Sparkle x={985} y={1000} r={34} at={44} />
      </Svg>
      <Line y={1468} size={104} words={[{ t: "You", at: 14 }, { t: "buy", at: 20 }, { t: "the", at: 26 }, { t: "car.", at: 32 }]} />
    </AbsoluteFill>
  );
};

/* ---------- 2. The work: one word a beat, the pictures carrying across ---------- */
const Work: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const [a, z] = S.work;
  if (f < a - 4 || f > z + 20) return null;
  const sp = (at: number, cfg = { damping: 15, stiffness: 170, mass: 0.7 }) => spring({ frame: f - at, fps, config: cfg });
  const at = (i: number) => WORK[i].at;
  const els: React.ReactNode[] = [];

  // Photos → Listings: one card that shrinks while two copies slide out from behind it
  if (f < at(2) + 10) {
    const pin = sp(at(0)), split = prog(f, at(1), 16, io), leave = prog(f, at(2) - 2, 12, inQ);
    const c = { w: mix(720, 360, split), h: mix(960, 480, split), y: mix(800, 780, split) };
    for (const side of [-1, 1]) {
      const s = sp(at(1) + 2);
      els.push(<Photo key={`l${side}`} src={img(side < 0 ? "lot" : "detail")} x={540 + side * 330 * s} y={800 - leave * 260} w={300} h={400} rot={side * 5 * s} scale={0.86 + 0.14 * s} opacity={clamp01(split * 3) * (1 - leave)} z={1} fy={side < 0 ? 70 : 40} />);
    }
    els.push(<Photo key="c" src={img("photo")} x={540} y={c.y - leave * 300} w={c.w} h={c.h} rot={mix(-6, -2, pin) * (1 - split)} scale={0.55 + 0.45 * pin} opacity={clamp01(pin * 2) * (1 - leave)} z={2} zoom={mix(1.1, 1, pin)} />);
    els.push(<Svg key="p1"><Corners x={160} y={300} w={760} h={1000} at={at(0) + 8} out={at(1)} /><Sparkle x={905} y={318} r={40} at={at(0) + 14} out={at(1)} />
      {[-330, 0, 330].map((dx, i) => <Stroke key={i} d={`M${540 + dx - 110},${1086} q110,22 220,-6`} at={at(1) + 14 + i * 3} dur={10} width={12} out={at(2) - 4} />)}</Svg>);
  }
  // Leads: the conversation, tipping up out of the page
  if (f >= at(2) - 2 && f < at(3) + 10) {
    const s = sp(at(2)), leave = prog(f, at(3) - 2, 12, inQ);
    els.push(<div key="t" style={{ position: "absolute", inset: 0, perspective: 1400 }}>
      <Photo src={img("text")} x={540} y={mix(1100, 800, s) - leave * 200} w={760} h={1010} scale={1 - leave * 0.25} opacity={clamp01(s * 2) * (1 - leave)} style={{ transform: `rotateX(${(1 - s) * 34}deg) scale(${1 - leave * 0.25})` }} fx={55} fy={55} />
    </div>);
    els.push(<Svg key="p2">
      <Stroke d="M215,330 h300 a40,40 0 0 1 40,40 v120 a40,40 0 0 1 -40,40 h-190 l-60,56 v-56 h-50 a40,40 0 0 1 -40,-40 v-120 a40,40 0 0 1 40,-40z" at={at(2) + 8} dur={14} color={C.blue} width={13} out={at(3) - 4} />
      {[0, 1, 2].map(i => <Sparkle key={i} x={300 + i * 72} y={430} r={14} at={at(2) + 20 + i * 3} out={at(3) - 4} />)}
    </Svg>);
  }
  // Paperwork: the signature, underlined and ticked
  if (f >= at(3) - 2 && f < at(4) + 10) {
    const s = sp(at(3)), leave = prog(f, at(4) - 2, 12, inQ);
    els.push(<Photo key="s" src={img("sign")} x={540} y={800} w={980} h={1300} zoom={mix(1.25, 1.02, s)} opacity={clamp01(s * 2) * (1 - leave)} scale={1 - leave * 0.1} fx={55} fy={45} />);
    els.push(<Svg key="p3">
      <Stroke d="M230,1030 C330,1060 470,1010 640,1040 S800,1020 860,1000" at={at(3) + 9} dur={12} color={C.blue} width={14} out={at(4) - 4} />
      <Check x={820} y={470} s={130} at={at(3) + 16} out={at(4) - 4} />
    </Svg>);
  }
  // Title: the plate and the key, thrown down together, the plate circled
  if (f >= at(4) - 2 && f < at(5) + 10) {
    const s1 = sp(at(4)), s2 = sp(at(4) + 4), leave = prog(f, at(5) - 2, 12, inQ);
    els.push(<Photo key="pl" src={img("plate")} x={mix(-200, 380, s1)} y={760 - leave * 200} w={560} h={746} rot={mix(-18, -5, s1)} opacity={1 - leave} z={1} fx={40} />);
    els.push(<Photo key="ky" src={img("keys")} x={mix(1300, 770, s2)} y={930 - leave * 200} w={420} h={560} rot={mix(20, 6, s2)} opacity={1 - leave} z={2} fx={55} fy={40} />);
    els.push(<Svg key="p4"><Stroke d={loopPath(340, 690, 250, 150, -6, 1.12, 5)} at={at(4) + 10} dur={16} width={14} out={at(5) - 4} /></Svg>);
  }
  // Payments: the tap, then the card folds into the centre of the ring
  if (f >= at(5) - 2) {
    const s = sp(at(5)), ring = prog(f, z - 6, 18, io);
    els.push(<Photo key="pay" src={img("pay")} x={540} y={mix(820, 760, ring)} w={mix(720, 400, ring)} h={mix(960, 533, ring)} scale={0.6 + 0.4 * s} opacity={clamp01(s * 2) * (1 - prog(f, z + 4, 10))} fx={58} fy={60} z={3} />);
    els.push(<Svg key="p5">{[0, 1, 2].map(i => <Stroke key={i} d={`M${470 + i * 34},${770 - i * 40} q${40 + i * 18},${60 + i * 26} 0,${120 + i * 70}`} at={at(5) + 10 + i * 3} dur={9} width={11} out={z - 8} />)}</Svg>);
  }
  return (
    <AbsoluteFill style={{ zIndex: 12 }}>
      {els}
      <Morph words={WORK.map(w => ({ at: w.at, text: w.text }))} y={1580} size={150} out={z - 4} />
    </AbsoluteFill>
  );
};

/* ---------- 3. One car, every channel: a ring in 3D ---------- */
const LOGOS = ["facebook", "instagram", "tiktok", "youtube", "google", "craigslist", "offerup"];
const WIDE = new Set(["craigslist", "offerup"]);
const Ring: React.FC = () => {
  const f = useCurrentFrame();
  const [a, z] = S.ring;
  if (f < a - 6 || f > z + 12) return null;
  const cx = 540, cy = 780, R = 395, tilt = (20 * Math.PI) / 180, P = 1500;
  const spin = interpolate(f, [a, z], [0, Math.PI * 1.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: outQ });
  const gather = prog(f, z - 14, 14, inQ);
  const flip = prog(f, z - 8, 10, inQ);
  const card = prog(f, a - 6, 16);
  const tiles = LOGOS.map((l, i) => {
    const grow = prog(f, a + 4 + i * 2, 18) * (1 - gather);
    const ang = (i / LOGOS.length) * Math.PI * 2 + spin;
    const x3 = Math.sin(ang) * R * grow, z3 = Math.cos(ang) * R * grow;
    const y3 = -z3 * Math.sin(tilt);
    const k = P / (P - z3);
    return { l, x: cx + x3 * k, y: cy + y3 * k + 40, k, z3, o: clamp01(grow * 3) };
  });
  return (
    <AbsoluteFill style={{ zIndex: 14 }}>
      <Svg z={4}><Stroke d={`M${cx - R - 80},${cy + 40} a${R + 80},${(R + 80) * Math.sin(tilt) + 20} 0 1 0 ${2 * (R + 80)},0 a${R + 80},${(R + 80) * Math.sin(tilt) + 20} 0 1 0 ${-2 * (R + 80)},0`} at={a + 10} dur={24} color={C.ice} width={12} rough={2} out={z - 16} /></Svg>
      {tiles.map(t => (
        <div key={t.l} style={{ position: "absolute", left: t.x - 80 * t.k, top: t.y - 80 * t.k, width: 160 * t.k, height: 160 * t.k, borderRadius: 42 * t.k, background: "#fff", opacity: t.o,
          zIndex: t.z3 > 0 ? 9 : 2, display: "grid", placeItems: "center", boxShadow: "0 24px 50px -24px rgba(23,26,32,.35), 0 0 0 1px rgba(23,26,32,.05)" }}>
          <Img src={staticFile(`ad/brand/${t.l}.svg`)} style={{ width: (WIDE.has(t.l) ? 124 : 80) * t.k, height: 80 * t.k, objectFit: "contain" }} />
        </div>
      ))}
      <div style={{ position: "absolute", inset: 0, perspective: 1600, zIndex: 6 }}>
        <Photo src={img("detail")} x={cx} y={cy} w={330} h={440} fx={45} fy={45} zoom={1.05} opacity={card} style={{ transform: `rotateY(${flip * 90}deg)` }} />
      </div>
      <Morph words={RING_WORDS} y={1580} size={150} out={z - 4} />
    </AbsoluteFill>
  );
};

/* ---------- 4. The paperwork, drawn: sheets fan out, fill, get signed, get ticked ---------- */
const SHEETS = [{ dx: -300, rot: -10, z: 1 }, { dx: 300, rot: 10, z: 1 }, { dx: 0, rot: -1.5, z: 3 }];
const Paper: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const [a, z] = S.desk;
  if (f < a - 4 || f > z + 16) return null;
  const away = prog(f, z - 8, 18, inQ);
  const sw = 540, sh = 720, cy = 820;
  return (
    <AbsoluteFill style={{ zIndex: 16 }}>
      <div style={{ position: "absolute", inset: 0, perspective: 1700 }}>
        {SHEETS.map((p, i) => {
          const s = spring({ frame: f - a + 2 - i * 3, fps, config: { damping: 15, stiffness: 150, mass: 0.7 } });
          const x = 540 + p.dx * s, y = cy + (1 - s) * 260;
          return (
            <div key={i} style={{ position: "absolute", left: x - sw / 2, top: y - sh / 2, width: sw, height: sh, zIndex: p.z, borderRadius: 26, background: "#fff",
              boxShadow: "0 50px 90px -40px rgba(40,52,79,.45), 0 0 0 1px rgba(40,52,79,.06)", opacity: clamp01(s * 2) * (1 - prog(f, z + 2, 10)),
              transform: `rotateY(${(1 - s) * -40 + p.dx * -0.02}deg) rotateZ(${p.rot * s}deg) scale(${(i === 2 ? 1 : 0.86) * (1 + away * 1.4)})` }}>
              <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
                {/* the form fills itself in, line by line */}
                {[0, 1, 2, 3, 4, 5, 6].map(r => {
                  const q = prog(f, a + 8 + i * 2 + r * 3, 10);
                  const w = [300, 360, 250, 340, 220, 320, 280][r];
                  return <g key={r}>
                    <rect x={44} y={70 + r * 58} width={110} height={10} rx={5} fill={C.tint} />
                    <rect x={44} y={88 + r * 58} width={w * q} height={14} rx={7} fill={r === 0 ? C.navy : "#C5CCDA"} />
                  </g>;
                })}
                <line x1={44} y1={sh - 120} x2={sw - 44} y2={sh - 92} stroke="#D9DEE8" strokeWidth={3} />
                {i === 2 && <path d="M80,590 C105,530 130,650 160,578 S210,542 224,590 S272,560 300,576 C330,590 380,556 450,566" fill="none" stroke={C.ink} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round"
                  pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog(f, b(12.6), 22, io)} />}
              </svg>
            </div>
          );
        })}
      </div>
      <Svg z={18}>{[[400, 1300], [540, 1300], [680, 1300]].map(([x, y], i) => <Check key={i} x={x} y={y} s={80} at={b(13.2) + i * 4} out={z - 6} />)}</Svg>
      <Morph words={[{ at: a + 2, text: "Every form." }, { at: b(12), text: "Filled." }, { at: b(13), text: "Signed." }]} y={1580} size={150} out={z - 4} />
    </AbsoluteFill>
  );
};

/* ---------- 5. You close the deal. (half time) ---------- */
const Deal: React.FC = () => {
  const f = useCurrentFrame();
  const [a, z] = S.deal;
  if (f < a - 4 || f > z + 20) return null;
  const r = interpolate(f, [a - 4, a + 20], [0, 1300], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: outQ });
  const shrink = prog(f, z - 12, 22, io);                     // into the centre tile of the grid
  const box = { x: 540, y: mix(960, 784, shrink), w: mix(W, 300, shrink), h: mix(H, 400, shrink), r: mix(0, 34, shrink) };
  return (
    <AbsoluteFill style={{ zIndex: 18 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: shrink > 0 ? undefined : `circle(${r}px at 540px 900px)` }}>
        <Photo src={img("deal")} x={box.x} y={box.y} w={box.w} h={box.h} r={box.r} shadow={shrink > 0.2} zoom={(mix(1.14, 1, prog(f, a, b(2), io)) + 0.22 * prog(f, a + b(2), 10, outQ) - 0.22 * prog(f, z - 14, 10, io)) * mix(1, 1.6, shrink)} fx={60} fy={50} />
      </div>
      <Svg>
        <Band x={40} y={1560} w={1000} h={190} at={a + 12} dur={12} out={z - 14} />
        <Stroke d={loopPath(648, 972, 190, 120, -10, 1.12, 7)} at={a + 54} dur={26} color={C.blue} width={14} out={z - 14} />
      </Svg>
      <Line y={1592} size={92} out={z - 14} words={[{ t: "You", at: a + 22 }, { t: "close", at: a + 30, em: true }, { t: "the", at: a + 38 }, { t: "deal.", at: a + 46 }]} />
    </AbsoluteFill>
  );
};

/* ---------- 6. Everything between: the grid, then the fall into one circle ---------- */
const TILES = ["auction", "photo", "text", "sign", "deal", "plate", "pay", "keys", "lot"];
const Grid: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const [a, z] = S.grid;
  if (f < a - 2 || f > z + 16) return null;
  const cx = 540, cy = 860;
  const order = [4, 1, 5, 7, 3, 0, 2, 8, 6];
  return (
    <AbsoluteFill style={{ zIndex: 20 }}>
      {TILES.map((t, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 216 + col * 324, y = 360 + row * 424;
        const rank = order.indexOf(i);
        const s = i === 4 ? 1 : spring({ frame: f - a - 2 - rank * 3, fps, config: { damping: 14, stiffness: 190, mass: 0.6 } });
        const fall = prog(f, z - 30 + Math.hypot(col - 1, row - 1) * 4, 20, inQ);
        if (i !== 4 && f < a + rank * 3) return null;
        return <Photo key={t} src={img(t)} x={mix(x, cx, fall)} y={mix(y, cy, fall)} w={300} h={400} rot={mix((col - 1) * 2 * (1 - s), (col - 1) * 40, fall)} scale={(0.4 + 0.6 * s) * (1 - fall * 0.94)} opacity={1 - prog(f, z - 6, 8)} fx={t === "auction" ? 50 : 55} fy={t === "auction" ? 66 : 50} zoom={t === "deal" ? 1.6 : 1} />;
      })}
      <Svg z={30}><Stroke d={loopPath(cx, cy, 200, 200, 0, 1.08, 3)} at={z - 18} dur={20} color={C.blue} width={18} rough={3} out={z + 8} /></Svg>
      <Line y={1600} size={100} out={z - 22} words={[{ t: "Everything", at: a + 10 }, { t: "else?", at: a + 18, em: true }]} />
    </AbsoluteFill>
  );
};

/* ---------- 7–8. The mark, the name, the line ---------- */
const MarkArt: React.FC<{ size: number; fill: number; draw: number }> = ({ size, fill, draw }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <defs>
      <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E9EFFE" /><stop offset=".55" stopColor="#B8C8F1" /><stop offset="1" stopColor="#869FD6" /></linearGradient>
      <radialGradient id="ml" cx=".75" cy=".35" r=".4"><stop offset="0" stopColor="#5A73B0" stopOpacity=".32" /><stop offset="1" stopColor="#5A73B0" stopOpacity="0" /></radialGradient>
      <clipPath id="mc"><circle cx="32" cy="32" r="30" /></clipPath>
    </defs>
    <g style={{ transform: `scale(${0.82 + 0.18 * fill})`, transformOrigin: "32px 32px" }} opacity={fill}>
      <circle cx="32" cy="32" r="30" fill="url(#mg)" />
      <g clipPath="url(#mc)"><rect width="64" height="64" fill="url(#ml)" /></g>
    </g>
    <g clipPath="url(#mc)">
      <g transform="translate(32 32) rotate(-35.5)" fill="none" strokeLinecap="round">
        <path transform="translate(1.5 1.2)" d="M8.82 -10.79 A9.0 9.0 0 1 0 0 0 A9.0 9.0 0 1 1 -7.28 3.71" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} stroke="#4E66A0" strokeOpacity=".3" strokeWidth="7.6" />
        <path d="M8.82 -10.79 A9.0 9.0 0 1 0 0 0 A9.0 9.0 0 1 1 -7.28 3.71" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} stroke="#FFFFFF" strokeWidth="7" />
      </g>
    </g>
  </svg>
);

const End: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const [a] = S.mark;
  if (f < a - 2) return null;
  const fill = spring({ frame: f - a, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });
  const draw = prog(f, a + 10, 22, io);
  const lift = prog(f, a + 30, 30, io);
  const size = mix(400, 250, lift), y = mix(860, 760, lift);
  const breathe = Math.sin((f - a) / 40) * 4 * lift;
  const push = 1 + 0.035 * prog(f, S.end[0], 180, io);
  return (
    <AbsoluteFill style={{ zIndex: 24, transform: `scale(${push})`, transformOrigin: "540px 1000px" }}>
      <div style={{ position: "absolute", left: 540 - 520, top: y - 520, width: 1040, height: 1040, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(200,214,252,${0.55 * fill}), rgba(200,214,252,0))` }} />
      <div style={{ position: "absolute", left: 540 - size / 2, top: y - size / 2 + breathe }}><MarkArt size={size} fill={Math.min(1, fill)} draw={draw} /></div>
      <Morph words={[{ at: a + 50, text: "Obavia" }]} y={1100} size={180} tracking={-0.05} dur={20} />
      <Line y={1250} size={54} words={[{ t: "The", at: S.end[0] + 6, em: true }, { t: "work", at: S.end[0] + 10, em: true }, { t: "in", at: S.end[0] + 14, em: true }, { t: "between,", at: S.end[0] + 18, em: true }, { t: "handled.", at: S.end[0] + 26, em: true }]} />
      <Svg z={25}><Stroke d="M752,1284 C805,1296 890,1290 956,1276" at={S.end[0] + 40} dur={14} color={C.ice} width={12} rough={2} /><Sparkle x={972} y={1196} r={22} at={S.end[0] + 50} /></Svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1720, textAlign: "center", fontFamily: "Geist", fontWeight: 600, fontSize: 34, letterSpacing: "-0.01em", color: C.slate, opacity: prog(f, S.end[0] + 40, 20) }}>obavia.co</div>
    </AbsoluteFill>
  );
};

/* ---------- the room: the Obavia sky, light, with clouds at three depths ---------- */
const CLOUDS = [
  { i: 2, x: -160, y: 120, w: 760, sp: 0.5, o: 0.95 }, { i: 4, x: 560, y: 40, w: 640, sp: -0.35, o: 0.8 },
  { i: 0, x: 680, y: 1500, w: 820, sp: -0.45, o: 0.9 }, { i: 3, x: -240, y: 1660, w: 900, sp: 0.55, o: 0.95 },
  { i: 5, x: 380, y: 720, w: 520, sp: 0.25, o: 0.35 }, { i: 1, x: -120, y: 960, w: 480, sp: -0.2, o: 0.3 },
];
const Room: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #D6E2FC 0%, #EAF0FE 38%, #F8FAFF 70%, #FFFFFF 100%)" }}>
      {CLOUDS.map((c, k) => (
        <Img key={k} src={staticFile(`clouds/c${c.i}.png`)} style={{ position: "absolute", left: c.x + f * c.sp, top: c.y + Math.sin(f / 70 + k) * 6, width: c.w, opacity: c.o }} />
      ))}
    </AbsoluteFill>
  );
};

/* a bank of cloud sweeps across the lens and carries one scene into the next */
const CloudWipe: React.FC<{ at: number; dir?: 1 | -1 }> = ({ at, dir = 1 }) => {
  const f = useCurrentFrame();
  const t = (f - at) / 22;
  if (t < 0 || t > 1) return null;
  const e = io(t);
  return (
    <AbsoluteFill style={{ zIndex: 60, pointerEvents: "none" }}>
      {[{ i: 2, y: -200, w: 2600, d: 0 }, { i: 4, y: 500, w: 3000, d: 0.08 }, { i: 3, y: 1150, w: 2800, d: 0.04 }].map((c, k) => {
        const x = dir * mix(-c.w - 200, W + 200, clamp01((e - c.d) / (1 - c.d)));
        return <Img key={k} src={staticFile(`clouds/c${c.i}.png`)} style={{ position: "absolute", left: dir > 0 ? x : W - x - c.w, top: c.y, width: c.w, opacity: 1, filter: "blur(2px)" }} />;
      })}
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return <AbsoluteFill style={{ zIndex: 90, pointerEvents: "none", backgroundImage: noise, backgroundSize: "240px", backgroundPosition: `${(f * 37) % 240}px ${(f * 53) % 240}px`, opacity: 0.035, mixBlendMode: "multiply" }} />;
};

export const ObaviaAd: React.FC = () => (
  <AbsoluteFill style={{ background: "#fff", overflow: "hidden" }}>
    <Fonts />
    <Room />
    <Hook />
    <Work />
    <Ring />
    <Paper />
    <Deal />
    <Grid />
    <End />
    <CloudWipe at={S.ring[1] - 12} />
    <CloudWipe at={S.desk[1] - 12} dir={-1} />
    <Grain />
    <Audio src={staticFile("sfx/ad/mix.wav")} />
  </AbsoluteFill>
);
