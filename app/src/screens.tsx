import { useMemo, useState } from 'react';
import { BENCH, LEADS, NEEDS, PLAYBOOK, REASONS, REPS, STEPS, TREND, type Lead, type Move, type StepIndex } from './data';
import { biggest, byId, cash, health, int, k, leaks, lift, money, pct, perLead, rate, teamCounts, HEALTH_LABEL } from './engine';
import { Avatar, Bar, Funnel, Icon, Pill, Spark, useCount } from './ui';

type Go = (to: string) => void;
type MovesApi = { moves: Move[]; assign: (rep: string, step: StepIndex) => Move; advance: (id: string) => void };

const TEAM = teamCounts();
const STATUS: Record<Move['status'], string> = { assigned: 'Assigned', doing: 'In progress', checking: 'Checking', worked: 'It worked', missed: 'Didn’t move' };

function Head({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="top enter">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {right}
    </header>
  );
}

function Kpi({ label, value, fmt, note, up, leak }: { label: string; value: number; fmt: (v: number) => string; note: string; up?: boolean; leak?: boolean }) {
  const v = useCount(value);
  return (
    <div className={'card kpi' + (leak ? ' leak' : '')}>
      <span className="l">{label}</span><b className="num">{fmt(v)}</b><small className={up ? 'up' : ''}>{note}</small>
    </div>
  );
}

/* ================= OWNER: OVERVIEW ================= */
export function Overview({ go, api }: { go: Go; api: MovesApi }) {
  const top = biggest(TEAM), ls = [...leaks(TEAM)].sort((a, b) => b.worth - a.worth), maxW = Math.max(...ls.map(l => l.worth));
  const live = api.moves.filter(m => m.status !== 'worked' && m.status !== 'missed');
  return (
    <>
      <Head eyebrow="October · your agency" title="Where your leads go" sub="Every step is judged against its own standard. Tap any percentage to see why people fall out there." />
      <div className="grid g4 stagger" style={{ marginBottom: 18 }}>
        <Kpi label="Collected per lead" value={perLead(TEAM)} fmt={money} note="+$34 on last month" up />
        <Kpi label="Cash collected" value={cash(TEAM)} fmt={k} note="Counted from payments" />
        <Kpi label="Leads" value={TEAM[0]} fmt={int} note="From forms and ads" />
        <Kpi label={'Biggest leak · ' + top.name} value={top.worth} fmt={v => k(v) + '/mo'} note="Left on the table" leak />
      </div>
      <section className="card enter" style={{ marginBottom: 18 }}>
        <div className="card-h"><div><h2>From lead to cash</h2><p className="sub">Thickness is volume. What drifts off the line is what you already paid for and lost.</p></div><span className="demo">Demo data</span></div>
        <Funnel c={TEAM} onStep={i => go('leaks/' + i)} />
      </section>
      <div className="grid g2">
        <section className="card enter">
          <div className="card-h"><div><h2>Where the money leaks</h2><p className="sub">Each step lifted to its standard, everything after it unchanged.</p></div></div>
          <div className="list">
            {ls.map(l => (
              <button key={l.step} className="row click" style={{ gridTemplateColumns: 'minmax(0,1fr) 64px' }} onClick={() => go('leaks/' + l.step)}>
                <div><b>{l.name}</b><small>{l.worth > 0 ? k(l.worth) + ' a month' : 'At or above standard'}</small><div style={{ marginTop: 10 }}><Bar w={(l.worth / maxW) * 100} leak={l.step === top.step} /></div></div>
                <Pill i={l.step} v={l.pct} sm />
              </button>
            ))}
          </div>
        </section>
        <section className="card enter">
          <div className="card-h"><div><h2>Moves in flight</h2><p className="sub">What was assigned, and what happened next.</p></div><button className="btn ghost sm" onClick={() => go('moves')}>All moves</button></div>
          <div className="list">
            {live.length ? live.slice(0, 4).map(m => { const r = byId(m.rep); return (
              <button key={m.id} className="row click" style={{ gridTemplateColumns: '36px minmax(0,1fr) auto' }} onClick={() => go('moves')}>
                <Avatar initials={r.initials} tint={r.tint} />
                <div><b>{r.name.split(' ')[0]} · {STEPS[m.step]}</b><small>{STATUS[m.status]}{m.of ? ` · done on ${m.done} of ${m.of} calls` : ''}</small></div>
                {m.after !== null ? <span className="chip"><i />{m.before}% → {m.after}%</span> : <span className="chip">{m.before}%</span>}
              </button>); }) : <p className="empty">No moves in flight. Open a leak to assign one.</p>}
          </div>
        </section>
      </div>
      <section className="card enter" style={{ marginTop: 18 }}>
        <div className="card-h"><div><h2>Your reps, ranked on cash per lead</h2><p className="sub">Close rate is easy to flatter. Revenue per lead holds everything else still.</p></div><button className="btn ghost sm" onClick={() => go('reps')}>All reps</button></div>
        <div className="list">
          {[...REPS].sort((a, b) => perLead(b.counts) - perLead(a.counts)).map((r, i) => { const w = biggest(r.counts); return (
            <button key={r.id} className="row click rank" style={{ gridTemplateColumns: '22px 36px minmax(0,1fr) auto 90px' }} onClick={() => go('reps/' + r.id)}>
              <span className="eyebrow" style={{ letterSpacing: 0 }}>{i + 1}</span><Avatar initials={r.initials} tint={r.tint} />
              <div><b>{r.name}</b><small>Weakest: {w.name}</small></div><Pill i={w.step} v={w.pct} sm />
              <b className="num" style={{ textAlign: 'right' }}>{money(perLead(r.counts))}<small>per lead</small></b>
            </button>); })}
        </div>
      </section>
    </>
  );
}

