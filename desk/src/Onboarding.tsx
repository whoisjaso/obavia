/* Onboarding: the same pattern as the sale. One question per screen, the
   answer is the next tap. The state comes first, because it decides which
   licence list we search; the dealership is then found, not typed, and
   verified with a code sent to the contact on its licence record. */
import { useMemo, useRef, useState } from 'react';
import { EXAMPLE_DEALER, type DealerConfig } from './lib/config';
import { EXAMPLE_DEALERS, LIST_STATES, STATES, maskEmail, maskPhone, searchDealers, titleCase, type DealerRecord } from './lib/dealers';
import { finishOnboarding } from './store';
import { Sheet } from './Sheet';
import { exampleSales } from './data';
import { Choice, Ic, feel, transition } from './ui';

const COLORS = ['#4E6AA8', '#6F88C4', '#1C2436', '#3F4759', '#2E8A60', '#1E7A7A', '#B4232C', '#C2410C', '#C27A1E', '#A16207', '#6B4EA8', '#9D3C74'];
const SYSTEMS: { name: string; domain?: string }[] = [
  { name: 'Frazer', domain: 'frazer.com' }, { name: 'DealerCenter', domain: 'dealercenter.com' }, { name: 'Wayne Reaves', domain: 'waynereaves.com' },
  { name: 'AutoManager', domain: 'automanager.com' }, { name: 'DealerSocket', domain: 'dealersocket.com' }, { name: 'Dealertrack', domain: 'dealertrack.com' },
  { name: 'CDK', domain: 'cdkglobal.com' }, { name: 'Reynolds', domain: 'reyrey.com' },
  { name: 'Spreadsheet' }, { name: 'Pen And Paper' },
];

