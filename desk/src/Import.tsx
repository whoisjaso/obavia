/* Coming from Frazer: export, choose the files, answer what we couldn't place,
   see every note checked against Frazer, bring them in. Nothing retyped. */
import { useMemo, useState } from 'react';
import { FIELDS, missing, planImport, readTable, type ColumnMap, type Field, type Table } from './lib/importer';
import { sampleExport } from './lib/frazer-sample';
import { money, today } from './lib/loans';
import { plural } from './Payments';
import { importNotes, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

type Raw = { name: string; text: string; override: ColumnMap };
type Ask = { file: number; field: Field };

export function Import() {
  const { dealer, loans = [] } = useStore();
  const t = today(dealer.timeZone);
  const [raws, setRaws] = useState<Raw[]>([]);
  const [step, setStep] = useState<'start' | 'ask' | 'review' | 'off' | 'done'>('start');
  const [done, setDone] = useState({ notes: 0, cars: 0 });
  const to = (s: typeof step) => transition(() => { setStep(s); scrollTo(0, 0); });

  const tables: Table[] = useMemo(() => raws.map(r => readTable(r.name, r.text, r.override)), [raws]);
  const asks: Ask[] = tables.flatMap((tb, file) => missing(tb.kind, tb.map).filter(f => !(f in raws[file].override)).map(field => ({ file, field })));
  const plan = useMemo(() => planImport(tables, t, loans), [tables, t, loans]);

  const take = (files: { name: string; text: string }[]) => { setRaws(files.map(f => ({ ...f, override: {} }))); feel.next(); to('ask'); };
  const pick = async (list: FileList | null) => { if (list?.length) take(await Promise.all([...list].map(async f => ({ name: f.name, text: await f.text() })))); };
  const answer = (a: Ask, col: number) => { feel.next(); setRaws(rs => rs.map((r, i) => i === a.file ? { ...r, override: { ...r.override, [a.field]: col } } : r)); };

  const top = (backTo?: () => void, label = 'Back') => <div className="top">{backTo ? <button className="back" onClick={() => { feel.tap(); backTo(); }}><Ic n="chev" s={18} w={2.4} />{label}</button> : <Back to="#/payments" label="Payments" />}</div>;

  if (step === 'start') return (
    <main className="wrap center">{top()}
      <section className="enter" key="start">
        <h1 className="q">Coming From Frazer?</h1>
        <p className="note">Bring every note over this afternoon. Nothing gets retyped.</p>
        <ol className="steps-plain">
          <li>In Frazer, open <b>Miscellaneous</b>, then <b>8 Export Data</b>.</li>
          <li>Pick <b>.csv</b>, tick <b>Include Column Headers</b>, then <b>Select All</b>.</li>
          <li>Export your Buy Here Pay Here accounts, then their payments.</li>
        </ol>
        <div className="dock"><div className="in">
          <label className="btn primary block file-btn">Choose The Files<input type="file" multiple accept=".csv,.txt,text/csv,text/plain" onChange={e => void pick(e.target.files)} /></label>
          <button className="textlink" onClick={() => { const s = sampleExport(t); take([{ name: 'accounts.csv', text: s.accounts }, { name: 'payments.csv', text: s.payments }]); }}>Try It With A Sample</button>
        </div></div>
      </section>
    </main>
  );

  if (step === 'ask' && asks.length) {
    const a = asks[0], tb = tables[a.file];
    const free = tb.headers.map((h, i) => ({ h, i, sample: tb.rows.slice(0, 3).map(r => r[i]).filter(Boolean).join(' · ') })).filter(c => !Object.values(tb.map).includes(c.i));
    return (
      <main className="wrap center">{top(() => { setRaws([]); to('start'); })}
        <section className="enter" key={`${a.file}-${a.field}`}>
          <p className="note">{tb.name}</p>
          <h1 className="q">Which Column Is The {FIELDS[a.field].label}?</h1>
          <div className="choices">
            {free.slice(0, 8).map(c => <button key={c.i} className="choice" onClick={() => answer(a, c.i)}><span className="t"><b>{c.h || `Column ${c.i + 1}`}</b>{c.sample && <small>{c.sample}</small>}</span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>)}
          </div>
          <button className="textlink" onClick={() => answer(a, -1)}>It’s Not In This File</button>
        </section>
      </main>
    );
  }

  const matched = plan.checks.filter(c => c.result === 'match').length, off = plan.checks.filter(c => c.result === 'off'), carried = plan.checks.filter(c => c.result === 'carried').length, unchecked = plan.checks.filter(c => c.result === 'unchecked').length;
  if (step === 'off') return (
    <main className="wrap center">{top(() => to('review'))}
      <section className="enter" key="off">
        <h1 className="q">{plural(off.length, 'Note')} To Look At.</h1>
        <p className="note">Our balance and Frazer’s differ. Usually a fee or an adjustment Frazer holds separately.</p>
        <div className="list-plain stack">{off.map(c => <div key={c.account}><b>{c.name} · #{c.account}</b><span className="num">Frazer {money(c.theirs ?? 0)} · Desk {money(c.ours)}</span><small className="num">{money(Math.abs(c.ours - (c.theirs ?? 0)))} apart</small></div>)}</div>
      </section>
    </main>
  );

  if (step === 'review' || step === 'ask') return (
    <main className="wrap center">{top(() => { setRaws([]); to('start'); })}
      <section className="enter" key="review">
        <p className="big-amount num">{plan.loans.length}</p>
        <h1 className="q">{plan.loans.length === 1 ? 'Note Ready.' : 'Notes Ready.'}</h1>
        <p className="note">{[plan.payments && plural(plan.payments, 'payment'), plan.cars.length && plural(plan.cars.length, 'car')].filter(Boolean).join(' and ') || 'From your files'}{plan.payments || plan.cars.length ? ' came with them' : ''}</p>
        <div className="list-plain stack">
          {matched > 0 && <div><b><Ic n="check" s={16} w={3} /> {plural(matched, 'note')} match Frazer to the penny</b></div>}
          {carried > 0 && <div><b>{plural(carried, 'note')} carried over from today’s balance</b><span>No payment history in the files</span></div>}
          {unchecked > 0 && <div><b>{plural(unchecked, 'note')} rebuilt from the sale</b><span>Add Frazer’s current balance to the export to check them</span></div>}
          {off.length > 0 && <div><b>{plural(off.length, 'note')} to look at</b><small><button className="textlink" onClick={() => { feel.tap(); to('off'); }}>See Them</button></small></div>}
          {plan.skipped.length > 0 && <div><b>{plural(plan.skipped.length, 'account')} stayed behind</b><span>{[...new Set(plan.skipped.map(x => x.why))].join(' · ')}</span></div>}
          {tables.filter(x => x.kind === 'unknown').map(x => <div key={x.name}><b>{x.name}</b><span>We couldn’t tell what’s in this file</span></div>)}
        </div>
        <div className="dock"><div className="in">
          <button className="btn primary block" disabled={!plan.loans.length && !plan.cars.length} onClick={() => { feel.done(); setDone(importNotes(plan.loans, plan.cars)); to('done'); }}>Bring Them In</button>
        </div></div>
      </section>
    </main>
  );

  return (
    <main className="wrap center">{top()}
      <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">{plural(done.notes, 'Note')} {done.notes === 1 ? 'Is' : 'Are'} In.</h1>
        <p className="note">{done.cars ? `${plural(done.cars, 'car')} added to the lot. ` : ''}Reminders, autopay and the evening text work on them from today.</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); go('/payments'); }}>See Payments</button></div></div>
      </section>
    </main>
  );
}
