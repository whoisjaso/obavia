/* The owner's cockpit on the Desk (#/auction/admin). One question per page, one number per row,
   read from the Worker every 10 seconds (src/lib/admin-api.ts holds every call and every sum).
     #/auction/admin            the week: the scorecard's five numbers, the bottleneck line, the reserve, the nights equal
     #/auction/admin/money      who is owed, the sales waiting, every money event (Paid By Hand, Release, Forfeit)
     #/auction/admin/refusals   bids and sign-ins the lane refused, by reason, the last ten
     #/auction/admin/lane       deposits, lots, sales by state, fees owed (collateral.md §5)
     #/auction/admin/dealers    standing: suspend or restore; the Whop account's verified state; Add A Dealer mints his key once (collateral.md §6)
     #/auction/admin/dealers/:gdn  one dealer: his lane settings as four rows, read-only (GET /admin/dealers/:gdn/settings); Suspend or
                                Restore in the dock; the faint "Dealers only lane" marks him for the closed lane (POST .../wholesale)
     #/auction/admin/lot/:id    one lot's log: every row in time order, newest last (GET /admin/lots/:id/log)
   Wave 3 (gap-table.md §4 W3-E): Home's three rows beside deposits held (watchers per lot, hammer over floor, days to pickup);
   the GDN row on the lane page, "Not issued" until the owner types the date and the two fees on the sheet (the numbers live
   in the platform row, never here: deviation 9); the invoices by state and the disputes' evidence packs on the money page.
   Wave 4 (gap-table.md §4 W4-D): Add A Dealer asks the key's role on three clouds (Owner, Manager, Lot; the key object beside
   each) and the key page names the role; Home's faint "Export" opens the sheet with Sales, Money, Lots and saves the CSV through
   the admin key in the header (never a URL with the key); the dealer page above.
   Every verb that moves money or standing is asked on the bottom sheet (BottomSheet.tsx ActionSheet).
   Money is Bodoni Moda (the house face for money and names; obavia-co/waitlist.css). */
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import bodoniUrl from '../../obavia-co/assets/bodoni-moda-500.woff2?url';
import { auctionLive, isAdminKey, type Lot, type SaleState } from './lib/auction';
import { admin, disputedDeposits, disputeRows, gdnRow, invoicesByState, INVOICE_KIND, PAY_METHODS, pickupRefusals, reconLine, refusals, reserveLine, scorecard, streakRow, threeRows, typeWord, verifiedWord, when, NOT_YET, EXPORTS, EXPORT_WORD, ROLES, ROLE_LINE, ROLE_NAME, roleOfKey, saveCsv, settingsRows, wholesaleWord, GDN, type AdminDealerRow, type AdminExposure, type DealerLaneSettings, type ExportWhat, type LotLog, type Money, type MoneySale, type Payout, type PayMethod, type Role, type Streak } from './lib/admin-api';
import { Obj } from './Auction';
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
  'no date': 'Type the date it issued.', 'bad fee': 'Type both fees in dollars.',
  'no role': 'Pick the role first.', role_denied: 'Not this key’s role.', 'no export': 'Pick one first.',
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
/* Nothing under 17 px on the glass (DOCTRINE §4 rule 3): the Wave 3 rows set their own size over the desk's .row b and small. */
const B = ({ children, color }: { children: ReactNode; color?: string }) => <b style={{ fontSize: 17, lineHeight: 1.25, color }}>{children}</b>;
const S = ({ children }: { children: ReactNode }) => <small style={{ fontSize: 17, lineHeight: 1.3 }}>{children}</small>;
const V = ({ children, color }: { children: ReactNode; color?: string }) => <span className="v" style={{ fontSize: 17, color }}>{children}</span>;
/* The one faint word for a hidden option (lego.md §2): 17 px, spaced capitals, faint ink. */
const FAINT: CSSProperties = { display: 'block', margin: '14px auto 0', padding: '10px 14px', font: '650 17px/1 var(--sans)', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--faint)', background: 'none', border: 0 };
/* A cloud in a sheet or a page: the Desk's choice card, its words at 17 px (DOCTRINE §4 rule 3), one object beside them. */
const Cloud = ({ label, line, on, disabled, obj, onPick }: { label: string; line: string; on?: boolean; disabled?: boolean; obj?: boolean; onPick: () => void }) => (
  <button className="choice" aria-pressed={on} disabled={disabled} onClick={onPick} style={{ marginTop: 10 }}>
    {obj && <span className="art"><Obj name="key" h={36} /></span>}
    <span className="t"><b style={{ fontSize: 18 }}>{label}</b><small style={{ fontSize: 17 }}>{line}</small></span>
    <span className="tick">{on && <Ic n="check" s={15} w={3} />}</span>
  </button>
);

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

