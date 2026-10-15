/* Meta Pixel.
   META_PIXEL_ID stays empty until an id exists. Empty is a no-op:
   no fbevents.js, no request, no event.
   When an id is set, obavia-co/_headers must also allow
   script-src https://connect.facebook.net
   img-src https://www.facebook.com
   connect-src https://www.facebook.com https://connect.facebook.net
   The current page policy does not. Leave the id empty until that ships together. */
(function () {
  var META_PIXEL_ID = '';

  function pixelId() {
    return typeof META_PIXEL_ID === 'string' ? META_PIXEL_ID.trim() : '';
  }

  function ensure() {
    var id = pixelId();
    if (!id) return false;
    if (typeof window.fbq === 'function') return true;
    /* Standard loader. Reached only when META_PIXEL_ID is non-empty. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    return true;
  }

  window.obaviaTrack = function (eventName) {
    if (!pixelId() || !eventName) return;
    if (!ensure() || typeof window.fbq !== 'function') return;
    window.fbq('track', eventName);
  };
})();
