import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { STAGES, STEPS, type StepIndex } from './data';
import { HEALTH_LABEL, biggest, health, k, perLead, rates, money, type Counts, type Health } from './engine';

/* ---------- icons, drawn from the mark ---------- */
const GLYPH: Record<string, ReactNode> = {
  overview: <><path d="M12.5 26.5v-5M17.5 26.5V17M22.5 26.5v-7M27.5 26.5V13.5" /></>,
  leak: <path d="M12.5 13.5h15l-5.8 7.2v6.8l-3.4-1.8v-5z" />,
  reps: <><circle cx="16.5" cy="17" r="3.4" /><circle cx="24.5" cy="17.8" r="2.8" /><path d="M11.5 27c.8-3.6 3-5.4 5-5.4s4.2 1.8 5 5.4M22.4 22.3c2.8-.6 5 1 5.9 4.7" /></>,
  move: <><path d="M12.5 25.5c3.2-6.4 8.6-8 14.5-5.2" /><path d="M23.4 16.4l3.9 4-4.4 3.4" /></>,
  leads: <><circle cx="20" cy="17.2" r="4" /><path d="M13 27.5c1.4-3.8 4-5.6 7-5.6s5.6 1.8 7 5.6" /></>,
  today: <><circle cx="20" cy="20" r="7.2" /><path d="M20 16.4V20l2.6 1.8" /></>,
  call: <path d="M13.2 18v4M17.4 13.5v13M21.6 15.8v8.4M25.8 17.6v4.8" />,
  show: <><circle cx="20" cy="20" r="7.2" /><circle cx="20" cy="20" r="2.4" className="fill" /></>,
  cash: <path d="M24.8 14.8c-1-1.8-2.8-2.8-4.9-2.8-2.8 0-4.8 1.6-4.8 3.8 0 5.2 9.9 3.1 9.9 8.6 0 2.4-2.2 4-5.2 4-2.2 0-4-.9-5-2.7" />,
  check: <path d="M13.6 20.6l4.4 4.4 8.6-9" />,
  play: <path d="M17 13.8v12.4l9.6-6.2z" />,
};
export function Icon({ name, size = 30, dim }: { name: keyof typeof GLYPH | string; size?: number; dim?: boolean }) {
  const id = useId().replace(/:/g, '');
  const g = GLYPH[name];
  return (
    <svg className={'obi' + (dim ? ' dim' : '')} viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id + 'g'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E9EFFE" /><stop offset=".55" stopColor="#B8C8F1" /><stop offset="1" stopColor="#869FD6" /></linearGradient>
        <radialGradient id={id + 'l'} cx=".74" cy=".34" r=".46"><stop offset="0" stopColor="#5A73B0" stopOpacity=".34" /><stop offset="1" stopColor="#5A73B0" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${id}g)`} /><circle cx="20" cy="20" r="19" fill={`url(#${id}l)`} />
      <g className="s" transform="translate(.7 .9)">{g}</g><g className="g">{g}</g>
      <path d="M6.4 15.2A14.6 14.6 0 0 1 14.6 6.5" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Pill({ i, v, sm }: { i: StepIndex; v: number; sm?: boolean }) {
  const h = health(i, v);
  return <span className={`hp ${h}${sm ? ' sm' : ''}`}><b className="num">{Math.round(v)}%</b><span>{HEALTH_LABEL[h]}</span></span>;
}

export function Avatar({ initials, tint = 'a', lg }: { initials: string; tint?: string; lg?: boolean }) {
  return <span className={`av ${tint}${lg ? ' lg' : ''}`}>{initials}</span>;
}

export function Bar({ w, leak }: { w: number; leak?: boolean }) {
  return <div className={'bar' + (leak ? ' leak' : '')}><i style={{ width: Math.max(2, Math.min(100, w)) + '%' }} /></div>;
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

export function Funnel({ c, compact, onStep, active }: { c: Counts; compact?: boolean; onStep?: (i: StepIndex) => void; active?: StepIndex }) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(0);
  const conv = rates(c), hs = conv.map((v, i) => health(i as StepIndex, v)), worst = biggest(c);
  useEffect(() => {
    const el = box.current!; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect();
  }, []);
  const vert = w > 0 && w < (compact ? 420 : 560);
  const n = 5, endW = compact ? 90 : 150;
  const L = vert
    ? { axis: 50, T: 70, pos: [0, 1, 2, 3, 4].map(i => 36 + i * (compact ? 78 : 92)), h: 0, endX: w / 2, endY: 0 }
    : { axis: compact ? 62 : 134, T: compact ? 40 : Math.min(104, w * .09), pos: [0, 1, 2, 3, 4].map(i => 34 + i * ((w - endW - 60) / 4)), h: compact ? 150 : 290, endX: w - endW / 2, endY: compact ? 62 : 134 };
  if (vert) { L.endY = L.pos[4] + 130; L.h = L.endY + 70; }
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
        <div key={s} className="st" aria-hidden="true" style={vert ? { left: L.axis + L.T / 2 + 20, top: L.pos[i] - 20, transform: 'none', textAlign: 'left' } : { left: L.pos[i], top: L.axis - L.T / 2 - (compact ? 32 : 60) }}>
          <b className="num">{c[i].toLocaleString('en-US')}</b>{(!compact || vert) && <span>{s}</span>}
        </div>
      ))}
      {w > 0 && conv.map((v, i) => (
        <button key={i} type="button" className={`hp ${hs[i]}${compact ? ' sm' : ''}`} title={STEPS[i]} onClick={() => onStep?.(i as StepIndex)}
          style={vert ? { left: w - 40, top: (L.pos[i] + L.pos[i + 1]) / 2 - 20 } : { left: (L.pos[i] + L.pos[i + 1]) / 2, top: L.axis + L.T / 2 + (compact ? 10 : 18) }}>
          <b className="num">{Math.round(v)}%</b><span>{HEALTH_LABEL[hs[i]]}</span>
        </button>
      ))}
      {w > 0 && !compact && !vert && worst.worth > 0 && (
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
