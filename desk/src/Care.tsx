/* The quieter jobs, each on its own calm page: buyers ready for their next car,
   insurance on the cars, the buyer's own page, credit reporting, and one box
   that finds anything. */
import { useState } from 'react';
import { money, standing, today } from './lib/loans';
import { nextCar, readyForNext } from './lib/nextcar';
import { insuranceState } from './lib/insurance';
import { buyerPage } from './lib/buyerpage';
import { creditFile } from './lib/credit';
import { find } from './lib/find';
import { parseMoney } from './lib/money';
import { can } from './lib/staff';
import { me, setCreditReporting, setInsurance, setWorth, useStore } from './store';
import { Go, first, nice, plural } from './Payments';
import { Back, Ic, feel, go, transition } from './ui';

const longDay = (d: string) => nice(d, { weekday: 'long', month: 'long', day: 'numeric' });
const telOf = (p: string) => 'tel:' + p.replace(/[^\d+]/g, '');

/* ---------- ready for the next car ---------- */
export function NextCarList() {
  const { dealer, loans = [] } = useStore();
  const list = readyForNext(loans, today(dealer.timeZone));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/more" label="More" /></div>
      <section className="enter" key="next">
        {list.length ? <><p className="cap">Good payers, worth a call</p><h1 className="q">Ready for <em>the next car.</em></h1></>
          : <><p className="cap">Nobody yet</p><h1 className="q">Ready for <em>the next car.</em></h1></>}
        <div className="choices">
          {list.map(x => <Go key={x.loan.id} to={`/payments/${x.loan.id}/next`} tone={undefined} icon="sparkle" label={x.loan.buyer.name}
            gloss={`Paid ${x.paid} of ${x.of} · ${x.why.toLowerCase()}${x.equityCents !== undefined ? ` · ${x.equityCents >= 0 ? money(x.equityCents) + ' equity' : money(-x.equityCents) + ' under'}` : ` · payoff ${money(x.payoffCents)}`}`} />)}
        </div>
        {!list.length && <p className="note">Buyers show here after a year of paying on time, or halfway through the note.</p>}
      </section>
    </main>
  );
}

export function NextCarOne({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [worth, setW] = useState(l?.worthCents !== undefined ? (l.worthCents / 100).toFixed(0) : '');
  if (!l) { go('/payments/next'); return null; }
  const t = today(dealer.timeZone), x = nextCar(l, t), s = standing(l, t);
  const w = Math.round((parseMoney(worth) ?? NaN) * 100), eq = Number.isFinite(w) ? w - s.payoffCents : undefined;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/next" label="Next Car" /></div>
      <section className="enter" key="one">
        <p className="cap">{first(l.buyer.name)} has paid</p>
        <p className="big-num">{x ? `${x.paid} of ${x.of}` : money(s.paidCents)}</p>
        <p className="soft"><i className="dot good" />{x ? x.why : 'Paying'} · payoff {money(s.payoffCents)}</p>
        <label className="field"><span className="label">The car is worth about</span>
          <input className="input" inputMode="decimal" placeholder="$" value={worth} onChange={e => setW(e.target.value)} onBlur={() => setWorth(l.id, Number.isFinite(w) ? w : undefined)} aria-label="What the car is worth" /></label>
        {eq !== undefined && <p className="note">{eq >= 0 ? <>{money(eq)} of <em>equity</em> toward the next car.</> : <>{money(-eq)} under on this car today.</>}</p>}
        <p className="note">Ask about the next car on a call. A text offer needs their written permission first.</p>
      </section>
      <div className="dock"><div className="in"><a className="btn primary block" href={telOf(l.buyer.phone)} onClick={feel.next}>Call {first(l.buyer.name)}</a></div></div>
    </main>
  );
}

