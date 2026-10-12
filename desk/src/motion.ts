/* The Desk's motion, in one place. GSAP is the how; Emil's animate skill
   decided the what (see the survey in the GSAP pass report):
   - a screen's parts settle in, staggered, when a `.enter` section mounts
     (View Transitions still carries the old screen out and the dock across);
   - a figure that changes while you watch counts to its new value;
   - a progress ring sweeps to its new share;
   - Go lands once, on the chime;
   - the cloud system (docs/design/cloud-system.md): the sky's three layers drift and part on
     scroll (skyDrift), every control sinks and rises under the thumb (cloudPress), an action that
     completes swells once (landed), and a sheet rises like a cloud forming from the bottom.
   Reduced motion keeps every state change and drops the decoration: numbers
   and rings jump, entrances are a short fade with no movement. Only transform,
   opacity and the ring's --p are ever animated. Nothing here blocks a tap:
   entering parts are live from the first frame, and the dock never moves. */
import { createElement, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);
/* The house curves from styles.css, so CSS and GSAP move alike. */
const EASE = CustomEase.create('desk-ease', '0.2,0.7,0.2,1'); //  --ease: arrivals, counts, rings
const SPRING = CustomEase.create('desk-spring', '0.32,0.72,0,1'); // --spring: the landed settle
const OUT = CustomEase.create('desk-out', '0.23,1,0.32,1'); //          the press: a strong ease-out
/** A spring as an ease: damping ratio z, settled by t = 1, its overshoot held to `cap` (spec §2: ≤ 3 percent). */
function springEase(id: string, z: number, cap: number) {
  const w = 6.4 / z, wd = w * Math.sqrt(1 - z * z), peak = Math.exp(-z * Math.PI / Math.sqrt(1 - z * z));
  const k = Math.min(1, cap / peak), pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, v = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
    pts.push(`${t.toFixed(4)},${(i === 60 ? 1 : v > 1 ? 1 + (v - 1) * k : v).toFixed(5)}`);
  }
  return CustomEase.create(id, `M${pts[0]} L${pts.slice(1).join(' ')}`);
}
const RISE = springEase('cloud-rise', 0.65, 0.03); //   release: re-inflates, about 3 percent over, never rings twice
const SHEET = springEase('cloud-sheet', 0.75, 0.03); // a sheet forming from the bottom

/* Reduced motion, live: when it turns on mid-animation, everything running jumps to its end state. */
let reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
if (typeof matchMedia === 'function') {
  gsap.matchMedia().add({ calm: '(prefers-reduced-motion: reduce)', full: '(prefers-reduced-motion: no-preference)' }, ctx => {
    reduced = !!ctx.conditions?.calm;
    if (reduced) gsap.globalTimeline.getChildren(true, true, false).forEach(t => t.progress(1));
  });
}
/* GSAP owns these inline props only while it runs; CSS (press, hover, transitions) gets them back after. */
const CLEAR = 'transform,translate,scale,rotate,opacity,transition';

/* ---------- enter: a screen's parts settle in ---------- */
/** Settle a screen's parts in: opacity, a short rise (a short fall going back) and a hair of scale,
 *  0.42 s on the house ease, 40 ms apart, the fifth and later parts together. */
export function enter(parts: HTMLElement[], stagger = 0.04) {
  if (!parts.length) return;
  const sheets = parts.filter(isSheet);
  if (sheets.length) { sheets.forEach(riseSheet); parts = parts.filter(p => !isSheet(p)); if (!parts.length) return; }
  if (reduced) { gsap.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'none', overwrite: 'auto', clearProps: 'opacity' }); return; }
  const back = document.documentElement.dataset.dir === 'back';
  gsap.set(parts, { transition: 'none' });
  gsap.fromTo(parts, { opacity: 0, y: back ? -8 : 10, scale: 0.985 },
    { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: EASE, stagger: i => Math.min(i, 4) * stagger, overwrite: 'auto', clearProps: CLEAR });
}
/* ---------- sheets: the paper and the pad rise like a cloud forming from the bottom ---------- */
const isSheet = (el: Element) => el.matches('.paper, .pad');
/** Spec §4: from below (its own height, at most 60 percent of the screen) on a spring at damping 0.75,
 *  its shade fading in with it. Reduced motion: a fade. */