type Data = { x: AdminExposure | null; lane: Lot[] | null; money: Money | null; moneyWhy: string | null; streak: Streak | null; err: string | null; at: number };

function Cockpit() {
  useBodoni();
  const hash = useHash();
  const page = hash.split('/')[3] ?? '';
  const [d, setD] = useState<Data>({ x: null, lane: null, money: null, moneyWhy: null, streak: null, err: null, at: 0 });
  const load = async () => {
    const [x, lane, money, streak] = await Promise.all([admin.exposure(), admin.lane(), admin.money(), admin.streak()]);
    setD({ x: x.ok ? x.value : null, lane: lane.ok ? lane.value : null, money: money.ok ? money.value : null, moneyWhy: money.ok ? null : money.reason, streak: streak.ok ? streak.value : null, err: x.ok ? null : say(x.reason), at: Date.now() });
  };
  useEffect(() => { let on = true; const tick = () => { if (on) load(); }; tick(); const t = setInterval(tick, 10_000); return () => { on = false; clearInterval(t); }; }, []);

  if (page === 'money') return <MoneyPage d={d} reload={load} />;
  if (page === 'refusals') return <Refusals d={d} />;
  if (page === 'lane') return <LanePage d={d} reload={load} />;
  if (page === 'dealers') { const gdn = decodeURIComponent(hash.split('/')[4] ?? ''); return gdn ? <DealerPage key={gdn} gdn={gdn} d={d} reload={load} /> : <Dealers d={d} reload={load} />; }
  if (page === 'lot') return <LotLogPage id={decodeURIComponent(hash.split('/')[4] ?? '')} />;
  return <Home d={d} />;
}

