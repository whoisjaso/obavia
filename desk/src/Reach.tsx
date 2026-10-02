/* Reach: every channel a car can be posted to, each with how it really
   connects. Marketplace posting is opt-in, one term per screen, then a typed name. */
import { useState } from 'react';
import { MARKETPLACE_TERMS, consentIsCurrent, isSignatureName } from './lib/consent';
import { CHANNELS, GROUP_TITLE, HOW_LABEL, channelById, type Channel } from './lib/reach';
import { acceptMarketplace, toggleReachWanted, useStore, withdrawMarketplace } from './store';
import { Back, Ic, feel, go, transition } from './ui';

const when = (iso: string, tz: string) => new Date(iso).toLocaleString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const GROUP_Q: Record<Channel['group'], string> = { phone: 'From Your Phone', social: 'Social', listings: 'Car Sites', yours: 'Your Website' };

const Logo = ({ c, size = 'sm' }: { c: Channel; size?: 'sm' | 'lg' }) => (
  <span className={`clogo ${size}${c.wide ? ' wide' : ''}`}>{c.logo ? <img src={c.logo} alt="" /> : <Ic n="globe" s={size === 'lg' ? 40 : 24} w={1.7} />}</span>
);

/* ---------- 1. Where should your cars go? ---------- */
export function Reach() {
  const { consents, reachWanted = [] } = useStore();
  const on = consentIsCurrent(consents?.marketplace, MARKETPLACE_TERMS);
  const picked = (c: Channel) => (c.id === 'marketplace' ? on : reachWanted.includes(c.id));
  const groups = Object.keys(GROUP_TITLE) as Channel['group'][];
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <section className="enter" key="reach">
        <h1 className="q">Where Should Your Cars Go?</h1>
        <div className="choices">
          {groups.map(g => { const cs = CHANNELS.filter(c => c.group === g), n = cs.filter(picked).length; return (
            <a key={g} className="choice" href={`#/reach/g/${g}`} onClick={feel.next}>
              <span className="logos">{(cs.some(c => !c.wide && c.logo) ? cs.filter(c => !c.wide && c.logo) : cs.slice(0, 1)).slice(0, 3).map(c => <Logo key={c.id} c={{ ...c, wide: false, logo: c.wide ? '' : c.logo }} />)}</span>
              <span className="t"><b>{GROUP_TITLE[g]}</b>{n > 0 && <small>{n} picked</small>}</span>
              <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
            </a>); })}
        </div>
        <p className="hint">Facebook Page, Instagram and TikTok post through their official apps. Marketplace, Craigslist and OfferUp come ready on your phone.</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/reach/post'); }}><Ic n="sparkle" s={20} />Post A Car</button></div></div>
      </section>
    </main>
  );
}

/* ---------- 2. One group: tap to pick ---------- */
export function ReachGroup({ group }: { group: Channel['group'] }) {
  const { consents, reachWanted = [] } = useStore();
  const on = consentIsCurrent(consents?.marketplace, MARKETPLACE_TERMS);
  const cs = CHANNELS.filter(c => c.group === group);
  if (!cs.length) return <Reach />;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/reach" label="Reach" /></div>
      <section className="enter" key={group}>
        <h1 className="q">{GROUP_Q[group]}</h1>
        <div className="choices">
          {cs.map(c => { const sel = c.id === 'marketplace' ? on : reachWanted.includes(c.id); return (
            <button key={c.id} className="choice" aria-pressed={sel} onClick={() => { feel.tap(); if (c.id === 'marketplace') go('/reach/marketplace'); else toggleReachWanted(c.id); }}>
              <Logo c={c} />
              <span className="t"><b>{c.name}</b><small>{c.price}</small></span>
              <span className="tick">{sel && <Ic n="check" s={15} w={3} />}</span>
            </button>); })}
        </div>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); go('/reach'); }}>Done</button></div></div>
      </section>
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
        <Logo c={c} size="lg" />
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
