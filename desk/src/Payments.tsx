/* Payments, page by page: one question per screen, the answer is the next tap.
   Home asks "who needs you?", a list shows those people, an account shows one
   number and one action, and everything else is a tap away on its own page. */
import { useState } from 'react';
import { METHOD_LABEL, amountToAsk, money, paymentTexts, reminderPlan, standing, today, type Method, type Standing } from './lib/loans';
import { parseMoney } from './lib/money';
import { useMoney } from './Owner';
import { cashOn, dayState, expected } from './lib/cashday';
import { WEEKDAY, signal } from './lib/autopay';
import { methodText } from './Autopay';
import { getLoans, me, recordPayment, setLoanLanguage, setReminders, useStore } from './store';
import { can } from './lib/staff';
import { brokenPromises, openPromise } from './lib/promise';
import { askTotal, extrasLine, repairLeft, repairsLeft } from './lib/extras';
import { activePause } from './lib/pause';
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

/* ---------- 1. Who's expected today? One tap for cash at the counter. ----------
   One list and one row. Everything that needs the owner folds into "Needs You". */
export type Need = { to: string; label: string; gloss: string; tone: 'late' | 'warn' };
/** Everything that needs the owner today, worst first. Shared by the home row and its page. */
export function useNeeds(): Need[] {
  const { loans = [] } = useStore();
  const { t, box, bank } = useMoney();
  const red = loans.filter(l => signal(l, t).tone === 'red').length, amber = loans.filter(l => signal(l, t).tone === 'amber').length;
  const cashToday = cashOn(loans, t).cents, closed = !!bank.days[t];
  const flagged = Object.values(bank.days).filter(d => d.date < t && ['short', 'not_banked'].includes(dayState(loans, d, d.date, t))).length;
  const n: Need[] = [];
  const broke = loans.filter(l => brokenPromises(l, t, 7).length);
  if (broke.length) n.push({ to: '/payments/list/promises', label: 'Missed A Promise', tone: 'late', gloss: broke.map(l => first(l.buyer.name)).join(', ') });
  if (red + amber) n.push({ to: '/payments/list/watch', label: red ? 'Stopped Paying' : 'Running Short', tone: red ? 'late' : 'warn', gloss: [red && `${red} stopped on purpose`, amber && `${amber} running short`].filter(Boolean).join(' · ') });
  if (box.length) n.push({ to: '/payments/match', label: 'Payments To Match', tone: 'warn', gloss: `${box.length} from Zelle, Cash App and the bank` });
  if (flagged) n.push({ to: '/payments/close', label: 'Cash To Look At', tone: 'late', gloss: `${plural(flagged, 'day')} short or not banked` });
  else if (cashToday && !closed) n.push({ to: '/payments/close', label: 'Close The Day', tone: 'warn', gloss: `${money(cashToday)} cash to count` });
  return n;
}

/** Who's expected today, most behind first; promised-later buyers wait, promised-today come first. */
function useToday() {
  const { loans = [] } = useStore();
  const { t } = useMoney();
  return expected(loans, t).map(e => ({ ...e, p: openPromise(e.loan, t) })).filter(e => !e.p || e.p.on === t)
    .sort((a, b) => Number(!!b.p) - Number(!!a.p));
}

export function Payments() {
  const { example } = useStore();
  const needs = useNeeds();
  const exp = useToday(), total = exp.reduce((t, e) => t + (e.p ? e.p.cents : e.cents), 0);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <section className="enter" key="home">
        {exp.length ? <>
          <p className="cap">Coming in <em>today</em></p>
          <p className="big-num">{money(total)}</p>
          <p className="soft">from {plural(exp.length, 'person', 'people')}</p>
        </> : <>
          <p className="cap">Nobody’s due today</p>
          <h1 className="q">All <em>caught up.</em></h1>
        </>}
        {needs.length > 0 && <a className="for-you" href="#/payments/needs" onClick={feel.next}><span className={`dot ${needs.some(x => x.tone === 'late') ? 'late' : 'warn'}`} />{needs.length === 1 ? '1 thing for you' : `${needs.length} things for you`}</a>}
        <p className="links"><a href="#/payments/list/all" onClick={feel.tap}>Every Account</a><a href="#/payments/close" onClick={feel.tap}>Close The Day</a><a href="#/payments/more" onClick={feel.tap}>More</a></p>
        {example && <span className="example">Example data</span>}
      </section>
      {exp.length > 0 && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/payments/today'); }}>See Who</button></div></div>}
    </main>
  );
}