const monogram = (name: string) => {
  const words = name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(llc|inc|co|corp|the)$/i.test(w));
  const core = words.filter(w => !/^(auto|autos|motors?|sales|group|company|cars?)$/i.test(w));
  const pick = core.length >= 2 ? core : words;
  return (pick.length >= 2 ? pick[0][0] + pick[1][0] : (pick[0] ?? name).slice(0, 2)).toUpperCase();
};
const HUES = ['#2B4C8C', '#1E6B5A', '#8C3B2B', '#5B3F8C', '#8C6A1E', '#1E5F8C', '#3F4759'];
const hue = (n: string) => HUES[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

function SystemTile({ s, on, onPick }: { s: (typeof SYSTEMS)[number]; on: boolean; onPick: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <button className="sys" aria-pressed={on} onClick={() => { feel.tap(); onPick(); }}>
      <span className="ico">{s.domain && !broken ? <img src={favicon(s.domain)} alt="" onError={() => setBroken(true)} />
        : s.domain ? <span className="wm" style={{ background: hue(s.name) }}>{(s.name.match(/[A-Z]/g) ?? [s.name[0]]).join('').slice(0, 2)}</span>
        : <Ic n={s.name === 'Spreadsheet' ? 'sheet' : 'pen'} s={30} />}</span>
      <b>{s.name}</b>
      {on && <span className="tickmark"><Ic n="check" s={14} w={3} /></span>}
    </button>
  );
}

export function Onboarding() {
  const [i, setI] = useState(0);
  const [state, setState] = useState<string | null>(null);
  const [stateQ, setStateQ] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<DealerRecord | null>(null);
  const [typedName, setTypedName] = useState<string | null>(null);
  const [via, setVia] = useState<'sms' | 'email' | 'licence' | null>(null);
  const [code, setCode] = useState('');
  const [site, setSite] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [accent, setAccent] = useState(COLORS[0]);
  const [system, setSystem] = useState<string | null>(null);
  const [sysQ, setSysQ] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const name = picked ? titleCase(picked.dba || picked.name) : typedName ?? '';
  const legal = picked ? titleCase(picked.name) : typedName ?? '';
  const results = useMemo(() => (state ? searchDealers(EXAMPLE_DEALERS, state, q) : []), [state, q]);
  const hasList = !!state && LIST_STATES.has(state);
  const domain = site.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || picked?.email?.split('@')[1] || '';
  const dealer: DealerConfig = {
    ...EXAMPLE_DEALER, legalName: legal || EXAMPLE_DEALER.legalName, dba: name || EXAMPLE_DEALER.dba, state: state ?? 'TX',
    city: picked?.city ?? EXAMPLE_DEALER.city, county: picked?.county ?? EXAMPLE_DEALER.county, licence: picked?.licence ?? EXAMPLE_DEALER.licence,
    website: domain || EXAMPLE_DEALER.website, brand: { accent, logo, monogram: monogram(name || 'Example Motors') },
  };
  const go = (n: number) => { feel.next(); transition(() => { setI(n); scrollTo(0, 0); }); };
  const TOTAL = 8;
  const states = STATES.filter(([c, n]) => !stateQ || n.toLowerCase().startsWith(stateQ.toLowerCase()) || c.toLowerCase() === stateQ.toLowerCase());
  const systems = SYSTEMS.filter(s => s.name.toLowerCase().includes(sysQ.toLowerCase()));

  return (
    <main className="wrap ob">
      <div className="top">
        {i > 0 ? <button className="back" onClick={() => { feel.tap(); transition(() => { setI(i === 3 && !picked ? 1 : i - 1); scrollTo(0, 0); }, 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <span />}
        <span className="progress">{i + 1} of {TOTAL}</span>
      </div>
      <div className="bar"><i style={{ width: `${((i + 1) / TOTAL) * 100}%` }} /></div>

      {i === 0 && <section className="enter" key="s0">
        <img className="mark" src="./mark.svg" alt="" />
        <h1 className="q">Where’s Your Dealership?</h1>
        <label className="field"><input className="input" value={stateQ} onChange={e => setStateQ(e.target.value)} placeholder="Search your state" /></label>
        <div className="states">{states.map(([c, n]) => (
          <button key={c} className="st" aria-pressed={state === c} onClick={() => { setState(c); setPicked(null); setQ(''); go(1); }}><b>{n}</b><small>{c}</small></button>))}</div>
      </section>}

      {i === 1 && state && <section className="enter" key="s1">
        <h1 className="q">What’s Your Dealership Called?</h1>
        <label className="field"><input className="input big" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Start typing its name" /></label>
        {hasList && <span className="example">Example licence list</span>}
        <div className="choices">
          {results.map(d => (
            <button key={d.licence} className="choice dealer" onClick={() => { feel.next(); setPicked(d); setTypedName(null); go(2); }}>
              <span className="art"><Ic n="house" s={24} /></span>
              <span className="t"><b>{titleCase(d.dba || d.name)}</b><small>{d.dba ? `${titleCase(d.name)} · ` : ''}{d.city} · Licence {d.licence}</small></span>
              <span className="chev"><Ic n="chev" s={16} w={2.2} /></span>
            </button>))}
          {q.trim().length > 2 && <Choice icon="plus" label={results.length ? 'Not One Of These' : 'We Couldn’t Find It'} gloss={hasList ? `Use “${q.trim()}” and verify with your dealer licence` : 'Verify with your dealer licence'} onPick={() => { setPicked(null); setTypedName(q.trim()); setVia('licence'); go(3); }} />}
        </div>
      </section>}

      {i === 2 && picked && <section className="enter" key="s2">
        <h1 className="q">Is This You?</h1>
        <div className="idcard enter2">
          <span className="lg" style={{ background: accent }}>{monogram(name)}</span>
          <b>{name}</b><small>{titleCase(picked.name)}</small>
          <dl><div><dt>Licence</dt><dd className="num">{picked.licence}</dd></div><div><dt>City</dt><dd>{picked.city}</dd></div><div><dt>County</dt><dd>{picked.county}</dd></div></dl>
        </div>
        <h2 className="h2">Send A Code To Prove It</h2>
        <div className="choices" style={{ marginTop: 0 }}>
          {picked.phone && <Choice icon="phone" label={`Text ${maskPhone(picked.phone)}`} gloss="The number on your licence" onPick={() => { setVia('sms'); go(3); }} />}
          {picked.email && <Choice icon="link" label={`Email ${maskEmail(picked.email)}`} gloss="The email on your licence" onPick={() => { setVia('email'); go(3); }} />}
          <Choice icon="upload" label="Show My Dealer Licence Instead" gloss="A photo of the licence and your ID" onPick={() => { setVia('licence'); go(3); }} />
        </div>
      </section>}

      {i === 3 && <section className="enter" key="s3">
        {via === 'licence' ? <>
          <h1 className="q">Show Us Your Dealer Licence.</h1>
          <p className="note">We check it against the state, then you’re in.</p>
          <div className="choices">
            <label className="choice" style={{ cursor: 'pointer' }}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>Upload The Licence</b><small>A photo or a PDF</small></span>
              <input type="file" accept="image/*,application/pdf" hidden onChange={() => go(4)} /></label>
            <Choice icon="phone" label="Take A Photo" onPick={() => go(4)} />
          </div>
        </> : <>
          <h1 className="q">Enter The Code.</h1>
          <p className="note">Sent to {via === 'sms' ? maskPhone(picked?.phone ?? '') : maskEmail(picked?.email ?? 'a@b.c')}.</p>
          <div className="code" onClick={() => codeRef.current?.focus()}>
            {Array.from({ length: 6 }, (_, k) => <span key={k} className={k === code.length ? 'cur' : ''}>{code[k] ?? ''}</span>)}
            <input ref={codeRef} autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} aria-label="Code"
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) setTimeout(() => go(4), 350); }} />
          </div>
          <span className="example">Example: any six digits</span>
          <button className="textlink" onClick={() => { feel.tap(); setCode(''); }}>Send A New Code</button>
        </>}
      </section>}

      {i === 4 && <section className="enter" key="s4">
        <h1 className="q">{logo ? 'Your Logo.' : 'Add Your Logo.'}</h1>
        <div className="logo-found enter2">
          <span className="lg" style={{ background: accent }}>{logo ? <img src={logo} alt="" onError={() => setLogo(null)} /> : dealer.brand.monogram}</span>
          <span><b style={{ font: '750 18px/1.2 var(--sans)' }}>{dealer.dba}</b><small style={{ display: 'block', marginTop: 4, color: 'var(--muted)', font: '500 14.5px/1.4 var(--sans)' }}>{logo ? 'On every document you print' : 'Your initials, until you add a logo'}</small></span>
        </div>
        <label className="field"><input className="input" value={site} onChange={e => setSite(e.target.value)} placeholder="Your website, to find your logo" inputMode="url" /></label>
        <div className="choices">
          {domain && <Choice icon="globe" label="Find It On My Website" gloss={domain} on={!!logo && logo.includes('favicons')} onPick={() => setLogo(`${favicon(domain)}&v=256`)} />}
          <label className="choice" style={{ cursor: 'pointer' }}>
            <span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>Upload A Logo</b></span>
            <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { feel.next(); setLogo(String(r.result)); }; r.readAsDataURL(f); }} />
          </label>
          <Choice icon="type" label="Use My Initials" on={!logo} onPick={() => setLogo(null)} />
        </div>
      </section>}

      {i === 5 && <section className="enter" key="s5">
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

      {i === 6 && <section className="enter" key="s6">
        <h1 className="q">What Do You Use Today?</h1>
        <p className="note">We move your cars and deals over for you.</p>
        <label className="field"><input className="input" value={sysQ} onChange={e => setSysQ(e.target.value)} placeholder="Search" /></label>
        <div className="systems">{systems.map(s => <SystemTile key={s.name} s={s} on={system === s.name} onPick={() => setSystem(s.name)} />)}</div>
        {sysQ.trim() && !systems.length && <div className="choices"><Choice icon="plus" label={`Use “${sysQ.trim()}”`} onPick={() => { setSystem(sysQ.trim()); go(7); }} /></div>}
      </section>}

      {i === 7 && <section className="enter" key="s7">
        <h1 className="q">Your Paperwork, In Your Name.</h1>
        <div className="paper enter2"><div className="scroll"><Sheet doc="billOfSale" sale={exampleSales()[0]} dealer={dealer} /></div></div>
        <span className="example">Example car and buyer</span>
      </section>}

      <div className="dock"><div className="in">
        {i === 6 && <button className="btn primary block" disabled={!system} onClick={() => go(7)}>{system && !['Spreadsheet', 'Pen And Paper'].includes(system) ? `Move My ${system} Cars` : system === 'Spreadsheet' ? 'Upload My Spreadsheet' : 'Continue'}</button>}
        {i === 6 && <button className="textlink" onClick={() => go(7)}>Use Example Cars For Now</button>}
        {(i === 4 || i === 5) && <button className="btn primary block" onClick={() => go(i + 1)}>Continue</button>}
        {i === 7 && <button className="btn primary block" onClick={() => { feel.done(); finishOnboarding(dealer); }}>Start Selling</button>}
      </div></div>
    </main>
  );
}
