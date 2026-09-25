/* The handoff: the setter's notes to the closer, written by Obavia from the
   call. A profile of the lead, and the three points that decide the close. */
import { NEED, STRING, type Lead } from './data';
import { byId } from './engine';
import { Ic } from './ui';

const SET = STRING.slice(0, 5), CLOSE = STRING.slice(5);

function Row({ k, children, miss }: { k: string; children?: React.ReactNode; miss?: boolean }) {
  return (
    <div className="hrow">
      <span className="k">{k}</span>
      <div className="val">{miss ? <span className="miss">Not uncovered yet</span> : children}</div>
    </div>
  );
}

export function Handoff({ lead }: { lead: Lead }) {
  const h = lead.handoff!;
  const setter = byId(h.from).name.split(' ')[0];
  const skipped = SET.filter(s => !h.hit.includes(s));
  const next = STRING.find(s => !h.hit.includes(s));
  return (
    <>
      <section className="sec">
        <h2>The handoff</h2>
        <p className="sub">From {setter}’s call, {h.when}. Written by Obavia. Nothing typed.</p>
        <div className="fix hand">
          <div className="lbl">Three points to close</div>
          <ol>
            <li><b>Open</b>{h.close.open}</li>
            <li><b>Lead with</b>{h.close.pillar}</li>
            <li><b>The consequence</b>{h.close.consequence}</li>
          </ol>
          <div className="use"><span>Use their words</span>{h.close.words.map(w => <q key={w}>{w}</q>)}</div>
        </div>
      </section>

      <section className="sec">
        <h2>Who they are</h2>
        <div className="group">
          <Row k="Wants"><b>{h.goal}</b><small>{h.implies}</small></Row>
          <Row k="Their approach"><b>“{h.approach.said}”</b><small>Labeled <em>{h.approach.label}</em></small></Row>
          <Row k="Catalyst" miss={!h.catalyst}><b>{h.catalyst}</b></Row>
          <Row k="Pain" miss={!h.pain}>{h.pain && <><b>{h.pain.what} · {h.pain.since}</b><small>{h.pain.impact}</small></>}</Row>
          <Row k="The gap" miss={!h.gap}>{h.gap && <><b>{h.gap.want}</b><small>Now: {h.gap.now}</small></>}</Row>
          <Row k="Identity"><b>{h.identity}</b><small>{setter}’s label. Use it back to them.</small></Row>
          <Row k="Archetype"><b>{lead.type}{lead.read[0] ? ` · ${lead.read[0][1]}%` : ''}</b><small>{NEED[lead.type]}. Significant to them: {h.significant.charAt(0).toLowerCase() + h.significant.slice(1)}</small></Row>
        </div>
      </section>

      <section className="sec">
        <h2>Already handled</h2>
        <div className="group">
          {h.handled.length ? h.handled.map(x => (
            <div key={x.q} className="hrow qa"><small>{x.q}</small><b>“{x.a}”</b></div>
          )) : <p className="empty">Nothing pre-handled yet. Do it yourself and past attempts are still open.</p>}
          {h.asset && (
            <div className="hrow qa">
              <small>{h.asset.name}</small>
              {h.asset.watched ? <b>Watched. Their takeaway: “{h.asset.takeaway}”</b> : <b className="miss">Not watched yet. Ask them to before the call.</b>}
            </div>
          )}
        </div>
      </section>

      <section className="sec">
        <h2>The string</h2>
        <p className="sub">{skipped.length ? `The set skipped ${skipped.join(', ').replace(/, ([^,]*)$/, ' and $1')}. Cover ${skipped.length > 1 ? 'them' : 'it'} first.` : next ? `Pick up at ${next.toLowerCase()}.` : 'Every step hit. Ask for the decision.'}</p>
        <div className="group string">
          {[['The set', SET], ['The close', CLOSE]].map(([t, steps]) => (
            <div key={t as string}>
              <span className="k">{t as string}</span>
              {(steps as readonly string[]).map(s => { const on = h.hit.includes(s as never), gap = !on && SET.includes(s as never); return (
                <div key={s} className={'st2' + (on ? ' on' : gap ? ' gap' : '') + (s === next ? ' next' : '')}>
                  <i>{on && <Ic name="check" size={12} w={3} />}</i>{s}
                </div>); })}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
