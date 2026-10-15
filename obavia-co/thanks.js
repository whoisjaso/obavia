(function () {
  var links = document.querySelectorAll('[data-cal]');
  for (var i = 0; i < links.length; i += 1) {
    links[i].addEventListener('click', function () {
      if (typeof window.obaviaTrack === 'function') window.obaviaTrack('CompleteRegistration');
    });
  }
  var film = document.getElementById('why');
  if (!film) return;
  var showPoster = function () {
    var poster = film.getAttribute('data-poster');
    if (poster) film.poster = poster;
  };
  if ('IntersectionObserver' in window) {
    var watcher = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      showPoster();
      watcher.disconnect();
    }, { rootMargin: '240px' });
    watcher.observe(film);
  } else showPoster();
})();