/** The people expected today, one tap each for cash at the counter. */
export function Today() {
  const exp = useToday();
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="today">
        <h1 className="q">Expected <em>today.</em></h1>
        <div className="choices">
          {exp.map(e => <Go key={e.loan.id} to={`/payments/cash/${e.loan.id}`} tone={e.late ? 'late' : 'warn'} label={e.loan.buyer.name}
            gloss={e.p ? `Promised ${money(e.p.cents)} today` : `${money(e.cents)} · ${e.late ? `${plural(e.daysLate, 'day')} behind` : 'due today'}`} />)}
        </div>
        {!exp.length && <p className="note">Nobody today.</p>}
      </section>
    </main>
  );
}

/** Everything else, one tap away so the home stays quiet. */
export function PaymentsMore() {
  const { loans = [] } = useStore();
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="more">
        <h1 className="q">More.</h1>
        <div className="choices">
          {can(me(), 'settings') && <Go to="/payments/evening" icon="phone" label="Tonight’s Text" gloss="One text each evening" />}
          <Go to="/payments/posted" icon="check" label="Posted For You" gloss="Matched payments, undo for two days" />
          <Go to="/people" icon="pen" label="People" gloss="Who works the desk" />
          {!loans.some(l => l.imported) && <Go to="/import" icon="upload" label="Coming From Frazer?" gloss="Bring your notes over" />}
        </div>
      </section>
    </main>
  );
}

export function Needs() {
  const needs = useNeeds();
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="needs">
        <h1 className="q">{needs.length ? <>For <em>you.</em></> : <>All <em>clear.</em></>}</h1>
        <div className="choices">{needs.map(x => <Go key={x.to + x.label} to={x.to} tone={x.tone} label={x.label} gloss={x.gloss} />)}</div>
      </section>
    </main>
  );
}

