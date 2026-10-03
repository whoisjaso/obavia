/* The car's condition as signed at the sale, and every complaint since.
   When a buyer says "it broke, so I'm not paying", this page is the answer. */
import { useState } from 'react';
import { knownAtSale, since, standingLine } from './lib/condition';
import { today } from './lib/loans';
import { first, nice } from './Payments';
import { addService, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

export function ConditionPage({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [step, setStep] = useState<'view' | 'what' | 'miles'>('view');
  const [what, setWhat] = useState(''), [miles, setMiles] = useState('');
  if (!l) { go('/payments'); return null; }
  const c = l.condition, t = today(dealer.timeZone), log = [...(l.service ?? [])].sort((a, b) => b.on.localeCompare(a.on));
  const to = (s: typeof step, d: 'fwd' | 'back' = 'fwd') => transition(() => { setStep(s); scrollTo(0, 0); }, d);
  const save = (m: number | null) => { feel.done(); addService(l.id, { on: t, miles: m, what: what.trim(), kind: 'complaint' }); setWhat(''); setMiles(''); to('view', 'back'); };
  const top = <div className="top">{step === 'view' ? <Back to={`#/payments/${l.id}`} label={first(l.buyer.name)} /> : <button className="back" onClick={() => { feel.tap(); to(step === 'miles' ? 'what' : 'view', 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button>}</div>;

  if (step === 'what') return (
    <main className="wrap center">{top}
      <section className="enter" key="what">
        <h1 className="q">What’s Wrong With It?</h1>
        <div className="field"><input className="input" autoFocus placeholder="In their words" value={what} onChange={e => setWhat(e.target.value)} aria-label="Complaint" /></div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={what.trim().length < 3} onClick={() => { feel.next(); to('miles'); }}>Continue</button></div></div>
      </section>
    </main>
  );
  if (step === 'miles') return (
    <main className="wrap center">{top}
      <section className="enter" key="miles">
        <h1 className="q">Miles On It Now?</h1>
        <div className="field"><input className="input num" inputMode="numeric" autoFocus placeholder="Odometer" value={miles} onChange={e => setMiles(e.target.value.replace(/\D/g, '').slice(0, 7))} aria-label="Odometer" /></div>
        {c?.miles != null && Number(miles) > 0 && Number(miles) < c.miles && <p className="note bad">That’s less than the {c.miles.toLocaleString()} miles at sale.</p>}
        <div className="dock"><div className="in">
          <button className="btn primary block" disabled={!miles} onClick={() => save(Number(miles))}>Save</button>
          <button className="textlink" onClick={() => save(null)}>They Don’t Know</button>
        </div></div>
      </section>
    </main>
  );

  return (
    <main className="wrap center">{top}
      <section className="enter" key="view">
        {c ? <>
          <h1 className="q">{c.asIs ? 'Sold As-Is.' : 'Sold With A Warranty.'}</h1>
          <p className="note">Signed {nice(c.signedOn)}{c.miles != null ? ` · ${c.miles.toLocaleString()} miles` : ''}{c.drove ? ' · test drove it' : ''}</p>
          <p className="standing">{standingLine(c)}</p>
          {(c.known || c.lights) && <div className="list-plain stack">
            {c.known && <div><b>Not working at sale</b><span>{c.known}</span></div>}
            {c.lights && <div><b>Warning lights at sale</b><span>{c.lights}</span></div>}
          </div>}
          {c.photos.length > 0 && <div className="photo-row">{c.photos.map((p, i) => <img key={i} src={p} alt={`Photo ${i + 1} at sale`} />)}</div>}
        </> : <>
          <h1 className="q">No Condition Report.</h1>
          <p className="note">This sale was made before the Desk.</p>
        </>}
        {log.length > 0 && <>
          <h2 className="sub">Since The Sale</h2>
          <div className="list-plain stack">
            {log.map((e, i) => <div key={i}><b>{e.what}</b><span>{c ? since(c, e) : nice(e.on)}</span>{c && knownAtSale(c, e.what) && <small><span className="status warn">Known at sale</span></small>}</div>)}
          </div>
        </>}
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); to('what'); }}>Add A Complaint</button></div></div>
      </section>
    </main>
  );
}
