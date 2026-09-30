import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { Bed, Card, Col, Finish, Fonts, Mark, Pill, Pop, Sfx, Sky, Span, Voice, Words, clampOpts, ramp, useSec } from "./kit";
import VO from "./vo.json";

const C = theme.colors;
const V = VO.owner;
const BARS = [0.52, 0.64, 0.98, 0.58, 0.46, 0.7];
const DIPS = [0.52, 0.64, 0.98, 0.34, 0.22, 0.4];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const STAGES = ["Capture", "Qualify", "Book", "Attend", "Close", "Collect"];

/* ── scene 1: the feast-or-famine month ── */
const Baseball: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#F7F8FC" />
    <path d="M22 14 C40 34 40 66 22 86" fill="none" stroke="#C9544E" strokeWidth="3.5" strokeDasharray="5 5" />
    <path d="M78 14 C60 34 60 66 78 86" fill="none" stroke="#C9544E" strokeWidth="3.5" strokeDasharray="5 5" />
  </svg>
);
const MonthsScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const dip = ramp(f, S(2.0), S(2.8), theme.ease.inOut);
  const ball = ramp(f, S(2.9), S(4.3), theme.ease.inOut);
  const bx = interpolate(ball, [0, 1], [-160, 1160]), by = 1420 - Math.sin(ball * Math.PI) * 900;
  return (
    <>
      <Col top={330} gap={10}>
        <Words text="Some months, you’re fine." at={S(0.2)} out={S(1.85)} size={100} color="#fff" width={960} />
      </Col>
      <Col top={330} gap={10}>
        <Words text="Other months, you’re waiting on a Babe Ruth." at={S(2.0)} size={100} color="#fff" em={["Babe", "Ruth"]} emColor={C.peri} width={900} />
      </Col>
      <div style={{ position: "absolute", left: 120, right: 120, top: 860, height: 600, display: "flex", alignItems: "flex-end", gap: 34 }}>
        {BARS.map((b, i) => {
          const p = spring({ frame: f - S(0.1) - i * 4, fps, config: theme.spring.smooth });
          const h = interpolate(dip, [0, 1], [b, DIPS[i]]) * 520 * p;
          const star = i === 2;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <div style={{ width: "100%", height: h + Math.sin(f / 20 + i) * 4, borderRadius: 22,
                background: star ? `linear-gradient(180deg, #fff, ${C.peri})` : "rgba(200,214,252,0.28)",
                boxShadow: star ? "0 0 60px rgba(200,214,252,.55)" : "inset 0 0 0 2px rgba(200,214,252,.18)" }} />
              <div style={{ fontFamily: theme.font, fontSize: 30, fontWeight: 700, color: C.dimOnNight }}>{MONTHS[i]}</div>
            </div>
          );
        })}
      </div>
      {ball > 0 && ball < 1 && (
        <div style={{ position: "absolute", left: bx, top: by, transform: `rotate(${ball * 720}deg)`, filter: "drop-shadow(0 0 30px rgba(255,255,255,.5))" }}>
          <Baseball size={110} />
        </div>
      )}
    </>
  );
};

/* ── scene 2: all the inputs, none of the certainty ── */
const Counter: React.FC<{ label: string; to: number; at: number }> = ({ label, to, at }) => {
  const f = useCurrentFrame(); const S = useSec();
  const v = Math.round(interpolate(f, [at, at + S(0.9)], [0, to], { ...clampOpts, easing: theme.ease.out }));
  return (
    <Pop at={at} from={60} cfg="snappy">
      <Card dark w={880} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "36px 56px" }}>
        <div style={{ fontSize: 50, fontWeight: 700, color: C.dimOnNight, letterSpacing: "-0.02em" }}>{label}</div>
        <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>{v}</div>
      </Card>
    </Pop>
  );
};
const InputsScene: React.FC = () => {
  const S = useSec();
  return (
    <>
      <Col top={470} gap={34}>
        <Counter label="Leads this month" to={200} at={S(5.35)} />
        <Counter label="Reps on the floor" to={8} at={S(5.95)} />
        <Counter label="Calls taken" to={140} at={S(6.55)} />
      </Col>
      <Col top={1290}>
        <Words text="So where does the money go?" at={S(7.45)} size={104} color="#fff" em={["money"]} emColor={C.peri} width={880} />
      </Col>
    </>
  );
};

