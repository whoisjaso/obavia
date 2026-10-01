/* Payments: every in-house note, what's due, what's late, and taking a
   payment at the counter. One question per screen when money changes hands. */
import { useState } from 'react';
import { METHOD_LABEL, amountToAsk, digest, money, ownerText, receiptText, reminderPlan, standing, today, type Loan, type Method, type Standing } from './lib/loans';
import { parseMoney } from './lib/money';
import { getLoans, recordPayment, setReminders, useStore } from './store';
import { Back, Chev, Ic, feel, go, transition } from './ui';

const nice = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
const first = (n: string) => n.split(' ')[0];

function line(s: Standing) {
  if (s.status === 'paid_off') return { tag: 'Paid Off', tone: 'good' as const, text: 'Closed' };
  if (s.status === 'late') return { tag: `${s.daysLate} ${s.daysLate === 1 ? 'Day' : 'Days'} Late`, tone: 'late' as const, text: `${money(s.pastDueCents + s.feesOwedCents)} past due` };
  if (s.status === 'due_today') return { tag: 'Due Today', tone: 'warn' as const, text: `${money(s.next!.cents)} today` };
  return { tag: 'Current', tone: 'good' as const, text: `${money(s.next!.cents)} on ${nice(s.next!.due)}` };
}

export function Payments() {
  const { dealer, loans = [], example } = useStore();
  const t = today(dealer.timeZone);
  const rows = loans.map(l => ({ l, s: standing(l, t) }));
  const d = digest(loans, t);
  const late = rows.filter(r => r.s.status === 'late').sort((a, b) => b.s.daysLate - a.s.daysLate);
  const dueToday = rows.filter(r => r.s.status === 'due_today');
  const soon = rows.filter(r => r.s.status === 'current').sort((a, b) => a.s.next!.due.localeCompare(b.s.next!.due));
  const closed = rows.filter(r => r.s.status === 'paid_off');
  const sum = (xs: { cents: number }[]) => money(xs.reduce((a, x) => a + x.cents, 0));
  return (
    <main className="wrap">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <h1 className="h1 enter">Payments</h1>
      {example && <span className="example">Example data</span>}
      <div className="tally enter2">
        <div className={d.dueToday.length ? 'on' : ''}><small>Due Today</small><b className="num">{sum(d.dueToday)}</b><span>{d.dueToday.length} {d.dueToday.length === 1 ? 'account' : 'accounts'}</span></div>
        <div className={d.late.length ? 'on late' : ''}><small>Late</small><b className="num">{sum(d.late)}</b><span>{d.late.length} {d.late.length === 1 ? 'account' : 'accounts'}</span></div>
        <div><small>Collected Today</small><b className="num">{money(d.collectedCents)}</b><span>{d.collectedCount} {d.collectedCount === 1 ? 'payment' : 'payments'}</span></div>
      </div>
      <div className="owner-text enter2"><Ic n="phone" s={18} /><span><small>Your morning text</small>{ownerText(d, dealer.dba)}</span></div>
      {late.length > 0 && <><h2 className="h2">Late</h2><div className="group">{late.map(r => <LoanRow key={r.l.id} {...r} />)}</div></>}
      {dueToday.length > 0 && <><h2 className="h2">Due Today</h2><div className="group">{dueToday.map(r => <LoanRow key={r.l.id} {...r} />)}</div></>}
      {soon.length > 0 && <><h2 className="h2">Current</h2><div className="group">{soon.map(r => <LoanRow key={r.l.id} {...r} />)}</div></>}
      {closed.length > 0 && <><h2 className="h2">Paid Off</h2><div className="group">{closed.map(r => <LoanRow key={r.l.id} {...r} />)}</div></>}
      {!loans.length && <p className="empty">No in-house notes yet. They open here when a buy here pay here sale is completed.</p>}
    </main>
  );
}

function LoanRow({ l, s }: { l: Loan; s: Standing }) {
  const x = line(s);
  return (
    <a className="row" href={`#/payments/${l.id}`} onClick={feel.tap}>
      <span className={`dot ${x.tone}`} aria-hidden="true" />
      <span className="t"><b>{l.buyer.name}</b><small>{l.vehicle.split(' · ')[0]} · {x.text}</small></span>
      <span className={`status ${x.tone === 'late' ? 'bad' : x.tone}`}>{x.tag}</span><Chev />
    </a>
  );
}

