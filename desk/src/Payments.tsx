/* Payments, page by page: one question per screen, the answer is the next tap.
   Home asks "who needs you?", a list shows those people, an account shows one
   number and one action, and everything else is a tap away on its own page. */
import { useState } from 'react';
import { METHOD_LABEL, amountToAsk, daysBetween, money, paymentTexts, reminderPlan, standing, today, type Method, type Standing } from './lib/loans';
import { parseMoney } from './lib/money';
import { useEvening, useMoney, UNDO_DAYS } from './Owner';
import { hourLabel } from './lib/evening';
import { cashOn, dayState, expected } from './lib/cashday';
import { WEEKDAY, signal } from './lib/autopay';
import { methodText } from './Autopay';
import { getLoans, recordPayment, setReminders, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

export const nice = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
const longDay = (d: string) => nice(d, { weekday: 'long', month: 'long', day: 'numeric' });
export const first = (n: string) => n.split(' ')[0];
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function line(s: Standing) {
  if (s.status === 'paid_off') return { tag: 'Paid Off', tone: 'good' as const, text: 'Paid in full' };
  if (s.status === 'late') return { tag: `${plural(s.daysLate, 'Day')} Late`, tone: 'late' as const, text: `${money(s.pastDueCents + s.feesOwedCents)} · ${plural(s.daysLate, 'day')} late` };
  if (s.status === 'due_today') return { tag: 'Due Today', tone: 'warn' as const, text: `${money(s.next!.cents)} due today` };
  return { tag: 'Current', tone: 'good' as const, text: `${money(s.next!.cents)} due ${nice(s.next!.due)}` };
}

/** A big stacked choice that goes somewhere. */
export function Go({ to, label, gloss, icon, tone }: { to: string; label: string; gloss?: string; icon?: string; tone?: 'late' | 'warn' | 'good' }) {
  return (
    <a className="choice" href={`#${to}`} onClick={feel.next}>
      {tone ? <span className={`dot big ${tone}`} aria-hidden="true" /> : icon && <span className="art"><Ic n={icon} s={24} /></span>}
      <span className="t"><b>{label}</b>{gloss && <small>{gloss}</small>}</span>
      <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
    </a>
  );
}

/* ---------- 1. Who's expected today? One tap for cash at the counter. ---------- */
const SHOW = 6;
export function Payments() {
  const { loans = [], example, autoPosted = [], evening: eve } = useStore();
  const [all, setAll] = useState(false);
  const { t, box: toMatch, bank } = useMoney();
  const ev = useEvening();
  const recent = autoPosted.filter(a => daysBetween(a.on, t) <= UNDO_DAYS);
  const exp = expected(loans, t), shown = all ? exp : exp.slice(0, SHOW);
  const cashToday = cashOn(loans, t).cents;
  const flagged = Object.values(bank.days).filter(d => d.date < t && ['short', 'not_banked'].includes(dayState(loans, d, d.date, t))).length;
  const closeGloss = flagged ? `${plural(flagged, 'day')} to look at` : bank.days[t] ? `Closed · ${money(bank.days[t].countedCents)}` : `${money(cashToday)} in cash today`;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <section className="enter" key="home">
        <h1 className="q">{exp.length ? 'Expected Today.' : 'All Current.'}</h1>
        {exp.length > 0 && <div className="choices">
          {shown.map(e => <Go key={e.loan.id} to={`/payments/cash/${e.loan.id}`} tone={e.late ? 'late' : 'warn'} label={e.loan.buyer.name}
            gloss={`${money(e.cents)} · ${e.late ? `${plural(e.daysLate, 'day')} late` : 'due today'}`} />)}
          {!all && exp.length > SHOW && <button className="textlink" onClick={() => { feel.tap(); setAll(true); }}>Show All {exp.length}</button>}
        </div>}
        <div className="choices">
          {(() => { const red = loans.filter(l => signal(l, t).tone === 'red').length, amber = loans.filter(l => signal(l, t).tone === 'amber').length;
            return red + amber > 0 && <Go to="/payments/list/watch" tone={red ? 'late' : 'warn'} label="Watch"
              gloss={[red && `${red} on purpose`, amber && `${amber} short on money`].filter(Boolean).join(' · ')} />; })()}
          {toMatch.length > 0 && <Go to="/payments/match" icon="bank" label="To Match" gloss={`${toMatch.length} from Zelle, Cash App and the bank`} />}
          {recent.length > 0 && <Go to="/payments/posted" icon="check" label="Posted For You" gloss={`${recent.length} matched and posted · undo for ${UNDO_DAYS} days`} />}
          <Go to="/payments/close" icon="cash" label="Close The Day" gloss={closeGloss} tone={flagged ? 'late' : undefined} />
          <Go to="/payments/list/all" icon="sheet" label="Every Account" />
          <Go to="/payments/evening" icon="phone" label="Tonight’s Text" gloss={eve?.on ? `${hourLabel(eve.hour)} · ${ev.needs.length ? `${ev.needs.length} need${ev.needs.length > 1 ? '' : 's'} you` : 'nothing needs you'}` : 'Off'} />
        </div>
        {example && <span className="example">Example data</span>}
      </section>
    </main>
  );
}

