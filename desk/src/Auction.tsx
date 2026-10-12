/* The Desk's side of the lane. Let It Go is one question per page: the car,
   where the title is, the photos, six condition words, the insurance, how
   long, the floor; then Go. Live is the ring and the price. Sold is the
   buyer's clock, the money, the VIN at pickup, and the way out (void).
   The lane refuses collateral it cannot see; so does this screen, earlier. */
import { useEffect, useMemo, useState } from 'react';
import { AUCTION_API, auctionLive, carMeta, closeLot, collateralRefusal, dealerKey, getLot, holdingCost, isAdminKey, lotId, lotLinks, markPaid, openLot, photoBlob, pickup, putDocument, putPhoto, rememberLot, timeLeft, updateCar, voidSale, watchLot, wholesaleBand, youGetYouBring, type Collateral, type Lot, type LotLink, type RemotePhoto } from './lib/auction';
import { buyersGuidePdf } from './lib/official';
import { usd } from './lib/money';
import type { Sale, Vehicle } from './lib/sale';
import { shrink } from './Paper';
import { startSale, useStore } from './store';
import { Back, CarArt, Choice, Ic, feel, go, transition } from './ui';

const carName = (v: Vehicle) => `${v.year} ${v.make} ${v.model}`;
/* break-ui: counts and typed dollars read with separators (1,284 watching; 12,500 in the field). */
const n = (x: number) => x.toLocaleString('en-US');
const grouped = (digits: string) => (digits ? Number(digits).toLocaleString('en-US') : '');
const digits = (s: string) => s.replace(/[^\d]/g, '');
/* A long make and model (2020 Mercedes-Benz GLE 450 4MATIC Coupe AMG Line…) steps the heading down instead of filling the screen. */
const longQ = (s: string) => (s.length > 28 ? { fontSize: 'clamp(28px,7.4vw,36px)' } : undefined);
/* The inner face of the big ring: room for "44h 59m" on one line. */
const FACE = { width: 68, height: 68, whiteSpace: 'nowrap' } as const;
const WORDS = ['Paint', 'Glass', 'Tires', 'Lights', 'A/C', 'Drives'] as const;
const GRADES: { label: string; gloss: string; v: number }[] = [{ label: 'Good', gloss: 'Nothing to say', v: 1 }, { label: 'Fair', gloss: 'Worn, works', v: 0.6 }, { label: 'Poor', gloss: 'Needs work', v: 0.25 }];

/* ---------- /auction : what is on the lane, one primary action ---------- */
export function Lane() {
  const { lot } = useStore();
  const [links, setLinks] = useState<LotLink[]>(lotLinks);
  const [lots, setLots] = useState<Record<string, Lot>>({});
  useEffect(() => { setLinks(lotLinks()); }, []);
  useEffect(() => {
    let on = true;
    const load = async () => { for (const l of links) { const r = await getLot(l.lotId); if (on && r.ok) setLots(x => ({ ...x, [l.lotId]: r.value })); } };
    load(); const t = setInterval(load, 5000); return () => { on = false; clearInterval(t); };
  }, [links]);
  if (!auctionLive) return <Offline />;
  if (!dealerKey.get()) return <Setup />;
  const byId = (id: string) => lot.find(v => v.id === id);
  const open = links.filter(l => !lots[l.lotId]?.closed), done = links.filter(l => lots[l.lotId]?.closed);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /><span style={{ display: 'flex', gap: 18 }}>{isAdminKey() && <a className="link" href="#/auction/admin" onClick={feel.tap}>Admin</a>}<a className="link" href="#/auction/setup" onClick={feel.tap}>Key</a></span></div>
      <section className="enter" key="lane">
        <h1 className="q">{open.length ? <>On the <em>lane.</em></> : <>Let a car <em>go.</em></>}</h1>
        {!open.length && <p className="note">A car the lot is losing money on, on every phone in Texas by tonight. You set the floor; the lane finds the price.</p>}
        <div className="choices">{open.map(l => <LotRow key={l.lotId} link={l} lot={lots[l.lotId]} v={byId(l.vehicleId)} />)}</div>
        {!!done.length && <><p className="note" style={{ marginTop: 28 }}>Sold or closed</p><div className="choices">{done.map(l => <LotRow key={l.lotId} link={l} lot={lots[l.lotId]} v={byId(l.vehicleId)} />)}</div></>}
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/auction/go'); }}>Let A Car Go</button></div></div>
    </main>
  );
}