/* ---------- the week: five numbers, one bottleneck ---------- */
function Home({ d }: { d: Data }) {
  const { x } = d;
  const [exporting, setExporting] = useState(false);
  const [what, setWhat] = useState<ExportWhat>('sales');
  const [exportErr, setExportErr] = useState<string | null>(null);
  /* The CSV comes down with the key in the header; the browser saves the blob under the Worker's filename. */
  const exportCsv = async () => {
    setExportErr(null);
    const r = await admin.exportCsv(what);
    if (r.ok) { saveCsv(r.value); feel.done(); } else setExportErr(say(r.reason));
  };
  const s = scorecard(Date.now(), x, d.lane, d.money);
  const r = x?.deposits.reserveRatio ?? null;
  const ratioOk = r == null || Math.abs(r - 1) < 1e-9;
  const owed = d.money?.payouts.filter(p => p.state === 'owed').length ?? null;
  const ref = refusals(x);
  const nights = streakRow(d.streak);
  const three = threeRows(Date.now(), x, d.lane);
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

        {/* Phase 2 Admin (phases.md:61): deposits held and the three numbers beside it, each touching its words (lego.md §4 placement 1). */}
        <Label>The lane</Label>
        <div className="group">
          <div className="row"><span className="t"><B>Deposits held</B><S>{x ? `${whole(x.deposits.heldCount)} × ${dollars(DEPOSIT_USD)}` : 'Not read'}</S></span>
            {x ? <span style={{ ...MONEY, fontSize: 24 }}><Count pulse value={x.deposits.heldCount} format={whole} /></span> : <V color="var(--faint)">Not read</V>}</div>
          {three.map(n => (
            <div className="row" key={n.k}><span className="t"><B>{n.label}</B><S>{n.from}</S></span>
              {n.value == null ? <V color="var(--faint)">{n.shown}</V> : <M>{n.shown}</M>}</div>
          ))}
        </div>

        <Label>Reserve</Label>
        <div className="group">
          <div className="row"><span className="t"><b>Reserve ratio</b><small>Whop balance over deposits held and payouts owed</small><small>{reserveLine(x)}</small></span>
            {x && r != null ? <span style={{ ...MONEY, fontSize: 24, color: ratioOk ? 'var(--ink)' : 'var(--red)' }}><Count pulse value={r} format={ratio} /></span> : <span className="v" style={{ color: 'var(--faint)' }}>Not read</span>}</div>
          <div className="row"><span className="t"><b>Last reconciled</b><small>{x ? reconLine(x.reconciliations) : 'Not read'}</small></span></div>
          {/* The streak touches its words (lego.md §4 placement 1); green once the Phase 2 Server exit is met (phases.md: equal seven nights running). */}
          <div className="row"><span className="t">
            <b style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: nights.met ? 'var(--good)' : 'var(--ink)' }}>
              {nights.n == null ? <span style={{ color: 'var(--faint)' }}>Not read</span> : <><span style={{ ...MONEY, fontSize: 24, color: 'inherit' }} className="num">{nights.n}</span>nights equal</>}
            </b>
            <small>{nights.gate}</small>
          </span></div>
          {nights.differences.length > 0 && <div className="row" style={{ display: 'block' }}>
            {/* The copy and the object share a baseline per field (placement 2, aligned); the eye compares, nobody writes "versus". */}
            <div className="num" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,.9fr) minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.1fr)', columnGap: 10, rowGap: 8, font: '600 14px/1.3 var(--sans)', color: 'var(--ink)', overflowWrap: 'anywhere' }}>
              {['Lot', 'Field', 'Copy', 'Object'].map(h => <span key={h} style={{ font: '700 11px/1 var(--sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>{h}</span>)}
              {nights.differences.map((c, i) => <Fragment key={i}><span>{c.lot}</span><span>{c.field}</span><span style={{ color: 'var(--red)' }}>{c.copy}</span><span>{c.object}</span></Fragment>)}
            </div>
          </div>}
        </div>
        {!ratioOk && <p className="note bad">The reserve is not 1.00. Stop opening lots and reconcile the Whop balance today.</p>}

        <div className="group" style={{ marginTop: 30 }}>
          <a className="row" href="#/auction/admin/money" onClick={feel.tap}><span className="t"><b>Money</b><small>Owed to dealers, sales waiting, every event</small></span><span className="v">{owed == null ? 'Not yet' : owed ? `${owed} owed` : 'None owed'}</span><Chev /></a>
          <a className="row" href="#/auction/admin/refusals" onClick={feel.tap}><span className="t"><b>Refused</b><small>Bids and sign-ins the lane said no to</small></span><span className="v">{ref.read ? whole(ref.counts.reduce((a, c) => a + c.n, 0)) : 'Not yet'}</span><Chev /></a>
          <a className="row" href="#/auction/admin/lane" onClick={feel.tap}><span className="t"><b>Lots and deposits</b><small>Every dollar and every risk on the lane</small></span><span className="v">{x ? `${whole(x.lots.open)} open` : ''}</span><Chev /></a>
          <a className="row" href="#/auction/admin/dealers" onClick={feel.tap}><span className="t"><b>Dealers</b><small>Standing: suspend or restore</small></span><span className="v">{x ? whole(x.dealers.length) : ''}</span><Chev /></a>
        </div>
        {/* The one faint word (lego.md §2): the three CSVs for the Monday scorecard live behind it, never on the glass. */}
        <button style={FAINT} onClick={() => { feel.tap(); setExportErr(null); setExporting(true); }}>Export</button>
        {exportErr && <p className="note bad">{exportErr}</p>}
      </section>
      {exporting && <ActionSheet verb={`Export ${EXPORT_WORD[what]}`} onAct={exportCsv} onClose={() => setExporting(false)}
        line={<>
          One CSV, from the Worker’s copy.
          <span role="group" aria-label="Which one" style={{ display: 'block', marginTop: 6, marginBottom: 22 }}>
            {EXPORTS.map(w => <Cloud key={w} label={EXPORT_WORD[w]} line={EXPORT_LINE[w]} on={what === w} onPick={() => { feel.tap(); setWhat(w); }} />)}
          </span>
        </>} />}
      <div className="dock"><div className="in"><a className="btn primary block" href="#/auction/admin/money" onClick={feel.next}>See The Money</a></div></div>
    </main>
  );
}
/** Under each export's name, four words or fewer. */
const EXPORT_LINE: Record<ExportWhat, string> = { sales: 'Every sale, every state', money: 'Every event, every payout', lots: 'Every lot, open and closed' };

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
  const dispute = disputedDeposits(d.x, m);
  const packs = disputeRows(d.x, m);
  const invoices = invoicesByState(m);
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

        <Label>Invoices</Label>
        <div className="group">
          {!m && <div className="row"><span className="t"><B>{notYet ? 'Not yet' : 'Not read'}</B></span></div>}
          {m && !invoices.length && <div className="row"><span className="t"><B>No invoice yet</B><S>The balance at the hammer; the fee after the GDN</S></span></div>}
          {invoices.map(g => g.rows.map((i, k) => (
            <div className="row" key={i.id || `${g.state}-${k}`}>
              <span className="t"><B>{INVOICE_KIND[i.kind]} · {g.word}</B><S>{[`Lot ${i.lotId}`, i.whopId, i.at ? when(i.at) : null].filter(Boolean).join(' · ')}</S></span>
              <span className="v"><M size={20}>{dollars(i.amountUsd)}</M></span>
            </div>
          )))}
        </div>

        <Label>Disputed</Label>
        <div className="group">
          <div className="row"><span className="t"><B>Deposits disputed</B><S>{dispute.n == null ? 'Not read' : dispute.buyers.length ? dispute.buyers.join(' · ') : 'No bid and no release until Whop rules'}</S></span>
            <span className="v" style={{ ...MONEY, fontSize: 24, color: dispute.n ? 'var(--red)' : 'var(--ink)' }}>{dispute.n == null ? '' : whole(dispute.n)}</span></div>
          {/* One pack per dispute (collateral.md:28, the four parts in one PDF): its hash touches its lot; Whop's answer is one word. */}
          {packs.map((p, i) => (
            <div className="row" key={`${p.lotId}-${i}`}>
              <span className="t"><B>Lot {p.lotId}</B><S>{[p.buyer, p.at ? when(p.at) : null].filter(Boolean).join(' · ')}</S>
                <S>{p.sha256 ? <span className="num" style={{ overflowWrap: 'anywhere' }}>{p.sha256}</span> : 'No pack yet'}</S></span>
              <V color={p.upload === 'Sent' ? 'var(--good)' : p.upload === 'Refused' ? 'var(--red)' : 'var(--faint)'}>{p.upload}</V>
            </div>
          ))}
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
function LanePage({ d, reload }: { d: Data; reload: () => void }) {
  const { x } = d;
  const count = (s: SaleState) => x?.sales.filter(v => v.state === s).length ?? 0;
  const pick = pickupRefusals(x);
  const names = new Map((x?.dealers ?? []).map(r => [r.gdn, r.name]));
  const gdn = gdnRow(x);
  const [asking, setAsking] = useState(false);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
  const [perCar, setPerCar] = useState('');
  const [monthly, setMonthly] = useState('');
  const [err, setErr] = useState<string | null>(null);
  /* The fee numbers are typed here by the owner and sent in cents; nothing in this file knows them (gap-table.md deviation 9). */
  const toCents = (v: string) => { const t = v.trim(); if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN; return Math.round(Number(t) * 100); };
  const issued = async () => {
    const [y, mo, da] = date.split('-').map(Number);
    const at = y && mo && da ? Date.UTC(y, mo - 1, da, 12) : NaN;
    const r = await admin.gdn(at, toCents(perCar), toCents(monthly));
    if (r.ok) { feel.done(); reload(); } else setErr(say(r.reason));
  };
  const fee = (v: string, set: (s: string) => void, label: string) => (
    <input className="input num" value={v} onChange={e => set(e.target.value.replace(/[^\d.]/g, '').slice(0, 9))} inputMode="decimal" placeholder={label} aria-label={label}
      style={{ display: 'block', width: '100%', margin: '12px 0 0', fontSize: 18, textAlign: 'center' }} />
  );
  const lots = [...(d.lane ?? [])].sort((a, b) => (!!a.closed === !!b.closed ? b.opensAt - a.opensAt : a.closed ? 1 : -1));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin" label="Admin" /></div>
      <section className="enter" key="lane">
        <h1 className="q">The lane, <em>now.</em></h1>
        <p className="note">{x ? 'From the auction Worker. Refreshes every 10 seconds.' : d.err ?? 'Reaching the lane…'}</p>
        {err && <p className="note bad">{err}</p>}
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
          <Label>Pickup refused</Label>
          <div className="group">
            {!pick.read && <div className="row"><span className="t"><b>Not yet</b><small>The lane does not list pickup refusals yet</small></span></div>}
            {pick.read && !pick.rows.length && <div className="row"><span className="t"><b>No pickup refused</b></span></div>}
            {pick.rows.map((r, i) => <div className="row" key={i}><span className="t"><b>{r.label}</b><small>Lot {r.lotId} · {names.get(r.dealer) ?? r.dealer} · {r.six} · {when(r.at)}</small></span></div>)}
          </div>
          <Label>Fees</Label>
          <div className="group">
            {/* The GDN row is this page's one verb, and only until the date is set: a licence issues once (one-action.md, "if an option isn't relevant yet, don't show it"). */}
            {gdn.read && !gdn.issued
              ? <button className="row" onClick={() => { feel.tap(); setErr(null); setAsking(true); }}><span className="t"><B>Obavia’s GDN</B><S>43 TAC §215.85</S></span><V color="var(--accent)">{gdn.line}</V></button>
              : <div className="row"><span className="t"><B>Obavia’s GDN</B><S>43 TAC §215.85</S></span><V color={gdn.issued ? 'var(--good)' : 'var(--faint)'}>{gdn.line}</V></div>}
            <div className="row"><span className="t"><B>Fees owed to Obavia</B><S>{gdn.feesLine}</S></span>
              {gdn.issued ? <span style={{ ...MONEY, fontSize: 24 }}><Count pulse value={x.obaviaFeesOwed} format={dollars} /></span> : <V color="var(--faint)">None</V>}</div>
          </div>
          <Label>Every lot</Label>
          <div className="group">
            {!lots.length && <div className="row"><span className="t"><B>No lot on the lane</B></span></div>}
            {lots.map(l => (
              <a className="row" href={`#/auction/admin/lot/${encodeURIComponent(l.id)}`} key={l.id} onClick={feel.tap}>
                <span className="t"><B>{l.car ? `${l.car.year} ${l.car.make} ${l.car.model}` : `Lot ${l.id}`}</B><S>{l.closed ? (l.closed.sold ? 'Sold' : 'Not sold') : 'Open'} · {l.id}</S></span>
                <V>{l.closed ? 'Log' : `${whole(l.watching)} watching`}</V><Chev />
              </a>
            ))}
          </div>
        </>}
      </section>
      {asking && <ActionSheet verb="Issued" onAct={issued} onClose={() => setAsking(false)}
        line={<>
          Obavia’s GDN issued on this date. Fees start from it, never before.
          <input className="input num" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="The date it issued" max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })}
            style={{ display: 'block', width: '100%', margin: '16px 0 0', fontSize: 18, textAlign: 'center' }} />
          {fee(perCar, setPerCar, 'Per sold car, dollars')}
          {fee(monthly, setMonthly, 'Per month, dollars')}
          <span style={{ display: 'block', height: 22 }} />
        </>} />}
    </main>
  );
}

