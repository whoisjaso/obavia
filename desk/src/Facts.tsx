/* The dealer's legal facts the paperwork prints, one per screen. Reached from a
   document that can't be filed yet; nothing here is guessed or prefilled. */
import { useState } from 'react';
import { missingFacts } from './lib/config';
import { setDealerFacts, useStore } from './store';
import { Ic, feel } from './ui';

const ASK: Record<string, { q: string; ph: string; key: 'street' | 'city' | 'zip' | 'county' | 'phone' | 'licence' | 'legalName' | 'signer' }> = {
  'Legal name': { q: 'What Is The Legal Name?', ph: 'As on the dealer licence', key: 'legalName' },
  Street: { q: 'What Is The Street Address?', ph: 'Street address', key: 'street' },
  City: { q: 'What City?', ph: 'City', key: 'city' },
  ZIP: { q: 'What ZIP?', ph: 'ZIP', key: 'zip' },
  County: { q: 'What County?', ph: 'County', key: 'county' },
  Phone: { q: 'What Is The Dealership Phone?', ph: '(713) 555-0100', key: 'phone' },
  'Dealer licence (GDN)': { q: 'What Is The Dealer Licence?', ph: 'P123456', key: 'licence' },
  'Authorised signer': { q: 'Who Signs For The Dealership?', ph: 'Full name', key: 'signer' },
};

export function Facts() {
  const { dealer } = useStore();
  const left = missingFacts(dealer).filter(k => ASK[k]), cur = left[0];
  const [val, setVal] = useState('');
  const back = <div className="top"><button className="back" onClick={() => { feel.tap(); history.back(); }}><Ic n="chev" s={18} w={2.4} />Back</button></div>;
  if (!cur) return (
    <main className="wrap center">{back}
      <section className="enter" key="done"><h1 className="q">Every fact <em>is set.</em></h1><p className="note">The paperwork can be filed.</p></section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); history.back(); }}>Back To The Paperwork</button></div></div>
    </main>
  );
  const a = ASK[cur];
  const save = () => {
    const v = val.trim(); if (!v) return;
    feel.next();
    setDealerFacts(a.key === 'signer' ? { signer: { name: v, title: dealer.signer?.title || 'Owner' } } : { [a.key]: v });
    setVal('');
  };
  return (
    <main className="wrap center">{back}
      <section className="enter" key={cur}>
        <p className="cap">For the paperwork · {left.length} to go</p>
        <h1 className="q">{a.q}</h1>
        <label className="field"><input className="input big" autoFocus value={val} placeholder={a.ph} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} aria-label={cur} /></label>
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" disabled={!val.trim()} onClick={save}>Continue</button></div></div>
    </main>
  );
}
