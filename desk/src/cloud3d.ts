/* The Desk's live 3D clouds (cloud3d-engine.js, shared byte-for-byte with obavia.co).
   - The sky: a raymarched cumulus deck inside <Sky>, half resolution, drifting on the wall clock. It
     runs at 30 fps on the first screens (Sales home, Lane) and drops to 6 fps elsewhere, so a page
     change never changes the sky and the paperwork screens cost almost nothing.
   - The buttons: every .btn.primary (the dock's included) is a small cloud volume, three live at most;
     the rest fall back to the Blender sprites, then the CSS cloud. motion.ts hands press, release and
     landed to the engine in the same call as feel.touch / feel.rise / feel.done.
   Nothing starts before the fonts are in and the Desk is idle. Reduced motion: a still sky, presses as
   opacity, hover as brightness, no wisps or ring; sounds stay. */
import { gsap } from 'gsap';
import { createCloud3D, type Cloud3D, type CloudSound } from './cloud3d-engine.js';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let eng: Cloud3D | null = null;
let sound: CloudSound = {};
const engine = () => {
  if (eng) return eng;
  eng = createCloud3D({
    gsap, assets: './cloud-3d/', reduced,
    sound: { play: (n, g) => sound.play?.(n, g), loop: (n, g) => sound.loop?.(n, g) ?? { stop() { /* silent */ } } },
  });
  (window as Window & { OCLOUD3D?: Cloud3D }).OCLOUD3D = eng; // the same handle obavia.co exposes: stats and modes for the capture runs
  return eng;
};
/** ui.tsx hands the cloud kit over once, from main.tsx. */
export const setCloudSound = (s: CloudSound) => { sound = s; };

/** The calls motion.ts makes; each is a no-op for a control the engine does not hold. */
export const cloud3d = {
  has: (el: Element) => !!eng && eng.has(el),
  press: (el: HTMLElement) => { eng?.press(el); },
  release: (el: HTMLElement, cancel: boolean) => { eng?.release(el, cancel); },
  landed: (el: HTMLElement) => { eng?.landed(el); },
};

const whenIdle = (cb: () => void) => {
  const go = () => ((window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200)))(cb, { timeout: 1500 });
  const fonts = document.fonts ? document.fonts.ready.catch(() => undefined) : Promise.resolve();
  const load = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>(r => addEventListener('load', () => r(), { once: true }));
  void Promise.all([fonts, load]).then(go);
};
const first = () => { const h = location.hash.slice(1) || '/'; return h === '/' || h === '/auction'; };

/** The Blender sky layers (public/cloud-3d/sky/light) in place of the cloud-layers set, at once and without WebGL;
    the set in src/sky stays as the last fallback. */
export function blenderSky(host: HTMLElement): void {
  const layer = (d: string) => host.querySelector<HTMLElement>(`.layer.${d} .drift`);
  host.classList.add('c3d-sky-wait');
  void engine().skySprites({ far: layer('far'), mid: layer('mid'), near: layer('near') }, host)
    .finally(() => host.classList.remove('c3d-sky-wait'));
}

/** The live sky inside <Sky>; returns a cleanup. */
export function startSky(host: HTMLElement): () => void {
  let stop = () => { /* not started */ };
  let alive = true;
  whenIdle(() => {
    if (!alive) return;
    const layer = (d: string) => host.querySelector<HTMLElement>(`.layer.${d} .drift`);
    void engine().sky(host, {
      before: host.querySelector('.layer'),
      layers: { far: layer('far'), mid: layer('mid'), near: layer('near') },
      lift: () => Math.min(1, scrollY / Math.max(1, innerHeight * 2)) * .2,
      rate: first() ? 30 : 6,
    }).then(sky => {
      if (!sky) return;
      if (!alive) { sky.destroy(); return; }
      const poke = () => sky.poke();
      const route = () => sky.setRate(first() ? 30 : 6);
      addEventListener('scroll', poke, { passive: true }); addEventListener('hashchange', route);
      stop = () => { removeEventListener('scroll', poke); removeEventListener('hashchange', route); sky.destroy(); };
    });
  });
  return () => { alive = false; stop(); };
}

/** How far a dock button's crowns rise above its box, in button heights (the engine's `top`). */
export const DOCK_CROWN = .7;

/** Every .btn.primary under root becomes a cloud as it mounts; React re-renders never strip it. */
export function watchButtons(root: HTMLElement): () => void {
  const SEL = '.btn.primary';
  let mo: MutationObserver | null = null, alive = true;
  const add = (el: HTMLElement, form: boolean) => { engine().attach(el, { live: true, top: el.closest('.dock') ? DOCK_CROWN : .62, form }); };
  whenIdle(() => {
    if (!alive) return;
    const e = engine();
    root.querySelectorAll<HTMLElement>(SEL).forEach(el => add(el, true));
    mo = new MutationObserver(recs => {
      for (const r of recs) {
        r.addedNodes.forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches(SEL)) add(n, false);
          n.querySelectorAll<HTMLElement>(SEL).forEach(el => add(el, false));
        });
        if (r.target instanceof HTMLElement && e.has(r.target)) e.heal(r.target);
        if (r.removedNodes.length) {
          const gone: HTMLElement[] = [];
          e.each(b => { if (!b.el.isConnected) gone.push(b.el); });
          gone.forEach(el => e.detach(el));
        }
      }
    });
    mo.observe(root, { childList: true, subtree: true });
  });
  return () => { alive = false; mo?.disconnect(); };
}

/* The dock's cloud height, measured (legibility-audit D3): from the top of the dock button's crowns, or the dock's
   own top if that is higher, to the dock's bottom, the safe area included. Written to --dock-cloud on the root;
   every page with a dock pads its foot by it plus 16 px (styles.css), so the last row is never under the cloud.
   Measured when the page's tree changes and when the dock resizes, once per frame at most; written only on a change. */
export function watchDock(root: HTMLElement): () => void {
  const doc = document.documentElement;
  let last = -1, raf = 0, seen: Element | null = null;
  const ro = new ResizeObserver(() => soon());
  const measure = () => {
    raf = 0;
    const dock = root.querySelector<HTMLElement>('.dock');
    if (dock !== seen) { if (seen) ro.unobserve(seen); if (dock) ro.observe(dock); seen = dock; }
    if (!dock) return;
    const d = dock.getBoundingClientRect();
    let top = d.top;
    const btn = dock.querySelector<HTMLElement>('.btn.primary');
    if (btn) { const b = btn.getBoundingClientRect(); if (b.height) top = Math.min(top, b.top - DOCK_CROWN * b.height); }
    const h = Math.ceil(d.bottom - top);
    if (h > 0 && h !== last) { last = h; doc.style.setProperty('--dock-cloud', `${h}px`); }
  };
  const soon = () => { if (!raf) raf = requestAnimationFrame(measure); };
  const mo = new MutationObserver(soon);
  mo.observe(root, { childList: true, subtree: true });
  addEventListener('resize', soon);
  soon();
  return () => { mo.disconnect(); ro.disconnect(); removeEventListener('resize', soon); if (raf) cancelAnimationFrame(raf); };
}
