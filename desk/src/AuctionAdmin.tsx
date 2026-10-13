/* The owner's cockpit on the Desk (#/auction/admin). One question per page, one number per row,
   read from the Worker every 10 seconds (src/lib/admin-api.ts holds every call and every sum).
     #/auction/admin            the week: the scorecard's five numbers, the bottleneck line, the reserve
     #/auction/admin/money      who is owed, the sales waiting, every money event (Paid By Hand, Release, Forfeit)
     #/auction/admin/refusals   bids and sign-ins the lane refused, by reason, the last ten
     #/auction/admin/lane       deposits, lots, sales by state, fees owed (collateral.md §5)
     #/auction/admin/dealers    standing: suspend or restore; Add A Dealer mints his key once (collateral.md §6)
   Every verb that moves money or standing is asked on the bottom sheet (BottomSheet.tsx ActionSheet).
   Money is Bodoni Moda (the house face for money and names; obavia-co/waitlist.css). */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import bodoniUrl from '../../obavia-co/assets/bodoni-moda-500.woff2?url';
import { auctionLive, isAdminKey, type DealerRow, type Lot, type SaleState } from './lib/auction';
import { admin, PAY_METHODS, reconLine, refusals, scorecard, typeWord, when, NOT_YET, type AdminExposure, type Money, type MoneySale, type Payout, type PayMethod } from './lib/admin-api';
import { Back, Ic, feel, transition, useHash } from './ui';
import { Count } from './motion';
import { ActionSheet } from './BottomSheet';

const DEPOSIT_USD = 250;
const STATES: { s: SaleState; label: string; gloss: string }[] = [
  { s: 'owed', label: 'Owed', gloss: 'Hammer down, buyer has not paid' },
  { s: 'paid', label: 'Paid', gloss: 'Waiting on pickup' },
  { s: 'started', label: 'Started', gloss: 'Picked up; the sale is complete' },
  { s: 'forfeited', label: 'Forfeited', gloss: 'Buyer walked; deposit to the dealer' },
  { s: 'voided', label: 'Voided', gloss: 'Dealer could not deliver; deposit back' },
];
const SAID: Record<string, string> = {
  offline: 'The lane is out of reach.', 'no key': 'Paste the admin key first.', 'admin only': 'This key is a dealer’s key.',
  'bad dealer': 'The GDN is 5 to 12 capital letters or digits, and the name is required.', 'no such dealer': 'That dealer is not on file.',
  [NOT_YET]: 'Not yet.', 'no reason': 'Write a reason first.', 'no method': 'Pick the method first.', 'no such buyer': 'That buyer is not on file.',
};
const say = (reason: string) => SAID[reason] ?? `The lane said no: ${reason}.`;
const whole = (n: number) => Math.round(n).toLocaleString('en-US');
const ratio = (n: number) => n.toFixed(2);
/* Whole dollars print without cents; a figure with cents keeps them (every money movement traceable to its row). */
const dollars = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const METHOD: Record<PayMethod, string> = { wire: 'Wire', check: 'Check', cash: 'Cash' };

/* ---------- the house face for money ---------- */
let bodoni = false;
function useBodoni() {
  useEffect(() => {
    if (bodoni || typeof FontFace === 'undefined') return; bodoni = true;
    new FontFace('Bodoni Moda', `url(${bodoniUrl})`, { weight: '500', style: 'normal' }).load().then(f => document.fonts.add(f)).catch(() => { /* Bodoni 72 on iPhone, then Didot */ });
  }, []);
}
const MONEY: CSSProperties = { fontFamily: "'Bodoni Moda','Bodoni 72',Didot,serif", fontWeight: 500, fontStyle: 'normal', fontVariantNumeric: 'lining-nums tabular-nums', letterSpacing: '-.005em', color: 'var(--ink)' };
const M = ({ children, size = 24 }: { children: ReactNode; size?: number }) => <span style={{ ...MONEY, fontSize: size, lineHeight: 1 }}>{children}</span>;
/* A section's name: upright spaced capitals, quiet. */
const Label = ({ children }: { children: ReactNode }) => <p className="note" style={{ marginTop: 30, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 650, fontSize: 17 }}>{children}</p>;
const Chev = () => <span className="chev" aria-hidden="true"><Ic n="chev" s={18} w={2.2} /></span>;

