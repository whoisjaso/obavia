import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AGENCY, BENCH, LEADS, NEED, PLAYBOOK, REASONS, REPS, STEPS, type Lead, type Move, type StepIndex } from './data';
import { biggest, byId, cash, health, int, k, leaks, lift, money, pct, perLead, rate, teamCounts } from './engine';
import { Avatar, Chev, Funnel, Ic, Status, Track, useCount } from './ui';
import { Handoff } from './handoff';

type Go = (to: string) => void;
export type MovesApi = { moves: Move[]; assign: (rep: string, step: StepIndex) => Move; advance: (id: string) => void };

const TEAM = teamCounts();
const STEP_IDX = [0, 1, 2, 3] as StepIndex[];
const SHORT = ['Book', 'Show', 'Qualify', 'Close'];
const STATUS: Record<Move['status'], string> = { assigned: 'Assigned', doing: 'In progress', checking: 'Checking', worked: 'It worked', missed: 'Didn’t move' };

/** One plain sentence per step: what the rate means. */
const SAYS: Record<StepIndex, (p: string) => string> = {
  0: p => `${p} of new leads get booked.`,
  1: p => `${p} of booked calls show up.`,
  2: p => `${p} of calls that show are a fit.`,
  3: p => `${p} of qualified calls close.`,
};

