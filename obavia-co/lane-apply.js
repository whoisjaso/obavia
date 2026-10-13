/* The dealer application on obavia.co (docs/plan/growth/application.md).
   One question per page; the answer is the next tap; the submit screen is
   the key screen (plan CF7). Progress is a thin line. Pages settle in on
   GSAP (cloud-system.md section 4), opacity only under reduced motion.

   Endpoint: POST /api/waitlist on obavia.co, the same one the waitlist uses.
   The worker (deploy/site/live-worker.js, handleWaitlist) accepts only
   {fullName, email, website} today. The body shapes this page sends, and
   what it does until the worker accepts them, are listed in the comment
   above <section id="apply"> in index.html and in the form's data-backend. */
(() => {
'use strict';
const form = document.getElementById('ap');
if (!form) return;
const $ = id => document.getElementById(id);
const pages = [...form.querySelectorAll('.ap-p')];
const P = k => pages.find(p => p.dataset.p === String(k));
const ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const G = window.gsap;
const LIVE = ['https://obavia.co', 'https://www.obavia.co'].includes(location.origin) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const ENDPOINT = LIVE ? new URL(form.dataset.endpoint || '/api/waitlist', location.origin).href : null;
const cloud = () => window.OBV && OBV.cloud;
const line = $('apLine'), back = $('apBack');

const A = { v: 1 };                 // the answers
let cur = '1', hist = [];
const caps = { lookup: null };      // null: not yet known; false: the worker does not take it yet
let match = null;                   // {name, city, phoneLast4} from the TxDMV lookup

if (!ENDPOINT) $('apNote').textContent = 'Preview copy of the page. Answers here are not sent anywhere.';

/* every page logs a view and an advance, with no identity (application.md rules) */
const log = (event, page) => {
  const detail = { event, page: String(page) };
  dispatchEvent(new CustomEvent('obavia:apply', { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'apply_' + event, page: detail.page });
};

async function post(body, ms = 12000) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', signal: ctl.signal, body: JSON.stringify(body) });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data: data || {}, headers: r.headers };
  } catch (e) { return { ok: false, status: 0, data: {}, headers: null }; }
  finally { clearTimeout(to); }
}

/* ---------- moving between pages ---------- */
function show(k, dir = 1) {
  const from = P(cur), to = P(k);
  if (!to || from === to) return;
  from.hidden = true; to.hidden = false; cur = String(k);
  const i = ORDER.indexOf(cur);
  if (i >= 0) { line.removeAttribute('data-off'); line.style.setProperty('--k', (i + 1) / ORDER.length); line.setAttribute('aria-valuenow', i + 1); }
  else if (cur === 'stop') line.setAttribute('data-off', '');
  else line.style.setProperty('--k', 1);
  const canBack = hist.length > 0 && cur !== 'key' && cur !== 'in';
  back.setAttribute('aria-hidden', String(!canBack)); back.tabIndex = canBack ? 0 : -1;
  if (G) {
    if (still()) G.fromTo(to, { opacity: 0 }, { opacity: 1, duration: .18, ease: 'none', clearProps: 'opacity' });
    else G.fromTo(to, { opacity: 0, y: dir > 0 ? 10 : -10 }, { opacity: 1, y: 0, duration: .42, ease: 'expo.out', clearProps: 'opacity,transform' });
  }
  const input = to.querySelector('input:not([tabindex="-1"])');
  (input || to.querySelector('.ap-q')).focus({ preventScroll: true });
  const top = form.getBoundingClientRect().top;
  if (top < 60) scrollTo({ top: scrollY + top - 72, behavior: still() ? 'auto' : 'smooth' });
  if (cloud()) cloud().play('settle', .7);
  log('view', cur);
}
const go = k => { hist.push(cur); log('advance', cur); show(k, 1); };
back.addEventListener('click', () => { if (!hist.length) return; show(hist.pop(), -1); });
log('view', '1');

/* ---------- choice pages: the answer is the next tap ---------- */
const NEXT = { 2: '3', 3: '4', 4: '5' };
form.querySelectorAll('.ap-choice').forEach(b => b.addEventListener('click', () => {
  const page = b.closest('.ap-p'), n = page.dataset.p;
  page.querySelectorAll('.ap-choice').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  A[page.dataset.key] = b.dataset.v;
  if (n === '1') go(b.dataset.v === 'yes' ? '2' : 'stop');
  else go(NEXT[n]);
}));

/* Enter moves on from a typed field, as the page's own button would */
form.addEventListener('submit', e => e.preventDefault());
form.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.matches('input')) return;
  e.preventDefault();
  const btn = e.target.closest('.ap-p').querySelector('[data-next]');
  if (btn && !btn.disabled) btn.click();
});
const say = (el, t) => { el.textContent = t; const inp = el.closest('.ap-p').querySelector('input'); if (inp) inp.setAttribute('aria-invalid', String(!!t)); };
const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };
const nextBtn = k => P(k).querySelector('[data-next]');