/* ---------- 2. The people in one group ---------- */
const LIST_TITLE = { late: 'Late.', today: 'Due Today.', all: 'Every Account.', watch: 'Watch.' } as const;
export function PaymentList({ which }: { which: keyof typeof LIST_TITLE }) {
  const { dealer, loans = [] } = useStore();
  const t = today(dealer.timeZone);
  const rows = loans.map(l => ({ l, s: standing(l, t) }))
    .filter(r => which === 'all' || (which === 'watch' ? ['red', 'amber'].includes(signal(r.l, t).tone) : which === 'late' ? r.s.status === 'late' : r.s.status === 'due_today'))
    .sort((a, b) => b.s.daysLate - a.s.daysLate || a.l.buyer.name.localeCompare(b.l.buyer.name));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key={which}>
        <h1 className="q">{LIST_TITLE[which]}</h1>
        <div className="choices">
          {rows.map(({ l, s }) => { const x = line(s), g = signal(l, t); return which === 'watch'
            ? <Go key={l.id} to={`/payments/${l.id}/history`} tone={g.tone === 'red' ? 'late' : 'warn'} label={l.buyer.name} gloss={g.headline} />
            : <Go key={l.id} to={`/payments/${l.id}`} tone={x.tone} label={l.buyer.name} gloss={x.text} />; })}
        </div>
        {!rows.length && <p className="note">Nobody.</p>}
      </section>
    </main>
  );
}

/* ---------- 3. One account: one number, one action ---------- */
export function Account({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  if (!l) return <Payments />;
  const s = standing(l, today(dealer.timeZone)), x = line(s), ask = amountToAsk(s), g = signal(l, today(dealer.timeZone));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="acct">
        <h1 className="q">{l.buyer.name}</h1>
        <span className={`status ${x.tone === 'late' ? 'bad' : x.tone} center-tag`}>{x.tag}</span>
        {(g.tone === 'red' || g.tone === 'amber') && <a className={`flag ${g.tone}`} href={`#/payments/${l.id}/history`} onClick={feel.next}>{g.tone === 'red' ? 'On purpose: ' : ''}{g.headline}</a>}
        {s.status === 'paid_off'
          ? <p className="big-amount good num">Paid In Full</p>
          : <><p className={`big-amount num ${x.tone}`}>{money(ask)}</p>
              {s.status !== 'late' && <p className="note">Due {longDay(s.next!.due)}</p>}</>}
        <div className="choices">
          <Go to={`/payments/${l.id}/schedule`} icon="sheet" label="Schedule" />
          <Go to={`/payments/${l.id}/autopay`} icon="link" label="Autopay" gloss={l.autopay?.on && l.autopay.method ? `${methodText(l.autopay.method)} · ${l.autopay.payday === undefined ? 'due dates' : WEEKDAY[l.autopay.payday] + 's'}` : 'Off'} />
          <Go to={`/payments/${l.id}/reminders`} icon="phone" label="Reminders" gloss={l.remindersOn ? 'On' : 'Off'} />
          <Go to={`/payments/${l.id}/condition`} icon="doc" label="Condition" gloss={l.condition ? `${l.condition.asIs ? 'As-is' : 'Warranty'} · signed ${nice(l.condition.signedOn)}${l.service?.length ? ` · ${l.service.length} complaint${l.service.length > 1 ? 's' : ''}` : ''}` : 'No report'} />
          <Go to={`/payments/${l.id}/history`} icon="sheet" label="History" gloss={l.payments.length ? `${money(s.paidCents)} paid` : undefined} />
        </div>
        {s.status !== 'paid_off' && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go(`/payments/${l.id}/pay`); }}>Take A Payment</button></div></div>}
      </section>
    </main>
  );
}

