/* What runs without the owner, and the one text that tells them about it:
   payments posted for them (each undoable for two days), and tonight's text. */
import { useEffect } from 'react';
import { dayState, withBanking } from './lib/cashday';
import { evening, hourLabel } from './lib/evening';
import { METHOD_LABEL, daysBetween, money, today } from './lib/loans';
import { autoPostable, inbox, read } from './lib/match';
import { nice } from './Payments';
import { me, runAutoPost, setAutoPost, setEvening, undoAutoPost, useStore } from './store';
import { can } from './lib/staff';
import { Back, Ic, feel, go } from './ui';

export const UNDO_DAYS = 2;

/** Everything waiting in To Match, and, when the owner allows it, the sure ones posted on sight. */
export function useMoney() {
  const st = useStore();
  const { dealer, loans = [], money: all = [], matched = {}, payers, cashDays = {}, autoPost, noAuto = [] } = st;
  const t = today(dealer.timeZone), bank = withBanking(cashDays, all);
  const box = inbox(all, loans, t, { ...matched, ...bank.deposits }, payers);
  const sure = autoPost ? autoPostable(box, noAuto) : [];
  useEffect(() => { if (sure.length) runAutoPost(sure); }, [sure.map(s => s.money.id).join()]);   // eslint-disable-line react-hooks/exhaustive-deps
  return { t, box: sure.length ? box.filter(s => !sure.includes(s)) : box, bank, st };
}

/** Tonight's text, from the same facts the screens show. */
export function useEvening() {
  const { t, box, bank, st } = useMoney();
  const loans = st.loans ?? [];
  const flagged = Object.values(bank.days).filter(d => d.date < t && ['short', 'not_banked'].includes(dayState(loans, d, d.date, t))).length;
  return evening({ dealerName: st.dealer.dba || st.dealer.legalName, date: t, loans, toMatch: box.length, cashState: dayState(loans, bank.days[t], t, t), flaggedDays: flagged });
}

export function Posted() {
  const { dealer, loans = [], money: all = [], autoPosted = [], autoPost } = useStore();
  const t = today(dealer.timeZone);
  const owner = can(me(), 'undo');
  const rows = [...autoPosted].reverse().map(a => ({ a, l: loans.find(x => x.id === a.loanId), m: (x => x && read(x))(all.find(x => x.id === a.moneyId)) }));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="posted">
        <h1 className="q">Posted For You.</h1>
        <p className="note">Sure matches post on their own.{owner ? ` Undo any for ${UNDO_DAYS} days.` : ''}</p>
        <div className="list-plain stack">
          {rows.map(({ a, l, m }) => <div key={a.moneyId}>
            <b>{l?.buyer.name ?? 'A note'} · {money(m?.cents ?? 0)}</b>
            <span>{METHOD_LABEL[m?.rail ?? 'other']}{m?.from ? ` from ${m.from.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}` : ''} · {nice(a.on)} · receipt #{a.receipt}</span>
            {owner && daysBetween(a.on, t) <= UNDO_DAYS && <small><button className="textlink undo" onClick={() => { feel.tap(); undoAutoPost(a.moneyId); }}>Undo</button></small>}
          </div>)}
        </div>
        {!rows.length && <p className="note">Nothing yet.</p>}
        {owner && <div className="choices">
          <button className="choice" aria-pressed={!!autoPost} onClick={() => { feel.tap(); setAutoPost(!autoPost); }}>
            <span className="t"><b>Post Sure Ones For Me</b></span><span className="tick">{autoPost && <Ic n="check" s={15} w={3} />}</span>
          </button>
        </div>}
      </section>
    </main>
  );
}

export function EveningText() {
  const { evening: e = { on: false, hour: 19 } } = useStore();
  const ev = useEvening();
  if (!can(me(), 'settings')) { go('/payments'); return null; }
  const set = (x: Partial<typeof e>) => { feel.tap(); setEvening({ ...e, ...x }); };
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/payments" label="Payments" /></div>
      <section className="enter" key="eve">
        <h1 className="q">Tonight’s Text.</h1>
        <p className="note">{e.on ? `Sent to you at ${hourLabel(e.hour)}` : 'Off'}</p>
        <div className="sms"><small>You · {hourLabel(e.hour)}</small><span className="bubble you">{ev.text}</span></div>
        <div className="choices">
          <button className="choice" aria-pressed={e.on} onClick={() => set({ on: !e.on })}><span className="t"><b>Every Evening</b></span><span className="tick">{e.on && <Ic n="check" s={15} w={3} />}</span></button>
        </div>
        {e.on && <div className="chips">{[18, 19, 20, 21].map(h => <button key={h} className={'chip' + (e.hour === h ? ' on' : '')} onClick={() => set({ hour: h })}><b>{hourLabel(h).replace(':00', '')}</b></button>)}</div>}
      </section>
    </main>
  );
}