export function AuctionAdmin() {
  if (!auctionLive) return <OneLine line="The lane is not connected." />;
  if (!isAdminKey()) return <OneLine line="This key is a dealer’s key." />;
  return <Cockpit />;
}

function OneLine({ line }: { line: string }) {
  return (
    <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter"><h1 className="q">{line}</h1></section>
    </main>
  );
}

type Data = { x: AdminExposure | null; lane: Lot[] | null; money: Money | null; moneyWhy: string | null; err: string | null; at: number };

function Cockpit() {
  useBodoni();
  const page = useHash().split('/')[3] ?? '';
  const [d, setD] = useState<Data>({ x: null, lane: null, money: null, moneyWhy: null, err: null, at: 0 });
  const load = async () => {
    const [x, lane, money] = await Promise.all([admin.exposure(), admin.lane(), admin.money()]);
    setD({ x: x.ok ? x.value : null, lane: lane.ok ? lane.value : null, money: money.ok ? money.value : null, moneyWhy: money.ok ? null : money.reason, err: x.ok ? null : say(x.reason), at: Date.now() });
  };
  useEffect(() => { let on = true; const tick = () => { if (on) load(); }; tick(); const t = setInterval(tick, 10_000); return () => { on = false; clearInterval(t); }; }, []);

  if (page === 'money') return <MoneyPage d={d} reload={load} />;
  if (page === 'refusals') return <Refusals d={d} />;
  if (page === 'lane') return <LanePage d={d} />;
  if (page === 'dealers') return <Dealers d={d} reload={load} />;
  return <Home d={d} />;
}

/* ---------- the week: five numbers, one bottleneck ---------- */
function Home({ d }: { d: Data }) {
  const { x } = d;
  const s = scorecard(Date.now(), x, d.lane, d.money);
  const r = x?.deposits.reserveRatio ?? null;
  const ratioOk = r == null || Math.abs(r - 1) < 1e-9;
  const owed = d.money?.payouts.filter(p => p.state === 'owed').length ?? null;
  const ref = refusals(x);
  const day = (t: number) => new Date(t).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key="admin">
        <h1 className="q">Week {s.week}, <em>now.</em></h1>
        <p className="note">{d.at ? `${day(s.start)} to ${day(s.end - 1)}. Refreshes every 10 seconds.` : 'Reaching the lane…'}</p>
        {d.err && <p className="note bad">{d.err}</p>}
        <div className="group" style={{ marginTop: 22 }}>
          {s.numbers.map(n => (
            <div className="row" key={n.k}>
              <span className="t"><b>{n.k} · {n.label}</b><small>{n.from}</small></span>
              <span className="v" style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                {n.value == null ? <span style={{ color: 'var(--faint)' }}>Not yet</span> : <M>{n.shown}</M>}
                <small style={{ margin: 0, color: 'var(--muted)' }}>{n.floor == null ? 'Not judged' : `Floor ${n.floorShown}`}</small>
              </span>
            </div>
          ))}
        </div>
        <p className="note" style={{ color: 'var(--ink)', fontWeight: 600, marginTop: 14 }}>{s.bottleneck}</p>

        <Label>Reserve</Label>
        <div className="group">
          <div className="row"><span className="t"><b>Reserve ratio</b><small>Whop balance over deposits held</small></span>
            {x && r != null ? <span style={{ ...MONEY, fontSize: 24, color: ratioOk ? 'var(--ink)' : 'var(--red)' }}><Count pulse value={r} format={ratio} /></span> : <span className="v" style={{ color: 'var(--faint)' }}>Not read</span>}</div>
          <div className="row"><span className="t"><b>Last reconciled</b><small>{x ? reconLine(x.reconciliations) : 'Not read'}</small></span></div>
        </div>
        {!ratioOk && <p className="note bad">The reserve is not 1.00. Stop opening lots and reconcile the Whop balance today.</p>}

        <div className="group" style={{ marginTop: 30 }}>
          <a className="row" href="#/auction/admin/money" onClick={feel.tap}><span className="t"><b>Money</b><small>Owed to dealers, sales waiting, every event</small></span><span className="v">{owed == null ? 'Not yet' : owed ? `${owed} owed` : 'None owed'}</span><Chev /></a>
          <a className="row" href="#/auction/admin/refusals" onClick={feel.tap}><span className="t"><b>Refused</b><small>Bids and sign-ins the lane said no to</small></span><span className="v">{ref.read ? whole(ref.counts.reduce((a, c) => a + c.n, 0)) : 'Not yet'}</span><Chev /></a>
          <a className="row" href="#/auction/admin/lane" onClick={feel.tap}><span className="t"><b>Lots and deposits</b><small>Every dollar and every risk on the lane</small></span><span className="v">{x ? `${whole(x.lots.open)} open` : ''}</span><Chev /></a>
          <a className="row" href="#/auction/admin/dealers" onClick={feel.tap}><span className="t"><b>Dealers</b><small>Standing: suspend or restore</small></span><span className="v">{x ? whole(x.dealers.length) : ''}</span><Chev /></a>
        </div>
      </section>
      <div className="dock"><div className="in"><a className="btn primary block" href="#/auction/admin/money" onClick={feel.next}>See The Money</a></div></div>
    </main>
  );
}

