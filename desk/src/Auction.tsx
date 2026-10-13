/* The Desk's side of the lane. Let It Go is one question per page: the car,
   where the title is, the photos, six condition words, the insurance, how
   long, the floor; then Go. Live is the ring and the price. Sold is the
   buyer's clock, the money, the VIN at pickup, and the way out (void).
   The lane refuses collateral it cannot see; so does this screen, earlier. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DEPOSIT_USD, KEY_SHAPE, auctionLive, carMeta, closeLot, collateralRefusal, collect, dealerKey, depositWords, dial, getMe, releaseRefusal, said, getLot, holdingCost, isAdminKey, lotId, lotLinks, markPaid, onLane, openLot, payBy, photoBlob, pickup, putDocument, putPhoto, relistable, rememberLot, takeArrival, timeLeft, updateCar, voidSale, watchLot, wholesaleBand, youGetYouBring, type Collateral, type Lot, type LotLink, type RemotePhoto } from './lib/auction';
import { HOURS, HOURS_ORDER, defaultSettings, hoursChoice, laneReady, lotFields, toE164, E164, type HoursChoice } from './lib/dealer-settings';
import { formatPhone } from './lib/forms/phone';
import { buyersGuidePdf } from './lib/official';
import { usd } from './lib/money';
import { today } from './lib/loans';
import { laneTitleWatch, taxRemitWatch, type LaneWatch } from './lib/tax';
import type { Sale, Vehicle } from './lib/sale';
import { shrink } from './Paper';
import { setLaneSettings, startSale, useStore } from './store';
import { LaneSettings } from './Onboarding';
import { Back, CarArt, Choice, Ic, feel, go, transition } from './ui';
import { Count, Ring, bidPulse, land } from './motion';
import { ActionSheet, PhotoSheet } from './BottomSheet';
import { canScan, passSix, startScan } from './lib/scan';

const carName = (v: Vehicle) => `${v.year} ${v.make} ${v.model}`;
/* break-ui: counts and typed dollars read with separators (1,284 watching; 12,500 in the field). */
const n = (x: number) => x.toLocaleString('en-US');
const grouped = (digits: string) => (digits ? Number(digits).toLocaleString('en-US') : '');
const digits = (s: string) => s.replace(/[^\d]/g, '');
/* A counting price shows whole dollars on the way; it lands on the exact figure. */
const dollars = (x: number) => usd(Math.round(x));
/* A long make and model (2020 Mercedes-Benz GLE 450 4MATIC Coupe AMG Line…) steps the heading down instead of filling the screen. */
const longQ = (s: string) => (s.length > 28 ? { fontSize: 'clamp(28px,7.4vw,36px)' } : undefined);
/* The inner face of the big ring: room for "44h 59m" on one line. */
const FACE = { width: 68, height: 68, whiteSpace: 'nowrap' } as const;
const WORDS = ['Paint', 'Glass', 'Tires', 'Lights', 'A/C', 'Drives'] as const;

/* ---------- the car objects (DOCTRINE §5; assets/scene-3d, copied to public/scene-3d) ----------
   The real thing beside the number it means, touching (lego.md §4.1): the car by "Which car goes?", the title by the title
   gate and the day-21 row, the coin by every $250, the clock by Pay by. The Desk is sky, so the light set; WebP at 1x and
   2x with the PNG fallback. No caption, silent to a screen reader: the word beside it already says it. */
type ObjName = 'car' | 'title' | 'plate' | 'coin' | 'clock';
const OBJ_RATIO: Record<ObjName, number> = { car: 512 / 320, title: 1, plate: 512 / 320, coin: 1, clock: 1 };
function Obj({ name, h = 28, style }: { name: ObjName; h?: number; style?: CSSProperties }) {
  const base = `${import.meta.env.BASE_URL}scene-3d/${name}-light`;
  const w = Math.round(h * OBJ_RATIO[name]);
  return (
    <picture aria-hidden="true" style={{ display: 'inline-block', flex: 'none', width: w, height: h, lineHeight: 0, ...style }}>
      <source type="image/webp" srcSet={`${base}.webp 1x, ${base}-2x.webp 2x`} />
      <img src={`${base}.png`} width={w} height={h} alt="" draggable={false} style={{ width: w, height: h, objectFit: 'contain', userSelect: 'none' }} />
    </picture>
  );
}
/** A number with its object touching it, inside a row's value. */
const V = ({ obj, children }: { obj: ObjName; children: ReactNode }) => <span className="v num" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Obj name={obj} h={36} />{children}</span>;
/** Let It Go Again: the car that just left the lane is the car that goes. Kept for the next Let It Go only (the router
    reads #/auction/go as it is; a query there would be read as a lot id). */