/* ---------- one lot's log: every row in time order, newest last ---------- */
function LotLogPage({ id }: { id: string }) {
  const [log, setLog] = useState<LotLog | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    const tick = async () => { const r = await admin.log(id); if (!on) return; if (r.ok) { setLog(r.value); setWhy(null); } else setWhy(r.reason); };
    tick(); const t = setInterval(tick, 10_000); return () => { on = false; clearInterval(t); };
  }, [id]);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin/lane" label="Lane" /></div>
      <section className="enter" key={`log-${id}`}>
        <h1 className="q">Lot {id}, <em>in order.</em></h1>
        <p className="note">Oldest first. The newest row is last.</p>
        <div className="group" style={{ marginTop: 22 }}>
          {!log && <div className="row"><span className="t"><B>{why === NOT_YET ? 'Not yet' : 'Not read'}</B><S>{why == null ? 'Reaching the lane…' : why === NOT_YET ? 'The lane does not keep a log yet' : say(why)}</S></span></div>}
          {log && !log.rows.length && <div className="row"><span className="t"><B>Nothing yet</B></span></div>}
          {/* Each row's time sits under its word (placement 1, touching); the order is the story (placement 6, sequence). */}
          {log?.rows.map((r, i) => (
            <div className="row" key={`${r.kind}-${r.at}-${i}`}>
              <span className="t"><B>{r.word}</B><S>{[when(r.at), r.line].filter(Boolean).join(' · ')}</S></span>
              <span className="v">{r.amountUsd == null ? '' : <M size={20}>{dollars(r.amountUsd)}</M>}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/* ---------- dealers: standing, and a new dealer's key ---------- */
function Dealers({ d, reload }: { d: Data; reload: () => void }) {
  const [adding, setAdding] = useState(false);
  if (adding) return <AddDealer onDone={() => { setAdding(false); reload(); }} />;
  const rows = d.x?.dealers ?? [];
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin" label="Admin" /></div>
      <section className="enter" key="dealers">
        <h1 className="q">The <em>dealers.</em></h1>
        <p className="note">A suspended dealer opens no new lot. Open lots keep running.</p>
        {d.err && <p className="note bad">{d.err}</p>}
        <div className="group" style={{ marginTop: 22 }}>
          {d.x && !rows.length && <div className="row"><span className="t"><b>No dealers yet</b><small>Add one below.</small></span></div>}
          {/* Each row opens the dealer's page (his settings, his standing, the closed lane mark); the mark's word sits on the row once set. */}
          {rows.map(r => (
            <a className="row" key={r.gdn} href={`#/auction/admin/dealers/${encodeURIComponent(r.gdn)}`} onClick={feel.tap}>
              <span className="t"><B>{r.name}</B><S>{r.gdn} · {r.incidents} {r.incidents === 1 ? 'incident' : 'incidents'}{r.suspended ? ' · suspended' : ''}</S>
                <S>Whop · {verifiedWord(r)}</S></span>
              <V color={r.suspended ? 'var(--red)' : wholesaleWord(r) ? 'var(--accent)' : 'var(--faint)'}>{r.suspended ? 'Suspended' : wholesaleWord(r) ?? ''}</V><Chev />
            </a>
          ))}
        </div>
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); setAdding(true); }}>Add A Dealer</button></div></div>
    </main>
  );
}

