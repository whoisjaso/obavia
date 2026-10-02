/* Texas tax on the notes, and the title applications that protect it.
   One number per screen: what to send by the 20th, or how many days are
   left to file a title. Everything else is a tap away. */
import { useState } from 'react';
import { money, today } from './lib/loans';
import { nextReport, suggestFiling, taxEvents, taxSent, titleWatch, type TaxEvent, type TitleWatch } from './lib/tax';
import { can } from './lib/staff';
import { fileTaxReport, me, setTaxDeferred, setTaxFiling, setTitleFiled, setTransfer, useStore } from './store';
import { Go, first, nice, plural } from './Payments';
import { Back, Ic, feel, go, transition } from './ui';

const longDay = (d: string) => nice(d, { weekday: 'long', month: 'long', day: 'numeric' });
const WHY: Record<TaxEvent['why'], string> = { down: 'With the down payment', payment: 'From payments', paid_off: 'Paid off: the rest of the tax', title_late: 'Title past 60 days: all of it', sold: 'Note sold: all of it', traded: 'Traded in: the rest of the tax' };

/** The words for a title's countdown, shared by the list, the account and the needs row. */
export function titleLine(w: TitleWatch) {
  if (w.state === 'filed') return 'Title filed';
  if (w.state === 'accelerated') return 'Past 60 days: the tax is due';
  if (w.state === 'overdue') return `Past 45 days · ${plural(w.left, 'day')} to the 60-day line`;
  return w.left === 0 ? 'Title due today' : `${plural(w.left, 'day')} to file the title`;
}

export function useTitles() {
  const { dealer, loans = [] } = useStore();
  const t = today(dealer.timeZone);
  return loans.map(l => ({ l, w: titleWatch(l, t)! })).filter(x => x.w && x.w.state !== 'filed')
    .sort((a, b) => (a.w.state === 'accelerated' ? -1 : 0) - (b.w.state === 'accelerated' ? -1 : 0) || a.w.left - b.w.left);
}
export function useTaxReport() {
  const { dealer, loans = [], taxFiling, taxFiled } = useStore();
  const t = today(dealer.timeZone), f = taxFiling ?? suggestFiling(loans, t);
  return { r: nextReport(loans, t, f, taxFiled), f, t };
}

export function TaxHome() {
  const { r, f, t } = useTaxReport();
  const titles = useTitles();
  const [done, setDone] = useState(false);
  const owner = can(me(), 'settings');
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/more" label="More" /></div>
      <section className="enter" key={'tax' + done}>
        {done ? <><p className="cap">Sales tax</p><h1 className="q">Filed <em>for {r?.label ?? 'now'}.</em></h1></>
          : r ? <>
          <p className="cap">Sales tax for <em>{r.label}</em></p>
          <p className="big-num">{money(r.cents)}</p>
          <p className="soft">{r.late ? <><i className="dot late" />Late · {money(r.late.penalty)} penalty and {money(r.late.fee)} for the late report</>
            : r.ended ? `Due ${longDay(r.due)} · on time keeps ${money(r.keep)}` : `So far · the report is due ${longDay(r.due)}`}</p>
        </> : <><p className="cap">Sales tax</p><h1 className="q">Nothing <em>to send.</em></h1></>}
        <div className="choices">
          {titles.length > 0 && <Go to="/payments/tax/titles" tone={titles.some(x => x.w.state === 'overdue' || x.w.state === 'accelerated') ? 'late' : 'warn'} label="Titles To File" gloss={`${first(titles[0].l.buyer.name)}: ${titleLine(titles[0].w).toLowerCase()}${titles.length > 1 ? ` · and ${titles.length - 1} more` : ''}`} />}
          {r && r.lines.length > 0 && <Go to="/payments/tax/lines" icon="sheet" label="Where It Comes From" gloss={`${plural(r.notes, 'note')}${r.adjust ? ` · ${money(Math.abs(r.adjust))} ${r.adjust > 0 ? 'added for' : 'taken off'} earlier reports` : ''}`} />}
        </div>
        {owner && <p className="links"><button className="textlink" onClick={() => { feel.tap(); setTaxFiling(f === 'monthly' ? 'quarterly' : 'monthly'); }}>We File {f === 'monthly' ? 'Monthly' : 'Quarterly'} · Change</button></p>}
      </section>
      {r?.ended && !done && owner && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); fileTaxReport(r.key, r.cents, t); transition(() => setDone(true)); }}>Filed It · {money(r.cents)}</button></div></div>}
    </main>
  );
}

export function TaxLines() {
  const { r } = useTaxReport();
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/tax" label="Sales Tax" /></div>
      <section className="enter" key="lines">
        <h1 className="q">{r ? <>Where it <em>comes from.</em></> : <>Nothing <em>yet.</em></>}</h1>
        {r && <div className="list-plain">
          {r.lines.map(x => <div key={x.loanId}><b>{x.name}</b><span className="num">{money(x.cents)}</span><small>{x.why.map(w => WHY[w]).join(' · ')}</small></div>)}
          {r.adjust !== 0 && <div><b>Earlier reports</b><span className="num">{r.adjust > 0 ? '' : '−'}{money(Math.abs(r.adjust))}</span><small>Payments that changed after filing</small></div>}
        </div>}
      </section>
    </main>
  );
}