export function riseSheet(el: HTMLElement) {
  if (reduced) { gsap.fromTo(el, { opacity: 0 }, { opacity: Number(getComputedStyle(el).opacity) || 1, duration: 0.2, ease: 'none', overwrite: 'auto', clearProps: 'opacity' }); return; }
  const o = Number(getComputedStyle(el).opacity) || 1; // a locked pad rests at its own opacity
  gsap.set(el, { transition: 'none' });
  gsap.fromTo(el, { y: Math.min(el.offsetHeight || 200, innerHeight * 0.6), opacity: 0 },
    { y: 0, opacity: o, duration: 0.62, ease: SHEET, overwrite: 'auto', clearProps: CLEAR });
}
const isPart = (el: Element): el is HTMLElement => el instanceof HTMLElement && !el.matches('.dock') && !el.querySelector('.dock');
/** Every `.enter` section that mounts under root has its parts settled in; a part added to a live
 *  section later (an error line, the lower-the-floor field) settles in alone. One observer, no refs. */
export function watchEnter(root: HTMLElement, onSettle?: () => void) {
  const mo = new MutationObserver(recs => {
    const batch = new Map<Element, HTMLElement[]>();
    let page = false; // a whole section arrived (a page), not a line added to a live one: only a page sounds
    const add = (sec: Element, els: HTMLElement[]) => { if (els.length) batch.set(sec, [...(batch.get(sec) ?? []), ...els]); };
    for (const r of recs) r.addedNodes.forEach(n => {
      if (!(n instanceof HTMLElement) || !n.isConnected) return;
      if (n.matches('.enter')) { page = true; add(n, [...n.children].filter(isPart)); }
      else if (n.parentElement?.matches('.enter') && isPart(n)) add(n.parentElement, [n]);
      n.querySelectorAll('.enter').forEach(s => { page = true; add(s, [...s.children].filter(isPart)); });
    });
    batch.forEach(parts => enter([...new Set(parts)]));
    if (page && batch.size) onSettle?.();
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}

/* ---------- countTo: a figure that changes counts to its new value ---------- */
const shown = new WeakMap<Element, number>();
const counting = new WeakMap<Element, gsap.core.Tween>();
/** Count el's text from what it shows now to n in 0.45 s, the format rounds on the way, n exact at the end.
 *  A new value mid-count picks up from the figure on the glass, never from the old target. */
export function countTo(el: HTMLElement, n: number, format: (n: number) => string) {
  const from = shown.get(el);
  counting.get(el)?.kill();
  const settle = () => { shown.set(el, n); el.textContent = format(n); };
  if (from === undefined || from === n || reduced) { settle(); return; }
  const o = { v: from };
  counting.set(el, gsap.to(o, { v: n, duration: 0.45, ease: EASE, onUpdate: () => { shown.set(el, o.v); el.textContent = format(o.v); }, onComplete: settle }));
}

/** A changed figure draws the eye once: a quick lift back to full, 0.32 s. Reduced motion keeps the fade. */
export function pulse(el: HTMLElement) {
  if (reduced) { gsap.fromTo(el, { opacity: 0.5 }, { opacity: 1, duration: 0.2, ease: 'none', overwrite: 'auto', clearProps: 'opacity' }); return; }
  gsap.set(el, { transition: 'none' });
  gsap.fromTo(el, { opacity: 0.55, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.32, ease: SPRING, overwrite: 'auto', clearProps: CLEAR });
}

/** The figure in a span React does not write into: the first value is set before paint, later ones count. */
export function useCount(ref: RefObject<HTMLElement>, value: number, format: (n: number) => string, withPulse = false) {
  const fmt = useRef(format); fmt.current = format;
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const was = shown.get(el);
    countTo(el, value, n => fmt.current(n));
    if (withPulse && was !== undefined && was !== value) pulse(el);
  }, [value]); // a re-render with the same figure (the one-second tick) leaves a running count alone
}
/** <Count value={n} format={usd} />: a span that counts. */
export function Count({ value, format = String, pulse: withPulse = false, className, style }: { value: number; format?: (n: number) => string; pulse?: boolean; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCount(ref, value, format, withPulse);
  return createElement('span', { ref, className, style });
}

/* ---------- ring: a progress ring sweeps to its new share ---------- */
const lastRing = new Map<string, number>();
/** Sweep el's --p from `from` to `to` (0 to 100) in 0.6 s. Under a point of change it is set, not swept. */
export function ring(el: HTMLElement, from: number, to: number) {
  gsap.killTweensOf(el, '--p');
  if (reduced || Math.abs(to - from) < 1) { el.style.setProperty('--p', String(to)); return; }
  gsap.fromTo(el, { '--p': from }, { '--p': to, duration: 0.6, ease: EASE });
}
/** The ring owns --p (React must not set it). With `remember`, the sweep starts from the share last
 *  shown for that key on this device, so coming back after a step shows the step land. */
export function useRing(ref: RefObject<HTMLElement>, p: number, remember?: string) {
  const prev = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const from = prev.current ?? (remember ? lastRing.get(remember) : undefined) ?? p;
    prev.current = p; if (remember) lastRing.set(remember, p);
    ring(el, from, p);
  }, [p, remember]);
}