function LotRow({ link, lot, v }: { link: LotLink; lot?: Lot; v?: Vehicle }) {
  const s = lot?.sale;
  const line = !lot ? 'Reaching the lane…'
    : s?.startedAt ? 'Picked up' : s?.voidedAt ? 'Voided' : s?.forfeitedAt ? 'Buyer walked · deposit yours'
    : s ? (s.paidAt ? 'Paid · waiting on pickup' : `Sold · ${timeLeft(s.deadlineAt)} for the buyer`)
    : lot.closed ? 'Closed, no bids'
    : `${usd(lot.high)} · ${n(lot.bids)} ${lot.bids === 1 ? 'bid' : 'bids'} · ${timeLeft(lot.closesAt)}`;
  return (
    <a className="choice" href={`#/auction/${link.lotId}`} onClick={feel.next}>
      <span className="art car-art">{v ? <CarArt color={v.color} body={v.bodyStyle} w={44} /> : <Ic n="plate" s={24} />}</span>
      <span className="t"><b>{v ? carName(v) : link.lotId}</b><small>{line}</small></span>
      <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
    </a>
  );
}

function Offline() {
  return (
    <main className="wrap center"><div className="top"><Back to="#/" label="Sales" /></div>
      <section className="enter"><h1 className="q">The lane is <em>not connected.</em></h1><p className="note">Set VITE_AUCTION_API to the auction Worker and build the Desk again.</p></section>
    </main>
  );
}

/* ---------- /auction/setup : the dealer's key, pasted once ---------- */
export function Setup() {
  const [k, setK] = useState(dealerKey.get() ?? '');
  return (
    <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key="setup">
        <h1 className="q">Your lane <em>key.</em></h1>
        <p className="note">Obavia gives each dealer one key. Paste it here, once, on this device.</p>
        <label className="field"><input className="input" value={k} onChange={e => setK(e.target.value)} placeholder="d:P123456.…" autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
        <p className="note">{AUCTION_API}</p>
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" disabled={!/^d:[^.]+\.[A-Za-z0-9_-]+$/.test(k.trim())} onClick={() => { feel.done(); dealerKey.set(k); go('/auction'); }}>Keep It</button></div></div>
    </main>
  );
}

/* ---------- /auction/go : Let It Go, one question per page ---------- */
type Page = 'car' | 'title' | 'lienholder' | 'payoff' | 'release' | 'photos' | `word${0 | 1 | 2 | 3 | 4 | 5}` | 'insured' | 'days' | 'floor' | 'bring' | 'go';
const DAYS = [{ d: 3, gloss: 'Quick. Fewer eyes, less holding cost.' }, { d: 7, gloss: 'The usual. A full week of phones.' }, { d: 10, gloss: 'Patient. The most bidders.' }];