/* ---------- page 5: the losing car (140 characters, required) ---------- */
const car = $('apCar'), carErr = $('apCarErr'), carCount = $('apCarCount');
car.addEventListener('input', () => {
  const n = [...car.value].length;
  carCount.textContent = n >= 100 ? `${140 - n} left` : '';
  if (carErr.textContent) say(carErr, '');
});
nextBtn(5).addEventListener('click', () => {
  const v = car.value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!v) { say(carErr, 'Name the car, even roughly.'); car.focus(); return; }
  A.losingCar = v.slice(0, 140); go('6');
});

/* ---------- page 6: the GDN number, checked against the TxDMV list ---------- */
const gdn = $('apGdn'), gdnLine = $('apGdnMatch'), gdnBtn = nextBtn(6);
const norm = s => { const t = s.toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^\d/.test(t) ? 'P' + t : t; };
const shaped = s => /^P\d{5,7}[A-Z]{0,2}$/.test(s);
let seq = 0, gdnT;
const gdnState = (text, cls) => { gdnLine.textContent = text; gdnLine.className = 'ap-match' + (cls ? ' ' + cls : ''); };
function fallbackGdn(n) {          // the worker cannot look numbers up yet: shape only, said plainly
  gdnBtn.textContent = 'Continue';
  gdnBtn.disabled = !shaped(n);
  gdnState(shaped(n) ? 'We check this number against the TxDMV list before a key issues.' : (n.length >= 8 ? 'That doesn’t look like a GDN number.' : ''), 'note');
}
gdn.addEventListener('input', () => {
  const n = norm(gdn.value), my = ++seq;
  match = null; gdnBtn.disabled = true; clearTimeout(gdnT);
  if (!ENDPOINT || caps.lookup === false) return fallbackGdn(n);
  gdnBtn.textContent = 'That’s us';
  if (!shaped(n)) { gdnState(n.length >= 8 ? 'We can’t find that number on the TxDMV list.' : '', n.length >= 8 ? 'miss' : ''); return; }
  gdnState('');
  gdnT = setTimeout(async () => {
    const r = await post({ step: 'lookup', gdn: n }, 8000);
    if (my !== seq) return;
    if (r.ok && r.data.status === 'match' && r.data.name) {
      caps.lookup = true; match = { name: r.data.name, city: r.data.city || '', phoneLast4: r.data.phoneLast4 || '' };
      gdnState(match.city ? `${match.name}, ${match.city}` : match.name); gdnBtn.disabled = false;
    } else if (r.ok && r.data.status === 'no_match') { caps.lookup = true; gdnState('We can’t find that number on the TxDMV list.', 'miss'); }
    else { caps.lookup = false; fallbackGdn(n); }
  }, 350);
});
gdnBtn.addEventListener('click', () => {
  const n = norm(gdn.value);
  if (!shaped(n) || (caps.lookup && !match)) return;
  A.gdn = n; A.dealerName = match ? match.name : ''; A.dealerCity = match ? match.city : '';
  go('7');
});