/* ---------- one dealer: his settings as four rows (read-only), his standing, the closed lane mark ---------- */
function DealerPage({ gdn, d, reload }: { gdn: string; d: Data; reload: () => void }) {
  const r: AdminDealerRow | undefined = d.x?.dealers.find(x => x.gdn === gdn);
  const [settings, setSettings] = useState<DealerLaneSettings | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [marking, setMarking] = useState(false);
  const [wgdn, setWgdn] = useState('');
  useEffect(() => {
    let on = true;
    const tick = async () => { const s = await admin.settings(gdn); if (!on) return; if (s.ok) { setSettings(s.value); setWhy(null); } else { setSettings(null); setWhy(s.reason); } };
    tick(); const t = setInterval(tick, 10_000); return () => { on = false; clearInterval(t); };
  }, [gdn]);
  /* Suspend and Restore are asked on a bottom sheet (native-patterns §7 line 12), never a browser confirm(). */
  const standing = async () => {
    if (!r) return;
    setBusy(true); setErr(null);
    const res = r.suspended ? await admin.restore(r.gdn) : await admin.suspend(r.gdn);
    setBusy(false);
    if (res.ok) { feel.done(); reload(); } else setErr(say(res.reason));
  };
  const mark = async () => {
    const res = await admin.wholesale(gdn, wgdn);
    if (res.ok) { feel.done(); reload(); } else setErr(say(res.reason));
  };
  const rows = settingsRows(settings).map(x => (settings ? x : { ...x, value: why === NOT_YET ? 'Not yet' : why == null ? '…' : 'Not read' }));
  const marked = r ? wholesaleWord(r) : null;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction/admin/dealers" label="Dealers" /></div>
      <section className="enter" key={`dealer-${gdn}`}>
        <h1 className="q" style={(r?.name.length ?? 0) > 28 ? { fontSize: 'clamp(28px,7.4vw,36px)' } : undefined}>{r?.name ?? gdn}<em>.</em></h1>
        <p className="note">{r ? `${r.gdn} · ${r.incidents} ${r.incidents === 1 ? 'incident' : 'incidents'} · Whop ${verifiedWord(r).toLowerCase()}` : d.x ? 'Not on file.' : d.err ?? 'Reaching the lane…'}</p>
        {err && <p className="note bad">{err}</p>}
        {/* The dealer's own settings, as his Desk saved them: each value touches its word (lego.md §4 placement 1); nothing here writes them. */}
        <div className="group" style={{ marginTop: 22 }}>
          {rows.map(x => (x.value.length > 16
            ? <div className="row" key={x.label}><span className="t"><B>{x.label}</B><S>{x.value}</S></span></div>
            : <div className="row" key={x.label}><span className="t"><B>{x.label}</B></span><V color={settings ? 'var(--ink)' : 'var(--faint)'}>{x.value}</V></div>))}
        </div>
        {why && why !== NOT_YET && <p className="note bad">{say(why)}</p>}
        {/* The closed lane (gap-table W4-A): one faint line until the mark is set, then the word in ink. */}
        {r && (marked
          ? <p className="note" style={{ marginTop: 18, color: 'var(--ink)', fontWeight: 650 }}>{marked}</p>
          : <button style={FAINT} onClick={() => { feel.tap(); setErr(null); setWgdn(''); setMarking(true); }}>Dealers only lane</button>)}
      </section>
      {asking && r && <ActionSheet
        line={r.suspended ? <><b>{r.name}</b> ({r.gdn}) can open lots again.</> : <><b>{r.name}</b> ({r.gdn}) cannot open a lot until you restore them. Lots already open keep running.</>}
        verb={r.suspended ? 'Restore' : 'Suspend'} onAct={standing} onClose={() => setAsking(false)} />}
      {marking && r && <ActionSheet verb="Mark" onAct={mark} onClose={() => setMarking(false)}
        line={<>
          <b>{r.name}</b> trades on the dealers only lane under this GDN.
          <input className="input num" value={wgdn} onChange={e => setWgdn(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} placeholder="P123456" aria-label="The wholesale GDN"
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} style={{ display: 'block', width: '100%', margin: '16px 0 22px', fontSize: 18, textAlign: 'center', boxShadow: wgdn && !GDN.test(wgdn) ? '0 0 0 2px var(--red)' : undefined }} />
        </>} />}
      {r && <div className="dock"><div className="in"><button className="btn primary block" disabled={busy} onClick={() => { feel.tap(); setErr(null); setAsking(true); }}>{busy ? '…' : r.suspended ? 'Restore' : 'Suspend'}</button></div></div>}
    </main>
  );
}