/* ---------- insurance ---------- */
export function useInsuranceNeeds() {
  const { dealer, loans = [] } = useStore();
  const t = today(dealer.timeZone);
  return loans.filter(l => standing(l, t).status !== 'paid_off').map(l => ({ l, i: insuranceState(l, t) })).filter(x => x.i.state !== 'ok')
    .sort((a, b) => (a.i.days ?? -999) - (b.i.days ?? -999));
}
export const insuranceLine = (i: ReturnType<typeof insuranceState>, expires?: string) =>
  i.state === 'none' ? 'No insurance on file' : i.state === 'lapsed' ? `Ended ${nice(expires!)}` : i.state === 'soon' ? `Ends ${nice(expires!)} · ${plural(i.days!, 'day')}` : `Ends ${nice(expires!)}`;

export function InsuranceList() {
  const list = useInsuranceNeeds();
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/needs" label="For You" /></div>
      <section className="enter" key="ins">
        <h1 className="q">{list.length ? <>Insurance <em>to check.</em></> : <>Every car <em>insured.</em></>}</h1>
        <div className="choices">{list.map(({ l, i }) => <Go key={l.id} to={`/payments/${l.id}/insurance`} tone={i.state === 'soon' ? 'warn' : 'late'} label={l.buyer.name} gloss={insuranceLine(i, l.insurance?.expires)} />)}</div>
        {list.length > 0 && <p className="note">Buyers get a text ten days before it ends and the day after. They can send the new card from their page.</p>}
      </section>
    </main>
  );
}

export function InsurancePage({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [edit, setEdit] = useState(!l?.insurance);
  const [company, setCompany] = useState(l?.insurance?.company ?? '');
  const [expires, setExpires] = useState('');
  if (!l) { go('/payments'); return null; }
  const t = today(dealer.timeZone), i = insuranceState(l, t), ins = l.insurance;
  return (
    <main className="wrap center">
      <div className="top"><Back to={`#/payments/${l.id}/more`} label="The Note" /></div>
      {!edit && ins ? <section className="enter" key="show">
        <p className="cap">{ins.company}</p>
        <h1 className="q">{i.state === 'lapsed' ? <>Ended <em>{nice(ins.expires, { month: 'long', day: 'numeric' })}.</em></> : <>Insured <em>to {nice(ins.expires, { month: 'long', day: 'numeric' })}.</em></>}</h1>
        <p className="soft"><i className={`dot ${i.state === 'ok' ? 'good' : i.state === 'soon' ? 'warn' : 'late'}`} />{i.state === 'soon' ? `${plural(i.days!, 'day')} left · ` : ''}{ins.by === 'buyer' ? `Sent by ${first(l.buyer.name)} ${nice(ins.updated)}` : `Updated ${nice(ins.updated)}`}</p>
        {ins.photo && <div className="photo-row"><img src={ins.photo} alt="Insurance card" /></div>}
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); setExpires(''); transition(() => setEdit(true)); }}>New Policy</button></div></div>
      </section> : <section className="enter" key="edit">
        <h1 className="q">Who insures <em>the car?</em></h1>
        <label className="field"><span className="label">Company</span><input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Progressive" aria-label="Insurance company" /></label>
        <label className="field"><span className="label">Policy ends</span><input className="input" type="date" min={t} value={expires} onChange={e => setExpires(e.target.value)} aria-label="Policy ends" /></label>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!company.trim() || !expires} onClick={() => { feel.done(); setInsurance(l.id, { company: company.trim(), expires }); transition(() => setEdit(false)); }}>Save</button>
          {ins && <button className="textlink" onClick={() => { feel.tap(); transition(() => setEdit(false)); }}>Cancel</button>}</div></div>
      </section>}
    </main>
  );
}