/* ---------- 2. The people in one group ---------- */
const LIST_TITLE = { late: ['A little', 'behind.'], today: ['Due', 'today.'], all: ['Every', 'account.'], watch: ['Worth', 'a call.'], promises: ['Missed', 'a promise.'] } as const;
export function PaymentList({ which }: { which: keyof typeof LIST_TITLE }) {
  const { dealer, loans = [] } = useStore();
  const t = today(dealer.timeZone);
  const rows = loans.map(l => ({ l, s: standing(l, t) }))
    .filter(r => which === 'all' || (which === 'promises' ? brokenPromises(r.l, t, 7).length > 0 : which === 'watch' ? ['red', 'amber'].includes(signal(r.l, t).tone) : which === 'late' ? r.s.status === 'late' : r.s.status === 'due_today'))
    .sort((a, b) => b.s.daysLate - a.s.daysLate || a.l.buyer.name.localeCompare(b.l.buyer.name));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key={which}>
        <h1 className="q">{LIST_TITLE[which][0]} <em>{LIST_TITLE[which][1]}</em></h1>
        <div className="choices">
          {rows.map(({ l, s }) => { const x = line(s), g = signal(l, t), bp = brokenPromises(l, t, 7)[0]; return which === 'promises'
            ? <Go key={l.id} to={`/payments/${l.id}/promise`} tone="late" label={l.buyer.name} gloss={`Promised ${money(bp.cents)} ${nice(bp.on)}`} />
            : which === 'watch'
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
  const s = standing(l, today(dealer.timeZone)), ask = askTotal(l, s), extra = extrasLine(l, s), rep = repairsLeft(l), g = signal(l, today(dealer.timeZone)), pr = openPromise(l, today(dealer.timeZone)), pz = activePause(l, today(dealer.timeZone));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="acct">
        {s.status === 'paid_off' && !ask
          ? <><p className="cap">{l.buyer.name}</p><h1 className="q">Paid <em>in full.</em></h1>{rep > 0 && <p className="soft">{money(rep)} left on repairs</p>}</>
          : <><p className="cap">{first(l.buyer.name)} owes</p>
              <p className="big-num">{money(ask)}</p>
              <a className="soft" href={pz ? `#/payments/${l.id}/pause` : g.tone === 'red' || g.tone === 'amber' ? `#/payments/${l.id}/history` : `#/payments/${l.id}/schedule`} onClick={feel.next}>
                <span className={`dot ${pz ? 'warn' : g.tone === 'red' ? 'late' : g.tone === 'amber' || s.status === 'late' ? 'warn' : ''}`} />
                {[pz ? `Paused until ${nice(pz.resume ?? '')}` : g.tone === 'red' ? 'Stopped paying on purpose' : g.tone === 'amber' ? 'Running short' : null,
                  !pz && s.status === 'late' ? `${plural(s.daysLate, 'day')} behind` : !pz && s.next ? `due ${longDay(s.next.due)}` : null,
                  extra && `includes ${extra}`].filter(Boolean).join(' · ')}
              </a></>}
        <div className="choices">
          <Go to={`/payments/${l.id}/autopay`} icon="link" label="Autopay" gloss={l.autopay?.on && l.autopay.method ? `${methodText(l.autopay.method)} · ${l.autopay.payday === undefined ? 'due dates' : WEEKDAY[l.autopay.payday] + 's'}` : 'Off'} />
          <Go to={`/payments/${l.id}/history`} icon="sheet" label="History" gloss={l.payments.length ? `${money(s.paidCents)} paid` : undefined} />
          <Go to={`/payments/${l.id}/more`} icon="doc" label="The Note" gloss="Schedule, reminders, condition" />
          {(s.status === 'late' || s.status === 'due_today' || pr) && <Go to={`/payments/${l.id}/promise`} icon="pen" label={pr ? `Promised ${money(pr.cents)}` : 'They Promised A Day'} gloss={pr ? (pr.on === today(dealer.timeZone) ? 'Today' : nice(pr.on, { weekday: 'long', month: 'short', day: 'numeric' })) : 'Hold the late texts until then'} />}
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

  if (page === 'more') return (
    <main className="wrap center">{back}
      <section className="enter" key="more">
        <h1 className="q">The Note.</h1>
        <div className="choices">
          <Go to={`/payments/${l.id}/schedule`} icon="sheet" label="Schedule" gloss={`${l.count} × ${money(l.paymentCents)}`} />
          <Go to={`/payments/${l.id}/reminders`} icon="phone" label="Reminders" gloss={l.remindersOn ? 'On' : 'Off'} />
          {can(me(), 'pause') && s.status !== 'paid_off' && <Go to={`/payments/${l.id}/pause`} icon="sheet" label="Pause Payments" gloss={activePause(l, today(dealer.timeZone)) ? 'Paused now' : 'Move payments to the end'} />}
          <Go to={`/payments/${l.id}/extras`} icon="plus" label="Repairs And Fees" gloss={l.extras?.length ? l.extras.map(e => e.what).join(', ') : 'None'} />
          <Go to={`/payments/${l.id}/language`} icon="globe" label="Language" gloss={l.language === 'es' ? 'Español · texts and papers' : 'English · texts and papers'} />
          <Go to={`/payments/${l.id}/condition`} icon="doc" label="Condition" gloss={l.condition ? `${l.condition.asIs ? 'As-is' : 'Warranty'} · signed ${nice(l.condition.signedOn)}${l.service?.length ? ` · ${l.service.length} complaint${l.service.length > 1 ? 's' : ''}` : ''}` : 'No report'} />
        </div>
      </section>
    </main>
  );

  if (page === 'language') return (
    <main className="wrap center"><div className="top"><Back to={`#/payments/${l.id}/more`} label="The Note" /></div>
      <section className="enter" key="lang">
        <h1 className="q">{first(l.buyer.name)}’s Language?</h1>
        <div className="choices">
          <ChoiceRow on={l.language !== 'es'} label="English" onPick={() => setLoanLanguage(l.id, 'en')} />
          <ChoiceRow on={l.language === 'es'} label="Español" onPick={() => setLoanLanguage(l.id, 'es')} />
        </div>
        {l.remindersOn && reminderPlan(l, s, dealer.dba)[0] && <div className="sms"><small>Their next reminder</small><span className="bubble" lang={l.language === 'es' ? 'es' : 'en'}>{reminderPlan(l, s, dealer.dba)[0].text}</span></div>}
      </section>
    </main>
  );

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
  const [amt, setAmt] = useState(s0 && l ? (askTotal(l, s0) / 100).toFixed(2) : '');
  const [toward, setToward] = useState<string | undefined>();
  const [method, setMethod] = useState<Method | null>(null);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [seeTexts, setSeeTexts] = useState(false);
  if (!l || !s0) return <Payments />;
  const to = (n: number, d: 'fwd' | 'back' = 'fwd') => transition(() => { setStep(n); scrollTo(0, 0); }, d);
  const cents = Math.round((parseMoney(amt) ?? 0) * 100);
  const quick = ([{ label: 'What’s Due', c: askTotal(l, s0) }, { label: 'One Payment', c: l.paymentCents }, { label: 'Pay It Off', c: s0.payoffCents },
    ...(l.extras ?? []).filter(e => repairLeft(l, e) > 0).map(e => ({ label: `Toward ${e.what}`, c: repairLeft(l, e), to: e.id }))] as { label: string; c: number; to?: string }[]).filter((q, i, a) => q.c > 0 && a.findIndex(z => z.c === q.c && z.to === q.to) === i);
  const most = s0.payoffCents + repairsLeft(l) + (askTotal(l, s0) - amountToAsk(s0));
  const after = receipt ? standing(getLoans().find(x => x.id === id)!, t) : null;
  const paid = receipt ? getLoans().find(x => x.id === id)!.payments.find(p => p.receipt === receipt)! : null;

  return (
    <main className="wrap center">
      <div className="top">
        {step === 1 ? <button className="back" onClick={() => { feel.tap(); to(0, 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : step === 0 ? <Back to={`#/payments/${id}`} label={first(l.buyer.name)} /> : <span />}
        
      </div>
      {step === 0 && <section className="enter" key="amt">
        <h1 className="q">How Much?</h1>
        <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => { setAmt(e.target.value); setToward(undefined); }} placeholder="0" aria-label="Amount" /></div>
        <div className="chips">{quick.map(q => <button key={q.label} className={'chip' + (cents === q.c && toward === q.to ? ' on' : '')} onClick={() => { feel.tap(); setAmt((q.c / 100).toFixed(2)); setToward(q.to); }}><b className="num">{money(q.c)}</b><small>{q.label}</small></button>)}</div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!(cents > 0) || cents > most} onClick={() => { feel.next(); to(1); }}>{cents > most ? 'More Than They Owe' : 'Continue'}</button></div></div>
      </section>}
      {step === 1 && <section className="enter" key="method">
        <h1 className="q">Paid With?</h1>
        <div className="choices grid2">
          {METHODS.map(x => <button key={x.m} className="choice" aria-pressed={method === x.m} onClick={() => { feel.tap(); setMethod(x.m); }}><span className="art"><Ic n={x.icon} s={24} /></span><span className="t"><b>{METHOD_LABEL[x.m]}</b></span>{method === x.m && <span className="tick"><Ic n="check" s={16} w={3} /></span>}</button>)}
        </div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!method} onClick={() => { feel.done(); setReceipt(recordPayment(l.id, cents, method!, t, toward)); to(2); }}>Record {money(cents)}</button></div></div>
      </section>}
      {step === 2 && after && paid && <section className="enter" key="done">
        <p className="cap">{first(l.buyer.name)} <em>paid</em></p>
        <p className="big-num pop">{money(paid.cents)}</p>
        <p className="soft"><i className="dot good" aria-hidden="true" />Receipt #{paid.receipt} · texted to {first(l.buyer.name)} and you</p>
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