export function Head({ title, sub, right, back, go }: { title: string; sub?: string; right?: ReactNode; back?: [string, string]; go?: Go }) {
  return (
    <header className="hdr enter">
      <div>
        {back && go && <button className="back" onClick={() => go(back[1])}><Ic name="chev" size={17} w={2.4} />{back[0]}</button>}
        <h1>{title}</h1>{sub && <p>{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Stat({ label, value, fmt, note }: { label: string; value: number; fmt: (v: number) => string; note?: string }) {
  const v = useCount(value);
  return <div className="stat"><span>{label}</span><b className="num">{fmt(v)}</b>{note && <small>{note}</small>}</div>;
}

/* ================= OWNER: OVERVIEW ================= */
export function Overview({ go, api }: { go: Go; api: MovesApi }) {
  const top = biggest(TEAM), ls = [...leaks(TEAM)].sort((a, b) => b.worth - a.worth);
  const live = api.moves.filter(m => m.status !== 'worked' && m.status !== 'missed');
  const worth = useCount(top.worth, 1100);
  return (
    <>
      <Head title="This month" sub={`${AGENCY.name} · ${REPS.length} reps`} />
      <section className="lead-card enter">
        <div className="lbl">Biggest leak</div>
        <h2>{top.name}</h2>
        <div className="big num">{k(worth)}<small>a month</small></div>
        <p>{SAYS[top.step](pct(top.pct))} The standard is {BENCH[top.step].strong}%. Lift it there, keep everything else the same, and this is what comes back.</p>
        <button className="btn primary" onClick={() => go('leaks/' + top.step)}>See why</button>
      </section>

      <div className="group stats enter" style={{ marginTop: 16 }}>
        <Stat label="Cash collected" value={cash(TEAM)} fmt={k} />
        <Stat label="Leads" value={TEAM[0]} fmt={int} />
        <Stat label="Cash per lead" value={perLead(TEAM)} fmt={money} note="+$34 on last month" />
      </div>

      <section className="sec enter">
        <h2>From lead to cash</h2>
        <p className="sub">Tap any step to see why people fall out there.</p>
        <div className="group pad"><Funnel c={TEAM} onStep={i => go('leaks/' + i)} /></div>
      </section>

      <div className="two">
        <section className="sec">
          <h2>Where the money leaks</h2>
          <div className="group">
            {ls.map(l => (
              <button key={l.step} className="cell nolead" onClick={() => go('leaks/' + l.step)}>
                <div className="t"><b>{l.name}</b><small>{l.worth > 0 ? k(l.worth) + ' a month' : 'At or above the standard'}</small></div>
                <div className="v"><Status h={l.health}>{pct(l.pct)}</Status><Chev /></div>
              </button>
            ))}
          </div>
        </section>
        <section className="sec">
          <div className="sech">Fixes in progress<button onClick={() => go('moves')}>All</button></div>
          <div className="group">
            {live.length ? live.slice(0, 4).map(m => { const r = byId(m.rep); return (
              <button key={m.id} className="cell av-row" onClick={() => go('moves')}>
                <Avatar initials={r.initials} tint={r.tint} />
                <div className="t"><b>{r.name.split(' ')[0]} · {STEPS[m.step]}</b><small>{STATUS[m.status]}</small></div>
                <div className="v">{m.after !== null ? <span className="delta">{m.before}% → <b>{m.after}%</b></span> : <span className="muted">{m.before}%</span>}</div>
              </button>); }) : <p className="empty">Nothing in progress. Open a leak to assign a fix.</p>}
          </div>
        </section>
      </div>

      <section className="sec">
        <h2>Reps, by cash per lead</h2>
        <p className="sub">Close rate is easy to flatter. Cash per lead keeps everything else honest.</p>
        <div className="group">
          {[...REPS].sort((a, b) => perLead(b.counts) - perLead(a.counts)).map(r => { const w = biggest(r.counts); return (
            <button key={r.id} className="cell av-row" onClick={() => go('reps/' + r.id)}>
              <Avatar initials={r.initials} tint={r.tint} />
              <div className="t"><b>{r.name}</b><small>Weakest: {w.name} · {pct(w.pct)}</small></div>
              <div className="v"><span className="num">{money(perLead(r.counts))}</span><Chev /></div>
            </button>); })}
        </div>
      </section>
    </>
  );
}

/* ================= OWNER: ONE LEAK ================= */
export function Marked({ text, mark }: { text: string; mark: string }) {
  const i = text.indexOf(mark);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{mark}</mark>{text.slice(i + mark.length)}</>;
}

export function Leaks({ step, go, api, toast }: { step: StepIndex; go: Go; api: MovesApi; toast: (s: string) => void }) {
  const p = rate(TEAM, step), h = health(step, p), worth = lift(TEAM, step), std = BENCH[step].strong;
  const reps = [...REPS].sort((a, b) => rate(a.counts, step) - rate(b.counts, step));
  const worst = reps[0];
  const has = api.moves.some(m => m.step === step && m.rep === worst.id && m.status !== 'worked' && m.status !== 'missed');
  return (
    <>
      <Head title={STEPS[step]} sub={SAYS[step](pct(p)) + ` The standard is ${std}%.`} back={['This month', 'overview']} go={go}
        right={<div className="seg" role="group" aria-label="Step">{STEP_IDX.map(i => <button key={i} aria-pressed={i === step} onClick={() => go('leaks/' + i)}>{SHORT[i]}</button>)}</div>} />

      <div className="group pad enter">
        <div className="cmp">
          <div className="r"><span>Your team</span><Track w={p} h={h} /><b className="num">{pct(p)}</b></div>
          <div className="r"><span>Standard</span><Track w={std} /><b className="num">{std}%</b></div>
        </div>
        <p style={{ margin: '18px 0 0', font: '500 15.5px/1.5 var(--sans)', color: 'var(--text)' }}>
          {worth > 0 ? <>Closing that gap is worth <b style={{ color: 'var(--ink)' }}>{k(worth)} a month</b>, at your own close rates and deal size.</> : <>This step is at or above the standard. Nothing to fix here.</>}
        </p>
      </div>

      <div className="two">
        <section className="sec">
          <h2>Why, from the calls</h2>
          <p className="sub">Tagged from every recorded call at this step.</p>
          <div className="group">
            {REASONS[step].map(r => (
              <div key={r.tag} className="cell nolead" style={{ alignItems: 'start' }}>
                <div className="t"><b>{r.tag}</b><p className="q">“<Marked text={r.quote} mark={r.mark} />”</p><span className="src">{r.call} · {byId(r.rep).name}</span></div>
                <div className="v" style={{ alignSelf: 'start' }}><span className="num">{r.count}</span></div>
              </div>
            ))}
          </div>
        </section>
        <section className="sec">
          <h2>Who leaks here</h2>
          <p className="sub">Each rep against the same standard.</p>
          <div className="group">
            {reps.map(r => { const v = rate(r.counts, step); return (
              <button key={r.id} className="cell av-row" onClick={() => go('reps/' + r.id)}>
                <Avatar initials={r.initials} tint={r.tint} />
                <div className="t"><b>{r.name}</b><small>{r.counts[step]} in, {r.counts[step + 1]} through</small></div>
                <div className="v"><Status h={health(step, v)}>{pct(v)}</Status><Chev /></div>
              </button>); })}
          </div>
        </section>
      </div>

      {worth > 0 && (
        <section className="sec">
          <div className="fix">
            <div className="lbl">The one fix</div>
            <p>{PLAYBOOK[step].move}</p>
            <small>{PLAYBOOK[step].why} Start with {worst.name.split(' ')[0]}, lowest here at {pct(rate(worst.counts, step))}.</small>
            <button className={'btn' + (has ? ' done' : '')} disabled={has} onClick={() => { api.assign(worst.id, step); toast('Assigned to ' + worst.name.split(' ')[0]); }}>
              {has ? 'Assigned' : 'Assign to ' + worst.name.split(' ')[0]}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

/* ================= OWNER: REPS ================= */
export function Reps({ go }: { go: Go }) {
  return (
    <>
      <Head title="Reps" sub="Everyone measured the same way, against the same standard." />
      <div className="group enter">
        {[...REPS].sort((a, b) => perLead(b.counts) - perLead(a.counts)).map(r => { const w = biggest(r.counts); return (
          <button key={r.id} className="cell av-row" onClick={() => go('reps/' + r.id)}>
            <Avatar initials={r.initials} tint={r.tint} />
            <div className="t"><b>{r.name}</b><small>{r.counts[0]} leads · {r.counts[4]} won · weakest: {w.name}</small></div>
            <div className="v"><span><span className="num">{money(perLead(r.counts))}</span><small>per lead</small></span><Chev /></div>
          </button>); })}
      </div>
    </>
  );
}

export function RepSheet({ id, api, toast }: { id: string; api: MovesApi; toast: (s: string) => void }) {
  const r = byId(id), w = biggest(r.counts);
  const has = api.moves.some(m => m.rep === id && m.step === w.step && m.status !== 'worked' && m.status !== 'missed');
  return (
    <>
      <div className="who"><Avatar initials={r.initials} tint={r.tint} lg /><div><h2>{r.name}</h2><p>Best with {r.style.toLowerCase()}</p></div></div>
      <div className="group stats" style={{ marginTop: 22 }}>
        <Stat label="Leads" value={r.counts[0]} fmt={int} />
        <Stat label="Won" value={r.counts[4]} fmt={int} />
        <Stat label="Per lead" value={perLead(r.counts)} fmt={money} />
      </div>
      <section className="sec"><h2>Their line</h2><div className="group pad"><Funnel c={r.counts} compact /></div></section>
      {w.worth > 0 && (
        <section className="sec">
          <div className="fix">
            <div className="lbl">Weakest step · {w.name} at {pct(w.pct)}</div>
            <p>{PLAYBOOK[w.step].move}</p>
            <small>Worth about {k(w.worth)} a month at {r.name.split(' ')[0]}’s own rates.</small>
            <button className={'btn' + (has ? ' done' : '')} disabled={has} onClick={() => { api.assign(id, w.step); toast('Assigned to ' + r.name.split(' ')[0]); }}>{has ? 'Assigned' : 'Assign this fix'}</button>
          </div>
        </section>
      )}
    </>
  );
}

/* ================= OWNER: MOVES ================= */
const MOVE_GROUPS: [string, Move['status'][]][] = [['In progress', ['doing']], ['Checking', ['checking']], ['Assigned', ['assigned']], ['Results', ['worked', 'missed']]];
const NEXT_ACT: Partial<Record<Move['status'], string>> = { assigned: 'Start', doing: 'Check', checking: 'Close' };

export function Moves({ api }: { api: MovesApi }) {
  return (
    <>
      <Head title="Fixes" sub="Each fix has one rep, one step, a day we check, and the number it was meant to move." />
      {MOVE_GROUPS.map(([label, sts]) => { const ms = api.moves.filter(m => sts.includes(m.status)); if (!ms.length) return null; return (
        <section key={label} className="sec enter" style={{ marginTop: 26 }}>
          <h2>{label}</h2>
          <div className="group">
            {ms.map(m => { const r = byId(m.rep), act = NEXT_ACT[m.status]; return (
              <div key={m.id} className="cell av-row mv">
                <Avatar initials={r.initials} tint={r.tint} />
                <div className="t">
                  <b>{r.name.split(' ')[0]} · {STEPS[m.step]}</b>
                  <p>{m.text}</p>
                  <div className="foot">
                    {m.after !== null ? <span className="delta">{m.before}% → <b>{m.after}%</b></span> : <span className="delta">Now {m.before}%</span>}
                    <small className="muted" style={{ font: '500 13.5px/1 var(--sans)' }}>{m.status === 'worked' ? 'Checked ' + m.check : 'Check ' + m.check}</small>
                  </div>
                  {m.of > 0 && m.status !== 'worked' && <div className="prog"><i style={{ width: (m.done / m.of) * 100 + '%' }} /></div>}
                </div>
                <div className="v">{act && <button className="btn tinted sm" onClick={() => api.advance(m.id)}>{act}</button>}</div>
              </div>); })}
          </div>
        </section>); })}
    </>
  );
}

/* ================= LEADS ================= */
export function Leads({ go, mine }: { go: Go; mine?: string }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => LEADS.filter(l => (!mine || l.rep === mine) && (l.name + ' ' + l.company).toLowerCase().includes(q.toLowerCase())), [q, mine]);
  const base = mine ? 'my-leads/' : 'leads/';
  return (
    <>
      <Head title={mine ? 'My leads' : 'Leads'} sub="Every lead carries their own words, from the first call to the last dollar." />
      <label className="group enter" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 44, marginBottom: 16, color: 'var(--text3)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search leads"
          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', font: '500 16px var(--sans)', color: 'var(--ink)' }} />
      </label>
      <div className="group enter">
        {list.map(l => (
          <button key={l.id} className="cell av-row" onClick={() => go(base + l.id)}>
            <Avatar initials={l.name.split(' ').map(w => w[0]).join('')} tint={l.hot ? 'd' : 'a'} />
            <div className="t"><b>{l.name}</b><small>{l.company} · {l.revenue}</small></div>
            <div className="v"><span style={{ textAlign: 'right' }}><span style={{ font: '650 14.5px/1 var(--sans)' }}>{l.next}</span><small>{l.due}</small></span><Chev /></div>
          </button>
        ))}
        {!list.length && <p className="empty">No one by that name.</p>}
      </div>
    </>
  );
}

/** Their words, with the ones that give them away marked. */
function Words({ lead }: { lead: Lead }) {
  const parts: ReactNode[] = []; let rest = lead.quote, key = 0;
  while (rest) {
    let at = -1, hit = '';
    for (const m of lead.marks) { const i = rest.indexOf(m); if (i >= 0 && (at < 0 || i < at)) { at = i; hit = m; } }
    if (at < 0) { parts.push(rest); break; }
    parts.push(rest.slice(0, at)); parts.push(<span key={key++} className="mk">{hit}</span>); rest = rest.slice(at + hit.length);
  }
  return <p className="words">“{parts}”</p>;
}

const PAIR: Record<string, string> = { 'Status Seeker': 'dana', 'Intellectual': 'maya', 'Belonger': 'andre', 'Dominator': 'reza', 'People Pleaser': 'maya', 'Victim': 'andre' };

export function LeadSheet({ lead }: { lead: Lead }) {
  const r = byId(lead.rep), best = byId(PAIR[lead.type]);
  const heard = !!lead.quote;
  return (
    <>
      <div className="who"><Avatar initials={lead.name.split(' ').map(w => w[0]).join('')} lg /><div><h2>{lead.name}</h2><p>{lead.company} · {lead.revenue} · with {r.name.split(' ')[0]}</p></div></div>

      {!heard ? (
        <section className="sec"><div className="group"><p className="empty">Not heard yet. After the first call, their words and what they mean land here.</p></div></section>
      ) : (<>
        {lead.handoff && <Handoff lead={lead} />}

        <section className="sec">
          <h2>In their words</h2>
          <div className="group"><Words lead={lead} /></div>
        </section>

        <section className="sec">
          <h2>Word choice</h2>
          <p className="sub">What they said, over what they could have said.</p>
          <div className="group">
            {lead.signals.map(s => (
              <div key={s.said} className="swap">
                <div className="line"><s>{s.over}</s><span className="arrow">→</span><u>{s.said}</u></div>
                <small>{s.means}</small>
              </div>
            ))}
          </div>
        </section>

        {lead.reference && (
          <section className="sec">
            <h2>Out of every name</h2>
            <p className="sub">Anyone could have made the point. The one they chose tells you what they admire.</p>
            <div className="group">
              <div className="names">{lead.reference.over.map(n => <s key={n}>{n}</s>)}</div>
              <div className="chosen"><b>{lead.reference.name}</b><small>{lead.reference.means}</small></div>
            </div>
          </section>
        )}

        <section className="sec">
          <h2>The read</h2>
          <div className="group odds">
            {lead.read.map(([t, v], i) => (
              <div key={t} className={'o' + (i === 0 ? ' top' : '')}><span>{NEED[t]}</span><b className="num">{v}%</b><Track w={v} /></div>
            ))}
            <p>Probable, not certain. Every call sharpens it.</p>
          </div>
        </section>

        <section className="sec">
          <h2>Say this</h2>
          <div className="say">{lead.say}</div>
          <p className="avoid"><b>Avoid:</b> {lead.avoid}</p>
        </section>

        <section className="sec">
          <h2>Best rep for them</h2>
          <div className="group"><div className="cell av-row"><Avatar initials={best.initials} tint={best.tint} /><div className="t"><b>{best.name}</b><small>Best with {best.style.toLowerCase()}</small></div><div /></div></div>
        </section>
      </>)}

      <section className="sec">
        <h2>The record</h2>
        <div className="group">
          {lead.events.map((e, i) => (
            <div key={i} className="cell nolead">
              <div className="t"><b>{e.what}</b>{e.detail && <small>{e.detail}</small>}</div>
              <div className="v" style={{ textAlign: 'right' }}><span><span style={{ font: '600 14px/1 var(--sans)', color: 'var(--text2)' }}>{e.t}</span><small>{e.src}</small></span></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ================= REP: TODAY ================= */
export function Today({ me, go, api }: { me: string; go: Go; api: MovesApi }) {
  const r = byId(me);
  const queue = LEADS.filter(l => l.rep === me);
  const first = queue[0];
  const move = api.moves.find(m => m.rep === me && m.status !== 'worked' && m.status !== 'missed');
  const [call, setCall] = useState<'idle' | 'live' | 'done'>('idle');
  const [secs, setSecs] = useState(0);
  const t = useRef<number>();
  useEffect(() => () => clearInterval(t.current), []);
  const start = () => { setCall('live'); setSecs(0); t.current = window.setInterval(() => setSecs(s => s + 1), 1000); };
  const end = () => { clearInterval(t.current); setCall('done'); };
  const showed = r.counts[2], commission = cash(r.counts) * 0.1, perCall = showed ? commission / showed : 0;
  return (
    <>
      <Head title="Today" sub="One thing at a time. Everything you do is logged for you." />
      <div className="two">
        <div>
          <section className="next enter">
            <div className="lbl">Next{call === 'live' ? <span className="live">On the call · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span> : call === 'idle' && first.hot && <span className="live">Waiting now</span>}</div>
            <h2>{call === 'done' ? 'Logged' : `Call ${first.name}`}</h2>
            <div className="meta">{call === 'done' ? 'Nothing to type. The call, the time and what was said are on the record.' : `${first.next} · ${first.company}`}</div>
            <div className="acts">
              {call === 'idle' && <button className="btn primary block" onClick={start}><Ic name="phone" size={19} />Call now</button>}
              {call === 'live' && <button className="btn primary block" onClick={end}>End call</button>}
              {call === 'done' && <button className="btn tinted block" onClick={() => setCall('idle')}>Next lead</button>}
            </div>
            {move && call !== 'done' && <div className="hint"><b>Your fix this week:</b> {move.text}</div>}
          </section>
          <section className="sec">
            <h2>Up next</h2>
            <div className="group">
              {queue.slice(1).map(l => (
                <button key={l.id} className="cell nolead" onClick={() => go('my-leads/' + l.id)}>
                  <div className="t"><b>{l.name}</b><small>{l.next}</small></div>
                  <div className="v"><span className="muted" style={{ font: '600 14.5px/1 var(--sans)' }}>{l.due}</span><Chev /></div>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div>
          <section className="sec first">
            <h2>Your line this month</h2>
            <div className="group pad"><Funnel c={r.counts} compact /></div>
          </section>
          <section className="sec">
            <div className="group cell nolead" style={{ minHeight: 84 }}>
              <div className="t"><b>Every call that shows is worth {money(perCall)} to you</b><small>Your commission this month, divided by calls that showed.</small></div>
              <div />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
