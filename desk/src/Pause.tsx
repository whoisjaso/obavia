/* Pause payments: which payments, how many, see what it changes, save. The
   paused payments move to the end of the note. Owners only. */
import { useState } from 'react';
import { money, standing, today } from './lib/loans';
import { activePause, pauseText, previewPause } from './lib/pause';
import { can } from './lib/staff';
import { first, nice, plural } from './Payments';
import { addPause, endPause, me, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

const long = (d: string) => nice(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export function PauseSetup({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const t = today(dealer.timeZone);
  const live = l && activePause(l, t);
  const [step, setStep] = useState<'show' | 'from' | 'count' | 'check' | 'done'>(live ? 'show' : 'from');
  const [from, setFrom] = useState('');
  const [count, setCount] = useState(0);
  if (!l) { go('/payments'); return null; }
  const to = (x: typeof step) => transition(() => { setStep(x); scrollTo(0, 0); });
  const back = <div className="top">{step === 'count' || step === 'check' ? <button className="back" onClick={() => { feel.tap(); to(step === 'check' ? 'count' : 'from'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to={`#/payments/${l.id}`} label={first(l.buyer.name)} />}</div>;

  if (!can(me(), 'pause')) return (
    <main className="wrap center">{back}
      <section className="enter" key="owner"><h1 className="q">Ask An Owner.</h1><p className="note">Only an owner can pause payments.</p></section>
    </main>
  );
  if (step === 'show' && live) return (
    <main className="wrap center">{back}
      <section className="enter" key="show">
        <h1 className="q">Paused{live.resume ? ` Until ${nice(live.resume)}.` : '.'}</h1>
        <p className="note">{plural(live.days.length, 'payment')} moved to the end: {live.days.map(d => nice(d)).join(', ')}</p>
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.next(); go(`/payments/${l.id}`); }}>Done</button>
          <button className="textlink" onClick={() => { feel.tap(); endPause(l.id, live.pause.id); go(`/payments/${l.id}`); }}>End The Pause</button>
        </div></div>
      </section>
    </main>
  );

  const s = standing(l, t), unpaid = s.installments.filter(i => i.paidCents < i.cents);
  const oldest = unpaid[0], nextUp = unpaid.find(i => i.due >= t);
  const starts = [oldest, nextUp].filter((x, i, a) => x && a.findIndex(y => y?.n === x.n) === i) as typeof unpaid;
  if (step === 'from') return (
    <main className="wrap center">{back}
      <section className="enter" key="from">
        <h1 className="q">Pause Starting With?</h1>
        <div className="choices">{starts.map(i => <button key={i.n} className="choice" onClick={() => { feel.next(); setFrom(i.due); to('count'); }}>
          <span className="t"><b>{i.due < t ? 'The Late One' : 'The Next One'}</b><small>{money(i.cents - i.paidCents)} · {nice(i.due)}{i.due < t ? ` · ${plural(s.daysLate, 'day')} late` : ''}</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span>
        </button>)}</div>
        {!starts.length && <p className="note">Nothing left to pause.</p>}
      </section>
    </main>
  );
  if (step === 'count') return (
    <main className="wrap center">{back}
      <section className="enter" key="count">
        <h1 className="q">How Many Payments?</h1>
        <div className="choices">{[1, 2, 3, 4].map(n => { const p = previewPause(l, from, n, t); return (
          <button key={n} className="choice" onClick={() => { feel.next(); setCount(n); to('check'); }}>
            <span className="t"><b>{plural(n, 'Payment')}</b>{p.resume && <small>Back on {nice(p.resume)}</small>}</span><span className="go"><Ic n="chev" s={18} w={2.4} /></span>
          </button>); })}</div>
      </section>
    </main>
  );
  const p = previewPause(l, from, count, t);
  if (step === 'check') return (
    <main className="wrap center">{back}
      <section className="enter" key="check">
        <h1 className="q">Back On {p.resume ? nice(p.resume) : 'Schedule'}.</h1>
        <p className="note">The note now ends {long(p.lastAfter)} instead of {long(p.lastBefore)}.{p.extraAtEnd ? ` Interest keeps running, about ${money(p.extraAtEnd)} more by the end.` : ''} No fee for pausing.</p>
        {p.pausesThisYear > 0 && <p className="note"><span className="status warn">{plural(p.pausesThisYear, 'pause')} in the last year</span></p>}
        <div className="sms"><small>{first(l.buyer.name)} gets</small><span className="bubble">{pauseText(l, p.resume, dealer.dba || dealer.legalName)}</span></div>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); addPause(l.id, from, count, t); to('done'); }}>Pause {plural(count, 'Payment')}</button></div></div>
      </section>
    </main>
  );
  return (
    <main className="wrap center">{back}
      <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Paused.</h1>
        <p className="note">No reminders or late charges until {p.resume ? nice(p.resume) : 'the end'}. {first(l.buyer.name)} gets the text.</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); go(`/payments/${l.id}`); }}>Done</button></div></div>
      </section>
    </main>
  );
}
