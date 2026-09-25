import { useEffect, useRef, useState, type ReactNode } from 'react';
import { STAGES, STEPS, type StepIndex } from './data';
import { HEALTH_LABEL, biggest, health, k, perLead, rates, money, type Counts, type Health } from './engine';

/* ---------- icons: one weight, rounded, like the mark's ribbon ---------- */
const GLYPH: Record<string, ReactNode> = {
  overview: <path d="M5 19.5v-6M10 19.5V6.5M15 19.5v-8M20 19.5v-11" />,
  leak: <path d="M12 3.8c3.3 4 5.6 7.2 5.6 10.1a5.6 5.6 0 0 1-11.2 0c0-2.9 2.3-6.1 5.6-10.1z" />,
  reps: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19.5c.9-3.4 3-5.1 5.5-5.1s4.6 1.7 5.5 5.1" /><path d="M16 5.6a3 3 0 0 1 0 5.8M17.2 14.6c1.8.5 3 2.1 3.5 4.9" /></>,
  move: <><path d="M4.5 18c2.4-6.3 7.6-8.7 14-6.2" /><path d="M15.4 7.6l3.8 4-4.3 3.6" /></>,
  leads: <><circle cx="12" cy="8.6" r="3.6" /><path d="M5 19.8c1.3-3.6 3.9-5.5 7-5.5s5.7 1.9 7 5.5" /></>,
  today: <><circle cx="12" cy="12" r="8" /><path d="M12 7.8V12l2.9 2" /></>,
  phone: <path d="M7.4 4.5h2.2l1.4 3.8-1.8 1.2a9.6 9.6 0 0 0 5.3 5.3l1.2-1.8 3.8 1.4v2.2a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 5.4 6.7a2 2 0 0 1 2-2.2z" />,
  calendar: <><rect x="4.5" y="5.5" width="15" height="14" rx="3" /><path d="M4.5 10h15M9 3.8v3.4M15 3.8v3.4" /></>,
  card: <><rect x="3.5" y="6" width="17" height="12" rx="3" /><path d="M3.5 10.2h17M7 14.6h3.5" /></>,
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />,
  chev: <path d="M9.5 6l6 6-6 6" />,
  x: <path d="M7 7l10 10M17 7L7 17" />,
  sound: <><path d="M5 10v4h3l4 3.5v-11L8 10z" /><path d="M15.5 9.2a4 4 0 0 1 0 5.6" /></>,
};
export function Ic({ name, size = 22, w = 1.8, className = 'ic' }: { name: string; size?: number; w?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {GLYPH[name]}
    </svg>
  );
}
export const Chev = () => <Ic name="chev" size={16} w={2.2} className="chev" />;

/** Leak / on pace / strong, as a coloured dot and a word. */
export function Status({ h, children }: { h: Health; children?: ReactNode }) {
  return <span className={'st ' + h}>{children ?? HEALTH_LABEL[h]}</span>;
}
export function Track({ w, h }: { w: number; h?: Health }) {
  return <div className={'track' + (h && h !== 'norm' ? ' ' + h : '')}><i style={{ width: Math.max(2, Math.min(100, w)) + '%' }} /></div>;
}

export function Avatar({ initials, tint = 'a', lg }: { initials: string; tint?: string; lg?: boolean }) {
  return <span className={`av ${tint}${lg ? ' lg' : ''}`}>{initials}</span>;
}

export function Spark({ data, h, color = '#7D97C7' }: { data: number[]; h?: Health; color?: string }) {
  const W = 120, H = 36, min = Math.min(...data) - 2, max = Math.max(...data) + 2;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - ((v - min) / (max - min)) * H]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const c = h === 'leak' ? '#E3A068' : h === 'good' ? '#5FC795' : color;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.2" fill={c} />
    </svg>
  );
}

