/* Waitlist signup.
   New answer keys leave the browser only when window.OBAVIA_WAITLIST_V2 === true.
   The live Worker returns 422 for any other key. */

const LAUNCH_MS = Date.parse('2027-04-24T05:00:00.000Z');
const CHANNELS = ['phone', 'video', 'both'];
const KICKERS = ['1 of 6', '2 of 6', '3 of 6', '4 of 6', '5 of 6', '6 of 6'];

function codePoints(value) {
  return Array.from(value).length;
}

function cleanName(value) {
  const name = String(value ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!name || codePoints(name) > 160) return null;
  if (/[\u0000-\u001F\u007F]/u.test(name)) return null;
  return name;
}

function cleanObjection(value) {
  const text = String(value ?? '').normalize('NFC').replace(/[\u0000-\u001F\u007F]/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!text) return '';
  if (codePoints(text) > 280) return null;
  return text;
}

function cleanCalls(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const count = Number(text);
  if (!Number.isInteger(count) || count > 999) return null;
  return count;
}

function cleanPhone(value) {
  const raw = String(value ?? '').trim().replace(/\s+/gu, ' ');
  if (!raw) return '';
  const digits = raw.replace(/\D/gu, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (!/^[+\d][\d\s().-]*$/u.test(raw)) return null;
  return raw;
}

function clampPoints(value, max) {
  const chars = Array.from(String(value ?? ''));
  return chars.length <= max ? String(value ?? '') : chars.slice(0, max).join('');
}

function utmJson(search) {
  const raw = String(search ?? '');
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const utm = {};
  for (const [key, value] of params) {
    if (!/^utm_[a-z0-9_]+$/i.test(key)) continue;
    const clean = String(value).trim();
    if (!clean) continue;
    utm[key.slice(0, 40)] = clean.slice(0, 80);
  }
  const keys = Object.keys(utm);
  if (!keys.length) return undefined;
  let json = JSON.stringify(utm);
  while (json.length > 512 && keys.length) {
    delete utm[keys.pop()];
    json = JSON.stringify(utm);
  }
  if (!Object.keys(utm).length || json.length > 512) return undefined;
  return json;
}

function waitlistEndpoint(origin) {
  if (origin === 'https://obavia.co' || origin === 'https://www.obavia.co') return origin + '/api/waitlist';
  return null;
}

function buildPayload({ fullName, email, website, sellChannel, callsPerWeek, topObjection, phone, search, v2 }) {
  const payload = {
    fullName,
    email: String(email ?? '').trim(),
    website: String(website ?? ''),
  };
  if (v2 !== true) return payload;
  payload.sellChannel = sellChannel;
  payload.callsPerWeek = callsPerWeek;
  if (topObjection) payload.topObjection = topObjection;
  if (phone) payload.phone = phone;
  const utm = utmJson(search || '');
  if (utm) payload.utm = utm;
  return payload;
}

function chicagoLaunchLabel(ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('month')} ${get('day')}, ${get('year')}`;
}

export { LAUNCH_MS, CHANNELS, cleanName, cleanObjection, cleanCalls, cleanPhone, utmJson, waitlistEndpoint, buildPayload, chicagoLaunchLabel };

if (typeof document !== 'undefined') init();

function chime() {
  if (typeof window.obaviaChime === 'function') window.obaviaChime();
}

function init() {
  const form = document.querySelector('#wlForm');
  if (!form) return;

  const steps = [...form.querySelectorAll('[data-step]')];
  const kicker = document.querySelector('#stepKicker');
  const meter = document.querySelector('#meter');
  const status = document.querySelector('#wlStatus');
  const objection = document.querySelector('#wlObjection');
  const objectionCount = document.querySelector('#objCount');
  const endpoint = waitlistEndpoint(location.origin);
  let step = 0;
  let busy = false;

  const clock = document.querySelector('#clock');
  const paintClock = () => {
    if (!clock) return;
    const left = LAUNCH_MS - Date.now();
    if (left <= 0) {
      clock.textContent = 'Early access is open.';
      return;
    }
    const total = Math.floor(left / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    clock.replaceChildren();
    for (const [value, label] of [[days, 'days'], [hours, 'hours'], [minutes, 'min'], [seconds, 'sec']]) {
      const span = document.createElement('span');
      const strong = document.createElement('b');
      strong.textContent = label === 'days' ? String(value) : String(value).padStart(2, '0');
      const small = document.createElement('small');
      small.textContent = label;
      span.append(strong, small);
      clock.append(span);
    }
  };
  paintClock();
  const clockTimer = setInterval(paintClock, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paintClock(); });
  window.addEventListener('pagehide', () => clearInterval(clockTimer));

  const demo = document.querySelector('#demo');
  if (demo) {
    const showPoster = () => {
      const poster = demo.getAttribute('data-poster');
      if (poster) demo.poster = poster;
    };
    if ('IntersectionObserver' in window) {
      const watcher = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        showPoster();
        watcher.disconnect();
      }, { rootMargin: '240px' });
      watcher.observe(demo);
    } else showPoster();
  }

  if (objection && objectionCount) {
    const count = () => {
      const next = clampPoints(objection.value, 280);
      if (next !== objection.value) objection.value = next;
      objectionCount.textContent = String(codePoints(objection.value));
    };
    objection.addEventListener('input', count);
    count();
  }

  function errorBox(index) {
    return steps[index]?.querySelector('.step-error') || null;
  }

  function say(index, message) {
    const box = errorBox(index);
    if (box) box.textContent = message || '';
    else if (status) status.textContent = message || '';
  }

  function clearStepError(index) {
    const box = errorBox(index);
    if (box) box.textContent = '';
  }

  function selected(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  }

  function checkStep(index) {
    if (index === 0 && !CHANNELS.includes(selected('sellChannel'))) {
      say(0, 'Choose one.');
      return false;
    }
    if (index === 1 && cleanCalls(document.querySelector('#wlCalls')?.value) === null) {
      say(1, 'Use a whole number.');
      document.querySelector('#wlCalls')?.focus();
      return false;
    }
    if (index === 2) {
      const text = cleanObjection(objection?.value);
      if (text === null) {
        say(2, '280 characters max.');
        return false;
      }
      if (!text) {
        say(2, 'Name the objection.');
        objection?.focus();
        return false;
      }
    }
    if (index === 3 && !cleanName(document.querySelector('#wlName')?.value)) {
      say(3, 'Add your name.');
      document.querySelector('#wlName')?.focus();
      return false;
    }
    if (index === 4) {
      const email = document.querySelector('#wlEmail');
      if (!email?.value.trim() || !email.checkValidity()) {
        say(4, 'Check your email.');
        email?.focus();
        return false;
      }
    }
    if (index === 5 && cleanPhone(document.querySelector('#wlPhone')?.value) === null) {
      say(5, 'Check the number, or leave it blank.');
      document.querySelector('#wlPhone')?.focus();
      return false;
    }
    clearStepError(index);
    return true;
  }

  function paint(index, focus) {
    step = index;
    steps.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
    });
    if (kicker) kicker.textContent = KICKERS[index] || '';
    const page = document.querySelector('.page');
    const intro = document.querySelector('#intro');
    const trust = document.querySelector('#trust');
    if (page) page.dataset.step = String(index);
    if (intro) intro.hidden = index !== 0;
    if (trust) trust.hidden = index < 4;
    if (meter) {
      meter.hidden = false;
      meter.dataset.on = String(index + 1);
    }
    if (focus) window.scrollTo(0, 0);
    if (focus) {
      const panel = steps[index];
      const field = panel?.querySelector('input:not([tabindex="-1"]), textarea');
      const legend = panel?.querySelector('legend');
      const target = field || legend || panel;
      if (target) {
        if (target === legend) legend.tabIndex = -1;
        target.focus({ preventScroll: false });
      }
    }
  }

  function go(next, historyMode) {
    if (historyMode === 'push') history.pushState({ wlStep: next }, '');
    if (historyMode === 'replace') history.replaceState({ wlStep: next }, '');
    paint(next, historyMode !== 'silent-quiet');
  }

  if (!history.state || typeof history.state.wlStep !== 'number') history.replaceState({ wlStep: 0 }, '');
  paint(0, false);

  window.addEventListener('popstate', (event) => {
    const next = event.state && typeof event.state.wlStep === 'number' ? event.state.wlStep : 0;
    paint(Math.max(0, Math.min(steps.length - 1, next)), true);
  });

  form.addEventListener('click', (event) => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    if (next) {
      event.preventDefault();
      if (!checkStep(step)) return;
      chime();
      if (step === 1 && cleanCalls(document.querySelector('#wlCalls')?.value) === 0) {
        location.assign('/guide');
        return;
      }
      go(step + 1, 'push');
    }
    if (back) {
      event.preventDefault();
      history.back();
    }
  });

  form.addEventListener('input', () => clearStepError(step));

  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.target.matches('textarea')) return;
    if (step < steps.length - 1) {
      event.preventDefault();
      if (!checkStep(step)) return;
      chime();
      if (step === 1 && cleanCalls(document.querySelector('#wlCalls')?.value) === 0) {
        location.assign('/guide');
        return;
      }
      go(step + 1, 'push');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    for (let index = 0; index < steps.length; index += 1) {
      if (!checkStep(index)) {
        if (index !== step) go(index, 'push');
        return;
      }
    }
    chime();
    if (cleanCalls(document.querySelector('#wlCalls')?.value) === 0) {
      location.assign('/guide');
      return;
    }
    if (status) status.textContent = '';
    if (!endpoint) {
      say(steps.length - 1, 'Signups open on obavia.co.');
      return;
    }

    const name = cleanName(document.querySelector('#wlName').value);
    const email = document.querySelector('#wlEmail').value.trim();
    const objectionText = cleanObjection(objection?.value);
    const phone = cleanPhone(document.querySelector('#wlPhone')?.value);
    const last = steps.length - 1;
    const payload = buildPayload({
      fullName: name,
      email,
      website: document.querySelector('#wlSite')?.value ?? '',
      sellChannel: selected('sellChannel'),
      callsPerWeek: cleanCalls(document.querySelector('#wlCalls')?.value),
      topObjection: objectionText || '',
      phone: phone || '',
      search: location.search,
      v2: window.OBAVIA_WAITLIST_V2 === true,
    });

    const button = document.querySelector('#wlBtn');
    busy = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let retry = 0;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.status === 'accepted') {
        if (typeof window.obaviaTrack === 'function') window.obaviaTrack('Lead');
        location.assign('/thanks');
        return;
      }
      if (response.status === 422) {
        const code = data && data.error;
        if (code === 'invalid_full_name') say(last, 'Check your name.');
        else if (code === 'invalid_answers') say(last, 'Check your answers.');
        else say(last, 'Check your email.');
      } else if (response.status === 429) {
        const value = response.headers.get('Retry-After');
        retry = Math.max(1, Number(value) || Math.ceil((Date.parse(value) - Date.now()) / 1000) || 30);
        say(last, `Wait ${retry} seconds.`);
      } else say(last, 'Try again.');
    } catch {
      say(last, 'Check your connection.');
    } finally {
      clearTimeout(timeout);
      busy = false;
      if (button) button.textContent = 'Save my spot + get my FREE guide';
      if (retry) setTimeout(() => { if (button) button.disabled = false; }, Math.min(retry, 86400) * 1000);
      else if (button) button.disabled = false;
    }
  });
}
