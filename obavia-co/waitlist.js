/* Waitlist signup.
   New answer keys leave the browser only when window.OBAVIA_WAITLIST_V2 === true.
   The live Worker returns 422 for any other key. */

const LAUNCH_MS = Date.parse('2027-04-24T05:00:00.000Z');
const CHANNELS = ['phone', 'video', 'both'];
const ROLES = ['ae_closer', 'sdr_setter', 'founder', 'manager'];
const TEAMS = ['1', '2-10', '11-50', '51+'];

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

function buildPayload({ fullName, email, website, sellChannel, role, teamSize, topObjection, search, v2 }) {
  const payload = {
    fullName,
    email: String(email ?? '').trim(),
    website: String(website ?? ''),
  };
  if (v2 !== true) return payload;
  payload.sellChannel = sellChannel;
  payload.role = role;
  payload.teamSize = teamSize;
  if (topObjection) payload.topObjection = topObjection;
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

export { LAUNCH_MS, CHANNELS, ROLES, TEAMS, cleanName, cleanObjection, utmJson, waitlistEndpoint, buildPayload, chicagoLaunchLabel };

if (typeof document !== 'undefined') init();

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
    if (index === 0) {
      if (!CHANNELS.includes(selected('sellChannel'))) {
        say(0, 'Choose where you sell.');
        return false;
      }
    }
    if (index === 1) {
      if (!ROLES.includes(selected('role'))) {
        say(1, 'Choose your role.');
        return false;
      }
      if (!TEAMS.includes(selected('teamSize'))) {
        say(1, 'Choose a team size.');
        return false;
      }
    }
    if (index === 2 && cleanObjection(objection?.value) === null) {
      say(2, 'Keep that to 280 characters.');
      return false;
    }
    if (index === 3) {
      const name = cleanName(document.querySelector('#wlName')?.value);
      const email = document.querySelector('#wlEmail');
      if (!name) {
        say(3, 'Please enter your full name.');
        document.querySelector('#wlName')?.focus();
        return false;
      }
      if (!email?.value.trim() || !email.checkValidity()) {
        say(3, 'Please check your email address.');
        email?.focus();
        return false;
      }
    }
    clearStepError(index);
    return true;
  }

  function paint(index, focus) {
    step = index;
    steps.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
    });
    const onQuestion = index < 3;
    if (kicker) kicker.textContent = onQuestion ? `Question ${index + 1} of 3` : 'Your details';
    if (meter) meter.dataset.on = String(Math.min(index + 1, 3));
    if (focus) {
      const panel = steps[index];
      const legend = panel?.querySelector('legend');
      if (legend) {
        legend.tabIndex = -1;
        legend.focus({ preventScroll: false });
      } else panel?.focus({ preventScroll: false });
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
    if (step < 3) {
      event.preventDefault();
      if (!checkStep(step)) return;
      go(step + 1, 'push');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    for (let index = 0; index <= 3; index += 1) {
      if (!checkStep(index)) {
        if (index !== step) go(index, 'push');
        return;
      }
    }
    if (status) status.textContent = '';
    if (!endpoint) {
      say(3, 'Signups open on obavia.co. This preview doesn’t save them.');
      return;
    }

    const name = cleanName(document.querySelector('#wlName').value);
    const email = document.querySelector('#wlEmail').value.trim();
    const objectionText = cleanObjection(objection?.value);
    const payload = buildPayload({
      fullName: name,
      email,
      website: document.querySelector('#wlSite')?.value ?? '',
      sellChannel: selected('sellChannel'),
      role: selected('role'),
      teamSize: selected('teamSize'),
      topObjection: objectionText || '',
      search: location.search,
      v2: window.OBAVIA_WAITLIST_V2 === true,
    });

    const button = document.querySelector('#wlBtn');
    busy = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Joining…';
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
        if (code === 'invalid_full_name') say(3, 'Please check your full name and try again.');
        else if (code === 'invalid_answers') say(3, 'Please check your answers and try again.');
        else say(3, 'Please check your email address and try again.');
      } else if (response.status === 429) {
        const value = response.headers.get('Retry-After');
        retry = Math.max(1, Number(value) || Math.ceil((Date.parse(value) - Date.now()) / 1000) || 30);
        say(3, `Please wait ${retry} seconds, then try again.`);
      } else say(3, 'We couldn’t save that yet. Please try again.');
    } catch {
      say(3, 'We couldn’t reach the waitlist. Check your connection and try again.');
    } finally {
      clearTimeout(timeout);
      busy = false;
      if (button) button.textContent = 'Join the waitlist';
      if (retry) setTimeout(() => { if (button) button.disabled = false; }, Math.min(retry, 86400) * 1000);
      else if (button) button.disabled = false;
    }
  });
}
