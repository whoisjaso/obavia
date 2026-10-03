import { useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { Receipt as R } from './lib/money';
import { usd } from './lib/money';

/* ---------- feel: soft tones after a tap, a haptic tick, never on scroll ---------- */
let ac: AudioContext | null = null;
/** A soft, rounded tone: slow attack, low pass, short tail. Never loud. */
function chime(freqs: number[], gain = 0.012, gap = 0.1, tail = 0.7) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { ac ??= new AudioContext(); if (ac.state === 'suspended') ac.resume(); } catch { return; }
  const a = ac!;
  freqs.forEach((f, i) => {
    const t0 = a.currentTime + 0.01 + i * gap, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = 'sine'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 1800;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + tail);
    o.connect(lp).connect(g).connect(a.destination); o.start(t0); o.stop(t0 + tail + 0.05);
  });
}
export const haptic = () => { try { navigator.vibrate?.(6); } catch { /* no haptics */ } };
let lastKey = 0;
export const feel = {
  tap: () => { haptic(); chime([659.25], 0.009, 0, 0.45); },
  next: () => { haptic(); chime([523.25, 783.99], 0.011, 0.08, 0.6); },
  done: () => { haptic(); chime([523.25, 659.25, 783.99, 1046.5], 0.012, 0.11, 0.9); },
  /** A barely-there tick on each keystroke. */
  key: () => { const t = performance.now(); if (t - lastKey < 40) return; lastKey = t; chime([392 + Math.random() * 40], 0.006, 0, 0.12); },
};

/* ---------- the sky: watercolor clouds drifting behind every screen ---------- */
const CLOUDS: [number, number, number, number, number][] = [
  // image, width (vw fraction), top %, opacity, seconds to cross
  [0, 0.40, 8, 0.6, 260], [1, 0.30, 30, 0.65, 300], [2, 0.36, 18, 0.55, 280], [3, 0.34, 46, 0.7, 330],
  [4, 0.29, 62, 0.55, 360], [5, 0.37, 78, 0.68, 310], [6, 0.35, 90, 0.62, 240], [7, 0.44, 55, 0.72, 380],
];
export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <i className="glow" />
      {CLOUDS.map(([n, w, top, op, t], i) => (
        <span key={i} className="cloud" style={{ top: `${top}%`, width: `calc(max(100vw, 720px) * ${w})`, opacity: op, animationDuration: `${t}s`, animationDelay: `-${(i * 0.137 % 1) * t}s` }}>
          <img src={`./sky/w${n}.webp`} alt="" />
        </span>))}
      <i className="paper" style={{ backgroundImage: "url(./sky/paper.png)" }} />
    </div>
  );
}

/* ---------- icons ---------- */
const G: Record<string, ReactNode> = {
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />,
  chev: <path d="M9.5 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  cash: <><rect x="3" y="6.5" width="18" height="11" rx="2.6" /><circle cx="12" cy="12" r="2.6" /></>,
  house: <><path d="M4 11l8-6.5 8 6.5" /><path d="M6.5 9.5V19h11V9.5" /></>,
  bank: <><path d="M3.5 9l8.5-5 8.5 5" /><path d="M5.5 10v7M9.8 10v7M14.2 10v7M18.5 10v7M3.5 19.5h17" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.6" /><path d="M11 18h2" /></>,
  upload: <><path d="M12 15.5V4.5M7.5 9l4.5-4.5L16.5 9" /><path d="M5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-3" /></>,
  type: <><path d="M5 7V5h14v2M12 5v14M9 19h6" /></>,
  doc: <><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z" /><path d="M14 3.5V8h4M9 12h6M9 15.5h6" /></>,
  pen: <><path d="M4.5 19.5l1-4 10-10 3 3-10 10z" /><path d="M13.5 7.5l3 3" /></>,
  print: <><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="7" rx="2" /><path d="M7 14h10v6H7z" /></>,
  plate: <><rect x="3" y="7" width="18" height="10" rx="2.5" /><path d="M7 12h10" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></>,
  sheet: <><rect x="4.5" y="4.5" width="15" height="15" rx="3" /><path d="M4.5 10h15M10 10v9.5" /></>,
  link: <><path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>,
  sparkle: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />,
};
export function Ic({ n, s = 22, w = 1.9 }: { n: string; s?: number; w?: number }) {
  return <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{G[n]}</svg>;
}
export const Chev = () => <span className="chev"><Ic n="chev" s={16} w={2.2} /></span>;
export const Back = ({ to, label = 'Back' }: { to: string; label?: string }) => <a className="back" href={to} onClick={() => { feel.tap(); backward(); }}><Ic n="chev" s={18} w={2.4} />{label}</a>;