/* ---------- the money: who is owed, the sales waiting, every event ---------- */
type Ask = { kind: 'paid'; p: Payout } | { kind: 'forfeit' | 'release'; s: MoneySale };

function MoneyPage({ d, reload }: { d: Data; reload: () => void }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [only, setOnly] = useState<string | null>(null);
  const names = new Map((d.x?.dealers ?? []).map(r => [r.gdn, r.name]));
  const dealerName = (g: string | null | undefined) => (g ? names.get(g) ?? g : 'The dealer');
  const m = d.money;
  const notYet = !m && d.moneyWhy === NOT_YET;
  // The money list's sales carry the buyer; until it answers, the exposure's sales stand in (no buyer, so no Release).
  const sales: MoneySale[] = (m?.sales.length ? m.sales : (d.x?.sales ?? []).map(s => ({ lotId: s.lotId, dealer: s.dealer ?? null, buyer: null, state: s.state, hammer: s.hammer, deadlineAt: s.deadlineAt, deposit: s.deposit ?? null })))
    .filter(s => s.state === 'owed' || s.state === 'paid').sort((a, b) => (a.state === b.state ? a.deadlineAt - b.deadlineAt : a.state === 'owed' ? -1 : 1));
  const types = [...new Set((m?.events ?? []).map(typeWord))];
  const events = (m?.events ?? []).filter(e => !only || typeWord(e) === only).slice(0, 100);

  const open = (a: Ask) => { feel.tap(); setErr(null); setMethod(null); setNote(''); setAsk(a); };
  const act = async (a: Ask) => {
    const id = a.kind === 'paid' ? a.p.id : a.s.lotId;
    setBusy(id); setErr(null);
    const r = a.kind === 'paid' ? (method ? await admin.paidByHand(a.p.id, method, note) : { ok: false as const, reason: 'no method' })
      : a.kind === 'forfeit' ? await admin.forfeit(a.s.lotId, note)
      : await admin.release(a.s.buyer ?? '', note, a.s.lotId);
    setBusy(null);
    if (r.ok) { feel.done(); reload(); } else setErr(say(r.reason));
  };

  const faint = (on: boolean): CSSProperties => ({ padding: '8px 4px', font: '650 17px/1 var(--sans)', textTransform: 'uppercase', letterSpacing: '.12em', color: on ? 'var(--ink)' : 'var(--faint)', textDecoration: on ? 'underline' : 'none', textUnderlineOffset: 6, textDecorationThickness: 2 });
  const noteField = (placeholder: string) => (
    <input className="input" value={note} onChange={e => setNote(e.target.value.slice(0, 200))} placeholder={placeholder} aria-label={placeholder}
      style={{ display: 'block', width: '100%', margin: '16px 0 34px', fontSize: 17, textAlign: 'center' }} />
  );

  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin" label="Admin" /></div>
      <section className="enter" key="money">
        <h1 className="q">The <em>money.</em></h1>
        <p className="note">Owed first. Then every event, newest first.</p>
        {err && <p className="note bad">{err}</p>}

        <Label>Owed to dealers</Label>
        <div className="group">
          {!m && <div className="row"><span className="t"><b>{notYet ? 'Not yet' : 'Not read'}</b><small>{notYet ? 'The lane does not list payouts yet' : d.moneyWhy ? say(d.moneyWhy) : 'Reaching the lane…'}</small></span></div>}
          {m && !m.payouts.length && <div className="row"><span className="t"><b>Nobody is owed</b></span></div>}
          {m?.payouts.filter(p => p.state === 'owed').map(p => (
            <button className="row" key={p.id} disabled={busy === p.id} onClick={() => open({ kind: 'paid', p })}>
              <span className="t"><b>{dealerName(p.dealer)}</b><small>Lot {p.lotId}</small></span>
              <span className="v" style={{ display: 'grid', justifyItems: 'end', gap: 6 }}><M>{dollars(p.amountUsd)}</M><span style={{ color: 'var(--accent)' }}>{busy === p.id ? '…' : 'Paid By Hand'}</span></span>
            </button>
          ))}
          {m?.payouts.filter(p => p.state === 'paid').map(p => (
            <div className="row" key={p.id}>
              <span className="t"><b>{dealerName(p.dealer)}</b><small>Lot {p.lotId} · {p.method ? `by ${p.method}` : 'paid'}{p.paidAt ? ` · ${when(p.paidAt)}` : ''}{p.note ? ` · ${p.note}` : ''}</small></span>
              <span className="v"><M size={20}>{dollars(p.amountUsd)}</M></span>
            </div>
          ))}
        </div>

        <Label>Sales waiting</Label>
        <div className="group">
          {!sales.length && <div className="row"><span className="t"><b>No sale waiting</b><small>Owed and paid sales land here</small></span></div>}
          {sales.map(s => {
            const verb = s.state === 'owed' ? 'Forfeit' : 'Release';
            const can = verb === 'Forfeit' || !!s.buyer;
            const late = s.state === 'owed' && s.deadlineAt < Date.now();
            const line = <><b>{dealerName(s.dealer)}</b><small>Lot {s.lotId} · {s.state === 'owed' ? (late ? 'past the deadline' : `pay by ${when(s.deadlineAt)}`) : 'paid, waiting on pickup'}{s.buyer ? ` · ${s.buyer}` : ''}</small></>;
            return can
              ? <button className="row" key={s.lotId} disabled={busy === s.lotId} onClick={() => open({ kind: verb === 'Forfeit' ? 'forfeit' : 'release', s })}>
                  <span className="t">{line}</span>
                  <span className="v" style={{ display: 'grid', justifyItems: 'end', gap: 6 }}><M>{dollars(s.hammer)}</M><span style={{ color: verb === 'Forfeit' ? 'var(--red)' : 'var(--accent)' }}>{busy === s.lotId ? '…' : verb}</span></span>
                </button>
              : <div className="row" key={s.lotId}><span className="t">{line}</span><span className="v" style={{ display: 'grid', justifyItems: 'end', gap: 6 }}><M>{dollars(s.hammer)}</M><span style={{ color: 'var(--faint)' }}>Buyer not read</span></span></div>;
          })}
        </div>

        <Label>Events</Label>
        {m && types.length > 1 && <div role="group" aria-label="Show only" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 18px', marginTop: 8 }}>
          {[null, ...types].map(t => <button key={t ?? 'all'} aria-pressed={only === t} style={faint(only === t)} onClick={() => { feel.tap(); transition(() => setOnly(t)); }}>{t ?? 'All'}</button>)}
        </div>}
        <div className="group">
          {!m && <div className="row"><span className="t"><b>{notYet ? 'Not yet' : 'Not read'}</b><small>{notYet ? 'The lane does not list money events yet' : 'Reaching the lane…'}</small></span></div>}
          {m && !events.length && <div className="row"><span className="t"><b>No money has moved</b></span></div>}
          {events.map(e => (
            <div className="row" key={e.id}>
              <span className="t"><b>{typeWord(e)}</b><small>{[e.lotId && `Lot ${e.lotId}`, e.buyer, when(e.at)].filter(Boolean).join(' · ')}</small></span>
              <span className="v">{e.amountUsd == null ? '' : <M size={20}>{dollars(e.amountUsd)}</M>}</span>
            </div>
          ))}
        </div>
      </section>

      {ask?.kind === 'paid' && <ActionSheet verb={method ? `Paid By ${METHOD[method]}` : 'Paid By Hand'} onAct={() => act(ask)} onClose={() => setAsk(null)}
        line={<>
          <b>{dealerName(ask.p.dealer)}</b> got <M size={22}>{dollars(ask.p.amountUsd)}</M> for lot {ask.p.lotId}, outside Whop.
          <span role="group" aria-label="How it was paid" style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 14 }}>
            {PAY_METHODS.map(k => <button key={k} aria-pressed={method === k} style={faint(method === k)} onClick={() => { feel.tap(); setMethod(k); }}>{METHOD[k]}</button>)}
          </span>
          {noteField('A note: check number, wire reference')}
        </>} />}
      {ask?.kind === 'forfeit' && <ActionSheet verb="Forfeit" onAct={() => act(ask)} onClose={() => setAsk(null)}
        line={<>
          The buyer walked on lot {ask.s.lotId}. The <M size={22}>{dollars(DEPOSIT_USD)}</M> deposit goes to <b>{dealerName(ask.s.dealer)}</b>.
          {noteField('The reason, in one line')}
        </>} />}
      {ask?.kind === 'release' && <ActionSheet verb="Release" onAct={() => act(ask)} onClose={() => setAsk(null)}
        line={<>
          The <M size={22}>{dollars(DEPOSIT_USD)}</M> deposit goes back to <b>{ask.s.buyer}</b>, buyer on lot {ask.s.lotId}.
          {noteField('The reason, in one line')}
        </>} />}
    </main>
  );
}

