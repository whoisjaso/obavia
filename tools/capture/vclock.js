// The capture clock. Installed before any page script. Until freeze() the page runs on real time;
// after it, time only moves when step(dt) is called: Date.now, performance.now, setTimeout,
// setInterval and requestAnimationFrame (so GSAP, the WebGL clouds and every JS timeline) and every
// CSS animation and transition (paused and advanced by hand). A slow software GPU then still yields
// exact frames: frame N shows the page at exactly its time, however long it took to draw.
(() => {
  if (window.__vclock) return;
  const P = performance, N = {
    now: P.now.bind(P), dnow: Date.now.bind(Date), st: setTimeout.bind(window), ct: clearTimeout.bind(window),
    raf: requestAnimationFrame.bind(window), caf: cancelAnimationFrame.bind(window),
  };
  let frozen = false, vnow = 0;
  const now = () => (frozen ? vnow : N.now());
  const dOff = N.dnow() - N.now();
  P.now = now;
  Date.now = () => (frozen ? Math.round(dOff + vnow) : N.dnow());

  let ids = 1;
  const timers = new Map(), frames = new Map();
  const run = t => { if (typeof t.fn === 'function') { try { t.fn(...t.args); } catch (e) { setTimeout(() => { throw e; }); } } };
  const arm = (id, t) => { if (!frozen) t.nid = N.st(() => fire(id), Math.max(0, t.at - N.now())); };
  const fire = id => { const t = timers.get(id); if (!t) return; if (t.every) { t.at += t.every; arm(id, t); } else timers.delete(id); run(t); };
  window.setTimeout = (fn, ms = 0, ...args) => { const id = ids++, t = { at: now() + Math.max(0, +ms || 0), fn, args, every: 0 }; timers.set(id, t); arm(id, t); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = ids++, e = Math.max(1, +ms || 0), t = { at: now() + e, fn, args, every: e }; timers.set(id, t); arm(id, t); return id; };
  window.clearTimeout = window.clearInterval = id => { const t = timers.get(id); if (t) { if (t.nid) N.ct(t.nid); timers.delete(id); } };
  window.requestAnimationFrame = cb => { const id = ids++, f = { cb }; frames.set(id, f); if (!frozen) f.nid = N.raf(ts => { frames.delete(id); cb(ts); }); return id; };
  window.cancelAnimationFrame = id => { const f = frames.get(id); if (f) { if (f.nid) N.caf(f.nid); frames.delete(id); } };

  const seen = new WeakSet();
  const anims = () => { try { return document.getAnimations(); } catch { return []; } };
  window.__vclock = {
    get frozen() { return frozen; },
    now,
    freeze() {
      if (frozen) return now();
      vnow = N.now(); frozen = true;
      for (const t of timers.values()) if (t.nid) { N.ct(t.nid); t.nid = 0; }
      for (const f of frames.values()) if (f.nid) { N.caf(f.nid); f.nid = 0; }
      for (const a of anims()) { a.pause(); seen.add(a); }
      return vnow;
    },
    /** Advance by dt ms: timers in order, then one animation frame, then CSS animations. */
    step(dt) {
      const before = anims();
      const end = vnow + dt;
      for (;;) {
        let id = null, at = Infinity;
        for (const [k, t] of timers) if (t.at <= end && t.at < at) { at = t.at; id = k; }
        if (id === null) break;
        vnow = Math.max(vnow, at);
        const t = timers.get(id); if (t.every) t.at += t.every; else timers.delete(id); run(t);
      }
      vnow = end;
      const due = [...frames.values()]; frames.clear();
      for (const f of due) { try { f.cb(vnow); } catch (e) { N.st(() => { throw e; }); } }
      // CSS: what ran before this step advances by dt; what started during it is pinned at its start
      for (const a of before) { if (!seen.has(a)) { a.pause(); seen.add(a); } if (a.playState !== 'finished') a.currentTime = (a.currentTime || 0) + dt; }
      for (const a of anims()) if (!seen.has(a)) { a.pause(); a.currentTime = 0; seen.add(a); }
      return vnow;
    },
    /** One real compositor frame, so scroll and pointer events the browser queued get dispatched. */
    nativeFrame: () => new Promise(r => N.raf(() => N.st(r, 0))),
    pinNew() { for (const a of anims()) if (!seen.has(a)) { a.pause(); a.currentTime = 0; seen.add(a); } },
  };
})();
