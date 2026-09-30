/* Reach: where the dealer turns on what posts and follows up for them.
   Marketplace posting is opt-in, one term per screen, then a typed name. */
import { useState } from 'react';
import { MARKETPLACE_TERMS, consentIsCurrent, isSignatureName } from './lib/consent';
import { acceptMarketplace, useStore, withdrawMarketplace } from './store';
import { Back, Chev, Ic, feel, go, transition } from './ui';

const when = (iso: string, tz: string) => new Date(iso).toLocaleString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function Reach() {
  const { consents } = useStore();
  const on = consentIsCurrent(consents?.marketplace, MARKETPLACE_TERMS);
  return (
    <main className="wrap">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <h1 className="h1 enter">Reach</h1>
      <p className="note" style={{ margin: '10px 0 0', font: '500 16px/1.45 var(--sans)', color: 'var(--muted)' }}>Post each car once. Reach puts it everywhere.</p>
      <div className="group enter2">
        <a className="row" href="#/reach/marketplace" onClick={feel.tap}>
          <span className="art fb"><img src="./systems/facebook.png" alt="" /></span>
          <span className="t"><b>Facebook Marketplace</b><small>{on ? 'On. You post from your own phone.' : 'Off. Tap to turn it on.'}</small></span>
          <span className={'status' + (on ? ' good' : '')}>{on ? 'On' : 'Off'}</span><Chev />
        </a>
      </div>
    </main>
  );
}

export function MarketplaceConsent() {
  const { consents, dealer } = useStore();
  const c = consents?.marketplace;
  const on = consentIsCurrent(c, MARKETPLACE_TERMS);
  const T = MARKETPLACE_TERMS.terms;
  const [i, setI] = useState(0);
  const [name, setName] = useState('');
  const to = (n: number, d: 'fwd' | 'back' = 'fwd') => transition(() => { setI(n); scrollTo(0, 0); }, d);
  const total = T.length + 1;

  if (on && c) return (
    <main className="wrap center">
      <div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key="on">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Marketplace Posting Is On.</h1>
        <p className="note">Agreed by {c.name} on {when(c.at, c.timeZone)}. Terms {c.version}.</p>
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.done(); go('/reach'); }}>Done</button>
          <button className="textlink" onClick={() => { feel.tap(); withdrawMarketplace(); }}>Turn It Off</button>
        </div></div>
      </section>
    </main>
  );

  return (
    <main className="wrap center">
      <div className="top">
        {i ? <button className="back" onClick={() => { feel.tap(); to(i - 1, 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to="#/reach" label="Reach" />}
        <span className="progress">{Math.min(i + 1, total)} of {total}</span>
      </div>
      <div className="bar"><i style={{ width: `${(Math.min(i + 1, total) / total) * 100}%` }} /></div>

      {i < T.length ? <section className="enter" key={i}>
        <h1 className="q">{T[i].title}</h1>
        <p className="note big">{T[i].body}</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); to(i + 1); }}>{T[i].ack}</button></div></div>
      </section> : <section className="enter" key="agree">
        <h1 className="q">Sign To Turn It On.</h1>
        <p className="note big">“{MARKETPLACE_TERMS.agreement}”</p>
        <label className="field"><input className="input big" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name" autoComplete="name" /></label>
        <p className="hint">For {dealer.dba} · Licence {dealer.licence}</p>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!isSignatureName(name)} onClick={() => { feel.done(); acceptMarketplace(name); scrollTo(0, 0); }}>I Agree</button></div></div>
      </section>}
    </main>
  );
}
