/* The owner's cockpit on the Desk (#/auction/admin). Every dollar and every
   risk on the lane, one number per row, read from the Worker's exposure
   report every 10 seconds. One action per dealer: suspend or restore. One
   primary action on the page: add a dealer, which mints his key once.
   collateral.md §5 (the exposure), §6 (standing is a flag the owner flips). */
import { useEffect, useState } from 'react';
import { auctionLive, getExposure, isAdminKey, mintDealer, restoreDealer, suspendDealer, type DealerRow, type Exposure, type SaleState } from './lib/auction';
import { usd } from './lib/money';
import { Back, Ic, feel, transition } from './ui';
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
const SAID: Record<string, string> = { offline: 'The lane is out of reach.', 'no key': 'Paste the admin key first.', 'admin only': 'This key is a dealer’s key.', 'bad dealer': 'The GDN is 5 to 12 capital letters or digits, and the name is required.', 'no such dealer': 'That dealer is not on file.' };
const say = (reason: string) => SAID[reason] ?? `The lane said no: ${reason}.`;
/* Figures count to a new value on a refresh only when they changed, and lift once so the eye finds them. */
const whole = (n: number) => Math.round(n).toLocaleString('en-US');
const ratio = (n: number) => n.toFixed(2);
const dollars = (n: number) => usd(Math.round(n));

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

function Cockpit() {
  const [x, setX] = useState<Exposure | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [asking, setAsking] = useState<DealerRow | null>(null);
  const load = async () => { const r = await getExposure(); if (r.ok) { setX(r.value); setErr(null); } else setErr(say(r.reason)); };
  useEffect(() => { let on = true; const tick = () => { if (on) load(); }; tick(); const t = setInterval(tick, 10_000); return () => { on = false; clearInterval(t); }; }, []);

  if (adding) return <AddDealer onDone={() => { setAdding(false); load(); }} />;

  /* Suspend and Restore are asked on a bottom sheet (native-patterns §7 line 12), never a browser confirm(). */
  const standing = async (d: DealerRow) => {
    setBusy(d.gdn); setErr(null);
    const r = d.suspended ? await restoreDealer(d.gdn) : await suspendDealer(d.gdn);
    setBusy(null);
    if (r.ok) { feel.done(); load(); } else setErr(say(r.reason));
  };
  const count = (s: SaleState) => x?.sales.filter(v => v.state === s).length ?? 0;
  const ratioOk = x ? Math.abs(x.deposits.reserveRatio - 1) < 1e-9 : true;

  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key="admin">
        <h1 className="q">The lane, <em>now.</em></h1>
        <p className="note">{x ? 'From the auction Worker. Refreshes every 10 seconds.' : err ?? 'Reaching the lane…'}</p>
        {x && <>
          <p className="note" style={{ marginTop: 28 }}>Deposits</p>
          <div className="group">
            <div className="row"><span className="t"><b>Deposits held</b><small>Buyers admitted to bid</small></span><Count pulse className="v num" value={x.deposits.heldCount} format={whole} /></div>
            <div className="row"><span className="t"><b>Dollars held</b><small>{x.deposits.heldCount.toLocaleString('en-US')} × {usd(DEPOSIT_USD)}, in the Whop balance</small></span><Count pulse className="v num" value={x.deposits.heldUsd} format={dollars} /></div>
            <div className="row"><span className="t"><b>Reserve ratio</b><small>Held dollars over owed deposits. 1.00 expected.</small></span><Count pulse className="v num" style={ratioOk ? undefined : { color: 'var(--red)' }} value={x.deposits.reserveRatio} format={ratio} /></div>
          </div>
          {!ratioOk && <p className="note" style={{ color: 'var(--red)' }}>The reserve is not 1.00. Stop opening lots and reconcile the Whop balance today.</p>}

          <p className="note" style={{ marginTop: 28 }}>Lots</p>
          <div className="group">
            <div className="row"><span className="t"><b>Open</b></span><Count pulse className="v num" value={x.lots.open} format={whole} /></div>
            <div className="row"><span className="t"><b>Title at a lender</b><small>Open lots waiting on a lien release</small></span><Count pulse className="v num" value={x.lots.atLender} format={whole} /></div>
            <div className="row"><span className="t"><b>Floor below payoff</b><small>The dealer brings the difference at sale</small></span><Count pulse className="v num" style={x.lots.floorBelowPayoff ? { color: 'var(--warn)' } : undefined} value={x.lots.floorBelowPayoff} format={whole} /></div>
          </div>

          <p className="note" style={{ marginTop: 28 }}>Sales</p>
          <div className="group">
            {STATES.map(s => <div className="row" key={s.s}><span className="t"><b>{s.label}</b><small>{s.gloss}</small></span><Count pulse className="v num" value={count(s.s)} format={whole} /></div>)}
          </div>

          <p className="note" style={{ marginTop: 28 }}>Fees</p>
          <div className="group">
            <div className="row"><span className="t"><b>Fees owed to Obavia</b><small>None until the GDN issues (43 TAC §215.85)</small></span><Count pulse className="v num" value={x.obaviaFeesOwed} format={dollars} /></div>
          </div>

          <p className="note" style={{ marginTop: 28 }}>Dealers</p>
          <div className="group">
            {!x.dealers.length && <div className="row"><span className="t"><b>No dealers yet</b><small>Add one below.</small></span></div>}
            {x.dealers.map(d => (
              <button className="row" key={d.gdn} disabled={busy === d.gdn} onClick={() => { feel.tap(); setAsking(d); }}>
                <span className="t"><b>{d.name}</b><small>{d.gdn} · {d.incidents} {d.incidents === 1 ? 'incident' : 'incidents'}{d.suspended ? ' · suspended' : ''}</small></span>
                <span className="v" style={{ color: d.suspended ? 'var(--accent)' : 'var(--red)' }}>{busy === d.gdn ? '…' : d.suspended ? 'Restore' : 'Suspend'}</span>
              </button>
            ))}
          </div>
          {err && <p className="note">{err}</p>}
        </>}
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
    const r = await mintDealer(gdn, name.trim());
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
        <p className="note">Shown once. Paste it into the dealer's Desk under Lane → Key.</p>
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
