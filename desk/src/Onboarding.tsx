/* Onboarding: the same pattern as the sale. One question per screen, the
   answer is the next tap. The state comes first, because it decides which
   licence list we search; the dealership is then found, not typed, and
   verified with a code sent to the contact on its licence record.

   A dealer who arrived by Open The Desk already holds a key for one GDN (d:P123456.<sig>). The key is
   minted only after the lane application verified a code against that GDN, or by the owner (POST
   /dealers; deploy/site/lane/README.md "Key"), so onboarding opens on that dealer's TxDMV record and one
   tap, That's Us, stands in for the state, the search and the code. A GDN the list does not carry falls
   back to the state page without a word. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EXAMPLE_DEALER, type DealerConfig } from './lib/config';
import { SAY, checkVerify, live, session, startVerify, type Profile } from './lib/api';
import { SHAPES } from './lib/shapes';
import { STATES, hasList as listFor, loadDealerIndex, searchDealers, type DealerIndex, type DealerRecord } from './lib/dealers';
import { finishOnboarding, setLaneSettings, useStore } from './store';
import { KEY_SHAPE, dealerKey } from './lib/auction';
import { E164, HOURS, HOURS_ORDER, defaultSettings, gdnFromKey, hoursChoice, recordFor, toE164, type DealerSettings } from './lib/dealer-settings';
import { Sheet } from './Sheet';
import { exampleSales } from './data';
import { COMMON, KIND_TITLE, SYSTEMS, searchSystems, systemById, type System, type SystemKind } from './lib/systems';
import { Choice, Ic, feel, transition } from './ui';
import { formatPhone, isCompletePhone } from './lib/forms/phone';
import { isPersonName } from './lib/fill-130u/seller-name';
import { parseMoney } from './lib/money';

/* The pages, in order. After the dealership is verified, every fact the
   paperwork prints is asked on its own page (and confirmed rather than asked
   when the licence record already has it): nothing on a bill of sale, a
   130-U or a Buyer's Guide comes from the example dealer. */
const ORDER = ['key', 'state', 'name', 'you', 'code', 'address', 'phone', 'lane', 'hours', 'pickup', 'after', 'email', 'signer', 'title', 'docFee', 'lateFee', 'logo', 'colour', 'system', 'paper'] as const;
type Page = (typeof ORDER)[number];
const TITLES = ['Owner', 'General Manager', 'Manager', 'Finance Manager'];

const COLORS = ['#4E6AA8', '#6F88C4', '#1C2436', '#3F4759', '#2E8A60', '#1E7A7A', '#B4232C', '#C2410C', '#C27A1E', '#A16207', '#6B4EA8', '#9D3C74'];
const monogram = (name: string) => {
  const words = name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(llc|inc|co|corp|the)$/i.test(w));
  const core = words.filter(w => !/^(auto|autos|motors?|sales|group|company|cars?)$/i.test(w));
  const pick = core.length >= 2 ? core : words;
  return (pick.length >= 2 ? pick[0][0] + pick[1][0] : (pick[0] ?? name).slice(0, 2)).toUpperCase();
};
const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;

function SystemTile({ s, on, onPick }: { s: System; on: boolean; onPick: () => void }) {
  return (
    <button className="sys" aria-pressed={on} onClick={() => { feel.tap(); onPick(); }}>
      <span className={'ico' + (s.wide ? ' wide' : '')} style={s.bg ? { background: s.bg } : undefined}>{s.logo ? <img src={s.logo} alt="" decoding="async" /> : <Ic n="pen" s={34} />}</span>
      <b>{s.name}</b>
      {on && <span className="tickmark"><Ic n="check" s={14} w={3} /></span>}
    </button>
  );
}

/* ---------- the lane settings (gap-table Wave 2-C; phases Phase 2, Onboarding (dealer)) ----------
   Four pages, one question each: the lane toggle, the pickup hours, the pickup address, the after-hours
   line. Onboarding asks them right after the Desk's phone, so the after-hours line starts as that phone
   and the pickup address as the lot just confirmed; LaneSettings below runs the same pages from the Desk
   later. While the draft is open the after-hours line is the text in the box; saved, it is E.164. */
