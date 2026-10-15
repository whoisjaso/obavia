(function () {
  var form = document.getElementById('guideForm');
  if (!form) return;
  var status = document.getElementById('guideStatus');
  var ready = document.getElementById('guideReady');
  var lead = document.getElementById('guideLead');
  var button = document.getElementById('guideBtn');
  var origin = location.origin;
  var endpoint = origin === 'https://obavia.co' || origin === 'https://www.obavia.co' ? origin + '/api/waitlist' : null;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = document.getElementById('guideEmail');
    if (!email.value.trim() || !email.checkValidity()) {
      if (status) status.textContent = 'Check your email.';
      email.focus();
      return;
    }
    if (typeof window.obaviaChime === 'function') window.obaviaChime();
    if (!endpoint) {
      if (status) status.textContent = 'The guide opens on obavia.co.';
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 12000);
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      signal: controller.signal,
      body: JSON.stringify({
        email: email.value.trim(),
        website: (document.getElementById('guideSite') || {}).value || '',
      }),
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) {
        return { ok: response.ok, data: data };
      });
    }).then(function (result) {
      if (result.ok && result.data && result.data.status === 'accepted') {
        if (typeof window.obaviaTrack === 'function') window.obaviaTrack('Lead');
        form.hidden = true;
        if (lead) lead.hidden = true;
        if (ready) ready.hidden = false;
        return;
      }
      if (status) status.textContent = 'Check your email.';
    }).catch(function () {
      if (status) status.textContent = 'Check your connection.';
    }).finally(function () {
      clearTimeout(timeout);
      if (button && !form.hidden) {
        button.disabled = false;
        button.textContent = 'Get my FREE guide';
      }
    });
  });
})();
