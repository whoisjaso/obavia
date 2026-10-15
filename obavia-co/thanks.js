(function () {
  var links = document.querySelectorAll('[data-cal]');
  for (var i = 0; i < links.length; i += 1) {
    links[i].addEventListener('click', function () {
      if (typeof window.obaviaTrack === 'function') window.obaviaTrack('CompleteRegistration');
    });
  }
  var wallet = document.getElementById('wallet');
  if (!wallet || typeof fetch !== 'function') return;
  fetch('/api/wallet', { method: 'HEAD' }).then(function (res) {
    if (res && res.ok) wallet.hidden = false;
  }).catch(function () {});
})();