const AGAIN = 'obavia.desk.auction.again';
const goAgain = (vehicleId?: string) => { try { if (vehicleId) sessionStorage.setItem(AGAIN, vehicleId); else sessionStorage.removeItem(AGAIN); } catch { /* private mode */ } go('/auction/go'); };
const takeAgain = () => { try { const id = sessionStorage.getItem(AGAIN); sessionStorage.removeItem(AGAIN); return id; } catch { return null; } };
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
        {!open.length && <Obj name="car" h={96} style={{ display: 'block', margin: '0 auto 10px' }} />}
        <h1 className="q">{open.length ? <>On the <em>lane.</em></> : <>Let a car <em>go.</em></>}</h1>
        {!open.length && <p className="note">A car the lot is losing money on, on every phone in Texas by tonight. You set the floor; the lane finds the price.</p>}
        <div className="choices">{open.map(l => <LotRow key={l.lotId} link={l} lot={lots[l.lotId]} v={byId(l.vehicleId)} />)}</div>
        {!!done.length && <><p className="note" style={{ marginTop: 28 }}>Sold or closed</p><div className="choices">{done.map(l => <LotRow key={l.lotId} link={l} lot={lots[l.lotId]} v={byId(l.vehicleId)} />)}</div></>}
        <LaneSettingsRow />
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/auction/go'); }}>Let A Car Go</button></div></div>
    </main>
  );
}

/* The lane settings on the auction home: Connected or Not yet (GET /dealers/me), the hours choice and the after-hours
   number, one row that opens the settings pages (Onboarding.tsx LaneSettings at #/auction/settings). */
function LaneSettingsRow() {
  const { dealer, laneSettings } = useStore();
  const s = laneSettings ?? defaultSettings(dealer, true);
  const [me, setMe] = useState<{ whopAccount: string | null; payoutsOwed: number } | null | undefined>(undefined);
  useEffect(() => { let on = true; getMe().then(r => { if (on) setMe(r.ok ? r.value : null); }); return () => { on = false; }; }, []);
  const choice = hoursChoice(s.hours);
  const hours = choice ? HOURS[choice].label : s.hours.join(', ');
  const paid = me === undefined ? 'Reaching the lane…' : me?.whopAccount ? `Connected · ${me.whopAccount}` : 'Not yet';
  return (
    <div className="group" style={{ marginTop: 28 }}>
      <a className="row" href="#/auction/settings" onClick={feel.next} style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="t"><b>Lane settings</b><small>{hours} · after hours {formatPhone(s.afterHours) || 'not set'}</small><small>Paid into Whop: {paid}{me?.payoutsOwed ? ` · ${usd(me.payoutsOwed)} owed to you` : ''}</small></span>
        <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
      </a>
    </div>
  );
}

function LotRow({ link, lot, v }: { link: LotLink; lot?: Lot; v?: Vehicle }) {
  const s = lot?.sale;
  const line = !lot ? 'Reaching the lane…'
    : s?.startedAt ? 'Picked up' : s?.voidedAt ? 'Voided' : s?.forfeitedAt ? 'Buyer walked · $250 owed to you'
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
      <section className="enter"><h1 className="q">The lane is <em>not connected.</em></h1><p className="note">Call Obavia to connect it.</p>{/* the build has no VITE_AUCTION_API: a system word, kept off the glass */}</section>
    </main>
  );
}

/* ---------- /auction/setup : the key page, the fallback ----------
   A dealer arrives by Open The Desk on the application's key screen (main.tsx, takeKeyFromLink) and never
   sees this page. It is reached from a link with no usable key, or from Key on the Lane. The one line says
   where the key comes from; the paste field sits below it, faint, and Keep It joins only once a key is in it. */
export function Setup() {
  const [k, setK] = useState(dealerKey.get() ?? '');
  const ready = KEY_SHAPE.test(k.trim());
  return (
    <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key="setup">
        <h1 className="q">Your lane <em>key.</em></h1>
        <p className="note">Tap Open The Desk on the page that gave you your key, on this phone.</p>
        <label className="field faint-field" style={{ marginTop: 40 }}><span>Or paste the key here.</span><input className="input" value={k} onChange={e => setK(e.target.value)} placeholder="d:P123456.…" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Your key" /></label>
      </section>
      {ready && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); dealerKey.set(k); go('/auction'); }}>Keep It</button></div></div>}
    </main>
  );
}