export const LANE_PAGES = ['lane', 'hours', 'pickup', 'after'] as const;
export type LanePage = (typeof LANE_PAGES)[number];
type Draft = DealerSettings;   // afterHours holds the box's text until saved
const T17 = { font: '500 17px/1.45 var(--sans)', color: 'var(--muted)' } as const;
const draftFrom = (s: DealerSettings): Draft => ({ ...s, afterHours: formatPhone(s.afterHours) });
const saved = (d: Draft): DealerSettings => ({ ...d, afterHours: toE164(d.afterHours), address: d.address.trim() });
/** A dealer key for one GDN is kept on this device (not the admin's d:*). */
const laneKeyHeld = () => { const k = dealerKey.get(); return !!k && KEY_SHAPE.test(k) && !!gdnFromKey(k); };
const splitAddress = (a: string) => { const at = a.indexOf(','); return at < 0 ? [a, ''] : [a.slice(0, at), a.slice(at + 1).trim()]; };

/** onward(patch): the answer is the next tap; the owner applies the patch and decides the next page. */
type LaneProps = { page: LanePage; d: Draft; put: (p: Partial<Draft>) => void; editAddr: boolean; setEditAddr: (b: boolean) => void; onward: (p?: Partial<Draft>) => void };

function LaneQuestion({ page, d, put, editAddr, onward }: LaneProps) {
  if (page === 'lane') return (
    <section className="enter" key="lane">
      <h1 className="q">Let Cars Go On The Lane?</h1>
      <div className="choices">
        <Choice label="Yes, Let Them Go" on={d.lane} onPick={() => onward({ lane: true })} />
        <Choice label="Not Now" on={!d.lane} onPick={() => onward({ lane: false })} />
      </div>
      {/* The Whop connected account the dealer is paid into. POST /accounts arrives with the Worker wave;
          until then this is a faint row with no action, and nothing here promises a date. */}
      <div aria-disabled="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 560, margin: '14px auto 0', minHeight: 64, padding: '16px 20px', borderRadius: 20, border: '1.5px dashed rgba(28,36,54,.16)', color: 'var(--faint)', font: '600 17px/1.25 var(--sans)' }}>
        <span>Payouts On Whop</span><span>Not Yet</span>
      </div>
    </section>);
  if (page === 'hours') return (
    <section className="enter" key="hours">
      <h1 className="q">When Can Buyers Pick Up?</h1>
      <div className="choices">{HOURS_ORDER.map(k => <Choice key={k} label={HOURS[k].label} on={hoursChoice(d.hours) === k} onPick={() => onward({ hours: [...HOURS[k].hours] })} />)}</div>
    </section>);
  if (page === 'pickup') {
    const [street, rest] = splitAddress(d.address);
    return (
      <section className="enter" key="pickup">
        <h1 className="q">{editAddr ? 'Where Do They Pick Up?' : 'Is This Where They Pick Up?'}</h1>
        {editAddr
          ? <label className="field"><input className="input" autoFocus value={d.address} onChange={e => put({ address: e.target.value })} placeholder="Street, city, ZIP" maxLength={120} autoComplete="street-address" /></label>
          : <div className="idcard enter2"><b>{street}</b>{rest && <span style={{ ...T17, marginTop: 6 }}>{rest}</span>}</div>}
      </section>);
  }
  return (
    <section className="enter" key="after">
      <h1 className="q">The After-Hours Line?</h1>
      <p className="note" style={T17}>Someone answers it, 9 pm included.</p>
      <label className="field"><input className="input big num" autoFocus value={d.afterHours} onChange={e => put({ afterHours: formatPhone(e.target.value) })} placeholder="(555) 000-0000" inputMode="tel" autoComplete="tel" maxLength={14} aria-label="After-hours line" /></label>
    </section>);
}

function LaneDock({ page, d, editAddr, setEditAddr, onward }: LaneProps) {
  if (page === 'pickup') return <>
    <button className="btn primary block" disabled={!d.address.trim()} onClick={() => onward()}>That’s Right</button>
    {!editAddr && <button className="textlink" style={{ fontSize: 17 }} onClick={() => { feel.tap(); setEditAddr(true); }}>Change It</button>}
  </>;
  if (page === 'after') return <button className="btn primary block" disabled={!E164.test(toE164(d.afterHours))} onClick={() => onward()}>That’s Right</button>;
  return null;
}

