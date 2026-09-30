/* Onboarding: the same pattern as the sale. One question per screen, the
   answer is the next tap. The state comes first, because it decides which
   licence list we search; the dealership is then found, not typed, and
   verified with a code sent to the contact on its licence record. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EXAMPLE_DEALER, type DealerConfig } from './lib/config';
import { STATES, hasList as listFor, loadDealerIndex, maskPhone, searchDealers, type DealerIndex, type DealerRecord } from './lib/dealers';
import { finishOnboarding } from './store';
import { Sheet } from './Sheet';
import { exampleSales } from './data';
import { COMMON, KIND_TITLE, SYSTEMS, searchSystems, systemById, type System, type SystemKind } from './lib/systems';
import { Choice, Ic, feel, transition } from './ui';

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
  const [allSys, setAllSys] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const [idx, setIdx] = useState<DealerIndex | null | undefined>(undefined);
  useEffect(() => { if (!state || !listFor(state)) { setIdx(null); return; } setIdx(undefined); let live = true; loadDealerIndex(state).then(x => live && setIdx(x)); return () => { live = false; }; }, [state]);
  const name = picked ? picked.dba || picked.name : typedName ?? '';
  const legal = picked ? picked.name : typedName ?? '';
  const results = useMemo(() => (idx ? searchDealers(idx, q) : []), [idx, q]);
  const hasList = !!idx;
  const webmail = /@(gmail|yahoo|hotmail|outlook|aol|icloud|live|msn|att|sbcglobal|comcast)\./i;
  const domain = site.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || (picked?.emailHint && !webmail.test(picked.emailHint) ? picked.emailHint.split('@')[1] : '') || '';
  const dealer: DealerConfig = {
    ...EXAMPLE_DEALER, legalName: legal || EXAMPLE_DEALER.legalName, dba: name || EXAMPLE_DEALER.dba, state: state ?? 'TX',
    city: picked?.city ?? EXAMPLE_DEALER.city, county: picked?.county ?? EXAMPLE_DEALER.county, licence: picked?.licence ?? EXAMPLE_DEALER.licence,
    website: domain || EXAMPLE_DEALER.website, brand: { accent, logo, monogram: monogram(name || 'Example Motors') },
  };
  const go = (n: number) => { feel.next(); transition(() => { setI(n); scrollTo(0, 0); }); };
  const TOTAL = 8;
  const states = STATES.filter(([c, n]) => !stateQ || n.toLowerCase().startsWith(stateQ.toLowerCase()) || c.toLowerCase() === stateQ.toLowerCase());
  const found = searchSystems(sysQ);
  const sys = system ? systemById(system) : undefined;
  const count = idx?.count.toLocaleString();
  const asOf = idx ? new Date(idx.asOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';

  return (
    <main className="wrap ob center">
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
        {idx === undefined && <p className="hint">Opening the {STATES.find(x => x[0] === state)?.[1]} dealer list…</p>}
        {hasList && !q.trim() && <p className="hint">{count} licensed {STATES.find(x => x[0] === state)?.[1]} dealers, from the state’s list of {asOf}.</p>}
        <div className="choices">
          {results.map(d => (
            <button key={d.licence} className="choice dealer" onClick={() => { feel.next(); setPicked(d); setTypedName(null); go(2); }}>
              <span className="art"><Ic n="house" s={24} /></span>
              <span className="t"><b>{d.dba || d.name}</b><small>{d.dba ? `${d.name} · ` : ''}{d.city} · {d.licence}</small></span>
              <span className="chev"><Ic n="chev" s={16} w={2.2} /></span>
            </button>))}
          {(q.trim().length > 2 || (idx === null && q.trim())) && <Choice icon="plus" label={results.length ? 'Not One Of These' : 'We Couldn’t Find It'} gloss="Verify with your dealer licence instead" onPick={() => { setPicked(null); setTypedName(q.trim()); setVia('licence'); go(3); }} />}
        </div>
      </section>}

      {i === 2 && picked && <section className="enter" key="s2">
        <h1 className="q">Is This You?</h1>
        <div className="idcard enter2">
          <span className="lg" style={{ background: accent }}>{monogram(name)}</span>
          <b>{name}</b>{picked.dba && <small>{picked.name}</small>}
          <dl><div><dt>Licence</dt><dd className="num">{picked.licence}</dd></div><div><dt>City</dt><dd>{picked.city}</dd></div><div><dt>County</dt><dd>{picked.county}</dd></div></dl>
        </div>
        <p className="hint" style={{ marginTop: 26 }}>We’ll send a code to the contact on your licence.</p>
        <div className="choices" style={{ marginTop: 12 }}>
          {picked.phoneLast4 && <Choice icon="phone" label={`Text ${maskPhone(picked.phoneLast4)}`} gloss="The phone on your licence" onPick={() => { setVia('sms'); go(3); }} />}
          {picked.emailHint && <Choice icon="link" label={`Email ${picked.emailHint}`} gloss="The email on your licence" onPick={() => { setVia('email'); go(3); }} />}
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
          <p className="note">Sent to {via === 'sms' ? maskPhone(picked?.phoneLast4 ?? '') : picked?.emailHint}.</p>
          <div className="code" onClick={() => codeRef.current?.focus()}>
            {Array.from({ length: 6 }, (_, k) => <span key={k} className={k === code.length ? 'cur' : ''}>{code[k] ?? ''}</span>)}
            <input ref={codeRef} autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} aria-label="Code"
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) setTimeout(() => go(4), 350); }} />
          </div>
          <span className="example">Preview: any six digits work</span>
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
          {domain && <Choice icon="globe" label="Find It On My Website" gloss={domain} on={!!logo && logo.includes('favicons')} onPick={() => setLogo(favicon(domain))} />}
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
        <p className="note">Tap it. We move your cars and deals over for you.</p>
        <label className="field search"><Ic n="search" s={20} /><input className="input" value={sysQ} onChange={e => setSysQ(e.target.value)} placeholder={`Search ${SYSTEMS.length} systems`} /></label>
        {sysQ.trim()
          ? <>{found.length ? <div className="systems">{found.map(x => <SystemTile key={x.id} s={x} on={system === x.id} onPick={() => setSystem(x.id)} />)}</div>
              : <div className="choices"><Choice icon="plus" label={`We Use “${sysQ.trim()}”`} gloss="We’ll move it over all the same" onPick={() => { setSystem(sysQ.trim()); go(7); }} /></div>}</>
          : allSys
            ? (Object.keys(KIND_TITLE) as SystemKind[]).map(k => <div key={k}><h2 className="h2 kind">{KIND_TITLE[k]}</h2><div className="systems">{SYSTEMS.filter(x => x.kind === k).map(x => <SystemTile key={x.id} s={x} on={system === x.id} onPick={() => setSystem(x.id)} />)}</div></div>)
            : <><div className="systems">{COMMON.map(id => systemById(id)!).map(x => <SystemTile key={x.id} s={x} on={system === x.id} onPick={() => setSystem(x.id)} />)}</div>
                <button className="btn quiet more" onClick={() => { feel.tap(); setAllSys(true); }}>See All {SYSTEMS.length}</button></>}
      </section>}

      {i === 7 && <section className="enter" key="s7">
        <h1 className="q">Your Paperwork, In Your Name.</h1>
        <div className="paper enter2"><div className="scroll"><Sheet doc="billOfSale" sale={exampleSales()[0]} dealer={dealer} /></div></div>
        <span className="example">Example car and buyer</span>
      </section>}

      <div className="dock"><div className="in">
        {i === 6 && <button className="btn primary block" disabled={!system} onClick={() => go(7)}>{!system ? 'Pick One Above' : sys?.id === 'paper' ? 'Continue' : sys?.kind === 'books' ? `Upload My ${sys.name} File` : `Move My Cars From ${sys?.name ?? system}`}</button>}
        {i === 6 && <button className="textlink" onClick={() => go(7)}>Use Example Cars For Now</button>}
        {(i === 4 || i === 5) && <button className="btn primary block" onClick={() => go(i + 1)}>Continue</button>}
        {i === 7 && <button className="btn primary block" onClick={() => { feel.done(); finishOnboarding(dealer); }}>Start Selling</button>}
      </div></div>
    </main>
  );
}