/* ---------- Add a dealer: the GDN, the name, the role on three clouds, then the key once ---------- */
function AddDealer({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState<'gdn' | 'name' | 'role' | 'key'>('gdn');
  const [gdn, setGdn] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('owner');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const to = (p: typeof page, d: 'fwd' | 'back' = 'fwd') => transition(() => { setPage(p); setErr(null); scrollTo(0, 0); }, d);
  const gdnOk = /^[A-Z0-9]{5,12}$/.test(gdn);

  /* Tapping a role cloud is the verb: the key is minted with that role (Choice's rule: tapping saves and advances). */
  const mint = async (want: Role) => {
    setRole(want); setBusy(true); setErr(null);
    const r = await admin.mint(gdn, name.trim(), want);
    setBusy(false);
    if (r.ok) { feel.done(); setKey(r.value.token); to('key'); } else setErr(say(r.reason));
  };
  const minted = roleOfKey(key) ?? role;
  const copy = async () => { try { await navigator.clipboard.writeText(key); setCopied(true); feel.done(); } catch { setErr('Copy failed. Select the key and copy it by hand.'); } };

  return (
    <main className="wrap center">
      <div className="top">{page === 'key' ? <span /> : <button className="back" onClick={() => { feel.tap(); page === 'gdn' ? onDone() : to(page === 'role' ? 'name' : 'gdn', 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button>}</div>
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
      {page === 'role' && <section className="enter" key="role">
        <h1 className="q">Whose <em>key?</em></h1>
        <p className="note">{name.trim()}, {gdn}.</p>
        {/* Three clouds, the key object on each, the role's one line under its name (four words or fewer); the tap mints. */}
        <div role="group" aria-label="The role" style={{ marginTop: 16 }}>
          {ROLES.map(k => <Cloud key={k} obj label={ROLE_NAME[k]} line={ROLE_LINE[k]} on={busy && role === k} disabled={busy} onPick={() => { feel.next(); mint(k); }} />)}
        </div>
      </section>}
      {page === 'key' && <section className="enter" key="key">
        <h1 className="q" style={name.length > 28 ? { fontSize: 'clamp(28px,7.4vw,36px)' } : undefined}>{name}’s <em>{ROLE_NAME[minted].toLowerCase()} key.</em></h1>
        <p className="note">Shown once. Paste it into the dealer's Desk under Lane, then Key.</p>
        <label className="field"><textarea className="input num" readOnly rows={2} value={key} onFocus={e => e.currentTarget.select()} style={{ height: 'auto', padding: '16px 18px', lineHeight: 1.4, resize: 'none', overflowWrap: 'anywhere', textAlign: 'center' }} /></label>
        {/* The key object touching the role it carries, read from the key itself (lego.md §4 placement 1). */}
        <div className="group"><div className="row"><span className="t" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Obj name="key" h={36} /><span><B>{ROLE_NAME[minted]}</B><S>{ROLE_LINE[minted]}</S></span></span></div></div>
      </section>}
      {err && <p className="note">{err}</p>}
      <div className="dock"><div className="in">
        {page === 'gdn' && <button className="btn primary block" disabled={!gdnOk} onClick={() => { feel.next(); to('name'); }}>Next</button>}
        {page === 'name' && <button className="btn primary block" disabled={!name.trim()} onClick={() => { feel.next(); to('role'); }}>Next</button>}
        {page === 'key' && <button className="btn primary block" onClick={copied ? onDone : copy}>{copied ? 'Done' : 'Copy'}</button>}
      </div></div>
    </main>
  );
}
