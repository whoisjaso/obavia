(function () {
  var link = document.getElementById('cal');
  if (!link) return;
  link.addEventListener('click', function () {
    if (typeof window.obaviaTrack === 'function') window.obaviaTrack('CompleteRegistration');
  });
})();