/* ---------- landed: an action completed, the cloud breathes once ---------- */
/** Spec §2: scale 1 → 1.03 → 1 over 420 ms, ease in-out, on the same frame as feel.done(); the only
 *  moment a cloud grows. It never moves off its spot; reduced motion keeps the word change alone. */
export function landed(el: HTMLElement | null | undefined) {
  if (!el || !el.isConnected) return;
  el.classList.remove('is-pressed');
  if (reduced) return;
  gsap.timeline({ onComplete: () => { gsap.set(el, { clearProps: TRANSFORM }); } })
    .to(el, { y: 0, scale: 1.03, duration: 0.21, ease: 'sine.inOut', overwrite: 'auto' })
    .to(el, { scale: 1, duration: 0.21, ease: 'sine.inOut' });
}
/** The Go button's landed state (kept as a name for Auction.tsx). */
export const land = landed;

/* ---------- cloudPress: a control is a cloud you push your thumb into ---------- */
const PRESSABLE = 'button, .btn, .choice, .back, .textlink, .top .link, label.choice';
const TRANSFORM = 'transform,translate,scale,rotate';
let lastPress: { el: HTMLElement; at: number } | null = null;
/** The control pressed in the last 1.5 s, for feel.done() to swell; null after that, so a done that no
 *  thumb caused never swells a stale button. */
export const pressedNow = () => (lastPress && performance.now() - lastPress.at < 1500 && lastPress.el.isConnected ? lastPress.el : null);
const inert = (el: HTMLElement) => el.matches(':disabled, [aria-disabled="true"], .locked') || !!el.closest('fieldset:disabled, .locked');
function sink(el: HTMLElement) {
  el.classList.add('is-pressed'); // the shade pseudo-element fades to 55 percent in CSS (100 ms)
  if (reduced) { gsap.to(el, { opacity: 0.7, duration: 0.08, ease: 'none', overwrite: 'auto' }); return; }
  gsap.to(el, { y: 2.5, scale: 0.985, duration: 0.1, ease: OUT, overwrite: 'auto' });
}
function rise(el: HTMLElement, cancel: boolean) {
  el.classList.remove('is-pressed');
  if (reduced) { gsap.to(el, { opacity: 1, duration: 0.12, ease: 'none', overwrite: 'auto', clearProps: 'opacity' }); return; }
  gsap.to(el, { y: 0, scale: 1, duration: 0.3, ease: cancel ? OUT : RISE, overwrite: 'auto', clearProps: TRANSFORM });
}
/** Every press under root, by delegation: sink on pointerdown before any logic (100 ms ease-out:
 *  2.5 px down, scale 0.985, shade down), rise on release (300 ms, a spring at damping 0.65 held to
 *  3 percent over), rise without the overshoot on cancel or drag-off. Disabled controls never sink.
 *  Transform and opacity only. `press` is told when a thumb lands (a touch waits 40 ms, so the start of
 *  a scroll stays silent), `release` when it lifts on the control. */
