/* Repairs and fees on a note: see what's owed beside the car payment, add a
   repair or a recurring fee one question at a time, stop a fee. */
import { useState } from 'react';
import { extraDue, paidTo, repairLeft, type Extra } from './lib/extras';
import { addDays, money, standing, today } from './lib/loans';
import { parseMoney } from './lib/money';
import { first, nice } from './Payments';
import { addExtra, removeExtra, stopExtra, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

type Step = 'list' | 'kind' | 'what' | 'much' | 'how' | 'each' | 'done';
const FEES = ['GPS service', 'Insurance coverage'];

export function Extras({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const t = today(dealer.timeZone);
  const [step, setStep] = useState<Step>('list');
  const [kind, setKind] = useState<Extra['kind']>('repair');
  const [what, setWhat] = useState('');
  const [amt, setAmt] = useState('');
  const [each, setEach] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  if (!l) { go('/payments'); return null; }
  const s = standing(l, t), cents = Math.round((parseMoney(amt) ?? 0) * 100), eachC = Math.round((parseMoney(each) ?? 0) * 100);
  const to = (x: Step) => transition(() => { setStep(x); scrollTo(0, 0); });
  const save = (e: Omit<Extra, 'id'>) => { feel.done(); addExtra(l.id, e); to('done'); };
  const prev: Partial<Record<Step, Step>> = { kind: 'list', what: 'kind', much: 'what', how: 'much', each: 'how' };
  const top = <div className="top">{step !== 'list' && step !== 'done' ? <button className="back" onClick={() => { feel.tap(); to(prev[step]!); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to={`#/payments/${l.id}/more`} label="The Note" />}</div>;
  const list = l.extras ?? [];

  if (step === 'list') return (
    <main className="wrap center">{top}
      <section className="enter" key="list">
        <h1 className="q">{list.length ? 'Repairs And Fees.' : 'Nothing Extra.'}</h1>
        <p className="note">{list.length ? 'Each payment pays the car first, then these.' : `Add a repair ${first(l.buyer.name)} owes, or a fee the contract allows.`}</p>
        {list.length > 0 && <div className="list-plain stack">{list.map(e => {
          const due = extraDue(l, e, s), left = repairLeft(l, e), paid = paidTo(l, e.id);
          return <div key={e.id}>
            <b>{e.what}{e.stop && e.stop <= t ? ' · stopped' : ''}</b>
            <span className="num">{e.kind === 'fee' ? `${money(e.cents)} each payment · since ${nice(e.on)}` : `${money(left)} left of ${money(e.cents)}${e.perPayment ? ` · ${money(e.perPayment)} each payment` : ' · paid on its own'}`}{due ? ` · ${money(due)} due` : ''}</span>
            <small>{open === e.id
              ? (e.kind === 'fee' && !e.stop ? <button className="textlink undo" onClick={() => { feel.tap(); stopExtra(l.id, e.id, t); setOpen(null); }}>Stop It From Today</button>
                : paid === 0 ? <button className="textlink undo" onClick={() => { feel.tap(); removeExtra(l.id, e.id); setOpen(null); }}>Remove It</button> : <span>Paid toward, so it stays on record</span>)
              : <button className="textlink" onClick={() => { feel.tap(); setOpen(e.id); }}>Change</button>}</small>
          </div>;
        })}</div>}
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); setWhat(''); setAmt(''); setEach(''); to('kind'); }}>Add A Repair Or Fee</button></div></div>
      </section>
    </main>
  );
  if (step === 'kind') return (
    <main className="wrap center">{top}
      <section className="enter" key="kind">
        <h1 className="q">What Are You Adding?</h1>
        <div className="choices">
          <button className="choice" onClick={() => { feel.next(); setKind('repair'); to('what'); }}><span className="t"><b>A Repair</b><small>Work they owe for, paid off over time</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
          <button className="choice" onClick={() => { feel.next(); setKind('fee'); to('what'); }}><span className="t"><b>A Recurring Fee</b><small>Added to every payment, like GPS service</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
        </div>
      </section>
    </main>
  );
  if (step === 'what') return (
    <main className="wrap center">{top}
      <section className="enter" key="what">
        <h1 className="q">{kind === 'repair' ? 'What Was Fixed?' : 'What’s The Fee For?'}</h1>
        {kind === 'fee' && <div className="choices">{FEES.map(f => <button key={f} className="choice" aria-pressed={what === f} onClick={() => { feel.next(); setWhat(f); to('much'); }}><span className="t"><b>{f}</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>)}</div>}
        <label className="field"><input className="input" autoFocus={kind === 'repair'} value={FEES.includes(what) ? '' : what} onChange={e => setWhat(e.target.value)} placeholder={kind === 'repair' ? 'Transmission repair' : 'Something else'} aria-label="What" /></label>
        {kind === 'fee' && <p className="note">Only fees the contract allows.</p>}
        <div className="dock"><div className="in"><button className="btn primary block" disabled={what.trim().length < 2} onClick={() => { feel.next(); to('much'); }}>Next</button></div></div>
      </section>
    </main>
  );
  if (step === 'much') return (
    <main className="wrap center">{top}
      <section className="enter" key="much">
        <h1 className="q">{kind === 'repair' ? 'How Much Do They Owe?' : 'How Much Each Payment?'}</h1>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label="Amount" /></div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!(cents > 0)} onClick={() => {
          if (kind === 'fee') save({ kind, what: what.trim(), cents, on: addDays(t, 1) });
          else { feel.next(); to('how'); }
        }}>{kind === 'fee' ? `Add ${money(cents)} To Each Payment` : 'Next'}</button></div></div>
      </section>
    </main>
  );
  const sugg = [...new Set([Math.round(cents / 4 / 500) * 500, Math.round(cents / 8 / 500) * 500, Math.round(cents / 12 / 500) * 500].filter(c => c >= 500 && c < cents))].slice(0, 3);
  if (step === 'how') return (
    <main className="wrap center">{top}
      <section className="enter" key="how">
        <h1 className="q">How Will {first(l.buyer.name)} Pay It?</h1>
        <div className="choices">
          {sugg.map(c => <button key={c} className="choice" onClick={() => save({ kind, what: what.trim(), cents, on: addDays(t, 1), perPayment: c })}><span className="t"><b>{money(c)} More Each Payment</b><small>Paid off in {Math.ceil(cents / c)} payments</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>)}
          <button className="choice" onClick={() => { feel.next(); to('each'); }}><span className="t"><b>Another Amount Each Payment</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
          <button className="choice" onClick={() => save({ kind, what: what.trim(), cents, on: t })}><span className="t"><b>On Its Own</b><small>Whenever they bring it</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
        </div>
      </section>
    </main>
  );
  if (step === 'each') return (
    <main className="wrap center">{top}
      <section className="enter" key="each">
        <h1 className="q">How Much Each Payment?</h1>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={each} onChange={e => setEach(e.target.value)} placeholder="0" aria-label="Each payment" /></div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!(eachC > 0) || eachC > cents} onClick={() => save({ kind, what: what.trim(), cents, on: addDays(t, 1), perPayment: eachC })}>Add {money(eachC)} To Each Payment</button></div></div>
      </section>
    </main>
  );
  return (
    <main className="wrap center">{top}
      <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Added.</h1>
        <p className="note">{kind === 'fee' ? `${money(cents)} ${what.trim()} with each payment from the next one.` : `${money(cents)} ${what.trim()} on ${first(l.buyer.name)}’s account.`} Reminders, autopay and the payment link include it.</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); to('list'); }}>Done</button></div></div>
      </section>
    </main>
  );
}
