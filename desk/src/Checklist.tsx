/* #/checklist : the runbook's daily checklist (docs/plan/ops-runbook.md §20) as the Desk's own page (gap table W4-C).
   One thing to do: tick the row that is done. The rows are the runbook's lines under its own two headings; the tick is
   the corridor's ink ring; the ticks live on this device for today and go with the one faint Reset at the foot. There is
   no primary cloud: the rows are the page (one-action.md: a justification surface has nothing in the dock). */
import { useState } from 'react';
import { CHECKLIST, groupDone, readTicks, splitRow, toggleTick, writeTicks, type Ticks } from './lib/checklist';
import { today } from './lib/loans';
import { useStore } from './store';
import { Back, Tick, feel } from './ui';

export function Checklist() {
  const { dealer } = useStore();
  const day = today(dealer.timeZone);
  const [ticks, setTicks] = useState<Ticks>(() => readTicks(day));
  const tick = (id: string) => {
    const next = toggleTick(ticks, id);
    setTicks(next); writeTicks(day, next);
    /* the row landing is the tap; the last row of a heading landing is the chime (DOCTRINE §4 rule 14) */
    const g = CHECKLIST.find(x => x.rows.some(r => r.id === id));
    if (next[id] && g && groupDone(g, next)) feel.done(); else feel.tap();
  };
  const reset = () => { feel.tap(); setTicks({}); writeTicks(day, {}); };
  const done = Object.keys(ticks).length;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /><span /></div>
      <section className="enter" key="checklist">
        <h1 className="q"><em>Today.</em></h1>
        {CHECKLIST.map(g => (
          <div key={g.heading}>
            <h2 className="h2">{g.heading}</h2>
            <div className="group" style={{ marginTop: 0 }}>
              {g.rows.map(r => { const { lead, rest } = splitRow(r.text); const on = !!ticks[r.id]; return (
                <button key={r.id} className="row" role="checkbox" aria-checked={on} onClick={() => tick(r.id)} style={{ alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 }}>
                  <Tick on={on} />
                  <span className="t" style={{ flex: 1, minWidth: 0, opacity: on ? 0.55 : 1, transition: 'opacity .2s' }}><b style={{ display: 'block', font: '700 17px/1.3 var(--sans)', overflowWrap: 'anywhere' }}>{lead}</b>{rest && <small style={{ display: 'block', marginTop: 3, font: '500 15px/1.35 var(--sans)', color: 'var(--muted)' }}>{rest}</small>}</span>
                </button>); })}
            </div>
          </div>))}
        {done > 0 && <button className="textlink" style={{ color: 'var(--faint)', marginTop: 22 }} onClick={reset}>Reset</button>}
      </section>
    </main>
  );
}