/* ---------- /auction/go : Let It Go, one question per page ---------- */
type Page = 'car' | 'title' | 'lienholder' | 'payoff' | 'release' | 'photos' | `word${0 | 1 | 2 | 3 | 4 | 5}` | 'insured' | 'pickup' | 'days' | 'floor' | 'bring' | 'go';
const HOURS_GLOSS: Record<HoursChoice, string> = { weekdays: 'The buyer picks a weekday', saturday: 'Weekdays and Saturday', call: 'The buyer calls the after-hours line' };
const DAYS = [{ d: 3, gloss: 'Quick. Fewer eyes, less holding cost.' }, { d: 7, gloss: 'The usual. A full week of phones.' }, { d: 10, gloss: 'Patient. The most bidders.' }];

export function LetItGo() {
  const { lot, dealer, sales, laneSettings } = useStore();
  const busy = new Set(sales.filter(s => s.status === 'in_progress').map(s => s.vehicle.id));
  const taken = onLane();   // unwound and unsold lots have left the lane: their cars may go again
  const again = useMemo(() => { const id = takeAgain(); return id ? lot.find(v => v.id === id && !busy.has(v.id) && !taken.has(v.id)) ?? null : null; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [page, setPage] = useState<Page>(again ? 'title' : 'car');
  const [q, setQ] = useState('');
  const [car, setCar] = useState<Vehicle | null>(again);
  const settings = laneSettings ?? defaultSettings(dealer, true);
  const [hours, setHours] = useState<HoursChoice | null>(hoursChoice(settings.hours));
  const [after, setAfter] = useState(formatPhone(settings.afterHours));
  const [status, setStatus] = useState<Collateral['title']['status'] | null>(null);
  const [lienholder, setLienholder] = useState('');
  const [payoff, setPayoff] = useState('');
  const [release, setRelease] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [shot, setShot] = useState<{ i: number; src: string } | null>(null);
  const [grade, setGrade] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [insured, setInsured] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [floor, setFloor] = useState('');
  const [ack, setAck] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);
  const goBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLHeadingElement>(null);
  /* Arrived by Open The Desk: the key is kept, so the first question breathes once with the chime and the tick.
     A browser may hold the chime and the tick until the first touch on this page (no gesture crossed the link). */
  useEffect(() => { if (takeArrival()) feel.landedOn(opener.current); }, []);

  const found = useMemo(() => lot.filter(v => !busy.has(v.id) && !taken.has(v.id) && `${v.stock} ${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase().includes(q.toLowerCase())), [lot, q, sales]); // eslint-disable-line react-hooks/exhaustive-deps
  const payoffN = status === 'lender' ? Number(payoff) || 0 : 0, floorN = Number(floor) || 0;
  const bring = youGetYouBring(floorN, payoffN);
  const pages: Page[] = ['car', 'title', ...(status === 'lender' ? ['lienholder', 'payoff', 'release'] as const : []), 'photos', 'word0', 'word1', 'word2', 'word3', 'word4', 'word5', 'insured', 'pickup', 'days', 'floor', ...(bring.bring > 0 ? ['bring'] as const : []), 'go'];
  /* The pickup answer is the dealer's lane settings, kept for every later lot (store.laneSettings; dealer-settings.ts). */
  const afterOk = E164.test(toE164(after));
  const laneNow = () => ({ ...settings, lane: true, hours: hours ? [...HOURS[hours].hours] : settings.hours, afterHours: toE164(after) || settings.afterHours });
  const keepPickup = (h: HoursChoice) => { setHours(h); const nd = { ...laneNow(), hours: [...HOURS[h].hours] }; setLaneSettings(nd); };
  const at = Math.max(0, pages.indexOf(page));
  const to = (p: Page, d: 'fwd' | 'back' = 'fwd') => transition(() => { setPage(p); scrollTo(0, 0); }, d);
  const next = () => { feel.next(); to(pages[at + 1]); };
  const back = () => to(pages[at - 1], 'back');

  const collateral: Collateral | null = status ? { title: { status, ...(status === 'lender' ? { lienholder: lienholder.trim(), payoff: payoffN, releaseDays: Number(release) || 0 } : {}) }, floor: floorN, payoffAcknowledged: ack, insured } : null;
  const refusal = collateralRefusal(collateral ?? undefined) ?? (laneReady(laneNow()) ? null : 'lane settings missing');
  const releaseLate = releaseRefusal(Number(release) || 0);
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
    const ls = laneNow(); setLaneSettings(ls);
    const f = lotFields(ls);   // the pickup hours, the after-hours line and the address the buyer's Pickup screen reads
    const car2 = carMeta(car, dealer, remote, grade.map(g => g ?? 0.6) as [number, number, number, number, number, number], collateral, f.afterHours, f.hours, f.address);
    if (guide) car2.documents = { guide };
    const closesAt = Date.now() + days * 86_400_000;
    const r = await openLot(id, { id, dealer: dealer.licence, start: floorN, retail: car.price, closesAt, car: car2 });
    setSending(null);
    if (!r.ok) { setFailed(`The lane refused: ${r.reason}.`); return; }
    for (const old of lotLinks().filter(l => l.vehicleId === car.id && relistable(l))) rememberLot({ ...old, unwound: true });   // the earlier lot stays remembered as left
    rememberLot({ lotId: id, vehicleId: car.id, openedAt: new Date().toISOString(), closesAt, floor: floorN, days });
    /* The one landed state: the chime, the button settling and its word changing on the same frame; the lot opens as the chime ends. */
    setLanded(true); feel.done(); land(goBtn.current);
    setTimeout(() => go(`/auction/${id}`), 420);
  }

  const word = page.startsWith('word') ? Number(page.slice(4)) : -1;
  return (
    <main className="wrap center">
      <div className="top">{at === 0 ? <Back to="#/auction" label="Lane" /> : <button className="back" onClick={() => { feel.tap(); back(); }}><Ic n="chev" s={18} w={2.4} />Back</button>}<span className="step num">{at + 1} of {pages.length}</span></div>

      {page === 'car' && <section className="enter" key="car">
        <Obj name="car" h={72} style={{ display: 'block', margin: '0 auto 8px' }} />
        <h1 className="q" ref={opener}>Which car <em>goes?</em></h1>
        <label className="field"><input className="input" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Stock, year, make or VIN" /></label>
        <div className="choices">{found.slice(0, 8).map(v => <Choice key={v.id} label={carName(v)} gloss={`${v.stock} · ${usd(v.price)}${v.mileage != null ? ` · ${v.mileage.toLocaleString()} mi` : ''}`} on={car?.id === v.id} onPick={() => { setCar(v); next(); }} />)}
          {!found.length && <p className="empty">{lot.length ? 'No car matches. Cars in a sale or on the lane stay out.' : 'Add cars to the lot first.'}</p>}</div>
      </section>}

      {page === 'title' && car && <section className="enter" key="title">
        <Obj name="title" h={64} style={{ display: 'block', margin: '0 auto 8px' }} />
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
        <label className="field"><input className="input big num" inputMode="numeric" autoFocus value={release} onChange={e => setRelease(digits(e.target.value).slice(0, 3))} placeholder="5" aria-label="Days to release" /></label>
        {releaseLate && <p className="note" role="alert">{said(releaseLate)}</p>}
      </section>}

      {page === 'photos' && car && <section className="enter" key="photos">
        <h1 className="q">Show <em>it.</em></h1>
        <p className="note">Front three-quarter, the rear, the driver’s side; then the dash, the seats, and anything worn. Sideways photos are fine.</p>
        <div className="choices grid2" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>{photos.map((p, i) => <button key={i} className="choice shot-cell" style={{ padding: 0, minHeight: 0, aspectRatio: '1', borderRadius: 18, overflow: 'hidden' }} onClick={() => { feel.tap(); setShot({ i, src: p }); }} aria-label={`Open photo ${i + 1}`}><img src={p} alt="" /></button>)}
          {photos.length < 12 && <label className="choice" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', minHeight: 96, cursor: 'pointer' }}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>{adding ? 'Adding…' : photos.length ? 'Add more' : 'Take photos'}</b><small>{photos.length} of 12</small></span><input type="file" accept="image/*" capture="environment" multiple hidden onChange={e => add(e.target.files)} /></label>}
        </div>
        {shot && <PhotoSheet src={shot.src} n={shot.i + 1} onRemove={() => setPhotos(x => x.filter((_, j) => j !== shot.i))} onClose={() => setShot(null)} />}
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

      {page === 'pickup' && <section className="enter" key="pickup">
        <h1 className="q">When can they <em>pick up?</em></h1>
        <p className="note">The buyer picks a window from these on their phone. The after-hours line is under it.</p>
        <div className="choices">{HOURS_ORDER.map(h => <Choice key={h} label={HOURS[h].label} gloss={HOURS_GLOSS[h]} on={hours === h} onPick={() => { keepPickup(h); if (afterOk) next(); }} />)}</div>
        <label className={'field' + (afterOk ? '' : ' faint-field')} style={{ marginTop: 22 }}><span>After hours, someone answers</span><input className="input num" inputMode="tel" autoComplete="tel" value={after} onChange={e => setAfter(formatPhone(e.target.value))} placeholder="(555) 000-0000" maxLength={14} aria-label="After-hours line" /></label>
        {!!after && !afterOk && <p className="note" role="alert">Not a number that rings.</p>}
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
          <div className="row"><span className="t"><b>Holding it {days} more days</b><small>Floorplan interest and the value it loses</small></span><span className="v num">{usd(holdingCost(days, floorN || band.low))}</span></div>
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
        {refusal && <p className="note">{said(refusal)}</p>}
        {failed && <p className="note">{failed}</p>}
      </section>}

      <div className="dock"><div className="in">
        {page === 'lienholder' && <button className="btn primary block" disabled={!lienholder.trim()} onClick={next}>Next</button>}
        {page === 'payoff' && <button className="btn primary block" disabled={!payoffN} onClick={next}>Next</button>}
        {page === 'release' && <button className="btn primary block" disabled={!Number(release) || !!releaseLate} onClick={next}>Next</button>}
        {page === 'photos' && <button className="btn primary block" disabled={photos.length < 3 || adding} onClick={next}>{photos.length < 3 ? `${3 - photos.length} more to go` : 'Next'}</button>}
        {page === 'pickup' && hours && <button className="btn primary block" disabled={!afterOk} onClick={() => { keepPickup(hours); next(); }}>Next</button>}
        {page === 'floor' && <button className="btn primary block" disabled={floorN < 100} onClick={next}>Next</button>}
        {page === 'go' && <button ref={goBtn} className="btn primary block" disabled={!!refusal || !!sending || photos.length < 3} onClick={landed ? undefined : send}>{landed ? <><Ic n="check" s={18} w={2.6} />On The Lane</> : sending ? `${sending}…` : 'Go'}</button>}
      </div></div>
    </main>
  );
}

/* ---------- /auction/:lot : Live while bidding; Sold after the hammer ---------- */
export function LotPage({ id }: { id: string }) {
  if (id === 'settings') return <LaneSettings onDone={() => go('/auction')} />;
  return <LotPageOf id={id} />;
}
function LotPageOf({ id }: { id: string }) {
  const { lot: cars } = useStore();
  const [lot, setLot] = useState<Lot | null>(null);
  const [gone, setGone] = useState(false);
  const [, tick] = useState(0);
  /* The hammer (native-patterns §7 line 8): a sale that arrives while Live is on the glass lands on
     Live's own figure first (the swell, the chime, cloud-landed, the haptic), then the page settles into
     Sold. A lot opened already sold goes straight to Sold, silently: nothing happened in front of anyone. */
  const [hammer, setHammer] = useState(false);
  const sawLive = useRef(false);
  useEffect(() => {
    if (!lot) return;
    if (!lot.sale) { sawLive.current = true; return; }
    if (!sawLive.current) return;
    sawLive.current = false; setHammer(true);
    const t = setTimeout(() => transition(() => { setHammer(false); scrollTo(0, 0); }), 760);
    return () => clearTimeout(t);
  }, [lot ? (lot.sale ? 1 : 0) : -1]); // eslint-disable-line react-hooks/exhaustive-deps
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
  /* the frame the sale arrives on is already the hammer's (the effect above has not run yet) */
  const landing = hammer || (!!lot.sale && sawLive.current);
  if (lot.sale && !landing) return <Sold lot={lot} v={v} link={link} />;
  return <Live lot={lot} v={v} link={link} hammer={landing} onLot={setLot} />;
}

function Live({ lot, v, link, hammer, onLot }: { lot: Lot; v?: Vehicle; link?: LotLink; hammer?: boolean; onLot: (l: Lot) => void }) {
  const [busy, setBusy] = useState(false);
  const [lowering, setLowering] = useState(false);
  const [newFloor, setNewFloor] = useState('');
  const [asking, setAsking] = useState(false);
  /* A bid lands: the figure lifts once, the one-note tone, the tick. Keyed on the count of bids, so the
     one-second clock, a poll that brings the same lot back and a remount are all silent. */
  const fig = useRef<HTMLHeadingElement>(null), bids = useRef(lot.bids);
  useEffect(() => {
    if (lot.bids > bids.current && !hammer) { bidPulse(fig.current); feel.bid(); }
    bids.current = lot.bids;
  }, [lot.bids]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (hammer) feel.landedOn(fig.current); }, [hammer]);
  const sell = async () => { setBusy(true); const r = await closeLot(lot.id); setBusy(false); if (r.ok) onLot(r.value); };
  /* The new-floor field opens at the foot of the page; bring it clear of the dock so the thumb and the keyboard land on it. */
  useEffect(() => { if (lowering) requestAnimationFrame(() => scrollTo(0, document.documentElement.scrollHeight)); }, [lowering]);
  const total = Math.max(1, lot.closesAt - (link ? Date.parse(link.openedAt) : lot.opensAt));
  const left = Math.max(0, lot.closesAt - Date.now());
  const p = Math.round((1 - left / total) * 100);
  const name = v ? carName(v) : lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id;
  const floor = lot.car?.collateral?.floor ?? lot.start;
  const closed = !!lot.closed;
  /* Closed with no bids: the car left the lane and may go again (gap table §2 item 4). */
  useEffect(() => { if (closed && !lot.bids && !lot.sale && link && !link.unsold) rememberLot({ ...(lotLinks().find(l => l.lotId === link.lotId) ?? link), unsold: true }); }, [closed, lot.bids]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key="live">
        <Ring className="ring big" p={closed ? 100 : p}><span className="num" style={FACE}>{closed ? 'Done' : timeLeft(lot.closesAt)}</span></Ring>
        <h1 className="q num" ref={fig}>{hammer && lot.sale ? usd(lot.sale.hammer) : lot.bids ? <Count value={lot.high} format={dollars} /> : <>No bids <em>yet.</em></>}</h1>
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
      {asking && <ActionSheet line={<>End it now at <b className="num">{usd(lot.high)}</b>. The high bidder has it.</>} verb="Sell It Now" onAct={sell} onClose={() => setAsking(false)} />}
      {!hammer && <div className="dock"><div className="in">
        {closed ? <button className="btn primary block" onClick={() => { feel.next(); goAgain(link?.vehicleId); }}>Let It Go Again</button>
          : lowering ? <button className="btn primary block" disabled={busy || !Number(newFloor) || Number(newFloor) >= floor} onClick={async () => { setBusy(true); const c = lot.car!.collateral; const r = await updateCar(lot.id, { collateral: { ...c, floor: Number(newFloor), payoffAcknowledged: (c.title.payoff ?? 0) > Number(newFloor) ? c.payoffAcknowledged : undefined } }); setBusy(false); if (r.ok) { feel.done(); setLowering(false); } }}>Set The Floor</button>
          : lot.bids >= 1 ? <button className="btn primary block" disabled={busy} onClick={() => { feel.tap(); setAsking(true); }}>Sell It Now</button>
          : <button className="btn primary block" onClick={() => { feel.tap(); setLowering(true); }}>Lower The Floor</button>}
        {/* a lower floor is gone once a bid is placed: the Worker refuses it (409 bids placed), so the glass does not offer it */}
        {lowering && <button className="textlink" onClick={() => { feel.tap(); setLowering(false); }}>Leave it</button>}
      </div></div>}
    </main>
  );
}

const WHY = ['The car sold on the lot first', 'The title will not release in time', 'The car was damaged', 'Something else'];
/** A lane clock's dot: amber from day 15, red past the day. */
const tone = (w: LaneWatch) => (w.state === 'overdue' ? 'late' : w.state === 'soon' ? 'warn' : w.state === 'done' ? 'good' : '');
const DOT = { display: 'inline-block', width: 8, height: 8, marginLeft: 8, verticalAlign: 1, boxShadow: 'none' } as const;
const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });

function Sold({ lot, v, link }: { lot: Lot; v?: Vehicle; link?: LotLink }) {
  const s = lot.sale!;
  const { dealer } = useStore();
  const [marks, setMarks] = useState({ titleTo: link?.titleTo, taxSent: link?.taxSent });
  const [mode, setMode] = useState<'sale' | 'vin' | 'void'>('sale');
  const [vin, setVin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  /* The pickup (native-patterns §7 line 9): where the browser can read a QR, the camera reads the
     buyer's pass; where it cannot, the button says "Type The Pass" and the page is the typed six: the
     six printed under the buyer's QR (auction/src/pass.ts), the VIN's last six. */
  const [scanner] = useState(canScan);
  const [cam, setCam] = useState(false), [caught, setCaught] = useState(false);
  const video = useRef<HTMLVideoElement>(null), six = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!cam || !video.current) return;
    return startScan(video.current, raw => {
      const got = passSix(raw, lot.id);
      if (!got || (v && !v.vin.toUpperCase().endsWith(got))) return false; // another lot's pass, or not a pass: keep looking, silently
      setVin(got); setCaught(true); setCam(false);
      return true;
    }, () => setCam(false)); // no camera, or no permission: the typed six, silently
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the pass is caught: the six fill in where the camera was, the field breathes once, the air and the tick */
  useEffect(() => { if (caught) feel.landedOn(six.current, false); }, [caught]);
  const name = v ? carName(v) : lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id;
  const state = s.startedAt ? 'started' : s.voidedAt ? 'voided' : s.forfeitedAt ? 'forfeited' : s.paidAt ? 'paid' : 'owed';
  const left = s.deadlineAt - Date.now();
  const total = Math.max(1, s.deadlineAt - s.wonAt);
  const h = (ms: number) => `${Math.max(0, Math.floor(ms / 3_600_000))}h ${Math.max(0, Math.floor((ms % 3_600_000) / 60_000))}m`;
  /* A lane sale's two clocks run from the hammer's date in the dealer's zone (docs/plan/obavia-auction-decisions.md §9 D2, D7). */
  const soldOn = today(dealer.timeZone, new Date(s.wonAt)), asOf = today(dealer.timeZone);
  const live = state !== 'voided' && state !== 'forfeited';
  const titleW = laneTitleWatch(soldOn, asOf, marks.titleTo), taxW = taxRemitWatch(soldOn, asOf, marks.taxSent);
  useEffect(() => { if (link && (link.soldOn !== soldOn || !!link.unwound !== !live)) rememberLot({ ...link, soldOn, unwound: !live || undefined }); }, [link?.lotId, soldOn, live]);
  const mark = (k: 'titleTo' | 'taxSent') => { feel.done(); setMarks(m => ({ ...m, [k]: asOf })); if (link) rememberLot({ ...(lotLinks().find(l => l.lotId === link.lotId) ?? link), soldOn, [k]: asOf }); };
  const act = async (f: () => Promise<{ ok: boolean; reason?: string }>) => { setBusy(true); setErr(null); const r = await f(); setBusy(false); if (r.ok) { feel.done(); setMode('sale'); } else setErr(said(r.reason ?? 'offline')); };
  /* CP9: the deadline in the push's words. The Worker pushes "Pay by <payBy(deadlineAt)>" (worker/src/auction.ts); this row and the setter line say the same. */
  const payByLine = `Pay by ${payBy(s.deadlineAt)}`;
  /* CF9's setter half: the winner's name and number for the one call within the hour; "Buyer" when the Worker has no name. */
  const who = s.contact?.name?.trim() || 'Buyer';
  const phone = s.contact?.phone ?? null;
  const fees = lot.car?.dealer?.fees ?? dealer.fees;
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      <section className="enter" key={state + mode}>
        {state === 'owed' && <Ring className="ring big" p={Math.round((1 - Math.max(0, left) / total) * 100)}><span className="num" style={{ ...FACE, fontSize: 17 }}>{h(left)}</span></Ring>}
        <h1 className="q num">{usd(s.hammer)}</h1>
        <p className="note">{name} · {
          state === 'started' ? `Picked up ${new Date(s.startedAt!).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` :
          state === 'voided' ? 'Voided. The buyer’s deposit went back.' :
          state === 'forfeited' ? 'The buyer walked. The car is still yours.' :
          state === 'paid' ? (scanner ? 'Paid. Scan their pass when the buyer is here.' : 'Paid. Type the pass when the buyer is here.') :
          `Sold. ${payByLine}.`}</p>
        {mode === 'sale' && state === 'owed' && <div className="group">
          <a className="row" href={phone ? `tel:${phone}` : undefined} onClick={phone ? feel.tap : undefined} style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="t"><b>Call {who} within the hour.</b><small>Say: {payByLine}. Then the pickup hours.</small></span>
            <span className="v num" style={{ whiteSpace: 'nowrap' }}>{phone ? dial(phone) : 'No number yet'}</span>
          </a>
        </div>}
        {mode === 'sale' && <div className="group">
          <div className="row"><span className="t"><b>Won</b></span><span className="v">{new Date(s.wonAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
          {state !== 'started' && state !== 'forfeited' && <div className="row"><span className="t"><b>Pay by</b></span><V obj="clock">{payBy(s.deadlineAt)}</V></div>}
          {state === 'owed' && <div className="row"><span className="t"><b>Collect at the lot</b><small>The total less the {usd(DEPOSIT_USD)} deposit</small></span><span className="v num">{usd(collect(s.hammer, fees))}</span></div>}
          <div className="row"><span className="t"><b>{s.payout || s.deposit === 'applied' || s.deposit === 'to_dealer' ? depositWords(s) : 'Deposit'}</b><small>{s.payout || s.deposit === 'applied' || s.deposit === 'to_dealer' ? (s.payout?.state === 'owed' || !s.payout ? 'Until Whop sends it' : s.payout.at ? new Date(s.payout.at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '') : depositWords(s)}</small></span><V obj="coin">{usd(DEPOSIT_USD)}</V></div>
          {link && <div className="row"><span className="t"><b>Floor</b></span><span className="v num">{usd(link.floor)}</span></div>}
          {live && <div className="row"><span className="t"><b>Title to the buyer before day 21.</b></span><V obj="title"><span style={{ whiteSpace: 'nowrap' }}>{titleW.state === 'done' ? 'Done' : shortDay(titleW.due)} <i className={`dot ${tone(titleW)}`} style={DOT} aria-label={titleW.state} /></span></V></div>}
          {live && <div className="row"><span className="t"><b>Tax to the county.</b></span><span className="v" style={{ whiteSpace: 'nowrap' }}>{taxW.state === 'done' ? 'Done' : shortDay(taxW.due)} <i className={`dot ${tone(taxW)}`} style={DOT} aria-label={taxW.state} /></span></div>}
        </div>}
        {mode === 'vin' && cam && <div className="scan"><video ref={video} muted playsInline autoPlay aria-label="The buyer’s pass, through the camera" /><i aria-hidden="true" /></div>}
        {mode === 'vin' && !cam && <>
          {!caught && <p className="note" style={{ marginTop: 28 }}>The six under the buyer’s code.</p>}
          <label className={'field' + (caught ? ' caught' : '')} style={caught ? { marginTop: 28 } : undefined}><input ref={six} className="input big num" autoFocus={!caught} value={vin} onChange={e => { setCaught(false); setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/I/g, '1').replace(/[OQ]/g, '0').slice(0, 6)); /* a VIN has no I, O or Q: the Bodoni 1 and 0 typed as letters are the digits */ }} placeholder="Last 6" autoCapitalize="characters" aria-label="The six under the buyer’s code" /></label>
        </>}
        {mode === 'void' && <>
          <p className="note" style={{ marginTop: 28 }}>Ending a sale you cannot deliver returns the buyer’s deposit in full and counts against your lane standing. A second one closes the lane to you.</p>
          <div className="choices">{WHY.map(w => <Choice key={w} label={w} disabled={busy} onPick={() => setWhy(w)} />)}</div>
        </>}
        {err && <p className="note">{err}</p>}
      </section>
      {why && <ActionSheet line={<>The buyer’s <b className="num">{usd(250)}</b> deposit goes back in full. This counts against your lane standing.</>} verb="End The Sale" onAct={() => act(() => voidSale(lot.id, why))} onClose={() => setWhy(null)} />}
      <div className="dock"><div className="in">
        {mode === 'sale' && state === 'owed' && <button className="btn primary block" disabled={busy} onClick={() => act(() => markPaid(lot.id))}>Paid At The Lot</button>}
        {mode === 'sale' && state === 'paid' && <button className="btn primary block" onClick={() => { feel.next(); setVin(''); setCaught(false); setCam(scanner); setMode('vin'); }}>{scanner ? 'Scan The Pass' : 'Type The Pass'}</button>}
        {mode === 'sale' && state === 'started' && v && <button className="btn primary block" onClick={() => { feel.done(); const id = startSale(v, { fullName: '', phone: '', address: '', city: '', state: 'TX', zip: '', county: '', idType: 'dl', idNumber: '' }, 'en', v.mileage ?? 0, v.titleStatus); go(`/sale/${id}/guide`); }}>Open The Paperwork</button>}
        {mode === 'sale' && (state === 'forfeited' || state === 'voided') && <button className="btn primary block" onClick={() => { feel.next(); goAgain(link?.vehicleId); }}>Let It Go Again</button>}
        {mode === 'vin' && <button className="btn primary block" disabled={busy || vin.length < 6} onClick={() => act(() => pickup(lot.id, vin))}>It Started</button>}
        {mode === 'sale' && (state === 'owed' || state === 'paid') && <button className="textlink" onClick={() => { feel.tap(); setMode('void'); }}>I can’t deliver this car</button>}
        {mode === 'sale' && state === 'started' && titleW.state !== 'done' && <button className="textlink" onClick={() => mark('titleTo')}>The Buyer Has The Title</button>}
        {mode === 'sale' && state === 'started' && titleW.state === 'done' && taxW.state !== 'done' && <button className="textlink" onClick={() => mark('taxSent')}>The Tax Went To The County</button>}
        {mode === 'vin' && cam && <button className="textlink" onClick={() => { feel.tap(); setCam(false); }}>Type The Pass</button>}
        {mode !== 'sale' && <button className="textlink" onClick={() => { feel.tap(); setCam(false); setMode('sale'); }}>Back</button>}
      </div></div>
    </main>
  );
}
