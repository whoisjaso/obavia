/* Cash at the counter, the one payment with no signal: one tap to record it,
   then the receipt text, the drawer count and the bank deposit check it. */
import { useState } from 'react';
import { cashOn, dayState, expected, withBanking, type DayState } from './lib/cashday';
import { money, paymentTexts, standing, today } from './lib/loans';
import { parseMoney } from './lib/money';
import { first, nice, plural } from './Payments';
import { closeCashDay, recordPayment, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

/* ---------- Took cash? ---------- */
export function CashTaken({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const t = today(dealer.timeZone);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [seeTexts, setSeeTexts] = useState(false);
  const e = expected(loans, t).find(x => x.loan.id === id);
  const l = loans.find(x => x.id === id);
  if (!l) { go('/payments'); return null; }

  if (receipt) {
    const p = l.payments.find(x => x.receipt === receipt)!, tx = paymentTexts('received', l, p.cents, standing(l, t), dealer.dba, p.receipt);
    return (
      <main className="wrap center">
        <div className="top"><Back to="#/payments" label="Payments" /></div>
        <section className="enter" key="done">
          <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
          <h1 className="q">Recorded.</h1>
          <p className="note">Receipt #{p.receipt} · texted to {first(l.buyer.name)} and you</p>
          {!seeTexts ? <button className="textlink" onClick={() => { feel.tap(); setSeeTexts(true); }}>See The Texts</button>
            : <div className="sms two"><small>{first(l.buyer.name)}</small><span className="bubble">{tx.buyer}</span><small>You</small><span className="bubble you">{tx.dealer}</span></div>}
          <div className="dock"><div className="in">
            <button className="btn primary block" onClick={() => { feel.done(); go('/payments'); }}>Done</button>
            <button className="textlink" onClick={() => { feel.tap(); print(); }}>Print The Receipt</button>
          </div></div>
        </section>
      </main>
    );
  }
  if (!e) { go(`/payments/${id}`); return null; }
  const take = () => transition(() => { feel.done(); setReceipt(recordPayment(l.id, e.cents, 'cash', t)); scrollTo(0, 0); });
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="ask">
        <p className={`big-amount num ${e.late ? 'late' : ''}`}>{money(e.cents)}</p>
        <p className="note">{e.late ? `${plural(e.daysLate, 'day')} late` : 'Due today'} · {l.vehicle.split(' · ')[0]}</p>
        <h1 className="q">{first(l.buyer.name)} Paid Cash?</h1>
        <div className="choices">
          <a className="choice" href={`#/payments/${l.id}/pay`} onClick={feel.next}><span className="t"><b>Different Amount Or Way</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></a>
          <a className="choice" href={`#/payments/${l.id}`} onClick={feel.next}><span className="t"><b>See The Account</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></a>
        </div>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={take}>Yes, {money(e.cents)} Cash</button></div></div>
      </section>
    </main>
  );
}

/* ---------- Close the day ---------- */
const WORD: Record<DayState, string> = { open: 'Open', counted: 'Waiting for the bank', short: 'Short', over: 'Over', banked: 'Banked', not_banked: 'Not banked yet' };
const TONE: Record<DayState, string> = { open: '', counted: 'warn', short: 'bad', over: 'warn', banked: 'good', not_banked: 'bad' };

export function CloseDay() {
  const { dealer, loans = [], cashDays = {}, money: incoming = [] } = useStore();
  const t = today(dealer.timeZone);
  const days = withBanking(cashDays, incoming).days;
  const c = cashOn(loans, t), d = days[t], state = dayState(loans, d, t, t);
  const [counting, setCounting] = useState(false);
  const [amt, setAmt] = useState('');
  const counted = Math.round((parseMoney(amt) ?? 0) * 100);
  const to = (f: () => void) => transition(() => { f(); scrollTo(0, 0); });
  const earlier = Object.values(days).filter(x => x.date < t).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const back = <div className="top">{counting ? <button className="back" onClick={() => { feel.tap(); to(() => setCounting(false)); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to="#/payments" label="Payments" />}</div>;

  if (counting) return (
    <main className="wrap center">{back}
      <section className="enter" key="count">
        <h1 className="q">How Much Is There?</h1>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label="Cash counted" /></div>
        <p className="note">The Desk recorded {money(c.cents)}</p>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!(counted >= 0) || amt === ''} onClick={() => { feel.done(); closeCashDay(t, counted); to(() => setCounting(false)); }}>Close The Day</button></div></div>
      </section>
    </main>
  );

  const diff = d ? d.countedCents - c.cents : 0;
  return (
    <main className="wrap center">{back}
      <section className="enter" key={'close' + state}>
        {!d ? <>
          <p className="big-amount num">{money(c.cents)}</p>
          <h1 className="q">{c.cents ? 'Cash Today.' : 'No Cash Today.'}</h1>
          {c.items.length > 0 && <div className="list-plain">{c.items.map(x => <div key={x.p.id}><b className="num">{money(x.p.cents)}</b><span>{x.loan.buyer.name}</span><small className="num">#{x.p.receipt}</small></div>)}</div>}
          {c.cents > 0 && <div className="dock"><div className="in">
            <button className="btn primary block" onClick={() => { feel.done(); closeCashDay(t, c.cents); }}>Counted, It’s {money(c.cents)}</button>
            <button className="textlink" onClick={() => { feel.tap(); to(() => setCounting(true)); }}>It’s Different</button>
          </div></div>}
        </> : <>
          <span className={`done-mark pop ${state === 'short' ? 'bad' : ''}`}>{state === 'short' ? <b className="bang">!</b> : <Ic n="check" s={38} w={3} />}</span>
          <h1 className="q">{state === 'short' ? `Short ${money(-diff)}.` : state === 'over' ? `Over ${money(diff)}.` : 'Closed.'}</h1>
          <p className="note">{state === 'banked' ? `Banked ${nice(d.bankedOn!)}` : diff ? `${money(d.countedCents)} counted · ${money(c.cents)} recorded` : `${money(d.countedCents)} counted. We’ll match it when it’s banked.`}</p>
          <button className="textlink" onClick={() => { feel.tap(); setAmt((d.countedCents / 100).toFixed(2)); to(() => setCounting(true)); }}>Count Again</button>
        </>}
        {earlier.length > 0 && <>
          <h2 className="sub">Earlier</h2>
          <div className="list-plain">
            {earlier.map(x => { const s = dayState(loans, x, x.date, t); return <div key={x.date}><b>{nice(x.date)}</b><span className="num">{money(x.countedCents)}</span><small><span className={`status ${TONE[s]}`}>{WORD[s]}</span></small></div>; })}
          </div>
        </>}
      </section>
    </main>
  );
}