/* ── scene 3: the leaks ── */
const LEAKS = [{ y: 0, label: "Handoffs", at: 10.0 }, { y: 1, label: "No-shows", at: 10.9 }, { y: 2, label: "Unheard words", at: 11.9 }];
const LeakScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec();
  const draw = ramp(f, S(9.2), S(9.9));
  return (
    <>
      <Col top={320}><Words text="It leaks." at={S(9.3)} size={150} color="#fff" /></Col>
      <div style={{ position: "absolute", left: 270, top: 640, width: 26, height: 980 * draw, borderRadius: 13, background: `linear-gradient(180deg, ${C.peri}, rgba(200,214,252,0.15))` }} />
      {LEAKS.map((l, i) => {
        const y = 800 + l.y * 290;
        const on = f >= S(l.at);
        return (
          <React.Fragment key={i}>
            {on && Array.from({ length: 16 }, (_, k) => {
              const life = ((f - S(l.at)) + k * 5) % 60 / 60;
              const age = f - S(l.at) + k * 5 - 75;
              if (f - S(l.at) < k * 4) return null;
              return <div key={k} style={{ position: "absolute", left: 296 + life * 190 + Math.sin(k * 3) * 16, top: y + life * life * 190 + ((k * 13) % 9), width: 14 - life * 7, height: 14 - life * 7,
                borderRadius: "50%", background: C.peri, opacity: (1 - life) * 0.9 * (age > 99999 ? 0 : 1) }} />;
            })}
            <Pop at={S(l.at)} from={30} cfg="snappy" style={{ position: "absolute", left: 540, top: y - 36 }}>
              <div style={{ fontFamily: theme.font, fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 20 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: C.peri, boxShadow: "0 0 20px rgba(200,214,252,.8)" }} />{l.label}
              </div>
            </Pop>
            <div style={{ position: "absolute", left: 262, top: y - 10, width: 42, height: 42, borderRadius: "50%", background: C.night, boxShadow: `inset 0 0 0 6px ${on ? C.peri : "rgba(200,214,252,.3)"}`, opacity: draw }} />
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ── scene 4: one thread, lead to cash ── */
const ThreadScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const top = 660, step = 190, x = 300;
  const head = interpolate(f, [S(14.1), S(19.3)], [0, 5], { ...clampOpts, easing: theme.ease.inOut });
  const cashP = spring({ frame: f - S(19.45), fps, config: theme.spring.bouncy });
  return (
    <>
      <Col top={330} gap={4}><Words text="Every word," at={S(13.9)} size={84} width={960} /><Words text="carried to cash." at={S(14.2)} size={84} width={960} em={["cash."]} emColor={C.deep} /></Col>
      <div style={{ position: "absolute", left: x - 4, top, width: 8, height: head * step, borderRadius: 4, background: `linear-gradient(180deg, ${C.peri}, ${C.deep})` }} />
      {STAGES.map((s, i) => {
        const lit = head >= i - 0.02;
        const p = spring({ frame: f - S(13.8) - i * 3, fps, config: theme.spring.smooth });
        const last = i === STAGES.length - 1;
        return (
          <div key={s} style={{ position: "absolute", left: x - 30, top: top + i * step - 30, display: "flex", alignItems: "center", gap: 40, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: lit ? (last && cashP > 0.05 ? C.navy : C.deep) : "#fff", boxShadow: `inset 0 0 0 4px ${lit ? C.deep : C.line}`,
              transform: last ? `scale(${1 + cashP * 0.15})` : undefined }} />
            <div style={{ fontFamily: theme.font, fontSize: 58, fontWeight: 800, letterSpacing: "-0.03em", color: lit ? C.ink : "#B6C0D8" }}>{s}</div>
            {i === 1 && f >= S(15.9) && <Pop at={S(15.9)} from={20} cfg="snappy"><Pill size={28}>Setter</Pill></Pop>}
            {i === 4 && f >= S(17.2) && <Pop at={S(17.2)} from={20} cfg="snappy"><Pill size={28}>Closer</Pill></Pop>}
            {last && f >= S(19.45) && <Pop at={S(19.45)} from={20} cfg="bouncy"><Pill dark size={32}>$12,000 collected</Pill></Pop>}
          </div>
        );
      })}
      {/* the client's own words ride the thread */}
      <div style={{ position: "absolute", right: 1080 - x + 50, top: top + head * step - 26, opacity: ramp(f, S(14.6), S(15.1)) * (1 - ramp(f, S(19.2), S(19.5))) }}>
        <div style={{ fontFamily: theme.font, fontSize: 30, fontWeight: 700, color: C.deep, background: "#fff", borderRadius: 999, padding: "10px 24px", boxShadow: `inset 0 0 0 2px ${C.peri}, 0 20px 40px -20px rgba(40,52,79,.4)` }}>
          “Babe Ruth”
        </div>
      </div>
    </>
  );
};

/* ── scene 5: where progress stops, and what to do ── */
const FUNNEL = [{ n: "Booked", v: 1 }, { n: "Attended", v: 0.5, flag: true }, { n: "Closed", v: 0.32 }, { n: "Collected", v: 0.26 }];
const StopScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const flag = spring({ frame: f - S(21.6), fps, config: theme.spring.snappy });
  return (
    <>
      <Col top={320} gap={4}>
        <Words text="See where it stops." at={S(20.85)} size={96} width={980} />
        <Words text="Know what’s next." at={S(22.5)} size={96} width={980} color={C.deep} />
      </Col>
      <div style={{ position: "absolute", left: 110, top: 700, width: 860 }}>
        {FUNNEL.map((r, i) => {
          const p = spring({ frame: f - S(20.9) - i * 4, fps, config: theme.spring.smooth });
          return (
            <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 26, height: 118 }}>
              <div style={{ width: 250, fontFamily: theme.font, fontSize: 42, fontWeight: 700, color: C.body }}>{r.n}</div>
              <div style={{ flex: 1, height: 64, borderRadius: 20, background: "rgba(200,214,252,.35)", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${r.v * p * 100}%`, borderRadius: 20, background: r.flag && flag > 0.1 ? C.navy : C.deep }} />
                {r.flag && <div style={{ position: "absolute", left: `calc(${r.v * 100}% + 20px)`, top: 6, fontFamily: theme.font, fontSize: 30, whiteSpace: "nowrap", fontWeight: 800, color: C.navy, opacity: flag, transform: `translateX(${(1 - flag) * -20}px)` }}>50% ← stops here</div>}
              </div>
            </div>
          );
        })}
      </div>
      <Pop at={S(22.7)} from={60} style={{ position: "absolute", left: 110, top: 1250 }}>
        <Card w={860} style={{ padding: "40px 50px", boxShadow: `0 60px 120px -60px rgba(40,52,79,.45), inset 0 0 0 3px ${C.peri}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700, color: C.deep, letterSpacing: "-0.02em" }}><Mark size={46} />Next move</div>
          <div style={{ fontSize: 50, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.2, marginTop: 20 }}>Confirm agenda, timezone, and a reschedule option.</div>
        </Card>
      </Pop>
    </>
  );
};

/* ── scene 6: not another dashboard — a loop ── */
const LoopScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const fall = (i: number) => ramp(f, S(25.0) + i * 3, S(25.7) + i * 3, theme.ease.in);
  const ring = ramp(f, S(25.7), S(26.8), theme.ease.inOut);
  const spin = (f - S(25.7)) * 0.6;
  const cx = 540, cy = 1200, R = 290;
  const nodes = ["Detect", "Owner", "Evidence", "Approve", "Track", "Inspect"];
  return (
    <>
      <Col top={320} gap={4}>
        <Words text="Not another dashboard." at={S(24.5)} size={84} width={1000} />
        <Words text="A loop that keeps working." at={S(26.0)} size={76} width={1000} color={C.deep} />
      </Col>
      {[0, 1, 2, 3].map(i => {
        const p = fall(i);
        const col = i % 2, row = Math.floor(i / 2);
        return (
          <div key={i} style={{ position: "absolute", left: 130 + col * 430, top: 820 + row * 330 + p * 1100, width: 390, height: 290, borderRadius: 34, background: "rgba(255,255,255,.9)",
            boxShadow: `inset 0 0 0 2px ${C.line}`, transform: `rotate(${p * (col ? 24 : -20)}deg)`, opacity: ramp(f, S(24.4), S(24.8)) * (1 - p * 0.6), padding: 34, boxSizing: "border-box" }}>
            <div style={{ width: "50%", height: 18, borderRadius: 9, background: C.line }} />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150, marginTop: 40 }}>
              {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, k) => <div key={k} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 8, background: "#E6ECFB" }} />)}
            </div>
          </div>
        );
      })}
      {ring > 0 && (
        <>
          <svg style={{ position: "absolute", left: 0, top: 0 }} width={1080} height={1920}>
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.peri} strokeWidth={10} strokeLinecap="round" strokeDasharray={2 * Math.PI * R} strokeDashoffset={2 * Math.PI * R * (1 - ring)} transform={`rotate(${-90 + spin} ${cx} ${cy})`} />
          </svg>
          {nodes.map((n, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + (spin * Math.PI) / 180;
            const p = spring({ frame: f - S(25.9) - i * 3, fps, config: theme.spring.snappy });
            const pulse = Math.floor((f - S(26.2)) / 8) % 6 === i ? 1 : 0;
            return (
              <div key={n} style={{ position: "absolute", left: cx + Math.cos(a) * R, top: cy + Math.sin(a) * R, transform: `translate(-50%,-50%) scale(${p})`, opacity: Math.min(1, p) }}>
                <div style={{ fontFamily: theme.font, fontSize: 34, fontWeight: 800, color: pulse ? "#fff" : C.navy, background: pulse ? C.navy : "#fff", borderRadius: 999, padding: "16px 28px", whiteSpace: "nowrap", boxShadow: `inset 0 0 0 2px ${C.peri}, 0 20px 40px -20px rgba(40,52,79,.4)` }}>{n}</div>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 0, right: 0, top: cy - 40, textAlign: "center", fontFamily: theme.font, fontSize: 56, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", opacity: ramp(f, S(26.5), S(27)) }}>Every week.</div>
        </>
      )}
    </>
  );
};

/* ── scene 7: the promise ── */
const EndScene: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const m = spring({ frame: f - S(28.15), fps, config: theme.spring.bouncy });
  const glow = ramp(f, S(28.1), S(29.1));
  return (
    <>
      <div style={{ position: "absolute", left: 190, top: 260, width: 700, height: 700, borderRadius: "50%", filter: "blur(50px)", opacity: glow * 0.9, background: "radial-gradient(circle, rgba(200,214,252,.95), rgba(200,214,252,0) 65%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 440, display: "flex", justifyContent: "center" }}>
        <Mark size={200} style={{ transform: `scale(${m}) rotate(${(1 - m) * -40}deg)`, opacity: Math.min(1, m * 2), filter: "drop-shadow(0 30px 50px rgba(40,52,79,.3))" }} />
      </div>
      <Col top={720} gap={8}>
        <Words text="Your sales operation." at={S(28.5)} size={90} width={1000} />
        <Words text="Connected from" at={S(29.4)} size={90} width={1000} color={C.deep} />
        <Words text="lead to cash." at={S(29.75)} size={90} width={1000} color={C.deep} />
      </Col>
      <Pop at={S(31.2)} from={40} cfg="snappy" style={{ position: "absolute", left: 0, right: 0, top: 1110, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <Pill dark size={40}>Join the waitlist · obavia.co</Pill>
        <div style={{ fontFamily: theme.font, fontSize: 34, fontWeight: 700, color: C.body }}>For agency owners at $100K–$1M a month</div>
      </Pop>
    </>
  );
};

export const OwnerAd: React.FC = () => {
  const f = useCurrentFrame(); const S = useSec(); const { fps } = useVideoConfig();
  const light = ramp(f, S(13.2), S(13.9), theme.ease.inOut);
  const at = [0.3, 1.95, 5.2, 9.2, 13.75, 20.8, 24.45, 28.2].map(S);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Fonts />
      <Sky light={light} />
      <Span a={0} b={S(5.1)}><MonthsScene /></Span>
      <Span a={S(5.1)} b={S(9.15)}><InputsScene /></Span>
      <Span a={S(9.1)} b={S(13.55)}><LeakScene /></Span>
      <Span a={S(13.6)} b={S(20.7)}><ThreadScene /></Span>
      <Span a={S(20.7)} b={S(24.4)}><StopScene /></Span>
      <Span a={S(24.35)} b={S(28.05)}><LoopScene /></Span>
      <Span a={S(28.0)} b={S(34.5) + 10}><EndScene /></Span>
      <Finish dark={1 - light} />

      <Bed file="sfx/bed_owner.mp3" lines={V.map((v, i) => ({ at: at[i], len: Math.ceil(v.sec * fps) }))} />
      {V.map((v, i) => <Voice key={i} vo={v} at={at[i]} />)}
      <Sfx name="hit" at={0} volume={0.5} />
      {BARS.map((_, i) => <Sfx key={i} name="pop" at={S(0.1) + i * 4} volume={0.25} />)}
      <Sfx name="chime_low" at={S(0.55)} volume={0.35} />
      <Sfx name="whoosh" at={S(1.9)} volume={0.35} />
      <Sfx name="whoosh_long" at={S(2.85)} volume={0.55} />
      {[5.35, 5.95, 6.55].map((t, i) => <Sfx key={i} name="pop" at={S(t) - 2} volume={0.45} />)}
      {[5.35, 5.95, 6.55].flatMap((t, i) => Array.from({ length: 7 }, (_, k) => <Sfx key={`${i}-${k}`} name="tick" at={S(t) + k * 3} volume={0.18} dur={4} />))}
      <Sfx name="hit" at={S(9.2)} volume={0.45} />
      {LEAKS.map((l, i) => <Sfx key={i} name="chime_low" at={S(l.at) - 2} volume={0.3} />)}
      <Sfx name="riser" at={S(12.2)} volume={0.55} />
      <Sfx name="whoosh_long" at={S(13.05)} volume={0.55} />
      <Sfx name="hit" at={S(13.8)} volume={0.6} />
      {STAGES.map((_, i) => <Sfx key={i} name="tick" at={S(14.1) + Math.round(i * (S(5.2) / 5))} volume={0.35} dur={4} />)}
      <Sfx name="pop" at={S(15.85)} volume={0.4} /><Sfx name="pop" at={S(17.15)} volume={0.4} />
      <Sfx name="cash" at={S(19.4)} volume={0.55} />
      {FUNNEL.map((_, i) => <Sfx key={i} name="pop" at={S(20.9) + i * 4} volume={0.25} />)}
      <Sfx name="chime_low" at={S(21.55)} volume={0.4} />
      <Sfx name="whoosh" at={S(22.65)} volume={0.4} />
      <Sfx name="whoosh_long" at={S(24.95)} volume={0.45} />
      <Sfx name="riser" at={S(24.6)} volume={0.3} />
      <Sfx name="chime" at={S(26.0)} volume={0.35} />
      <Sfx name="whoosh_long" at={S(27.7)} volume={0.45} />
      <Sfx name="hit" at={S(28.1)} volume={0.65} />
      <Sfx name="chime" at={S(28.3)} volume={0.35} />
      <Sfx name="pop" at={S(31.15)} volume={0.4} />
    </AbsoluteFill>
  );
};
