/* Reach: every channel a car can be posted to, each with how it really
   connects. Marketplace posting is opt-in, one term per screen, then a typed name. */
import { useState } from 'react';
import { MARKETPLACE_TERMS, consentIsCurrent, isSignatureName } from './lib/consent';
import { CHANNELS, GROUP_TITLE, HOW_LABEL, channelById, type Channel } from './lib/reach';
import { acceptMarketplace, toggleReachWanted, useStore, withdrawMarketplace } from './store';
import { Back, Ic, feel, go, transition } from './ui';

const when = (iso: string, tz: string) => new Date(iso).toLocaleString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function Reach() {
  const { consents, reachWanted = [] } = useStore();
  const on = consentIsCurrent(consents?.marketplace, MARKETPLACE_TERMS);
  const groups = Object.keys(GROUP_TITLE) as Channel['group'][];
  const state = (c: Channel) => (c.id === 'marketplace' && on ? 'on' : reachWanted.includes(c.id) ? 'wanted' : 'off');
  return (
    <main className="wrap">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <h1 className="h1 enter">Reach</h1>
      <p className="lede enter">Post each car once. Reach puts it everywhere you choose.</p>
      <p className="soon-note enter2"><Ic n="sparkle" s={16} />Reach is being built. Tap what you want, and it turns on as each one is ready.</p>
      {groups.map(g => <section key={g}>
        <h2 className="h2">{GROUP_TITLE[g]}</h2>
        <div className="channels">
          {CHANNELS.filter(c => c.group === g).map((c, k) => { const st = state(c); return (
            <a key={c.id} className={`channel ${st}`} style={{ ['--k' as string]: k }} href={c.id === 'marketplace' ? '#/reach/marketplace' : `#/reach/${c.id}`} onClick={feel.tap}>
              <span className={'logo' + (c.wide ? ' wide' : '')}>{c.logo ? <img src={c.logo} alt="" /> : <Ic n="globe" s={30} w={1.7} />}</span>
              <b>{c.name}</b>
              <small>{HOW_LABEL[c.how]}</small>
              <span className={'pill ' + st}>{st === 'on' ? 'On' : st === 'wanted' ? 'Wanted' : 'Tap to want'}</span>
            </a>); })}
        </div>
      </section>)}
    </main>
  );
}

export function Channel({ id }: { id: string }) {
  const { reachWanted = [] } = useStore();
  const c = channelById(id);
  if (!c) return <Reach />;
  const wanted = reachWanted.includes(c.id);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key={c.id}>
        <span className={'channel-logo' + (c.wide ? ' wide' : '')}>{c.logo ? <img src={c.logo} alt="" /> : <Ic n="globe" s={44} w={1.6} />}</span>
        <h1 className="q">{c.name}</h1>
        <p className="note big">{c.what}</p>
        <div className="facts-list">
          <div><small>How</small><b>{HOW_LABEL[c.how]}</b></div>
          <div><small>Cost</small><b>{c.cost}</b></div>
          <div><small>You need</small><b>{c.need}</b></div>
        </div>
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.done(); toggleReachWanted(c.id); }}>{wanted ? 'Wanted. We’ll Tell You When It’s Ready' : 'I Want This'}</button>
          {wanted && <button className="textlink" onClick={() => { feel.tap(); toggleReachWanted(c.id); }}>Not Now</button>}
        </div></div>
      </section>
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