/* ---------- the refusals: how many, why, the last ten ---------- */
function Refusals({ d }: { d: Data }) {
  const r = refusals(d.x);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin" label="Admin" /></div>
      <section className="enter" key="refusals">
        <h1 className="q">Who was <em>refused?</em></h1>
        <p className="note">Bids and sign-ins the lane said no to.</p>
        <div className="group" style={{ marginTop: 22 }}>
          {!r.read && <div className="row"><span className="t"><b>{d.x ? 'Not yet' : 'Not read'}</b><small>{d.x ? 'The lane does not count refusals yet' : d.err ?? 'Reaching the lane…'}</small></span></div>}
          {r.read && !r.counts.length && <div className="row"><span className="t"><b>Nothing refused</b></span></div>}
          {r.counts.map(c => <div className="row" key={c.label}><span className="t"><b>{c.label}</b></span><span className="v" style={{ ...MONEY, fontSize: 24 }}>{whole(c.n)}</span></div>)}
        </div>
        {r.recent.length > 0 && <>
          <Label>The last ten</Label>
          <div className="group">
            {r.recent.map((x, i) => <div className="row" key={i}><span className="t"><b>{x.label}</b><small>{x.who} · {when(x.at)}</small></span></div>)}
          </div>
        </>}
      </section>
    </main>
  );
}