/* ---------- 4. The pages behind an account ---------- */
export function AccountPage({ id, page }: { id: string; page: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [all, setAll] = useState(false);
  if (!l) return <Payments />;
  const s = standing(l, today(dealer.timeZone));
  const back = <div className="top"><Back to={`#/payments/${l.id}`} label={first(l.buyer.name)} /></div>;

  if (page === 'reminders') {
    const plan = reminderPlan(l, s, dealer.dba);
    return (
      <main className="wrap center">{back}
        <section className="enter" key="rem">
          <h1 className="q">Text Reminders?</h1>
          <div className="choices">
            <ChoiceRow on={l.remindersOn} label="Yes" onPick={() => setReminders(l.id, true)} />
            <ChoiceRow on={!l.remindersOn} label="No" onPick={() => setReminders(l.id, false)} />
          </div>
          {l.remindersOn && plan[0] && <div className="sms"><small>{longDay(plan[0].on)}</small><span className="bubble">{plan[0].text}</span></div>}
        </section>
      </main>
    );
  }

  if (page === 'received') return (
    <main className="wrap center">{back}
      <section className="enter" key="rec">
        <h1 className="q">{money(s.paidCents)}</h1>
        <div className="list-plain">
          {[...l.payments].reverse().map(p => <div key={p.id}><b className="num">{money(p.cents)}</b><span>{METHOD_LABEL[p.method]} · {nice(p.on, { month: 'long', day: 'numeric' })}</span><small className="num">#{p.receipt}</small></div>)}
        </div>
      </section>
    </main>
  );

  // schedule
  const inst = all ? s.installments : s.installments.filter(i => i.state !== 'upcoming').slice(-3).concat(s.installments.filter(i => i.state === 'upcoming').slice(0, 3));
  const label = { paid: 'Paid', paid_late: 'Paid late', partial: 'Part paid', due: 'Due today', late: 'Late', upcoming: '' } as const;
  return (
    <main className="wrap center">{back}
      <section className="enter" key="sch">
        <h1 className="q">{l.count} × {money(l.paymentCents)}</h1>
        <p className="note">Payoff {money(s.payoffCents)}</p>
        <div className="list-plain">
          {inst.map(i => <div key={i.n} className={i.state}><b>{nice(i.due)}</b><span className="num">{money(i.cents)}{i.lateFeeCents ? ` + ${money(i.lateFeeCents)}` : ''}</span><small>{label[i.state]}</small></div>)}
        </div>
        {!all && l.count > inst.length && <button className="textlink" onClick={() => { feel.tap(); setAll(true); }}>Show All {l.count}</button>}
      </section>
    </main>
  );
}

function ChoiceRow({ on, label, onPick }: { on: boolean; label: string; onPick: () => void }) {
  return <button className="choice" aria-pressed={on} onClick={() => { feel.tap(); onPick(); }}><span className="t"><b>{label}</b></span><span className="tick">{on && <Ic n="check" s={15} w={3} />}</span></button>;
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
  const [seeTexts, setSeeTexts] = useState(false);
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
        
      </div>
      {step === 0 && <section className="enter" key="amt">
        <h1 className="q">How Much?</h1>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label="Amount" /></div>
        <div className="chips">{quick.map(q => <button key={q.label} className={'chip' + (cents === q.c ? ' on' : '')} onClick={() => { feel.tap(); setAmt((q.c / 100).toFixed(2)); }}><b className="num">{money(q.c)}</b><small>{q.label}</small></button>)}</div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!(cents > 0) || cents > s0.payoffCents} onClick={() => { feel.next(); to(1); }}>{cents > s0.payoffCents ? 'More Than The Payoff' : 'Continue'}</button></div></div>
      </section>}
      {step === 1 && <section className="enter" key="method">
        <h1 className="q">Paid With?</h1>
        <div className="choices grid2">
          {METHODS.map(x => <button key={x.m} className="choice" aria-pressed={method === x.m} onClick={() => { feel.tap(); setMethod(x.m); }}><span className="art"><Ic n={x.icon} s={24} /></span><span className="t"><b>{METHOD_LABEL[x.m]}</b></span>{method === x.m && <span className="tick"><Ic n="check" s={16} w={3} /></span>}</button>)}
        </div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!method} onClick={() => { feel.done(); setReceipt(recordPayment(l.id, cents, method!, t)); to(2); }}>Record {money(cents)}</button></div></div>
      </section>}
      {step === 2 && after && paid && <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">Recorded.</h1>
        <p className="note">Receipt #{paid.receipt} · texted to {first(l.buyer.name)} and you</p>
        {!seeTexts ? <button className="textlink" onClick={() => { feel.tap(); setSeeTexts(true); }}>See The Texts</button> : (() => { const tx = paymentTexts('received', getLoans().find(x => x.id === id)!, paid.cents, after, dealer.dba, paid.receipt); return (
          <div className="sms two"><small>{first(l.buyer.name)}</small><span className="bubble">{tx.buyer}</span><small>You</small><span className="bubble you">{tx.dealer}</span></div>); })()}
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.done(); go(`/payments/${id}`); }}>Done</button>
          <button className="textlink" onClick={() => { feel.tap(); print(); }}>Print The Receipt</button>
        </div></div>
      </section>}
    </main>
  );
}
