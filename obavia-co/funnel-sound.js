/* Soft ticks, button clicks, and a short chime for the funnel. No audio files. */
(function () {
  var ctx = null;
  var master = null;
  var lastTick = 0;
  var choiceFromClick = false;

  function ensure() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      // iOS keeps the default ambient session, so the silent switch still mutes these.
      try {
        if (navigator.audioSession && navigator.audioSession.type !== 'ambient') {
          navigator.audioSession.type = 'ambient';
        }
      } catch (err) {}
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

  function tap() {
    var audio = ensure();
    if (!audio) return;
    var t = audio.currentTime;
    var osc = audio.createOscillator();
    var gain = envelope(t, 0.65, 0.001, 0.014);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.012);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.028);
  }

  function chime() {
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

  document.addEventListener('pointerdown', function () { ensure(); }, true);
  document.addEventListener('keydown', function () { ensure(); }, true);

  document.addEventListener('click', function (event) {
    var el = event.target;
    if (!el || !el.closest) return;
    var choice = el.closest('.choice');
    if (!choice && !el.closest('button, a.btn')) return;
    if (choice) choiceFromClick = true;
    tap();
  }, true);

  document.addEventListener('click', function () {
    setTimeout(function () { choiceFromClick = false; }, 0);
  }, true);

  document.addEventListener('change', function (event) {
    var el = event.target;
    if (!el || !el.closest || !el.closest('.choice') || choiceFromClick) return;
    tap();
  });

  document.addEventListener('input', function (event) {
    var el = event.target;
    if (!el || !el.matches || !el.matches('input, textarea')) return;
    if (el.closest('.hp')) return;
    var type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'radio' || type === 'checkbox' || type === 'hidden' || type === 'button' || type === 'submit') return;
    tick();
  });
})();
