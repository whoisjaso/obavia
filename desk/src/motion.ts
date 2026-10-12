/* The Desk's motion, in one place. GSAP is the how; Emil's animate skill
   decided the what (see the survey in the GSAP pass report):
   - a screen's parts settle in, staggered, when a `.enter` section mounts
     (View Transitions still carries the old screen out and the dock across);
   - a figure that changes while you watch counts to its new value;
   - a progress ring sweeps to its new share;
   - Go lands once, on the chime.
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
  if (reduced) { gsap.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'none', overwrite: 'auto', clearProps: 'opacity' }); return; }
  const back = document.documentElement.dataset.dir === 'back';
  gsap.set(parts, { transition: 'none' });
  gsap.fromTo(parts, { opacity: 0, y: back ? -8 : 10, scale: 0.985 },
    { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: EASE, stagger: i => Math.min(i, 4) * stagger, overwrite: 'auto', clearProps: CLEAR });
}
const isPart = (el: Element): el is HTMLElement => el instanceof HTMLElement && !el.matches('.dock') && !el.querySelector('.dock');
/** Every `.enter` section that mounts under root has its parts settled in; a part added to a live
 *  section later (an error line, the lower-the-floor field) settles in alone. One observer, no refs. */
export function watchEnter(root: HTMLElement) {
  const mo = new MutationObserver(recs => {
    const batch = new Map<Element, HTMLElement[]>();
    const add = (sec: Element, els: HTMLElement[]) => { if (els.length) batch.set(sec, [...(batch.get(sec) ?? []), ...els]); };
    for (const r of recs) r.addedNodes.forEach(n => {
      if (!(n instanceof HTMLElement) || !n.isConnected) return;
      if (n.matches('.enter')) add(n, [...n.children].filter(isPart));
      else if (n.parentElement?.matches('.enter') && isPart(n)) add(n.parentElement, [n]);
      n.querySelectorAll('.enter').forEach(s => add(s, [...s.children].filter(isPart)));
    });
    batch.forEach(parts => enter([...new Set(parts)]));
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

/* ---------- land: the Go button's one landed state ---------- */
/** Fired on the same frame as feel.done(): the button settles from its pressed scale. It never moves
 *  off its spot; the label change carries the state when motion is reduced. */
export function land(el: HTMLElement | null) {
  if (!el || reduced) return;
  gsap.set(el, { transition: 'none' });
  gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.45, ease: SPRING, overwrite: 'auto', clearProps: CLEAR });
}
/** <Ring p={42} className="ring big">face</Ring>: a .ring whose --p sweeps; `remember` keys the last share shown. */
export function Ring({ p, remember, className = 'ring', children }: { p: number; remember?: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useRing(ref, p, remember);
  return createElement('span', { ref, className }, children);
}