export function cloudPress(root: HTMLElement | Document = document, hooks: { press?: () => void; release?: () => void } = {}) {
  const down = (e: PointerEvent) => {
    if (e.button > 0 || !e.isPrimary || !(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLElement>(PRESSABLE);
    if (!el || !root.contains(el) || inert(el)) return;
    sink(el);
    lastPress = { el, at: performance.now() };
    const x0 = e.clientX, y0 = e.clientY;
    let sounded = false, timer = 0;
    const sound = () => { if (!sounded) { sounded = true; clearTimeout(timer); hooks.press?.(); } };
    if (e.pointerType === 'touch') timer = window.setTimeout(sound, 40); else sound();
    const move = (m: PointerEvent) => { if (!sounded && Math.hypot(m.clientX - x0, m.clientY - y0) > 6) { sounded = true; clearTimeout(timer); } };
    const end = (cancel: boolean) => {
      clearTimeout(timer);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', off); el.removeEventListener('pointerleave', off);
      rise(el, cancel);
      if (!cancel) { sound(); lastPress = { el, at: performance.now() }; hooks.release?.(); }
    };
    const up = () => end(false), off = () => { sounded = true; end(true); };
    el.addEventListener('pointermove', move, { passive: true }); el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  };
  root.addEventListener('pointerdown', down as EventListener, { passive: true, capture: true });
  return () => root.removeEventListener('pointerdown', down as EventListener, { capture: true });
}

/* ---------- the sky: three cloud layers that drift and part on scroll ---------- */
/** Spec §1 and §4: far, mid and near layers drift on their own sine.inOut timelines (120, 80 and 48 s a
 *  cycle; 6, 10 and 16 px of travel; slower when far) and part by depth on scroll (0.2, 0.5, 1.0 of a
 *  damped share of it). Reduced motion: the sky stays, still. */
export function skyDrift(sky: HTMLElement) {
  const layers = [...sky.querySelectorAll<HTMLElement>('.layer')];
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const CYCLE = [120, 80, 48], TRAVEL = [6, 10, 16], DEPTH = [0.2, 0.5, 1];
    const parts = layers.map((layer, i) => {
      const drift = layer.querySelector<HTMLElement>('.drift') ?? layer, half = CYCLE[i] / 2, a = TRAVEL[i];
      // started part-way through, so the three layers are never in step
      gsap.fromTo(drift, { x: -a / 2 }, { x: a / 2, duration: half, ease: 'sine.inOut', repeat: -1, yoyo: true }).totalTime(half * (0.3 + i * 0.45));
      gsap.fromTo(drift, { y: a / 6 }, { y: -a / 6, duration: half * 0.77, ease: 'sine.inOut', repeat: -1, yoyo: true }).totalTime(half * 0.5);
      return gsap.quickTo(layer, 'y', { duration: 0.6, ease: 'power3' });
    });
    let queued = false;
    const onScroll = () => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const s = Math.min(scrollY * 0.08, innerHeight * 0.18); // the near layer moves at most 18 percent of a screen
        parts.forEach((to, i) => to(-s * DEPTH[i]));
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { removeEventListener('scroll', onScroll); layers.forEach(l => gsap.set([l, l.querySelector('.drift')], { clearProps: TRANSFORM })); };
  });
  return () => mm.revert();
}
/** <Ring p={42} className="ring big">face</Ring>: a .ring whose --p sweeps; `remember` keys the last share shown. */
export function Ring({ p, remember, className = 'ring', children }: { p: number; remember?: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useRing(ref, p, remember);
  return createElement('span', { ref, className }, children);
}
