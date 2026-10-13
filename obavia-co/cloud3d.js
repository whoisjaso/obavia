/* obavia.co: the live 3D clouds (cloud3d-engine.js), wired to the page.
   - The sky: a raymarched cumulus deck in .o-sky (or .cloud-atmosphere), at half resolution, drifting on
     the wall clock, the camera lowered by scroll so the near bank parts faster than the far one.
     Without WebGL2: the Blender sky layers if they are deployed, else the existing cloud-layers.
   - The buttons: [data-cloud3d] (the hero and the nav joins) take the three live volumes; every other
     .cloud button gets the same hover, press, release and landed physics on the sprite or CSS cloud.
     Press and release come through OBV.cloud (site.js), so the touch and rise sounds and the shader
     start in the same call; landed fires when the page the button moved to comes to rest.
   Lazy: nothing starts before the fonts are in and the page is idle; the first paint never waits.
   Reduced motion: the sky is one still frame, the press is an opacity change, hover is a brightness
   change, no wisps or ring; the sounds stay. */
import { createCloud3D } from './cloud3d-engine.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const self = new URL('.', import.meta.url);
const ASSETS = new URL(root.dataset.cloud3dAssets || 'assets/cloud-3d/', self).href;

function boot() {
  const G = window.gsap;
  const OBV = window.OBV || (window.OBV = {});
  const CL = OBV.cloud || (OBV.cloud = { play() {}, press() {}, rise() {}, landed() {} });
  if (!G) return;
  const eng = window.OCLOUD3D = createCloud3D({
    gsap: G, assets: ASSETS,
    sound: { play: (n, g) => CL.play && CL.play(n, g), loop: (n, g) => (CL.loop ? CL.loop(n, g) : { stop() {} }) },
    reduced: () => reduce.matches,
    paused: () => root.classList.contains('motion-paused'),
  });

  // the press helper in site.js hands managed buttons to the engine, in the same call as its sound
  const press0 = CL.press, rise0 = CL.rise, landed0 = CL.landed;
  CL.press = el => (eng.has(el) ? eng.press(el) : press0 && press0(el));
  CL.rise = (el, cancel) => (eng.has(el) ? eng.release(el, cancel) : rise0 && rise0(el, cancel));
  CL.landed = el => {
    if (eng.has(el)) { CL.play('landed'); eng.landed(el); return; }
    if (landed0) landed0(el);
  };

  // the sky
  const host = document.querySelector('.o-sky') || document.querySelector('.cloud-atmosphere');
  if (host) {
    const layer = d => host.querySelector(`.cl-layer.${d} .cl-cloud`);
    const travel = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
    eng.sky(host, {
      before: host.querySelector('.cl-layer') || host.querySelector('.cl-grain'),
      layers: { far: layer('far'), mid: layer('mid'), near: layer('near') },
      lift: () => Math.min(1, scrollY / travel()) * .26,
      rate: 30,
    }).then(sky => {
      if (!sky) return;
      addEventListener('scroll', () => sky.poke(), { passive: true });
    });
  }

  // the buttons: three live volumes at most, the rest on sprites or the CSS cloud
  const live = [...document.querySelectorAll('[data-cloud3d]')];
  document.querySelectorAll('.cloud, [data-cloud3d]').forEach(el => {
    if (el.tagName !== 'BUTTON' && el.tagName !== 'A') return;
    const compact = el.dataset.cloud3d === 'compact';
    if (live.includes(el) && el.offsetWidth) el.style.minWidth = el.offsetWidth + 3 + 'px';   // the tracking widens on hover without moving the page
    eng.attach(el, { live: live.includes(el), top: compact ? .5 : .52, form: true });
    // a button that moves the page lands when the page comes to rest
    const moves = el.dataset.go || (el.getAttribute('href') || '').startsWith('#');
    if (moves) el.addEventListener('click', () => {
      let done = false;
      const land = () => { if (done) return; done = true; removeEventListener('scrollend', land); CL.landed(el); };
      addEventListener('scrollend', land, { once: true });
      setTimeout(land, reduce.matches ? 60 : 1100);
    });
  });
}

const idle = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 200));
const ready = () => Promise.all([
  document.readyState === 'complete' ? null : new Promise(r => addEventListener('load', r, { once: true })),
  document.fonts ? document.fonts.ready.catch(() => null) : null,
]);
ready().then(() => idle(boot));
