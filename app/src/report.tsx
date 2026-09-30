/* The daily sales manager report. Every call from yesterday, read, and turned
   into one page for the owner, one for marketing and one for each rep. */
import { DAY, DEAL, LEADS, REPS, type RepDay } from './data';
import { byId, k, money, perLead } from './engine';
import { Head, Marked, Stat } from './screens';
import { Avatar, Chev, Ic } from './ui';

type Go = (to: string) => void;

const first = (id: string) => byId(id).name.split(' ')[0];
const sum = (f: (d: RepDay) => number) => DAY.reps.reduce((t, d) => t + f(d), 0);
const booked = sum(d => d.booked), showed = sum(d => d.showed), won = sum(d => d.won);
const noShows = booked - showed;
const closeOnShow = showed ? won / showed : 0;
const lost = noShows * closeOnShow * DEAL;
const byClose = [...DAY.reps].sort((a, b) => b.won / b.showed - a.won / a.showed);
const best = byClose[0], worst = byClose[byClose.length - 1];
const allShowed = DAY.reps.find(d => d.showed === d.booked);
const mostMissed = [...DAY.reps].sort((a, b) => (b.booked - b.showed) - (a.booked - a.showed))[0];
const far = DAY.gap[DAY.gap.length - 1], near = DAY.gap[0];
const pct = (a: number, b: number) => Math.round((a / b) * 100) + '%';
const TODAY = LEADS.filter(l => /^(Today|Now)/.test(l.due));

function Note({ d }: { d: RepDay }) {
  return (
    <>
      <small>{d.note.text}</small>
      {d.note.quote && d.note.mark && <p className="q">“<Marked text={d.note.quote} mark={d.note.mark} />”</p>}
      {d.note.call && <span className="src">{d.note.call}</span>}
    </>
  );
}