/* ---------- page 7: the name, first and last in one field ---------- */
const nm = $('apName'), nmErr = $('apNameErr'), nmBtn = nextBtn(7);
nm.addEventListener('input', () => { if (nmErr.textContent) say(nmErr, ''); });
nmBtn.addEventListener('click', async () => {
  const v = nm.value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!/^\S+\s+\S+/u.test(v) || [...v].length > 160) { say(nmErr, 'Please enter your first and last name.'); nm.focus(); return; }
  A.fullName = v;
  // the code page needs a TxDMV match and a worker that can text the license phone
  if (!ENDPOINT || !caps.lookup || !match) { A.phoneVerified = false; go('9'); return; }
  busy(nmBtn, true, 'One moment');
  const r = await post({ step: 'code', gdn: A.gdn });
  busy(nmBtn, false, 'Continue');
  if (r.ok && r.data.status === 'code_sent') {
    $('apLast4').textContent = r.data.phoneLast4 || match.phoneLast4;
    armAgain(); go('8');
  } else { A.phoneVerified = false; go('9'); }
});

/* ---------- page 8: the code, texted to the phone on the license ---------- */
const code = $('apCode'), codeErr = $('apCodeErr'), codeBtn = nextBtn(8), again = $('apAgain');
let againT;
function armAgain() { again.hidden = true; clearTimeout(againT); againT = setTimeout(() => { again.hidden = false; }, 30000); }
code.addEventListener('input', () => {
  const d = code.value.replace(/\D/g, '').slice(0, 6);
  if (d !== code.value) code.value = d;
  codeBtn.disabled = d.length !== 6;
  if (codeErr.textContent) say(codeErr, '');
  if (d.length === 6 && !codeBtn.dataset.busy) codeBtn.click();     // the code field's autofill moves straight on
});
codeBtn.addEventListener('click', async () => {
  if (code.value.length !== 6 || codeBtn.dataset.busy) return;
  codeBtn.dataset.busy = '1'; busy(codeBtn, true, 'Checking');
  const r = await post({ step: 'verify', gdn: A.gdn, code: code.value });
  delete codeBtn.dataset.busy; busy(codeBtn, false, 'Continue');
  if (r.ok && r.data.status === 'verified') { A.phoneVerified = true; go('9'); }
  else if (r.ok && r.data.status === 'wrong_code') { say(codeErr, 'That code doesn’t match. Check the text and try again.'); code.select(); }
  else say(codeErr, 'We couldn’t check that code. Please try again.');
});
again.addEventListener('click', async () => {
  armAgain(); say(codeErr, '');
  const r = await post({ step: 'code', gdn: A.gdn });
  if (!(r.ok && r.data.status === 'code_sent')) say(codeErr, 'We couldn’t send it again. Please try again in a minute.');
});