/* ---------- the buyer's own page ---------- */
export function BuyerPreview({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [copied, setCopied] = useState(false);
  if (!l) { go('/payments'); return null; }
  const t = today(dealer.timeZone), html = buyerPage(l, t, { name: dealer.dba || dealer.legalName, phone: dealer.phone, accent: dealer.brand.accent }, { action: '#', preview: true });
  const sms = l.page ? `sms:${l.buyer.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent((l.language === 'es' ? 'Su cuenta: ' : 'Your account: ') + l.page)}` : undefined;
  return (
    <main className="wrap center">
      <div className="top"><Back to={`#/payments/${l.id}/more`} label="The Note" /></div>
      <section className="enter" key="page">
        <p className="cap">What {first(l.buyer.name)} <em>sees</em></p>
        <div className="phone-frame"><iframe title={`${first(l.buyer.name)}’s page`} srcDoc={html} sandbox="" /></div>
        {!l.page && <p className="note">Their private link arrives once the Desk is connected to the server.</p>}
      </section>
      {l.page && <div className="dock"><div className="in">
        <a className="btn primary block" href={sms} onClick={feel.next}>Text It To {first(l.buyer.name)}</a>
        <button className="textlink" onClick={() => { feel.tap(); void navigator.clipboard?.writeText(l.page!); setCopied(true); }}>{copied ? 'Copied' : 'Copy The Link'}</button>
      </div></div>}
    </main>
  );
}

/* ---------- credit reporting ---------- */
export function CreditPage() {
  const { dealer, loans = [], sales, creditReporting } = useStore();
  const t = today(dealer.timeZone), on = !!creditReporting?.on, owner = can(me(), 'settings');
  const f = creditFile(loans, t, sales), late = f.rows.filter(r => !['11', '13'].includes(r.status)).length;
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([f.csv], { type: 'text/csv' }));
    a.download = `credit-reporting-${t.slice(0, 7)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/more" label="More" /></div>
      {on ? <section className="enter" key="on">
        <p className="cap">This month’s <em>file</em></p>
        <p className="big-num">{f.rows.length}</p>
        <p className="soft">{plural(f.rows.length, 'account')} · {late ? `${late} past due` : 'all current'}</p>
        <div className="list-plain">{f.rows.map(r => <div key={r.account}><b>{r.name}</b><span>{r.words}</span><small>{r.fields['Current Balance'] ? `$${Number(r.fields['Current Balance']).toLocaleString('en-US')}` : ''}</small></div>)}</div>
        <p className="note">Social Security numbers and dates of birth stay on the credit application; your reporting partner adds them.</p>
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.done(); download(); }}>Download The File</button>
          {owner && <button className="textlink" onClick={() => { feel.tap(); setCreditReporting(false); }}>Turn It Off</button>}
        </div></div>
      </section> : <section className="enter" key="off">
        <p className="cap">Credit reporting</p>
        <h1 className="q">Help them <em>build credit.</em></h1>
        <p className="note">Each month the Desk prepares every note’s standing for the credit bureaus, the way lenders report. You’ll need a reporting partner, and you answer any dispute within 30 days.</p>
        {owner && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); setCreditReporting(true); }}>Turn It On</button></div></div>}
      </section>}
    </main>
  );
}

/* ---------- one box finds anything ---------- */
export function Find() {
  const { loans = [], sales, lot } = useStore();
  const [q, setQ] = useState('');
  const hits = find(q, loans, sales, lot);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="find">
        <h1 className="q">Find <em>anyone.</em></h1>
        <label className="field search"><Ic n="search" s={20} /><input className="input" autoFocus value={q} onChange={e => { feel.key(); setQ(e.target.value); }} placeholder="Name, phone, VIN, stock or receipt" aria-label="Find" /></label>
        <div className="choices">{hits.map(h => <Go key={h.kind + h.to + h.label} to={h.to} icon={h.kind === 'note' ? 'doc' : h.kind === 'sale' ? 'pen' : 'plate'} label={h.label} gloss={h.gloss} />)}</div>
        {q.trim() && !hits.length && <p className="note">Nothing matches “{q.trim()}”.</p>}
      </section>
    </main>
  );
}

export const FindButton = () => <a className="find" href="#/find" onClick={feel.tap} aria-label="Find"><Ic n="search" s={20} /></a>;
export { longDay };
