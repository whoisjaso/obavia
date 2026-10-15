/* Soft ticks and a short chime for the funnel. No audio files. */
(function () {
  var KEY = 'obavia-sound';
  var button = document.getElementById('soundToggle');
  if (!button) return;

  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {}

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (err) {}
  var muted = stored === 'off' || (stored !== 'on' && reduced);

  function paint() {
    button.setAttribute('aria-pressed', muted ? 'true' : 'false');
    button.setAttribute('aria-label', muted ? 'Unmute sounds' : 'Mute sounds');
  }
  paint();

  var ctx = null;
  var master = null;
  var lastTick = 0;

  function ensure() {
    if (muted) return null;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = Math.pow(10, -30 / 20);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function envelope(at, peak, attack, release) {
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
    return gain;
  }

  function tick() {
    if (muted) return;
    var now = performance.now();
    if (now - lastTick < 40) return;
    lastTick = now;
    var audio = ensure();
    if (!audio) return;
    var t = audio.currentTime;
    var osc = audio.createOscillator();
    var filter = audio.createBiquadFilter();
    var gain = envelope(t, 1, 0.003, 0.022);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1680, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.02);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  function chime() {
    if (muted) return;
    var audio = ensure();
    if (!audio) return;
    var t = audio.currentTime;
    [523.25, 783.99].forEach(function (freq, index) {
      var start = t + index * 0.045;
      var osc = audio.createOscillator();
      var gain = envelope(start, 0.55, 0.02, 0.2);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  }

  window.obaviaChime = chime;

  document.addEventListener('pointerdown', function () { if (!muted) ensure(); }, true);
  document.addEventListener('keydown', function () { if (!muted) ensure(); }, true);

  document.addEventListener('input', function (event) {
    var el = event.target;
    if (!el || !el.matches || !el.matches('input, textarea')) return;
    if (el.closest('.hp')) return;
    var type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'radio' || type === 'checkbox' || type === 'hidden' || type === 'button' || type === 'submit') return;
    tick();
  });

  button.addEventListener('click', function () {
    muted = !muted;
    try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (err) {}
    paint();
    if (!muted) {
      ensure();
      tick();
    }
  });
})();
