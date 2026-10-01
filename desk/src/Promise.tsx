/* "I'll be in Monday with $250": two taps. The account then works from the
   promise; the buyer gets one reminder that morning, and a broken promise goes
   to the top of the owner's list. */
import { useState } from 'react';
import { addDays, amountToAsk, money, standing, today } from './lib/loans';
import { openPromise, paidToward, promiseDays } from './lib/promise';
import { parseMoney } from './lib/money';
import { first, nice } from './Payments';
import { addPromise, removePromise, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

export function PromiseSetup({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const t = today(dealer.timeZone);
  const open = l && openPromise(l, t);
  const [step, setStep] = useState<'show' | 'when' | 'much' | 'other' | 'done'>(open ? 'show' : 'when');
  const [on, setOn] = useState('');
  const [amt, setAmt] = useState('');
  if (!l) { go('/payments'); return null; }
  const s = standing(l, t), owe = amountToAsk(s);
  const to = (x: typeof step) => transition(() => { setStep(x); scrollTo(0, 0); });
  const save = (cents: number) => { feel.done(); addPromise(l.id, { made: t, on, cents }); to('done'); };
  const back = <div className="top">{step === 'much' || step === 'other' ? <button className="back" onClick={() => { feel.tap(); to(step === 'other' ? 'much' : 'when'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to={`#/payments/${l.id}`} label={first(l.buyer.name)} />}</div>;
  const label = (d: string) => d === t ? 'Today' : d === addDays(t, 1) ? 'Tomorrow' : nice(d, { weekday: 'long', month: 'short', day: 'numeric' });

  if (step === 'show' && open) {
    const paid = paidToward(l, open);
    return (
      <main className="wrap center">{back}
        <section className="enter" key="show">
          <p className="big-amount num">{money(open.cents)}</p>
          <h1 className="q">Promised {open.on === t ? 'Today.' : `${label(open.on)}.`}</h1>
          <p className="note">{paid ? `${money(paid)} in so far · ` : ''}Late texts wait for it. One reminder that morning.</p>
          <div className="dock"><div className="in">
            <button className="btn primary block" onClick={() => { feel.next(); go(`/payments/${l.id}`); }}>Done</button>
            <button className="textlink" onClick={() => { feel.tap(); setOn(''); to('when'); }}>They Changed It</button>
            <button className="textlink" onClick={() => { feel.tap(); removePromise(l.id, open.id); go(`/payments/${l.id}`); }}>Remove It</button>
          </div></div>
        </section>
      </main>
    );
  }
  if (step === 'when') return (
    <main className="wrap center">{back}
      <section className="enter" key="when">
        <h1 className="q">When Will {first(l.buyer.name)} Pay?</h1>
        <div className="choices">
          {promiseDays(t, l.autopay?.payday).map(d => <button key={d} className="choice" onClick={() => { feel.next(); setOn(d); to('much'); }}>
            <span className="t"><b>{label(d)}</b>{l.autopay?.payday !== undefined && new Date(d + 'T12:00:00Z').getUTCDay() === l.autopay.payday && d !== t ? <small>Their payday</small> : null}</span>
            <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
          </button>)}
        </div>
        <label className="field"><input className="input" type="date" min={t} aria-label="Another day" value={on} onChange={e => { setOn(e.target.value); if (e.target.value) to('much'); }} /></label>
      </section>
    </main>
  );
  if (step === 'much') return (
    <main className="wrap center">{back}
      <section className="enter" key="much">
        <h1 className="q">How Much, {label(on)}?</h1>
        <div className="choices">
          <button className="choice" onClick={() => save(owe)}><span className="t"><b>{money(owe)}</b><small>{s.status === 'late' ? 'Everything they’re behind' : 'What’s due'}</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
          {owe !== l.paymentCents && <button className="choice" onClick={() => save(l.paymentCents)}><span className="t"><b>{money(l.paymentCents)}</b><small>One payment</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>}
          <button className="choice" onClick={() => { feel.next(); to('other'); }}><span className="t"><b>Another Amount</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
        </div>
      </section>
    </main>
  );
  if (step === 'other') {
    const cents = Math.round((parseMoney(amt) ?? 0) * 100);
    return (
      <main className="wrap center">{back}
        <section className="enter" key="other">
          <h1 className="q">How Much?</h1>
          <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label="Amount promised" /></div>
          <div className="dock"><div className="in"><button className="btn primary block" disabled={!(cents > 0)} onClick={() => save(cents)}>Save The Promise</button></div></div>
        </section>
      </main>
    );
  }
  const p = openPromise(l, t);
  return (
    <main className="wrap center">{back}
      <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Promise Saved.</h1>
        <p className="note">{p ? `${money(p.cents)} ${p.on === t ? 'today' : p.on === addDays(t, 1) ? 'tomorrow' : 'on ' + label(p.on)}. We’ll remind ${first(l.buyer.name)} that morning, and tell you if it doesn’t come.` : ''}</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); go(`/payments/${l.id}`); }}>Done</button></div></div>
      </section>
    </main>
  );
}