/* ---------- lots and deposits: the exposure report ---------- */
function LanePage({ d }: { d: Data }) {
  const { x } = d;
  const count = (s: SaleState) => x?.sales.filter(v => v.state === s).length ?? 0;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin" label="Admin" /></div>
      <section className="enter" key="lane">
        <h1 className="q">The lane, <em>now.</em></h1>
        <p className="note">{x ? 'From the auction Worker. Refreshes every 10 seconds.' : d.err ?? 'Reaching the lane…'}</p>
        {x && <>
          <Label>Deposits</Label>
          <div className="group">
            <div className="row"><span className="t"><b>Deposits held</b><small>Buyers admitted to bid</small></span><Count pulse className="v num" value={x.deposits.heldCount} format={whole} /></div>
            <div className="row"><span className="t"><b>Dollars held</b><small>{x.deposits.heldCount.toLocaleString('en-US')} × {dollars(DEPOSIT_USD)}, in the Whop balance</small></span><span style={{ ...MONEY, fontSize: 24 }}><Count pulse value={x.deposits.heldUsd} format={dollars} /></span></div>
          </div>
          <Label>Lots</Label>
          <div className="group">
            <div className="row"><span className="t"><b>Open</b></span><Count pulse className="v num" value={x.lots.open} format={whole} /></div>
            <div className="row"><span className="t"><b>Title at a lender</b><small>Open lots waiting on a lien release</small></span><Count pulse className="v num" value={x.lots.atLender} format={whole} /></div>
            <div className="row"><span className="t"><b>Floor below payoff</b><small>The dealer brings the difference at sale</small></span><Count pulse className="v num" style={x.lots.floorBelowPayoff ? { color: 'var(--warn)' } : undefined} value={x.lots.floorBelowPayoff} format={whole} /></div>
          </div>
          <Label>Sales</Label>
          <div className="group">
            {STATES.map(s => <div className="row" key={s.s}><span className="t"><b>{s.label}</b><small>{s.gloss}</small></span><Count pulse className="v num" value={count(s.s)} format={whole} /></div>)}
          </div>
          <Label>Fees</Label>
          <div className="group">
            <div className="row"><span className="t"><b>Fees owed to Obavia</b><small>None until the GDN issues (43 TAC §215.85)</small></span><span style={{ ...MONEY, fontSize: 24 }}><Count pulse value={x.obaviaFeesOwed} format={dollars} /></span></div>
          </div>
        </>}
      </section>
    </main>
  );
}