export function LetItGo() {
  const { lot, dealer, sales } = useStore();
  const busy = new Set(sales.filter(s => s.status === 'in_progress').map(s => s.vehicle.id));
  const onLane = new Set(lotLinks().map(l => l.vehicleId));
  const [page, setPage] = useState<Page>('car');
  const [q, setQ] = useState('');
  const [car, setCar] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<Collateral['title']['status'] | null>(null);
  const [lienholder, setLienholder] = useState('');
  const [payoff, setPayoff] = useState('');
  const [release, setRelease] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [grade, setGrade] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [insured, setInsured] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [floor, setFloor] = useState('');
  const [ack, setAck] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const found = useMemo(() => lot.filter(v => !busy.has(v.id) && !onLane.has(v.id) && `${v.stock} ${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase().includes(q.toLowerCase())), [lot, q, sales]);
  const payoffN = status === 'lender' ? Number(payoff) || 0 : 0, floorN = Number(floor) || 0;
  const bring = youGetYouBring(floorN, payoffN);
  const pages: Page[] = ['car', 'title', ...(status === 'lender' ? ['lienholder', 'payoff', 'release'] as const : []), 'photos', 'word0', 'word1', 'word2', 'word3', 'word4', 'word5', 'insured', 'days', 'floor', ...(bring.bring > 0 ? ['bring'] as const : []), 'go'];
  const at = Math.max(0, pages.indexOf(page));
  const to = (p: Page, d: 'fwd' | 'back' = 'fwd') => transition(() => { setPage(p); scrollTo(0, 0); }, d);
  const next = () => { feel.next(); to(pages[at + 1]); };
  const back = () => to(pages[at - 1], 'back');

  const collateral: Collateral | null = status ? { title: { status, ...(status === 'lender' ? { lienholder: lienholder.trim(), payoff: payoffN, releaseDays: Number(release) || 0 } : {}) }, floor: floorN, payoffAcknowledged: ack, insured } : null;
  const refusal = collateralRefusal(collateral ?? undefined);
  const band = car ? wholesaleBand(car.price, grade.map(g => g ?? 0.6)) : null;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setAdding(true);
    const more = await Promise.all([...files].slice(0, 12 - photos.length).map(f => shrink(f, 1600).catch(() => null)));
    setPhotos(p => [...p, ...more.filter((x): x is string => !!x)].slice(0, 12)); setAdding(false); feel.tap();
  };

  async function send() {
    if (!car || !collateral || refusal || !days) return;
    const id = lotId(car);
    setFailed(null);
    const remote: RemotePhoto[] = [];
    for (let i = 0; i < photos.length; i++) {
      setSending(`Photo ${i + 1} of ${photos.length}`);
      const { blob, w, h } = await photoBlob(photos[i]);
      const r = await putPhoto(id, i, blob);
      if (!r.ok) { setSending(null); setFailed(`The lane did not take photo ${i + 1}: ${r.reason}.`); return; }
      remote.push({ url: r.value.url, w, h });
    }
    setSending('The Buyer’s Guide');
    let guide: string | undefined;
    try { const g = await putDocument(id, 'guide', await buyersGuidePdf({ vehicle: car } as Sale, dealer, 'en')); if (g.ok) guide = g.value.url; } catch { /* the lane opens without it; the window copy is printed at the lot */ }
    setSending('Opening the lane');
    const car2 = carMeta(car, dealer, remote, grade.map(g => g ?? 0.6) as [number, number, number, number, number, number], collateral, dealer.phone, []);
    if (guide) car2.documents = { guide };
    const closesAt = Date.now() + days * 86_400_000;
    const r = await openLot(id, { id, dealer: dealer.licence, start: floorN, retail: car.price, closesAt, car: car2 });
    setSending(null);
    if (!r.ok) { setFailed(`The lane refused: ${r.reason}.`); return; }
    rememberLot({ lotId: id, vehicleId: car.id, openedAt: new Date().toISOString(), closesAt, floor: floorN, days });
    feel.done(); go(`/auction/${id}`);
  }

  const word = page.startsWith('word') ? Number(page.slice(4)) : -1;
  return (
    <main className="wrap center">
      <div className="top">{at === 0 ? <Back to="#/auction" label="Lane" /> : <button className="back" onClick={() => { feel.tap(); back(); }}><Ic n="chev" s={18} w={2.4} />Back</button>}<span className="step num">{at + 1} of {pages.length}</span></div>

      {page === 'car' && <section className="enter" key="car">
        <h1 className="q">Which car <em>goes?</em></h1>
        <label className="field"><input className="input" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Stock, year, make or VIN" /></label>
        <div className="choices">{found.slice(0, 8).map(v => <Choice key={v.id} label={carName(v)} gloss={`${v.stock} · ${usd(v.price)}${v.mileage != null ? ` · ${v.mileage.toLocaleString()} mi` : ''}`} on={car?.id === v.id} onPick={() => { setCar(v); next(); }} />)}
          {!found.length && <p className="empty">{lot.length ? 'No car matches. Cars in a sale or on the lane stay out.' : 'Add cars to the lot first.'}</p>}</div>
      </section>}

      {page === 'title' && car && <section className="enter" key="title">
        <h1 className="q">Where is the <em>title?</em></h1>
        <p className="note">The lane shows the buyer who holds it before the first bid. It will not open on a title it cannot place.</p>
        <div className="choices">
          <Choice label="In my hand" gloss="Clean, here, ready to sign over" on={status === 'hand'} onPick={() => { setStatus('hand'); to('photos'); }} />
          <Choice label="At the lender" gloss="Floorplan or a loan; released at payoff" on={status === 'lender'} onPick={() => { setStatus('lender'); to('lienholder'); }} />
          <Choice label="Repossessed, not yet mine" gloss="The lane will not take it until it is" on={status === 'repo'} onPick={() => { setStatus('repo'); feel.tap(); }} />
        </div>
        {status === 'repo' && <p className="note">Finish the repossession first. When the title is in your hand or at your lender, come back.</p>}
      </section>}

      {page === 'lienholder' && <section className="enter" key="lienholder">
        <h1 className="q">Who holds <em>it?</em></h1>
        <label className="field"><input className="input" autoFocus value={lienholder} onChange={e => setLienholder(e.target.value)} placeholder="NextGear, AFC, the bank" /></label>
      </section>}

      {page === 'payoff' && <section className="enter" key="payoff">
        <h1 className="q">The <em>payoff.</em></h1>
        <p className="note">What {lienholder.trim() || 'the lender'} gets first from the proceeds.</p>
        <div className="money"><input className="input num" inputMode="numeric" autoFocus value={grouped(payoff)} onChange={e => setPayoff(digits(e.target.value))} placeholder="0" /></div>
      </section>}

      {page === 'release' && <section className="enter" key="release">
        <h1 className="q">Days to <em>release.</em></h1>
        <p className="note">How long {lienholder.trim() || 'the lender'} takes to send the title after payoff. The buyer sees this number.</p>
        <div className="choices">{[2, 5, 10].map(d => <Choice key={d} label={`${d} days`} on={Number(release) === d} onPick={() => { setRelease(String(d)); next(); }} />)}</div>
      </section>}

      {page === 'photos' && car && <section className="enter" key="photos">
        <h1 className="q">Show <em>it.</em></h1>
        <p className="note">Front three-quarter, the rear, the driver’s side; then the dash, the seats, and anything worn. Sideways photos are fine.</p>
        <div className="choices grid2" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>{photos.map((p, i) => <button key={i} className="choice" style={{ padding: 0, minHeight: 0, aspectRatio: '1', borderRadius: 18, overflow: 'hidden' }} onClick={() => { feel.tap(); setPhotos(x => x.filter((_, j) => j !== i)); }} aria-label={`Remove photo ${i + 1}`}><img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></button>)}
          {photos.length < 12 && <label className="choice" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', minHeight: 96, cursor: 'pointer' }}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>{adding ? 'Adding…' : photos.length ? 'Add more' : 'Take photos'}</b><small>{photos.length} of 12</small></span><input type="file" accept="image/*" capture="environment" multiple hidden onChange={e => add(e.target.files)} /></label>}
        </div>
      </section>}

      {word >= 0 && <section className="enter" key={page}>
        <h1 className="q">{WORDS[word]}<em>.</em></h1>
        <p className="note">{word === 5 ? 'Starts, idles, pulls, stops.' : 'One word, true. The buyer sees six dots and your word.'}</p>
        <div className="choices">{GRADES.map(g => <Choice key={g.label} label={g.label} gloss={g.gloss} on={grade[word] === g.v} onPick={() => { setGrade(x => x.map((v, i) => (i === word ? g.v : v))); next(); }} />)}</div>
      </section>}

      {page === 'insured' && car && <section className="enter" key="insured">
        <h1 className="q">On your <em>policy?</em></h1>
        <p className="note">The car stays on your lot, on your insurance, until the buyer scans the VIN and the engine starts. That moment is the sale.</p>
        <div className="choices"><Choice label="Yes, insured on the lot" on={insured} onPick={() => { setInsured(true); next(); }} /><Choice label="No" gloss="The lane will not take it" on={false} onPick={() => { setInsured(false); feel.tap(); }} /></div>
      </section>}

      {page === 'days' && <section className="enter" key="days">
        <h1 className="q">How <em>long?</em></h1>
        <div className="choices">{DAYS.map(x => <Choice key={x.d} label={`${x.d} days`} gloss={x.gloss} on={days === x.d} onPick={() => { setDays(x.d); next(); }} />)}</div>
      </section>}

      {page === 'floor' && car && band && days && <section className="enter" key="floor">
        <h1 className="q">The <em>floor.</em></h1>
        <p className="note">The least you walk away with. Bidding opens here and only climbs. The buyer pays this plus tax and the state, nothing to Obavia.</p>
        <div className="money"><input className="input num" inputMode="numeric" autoFocus value={grouped(floor)} onChange={e => setFloor(digits(e.target.value))} placeholder={n(band.low)} /></div>
        <div className="group" style={{ marginTop: 22 }}>
          <div className="row"><span className="t"><b>The lane usually pays</b><small>For a {carName(car)} in this condition</small></span><span className="v num" style={{ lineHeight: 1.35 }}>{usd(band.low)}<br />to {usd(band.high)}</span></div>
          <div className="row"><span className="t"><b>Holding it {days} more days</b><small>Floorplan, insurance, the space</small></span><span className="v num">{usd(holdingCost(days))}</span></div>
          {payoffN > 0 && <div className="row"><span className="t"><b>{bring.bring > 0 ? 'You bring' : 'You keep'}</b><small>After the {usd(payoffN)} payoff</small></span><span className="v num">{usd(bring.bring > 0 ? bring.bring : bring.get)}</span></div>}
        </div>
      </section>}

      {page === 'bring' && <section className="enter" key="bring">
        <h1 className="q">You’ll bring <em>{usd(bring.bring)}.</em></h1>
        <p className="note">The floor is under the payoff. If the lane stops at the floor, you pay {lienholder.trim() || 'the lender'} the difference to release the title. Say so and the lane opens; or raise the floor.</p>
        <div className="choices"><Choice label={`OK, I’ll bring ${usd(bring.bring)}`} on={ack} onPick={() => { setAck(true); next(); }} /><Choice label="Raise the floor" onPick={() => { setAck(false); back(); }} /></div>
      </section>}

      {page === 'go' && car && collateral && days && <section className="enter" key="go">
        <h1 className="q" style={longQ(carName(car))}>{carName(car)}<em>.</em></h1>
        <div className="group">
          <div className="row"><span className="t"><b>Floor</b></span><span className="v num">{usd(floorN)}</span></div>
          <div className="row"><span className="t"><b>Title</b></span><span className="v" style={{ flex: '0 1 62%', minWidth: 0, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{status === 'hand' ? 'In hand' : `${lienholder.trim() || 'Lender'} · ${release} days`}</span></div>
          <div className="row"><span className="t"><b>Closes</b></span><span className="v">{new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
          <div className="row"><span className="t"><b>Photos</b></span><span className="v num">{photos.length}</span></div>
        </div>
        {refusal && <p className="note">The lane will refuse this: {refusal}.</p>}
        {failed && <p className="note">{failed}</p>}
      </section>}

      <div className="dock"><div className="in">
        {page === 'lienholder' && <button className="btn primary block" disabled={!lienholder.trim()} onClick={next}>Next</button>}
        {page === 'payoff' && <button className="btn primary block" disabled={!payoffN} onClick={next}>Next</button>}
        {page === 'photos' && <button className="btn primary block" disabled={photos.length < 3 || adding} onClick={next}>{photos.length < 3 ? `${3 - photos.length} more to go` : 'Next'}</button>}
        {page === 'floor' && <button className="btn primary block" disabled={floorN < 100} onClick={next}>Next</button>}
        {page === 'go' && <button className="btn primary block" disabled={!!refusal || !!sending || photos.length < 3} onClick={send}>{sending ? `${sending}…` : 'Go'}</button>}
      </div></div>
    </main>
  );
}

/* ---------- /auction/:lot : Live while bidding; Sold after the hammer ---------- */
export function LotPage({ id }: { id: string }) {
  const { lot: cars } = useStore();
  const [lot, setLot] = useState<Lot | null>(null);
  const [gone, setGone] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    let on = true;
    getLot(id).then(r => { if (!on) return; if (r.ok) setLot(r.value); else setGone(true); });
    const stop = watchLot(id, l => { if (on) setLot(l); });
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => { on = false; stop(); clearInterval(t); };
  }, [id]);
  const link = lotLinks().find(l => l.lotId === id);
  const v = cars.find(c => c.id === link?.vehicleId);
  if (gone) return <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div><p className="empty">This lot is not on the lane.</p></main>;
  if (!lot) return <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div><p className="empty">Reaching the lane…</p></main>;
  if (lot.sale) return <Sold lot={lot} v={v} link={link} />;
  return <Live lot={lot} v={v} link={link} />;
}

function Live({ lot, v, link }: { lot: Lot; v?: Vehicle; link?: LotLink }) {
  const [busy, setBusy] = useState(false);
  const [lowering, setLowering] = useState(false);
  const [newFloor, setNewFloor] = useState('');
  /* The new-floor field opens at the foot of the page; bring it clear of the dock so the thumb and the keyboard land on it. */
  useEffect(() => { if (lowering) requestAnimationFrame(() => scrollTo(0, document.documentElement.scrollHeight)); }, [lowering]);
  const total = Math.max(1, lot.closesAt - (link ? Date.parse(link.openedAt) : lot.opensAt));
  const left = Math.max(0, lot.closesAt - Date.now());
  const p = Math.round((1 - left / total) * 100);
  const name = v ? carName(v) : lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id;
  const floor = lot.car?.collateral?.floor ?? lot.start;
  const closed = !!lot.closed;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key="live">
        <span className="ring big" style={{ ['--p' as string]: closed ? 100 : p }}><span className="num" style={FACE}>{closed ? 'Done' : timeLeft(lot.closesAt)}</span></span>
        <h1 className="q num">{lot.bids ? usd(lot.high) : <>No bids <em>yet.</em></>}</h1>
        <p className="note">{name}{lot.bids ? ` · ${n(lot.bids)} ${lot.bids === 1 ? 'bid' : 'bids'}` : ''}{lot.watching ? ` · ${n(lot.watching)} watching` : ''}</p>
        <div className="group">
          <div className="row"><span className="t"><b>Floor</b><small>{lot.bids ? (lot.high >= floor ? 'Covered' : 'Not yet reached') : 'Bidding opens here'}</small></span><span className="v num">{usd(floor)}</span></div>
          {lot.car?.collateral?.title.status === 'lender' && <div className="row"><span className="t"><b>Title at {lot.car.collateral.title.lienholder || 'the lender'}</b><small>{lot.car.collateral.title.releaseDays} days to release after payoff</small></span><span className="v num">{usd(lot.car.collateral.title.payoff ?? 0)}</span></div>}
          <div className="row"><span className="t"><b>Closes</b><small>{new Date(lot.closesAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span><span className="v">{closed ? 'Closed' : 'Live'}</span></div>
        </div>
        {closed && !lot.bids && <p className="note">Nobody bid. The car is still yours; let it go again with a lower floor or more photos.</p>}
        {lowering && <>
          <p className="note" style={{ marginTop: 28 }}>A lower floor opens the bidding lower. It never moves a bid already placed.</p>
          <div className="money"><input className="input num" inputMode="numeric" autoFocus value={grouped(newFloor)} onChange={e => setNewFloor(digits(e.target.value))} placeholder={n(floor)} /></div>
        </>}
      </section>
      <div className="dock"><div className="in">
        {closed ? <button className="btn primary block" onClick={() => { feel.next(); go('/auction/go'); }}>Let It Go Again</button>
          : lowering ? <button className="btn primary block" disabled={busy || !Number(newFloor) || Number(newFloor) >= floor} onClick={async () => { setBusy(true); const c = lot.car!.collateral; const r = await updateCar(lot.id, { collateral: { ...c, floor: Number(newFloor), payoffAcknowledged: (c.title.payoff ?? 0) > Number(newFloor) ? c.payoffAcknowledged : undefined } }); setBusy(false); if (r.ok) { feel.done(); setLowering(false); } }}>Set The Floor</button>
          : lot.bids >= 1 ? <button className="btn primary block" disabled={busy} onClick={async () => { if (!confirm(`End it now at ${usd(lot.high)}? The high bidder has it.`)) return; setBusy(true); const r = await closeLot(lot.id); setBusy(false); if (r.ok) feel.done(); }}>Sell It Now</button>
          : <button className="btn primary block" onClick={() => { feel.tap(); setLowering(true); }}>Lower The Floor</button>}
        {!closed && !lowering && lot.bids >= 1 && <button className="textlink" onClick={() => { feel.tap(); setLowering(true); }}>Lower the floor</button>}
        {lowering && <button className="textlink" onClick={() => { feel.tap(); setLowering(false); }}>Leave it</button>}
      </div></div>
    </main>
  );
}

const WHY = ['The car sold on the lot first', 'The title will not release in time', 'The car was damaged', 'Something else'];
function Sold({ lot, v, link }: { lot: Lot; v?: Vehicle; link?: LotLink }) {
  const s = lot.sale!;
  const [mode, setMode] = useState<'sale' | 'vin' | 'void'>('sale');
  const [vin, setVin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const name = v ? carName(v) : lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id;
  const state = s.startedAt ? 'started' : s.voidedAt ? 'voided' : s.forfeitedAt ? 'forfeited' : s.paidAt ? 'paid' : 'owed';
  const left = s.deadlineAt - Date.now();
  const total = Math.max(1, s.deadlineAt - s.wonAt);
  const h = (ms: number) => `${Math.max(0, Math.floor(ms / 3_600_000))}h ${Math.max(0, Math.floor((ms % 3_600_000) / 60_000))}m`;
  const SAID: Record<string, string> = { 'wrong car': 'That VIN is not this car.', 'no sale': 'There is no sale to mark.', 'no sale to void': 'This sale cannot be voided now.', offline: 'The lane is out of reach.', 'no key': 'Paste your lane key first.' };
  const act = async (f: () => Promise<{ ok: boolean; reason?: string }>) => { setBusy(true); setErr(null); const r = await f(); setBusy(false); if (r.ok) { feel.done(); setMode('sale'); } else setErr(SAID[r.reason ?? ''] ?? `The lane said no: ${r.reason}.`); };
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key={state + mode}>
        {state === 'owed' && <span className="ring big" style={{ ['--p' as string]: Math.round((1 - Math.max(0, left) / total) * 100) }}><span className="num" style={{ ...FACE, fontSize: 15 }}>{h(left)}</span></span>}
        <h1 className="q num">{usd(s.hammer)}</h1>
        <p className="note">{name} · {
          state === 'started' ? `Picked up ${new Date(s.startedAt!).toLocaleString()}` :
          state === 'voided' ? 'Voided. The buyer’s deposit went back.' :
          state === 'forfeited' ? 'The buyer walked. Their deposit is yours; the car is still yours.' :
          state === 'paid' ? 'Paid. Scan the VIN when the buyer is here.' :
          `Sold. The buyer has ${h(left)} to pay.`}</p>
        {mode === 'sale' && <div className="group">
          <div className="row"><span className="t"><b>Won</b></span><span className="v">{new Date(s.wonAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
          <div className="row"><span className="t"><b>Pay by</b></span><span className="v">{new Date(s.deadlineAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span></div>
          <div className="row"><span className="t"><b>Deposit</b><small>{s.deposit === 'to_dealer' ? 'Forfeited to you' : s.deposit === 'released' ? 'Released to the buyer' : 'Held by Obavia for the buyer'}</small></span><span className="v num">{usd(250)}</span></div>
          {link && <div className="row"><span className="t"><b>Floor</b></span><span className="v num">{usd(link.floor)}</span></div>}
        </div>}
        {mode === 'vin' && <>
          <p className="note" style={{ marginTop: 28 }}>The last six of the VIN, read off the door jamb with the buyer standing there. Then the key.</p>
          <label className="field"><input className="input big num" autoFocus value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="Last 6" autoCapitalize="characters" /></label>
          {v && <p className="note">Ends in {v.vin.slice(-6)}</p>}
        </>}
        {mode === 'void' && <>
          <p className="note" style={{ marginTop: 28 }}>Ending a sale you cannot deliver returns the buyer’s deposit in full and counts against your lane standing. A second one closes the lane to you.</p>
          <div className="choices">{WHY.map(w => <Choice key={w} label={w} disabled={busy} onPick={() => act(() => voidSale(lot.id, w))} />)}</div>
        </>}
        {err && <p className="note">{err}</p>}
      </section>
      <div className="dock"><div className="in">
        {mode === 'sale' && state === 'owed' && <button className="btn primary block" disabled={busy} onClick={() => act(() => markPaid(lot.id))}>Paid At The Lot</button>}
        {mode === 'sale' && state === 'paid' && <button className="btn primary block" onClick={() => { feel.next(); setMode('vin'); }}>Scan The VIN</button>}
        {mode === 'sale' && state === 'started' && v && <button className="btn primary block" onClick={() => { feel.done(); const id = startSale(v, { fullName: '', phone: '', address: '', city: '', state: 'TX', zip: '', county: '', idType: 'dl', idNumber: '' }, 'en', v.mileage ?? 0, v.titleStatus); go(`/sale/${id}/guide`); }}>Open The Paperwork</button>}
        {mode === 'sale' && (state === 'forfeited' || state === 'voided') && <button className="btn primary block" onClick={() => { feel.next(); go('/auction/go'); }}>Let It Go Again</button>}
        {mode === 'vin' && <button className="btn primary block" disabled={busy || vin.length < 6} onClick={() => act(() => pickup(lot.id, vin))}>It Started</button>}
        {mode === 'sale' && (state === 'owed' || state === 'paid') && <button className="textlink" onClick={() => { feel.tap(); setMode('void'); }}>I can’t deliver this car</button>}
        {mode !== 'sale' && <button className="textlink" onClick={() => { feel.tap(); setMode('sale'); }}>Back</button>}
      </div></div>
    </main>
  );
}