/* ---------- page 9: the email, then submit ---------- */
const em = $('apEmail'), emErr = $('apEmailErr'), emBtn = nextBtn(9);
const emailOk = v => /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(v) && v.length <= 254 && !/^\.|\.\.|\.@/.test(v);
em.addEventListener('input', () => { if (emErr.textContent) say(emErr, ''); });
let sending = false;
emBtn.addEventListener('click', async () => {
  const v = em.value.trim();
  if (!emailOk(v)) { say(emErr, 'Please check your email address.'); em.focus(); return; }
  A.email = v;
  if (sending) return;
  if (!ENDPOINT) {                  // preview hosts: nothing is sent
    P('in').querySelector('.ap-q').textContent = 'Preview. Nothing was sent.';
    $('apInText').textContent = 'On obavia.co, this is the screen where your key appears.';
    hist = []; log('advance', '9'); show('in'); return;
  }
  sending = true; busy(emBtn, true, 'Sending');
  const website = $('apSite').value;
  const application = { v: 1, gdnHeld: A.gdnHeld, lotSize: A.lotSize, agedOver60: A.agedOver60, floorplan: A.floorplan,
    losingCar: A.losingCar, gdn: A.gdn, dealerName: A.dealerName, dealerCity: A.dealerCity, phoneVerified: !!A.phoneVerified };
  let r = await post({ step: 'apply', fullName: A.fullName, email: v, website, application });
  // today's worker refuses unknown keys with 422 invalid_email; resend the waitlist body so the person still lands on the list
  if (r.status === 422 && r.data.error === 'invalid_email') r = await post({ fullName: A.fullName, email: v, website });
  sending = false; busy(emBtn, false, 'Apply');
  if (r.ok && r.data.status === 'accepted') {
    if (typeof window.fbq === 'function') window.fbq('track', 'Lead');      // AD1: submit fires Lead
    hist = []; log('advance', '9');
    if (typeof r.data.key === 'string' && r.data.key) {
      showKey(r.data.key);
      const first = A.losingCar.split(/[,;(]/)[0].trim().replace(/[.\s]+$/, '');
      $('apStart').textContent = first ? `Start with your ${first}.` : '';
      show('key');
    } else show('in');
    if (cloud()) cloud().landed(form);
    return;
  }
  if (r.status === 422) say(emErr, r.data.error === 'invalid_full_name' ? 'Please go back and check your name.' : 'Please check your email address.');
  else if (r.status === 429) {
    const h = r.headers && r.headers.get('Retry-After'), s = Math.max(1, Number(h) || Math.ceil((Date.parse(h) - Date.now()) / 1000) || 30);
    say(emErr, `Please wait ${s} seconds, then try again.`);
  } else if (r.status === 0) say(emErr, 'We couldn’t reach Obavia. Check your connection and try again.');
  else say(emErr, 'We couldn’t send that yet. Please try again.');
});

/* ---------- the key (legibility audit D2) ----------
   Two pieces: the key, its first and last four in Bodoni with the middle hidden, and the one verb.
   Open The Desk is a link to the Desk with the key in the fragment (#/auction/setup?key=...): a fragment
   is never sent to a server, so it is in no request line or log; the Desk stores it, takes it out of the
   address bar and lands on Let It Go. Copy Key, faint, is for a dealer opening the Desk on another device. */
let theKey = '';
const DESK = form.dataset.desk || '';
function showKey(k) {
  theKey = k;
  $('apKeyHead').textContent = k.slice(0, 4);
  $('apKeyTail').textContent = k.length > 8 ? k.slice(-4) : '';
  const open = $('apOpen');
  if (DESK) open.href = new URL(DESK).origin + new URL(DESK).pathname + '#/auction/setup?key=' + encodeURIComponent(k);
  else open.hidden = true;           // no Desk address on this build: Copy Key is the only way across
}
$('apCopy').addEventListener('click', async e => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(theKey); btn.textContent = 'Copied'; }
  catch (err) {                      // no clipboard API (an http preview, an old browser): the textarea copy, then a box to copy from
    const t = document.createElement('textarea'); t.value = theKey; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
    if (ok) btn.textContent = 'Copied'; else window.prompt('Your key', theKey);
  }
  setTimeout(() => { btn.textContent = 'Copy Key'; }, 2400);
});

/* ---------- "Get on the lane": bring the application up, on the page it is on ---------- */
document.querySelectorAll('[data-go="apply"]').forEach(b => b.addEventListener('click', () => {
  const sec = $('apply'), y = sec.getBoundingClientRect().top + scrollY - 56;
  scrollTo({ top: y, behavior: still() ? 'auto' : 'smooth' });
  setTimeout(() => { const q = P(cur).querySelector('.ap-q'); if (q) q.focus({ preventScroll: true }); }, still() ? 0 : 600);
}));
})();