/* ---------- dealers: standing, and a new dealer's key ---------- */
function Dealers({ d, reload }: { d: Data; reload: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [asking, setAsking] = useState<DealerRow | null>(null);
  if (adding) return <AddDealer onDone={() => { setAdding(false); reload(); }} />;
  /* Suspend and Restore are asked on a bottom sheet (native-patterns §7 line 12), never a browser confirm(). */
  const standing = async (r: DealerRow) => {
    setBusy(r.gdn); setErr(null);
    const res = r.suspended ? await admin.restore(r.gdn) : await admin.suspend(r.gdn);
    setBusy(null);
    if (res.ok) { feel.done(); reload(); } else setErr(say(res.reason));
  };
  const rows = d.x?.dealers ?? [];
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin" label="Admin" /></div>
      <section className="enter" key="dealers">
        <h1 className="q">The <em>dealers.</em></h1>
        <p className="note">A suspended dealer opens no new lot. Open lots keep running.</p>
        {(err || d.err) && <p className="note bad">{err ?? d.err}</p>}
        <div className="group" style={{ marginTop: 22 }}>
          {d.x && !rows.length && <div className="row"><span className="t"><b>No dealers yet</b><small>Add one below.</small></span></div>}
          {rows.map(r => (
            <button className="row" key={r.gdn} disabled={busy === r.gdn} onClick={() => { feel.tap(); setAsking(r); }}>
              <span className="t"><b>{r.name}</b><small>{r.gdn} · {r.incidents} {r.incidents === 1 ? 'incident' : 'incidents'}{r.suspended ? ' · suspended' : ''}</small></span>
              <span className="v" style={{ color: r.suspended ? 'var(--accent)' : 'var(--red)' }}>{busy === r.gdn ? '…' : r.suspended ? 'Restore' : 'Suspend'}</span>
            </button>
          ))}
        </div>
      </section>
      {asking && <ActionSheet
        line={asking.suspended ? <><b>{asking.name}</b> ({asking.gdn}) can open lots again.</> : <><b>{asking.name}</b> ({asking.gdn}) cannot open a lot until you restore them. Lots already open keep running.</>}
        verb={asking.suspended ? 'Restore' : 'Suspend'} onAct={() => standing(asking)} onClose={() => setAsking(null)} />}
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); setAdding(true); }}>Add A Dealer</button></div></div>
    </main>
  );
}