/* ================= OWNER: ONE LEAK, OPENED ================= */
export function Leaks({ step, go, api, toast }: { step: StepIndex; go: Go; api: MovesApi; toast: (s: string) => void }) {
  const t = rate(TEAM, step), h = health(step, t), worth = lift(TEAM, step);
  const reps = [...REPS].sort((a, b) => rate(a.counts, step) - rate(b.counts, step));
  const worstRep = reps[0], reasons = REASONS[step], maxC = Math.max(...reasons.map(r => r.count));
  const already = api.moves.some(m => m.rep === worstRep.id && m.step === step && m.status !== 'worked' && m.status !== 'missed');
  const splitMark = (q: string, m: string) => { const i = q.indexOf(m); return i < 0 ? <>{q}</> : <>{q.slice(0, i)}<mark className="lk">{m}</mark>{q.slice(i + m.length)}</>; };
  return (
    <>
      <Head eyebrow="Leaks" title={STEPS[step]} sub={`Leaks below ${BENCH[step].leak}%. Strong at ${BENCH[step].strong}% or more. The team is at ${pct(t)}.`}
        right={<div className="seg" role="group" aria-label="Step">{STEPS.map((s, i) => <button key={s} aria-pressed={i === step} onClick={() => go('leaks/' + i)}>{s}</button>)}</div>} />
      <div className="grid g4 stagger" style={{ marginBottom: 18 }}>
        <div className={'card kpi' + (h === 'leak' ? ' leak' : '')}><span className="l">Team rate</span><b className="num">{pct(t)}</b><small>{HEALTH_LABEL[h]} against {BENCH[step].strong}%</small></div>
        <div className="card kpi"><span className="l">Worth fixing</span><b className="num">{worth ? k(worth) : '—'}</b><small>{worth ? 'a month, modeled' : 'Already at standard'}</small></div>
        <div className="card kpi"><span className="l">Lost here</span><b className="num">{int(TEAM[step] - TEAM[step + 1])}</b><small>of {int(TEAM[step])} this month</small></div>
        <div className="card kpi"><span className="l">8-week trend</span><div style={{ marginTop: 12 }}><Spark data={TREND[step]} h={h} /></div></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <section className="card enter">
          <div className="card-h"><div><h2>Why, from the calls</h2><p className="sub">Tagged from every recorded call at this step.</p></div></div>
          <div className="list">
            {reasons.map(r => { const rep = byId(r.rep); return (
              <div key={r.tag} className="row" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><b>{r.tag}</b><b className="num">{r.count}</b></div>
                <Bar w={(r.count / maxC) * 100} leak={r === reasons[0] && h !== 'good'} />
                <p className="quote" style={{ fontSize: 15, fontWeight: 650 }}>“{splitMark(r.quote, r.mark)}”</p>
                <small><span className="src">{r.call}</span> &nbsp;· {rep.name}</small>
              </div>); })}
          </div>
        </section>
        <section className="card enter">
          <div className="card-h"><div><h2>Who leaks here</h2><p className="sub">Same step, each rep against the same standard.</p></div></div>
          <div className="list">
            {reps.map(r => (
              <button key={r.id} className="row click" style={{ gridTemplateColumns: '36px minmax(0,1fr) auto' }} onClick={() => go('reps/' + r.id)}>
                <Avatar initials={r.initials} tint={r.tint} /><div><b>{r.name}</b><small>{int(r.counts[step])} in, {int(r.counts[step + 1])} through</small></div><Pill i={step} v={rate(r.counts, step)} sm />
              </button>))}
          </div>
        </section>
      </div>
      <section className="card enter" style={{ background: 'linear-gradient(155deg,#28344F,#3A4A6E)', color: '#fff' }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Icon name="move" size={44} />
          <div style={{ flex: '1 1 320px' }}>
            <span className="eyebrow" style={{ color: 'var(--peri)' }}>The one move</span>
            <p style={{ margin: '10px 0 0', font: '750 21px/1.4 var(--sans)', letterSpacing: '-.02em' }}>{PLAYBOOK[step].move}</p>
            <p style={{ margin: '10px 0 0', font: '500 14px/1.5 var(--sans)', color: '#C8D6FC' }}>{PLAYBOOK[step].why} Start with {worstRep.name.split(' ')[0]}, lowest here at {pct(rate(worstRep.counts, step))}.</p>
          </div>
          <button className="btn soft" disabled={already} onClick={() => { api.assign(worstRep.id, step); toast(`Assigned to ${worstRep.name.split(' ')[0]}. We check in 7 days.`); }}>
            {already ? 'Already assigned' : `Assign to ${worstRep.name.split(' ')[0]}`}
          </button>
        </div>
      </section>
    </>
  );
}

/* ================= OWNER: REPS ================= */
export function Reps({ go }: { go: Go }) {
  return (
    <>
      <Head eyebrow="Reps" title="Each rep, stage by stage" sub="Same leads, same standards. Tap a rep to see where they leak and what to do about it." />
      <div className="grid g3 stagger">
        {[...REPS].sort((a, b) => perLead(b.counts) - perLead(a.counts)).map(r => { const w = biggest(r.counts); return (
          <button key={r.id} className="card" style={{ textAlign: 'left', border: 0, cursor: 'pointer' }} onClick={() => go('reps/' + r.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar initials={r.initials} tint={r.tint} lg /><div><h2>{r.name}</h2><p className="sub">{r.style}</p></div></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 20 }}><b className="num" style={{ font: '800 34px/1 var(--sans)', letterSpacing: '-.05em', color: 'var(--ink)' }}>{money(perLead(r.counts))}</b><span className="sub" style={{ margin: 0 }}>per lead</span></div>
            <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>{([0, 1, 2, 3] as StepIndex[]).map(i => <Pill key={i} i={i} v={rate(r.counts, i)} sm />)}</div>
            <p className="sub" style={{ marginTop: 16 }}>{w.worth > 0 ? <>Biggest leak: <b style={{ color: 'var(--leak)' }}>{w.name} · {k(w.worth)}/mo</b></> : 'No step below standard'}</p>
          </button>); })}
      </div>
    </>
  );
}

export function RepDrawer({ id, api, toast }: { id: string; api: MovesApi; toast: (s: string) => void }) {
  const r = byId(id), w = biggest(r.counts), mine = api.moves.filter(m => m.rep === id);
  const already = mine.some(m => m.step === w.step && m.status !== 'worked' && m.status !== 'missed');
  return (
    <div className="enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Avatar initials={r.initials} tint={r.tint} lg /><div><span className="eyebrow">Rep</span><h2 style={{ margin: '6px 0 0', font: '800 26px/1.1 var(--sans)', letterSpacing: '-.04em', color: 'var(--ink)' }}>{r.name}</h2></div></div>
      <div className="card flat" style={{ marginTop: 20, padding: '18px 16px' }}><Funnel c={r.counts} compact /></div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
        <div className="card flat kpi"><span className="l">Cash collected</span><b className="num">{k(cash(r.counts))}</b></div>
        <div className="card flat kpi"><span className="l">Calendar booked</span><b className="num">{r.capacity}%</b><small>{r.capacity > 90 ? 'Full. New leads route elsewhere.' : 'Room for more'}</small></div>
      </div>
      {w.worth > 0 && (
        <div className="card flat" style={{ marginTop: 14 }}>
          <span className="eyebrow">Where to look first</span>
          <h2 style={{ marginTop: 10 }}>{w.name} · {pct(w.pct)}</h2>
          <p className="sub">Worth {k(w.worth)} a month at standard. {REASONS[w.step][0].tag} is the most common reason on the team.</p>
          <p style={{ margin: '14px 0 0', font: '700 16px/1.45 var(--sans)', color: 'var(--ink)' }}>{PLAYBOOK[w.step].move}</p>
          <button className="btn primary" style={{ marginTop: 16 }} disabled={already} onClick={() => { api.assign(id, w.step); toast(`Assigned to ${r.name.split(' ')[0]}.`); }}>{already ? 'Already assigned' : 'Assign this move'}</button>
        </div>
      )}
      <div className="card flat" style={{ marginTop: 14 }}>
        <span className="eyebrow">Strongest with</span><p style={{ margin: '10px 0 0', font: '650 15px/1.45 var(--sans)', color: 'var(--ink)' }}>{r.style}</p>
        <p className="sub">Learned from outcomes with similar clients. New leads like this route to {r.name.split(' ')[0]} first when there’s room.</p>
      </div>
      {mine.length > 0 && <div className="card flat" style={{ marginTop: 14 }}><span className="eyebrow">Moves</span><div className="list" style={{ marginTop: 12 }}>{mine.map(m => <div key={m.id} className="row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}><div><b>{STEPS[m.step]}</b><small>{STATUS[m.status]}</small></div>{m.after !== null ? <span className="chip"><i />{m.before}% → {m.after}%</span> : <span className="chip">{m.before}%</span>}</div>)}</div></div>}
    </div>
  );
}

/* ================= OWNER: MOVES ================= */
export function Moves({ api }: { api: MovesApi }) {
  const cols: [string, Move['status'][]][] = [['Assigned', ['assigned']], ['In progress', ['doing']], ['Checking', ['checking']], ['Result', ['worked', 'missed']]];
  return (
    <>
      <Head eyebrow="Moves" title="What was done, and what happened next" sub="Every move has one rep, one step, a date we check, and the number it was meant to change." />
      <div className="grid g4 stagger" style={{ alignItems: 'start' }}>
        {cols.map(([name, st]) => { const list = api.moves.filter(m => st.includes(m.status)); return (
          <section key={name} className="card" style={{ padding: 16 }}>
            <div className="card-h" style={{ marginBottom: 12 }}><h2 style={{ fontSize: 16 }}>{name}</h2><span className="chip">{list.length}</span></div>
            <div className="list">
              {list.length ? list.map(m => { const r = byId(m.rep); return (
                <div key={m.id} className="row" style={{ gridTemplateColumns: 'minmax(0,1fr)', background: '#fff', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar initials={r.initials} tint={r.tint} /><div><b>{r.name.split(' ')[0]}</b><small>{STEPS[m.step]}</small></div></div>
                  <p style={{ margin: 0, font: '600 13.5px/1.45 var(--sans)', color: 'var(--body)' }}>{m.text}</p>
                  {m.of > 0 && <><small>Done on {m.done} of {m.of} calls</small><Bar w={(m.done / m.of) * 100} /></>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    {m.after !== null ? <span className="chip" style={m.status === 'worked' ? { background: 'var(--good-t)', color: 'var(--good)', boxShadow: 'inset 0 0 0 1px rgba(94,190,142,.5)' } : {}}><i />{m.before}% → {m.after}%</span> : <span className="chip">Now {m.before}%</span>}
                    {m.status !== 'worked' && m.status !== 'missed' && <button className="btn ghost sm" onClick={() => api.advance(m.id)}>{m.status === 'assigned' ? 'Start' : m.status === 'doing' ? 'Check' : 'Close'}</button>}
                  </div>
                  <small>Check {m.check}</small>
                </div>); }) : <p className="empty" style={{ padding: '18px 8px' }}>Nothing here.</p>}
            </div>
          </section>); })}
      </div>
    </>
  );
}

/* ================= LEADS ================= */
export function Leads({ go, mine }: { go: Go; mine?: string }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => LEADS.filter(l => (!mine || l.rep === mine) && (l.name + l.company).toLowerCase().includes(q.toLowerCase())), [q, mine]);
  return (
    <>
      <Head eyebrow={mine ? 'My leads' : 'Leads'} title="Every lead, one thread" sub="Each one carries its own words from the first call to the last dollar."
        right={<input aria-label="Search leads" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ height: 42, width: 220, padding: '0 16px', border: 0, borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--line)', background: '#fff', font: '600 14px var(--sans)', color: 'var(--ink)' }} />} />
      <section className="card enter">
        <div className="list stagger">
          {list.map(l => { const r = byId(l.rep); return (
            <button key={l.id} className="row click" style={{ gridTemplateColumns: '36px minmax(0,1.2fr) minmax(0,1fr) auto' }} onClick={() => go((mine ? 'my-leads/' : 'leads/') + l.id)}>
              <Avatar initials={l.name.split(' ').map(s => s[0]).join('')} tint={l.hot ? 'd' : 'a'} />
              <div><b>{l.name}{l.hot && <span style={{ marginLeft: 8, display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#5FC795', verticalAlign: 2 }} />}</b><small>{l.company} · {l.revenue}</small></div>
              <div><b style={{ fontSize: 14 }}>{l.next}</b><small>{l.due} · {r.name.split(' ')[0]}</small></div>
              <span className="chip"><i />{l.stage}</span>
            </button>); })}
          {!list.length && <p className="empty">No leads match.</p>}
        </div>
      </section>
    </>
  );
}

const PAIR: Record<string, string> = { 'Status Seeker': 'dana', Dominator: 'reza', Intellectual: 'dana', Belonger: 'andre', 'People Pleaser': 'maya', Victim: 'maya' };

export function LeadDrawer({ lead }: { lead: Lead }) {
  const r = byId(lead.rep), n = NEEDS[lead.type], best = byId(PAIR[lead.type]);
  const words = lead.quote.split(' ');
  return (
    <div className="enter">
      <span className="eyebrow">{lead.stage} · {lead.source}</span>
      <h2 style={{ margin: '8px 0 0', font: '800 28px/1.1 var(--sans)', letterSpacing: '-.045em', color: 'var(--ink)' }}>{lead.name}</h2>
      <p className="sub" style={{ margin: '6px 0 0', font: '500 14px var(--sans)', color: 'var(--slate)' }}>{lead.company} · {lead.revenue} · with {r.name}</p>
      {lead.typeConf > 0 ? (
        <>
          <div className="card flat" style={{ marginTop: 20 }}>
            <span className="eyebrow">In their words</span>
            <p className="quote" style={{ marginTop: 12 }}>“{words.map((w, i) => { const bare = w.replace(/[.,“”]/g, ''); const self = lead.self.includes(bare); const ch = lead.chose.split(' ').includes(bare);
              return <span key={i}>{self ? <span className="self">{w}</span> : ch ? <mark>{w}</mark> : w}{i < words.length - 1 ? ' ' : ''}</span>; })}”</p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
            <div className="card flat"><span className="eyebrow">How they speak</span><h2 style={{ marginTop: 10, fontSize: 17 }}>{lead.type}</h2><p className="sub">{lead.typeConf}% match · needs {n.need.toLowerCase()}</p></div>
            <div className="card flat"><span className="eyebrow">What matters</span><p style={{ margin: '10px 0 0', font: '650 14.5px/1.45 var(--sans)', color: 'var(--ink)' }}>{lead.matters}</p></div>
          </div>
          <div className="card" style={{ marginTop: 14, background: 'var(--navy)', color: '#fff' }}>
            <span className="eyebrow" style={{ color: 'var(--peri)' }}>Open with</span>
            <p style={{ margin: '10px 0 0', font: '700 17px/1.45 var(--sans)' }}>{n.open}{lead.chose ? ` Use their word: “${lead.chose}”.` : ''}</p>
            <p style={{ margin: '10px 0 0', font: '500 13px/1.4 var(--sans)', color: '#C8D6FC' }}>Avoid: {n.avoid.toLowerCase()}.</p>
          </div>
          <div className="card flat" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar initials={best.initials} tint={best.tint} />
            <div><span className="eyebrow">Best rep for them</span><p style={{ margin: '6px 0 0', font: '650 14.5px/1.4 var(--sans)', color: 'var(--ink)' }}>{best.name} · {best.style.toLowerCase()}</p></div>
          </div>
        </>
      ) : <div className="card flat" style={{ marginTop: 20 }}><p className="empty" style={{ padding: 10 }}>Not heard yet. Their words appear here after the first call.</p></div>}
      <div className="card flat" style={{ marginTop: 14 }}>
        <span className="eyebrow">The record</span>
        <div className="list" style={{ marginTop: 12 }}>
          {lead.events.map((e, i) => <div key={i} className="row" style={{ gridTemplateColumns: '84px minmax(0,1fr) auto', background: 'transparent', padding: '8px 0' }}><span className="num" style={{ font: '500 11.5px var(--mono)', color: 'var(--slate)' }}>{e.t}</span><div><b style={{ fontSize: 14 }}>{e.what}</b>{e.detail && <small>{e.detail}</small>}</div><span className="src">{e.src}</span></div>)}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>Written by the phone, calendar and payments. Nobody typed this.</p>
      </div>
    </div>
  );
}

/* ================= REP: TODAY ================= */
export function Today({ me, go, api }: { me: string; go: Go; api: MovesApi }) {
  const r = byId(me), next = LEADS.find(l => l.rep === me && l.hot) ?? LEADS.find(l => l.rep === me);
  const queue = LEADS.filter(l => l.rep === me && l !== next);
  const [state, setState] = useState<'idle' | 'on' | 'done'>('idle');
  const move = api.moves.find(m => m.rep === me && m.status !== 'worked');
  const commission = cash(r.counts) * .1, perCall = commission / r.counts[2];
  const pc = useCount(perCall);
  return (
    <>
      <Head eyebrow={'Today · ' + r.name} title="One thing at a time" sub="Your next action is at the top. Everything you do gets logged for you." />
      <div className="grid g2">
        <section className="card enter" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="eyebrow">Next action</span><span className="chip" style={{ color: 'var(--good)' }}><i style={{ background: '#5FC795' }} />Live</span></div>
          {next ? <>
            <h2 style={{ margin: '18px 0 0', font: '800 34px/1.05 var(--sans)', letterSpacing: '-.045em', color: 'var(--ink)' }}>{next.next === 'First call' ? 'Call ' : ''}{next.name}</h2>
            <p className="sub" style={{ fontSize: 15 }}>{next.next} · {next.company} · {next.due}</p>
            {next.words.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>{next.words.map(w => <span key={w} className="chip"><i />{w}</span>)}</div>}
            <button className="btn primary" style={{ width: '100%', height: 56, marginTop: 20, fontSize: 16, background: state === 'on' ? '#3E9F74' : undefined }}
              onClick={() => setState(s => (s === 'idle' ? 'on' : 'done'))}>{state === 'idle' ? 'Call now' : state === 'on' ? 'Connected · tap to end' : 'Call again'}</button>
            {state === 'done' && <p className="enter" style={{ margin: '12px 0 0', textAlign: 'center', font: '650 13.5px var(--sans)', color: 'var(--good)' }}>Logged. Nothing to type.</p>}
            <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => go('my-leads/' + next.id)}>Open their words</button>
          </> : <p className="empty">You’re clear. New leads land here the moment they come in.</p>}
          {queue.length > 0 && <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #EEF2FC' }}>
            <span className="eyebrow">Up next</span>
            <div className="list" style={{ marginTop: 10 }}>{queue.map(l => <button key={l.id} className="row click" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} onClick={() => go('my-leads/' + l.id)}><div><b>{l.name}</b><small>{l.next}</small></div><small style={{ margin: 0 }}>{l.due}</small></button>)}</div>
          </div>}
        </section>
        <div className="grid" style={{ alignContent: 'start' }}>
          <section className="card enter">
            <span className="eyebrow">Your line this month</span>
            <div style={{ marginTop: 14 }}><Funnel c={r.counts} compact /></div>
          </section>
          {move && <section className="card enter">
            <span className="eyebrow">Your one move</span>
            <p style={{ margin: '10px 0 0', font: '750 17px/1.45 var(--sans)', color: 'var(--ink)' }}>{move.text}</p>
            <p className="sub">{STEPS[move.step]} is at {move.before}%{move.after !== null ? `, now ${move.after}%` : ''}. We check {move.check}.</p>
          </section>}
          <section className="card enter" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div className="orb" style={{ ['--blend' as string]: 'conic-gradient(from 200deg,#96E0BA,#C8D6FC,#96E0BA,#C8D6FC,#96E0BA)', ['--os' as string]: '88px' }}><b className="num">{money(pc)}</b></div>
            <div><h2>Every call has a price</h2><p className="sub">Your commission per attended call this month. The next one is worth about {money(perCall)}.</p></div>
          </section>
        </div>
      </div>
    </>
  );
}


