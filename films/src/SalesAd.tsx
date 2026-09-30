import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { Bed, Card, Col, Finish, Fonts, Mark, Pill, Pop, Sfx, Sky, Span, TypeSfx, Typed, Voice, Words, clampOpts, ramp, useSec } from "./kit";
import VO from "./vo.json";

const C = theme.colors;
const V = VO.sales;
const QUOTE = "Some months I’m fine. Other months, my team is waiting for someone to pull a Babe Ruth and save the quarter.";
const NEXT = "“You’ve built something most owners never reach. Let’s get every rep hitting like your Babe Ruth.”";
const GHOSTS = ["Michael Jordan", "LeBron James", "Serena Williams", "Tom Brady", "Michael Jackson", "Muhammad Ali"];
const GHOST_AT = [16.6, 17.4, 17.95, 18.2, 18.4, 18.6];
const D = 3.6; // the reading runs longer; everything after it shifts
const FRAGS = [
  "…we did about two-forty last month…", "…honestly the setters are fine…", "…some months I’m fine…", "…we tried a CRM, twice…",
  "…my team is waiting…", "…I just need it predictable…", "…pull a Babe Ruth…", "…closing rate is maybe thirty…", "…let me think about it…",
];
const GLINT = [2, 4, 6];

/* ── scene 1: the call that should have closed ── */
const CallScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec();
  const ended = f >= S(4.45);
  const secs = Math.floor(interpolate(f, [S(0.1), S(2.3)], [0, 47 * 60 + 12], { ...clampOpts, easing: theme.ease.out }));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  const dim = ramp(f, S(4.45), S(4.9));
  const breathe = Math.sin(f / 22) * 6;
  return (
    <>
      <Col top={330} gap={6}>
        <Words text="47 minutes." at={S(0.15)} size={150} color="#fff" />
        <Words text="Great call." at={S(1.3)} size={150} color={C.peri} />
      </Col>
      <Pop at={S(0.35)} from={80} style={{ position: "absolute", left: 100, top: 760 + breathe }}>
        <Card dark w={880} style={{ opacity: 1 - dim * 0.45, filter: `saturate(${1 - dim})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <div style={{ width: 112, height: 112, borderRadius: "50%", background: `linear-gradient(135deg, ${C.peri}, ${C.deep})`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 40, color: C.navy }}>MH</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em" }}>Marcus Hale</div>
              <div style={{ fontSize: 32, fontWeight: 600, color: C.dimOnNight }}>Agency owner · Discovery call</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 44 }}>
            <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.9, fontVariantNumeric: "tabular-nums", color: ended ? C.dimOnNight : "#fff" }}>{mm}:{ss}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700, color: ended ? C.dimOnNight : C.peri, paddingBottom: 12 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: ended ? C.slate : "#8FE3B0", opacity: ended ? 1 : 0.55 + 0.45 * Math.sin(f / 5) }} />
              {ended ? "Call ended" : "Live"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, height: 90, marginTop: 30 }}>
            {Array.from({ length: 30 }, (_, i) => {
              const live = ended ? 0.06 : 0.25 + 0.75 * Math.abs(Math.sin(f / 3.1 + i * 0.9) * Math.cos(f / 5.3 + i * 0.37));
              return <div key={i} style={{ flex: 1, height: `${live * 100}%`, borderRadius: 6, background: C.peri, opacity: 0.8 }} />;
            })}
          </div>
        </Card>
      </Pop>
      <Pop at={S(2.65)} from={40} style={{ position: "absolute", left: 100, right: 100, top: 1330, display: "flex", justifyContent: "center" }}>
        <Typed text="“Let me think about it.”" at={S(2.75)} cps={20} caret={C.peri}
          style={{ fontFamily: theme.font, fontSize: 70, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", padding: "34px 48px", borderRadius: 40, background: "rgba(200,214,252,0.10)", boxShadow: "inset 0 0 0 2px rgba(200,214,252,0.22)" }} />
      </Pop>
    </>
  );
};

/* ── scene 2: everything he said, drifting past ── */
const MissedScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec();
  return (
    <>
      {FRAGS.map((t, i) => {
        const glint = GLINT.includes(i);
        const y = [200, 330, 460, 590, 1240, 1370, 1500, 1630, 1760][i] - (f - S(4.6)) * (0.5 + (i % 3) * 0.2);
        const x = i % 2 ? 380 : 70;
        const g = glint ? ramp(f, S(5.2 + GLINT.indexOf(i) * 0.5), S(5.7 + GLINT.indexOf(i) * 0.5)) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, fontFamily: theme.font, fontSize: 46, fontWeight: 600, whiteSpace: "nowrap",
            color: glint ? `rgba(200,214,252,${0.3 + g * 0.7})` : "rgba(214,223,247,0.22)", filter: `blur(${glint ? 3 - g * 3 : 3}px)`,
            textShadow: glint ? `0 0 ${g * 30}px rgba(200,214,252,.7)` : undefined }}>{t}</div>
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 30% at 50% 50%, rgba(18,26,46,0.92), rgba(18,26,46,0) 100%)" }} />
      <Col top={740} gap={30}>
        <Words text="He told you what mattered." at={S(4.75)} size={96} color="#fff" width={960} />
        <Words text="You didn’t catch it." at={S(6.5)} size={96} color={C.peri} width={960} />
      </Col>
    </>
  );
};

/* ── scene 3: Obavia hears it — self-first words, and the one name he chose ── */
const QuoteText: React.FC<{ shown: string; marks: { self: number[]; babe: number } }> = ({ shown, marks }) => {
  const words = shown.split(" ");
  return (
    <>
      {words.map((w, i) => {
        const bare = w.replace(/[.,]/g, "");
        const selfK = bare === "I’m" ? 0 : bare === "my" ? 1 : -1;
        const babe = bare === "Babe" || bare === "Ruth";
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", marginRight: "0.26em", zIndex: 1,
            color: selfK >= 0 && marks.self[selfK] > 0 ? C.navy : babe && marks.babe > 0 ? C.navy : undefined }}>
            {babe && <span style={{ position: "absolute", inset: "-4px -10px", right: bare === "Babe" ? -24 : -10, borderRadius: 14, background: C.peri, zIndex: -1, transform: `scaleX(${marks.babe})`, transformOrigin: "left" }} />}
            {w}
            {selfK >= 0 && <span style={{ position: "absolute", left: 0, right: 0, bottom: -6, height: 7, borderRadius: 4, background: C.deep, transform: `scaleX(${marks.self[selfK]})`, transformOrigin: "left" }} />}
          </span>
        );
      })}
    </>
  );
};

const Swap: React.FC<{ at: number; was: string; is: string }> = ({ at, was, is }) => {
  const f = useCurrentFrame(); const S = useSec();
  const k = ramp(f, at + S(0.35), at + S(0.75)), a = ramp(f, at + S(0.55), at + S(0.95)), n = ramp(f, at + S(0.7), at + S(1.2));
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 34, fontFamily: theme.font, fontSize: 64, fontWeight: 800, letterSpacing: "-0.035em" }}>
      <span style={{ position: "relative", color: C.slate, fontWeight: 700, opacity: 1 - k * 0.35 }}>{was}
        <span style={{ position: "absolute", left: -6, right: -6, top: "54%", height: 6, borderRadius: 3, background: C.slate, transform: `scaleX(${k})`, transformOrigin: "left" }} />
      </span>
      <svg width="70" height="26" viewBox="0 0 70 26" style={{ opacity: a }}><path d={`M2 13 H${2 + 62 * a}`} stroke={C.deep} strokeWidth="5" strokeLinecap="round" /><path d="M54 3 L66 13 L54 23" fill="none" stroke={C.deep} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity={a >= 0.95 ? 1 : 0} /></svg>
      <span style={{ position: "relative", color: C.ink, opacity: n, transform: `translateX(${(1 - n) * -16}px)` }}>{is}
        <span style={{ position: "absolute", left: 0, right: 0, bottom: -8, height: 8, borderRadius: 4, background: C.deep, transform: `scaleX(${n})`, transformOrigin: "left" }} />
      </span>
    </div>
  );
};

const HearScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const self = [spring({ frame: f - S(12.1), fps, config: theme.spring.snappy }), spring({ frame: f - S(13.3), fps, config: theme.spring.snappy })];
  const babe = spring({ frame: f - S(19.4), fps, config: theme.spring.smooth });
  const strike = ramp(f, S(18.85), S(19.2));
  const fly = ramp(f, S(19.3), S(19.95), theme.ease.in);
  return (
    <>
      <Pop at={S(8.85)} from={30} style={{ position: "absolute", left: 0, right: 0, top: 430, textAlign: "center", fontFamily: theme.font, fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", color: C.deep }}>What he actually said</Pop>
      <Pop at={S(8.7)} from={70} style={{ position: "absolute", left: 90, top: 520 }}>
        <Card w={900} style={{ padding: "56px 58px" }}>
          <Typed text={QUOTE} at={S(9.0)} cps={40} caret={C.deep}
            style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.03em", color: C.ink, minHeight: 78 * 5 }}
            render={(s) => <QuoteText shown={s} marks={{ self, babe }} />} />
        </Card>
      </Pop>
      {/* he could have said we. he said I. */}
      <Pop at={S(12.2)} out={S(15.9)} from={40} style={{ position: "absolute", left: 0, right: 0, top: 1150 }}><Swap at={S(12.2)} was="we’re" is="I’m" /></Pop>
      <Pop at={S(13.35)} out={S(15.95)} from={40} style={{ position: "absolute", left: 0, right: 0, top: 1290 }}><Swap at={S(13.35)} was="our team" is="my team" /></Pop>
      <Pop at={S(14.8)} out={S(16.0)} from={40} cfg="snappy" style={{ position: "absolute", left: 0, right: 0, top: 1480, display: "flex", justifyContent: "center" }}>
        <Pill dark size={42}>Needs to feel significant · 74%</Pill>
      </Pop>
      {/* he could have named anyone */}
      {GHOSTS.map((g, i) => {
        const at = S(GHOST_AT[i]);
        const p = spring({ frame: f - at, fps, config: theme.spring.snappy });
        if (f < at - 1 || fly >= 1) return null;
        const col = i % 2, row = Math.floor(i / 2);
        const x = col ? 560 : 110, y = 1150 + row * 124;
        const dir = col ? 1 : -1;
        return (
          <div key={g} style={{ position: "absolute", left: x + dir * fly * 700, top: y + Math.sin(f / 18 + i) * 5, fontFamily: theme.font, fontSize: 50, fontWeight: 700, letterSpacing: "-0.03em", whiteSpace: "nowrap",
            color: C.slate, opacity: p * (1 - fly) * 0.9, transform: `translateY(${(1 - p) * 30}px) scale(${0.92 + p * 0.08})` }}>
            {g}
            <span style={{ position: "absolute", left: -6, right: -6, top: "54%", height: 5, borderRadius: 3, background: C.deep, transform: `scaleX(${strike})`, transformOrigin: "left" }} />
          </div>
        );
      })}
      {/* the read */}
      <Pop at={S(20.0)} from={40} cfg="snappy" style={{ position: "absolute", left: 0, right: 0, top: 1170, display: "flex", justifyContent: "center" }}>
        <Pill dark size={42}>Needs to feel significant · 74%</Pill>
      </Pop>
      <Pop at={S(20.5)} from={40} cfg="snappy" style={{ position: "absolute", left: 0, right: 0, top: 1300, display: "flex", justifyContent: "center" }}>
        <Pill size={42}>Babe Ruth · the one who saves the game</Pill>
      </Pop>
      <Pop at={S(21.1)} from={30} style={{ position: "absolute", left: 120, right: 120, top: 1470, textAlign: "center", fontFamily: theme.font, fontSize: 46, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.body }}>
        So sell him on being significant.
      </Pop>
    </>
  );
};

/* ── scene 4: the next line, and the yes ── */
const NextScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const st = spring({ frame: f - S(24.1), fps, config: theme.spring.snappy });
  return (
    <>
      <Pop at={S(19.05)} from={30} style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
        <Mark size={70} />
        <div style={{ fontFamily: theme.font, fontSize: 36, fontWeight: 700, color: C.navy, letterSpacing: "-0.02em" }}>Obavia · Suggested next line</div>
      </Pop>
      <Pop at={S(19.2)} from={70} style={{ position: "absolute", left: 90, top: 590 }}>
        <Card w={900} style={{ padding: "56px 58px", boxShadow: `0 60px 120px -60px rgba(40,52,79,.45), inset 0 0 0 3px ${C.peri}` }}>
          <Typed text={NEXT} at={S(19.7)} cps={34} caret={C.deep}
            style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.035em", color: C.navy, minHeight: 78 * 4 }}
            render={(s) => s.split(/(Babe Ruth|Babe|Ruth)/).map((p, i) => <span key={i} style={{ color: /Babe|Ruth/.test(p) ? C.deep : undefined }}>{p}</span>)} />
        </Card>
      </Pop>
      <Pop at={S(22.95)} from={50} cfg="snappy" style={{ position: "absolute", left: 90, top: 1160 }}>
        <div style={{ fontFamily: theme.font, fontSize: 28, fontWeight: 700, color: C.slate, letterSpacing: "-0.01em", margin: "0 0 14px 20px" }}>Marcus</div>
        <div style={{ fontFamily: theme.font, fontSize: 60, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", background: C.navy, padding: "34px 50px", borderRadius: "44px 44px 44px 12px", boxShadow: "0 40px 80px -40px rgba(28,36,54,.6)" }}>
          …Yeah. That’s exactly it.
        </div>
      </Pop>
      {f >= S(24.1) && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1470, display: "flex", justifyContent: "center" }}>
          <div style={{ fontFamily: theme.font, fontSize: 96, fontWeight: 800, letterSpacing: "0.06em", color: C.deep, padding: "18px 44px", border: `9px solid ${C.deep}`, borderRadius: 26,
            opacity: Math.min(1, st * 1.4), transform: `rotate(-7deg) scale(${2.2 - 1.2 * st})` }}>DEAL SIGNED</div>
        </div>
      )}
    </>
  );
};

/* ── scene 5: close on cash, climb the board ── */
const BoardScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const you = Math.round(interpolate(f, [S(26.0), S(27.2)], [920, 1620], { ...clampOpts, easing: theme.ease.inOut }));
  const pa = ramp(f, S(26.2), S(26.7), theme.ease.inOut), pb = ramp(f, S(26.7), S(27.2), theme.ease.inOut);
  const rows = [
    { n: "Dana R.", v: 1480, y: pb * 150 },
    { n: "Jordan K.", v: 1350, y: 150 + pa * 150 },
    { n: "You", v: you, y: 300 - pa * 150 - pb * 150, me: true },
  ];
  const crown = spring({ frame: f - S(27.25), fps, config: theme.spring.bouncy });
  return (
    <>
      <Col top={420} gap={4}>
        <Words text="Close on cash," at={S(24.95)} size={116} />
        <Words text="not calls." at={S(25.45)} size={116} color={C.deep} />
      </Col>
      <Pop at={S(25.3)} from={70} style={{ position: "absolute", left: 110, top: 840 }}>
        <Card w={860} style={{ padding: "44px 48px" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: C.slate, letterSpacing: "-0.02em", marginBottom: 26 }}>Collected this week</div>
          <div style={{ position: "relative", height: 440 }}>
            {rows.map((r, i) => (
              <div key={r.n} style={{ position: "absolute", left: 0, right: 0, top: r.y, height: 128, borderRadius: 30, display: "flex", alignItems: "center", padding: "0 34px", gap: 26,
                background: r.me ? C.navy : "#F2F5FE", color: r.me ? "#fff" : C.ink, zIndex: r.me ? 2 : 1, boxShadow: r.me ? "0 30px 60px -30px rgba(28,36,54,.6)" : undefined }}>
                <div style={{ width: 40, fontSize: 36, fontWeight: 800, color: r.me ? C.peri : C.slate }}>{Math.round(r.y / 150) + 1}</div>
                <div style={{ flex: 1, fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em" }}>{r.n}</div>
                <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>${r.v.toLocaleString("en-US")}</div>
                {r.me && f >= S(27.25) && <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, background: C.peri, borderRadius: 999, padding: "8px 18px", transform: `scale(${crown})` }}>#1</div>}
              </div>
            ))}
          </div>
        </Card>
      </Pop>
    </>
  );
};

/* ── scene 6: the mark ── */
const EndScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const m = spring({ frame: f - S(28.35), fps, config: theme.spring.bouncy });
  const glow = ramp(f, S(28.3), S(29.3));
  return (
    <>
      <div style={{ position: "absolute", left: 190, top: 430, width: 700, height: 700, borderRadius: "50%", filter: "blur(50px)", opacity: glow * 0.9, background: "radial-gradient(circle, rgba(200,214,252,.95), rgba(200,214,252,0) 65%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 620, display: "flex", justifyContent: "center" }}>
        <Mark size={230} style={{ transform: `scale(${m}) rotate(${(1 - m) * -40}deg)`, opacity: Math.min(1, m * 2), filter: "drop-shadow(0 30px 50px rgba(40,52,79,.3))" }} />
      </div>
      <Col top={900} gap={26}>
        <Words text="Obavia" at={S(28.6)} size={150} />
        <Words text="Hear what they really mean." at={S(29.0)} size={62} weight={700} color={C.body} per={2} />
      </Col>
      <Pop at={S(30.1)} from={40} cfg="snappy" style={{ position: "absolute", left: 0, right: 0, top: 1270, display: "flex", justifyContent: "center" }}>
        <Pill dark size={40}>Join the waitlist · obavia.co</Pill>
      </Pop>
    </>
  );
};

export const SalesAd: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const light = ramp(f, S(8.1), S(8.9), theme.ease.inOut);
  const at = [0.25, 4.7, 11.75, 16.0, 19.0 + D, 22.9 + D, 24.95 + D, 28.5 + D].map(S);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Fonts />
      <Sky light={light} />
      <Span a={0} b={S(4.75)}><CallScene /></Span>
      <Span a={S(4.6)} b={S(8.6)}><MissedScene /></Span>
      <Span a={S(8.6)} b={S(18.85 + D)}><HearScene /></Span>
      <Sequence from={S(D)}>
        <Span a={S(18.9)} b={S(24.85)}><NextScene /></Span>
        <Span a={S(24.85)} b={S(28.3)}><BoardScene /></Span>
        <Span a={S(28.25)} b={S(33) + 10}><EndScene /></Span>
      </Sequence>
      <Finish dark={1 - light} />

      {/* sound */}
      <Bed file="sfx/bed_sales.mp3" lines={V.map((v, i) => ({ at: at[i], len: Math.ceil(v.sec * fps) }))} />
      {V.map((v, i) => <Voice key={i} vo={v} at={at[i]} />)}
      <Sfx name="hit" at={0} volume={0.55} />
      {Array.from({ length: 16 }, (_, i) => <Sfx key={i} name="tick" at={S(0.1) + i * 4} volume={0.22 - i * 0.01} dur={4} />)}
      <TypeSfx text="“Let me think about it.”" at={S(2.75)} cps={20} volume={0.45} />
      <Sfx name="hangup" at={S(4.4)} volume={0.6} />
      <Sfx name="chime_low" at={S(5.15)} volume={0.25} /><Sfx name="chime_low" at={S(5.65)} volume={0.2} /><Sfx name="chime_low" at={S(6.15)} volume={0.2} />
      <Sfx name="riser" at={S(7.0)} volume={0.55} />
      <Sfx name="whoosh_long" at={S(8.0)} volume={0.6} />
      <Sfx name="hit" at={S(8.75)} volume={0.6} />
      <TypeSfx text={QUOTE} at={S(9.0)} cps={40} volume={0.38} />
      <Sfx name="pop" at={S(12.05)} volume={0.5} /><Sfx name="pop" at={S(13.25)} volume={0.5} />
      <Sfx name="whoosh" at={S(12.2)} volume={0.3} /><Sfx name="whoosh" at={S(13.35)} volume={0.3} />
      <Sfx name="tick" at={S(12.55)} volume={0.3} dur={4} /><Sfx name="tick" at={S(13.7)} volume={0.3} dur={4} />
      <Sfx name="chime_low" at={S(14.8)} volume={0.4} />
      <Sfx name="whoosh" at={S(15.9)} volume={0.35} />
      {GHOST_AT.map((t, i) => <Sfx key={i} name="pop" at={S(t)} volume={0.28} />)}
      <Sfx name="whoosh" at={S(19.25)} volume={0.5} />
      <Sfx name="chime" at={S(19.4)} volume={0.5} />
      <Sfx name="pop" at={S(20.0)} volume={0.35} /><Sfx name="pop" at={S(20.5)} volume={0.35} />
      <Sfx name="chime_low" at={S(21.1)} volume={0.3} />
      <Sequence from={S(D)}>
        <Sfx name="whoosh" at={S(19.05)} volume={0.4} />
        <TypeSfx text={NEXT} at={S(19.7)} cps={34} volume={0.38} />
        <Sfx name="pop" at={S(22.9)} volume={0.55} />
        <Sfx name="stamp" at={S(24.03)} volume={0.8} />
        <Sfx name="cash" at={S(24.35)} volume={0.5} />
        {Array.from({ length: 12 }, (_, i) => <Sfx key={`b${i}`} name="tick" at={S(26.0) + i * 3} volume={0.25} dur={4} />)}
        <Sfx name="chime_low" at={S(27.2)} volume={0.45} />
        <Sfx name="whoosh_long" at={S(27.95)} volume={0.45} />
        <Sfx name="hit" at={S(28.3)} volume={0.65} />
        <Sfx name="chime" at={S(28.45)} volume={0.35} />
      </Sequence>
    </AbsoluteFill>
  );
};