/* ---------- Add a dealer: the GDN, the name, then the key once ---------- */
function AddDealer({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState<'gdn' | 'name' | 'key'>('gdn');
  const [gdn, setGdn] = useState('');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const to = (p: typeof page, d: 'fwd' | 'back' = 'fwd') => transition(() => { setPage(p); setErr(null); scrollTo(0, 0); }, d);
  const gdnOk = /^[A-Z0-9]{5,12}$/.test(gdn);

  const mint = async () => {
    setBusy(true); setErr(null);
    const r = await admin.mint(gdn, name.trim());
    setBusy(false);
    if (r.ok) { feel.done(); setKey(r.value.token); to('key'); } else setErr(say(r.reason));
  };
  const copy = async () => { try { await navigator.clipboard.writeText(key); setCopied(true); feel.done(); } catch { setErr('Copy failed. Select the key and copy it by hand.'); } };

  return (
    <main className="wrap center">
      <div className="top">{page === 'key' ? <span /> : <button className="back" onClick={() => { feel.tap(); page === 'gdn' ? onDone() : to('gdn', 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button>}</div>
      {page === 'gdn' && <section className="enter" key="gdn">
        <h1 className="q">The dealer’s <em>GDN.</em></h1>
        <p className="note">The Texas dealer licence number, as printed. P followed by digits.</p>
        <label className="field"><input className="input big num" autoFocus value={gdn} onChange={e => setGdn(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} placeholder="P123456" autoCapitalize="characters" autoCorrect="off" spellCheck={false} /></label>
      </section>}
      {page === 'name' && <section className="enter" key="name">
        <h1 className="q">The dealer’s <em>name.</em></h1>
        <p className="note">As the buyer will see it. {gdn}.</p>
        <label className="field"><input className="input" autoFocus value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="Triple J Auto" /></label>
      </section>}
      {page === 'key' && <section className="enter" key="key">
        <h1 className="q" style={name.length > 28 ? { fontSize: 'clamp(28px,7.4vw,36px)' } : undefined}>{name}’s <em>key.</em></h1>
        <p className="note">Shown once. Paste it into the dealer's Desk under Lane, then Key.</p>
        <label className="field"><textarea className="input num" readOnly rows={2} value={key} onFocus={e => e.currentTarget.select()} style={{ height: 'auto', padding: '16px 18px', lineHeight: 1.4, resize: 'none', overflowWrap: 'anywhere', textAlign: 'center' }} /></label>
      </section>}
      {err && <p className="note">{err}</p>}
      <div className="dock"><div className="in">
        {page === 'gdn' && <button className="btn primary block" disabled={!gdnOk} onClick={() => { feel.next(); to('name'); }}>Next</button>}
        {page === 'name' && <button className="btn primary block" disabled={busy || !name.trim()} onClick={mint}>Make The Key</button>}
        {page === 'key' && <button className="btn primary block" onClick={copied ? onDone : copy}>{copied ? 'Done' : 'Copy'}</button>}
      </div></div>
    </main>
  );
}
