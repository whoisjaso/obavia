/* Onboarding: the same pattern as the sale. One question per screen, the
   answer is the next tap, and it ends on the dealer's own paperwork. */
import { useState } from 'react';
import { EXAMPLE_DEALER, type DealerConfig } from './lib/config';
import { finishOnboarding } from './store';
import { Sheet } from './Sheet';
import { exampleSales } from './data';
import { Choice, Ic, feel } from './ui';

const COLORS = ['#4E6AA8', '#1C2436', '#2E8A60', '#B4232C', '#C27A1E', '#6B4EA8'];
const SYSTEMS = ['Frazer', 'DealerCenter', 'Wayne Reaves', 'AutoManager', 'DealerSocket', 'Spreadsheet'];

const monogram = (name: string) => name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(llc|inc|co|the|auto|motors?)$/i.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();

export function Onboarding() {
  const [i, setI] = useState(0);
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [accent, setAccent] = useState(COLORS[0]);
  const [system, setSystem] = useState<string | null>(null);
  const next = () => { feel.next(); setI(x => x + 1); };
  const domain = site.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const dealer: DealerConfig = { ...EXAMPLE_DEALER, legalName: name || EXAMPLE_DEALER.legalName, dba: name || EXAMPLE_DEALER.dba, website: domain || EXAMPLE_DEALER.website, brand: { accent, logo, monogram: monogram(name || 'Example Motors') } };
  const steps = 5;

  return (
    <main className="wrap ob">
      <div className="top">
        {i > 0 ? <button className="back" onClick={() => { feel.tap(); setI(i - 1); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <span />}
        <span className="progress">{i + 1} of {steps}</span>
      </div>
      <div className="bar"><i style={{ width: `${((i + 1) / steps) * 100}%` }} /></div>

      {i === 0 && <section className="enter" key="0">
        <img className="mark" src="./mark.svg" alt="" />
        <h1 className="q">What’s Your Dealership Called?</h1>
        <label className="field"><input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Dealership name" /></label>
        <label className="field"><input className="input" value={site} onChange={e => setSite(e.target.value)} placeholder="Website (optional)" inputMode="url" /></label>
      </section>}

      {i === 1 && <section className="enter" key="1">
        <h1 className="q">{domain ? 'We Found Your Logo.' : 'Your Logo.'}</h1>
        <div className="logo-found enter2">
          <span className="lg" style={{ background: accent }}>{logo ? <img src={logo} alt="" /> : dealer.brand.monogram}</span>
          <span><b style={{ font: '750 18px/1.2 var(--sans)' }}>{dealer.dba}</b><small style={{ display: 'block', marginTop: 4, color: 'var(--muted)', font: '500 14.5px/1.4 var(--sans)' }}>{logo ? `From ${domain}` : 'Your initials, until you add a logo'}</small></span>
        </div>
        <div className="choices">
          {domain && <Choice icon="globe" label="Use The One On My Website" on={!!logo} onPick={() => setLogo(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`)} />}
          <label className="choice" style={{ cursor: 'pointer' }}>
            <span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>Upload A Logo</b></span>
            <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { feel.next(); setLogo(String(r.result)); }; r.readAsDataURL(f); }} />
          </label>
          <Choice icon="type" label="Use My Initials" on={!logo} onPick={() => setLogo(null)} />
        </div>
      </section>}

      {i === 2 && <section className="enter" key="2">
        <h1 className="q">Pick Your Colour.</h1>
        <p className="note">It goes on every bill of sale.</p>
        <div className="swatches">
          {COLORS.map(c => <button key={c} className="swatch" style={{ background: c }} aria-pressed={accent === c} aria-label={c} onClick={() => { feel.tap(); setAccent(c); }}>{accent === c && <Ic n="check" s={20} w={3} />}</button>)}
        </div>
      </section>}

      {i === 3 && <section className="enter" key="3">
        <h1 className="q">Bring Your Cars.</h1>
        <p className="note">Pick what you use today. We move it over for you.</p>
        <div className="systems">
          {SYSTEMS.map(sys => <button key={sys} aria-pressed={system === sys} onClick={() => { feel.tap(); setSystem(sys); }}>{sys}</button>)}
        </div>
        <div className="choices">
          <Choice icon="plus" label="Add Cars By VIN" gloss="Type or scan it. We fill in the rest." onPick={() => { setSystem('VIN'); next(); }} />
        </div>
      </section>}

      {i === 4 && <section className="enter" key="4">
        <h1 className="q">Your Paperwork, In Your Name.</h1>
        <div className="paper enter2"><div className="scroll"><Sheet doc="billOfSale" sale={exampleSales()[0]} dealer={dealer} /></div></div>
        <span className="example">Example car and buyer</span>
      </section>}

      <div className="dock"><div className="in">
        {i < 4
          ? <button className="btn primary block" disabled={i === 0 && !name.trim()} onClick={next}>{i === 3 && system ? `Move My ${system === 'Spreadsheet' ? 'Spreadsheet' : system + ' Cars'}` : 'Continue'}</button>
          : <button className="btn primary block" onClick={() => { feel.done(); finishOnboarding(dealer); }}>Start Selling</button>}
        {i === 3 && <button className="textlink" onClick={next}>Use Example Cars For Now</button>}
      </div></div>
    </main>
  );
}
