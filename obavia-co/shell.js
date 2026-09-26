/* Obavia shell: the mark's entrance, soft page changes, the nav, and a sky
   that keeps drifting from one page to the next. Loaded by every page,
   right after the shell markup. Pages listen for 'o:reveal' and 'o:land'. */
(() => {
'use strict';
const html = document.documentElement, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OS = window.OSHELL = window.OSHELL || { revealed: false, landed: false };
const fire = name => { OS[name === 'o:reveal' ? 'revealed' : 'landed'] = true; dispatchEvent(new Event(name)); };

/* every page opens at the top */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) scrollTo(0, 0);
addEventListener('pageshow', e => { html.classList.remove('o-leaving'); if (e.persisted && !location.hash) scrollTo(0, 0); });

/* the clouds keep time with the clock, so they never jump between pages.
   Each drifts at its own speed in px/s, whatever the screen width. */
const drift = () => {
  const now = Date.now() / 1000, W = innerWidth;
  $$('.o-sky .c').forEach(c => {
    const span = W + c.offsetWidth, sp = +c.dataset.sp || 6, dur = span / sp;
    const p = (((+c.dataset.bx || 0) * span + now * sp) % span) / span;
    c.style.animationDuration = dur + 's'; c.style.animationDelay = -(p * dur) + 's';
  });
};
drift();
let driftT; addEventListener('resize', () => { clearTimeout(driftT); driftT = setTimeout(drift, 200); });

/* sound after the first tap, and a tap you can feel */
const SND = OS.snd = { ac: null, on: false };
const wake = () => { if (SND.on) return; try { SND.ac = new (window.AudioContext || window.webkitAudioContext)(); SND.on = true; } catch (e) {} };
addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);
OS.tone = (f, g = .03, dur = 1.3, at = 0) => {
  if (!SND.on || REDUCED) return;
  const a = SND.ac, t = a.currentTime + .01 + at, o = a.createOscillator(), o2 = a.createOscillator(), v = a.createGain(), v2 = a.createGain();
  o.type = o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.002; v2.gain.value = .16;
  o.connect(v); o2.connect(v2).connect(v); v.connect(a.destination);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .014); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
};
OS.haptic = () => {
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} return; }
  const l = document.createElement('label'), i = document.createElement('input');   // iOS 18+: a native switch ticks
  i.type = 'checkbox'; i.setAttribute('switch', ''); l.appendChild(i);
  l.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(l); l.click(); l.remove();
};

/* ---------- nav ---------- */
const nav = $('#oNav'), menu = $('#oMenu'), sheet = $('#oSheet');
const here = (location.pathname.split('/').pop() || 'index.html');
$$('.o-links a, .o-sheet a').forEach(a => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
const setMenu = open => { menu.setAttribute('aria-expanded', open); sheet.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; };
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 12), { passive: true });
nav.classList.toggle('solid', scrollY > 12);

/* ---------- soft page changes ---------- */
const crossDoc = 'onpagereveal' in window;          // the browser cross-fades documents itself
if (!crossDoc && !REDUCED) html.classList.add('o-fade');
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (a && (a.closest('.o-nav,.o-sheet') || a.classList.contains('btn') || a.classList.contains('more') || a.classList.contains('pill'))) { OS.haptic(); if (!window.OBV) OS.tone(1900, .012, .09); }
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname) {                         // same page: glide to the spot, or to the top
    e.preventDefault(); setMenu(false);
    const el = url.hash && document.getElementById(url.hash.slice(1));
    scrollTo({ top: el ? el.getBoundingClientRect().top + scrollY - 40 : 0, behavior: REDUCED ? 'auto' : 'smooth' });
    return;
  }
  if (crossDoc || REDUCED) return;
  e.preventDefault(); html.classList.add('o-leaving');
  setTimeout(() => { location.href = url.href; }, 380);
});

/* ---------- the entrance ---------- */
const load = $('#oLoad');
if (!html.classList.contains('o-intro') || !load) {
  html.classList.remove('o-intro', 'o-veil');
  const go = () => { fire('o:reveal'); fire('o:land'); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', go) : go();
  return;
}
const logo = $('#oLogo'), ring = logo.querySelector('.ring');
const start = performance.now();
// real progress: the document, the fonts, and the sky
let parts = 0, done = 0;
const step = () => { done++; };
const wait = p => { parts++; p.then(step, step); };
wait(new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
if (document.fonts) wait(document.fonts.ready);
$$('.o-sky img').forEach(img => wait(img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; })));
// the ring follows real loading, but never rushes: it takes at least 1.6s to close
let shown = 0, flown = false;
(function tick(t) {
  const el = t - start, real = parts ? done / parts : 1, cap = Math.min(1, el / 1600), target = el > 4500 ? 1 : Math.min(real, cap);
  shown += (target - shown) * .12; if (target === 1 && shown > .995) shown = 1;
  ring.style.strokeDashoffset = 1 - shown;
  if (shown === 1 && el > 1850 && !flown) { flown = true; fly(); return; }
  requestAnimationFrame(tick);
})(start);

function fly() {
  ring.style.strokeDashoffset = 0;
  logo.classList.add('done', 'pulse');
  setTimeout(() => {
    logo.classList.remove('pulse');
    const a = logo.getBoundingClientRect(), b = $('#oMark').getBoundingClientRect();
    const orb = a.width * .6;                                            // the orb is 60% of the drawing
    const k = b.width / orb;
    logo.style.transition = 'transform 1.2s cubic-bezier(.65,0,.25,1)';
    logo.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px,${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${k})`;
    setTimeout(() => load.classList.add('out'), 120);
    setTimeout(() => { html.classList.remove('o-veil'); fire('o:reveal'); }, 520);
    setTimeout(() => {
      html.classList.remove('o-intro'); load.remove(); fire('o:land');
    }, 1260);
  }, 480);
}
})();