export function Account({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [showAll, setShowAll] = useState(false);
  if (!l) return <Payments />;
  const t = today(dealer.timeZone), s = standing(l, t), x = line(s);
  const plan = reminderPlan(l, s, dealer.dba);
  const ask = amountToAsk(s);
  const inst = showAll ? s.installments : s.installments.filter(i => i.state !== 'upcoming').slice(-4).concat(s.installments.filter(i => i.state === 'upcoming').slice(0, 3));
  return (
    <main className="wrap">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <h1 className="h1 enter">{l.buyer.name}</h1>
      <p className="sub enter">{l.vehicle} · {l.buyer.phone}</p>
      <div className={`due-card enter2 ${x.tone}`}>
        <span className={`status ${x.tone === 'late' ? 'bad' : x.tone}`}>{x.tag}</span>
        {s.status === 'paid_off' ? <b className="num">Paid In Full</b> : <>
          <b className="num">{money(ask)}</b>
          <span>{s.status === 'late' ? `Past due since ${nice(s.installments.find(i => i.paidCents < i.cents)!.due, { month: 'long', day: 'numeric' })}${s.feesOwedCents ? `, with a ${money(s.feesOwedCents)} late charge` : ''}` : `Due ${nice(s.next!.due, { weekday: 'long', month: 'long', day: 'numeric' })}`}</span>
        </>}
        <dl>
          <div><dt>Payment</dt><dd className="num">{money(l.paymentCents)} {({ weekly: 'a week', biweekly: 'every 2 weeks', semimonthly: 'twice a month', monthly: 'a month' } as const)[l.frequency]}</dd></div>
          <div><dt>Payoff today</dt><dd className="num">{money(s.payoffCents)}</dd></div>
          <div><dt>Paid so far</dt><dd className="num">{money(s.paidCents)}</dd></div>
          <div><dt>Rate</dt><dd className="num">{l.apr}% APR</dd></div>
        </dl>
      </div>

      <h2 className="h2">Reminders</h2>
      <div className="group">
        <button className="row toggle" onClick={() => { feel.tap(); setReminders(l.id, !l.remindersOn); }} aria-pressed={l.remindersOn}>
          <span className="t"><b>Text {first(l.buyer.name)} Before Each Payment</b><small>Three days before, on the day, and if it runs late. Then once a week while it’s still late.</small></span>
          <span className="switch" aria-hidden="true"><i /></span>
        </button>
        {plan.map((r, k) => <div className="row text-preview" key={k}><span className="when">{nice(r.on)}</span><span className="bubble">{r.text}</span></div>)}
        {l.remindersOn && !plan.length && s.status !== 'paid_off' && <p className="empty">Nothing scheduled for this payment.</p>}
      </div>
      <p className="hint">Texts go from your dealership’s number once texting is approved. STOP always works.</p>

      <h2 className="h2">Schedule</h2>
      <div className="group sched">
        {inst.map(i => (
          <div className={`row ${i.state}`} key={i.n}>
            <span className="n num">{i.n}</span>
            <span className="t"><b>{nice(i.due)}</b><small className="num">{money(i.cents)}{i.lateFeeCents ? ` + ${money(i.lateFeeCents)} late charge` : ''}</small></span>
            <span className={`status ${{ paid: 'good', paid_late: 'warn', partial: 'warn', due: 'warn', late: 'bad', upcoming: '' }[i.state]}`}>{{ paid: 'Paid', paid_late: 'Paid Late', partial: `Part Paid · ${money(i.paidCents)}`, due: 'Due Today', late: 'Late', upcoming: 'Upcoming' }[i.state]}</span>
          </div>))}
        {!showAll && <button className="row more" onClick={() => { feel.tap(); setShowAll(true); }}><span className="t"><b>See All {l.count} Payments</b></span><Chev /></button>}
      </div>

      {l.payments.length > 0 && <><h2 className="h2">Received</h2><div className="group">
        {[...l.payments].reverse().map(p => <div className="row" key={p.id}><span className="t"><b className="num">{money(p.cents)}</b><small>{METHOD_LABEL[p.method]} · {nice(p.on, { month: 'long', day: 'numeric', year: 'numeric' })}</small></span><span className="v num">#{p.receipt}</span></div>)}
      </div></>}

      {s.status !== 'paid_off' && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go(`/payments/${l.id}/pay`); }}><Ic n="cash" s={20} w={2.2} />Take A Payment</button></div></div>}
    </main>
  );
}

const METHODS: { m: Method; icon: string; gloss?: string }[] = [
  { m: 'cash', icon: 'cash', gloss: 'A written receipt is required' }, { m: 'card', icon: 'sheet' }, { m: 'ach', icon: 'bank' },
  { m: 'zelle', icon: 'phone' }, { m: 'cash_app', icon: 'phone' }, { m: 'check', icon: 'doc' }, { m: 'money_order', icon: 'doc' },
];

export function TakePayment({ id }: { id: string }) {
  const { dealer } = useStore();
  const l = getLoans().find(x => x.id === id);
  const t = today(dealer.timeZone);
  const s0 = l ? standing(l, t) : null;
  const [step, setStep] = useState(0);
  const [amt, setAmt] = useState(s0 ? (amountToAsk(s0) / 100).toFixed(2) : '');
  const [method, setMethod] = useState<Method | null>(null);
  const [receipt, setReceipt] = useState<number | null>(null);
  if (!l || !s0) return <Payments />;
  const to = (n: number, d: 'fwd' | 'back' = 'fwd') => transition(() => { setStep(n); scrollTo(0, 0); }, d);
  const cents = Math.round((parseMoney(amt) ?? 0) * 100);
  const quick = [{ label: 'What’s Due', c: amountToAsk(s0) }, { label: 'One Payment', c: l.paymentCents }, { label: 'Pay It Off', c: s0.payoffCents }].filter((q, i, a) => q.c > 0 && a.findIndex(z => z.c === q.c) === i);
  const after = receipt ? standing(getLoans().find(x => x.id === id)!, t) : null;
  const paid = receipt ? getLoans().find(x => x.id === id)!.payments.find(p => p.receipt === receipt)! : null;

  return (
    <main className="wrap center">
      <div className="top">
        {step === 1 ? <button className="back" onClick={() => { feel.tap(); to(0, 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : step === 0 ? <Back to={`#/payments/${id}`} label={first(l.buyer.name)} /> : <span />}
        <span className="progress">{l.buyer.name}</span>
      </div>
      {step === 0 && <section className="enter" key="amt">
        <h1 className="q">How Much Are They Paying?</h1>
        <p className="note">{s0.status === 'late' ? `${money(s0.pastDueCents)} is past due${s0.feesOwedCents ? `, plus a ${money(s0.feesOwedCents)} late charge` : ''}.` : `${money(s0.next!.cents)} is due ${nice(s0.next!.due, { weekday: 'long', month: 'long', day: 'numeric' })}.`}</p>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label="Amount" /></div>
        <div className="chips">{quick.map(q => <button key={q.label} className={'chip' + (cents === q.c ? ' on' : '')} onClick={() => { feel.tap(); setAmt((q.c / 100).toFixed(2)); }}><b className="num">{money(q.c)}</b><small>{q.label}</small></button>)}</div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!(cents > 0) || cents > s0.payoffCents} onClick={() => { feel.next(); to(1); }}>{cents > s0.payoffCents ? 'More Than The Payoff' : 'Continue'}</button></div></div>
      </section>}
      {step === 1 && <section className="enter" key="method">
        <h1 className="q">How Are They Paying?</h1>
        <p className="note">{money(cents)} from {first(l.buyer.name)}.</p>
        <div className="choices grid2">
          {METHODS.map(x => <button key={x.m} className="choice" aria-pressed={method === x.m} onClick={() => { feel.tap(); setMethod(x.m); }}><span className="art"><Ic n={x.icon} s={24} /></span><span className="t"><b>{METHOD_LABEL[x.m]}</b>{x.gloss && <small>{x.gloss}</small>}</span>{method === x.m && <span className="tick"><Ic n="check" s={16} w={3} /></span>}</button>)}
        </div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!method} onClick={() => { feel.done(); setReceipt(recordPayment(l.id, cents, method!, t)); to(2); }}>Record {money(cents)}</button></div></div>
      </section>}
      {step === 2 && after && paid && <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Payment Recorded.</h1>
        <p className="note">Receipt #{paid.receipt}. {after.status === 'paid_off' ? 'The note is paid in full.' : `Next: ${money(after.next!.cents)} on ${nice(after.next!.due, { weekday: 'long', month: 'long', day: 'numeric' })}.`}</p>
        <div className="sms"><small>The receipt text</small><span className="bubble">{receiptText(getLoans().find(x => x.id === id)!, paid, after, dealer.dba)}</span></div>
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.done(); go(`/payments/${id}`); }}>Done</button>
          <button className="textlink" onClick={() => { feel.tap(); print(); }}>Print The Receipt</button>
        </div></div>
      </section>}
    </main>
  );
}