/* ================= OWNER ================= */
export function Report({ go }: { go: Go }) {
  return (
    <>
      <Head title="Daily report" sub={`${DAY.of}, read from all ${DAY.heard} calls. Sent at ${DAY.sent}.`} />

      <section className="lead-card enter">
        <div className="lbl">Yesterday</div>
        <h2>No-shows cost you {k(lost)}.</h2>
        <p>
          {noShows} of {booked} booked calls didn’t show.
          {allShowed && <> {first(allShowed.rep)} confirmed every agenda and all {allShowed.showed} showed.</>}
          {mostMissed && <> {first(mostMissed.rep)} lost {mostMissed.booked - mostMissed.showed}, most booked for “any time”.</>}
        </p>
        <button className="btn primary" onClick={() => go('leaks/1')}>See the fix</button>
      </section>

      <div className="group stats enter" style={{ marginTop: 16 }}>
        <Stat label="Showed" value={showed} fmt={v => `${Math.round(v)} of ${booked}`} />
        <Stat label="Closed" value={won} fmt={v => String(Math.round(v))} />
        <Stat label="Cash collected" value={won * DEAL} fmt={k} />
      </div>

      <div className="two">
        <section className="sec">
          <h2>Rep by rep</h2>
          <p className="sub">One win or one fix each, in their own words. Each rep gets their own page.</p>
          <div className="group">
            {DAY.reps.map(d => { const r = byId(d.rep); return (
              <button key={d.rep} className="cell av-row rpt" onClick={() => go('reps/' + d.rep)}>
                <Avatar initials={r.initials} tint={r.tint} />
                <div className="t">
                  <b>{r.name}<em className={'kind ' + d.note.kind}>{d.note.kind === 'win' ? 'Worked' : 'Fix'}</em></b>
                  <Note d={d} />
                </div>
                <div className="v" style={{ alignSelf: 'start' }}><span className="num">{d.won}/{d.showed}</span><Chev /></div>
              </button>); })}
          </div>
        </section>

        <div>
          <section className="sec">
            <h2>Was it the leads?</h2>
            <div className="group pad verdict">
              <p><b>No.</b> On the same pool, {first(best.rep)} closed {best.won} of {best.showed} and {first(worst.rep)} closed {worst.won} of {worst.showed}.</p>
              <p className="why">The difference, from the calls: {worst.note.text.charAt(0).toLowerCase() + worst.note.text.slice(1)}</p>
            </div>
          </section>

          <section className="sec">
            <h2>Days from booking to the call</h2>
            <p className="sub">Every day out, they see other offers. Booked {far.when.toLowerCase()}, {pct(far.showed, far.booked)} showed. Same or next day, {pct(near.showed, near.booked)}.</p>
            <div className="group">
              {DAY.gap.map(g => (
                <div key={g.when} className="cell nolead">
                  <div className="t"><b>{g.when}</b><small>{g.showed} of {g.booked} showed</small></div>
                  <div className="v"><span className="num">{pct(g.showed, g.booked)}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>Who they compared you to</h2>
            <p className="sub">Named by leads on yesterday’s calls, and what to sell against each.</p>
            <div className="group">
              {DAY.compared.map(c => (
                <div key={c.to} className="cell nolead obj">
                  <div className="t"><b>{c.to}</b><small>Named on {c.count} calls</small><p className="fix-line">{c.against}</p></div>
                  <div className="v" style={{ alignSelf: 'start' }}><span className="num">{c.count}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>Objections, and the offer fix</h2>
            <p className="sub">What stopped yesterday’s deals, and what would stop it coming up again.</p>
            <div className="group">
              {DAY.objections.map(o => (
                <div key={o.tag} className="cell nolead obj">
                  <div className="t"><b>{o.said}</b><small>{o.tag} · heard {o.count} times · {o.lost} {o.lost === 1 ? "deal" : "deals"} lost · {k(o.lost * DEAL)}</small><p className="fix-line">{o.change}</p></div>
                  <div className="v" style={{ alignSelf: 'start' }}><span className="num">{o.count}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>By source</h2>
            <p className="sub">What marketing sees. Cash per lead, never contracted revenue.</p>
            <div className="group">
              {DAY.sources.map(s => (
                <div key={s.src} className="cell nolead">
                  <div className="t"><b>{s.src}</b><small>{s.showed} of {s.booked} showed · {s.won} closed</small></div>
                  <div className="v"><span className="num">{money((s.won * DEAL) / s.leads)}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>Calls to watch today</h2>
            <div className="group">
              {TODAY.map(l => (
                <button key={l.id} className="cell nolead" onClick={() => go('leads/' + l.id)}>
                  <div className="t"><b>{l.name}</b><small>{l.next} · {first(l.rep)}{l.read.length ? ' · ' + l.type : ''}</small></div>
                  <div className="v"><span className="muted" style={{ font: '600 14.5px/1 var(--sans)' }}>{l.due.replace('Today ', '')}</span><Chev /></div>
                </button>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>Who gets it</h2>
            <div className="group">
              {DAY.sentTo.map(s => (
                <div key={s.who} className="cell nolead">
                  <div className="t"><b>{s.who}</b><small>{s.gets}</small></div>
                  <div className="v"><span className="muted" style={{ font: '600 14px/1 var(--sans)' }}>{s.role}</span></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/* ================= REP ================= */
export function MyReport({ me, go }: { me: string; go: Go }) {
  const d = DAY.reps.find(x => x.rep === me)!;
  const ranked = [...REPS].sort((a, b) => perLead(b.counts) - perLead(a.counts));
  const place = ranked.findIndex(r => r.id === me), mine = perLead(byId(me).counts);
  const ahead = place > 0 ? ranked[place - 1] : null;
  const lead = LEADS.find(l => l.id === d.lead);
  return (
    <>
      <Head title="Your report" sub={`${DAY.of}, read from your calls. Here at ${DAY.sent}.`} />

      <section className="lead-card enter rep">
        <div className={'lbl ' + d.note.kind}>{d.note.kind === 'win' ? 'What worked' : 'One thing to fix'}</div>
        <h2>{d.note.text}</h2>
        {d.note.quote && d.note.mark && <p className="q big">“<Marked text={d.note.quote} mark={d.note.mark} />”</p>}
      </section>

      <div className="group stats enter" style={{ marginTop: 16 }}>
        <Stat label="Showed" value={d.showed} fmt={v => `${Math.round(v)} of ${d.booked}`} />
        <Stat label="Closed" value={d.won} fmt={v => String(Math.round(v))} />
        <Stat label="You earned" value={d.won * DEAL * 0.1} fmt={money} />
      </div>

      <section className="sec">
        <h2>Today</h2>
        <div className="next">
          <h2 style={{ fontSize: 22 }}>{d.today}</h2>
          {lead && <div className="acts"><button className="btn primary block" onClick={() => go('my-leads/' + lead.id)}><Ic name="leads" size={19} />Open {lead.name.split(' ')[0]}</button></div>}
        </div>
      </section>

      <section className="sec">
        <h2>Where you stand</h2>
        <div className="group cell nolead" style={{ minHeight: 84 }}>
          <div className="t">
            <b>{place + 1} of {ranked.length} on cash per lead · {money(mine)}</b>
            <small>{ahead ? `${ahead.name.split(' ')[0]} is ${money(perLead(ahead.counts) - mine)} ahead. Better leads go to whoever leads this.` : 'You lead the team. The best leads come to you first.'}</small>
          </div>
          <div />
        </div>
      </section>
    </>
  );
}