/** The lane settings from the Desk, later: the same four pages, saved on the last answer (or at Not Now). */
export function LaneSettings({ onDone }: { onDone: () => void }) {
  const { dealer, laneSettings } = useStore();
  const [d, setD] = useState<Draft>(() => draftFrom(laneSettings ?? defaultSettings(dealer, laneKeyHeld())));
  const [k, setK] = useState(0);
  const [editAddr, setEditAddr] = useState(false);
  const page = LANE_PAGES[k];
  const total = d.lane ? LANE_PAGES.length : 1;
  const put = (p: Partial<Draft>) => setD(x => ({ ...x, ...p }));
  const onward = (p: Partial<Draft> = {}) => {
    const nd = { ...d, ...p }; setD(nd);
    if (page === 'after' || !nd.lane) { setLaneSettings(saved(nd)); feel.done(); onDone(); return; }
    feel.next(); transition(() => { setK(k + 1); scrollTo(0, 0); });
  };
  const back = () => { feel.tap(); if (k === 0) { onDone(); return; } transition(() => { setK(k - 1); scrollTo(0, 0); }, 'back'); };
  const props: LaneProps = { page, d, put, editAddr, setEditAddr, onward };
  return (
    <main className="wrap ob center">
      <div className="top">
        <button className="back" style={{ fontSize: 17 }} onClick={back}><Ic n="chev" s={18} w={2.4} />Back</button>
        <span className="progress" style={{ fontSize: 17 }}>{k + 1} of {total}</span>
      </div>
      <div className="bar"><i style={{ width: `${((k + 1) / total) * 100}%` }} /></div>
      <LaneQuestion {...props} />
      <div className="dock"><div className="in"><LaneDock {...props} /></div></div>
    </main>
  );
}