/* ---------- a car, drawn in its own colour (visual, not text) ---------- */
export function CarArt({ color = '#9AA6BF', body = 'Sedan', w = 150 }: { color?: string; body?: string; w?: number }) {
  const tall = body === 'SUV' || body === 'Crossover' || body === 'Van';
  const truck = body === 'Truck';
  const top = truck ? 'M40 44 L52 26 H92 L96 44' : tall ? 'M30 44 L44 22 H120 L134 44' : 'M38 44 L56 26 H108 L128 44';
  const bodyPath = truck ? 'M14 60 V46 Q14 44 18 44 H96 V36 H150 Q156 36 156 42 V60 Z' : 'M12 60 V50 Q12 44 22 44 H146 Q158 44 158 52 V60 Z';
  return (
    <svg viewBox="0 0 170 78" width={w} height={w * 78 / 170} aria-hidden="true">
      <ellipse cx="85" cy="70" rx="72" ry="4" fill="rgba(28,36,54,.08)" />
      <path d={top} fill={color} opacity=".82" />
      <path d={top} fill="#fff" opacity=".35" transform="translate(0 3) scale(1 .9)" />
      <path d={bodyPath} fill={color} />
      <circle cx="44" cy="61" r="10" fill="#28344F" /><circle cx="44" cy="61" r="4" fill="#C9D2E6" />
      <circle cx="128" cy="61" r="10" fill="#28344F" /><circle cx="128" cy="61" r="4" fill="#C9D2E6" />
    </svg>
  );
}

/* ---------- a choice button: tapping it saves and advances ---------- */
export function Choice({ label, gloss, icon, on, disabled, onPick }: { label: string; gloss?: string; icon?: string; on?: boolean; disabled?: boolean; onPick: () => void }) {
  return (
    <button className="choice" aria-pressed={!!on} disabled={disabled} onClick={() => { feel.next(); onPick(); }}>
      {icon && <span className="art"><Ic n={icon} s={24} /></span>}
      <span className="t"><b>{label}</b>{gloss && <small>{gloss}</small>}</span>
      <span className="tick">{on && <Ic n="check" s={15} w={3} />}</span>
    </button>
  );
}

/* ---------- the live receipt ---------- */
export function Receipt({ r, show = 'all' }: { r: R; show?: 'all' | 'short' }) {
  const rows: [string, number][] = [['Price', r.salePrice], ['Tax', r.tax], ['Title', r.title], ['Doc Fee', r.doc], ['Registration', r.registration]];
  if (r.tradeIn) rows.push(['Trade-In', -r.tradeIn]);
  return (
    <div className="receipt num">
      {show === 'all' && rows.map(([k, v]) => <div key={k}>{k}<b>{usd(v)}</b></div>)}
      <div className="total">Total<b>{usd(r.total)}</b></div>
      <div>Paid Today<b>{usd(r.paidToday)}</b></div>
      <div className={r.balance > 0 ? 'owed' : ''}>Balance<b>{usd(r.balance)}</b></div>
    </div>
  );
}

/* ---------- signature pad: one stroke per document ---------- */
export function Pad({ locked, onChange }: { locked?: boolean; onChange: (dataUrl: string | null) => void }) {
  const c = useRef<HTMLCanvasElement>(null), drawing = useRef(false), inked = useRef(false);
  useEffect(() => {
    const el = c.current!; const r = el.getBoundingClientRect(), d = devicePixelRatio || 1;
    el.width = r.width * d; el.height = r.height * d;
    const x = el.getContext('2d')!; x.scale(d, d); x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#1C2436';
  }, []);
  const pt = (e: React.PointerEvent) => { const r = c.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const clear = () => { const el = c.current!; el.getContext('2d')!.clearRect(0, 0, el.width, el.height); inked.current = false; onChange(null); };
  return (
    <>
      <div className={'pad' + (locked ? ' locked' : '')}>
        <div className="hint"><span>Sign here</span></div>
        <canvas ref={c} aria-label="Signature pad"
          onPointerDown={e => { drawing.current = true; c.current!.setPointerCapture(e.pointerId); const [a, b] = pt(e); const x = c.current!.getContext('2d')!; x.beginPath(); x.moveTo(a, b); }}
          onPointerMove={e => { if (!drawing.current) return; const [a, b] = pt(e); const x = c.current!.getContext('2d')!; x.lineTo(a, b); x.stroke(); inked.current = true; }}
          onPointerUp={() => { drawing.current = false; if (inked.current) { const url = c.current!.toDataURL('image/png'); onChange(url.length >= 200 ? url : null); } }} />
      </div>
      <div className="padrow"><span>{locked ? 'Read to the end to sign' : 'Sign with a finger'}</span><button onClick={clear}>Clear</button></div>
    </>
  );
}

/* ---------- screen to screen: the old one dissolves up into the sky, the next one settles in ---------- */
type VT = { finished: Promise<void> };
let dir: 'fwd' | 'back' = 'fwd';
/** Run a state change as a soft cross-screen transition. Falls back to an instant swap. */
export function transition(update: () => void, d: 'fwd' | 'back' = 'fwd') {
  const start = (document as Document & { startViewTransition?: (cb: () => void) => VT }).startViewTransition;
  if (!start || matchMedia('(prefers-reduced-motion: reduce)').matches) { update(); return; }
  document.documentElement.dataset.dir = d;
  start.call(document, () => flushSync(update)).finished.finally(() => { delete document.documentElement.dataset.dir; });
}
/** Mark the next hash change as going back, so the screens move the other way. */
export const backward = () => { dir = 'back'; };

export function useHash() {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const f = () => { const d = dir; dir = 'fwd'; transition(() => { setH(location.hash.slice(1) || '/'); scrollTo(0, 0); }, d); };
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f);
  }, []);
  return h;
}
export const go = (to: string) => { location.hash = to; };