export function useCount(to: number, dur = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const step = (n: number) => { const p = Math.min(1, (n - t0) / dur); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return v;
}

/* ---------- the funnel ribbon ----------
   Thickness is volume. Leads that fall away drift off where the step leaks.
   Each step wears its halo, the biggest leak is named in dollars, and the
   end is revenue per lead, blended from the step colours. */
const HCOL: Record<Health, string> = { good: '#96E0BA', norm: '#C8D6FC', leak: '#F5C593' };
const TINT: Record<Health, string> = { good: '118,214,166', norm: '', leak: '244,178,112' };

export function Funnel({ c, compact, onStep, active, callout }: { c: Counts; compact?: boolean; onStep?: (i: StepIndex) => void; active?: StepIndex; callout?: boolean }) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(0);
  const conv = rates(c), hs = conv.map((v, i) => health(i as StepIndex, v)), worst = biggest(c);
  useEffect(() => {
    const el = box.current!; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect();
  }, []);
  const vert = w > 0 && w < (compact ? 420 : 560);
  const n = 5, endW = compact ? 90 : 150;
  const L = vert
    ? { axis: 50, T: 70, pos: [0, 1, 2, 3, 4].map(i => 30 + i * (compact ? 64 : 70)), h: 0, endX: w / 2, endY: 0 }
    : { axis: compact ? 62 : 134, T: compact ? 40 : Math.min(104, w * .09), pos: [0, 1, 2, 3, 4].map(i => 34 + i * ((w - endW - 60) / 4)), h: compact ? 150 : 250, endX: w - endW / 2, endY: compact ? 62 : 134 };
  if (vert) { L.endY = L.pos[4] + 104; L.h = L.endY + 62; }
  const th = c.map(v => L.T * (.14 + .86 * Math.sqrt(v / c[0])));

  useEffect(() => {
    const canvas = cv.current; if (!canvas || !w) return;
    const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = w * dpr; canvas.height = L.h * dpr;
    const ctx = canvas.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = (a: number, x: number): [number, number] => (vert ? [L.axis + x, a] : [a, L.axis + x]);
    const thAt = (s: number) => { if (s <= L.pos[0]) return th[0]; if (s >= L.pos[4]) return th[4]; let i = 0; while (i < 3 && s > L.pos[i + 1]) i++;
      const t = (s - L.pos[i]) / (L.pos[i + 1] - L.pos[i]), e = t * t * (3 - 2 * t); return th[i] + (th[i + 1] - th[i]) * e; };
    const start = L.pos[0] - 18, stop = L.pos[4];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    type Pt = { s: number; off: number; v: number; die: number; seg: number; dead: number };
    const spawn = (): Pt => { const r = Math.random(); let d = -1; for (let i = 1; i < n; i++) if (r > c[i] / c[0]) { d = i; break; }
      return { s: start, off: (Math.random() - .5) * .8, v: (compact ? 30 : 50) * (.7 + Math.random() * .6), die: d < 0 ? Infinity : L.pos[d - 1] + (L.pos[d] - L.pos[d - 1]) * (.3 + .45 * Math.random()), seg: d - 1, dead: 0 }; };
    const parts: Pt[] = Array.from({ length: reduced ? 0 : compact ? 20 : vert ? 30 : 48 }, () => { const p = spawn(); p.s = start + Math.random() * (stop - start); return p; });
    let raf = 0, last = performance.now(), grow = reduced ? 1 : 0;
    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; grow = Math.min(1, grow + dt / 1.6);
      const reach = start + (stop - start) * (1 - Math.pow(1 - grow, 3));
      ctx.clearRect(0, 0, w, L.h);
      const top: [number, number][] = [], bot: [number, number][] = [], steps = 60;
      for (let k2 = 0; k2 <= steps; k2++) { const s = start + (reach - start) * k2 / steps, h = thAt(s) / 2; top.push(P(s, -h)); bot.push(P(s, h)); }
      ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
      const [gx0, gy0] = P(start, 0), [gx1, gy1] = P(stop, 0), g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, 'rgba(214,225,253,.95)'); g.addColorStop(.55, 'rgba(176,195,240,.95)'); g.addColorStop(1, 'rgba(125,151,199,.95)');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      hs.forEach((h, i) => { if (h === 'norm') return; const a = L.pos[i], b = L.pos[i + 1]; const [ax, ay] = P(a, 0), [bx, by] = P(b, 0);
        const tg = ctx.createLinearGradient(ax, ay, bx, by); tg.addColorStop(0, `rgba(${TINT[h]},0)`); tg.addColorStop(.5, `rgba(${TINT[h]},${h === 'leak' ? .75 : .55})`); tg.addColorStop(1, `rgba(${TINT[h]},0)`);
        ctx.fillStyle = tg; if (vert) ctx.fillRect(L.axis - L.T, a, L.T * 2, b - a); else ctx.fillRect(a, L.axis - L.T, b - a, L.T * 2); });
      if (active !== undefined) { const a = L.pos[active], b = L.pos[active + 1]; ctx.fillStyle = 'rgba(40,52,79,.07)'; if (vert) ctx.fillRect(L.axis - L.T, a, L.T * 2, b - a); else ctx.fillRect(a, L.axis - L.T, b - a, L.T * 2); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      L.pos.forEach(s => { if (s > reach + .5) return; const h = thAt(s) / 2, [x0, y0] = P(s, -h - 3), [x1, y1] = P(s, h + 3); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
      if (grow >= 1) { const [ex, ey] = P(stop, 0); ctx.strokeStyle = 'rgba(125,151,199,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey);
        if (vert) ctx.bezierCurveTo(ex, ey + 50, L.endX, L.endY - 90, L.endX, L.endY - 46); else ctx.lineTo(L.endX - (compact ? 30 : 46), ey); ctx.stroke(); }
      for (const p of parts) {
        if (!p.dead) { p.s += p.v * dt; if (p.s >= p.die) p.dead = .0001; } else p.dead += dt;
        if (p.dead > 1.1 || p.s > stop) { Object.assign(p, spawn()); continue; }
        if (p.s > reach) continue;
        let [x, y] = P(p.s, thAt(p.s) / 2 * p.off), a = .6;
        if (p.dead) { const q = p.dead / 1.1, e = 1 - Math.pow(1 - q, 3); if (vert) x += (p.off < 0 ? -1 : 1) * 20 * e; else y += (p.off < 0 ? -1 : 1) * 16 * e; a *= 1 - q;
          ctx.fillStyle = hs[p.seg] === 'leak' ? `rgba(214,140,70,${a})` : `rgba(125,151,199,${a})`; }
        else ctx.fillStyle = `rgba(40,52,79,${a})`;
        ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, c.join(','), compact, active]); // eslint-disable-line

  const blend = `conic-gradient(from 200deg, ${[...hs, 'norm' as Health].map(h => HCOL[h]).join(', ')}, ${HCOL[hs[0]]})`;
  return (
    <div className="fnl" ref={box} style={{ height: L.h || 150 }} role="img"
      aria-label={STAGES.map((s, i) => `${c[i]} ${s.toLowerCase()}`).join(', ') + `. ${money(perLead(c))} per lead.`}>
      <canvas ref={cv} aria-hidden="true" />
      {w > 0 && STAGES.map((s, i) => (
        <div key={s} className={'stg' + (vert ? ' vert' : '')} aria-hidden="true" style={vert ? { left: L.axis + L.T / 2 + 20, top: L.pos[i] - 20 } : { left: L.pos[i], top: L.axis - L.T / 2 - (compact ? 32 : 60) }}>
          <b className="num">{c[i].toLocaleString('en-US')}</b>{(!compact || vert) && <span>{s}</span>}
        </div>
      ))}
      {w > 0 && conv.map((v, i) => (
        <button key={i} type="button" className={`rt ${hs[i]}${vert ? ' vert' : ''}`} title={STEPS[i]} aria-label={`${STEPS[i]}: ${Math.round(v)}%, ${HEALTH_LABEL[hs[i]]}`} onClick={() => onStep?.(i as StepIndex)}
          style={vert ? { right: 0, top: (L.pos[i] + L.pos[i + 1]) / 2 - 20 } : { left: (L.pos[i] + L.pos[i + 1]) / 2, top: L.axis + L.T / 2 + (compact ? 10 : 18) }}>
          <span className="num" style={{ font: 'inherit', color: 'inherit' }}>{Math.round(v)}%</span><span>{HEALTH_LABEL[hs[i]]}</span>
        </button>
      ))}
      {w > 0 && callout && !compact && !vert && worst.worth > 0 && (
        <div className="call" aria-hidden="true" style={{ left: (L.pos[worst.step] + L.pos[worst.step + 1]) / 2, top: L.axis + L.T / 2 + 70 }}>
          Biggest leak: {k(worst.worth)}<span>a month left on the table</span>
        </div>
      )}
      {w > 0 && (
        <div className="end" style={{ left: L.endX, top: L.endY }}>
          <div className="orb" style={{ ['--blend' as string]: blend, ['--os' as string]: compact ? '62px' : '96px' }}><b className="num">{money(perLead(c))}</b></div>
          <span>per lead</span>
        </div>
      )}
    </div>
  );
}