export function Onboarding() {
  // A kept lane key opens on its own dealer (see the head of this file); otherwise the state comes first.
  const keyGdn = useMemo(() => (laneKeyHeld() ? gdnFromKey(dealerKey.get()) : null), []);
  const [i, setI] = useState(keyGdn ? 0 : 1);
  const [trail, setTrail] = useState<number[]>([]);   // the pages behind this one, so Back retraces the path taken
  const page: Page = ORDER[i];
  // The facts the paper prints, asked one per page.
  const [street, setStreet] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [zip, setZip] = useState<string | null>(null);
  const [editAddr, setEditAddr] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [signer, setSigner] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [docFee, setDocFee] = useState('');
  const [lateFee, setLateFee] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(keyGdn ? 'TX' : null);
  const [stateQ, setStateQ] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<DealerRecord | null>(null);
  const [typedName, setTypedName] = useState<string | null>(null);
  const [via, setVia] = useState<'sms' | 'email' | 'licence' | null>(null);
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [profile, setProfile] = useState<Profile>({});
  const [say, setSay] = useState('');
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [accent, setAccent] = useState(COLORS[0]);
  const [system, setSystem] = useState<string | null>(null);
  const [sysQ, setSysQ] = useState('');
  const [allSys, setAllSys] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const [laneDraft, setLaneDraft] = useState<Draft | null>(null);
  const [editPickup, setEditPickup] = useState(false);

  const [idx, setIdx] = useState<DealerIndex | null | undefined>(undefined);
  useEffect(() => { if (!state || !listFor(state)) { setIdx(null); return; } setIdx(undefined); let live = true; loadDealerIndex(state).then(x => live && setIdx(x)); return () => { live = false; }; }, [state]);
  const name = picked ? picked.dba || picked.name : typedName ?? '';
  const legal = picked ? picked.name : typedName ?? '';
  const results = useMemo(() => (idx ? searchDealers(idx, q) : []), [idx, q]);
  const keyRec = useMemo(() => recordFor(idx, keyGdn), [idx, keyGdn]);
  // The list is open and does not carry the key's GDN: the state page, silently.
  useEffect(() => { if (page === 'key' && idx !== undefined && !keyRec) { setState(null); setI(ORDER.indexOf('state')); } }, [page, idx, keyRec]);
  const hasList = !!idx;
  const webmail = /@(gmail|yahoo|hotmail|outlook|aol|icloud|live|msn|att|sbcglobal|comcast)\./i;
  const domain = site.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || (picked?.emailHint && !webmail.test(picked.emailHint) ? picked.emailHint.split('@')[1] : '') || '';
  // Once a dealer is chosen, every fact comes from their licence record or their verified profile.
  // A fact we don't have yet is left blank, never filled from the example dealer.
  const own = !!(picked || typedName);
  const dealer: DealerConfig = {
    ...EXAMPLE_DEALER, legalName: legal || EXAMPLE_DEALER.legalName, dba: name || EXAMPLE_DEALER.dba, state: state ?? 'TX',
    street: own ? street ?? (profile.street || picked?.street || '') : EXAMPLE_DEALER.street,
    city: own ? city ?? (profile.city || picked?.city || '') : EXAMPLE_DEALER.city,
    zip: own ? zip ?? (profile.zip || picked?.zip || '') : EXAMPLE_DEALER.zip,
    county: own ? picked?.county ?? '' : EXAMPLE_DEALER.county,
    phone: own ? phone ?? (profile.phone ? formatPhone(profile.phone) : '') : EXAMPLE_DEALER.phone,
    email: own ? email ?? (profile.email ?? '') : EXAMPLE_DEALER.email,
    licence: own ? picked?.licence ?? '' : EXAMPLE_DEALER.licence,
    website: domain || (own ? '' : EXAMPLE_DEALER.website),
    signer: own ? { name: signer.trim(), title: title ?? 'Owner' } : EXAMPLE_DEALER.signer,
    // The doc fee is the dealer's own figure, asked; never the example's. Until it is answered it is
    // unset, which prints "[Not set: …]" and blocks filing.
    fees: own ? { ...EXAMPLE_DEALER.fees, doc: parseMoney(docFee) ?? NaN, lateHandling: parseMoney(lateFee ?? '') ?? 0 } : EXAMPLE_DEALER.fees,
    brand: { accent, logo, monogram: monogram(name || 'Example Motors') },
  };
  /** Send the code to the contact on the licence. Preview mode skips straight to the code. */
  async function send(ch: 'sms' | 'email', again = false) {
    setVia(ch); setSay(''); setCode('');
    if (!live || !picked) { if (!again) go('code'); return; }
    setBusy(true); const r = await startVerify(picked.licence, ch); setBusy(false);
    if (!r.ok) { setSay(SAY[r.reason] ?? SAY.offline); return; }
    setSentTo(r.sentTo); if (!again) go('code');
  }
  /** Check the six digits; on success the verified profile fills the paperwork. */
  async function check(v: string) {
    if (!live || !picked || (via !== 'sms' && via !== 'email')) { setTimeout(() => go('address'), 350); return; }
    const r = await checkVerify(picked.licence, via, v);
    if (!r.ok) { feel.tap(); setSay(SAY[r.reason] ?? SAY.offline); setCode(''); return; }
    session.set(r.token); setProfile(r.profile); go('address');
  }
  // Typed when the licence record has no street, or when they chose to change it; confirmed otherwise.
  const askAddr = editAddr || !(profile.street || picked?.street);
  const go = (to: Page | number) => { feel.next(); const n = typeof to === 'number' ? to : ORDER.indexOf(to); transition(() => { setTrail(t => [...t, i]); setI(n); scrollTo(0, 0); }); };
  const back = () => { feel.tap(); const prev = trail[trail.length - 1]; if (prev === undefined) return; transition(() => { setTrail(t => t.slice(0, -1)); setI(prev); scrollTo(0, 0); }, 'back'); };
  const next = () => go(i + 1);
  // The lane settings: the defaults follow the lot and the phone until the dealer answers the first lane page.
  const lane: Draft = laneDraft ?? draftFrom(defaultSettings(dealer, !!keyGdn));
  const laneOnward = (p: Partial<Draft> = {}) => { const nd = { ...lane, ...p }; setLaneDraft(nd); if (page === 'after' || !nd.lane) go('email'); else next(); };
  const laneProps: LaneProps | null = (LANE_PAGES as readonly string[]).includes(page) ? { page: page as LanePage, d: lane, put: p => setLaneDraft({ ...lane, ...p }), editAddr: editPickup, setEditAddr: setEditPickup, onward: laneOnward } : null;
  // Progress counts the pages this dealer walks: the key's path skips the search, Not Now skips the lane's three.
  const viaKey = !!keyRec && (page === 'key' || picked === keyRec);
  const steps = ORDER.filter(p => (viaKey ? !['state', 'name', 'you', 'code'].includes(p) : p !== 'key') && (lane.lane || !['hours', 'pickup', 'after'].includes(p)));
  const at = Math.max(0, steps.indexOf(page));
  const TOTAL = steps.length;
  const states = STATES.filter(([c, n]) => !stateQ || n.toLowerCase().startsWith(stateQ.toLowerCase()) || c.toLowerCase() === stateQ.toLowerCase());
  const found = searchSystems(sysQ);
  const sys = system ? systemById(system) : undefined;
  const count = idx?.count.toLocaleString();
  const asOf = idx ? new Date(idx.asOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';

  return (
    <main className="wrap ob center">
      <div className="top">
        {trail.length ? <button className="back" style={{ fontSize: 17 }} onClick={back}><Ic n="chev" s={18} w={2.4} />Back</button> : <span />}
        {page !== 'key' || keyRec ? <span className="progress" style={{ fontSize: 17 }}>{at + 1} of {TOTAL}</span> : <span />}
      </div>
      <div className="bar"><i style={{ width: `${((at + 1) / TOTAL) * 100}%` }} /></div>

      {/* The key's dealer: the name and the licence number touch, the city under them. Blank while the list opens. */}
      {page === 'key' && keyRec && <section className="enter" key="key">
        <h1 className="q">Is This You?</h1>
        <div className="idcard enter2">
          <span className="lg" style={{ background: accent }}>{monogram(keyRec.dba || keyRec.name)}</span>
          <b>{keyRec.dba || keyRec.name}</b>
          <span className="num" style={{ marginTop: 6, font: '700 19px/1.2 var(--sans)', letterSpacing: '.03em', color: 'var(--ink)' }}>{keyRec.licence}</span>
          <span style={{ ...T17, marginTop: 4 }}>{keyRec.city}, Texas</span>
        </div>
      </section>}

      {page === 'state' && <section className="enter" key="s0">
        <img className="mark" src="./mark.svg" alt="" />
        <h1 className="q">Where’s Your Dealership?</h1>
        <label className="field"><input className="input" value={stateQ} onChange={e => setStateQ(e.target.value)} placeholder="Search your state" /></label>
        <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}><defs>
          <linearGradient id="st-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C9D9FB" /><stop offset=".55" stopColor="#8FA9E2" /><stop offset="1" stopColor="#4E6AA8" /></linearGradient>
          <linearGradient id="st-deep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9FB8F0" /><stop offset="1" stopColor="#2F4A86" /></linearGradient>
        </defs></svg>
        <div className="states">{states.map(([c, n], k) => (
          <button key={c} className={`st${c === 'TX' && !stateQ ? ' lead' : ''}`} style={{ ['--k' as string]: Math.min(k, 24) }} aria-label={n} aria-pressed={state === c} title={n}
            onClick={() => { setState(c); setPicked(null); setQ(''); go('name'); }}>
            <svg viewBox="-4 -4 108 108" aria-hidden="true"><path className="base" d={SHAPES[c]} /><path className="deep" d={SHAPES[c]} /></svg>
            <span>{n === 'District Of Columbia' ? 'D.C.' : n}</span>
          </button>))}</div>
        {!states.length && <p className="hint">No state by that name.</p>}
      </section>}

      {page === 'name' && state && <section className="enter" key="s1">
        <h1 className="q">What’s Your Dealership Called?</h1>
        <label className="field"><input className="input big" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Start typing its name" /></label>
        {idx === undefined && <p className="hint">Opening the {STATES.find(x => x[0] === state)?.[1]} dealer list…</p>}
        {hasList && !q.trim() && <p className="hint">{count} licensed {STATES.find(x => x[0] === state)?.[1]} dealers, from the state’s list of {asOf}.</p>}
        <div className="choices">
          {results.map(d => (
            <button key={d.licence} className="choice dealer" onClick={() => { feel.next(); setPicked(d); setTypedName(null); go('you'); }}>
              <span className="art"><Ic n="house" s={24} /></span>
              <span className="t"><b>{d.dba || d.name}</b><small>{d.dba ? `${d.name} · ` : ''}{d.city} · {d.licence}</small></span>
              <span className="chev"><Ic n="chev" s={16} w={2.2} /></span>
            </button>))}
          {(q.trim().length > 2 || (idx === null && q.trim())) && <Choice icon="plus" label={results.length ? 'Not One Of These' : 'We Couldn’t Find It'} gloss="Verify with your dealer licence instead" onPick={() => { setPicked(null); setTypedName(q.trim()); setVia('licence'); go('code'); }} />}
        </div>
      </section>}

      {page === 'you' && picked && <section className="enter" key="s2">
        <h1 className="q">Is This You?</h1>
        <div className="idcard enter2">
          <span className="lg" style={{ background: accent }}>{monogram(name)}</span>
          <b>{name}</b>{picked.dba && <small>{picked.name}</small>}
          <dl><div><dt>Licence</dt><dd className="num">{picked.licence}</dd></div><div><dt>City</dt><dd>{picked.city}</dd></div><div><dt>County</dt><dd>{picked.county}</dd></div></dl>
        </div>
        <p className="hint" style={{ marginTop: 26 }}>{say || 'We’ll send a code to the contact on your licence.'}</p>
        <div className="choices" style={{ marginTop: 12 }}>
          {picked.hasPhone && <Choice icon="phone" label={busy && via === 'sms' ? 'Sending…' : 'Text Me A Code'} gloss="To the phone on your licence" onPick={() => send('sms')} />}
          {picked.emailHint && <Choice icon="link" label={busy && via === 'email' ? 'Sending…' : `Email ${picked.emailHint}`} gloss="The email on your licence" onPick={() => send('email')} />}
          <Choice icon="upload" label="Show My Dealer Licence Instead" gloss="A photo of the licence and your ID" onPick={() => { setVia('licence'); go('code'); }} />
        </div>
      </section>}

      {page === 'code' && <section className="enter" key="s3">
        {via === 'licence' ? <>
          <h1 className="q">Show Us Your Dealer Licence.</h1>
          <p className="note">We check it against the state, then you’re in.</p>
          <div className="choices">
            <label className="choice" style={{ cursor: 'pointer' }}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>Upload The Licence</b><small>A photo or a PDF</small></span>
              <input type="file" accept="image/*,application/pdf" hidden onChange={() => go('address')} /></label>
            <Choice icon="phone" label="Take A Photo" onPick={() => go('address')} />
          </div>
        </> : <>
          <h1 className="q">Enter The Code.</h1>
          <p className="note">{say || <>Sent to {sentTo || (via === 'sms' ? 'the phone on your licence' : picked?.emailHint)}.</>}</p>
          <div className="code" onClick={() => codeRef.current?.focus()}>
            {Array.from({ length: 6 }, (_, k) => <span key={k} className={k === code.length ? 'cur' : ''}>{code[k] ?? ''}</span>)}
            <input ref={codeRef} autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} aria-label="Code"
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); setSay(''); if (v.length === 6) check(v); }} />
          </div>
          {!live && <span className="example">Preview: any six digits work</span>}
          <button className="textlink" onClick={() => { feel.tap(); setCode(''); if (via === 'sms' || via === 'email') send(via, true); }}>Send A New Code</button>
        </>}
      </section>}

      {page === 'address' && <section className="enter" key="address">
        <h1 className="q">{askAddr ? 'Where’s The Lot?' : 'Is This The Lot?'}</h1>
        <p className="note">It prints on every bill of sale and title application.</p>
        {askAddr ? <>
          <label className="field"><input className="input" autoFocus value={dealer.street} onChange={e => setStreet(e.target.value)} placeholder="Street" maxLength={60} autoComplete="address-line1" /></label>
          <label className="field"><input className="input" value={dealer.city} onChange={e => setCity(e.target.value)} placeholder="City" maxLength={40} autoComplete="address-level2" /></label>
          <label className="field"><input className="input num" value={dealer.zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="ZIP" inputMode="numeric" maxLength={5} autoComplete="postal-code" /></label>
        </> : <div className="idcard enter2"><b>{dealer.street}</b><small>{[dealer.city, [dealer.state, dealer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</small>
          {picked?.county && <dl><div><dt>County</dt><dd>{picked.county}</dd></div></dl>}</div>}
      </section>}

      {page === 'phone' && <section className="enter" key="phone">
        <h1 className="q">The Dealership’s Phone?</h1>
        <p className="note">Buyers call this number. It goes on the paperwork and the Buyer’s Guide.</p>
        <label className="field"><input className="input big num" autoFocus value={dealer.phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 000-0000" inputMode="tel" autoComplete="tel" maxLength={14} /></label>
      </section>}

      {laneProps && <LaneQuestion {...laneProps} />}

      {page === 'email' && <section className="enter" key="email">
        <h1 className="q">And The Email?</h1>
        <p className="note">The Buyer’s Guide asks for one.</p>
        <label className="field"><input className="input big" autoFocus value={dealer.email} onChange={e => setEmail(e.target.value.trim())} placeholder="you@yourdealership.com" inputMode="email" autoComplete="email" maxLength={80} /></label>
      </section>}

      {page === 'signer' && <section className="enter" key="signer">
        <h1 className="q">Who Signs For The Dealership?</h1>
        <p className="note">{signer && !isPersonName(signer) ? 'Their full legal name, first and last.' : 'Their full legal name. It prints on the seller line of every title application.'}</p>
        <label className="field"><input className="input big" autoFocus value={signer} onChange={e => setSigner(e.target.value)} placeholder="First and last, as on their ID" maxLength={60} autoComplete="name" /></label>
      </section>}

      {page === 'title' && <section className="enter" key="title">
        <h1 className="q">{signer.trim().split(/\s+/)[0] ? `${signer.trim().split(/\s+/)[0]}’s Title?` : 'Their Title?'}</h1>
        <div className="choices">{TITLES.map(t => <Choice key={t} label={t} on={title === t} onPick={() => { setTitle(t); next(); }} />)}</div>
      </section>}

      {page === 'docFee' && <section className="enter" key="docFee">
        <h1 className="q">Your Documentary Fee?</h1>
        <p className="note">What you charge on every sale for the paperwork. It prints as its own line on the bill of sale.</p>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={docFee} onChange={e => setDocFee(e.target.value.replace(/[^\d.]/g, '').slice(0, 7))} placeholder="0" aria-label="Documentary fee" /></div>
      </section>}

      {page === 'lateFee' && <section className="enter" key="lateFee">
        <h1 className="q">If A Buyer’s Title Comes Back To You?</h1>
        <p className="note">When a buyer files their own title and hands it back late, some dealers charge a handling fee. It prints on the Vehicle Responsibility form.</p>
        {lateFee === null || lateFee === '0'
          ? <div className="choices">
              <Choice label="No Fee" gloss="They pay the registration they were quoted" on={lateFee === '0'} onPick={() => { setLateFee('0'); next(); }} />
              <Choice label="We Charge A Fee" onPick={() => { feel.tap(); setLateFee(''); }} />
            </div>
          : <div className="money"><input className="input" inputMode="decimal" autoFocus value={lateFee} onChange={e => setLateFee(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))} placeholder="0" aria-label="Late-handling fee" /></div>}
      </section>}

      {page === 'logo' && <section className="enter" key="s4">
        <h1 className="q">{logo ? 'Your Logo.' : 'Add Your Logo.'}</h1>
        <div className="logo-found enter2">
          <span className="lg" style={{ background: accent }}>{logo ? <img src={logo} alt="" onError={() => setLogo(null)} /> : dealer.brand.monogram}</span>
          <span><b style={{ font: '750 18px/1.2 var(--sans)' }}>{dealer.dba}</b><small style={{ display: 'block', marginTop: 4, color: 'var(--muted)', font: '500 14.5px/1.4 var(--sans)' }}>{logo ? 'On every document you print' : 'Your initials, until you add a logo'}</small></span>
        </div>
        <label className="field"><input className="input" value={site} onChange={e => setSite(e.target.value)} placeholder="Your website, to find your logo" inputMode="url" /></label>
        <div className="choices">
          {domain && <Choice icon="globe" label="Find It On My Website" gloss={domain} on={!!logo && logo.includes('favicons')} onPick={() => setLogo(favicon(domain))} />}
          <label className="choice" style={{ cursor: 'pointer' }}>
            <span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>Upload A Logo</b></span>
            <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { feel.next(); setLogo(String(r.result)); }; r.readAsDataURL(f); }} />
          </label>
          <Choice icon="type" label="Use My Initials" on={!logo} onPick={() => setLogo(null)} />
        </div>
      </section>}

      {page === 'colour' && <section className="enter" key="s5">
        <h1 className="q">Pick Your Colour.</h1>
        <p className="note">It goes on every bill of sale.</p>
        <div className="swatches">
          {COLORS.map(c => <button key={c} className="swatch" style={{ background: c }} aria-pressed={accent === c} aria-label={c} onClick={() => { feel.tap(); setAccent(c); }}>{accent === c && <Ic n="check" s={20} w={3} />}</button>)}
          <label className="swatch custom" aria-pressed={!COLORS.includes(accent)} style={{ background: COLORS.includes(accent) ? undefined : accent }}>
            {COLORS.includes(accent) ? <Ic n="plus" s={20} w={2.4} /> : <Ic n="check" s={20} w={3} />}
            <input type="color" value={accent} onChange={e => setAccent(e.target.value)} aria-label="Any colour" />
          </label>
        </div>
        <div className="paper mini enter3"><div className="scroll"><Sheet doc="billOfSale" sale={exampleSales()[0]} dealer={dealer} compact /></div></div>
      </section>}

      {page === 'system' && <section className="enter" key="s6">
        <h1 className="q">What Do You Use Today?</h1>
        <p className="note">Tap it. We move your cars and deals over for you.</p>
        <label className="field search"><Ic n="search" s={20} /><input className="input" value={sysQ} onChange={e => setSysQ(e.target.value)} placeholder={`Search ${SYSTEMS.length} systems`} /></label>
        {sysQ.trim()
          ? <>{found.length ? <div className="systems">{found.map(x => <SystemTile key={x.id} s={x} on={system === x.id} onPick={() => setSystem(x.id)} />)}</div>
              : <div className="choices"><Choice icon="plus" label={`We Use “${sysQ.trim()}”`} gloss="We’ll move it over all the same" onPick={() => { setSystem(sysQ.trim()); go('paper'); }} /></div>}</>
          : allSys
            ? (Object.keys(KIND_TITLE) as SystemKind[]).map(k => <div key={k}><h2 className="h2 kind">{KIND_TITLE[k]}</h2><div className="systems">{SYSTEMS.filter(x => x.kind === k).map(x => <SystemTile key={x.id} s={x} on={system === x.id} onPick={() => setSystem(x.id)} />)}</div></div>)
            : <><div className="systems">{COMMON.map(id => systemById(id)!).map(x => <SystemTile key={x.id} s={x} on={system === x.id} onPick={() => setSystem(x.id)} />)}</div>
                <button className="btn quiet more" onClick={() => { feel.tap(); setAllSys(true); }}>See All {SYSTEMS.length}</button></>}
      </section>}

      {page === 'paper' && <section className="enter" key="s7">
        <h1 className="q">Your Paperwork, In Your Name.</h1>
        <div className="paper enter2"><div className="scroll"><Sheet doc="billOfSale" sale={exampleSales()[0]} dealer={dealer} /></div></div>
        <span className="example">Example car and buyer</span>
      </section>}

      <div className="dock"><div className="in">
        {page === 'key' && keyRec && <button className="btn primary block" onClick={() => { setPicked(keyRec); setTypedName(null); setState('TX'); go('address'); }}>That’s Us</button>}
        {laneProps && <LaneDock {...laneProps} />}
        {page === 'system' && <button className="btn primary block" disabled={!system} onClick={() => go('paper')}>{!system ? 'Pick One Above' : sys?.id === 'paper' ? 'Continue' : sys?.kind === 'books' ? `Upload My ${sys.name} File` : `Move My Cars From ${sys?.name ?? system}`}</button>}
        {page === 'system' && <button className="textlink" onClick={() => go('paper')}>Use Example Cars For Now</button>}
        {(page === 'logo' || page === 'colour') && <button className="btn primary block" onClick={next}>Continue</button>}
        {page === 'address' && (askAddr
          ? <button className="btn primary block" disabled={!dealer.street.trim() || !dealer.city.trim() || !/^\d{5}$/.test(dealer.zip)} onClick={next}>Continue</button>
          : <button className="btn primary block" onClick={next}>That’s Right</button>)}
        {page === 'address' && !askAddr && <button className="textlink" onClick={() => { feel.tap(); setEditAddr(true); }}>Change It</button>}
        {page === 'phone' && <button className="btn primary block" disabled={!isCompletePhone(dealer.phone)} onClick={next}>Continue</button>}
        {page === 'email' && <button className="btn primary block" disabled={!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(dealer.email)} onClick={next}>Continue</button>}
        {page === 'signer' && <button className="btn primary block" disabled={!isPersonName(signer)} onClick={next}>Continue</button>}
        {page === 'docFee' && <button className="btn primary block" disabled={parseMoney(docFee) === null} onClick={next}>Continue</button>}
        {page === 'lateFee' && lateFee !== null && lateFee !== '0' && <button className="btn primary block" disabled={parseMoney(lateFee) === null} onClick={next}>Continue</button>}
        {page === 'paper' && <button className="btn primary block" onClick={() => { feel.done(); setLaneSettings(saved(lane)); finishOnboarding(dealer); }}>Start Selling</button>}
      </div></div>
    </main>
  );
}
