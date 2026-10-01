/* Money from outside the processor, one at a time: Zelle, Cash App, Venmo,
   checks and cash deposits, read from the bank feed and receipt emails.
   Each page asks one question, "Whose payment is this?", and the best
   guess is the next tap. */
import { useState } from 'react';
import { METHOD_LABEL, money, paymentTexts, standing, today } from './lib/loans';
import { inbox, type Suggestion } from './lib/match';
import { Go, nice } from './Payments';
import { dismissMoney, getLoans, matchMoney, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

const first = (n: string) => n.split(' ')[0];
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const fromLine = (s: Suggestion) => [METHOD_LABEL[s.money.rail ?? 'other'], s.money.from ? title(s.money.from) : s.money.source === 'bank' ? 'No name on it' : '', nice(s.money.on)].filter(Boolean).join(' · ');

function useInbox() {
  const { dealer, loans = [], money: all = [], matched = {}, payers } = useStore();
  return { t: today(dealer.timeZone), loans, box: inbox(all, loans, today(dealer.timeZone), matched, payers), dealer, matched };
}

export function MatchList() {
  const { loans, box } = useInbox();
  const name = (id?: string) => loans.find(l => l.id === id)?.buyer.name;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="match">
        <h1 className="q">To Match.</h1>
        <div className="choices">
          {box.map(s => <Go key={s.money.id} to={`/payments/match/${encodeURIComponent(s.money.id)}`} tone={s.verdict === 'sure' ? 'good' : s.verdict === 'likely' ? 'warn' : undefined} icon="bank"
            label={`${money(s.money.cents)} · ${METHOD_LABEL[s.money.rail ?? 'other']}`} gloss={s.best && s.verdict !== 'unsure' ? `${name(s.best.loanId)}?` : 'Who sent this?'} />)}
        </div>
        {!box.length && <p className="note">All matched.</p>}
      </section>
    </main>
  );
}

export function MatchOne({ id }: { id: string }) {
  const { t, loans, box, dealer, matched } = useInbox();
  const [done, setDone] = useState<{ loanId: string; receipt: number } | null>(() => { const m = matched[id]; return m?.loanId && m.receipt ? { loanId: m.loanId, receipt: m.receipt } : null; });
  const [pick, setPick] = useState(false);
  const [seeTexts, setSeeTexts] = useState(false);
  const s = box.find(x => x.money.id === id);
  const next = box.find(x => x.money.id !== id);
  const after = () => go(next ? `/payments/match/${encodeURIComponent(next.money.id)}` : '/payments');

  if (done) {
    const l = getLoans().find(x => x.id === done.loanId)!, p = l.payments.find(x => x.receipt === done.receipt)!;
    const tx = paymentTexts('received', l, p.cents, standing(l, t), dealer.dba, p.receipt);
    return (
      <main className="wrap center">
        <div className="top"><Back to="#/payments/match" label="To Match" /></div>
        <section className="enter" key="done">
          <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
          <h1 className="q">Recorded.</h1>
          <p className="note">Receipt #{p.receipt} · texted to {first(l.buyer.name)} and you</p>
          {!seeTexts ? <button className="textlink" onClick={() => { feel.tap(); setSeeTexts(true); }}>See The Texts</button>
            : <div className="sms two"><small>{first(l.buyer.name)}</small><span className="bubble">{tx.buyer}</span><small>You</small><span className="bubble you">{tx.dealer}</span></div>}
          <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); after(); }}>{next ? 'Next' : 'Done'}</button></div></div>
        </section>
      </main>
    );
  }
  if (!s) return <MatchList />;

  const best = s.best && s.verdict !== 'unsure' ? loans.find(l => l.id === s.best!.loanId) : undefined;
  const choices = [s.best, ...s.others].filter(Boolean).map(c => loans.find(l => l.id === c!.loanId)!).filter(l => l !== best);
  const confirm = (loanId: string) => transition(() => { feel.done(); setDone({ loanId, receipt: matchMoney(s.money, loanId) }); scrollTo(0, 0); });
  const notOurs = () => { feel.tap(); dismissMoney(s.money.id); after(); };

  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/match" label="To Match" /></div>
      <section className="enter" key={id + (pick ? 'pick' : '')}>
        <p className="big-amount num">{money(s.money.cents)}</p>
        <p className="note">{fromLine(s)}</p>
        {best && !pick ? <>
          <h1 className="q">{best.buyer.name}?</h1>
          {s.best!.why.length > 0 && <p className="note">{s.best!.why.join(' · ')}</p>}
          <div className="choices">
            <button className="choice" onClick={() => { feel.tap(); setPick(true); }}><span className="t"><b>Someone Else</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
            <button className="choice" onClick={notOurs}><span className="t"><b>Not A Car Payment</b></span></button>
          </div>
          <div className="dock"><div className="in"><button className="btn primary block" onClick={() => confirm(best.id)}>Yes, {first(best.buyer.name)}’s</button></div></div>
        </> : <>
          <h1 className="q">Whose Is It?</h1>
          <div className="choices">
            {(pick && best ? [best, ...choices] : choices).map(l => <button key={l.id} className="choice" onClick={() => confirm(l.id)}><span className="t"><b>{l.buyer.name}</b><small>{money(l.paymentCents)} · {l.vehicle.split(' · ')[0]}</small></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>)}
            <button className="choice" onClick={notOurs}><span className="t"><b>Not A Car Payment</b></span></button>
          </div>
        </>}
      </section>
    </main>
  );
}
