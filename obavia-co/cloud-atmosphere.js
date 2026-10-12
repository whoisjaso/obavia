/* The sky: three volumetric cloud layers (far, mid, near) plus grain.
   Spec: docs/design/cloud-system.md sections 1 and 4. Layers come from
   tools/cloud-layers (assets/cloud-layers), served from sky/clouds.

   Drift: each layer's cloud moves 4 to 16 px on its own GSAP sine.inOut
   cycle (120 / 80 / 48 s), read from the wall clock so the sky does not
   jump between pages. A 10 Hz timer sets the tweens' time: no RAF loop of
   our own, and nothing renders while the tab is hidden.
   Depth: one ScrollTrigger scrubs each layer by 0.2 / 0.5 / 1.0 of a
   bounded travel (transform only). Native scroll stays the source of truth.
   Reduced motion: drift stops and parallax is off (gsap.matchMedia).
   Works as a classic or a module script; loads the vendored GSAP if the
   page has not. */
(() => {
'use strict';
if (window.OCLOUDSKY) return;
const root = document.documentElement;
const SKY = window.OCLOUDSKY = { ready: false };
const self = document.querySelector('script[src*="cloud-atmosphere.js"]');
const base = new URL('.', self ? self.src : location.href);

// far / mid / near: parallax factor, drift cycle (s), drift travel (px, x and y)
const DEPTH = [['far', .2, 120, 6, 3], ['mid', .5, 80, 10, 4], ['near', 1, 48, 16, 6]];
const LAYERS = DEPTH.map(([d]) => `<div class="cl-layer ${d}"><i class="cl-cloud"></i></div>`).join('') + '<i class="cl-grain"></i>';

function host() {
  let el = document.querySelector('.o-sky');
  if (!el) {                                    // editorial pages: their own fixed atmosphere
    el = document.createElement('div');
    el.className = 'cloud-atmosphere';
    el.setAttribute('aria-hidden', 'true');
    document.body.prepend(el);
  }
  if (!el.querySelector('.cl-layer')) el.insertAdjacentHTML('beforeend', LAYERS);
  return el;
}

const script = src => new Promise((ok, no) => {
  const s = document.createElement('script'); s.src = new URL(src, base).href; s.onload = ok; s.onerror = no; document.head.appendChild(s);
});
const gsapReady = () => (window.gsap && window.ScrollTrigger)
  ? Promise.resolve()
  : (window.gsap ? Promise.resolve() : script('assets/vendor/gsap/gsap.min.js'))
      .then(() => window.ScrollTrigger || script('assets/vendor/gsap/ScrollTrigger.min.js'));

function start(sky) {
  const G = window.gsap, ST = window.ScrollTrigger;
  G.registerPlugin(ST);
  const layers = DEPTH.map(([d, f, cycle, ax, ay]) => ({ el: sky.querySelector(`.cl-layer.${d}`), f, cycle, ax, ay })).filter(l => l.el);
  const mm = G.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // drift: paused tweens, stepped from the wall clock
    const drift = layers.map(({ el, cycle, ax, ay }) => G.fromTo(el.firstElementChild,
      { x: -ax / 2, y: ay / 2 }, { x: ax / 2, y: -ay / 2, duration: cycle / 2, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true }));
    let timer = 0;
    const paused = () => document.hidden || root.classList.contains('motion-paused');
    const step = () => { const now = Date.now() / 1000; drift.forEach(t => t.totalTime(now % (t.duration() * 2))); };
    const run = () => { clearInterval(timer); timer = 0; if (!paused()) { step(); timer = setInterval(step, 100); } };
    document.addEventListener('visibilitychange', run);
    const watch = new MutationObserver(run); watch.observe(root, { attributes: true, attributeFilter: ['class'] });
    run();
    // depth: near moves a full travel over the page, mid half, far a fifth
    const travel = () => Math.min(140, innerHeight * .16);
    layers.forEach(({ el, f }) => G.fromTo(el, { y: 0 }, {
      y: () => -travel() * f, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: true, invalidateOnRefresh: true },
    }));
    return () => {                                  // reduced motion switched on: everything comes to rest
      clearInterval(timer); watch.disconnect(); document.removeEventListener('visibilitychange', run);
      drift.forEach(t => t.kill()); layers.forEach(({ el }) => G.set([el, el.firstElementChild], { clearProps: 'transform' }));
    };
  });
  SKY.ready = true;
}

const boot = () => {
  const sky = host();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && !window.gsap) return;   // still sky, no library needed
  gsapReady().then(() => start(sky)).catch(() => {});                                   // without GSAP the layers simply rest
};
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', boot, { once: true }) : boot();

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const paused = () => reduce.matches || root.classList.contains('motion-paused');
// Index already owns its section/hero choreography. Match its quiet fade on
// editorial routes; every section is visible by default if JS fails.
if (document.body.matches('.editorial-page,.setup-page')) {
  const animations = new Set();
  const animate = target => {
    if (paused()) return;
    const animation = target.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    animation.finished.finally(() => animations.delete(animation)).catch(() => {});
  };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animate(entry.target);
    observer.unobserve(entry.target);
  }), { threshold: .08 });
  document.querySelectorAll('.editorial-intro,.editorial-row,.setup-main>aside,.setup-form').forEach(element => observer.observe(element));
  reduce.addEventListener('change', () => { if (reduce.matches) animations.forEach(animation => animation.cancel()); });
}
})();