export function Titles() {
  const titles = useTitles();
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments/tax" label="Sales Tax" /></div>
      <section className="enter" key="titles">
        <h1 className="q">{titles.length ? <>Titles <em>to file.</em></> : <>Every title <em>filed.</em></>}</h1>
        <div className="choices">
          {titles.map(({ l, w }) => <Go key={l.id} to={`/payments/${l.id}/title`} tone={w.state === 'open' ? undefined : w.state === 'soon' ? 'warn' : 'late'} icon="doc" label={l.buyer.name} gloss={`${titleLine(w)} · due ${nice(w.due45)}`} />)}
        </div>
        <p className="note">The title application goes to the county by day 45. Past day 60, all of the tax on the car is due at once.</p>
      </section>
    </main>
  );
}

/** One note's title and tax: the countdown, then the two rare changes. */
export function TitlePage({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const [other, setOther] = useState(false);
  const [sold, setSold] = useState(false);
  if (!l?.tax) { go(`/payments/${id}/more`); return null; }
  const t = today(dealer.timeZone), w = titleWatch(l, t)!, sent = taxSent(l, t), tax = l.tax;
  const back = <div className="top"><Back to={`#/payments/${l.id}/more`} label="The Note" /></div>;
  const owner = can(me(), 'settings');

  if (sold) return (
    <main className="wrap center"><div className="top"><button className="back" onClick={() => { feel.tap(); transition(() => setSold(false)); }}><Ic n="chev" s={18} w={2.4} />Back</button></div>
      <section className="enter" key="sold">
        <h1 className="q">What <em>changed?</em></h1>
        <div className="choices">
          <button className="choice" onClick={() => { feel.done(); setTaxDeferred(l.id, !tax.deferred); transition(() => setSold(false)); }}><span className="t"><b>{tax.deferred ? 'We Paid It All At The County' : 'We Send It As Payments Come In'}</b><small>How this car’s tax is paid</small></span></button>
          <button className="choice" onClick={() => { feel.done(); setTransfer(l.id, { on: t, toRfc: true }); transition(() => setSold(false)); }}><span className="t"><b>Moved To Our Finance Company</b><small>A registered related finance company · the tax carries on as payments come in</small></span></button>
          <button className="choice" onClick={() => { feel.done(); setTransfer(l.id, { on: t, toRfc: false }); transition(() => setSold(false)); }}><span className="t"><b>Sold The Note To Someone Else</b><small>The rest of the tax, {money(tax.totalCents - sent)}, goes on this period’s report</small></span></button>
          {tax.transfer && <button className="choice" onClick={() => { feel.tap(); setTransfer(l.id, undefined); transition(() => setSold(false)); }}><span className="t"><b>We Still Have It</b><small>Undo</small></span></button>}
        </div>
      </section>
    </main>
  );

  return (
    <main className="wrap center">{back}
      <section className="enter" key={'title' + w.state}>
        {w.state === 'filed'
          ? <><p className="cap">Title application</p><h1 className="q">Filed <em>{nice(tax.titleFiled!, { month: 'long', day: 'numeric' })}.</em></h1></>
          : w.state === 'accelerated'
          ? <><p className="cap">Past day 60, the tax is due</p><p className="big-num">{money(tax.deferred ? taxEvents(l, t).find(e => e.why === 'title_late')?.cents ?? 0 : tax.totalCents)}</p><p className="soft"><i className="dot late" />File the title now · the tax goes on this period’s report</p></>
          : <><p className="cap">{w.state === 'overdue' ? <>Days to the <em>60-day line</em></> : <>Days left to <em>file the title</em></>}</p>
              <p className="big-num">{w.left}</p>
              <p className="soft"><i className={`dot ${w.state === 'open' ? '' : w.state === 'soon' ? 'warn' : 'late'}`} />{w.state === 'overdue' ? `Day 45 was ${longDay(w.due45)} · day 60 is ${longDay(w.due60)}` : `Due ${longDay(w.due45)} · ${first(l.buyer.name)}’s sale was ${nice(l.openedOn)}`}</p></>}
        {other && <label className="field"><input className="input" type="date" max={t} aria-label="Day the title was filed" onChange={e => { if (e.target.value) { feel.done(); setTitleFiled(l.id, e.target.value); setOther(false); } }} /></label>}
        <div className="choices">
          <div className="choice static"><span className="t"><b>Sales Tax</b><small>{tax.deferred ? `${money(sent)} of ${money(tax.totalCents)} sent as payments come in` : `${money(tax.totalCents)} paid to the county with the title`}</small></span></div>
          {owner && <button className="choice" onClick={() => { feel.tap(); transition(() => setSold(true)); }}><span className="t"><b>Something Changed?</b><small>{tax.transfer ? (tax.transfer.toRfc ? `With our finance company since ${nice(tax.transfer.on)}` : `Note sold ${nice(tax.transfer.on)}`) : 'Paid at the county, or the note was sold'}</small></span></button>}
        </div>
      </section>
      {w.state !== 'filed' && <div className="dock"><div className="in">
        <button className="btn primary block" onClick={() => { feel.done(); setTitleFiled(l.id, t); }}>Filed It Today</button>
        <button className="textlink" onClick={() => { feel.tap(); setOther(true); }}>Filed On Another Day</button>
      </div></div>}
      {w.state === 'filed' && owner && <div className="dock"><div className="in"><button className="textlink" onClick={() => { feel.tap(); setTitleFiled(l.id, undefined); }}>Not Filed Yet</button></div></div>}
    </main>
  );
}
