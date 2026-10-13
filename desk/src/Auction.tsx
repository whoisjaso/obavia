/* The Desk's side of the lane. Let It Go is one question per page: the car,
   where the title is, the photos, six condition words, the insurance, how
   long, the floor; then Go. Live is the ring and the price. Sold is the
   buyer's clock, the money, the VIN at pickup, and the way out (void).
   The lane refuses collateral it cannot see; so does this screen, earlier. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AUDIO_MAX_BYTES, DEPOSIT_USD, ENGINE_SECONDS, INVOICE_WORDS, KEY_SHAPE, OFFER_WORDS, PAYOUT_PAGE_WORDS, PLATES_WORDS, accountWords, auctionLive, audioMime, canCloseLane, carMeta, closeLot, closedLots, collateralRefusal, collect, dealerKey, depositWords, dial, getInvoices, getMe, guideNeeded, laneWord, releaseRefusal, said, getLot, holdingCost, isAdminKey, keepContact, lotId, lotLinks, markPaid, markPlates, offerLeft, offerState, onLane, openLot, payBy, payoutPageState, payoutSplit, photoBlob, pickup, platesKickback, platesVerb, putAudio, putPhoto, putSettings, putVideo, relistable, rememberLot, takeArrival, timeLeft, updateCar, videoRefusal, videoType, voidSale, watchLot, wholesaleBand, youGetYouBring, type Collateral, type Invoice, type Lane as LaneKind, type Lot, type LotLink, type Me, type PlatesState, type RemotePhoto } from './lib/auction';
import { HOURS, HOURS_ORDER, defaultSettings, hoursChoice, laneReady, lotFields, toE164, E164, type DealerSettings, type HoursChoice } from './lib/dealer-settings';
import { formatPhone } from './lib/forms/phone';
import { laneDocuments, openLaneSale, uploadLaneDocuments, type LaneUpload } from './lib/sign';
import { laneBuyer, laneTitleStep, type FiledMark } from './lib/filed';
import { filed130U } from './lib/official';
import { usd } from './lib/money';
import { today } from './lib/loans';
import { laneTitleWatch, taxRemitWatch, type LaneWatch } from './lib/tax';
import type { Vehicle } from './lib/sale';
import { shrink } from './Paper';
import { setLaneSettings, startSale, useStore } from './store';
import { LaneSettings } from './Onboarding';
import { Back, CarArt, Choice, Ic, feel, go, transition, useHash } from './ui';
import { Count, Ring, bidPulse, breathe, land, playSheet, pulse, rollOff, sheetFrame, turnKey, useInk, type Sheet } from './motion';
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
type ObjName = 'car' | 'title' | 'plate' | 'coin' | 'clock' | 'key' | 'hammer';
const OBJ_RATIO: Record<ObjName, number> = { car: 512 / 320, title: 1, plate: 512 / 320, coin: 1, clock: 1, key: 1, hammer: 1 };
export function Obj({ name, h = 28, style }: { name: ObjName; h?: number; style?: CSSProperties }) {
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
/* The rendered moments (DOCTRINE §5): a 24-frame sheet from assets/scene-3d/<object>/light (copied to public/scene-3d as
   <object>-light-sheet.*; the 1x sheet's 256 px cell is more than a 36 px ring needs at any phone's density, so the 2x copies stay
   on disk). A sheet plays once, frame by frame (motion.ts playSheet), and rests on frame 23, the still, touching the figure it means
   (lego.md §4.1). `play` counts the moments: 0 shows the still; each step plays the sheet once more. Reduced motion: the still alone.
   No sound of its own: the moment's sound is the caller's (a cost has none; the coin arriving has the chime).
   The bleed ring (the floorplan clock bleeding, the Floor screen's holding cost) plays as the holding figure lands, after the row's
   own settle; the coin (the deposit coming back) plays when the $250 reaches the dealer; the hammer (the gavel falls, the cloud takes
   it) plays as the hour-after page opens. */
type MomentName = 'bleed' | 'coin' | 'hammer';
const sheets: Partial<Record<MomentName, Promise<Sheet>>> = {};
function Moment({ name, h = 36, play = 1, delay = 0.4, style }: { name: MomentName; h?: number; play?: number; delay?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const base = `${import.meta.env.BASE_URL}scene-3d/${name}-light-sheet`;
    sheets[name] ??= fetch(`${base}.json`).then(r => r.json() as Promise<Sheet>);
    let on = true, stop: (() => void) | undefined;
    sheets[name]!.then(sheet => {
      if (!on || !el.isConnected) return;
      el.style.backgroundImage = `url(${base}.png)`;
      if (play > 0) stop = playSheet(el, sheet, h, delay); else sheetFrame(el, sheet, sheet.rest, h);
    }).catch(() => { sheets[name] = undefined; });
    return () => { on = false; stop?.(); };
  }, [h, play]); // eslint-disable-line react-hooks/exhaustive-deps
  return <i ref={ref} aria-hidden="true" style={{ display: 'inline-block', flex: 'none', width: h, height: h, backgroundRepeat: 'no-repeat', ...style }} />;
}
const Bleed = ({ h = 36 }: { h?: number }) => <Moment name="bleed" h={h} />;
/** Let It Go Again: the car that just left the lane is the car that goes. Kept for the next Let It Go only (the router
    reads #/auction/go as it is; a query there would be read as a lot id). */
const AGAIN = 'obavia.desk.auction.again';
const goAgain = (vehicleId?: string) => { try { if (vehicleId) sessionStorage.setItem(AGAIN, vehicleId); else sessionStorage.removeItem(AGAIN); } catch { /* private mode */ } go('/auction/go'); };
const takeAgain = () => { try { const id = sessionStorage.getItem(AGAIN); sessionStorage.removeItem(AGAIN); return id; } catch { return null; } };
const GRADES: { label: string; gloss: string; v: number }[] = [{ label: 'Good', gloss: 'Nothing to say', v: 1 }, { label: 'Fair', gloss: 'Worn, works', v: 0.6 }, { label: 'Poor', gloss: 'Needs work', v: 0.25 }];

/* ---------- /auction : what is on the lane, one primary action ---------- */
export function Lane() {
  const { lot, dealer } = useStore();
  const [links, setLinks] = useState<LotLink[]>(lotLinks);
  const [lots, setLots] = useState<Record<string, Lot>>({});
  /* the closed lane's lots (W4-C; GET /lots/closed with the dealer key), under the public ones; a Desk that opened one remembers it already */
  const [closed, setClosed] = useState<Lot[]>([]);
  useEffect(() => { setLinks(lotLinks()); let on = true; closedLots().then(r => { if (on && r.ok && Array.isArray(r.value)) setClosed(r.value); }); return () => { on = false; }; }, []);
  useEffect(() => {
    let on = true;
    const load = async () => { for (const l of links) { const r = await getLot(l.lotId); if (on && r.ok) setLots(x => ({ ...x, [l.lotId]: r.value })); } };
    load(); const t = setInterval(load, 5000); return () => { on = false; clearInterval(t); };
  }, [links]);
  if (!auctionLive) return <Offline />;
  if (!dealerKey.get()) return <Setup />;
  const byId = (id: string) => lot.find(v => v.id === id);
  const open = links.filter(l => !lots[l.lotId]?.closed), done = links.filter(l => lots[l.lotId]?.closed);
  const dealersOnly = closed.filter(c => !links.some(l => l.lotId === c.id));
  const asLink = (c: Lot): LotLink => ({ lotId: c.id, vehicleId: lot.find(v => c.car && v.vin === c.car.vin)?.id ?? '', openedAt: new Date(c.opensAt).toISOString(), closesAt: c.closesAt, floor: c.car?.collateral?.floor ?? c.start, days: 0 });
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /><span style={{ display: 'flex', gap: 18 }}>{isAdminKey() && <a className="link" href="#/auction/admin" onClick={feel.tap}>Admin</a>}<a className="link" href="#/checklist" onClick={feel.tap} style={{ color: 'var(--faint)' }}>Checklist</a><a className="link" href="#/auction/setup" onClick={feel.tap}>Key</a></span></div>
      <section className="enter" key="lane">
        {!open.length && <Obj name="car" h={96} style={{ display: 'block', margin: '0 auto 10px' }} />}
        <h1 className="q">{open.length ? <>On the <em>lane.</em></> : <>Let a car <em>go.</em></>}</h1>
        {!open.length && <p className="note">A car the lot is losing money on, on every phone in Texas by tonight. You set the floor; the lane finds the price.</p>}
        <div className="choices">{open.map(l => <LotRow key={l.lotId} link={l} lot={lots[l.lotId]} v={byId(l.vehicleId)} tz={dealer.timeZone} />)}</div>
        {/* the closed lane's lots under the public ones; each row carries its own faint word, so no heading repeats it (DOCTRINE §4 rule 15) */}
        {!!dealersOnly.length && <div className="choices" style={{ marginTop: 12 }}>{dealersOnly.map(c => <LotRow key={c.id} link={asLink(c)} lot={c} v={byId(asLink(c).vehicleId)} tz={dealer.timeZone} />)}</div>}
        {!!done.length && <><p className="note" style={{ marginTop: 28 }}>Sold or closed</p><div className="choices">{done.map(l => <LotRow key={l.lotId} link={l} lot={lots[l.lotId]} v={byId(l.vehicleId)} tz={dealer.timeZone} />)}</div></>}
        <LaneSettingsRow />
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/auction/go'); }}>Let it go</button></div></div>
    </main>
  );
}

/* The lane settings on the auction home: Connected or Not yet (GET /dealers/me), the hours choice and the after-hours
   number, one row that opens the settings pages (Onboarding.tsx LaneSettings at #/auction/settings). */
function LaneSettingsRow() {
  const { dealer, laneSettings } = useStore();
  const s = laneSettings ?? defaultSettings(dealer, true);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => { let on = true; getMe().then(r => { if (on) setMe(r.ok ? r.value : null); }); return () => { on = false; }; }, []);
  const choice = hoursChoice(s.hours);
  const hours = choice ? HOURS[choice].label : s.hours.join(', ');
  /* Paid into Whop: Not yet; Connected with the masked id; then Whop's own checks on the account once the Worker sends them (accountWords). */
  const acct = me === undefined ? null : accountWords(me ?? { whopAccount: s.whopAccount });
  const paid = acct ? [acct.line, acct.checks].filter(Boolean).join(' · ') : 'Reaching the lane…';
  return (
    <div className="group" style={{ marginTop: 28 }}>
      <a className="row" href="#/auction/settings" onClick={feel.next} style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="t"><b>Lane settings</b><small>{hours} · after hours {formatPhone(s.afterHours) || 'not set'}</small><small>Paid into Whop: {paid}{me?.payoutsOwed ? ` · ${usd(me.payoutsOwed)} owed to you` : ''}</small></span>
        <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
      </a>
    </div>
  );
}

/** The plates word's date, month and day only ("Dealer fixing Oct 13"): one piece, the same words on the lane home and the Sold row (CP9). */
const monthDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
/** The lane home's line for a started car: "Picked up" until the first filing, then the county's clock as the Sold row says it. */
export const startedLine = (plates: NonNullable<Lot['sale']>['plates'], tz: string) => plates ? `${PLATES_WORDS[plates.state]} ${monthDay(today(tz, new Date(plates.at)))}` : 'Picked up';

function LotRow({ link, lot, v, tz }: { link: LotLink; lot?: Lot; v?: Vehicle; tz: string }) {
  const s = lot?.sale;
  const line = !lot ? 'Reaching the lane…'
    : s?.startedAt ? startedLine(s.plates, tz) : s?.voidedAt ? 'Voided' : s?.forfeitedAt ? (offerState(s.offer) === 'open' ? `${OFFER_WORDS.open} · ${usd(s.offer!.amount)} · ${offerLeft(s.offer!)}` : 'Buyer walked · $250 owed to you')
    : s ? (s.paidAt ? 'Paid · waiting on pickup' : `Sold · ${timeLeft(s.deadlineAt)} for the buyer`)
    : lot.closed ? 'Closed, no bids'
    : `${usd(lot.high)} · ${n(lot.bids)} ${lot.bids === 1 ? 'bid' : 'bids'} · ${timeLeft(lot.closesAt)}`;
  const word = laneWord(lot?.car?.lane);   // the closed lane's one faint word on the row (W4-C)
  const name = v ? carName(v) : lot?.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : link.lotId;
  return (
    <a className="choice" href={`#/auction/${link.lotId}`} onClick={feel.next}>
      <span className="art car-art">{v ? <CarArt color={v.color} body={v.bodyStyle} w={44} /> : <Ic n="plate" s={24} />}</span>
      <span className="t"><b>{name}</b><small>{line}</small>{word && <small style={{ color: 'var(--faint)' }}>{word}</small>}</span>
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
type Page = 'car' | 'title' | 'lienholder' | 'payoff' | 'release' | 'photos' | 'engine' | 'walk' | `word${0 | 1 | 2 | 3 | 4 | 5}` | 'insured' | 'pickup' | 'lane' | 'days' | 'floor' | 'bring' | 'go';
/** The engine page exists where the browser can record (MediaRecorder with webm or mp4, and a microphone to ask for). */
const canRecord = () => !!audioMime() && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
/** The pickup page is skipped when the lane settings already hold the hours and a number that rings (simplicity-audit §4 row 3);
    the Go page carries them as one row, which opens the page to change them. */
const pickupHeld = (s: DealerSettings | undefined) => !!s && hoursChoice(s.hours) !== null && E164.test(s.afterHours);
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
  /* Wave 4 (W4-C): the engine at idle and the walkaround, both optional; Go never waits on them. The closed lane's choice exists
     only for a dealer whose /dealers/me carries the wholesale flag (canCloseLane); everyone else never sees the page. */
  const [engine, setEngine] = useState<Blob | null>(null);
  const [walk, setWalk] = useState<File | null>(null);
  const [walkErr, setWalkErr] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [laneKind, setLaneKind] = useState<LaneKind | null>(null);
  useEffect(() => { let on = true; getMe().then(r => { if (on && r.ok) setMe(r.value); }); return () => { on = false; }; }, []);
  const mime = useMemo(audioMime, []);
  const recordable = useMemo(canRecord, []);
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
  const pages: Page[] = ['car', 'title', ...(status === 'lender' ? ['lienholder', 'payoff', 'release'] as const : []), 'photos', ...(recordable ? ['engine'] as const : []), 'walk', 'word0', 'word1', 'word2', 'word3', 'word4', 'word5', 'insured', ...(pickupHeld(laneSettings) ? [] : ['pickup'] as const), ...(canCloseLane(me) ? ['lane'] as const : []), 'days', 'floor', ...(bring.bring > 0 ? ['bring'] as const : []), 'go'];
  /* the pickup page opened from the Go page's row: Next and Back both return to Go */
  const detour = page === 'pickup' && !pages.includes('pickup');
  /* The pickup answer is the dealer's lane settings, kept for every later lot (store.laneSettings; dealer-settings.ts). */
  const afterOk = E164.test(toE164(after));
  const laneNow = () => ({ ...settings, lane: true, hours: hours ? [...HOURS[hours].hours] : settings.hours, afterHours: toE164(after) || settings.afterHours });
  const keepPickup = (h: HoursChoice) => { setHours(h); const nd = { ...laneNow(), hours: [...HOURS[h].hours] }; setLaneSettings(nd); void putSettings(nd); };   // the Worker's copy too (W4-C); a refusal changes nothing here
  const at = detour ? pages.length - 1 : Math.max(0, pages.indexOf(page));
  const to = (p: Page, d: 'fwd' | 'back' = 'fwd') => transition(() => { setPage(p); scrollTo(0, 0); }, d);
  const next = () => { feel.next(); to(detour ? 'go' : pages[at + 1]); };
  const back = () => to(detour ? 'go' : pages[at - 1], 'back');
  const carOnLot = useRef<HTMLDivElement>(null);

  const collateral: Collateral | null = status ? { title: { status, ...(status === 'lender' ? { lienholder: lienholder.trim(), payoff: payoffN, releaseDays: Number(release) || 0 } : {}) }, floor: floorN, payoffAcknowledged: ack, insured } : null;
  const refusal = collateralRefusal(collateral ?? undefined) ?? (laneReady(laneNow()) ? null : 'lane settings missing');
  const releaseLate = releaseRefusal(Number(release) || 0);
  const band = car ? wholesaleBand(car.price, grade.map(g => g ?? 0.6)) : null;
  const inBand = !!band && floorN >= band.low && floorN <= band.high;
  const bandRow = useRef<HTMLSpanElement>(null);
  useInk(bandRow, inBand);

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
    /* The paper the buyer signs (sign.ts): the Buyers Guide and the bill of sale as PDFs, then the signature lines
       for each, all before the lot opens. The Worker stamps the buyer's drawing into these exact bytes
       (auction/worker/src/sign.ts), so a lot without them cannot be signed: a PUT that fails refuses Go. */
    /* A closed lot (W4-C) has no consumer: no Buyers Guide, no bill for a buyer to sign; the Worker's /open does not ask for them. */
    let papers: LaneUpload | null = null;
    if (guideNeeded(laneKind ?? undefined)) {
      setSending('The Buyer’s Guide');
      try { papers = await uploadLaneDocuments(id, await laneDocuments(car, dealer), undefined, setSending); }
      catch { papers = { ok: false, reason: 'guide pdf failed' }; }
      if (!papers.ok) { setSending(null); setFailed(said(papers.reason)); return; }
    }
    setSending('Opening the lane');
    const ls = laneNow(); setLaneSettings(ls);
    const f = lotFields(ls);   // the pickup hours, the after-hours line and the address the buyer's Pickup screen reads
    const car2 = carMeta(car, dealer, remote, grade.map(g => g ?? 0.6) as [number, number, number, number, number, number], collateral, f.afterHours, f.hours, f.address);
    if (papers?.ok) car2.documents = papers.documents;   // the paths the phone's Paper pages open
    if (laneKind && canCloseLane(me)) car2.lane = laneKind;   // only a flagged dealer sends the field (the Worker refuses it from anyone else)
    const closesAt = Date.now() + days * 86_400_000;
    const r = await openLot(id, { id, dealer: dealer.licence, start: floorN, retail: car.price, closesAt, car: car2 });
    if (!r.ok) { setSending(null); setFailed(`The lane refused: ${r.reason}.`); return; }
    /* the engine and the walkaround ride after the lot is open (the routes answer the lot); a refusal leaves the lot open and says nothing */
    if (engine && mime) { setSending('The engine'); await putAudio(id, engine, mime); }
    if (walk) { setSending('The walk around'); await putVideo(id, walk, videoType(walk.type)); }
    setSending(null);
    for (const old of lotLinks().filter(l => l.vehicleId === car.id && relistable(l))) rememberLot({ ...old, unwound: true });   // the earlier lot stays remembered as left
    rememberLot({ lotId: id, vehicleId: car.id, openedAt: new Date().toISOString(), closesAt, floor: floorN, days });
    /* The one landed state: the chime, the button settling and its word changing on the same frame; the car rolls off the lot as
       the chime lands (DOCTRINE §4 rule 14, §5); the lot opens as the car leaves the glass. */
    setLanded(true); feel.done(); land(goBtn.current); rollOff(carOnLot.current);
    setTimeout(() => go(`/auction/${id}`), 900);
  }

  const word = page.startsWith('word') ? Number(page.slice(4)) : -1;
  return (
    <main className="wrap center">
      <div className="top">{at === 0 ? <Back to="#/auction" label="Lane" /> : <button className="back" onClick={() => { feel.tap(); back(); }}><Ic n="chev" s={18} w={2.4} />Back</button>}<span /></div>
      <div className="bar"><i style={{ width: `${((at + 1) / pages.length) * 100}%` }} /></div>

      {page === 'car' && <section className="enter" key="car">
        <Obj name="car" h={72} style={{ display: 'block', margin: '0 auto 8px' }} />
        <h1 className="q" ref={opener}>Which <em>car?</em></h1>
        {lot.length > 8 && <label className="field"><input className="input" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Stock, year, make or VIN" /></label>}
        <div className="choices">{found.slice(0, 8).map(v => <Choice key={v.id} label={carName(v)} gloss={`${v.stock} · ${usd(v.price)}${v.mileage != null ? ` · ${v.mileage.toLocaleString()} mi` : ''}`} on={car?.id === v.id} onPick={() => { setCar(v); next(); }} />)}
          {!found.length && <p className="empty">{lot.length ? 'No car matches.' : 'Add cars to the lot first.'}</p>}</div>
      </section>}

      {page === 'title' && car && <section className="enter" key="title">
        <Obj name="title" h={64} style={{ display: 'block', margin: '0 auto 8px' }} />
        <h1 className="q">The <em>title?</em></h1>
        <div className="choices">
          <Choice label="In my hand" on={status === 'hand'} onPick={() => { setStatus('hand'); to('photos'); }} />
          <Choice label="At the lender" gloss="NextGear, AFC, the bank" on={status === 'lender'} onPick={() => { setStatus('lender'); to('lienholder'); }} />
          <Choice label="Repo" gloss="Not yet" on={status === 'repo'} onPick={() => { setStatus('repo'); feel.tap(); }} />
        </div>
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
        <div className="choices grid2" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>{photos.map((p, i) => <button key={i} className="choice shot-cell" style={{ padding: 0, minHeight: 0, aspectRatio: '1', borderRadius: 18, overflow: 'hidden' }} onClick={() => { feel.tap(); setShot({ i, src: p }); }} aria-label={`Open photo ${i + 1}`}><img src={p} alt="" /></button>)}
          {photos.length < 12 && <label className="choice" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', minHeight: 96, cursor: 'pointer' }}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>{adding ? 'Adding…' : photos.length ? 'Add more' : 'Take photos'}</b><small>{photos.length} of 12</small></span><input type="file" accept="image/*" capture="environment" multiple hidden onChange={e => add(e.target.files)} /></label>}
        </div>
        {shot && <PhotoSheet src={shot.src} n={shot.i + 1} onRemove={() => setPhotos(x => x.filter((_, j) => j !== shot.i))} onClose={() => setShot(null)} />}
      </section>}

      {page === 'engine' && <EnginePage mime={mime} engine={engine} onEngine={setEngine} />}

      {page === 'walk' && <section className="enter" key="walk">
        <Obj name="car" h={72} style={{ display: 'block', margin: '0 auto 8px' }} />
        <h1 className="q">Walk <em>around.</em></h1>
        <div className="choices">
          <label className="choice" style={{ cursor: 'pointer' }} aria-pressed={!!walk}><span className="art"><Ic n="upload" s={24} /></span><span className="t"><b>{walk ? 'Your video' : 'Take a video'}</b><small>{walk ? `${(walk.size / 1_048_576).toFixed(1)} MB` : 'Up to 60 MB'}</small></span><span className="tick">{walk && <Ic n="check" s={15} w={3} />}</span>
            <input type="file" accept="video/*" capture="environment" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const why = videoRefusal(f); setWalkErr(why); if (why) { setWalk(null); return; } setWalk(f); feel.done(); }} /></label>
        </div>
        {walkErr && <p className="note" role="alert">{said(walkErr)}</p>}
      </section>}

      {page === 'lane' && <section className="enter" key="lane">
        <h1 className="q">Which <em>lane?</em></h1>
        {/* the plate beside Public (every phone in Texas), the dealer key beside Dealers only (DOCTRINE §5; lego.md §4.1 touching) */}
        <div className="choices">
          <Choice label="Public" art={<Obj name="plate" h={30} />} on={laneKind === 'public'} onPick={() => { setLaneKind('public'); next(); }} />
          <Choice label="Dealers only" art={<Obj name="key" h={36} />} on={laneKind === 'closed'} onPick={() => { setLaneKind('closed'); next(); }} />
        </div>
      </section>}

      {word >= 0 && <section className="enter" key={page}>
        <h1 className="q">{WORDS[word]}<em>.</em></h1>
        <div className="choices">{GRADES.map(g => <Choice key={g.label} label={g.label} gloss={g.gloss} on={grade[word] === g.v} onPick={() => { setGrade(x => x.map((v, i) => (i === word ? g.v : v))); next(); }} />)}</div>
      </section>}

      {page === 'insured' && car && <section className="enter" key="insured">
        <h1 className="q"><em>Insured?</em></h1>
        <div className="choices"><Choice label="Yes" on={insured} onPick={() => { setInsured(true); next(); }} /><Choice label="No" gloss="The lane will not take it" on={false} onPick={() => { setInsured(false); feel.tap(); }} /></div>
      </section>}

      {page === 'pickup' && <section className="enter" key="pickup">
        <h1 className="q">Pickup <em>hours?</em></h1>
        <div className="choices">{HOURS_ORDER.map(h => <Choice key={h} label={HOURS[h].label} on={hours === h} onPick={() => { keepPickup(h); if (afterOk) next(); }} />)}</div>
        <label className={'field' + (afterOk ? '' : ' faint-field')} style={{ marginTop: 22 }}><span>After hours</span><input className="input num" inputMode="tel" autoComplete="tel" value={after} onChange={e => setAfter(formatPhone(e.target.value))} placeholder="(555) 000-0000" maxLength={14} aria-label="After-hours line" /></label>
        {!!after && !afterOk && <p className="note" role="alert">Not a number that rings.</p>}
      </section>}

      {page === 'days' && <section className="enter" key="days">
        <h1 className="q">How <em>long?</em></h1>
        <div className="choices">{DAYS.map(x => <Choice key={x.d} label={`${x.d} days`} gloss={x.gloss} on={days === x.d} onPick={() => { setDays(x.d); next(); }} />)}</div>
      </section>}

      {page === 'floor' && car && band && days && <section className="enter" key="floor">
        <h1 className="q">The <em>floor.</em></h1>
        {/* each digit ticks (ui.tsx feel.key); the band row's figures turn ink the moment the floor sits inside them (motion.ts useInk), and
            the holding figure counts with the floor (motion.ts Count): the inference "my floor is inside what the lane pays" is the dealer's */}
        <div className="money"><input className="input num" inputMode="numeric" autoFocus value={grouped(floor)} onChange={e => { feel.key(); setFloor(digits(e.target.value)); }} placeholder={n(band.low)} /></div>
        <div className="group" style={{ marginTop: 22 }}>
          <div className="row"><span className="t"><b>Lane pays</b></span><span ref={bandRow} className="v num" style={{ lineHeight: 1.35 }}><Count value={band.low} format={dollars} /><br />to <Count value={band.high} format={dollars} /></span></div>
          <div className="row"><span className="t"><b>{days} more days</b></span><span className="v num" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Bleed /><Count value={holdingCost(days, floorN || band.low)} format={dollars} /></span></div>
          {payoffN > 0 && <div className="row"><span className="t"><b>{bring.bring > 0 ? 'You bring' : 'You keep'}</b><small>After the {usd(payoffN)} payoff</small></span><span className="v num">{usd(bring.bring > 0 ? bring.bring : bring.get)}</span></div>}
        </div>
      </section>}

      {page === 'bring' && <section className="enter" key="bring">
        <h1 className="q">You’ll bring <em>{usd(bring.bring)}.</em></h1>
        <p className="note">The floor is under the payoff. If the lane stops at the floor, you pay {lienholder.trim() || 'the lender'} the difference to release the title. Say so and the lane opens; or raise the floor.</p>
        <div className="choices"><Choice label={`OK, I’ll bring ${usd(bring.bring)}`} on={ack} onPick={() => { setAck(true); next(); }} /><Choice label="Raise the floor" onPick={() => { setAck(false); back(); }} /></div>
      </section>}

      {page === 'go' && car && collateral && days && <section className="enter" key="go">
        <div ref={carOnLot} style={{ display: 'block', margin: '0 auto 8px', width: 'fit-content' }}><Obj name="car" h={72} /></div>
        <h1 className="q" style={longQ(carName(car))}>{carName(car)}<em>.</em></h1>
        <div className="group">
          <div className="row"><span className="t"><b>Floor</b></span><span className="v num">{usd(floorN)}</span></div>
          <div className="row"><span className="t"><b>Title</b></span><span className="v" style={{ flex: '0 1 62%', minWidth: 0, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{status === 'hand' ? 'In hand' : `${lienholder.trim() || 'Lender'} · ${release} days`}</span></div>
          <div className="row"><span className="t"><b>Closes</b></span><span className="v">{new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
          <div className="row"><span className="t"><b>Photos</b></span><span className="v num">{photos.length}</span></div>
          {laneKind === 'closed' && <div className="row"><span className="t"><b>Lane</b></span><span className="v" style={{ color: 'var(--faint)' }}>{laneWord('closed')}</span></div>}
          <a className="row" href="#/auction/go" onClick={e => { e.preventDefault(); feel.tap(); to('pickup'); }} style={{ textDecoration: 'none', color: 'inherit' }}><span className="t"><b>Pickup</b></span><span className="v" style={{ flex: '0 1 62%', minWidth: 0, lineHeight: 1.35 }}>{hours ? HOURS[hours].label : settings.hours.join(', ')}</span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></a>
        </div>
        {refusal && <p className="note">{said(refusal)}</p>}
        {failed && <p className="note">{failed}</p>}
      </section>}

      <div className="dock"><div className="in">
        {page === 'lienholder' && <button className="btn primary block" disabled={!lienholder.trim()} onClick={next}>Next</button>}
        {page === 'payoff' && <button className="btn primary block" disabled={!payoffN} onClick={next}>Next</button>}
        {page === 'release' && <button className="btn primary block" disabled={!Number(release) || !!releaseLate} onClick={next}>Next</button>}
        {page === 'photos' && <button className="btn primary block" disabled={photos.length < 3 || adding} onClick={next}>{photos.length < 3 ? `${3 - photos.length} more to go` : 'Next'}</button>}
        {page === 'engine' && (engine ? <button className="btn primary block" onClick={next}>Next</button> : <HoldCloud mime={mime} onEngine={setEngine} />)}
        {page === 'engine' && !engine && <button className="textlink" onClick={next}>Not now</button>}
        {page === 'walk' && (walk ? <button className="btn primary block" onClick={next}>Next</button> : <button className="textlink" onClick={next}>Not now</button>)}
        {page === 'pickup' && hours && <button className="btn primary block" disabled={!afterOk} onClick={() => { keepPickup(hours); next(); }}>{detour ? 'Keep it' : 'Next'}</button>}
        {page === 'floor' && <button className="btn primary block" disabled={floorN < 100} onClick={next}>Next</button>}
        {page === 'go' && <button ref={goBtn} className="btn primary block" disabled={!!refusal || !!sending || photos.length < 3} onClick={landed ? undefined : send}>{landed ? <><Ic n="check" s={18} w={2.6} />On The Lane</> : sending ? `${sending}…` : 'Go'}</button>}
      </div></div>
    </main>
  );
}

/* ---------- the engine at idle (phases.md Phase 5 Frontend; W4-C) ----------
   One thing: hold the cloud in the dock and the engine is recorded; the ring around the key fills as the eight seconds run,
   the key itself swells with the sound (the waveform, as the ring and the key, no bars to read). Let go and it is kept: the
   chime, the key lit. A tap on the key plays it back; the faint "Hold again" under the key records over it. Nothing here is
   needed for Go. Reduced motion: the ring is set, not swept; the key does not swell. */
type Rec = { mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; t0: number; raf: number; ac: AudioContext | null; an: AnalyserNode | null };
const REDUCED = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The hold: pointer down asks for the microphone and records; pointer up (or the eighth second) stops and keeps it. A hold let go
    before the microphone answered records nothing. The ring and the key are found by their ids on the page (one engine page at a time). */
function useHold(mime: 'audio/webm' | 'audio/mp4' | null, onEngine: (b: Blob | null) => void) {
  const rec = useRef<Rec | null>(null), held = useRef(false);
  const [recording, setRecording] = useState(false);
  const ringEl = () => document.getElementById('engine-ring'), keyEl = () => document.getElementById('engine-key');
  const stop = () => { held.current = false; const r = rec.current; if (!r) return; cancelAnimationFrame(r.raf); if (r.mr.state !== 'inactive') r.mr.stop(); };
  const start = async () => {
    if (!mime || rec.current || held.current) return;
    held.current = true;
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { held.current = false; return; }   // no microphone, or no: silence
    if (!held.current) { stream.getTracks().forEach(t => t.stop()); return; }
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(stream, { mimeType: mime }); } catch { stream.getTracks().forEach(t => t.stop()); held.current = false; return; }
    const chunks: Blob[] = [];
    let ac: AudioContext | null = null, an: AnalyserNode | null = null;
    if (!REDUCED()) { try { ac = new AudioContext(); an = ac.createAnalyser(); an.fftSize = 256; ac.createMediaStreamSource(stream).connect(an); } catch { ac = null; an = null; } }
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop()); ac?.close().catch(() => { /* closed */ });
      const r = rec.current; rec.current = null; setRecording(false);
      const ms = r ? performance.now() - r.t0 : 0;
      const b = new Blob(chunks, { type: mime });
      const ring = ringEl(), key = keyEl();
      if (ms < 400 || !b.size || b.size > AUDIO_MAX_BYTES) { ring?.style.setProperty('--p', '0'); if (key) key.style.transform = ''; return; }   // a tap, or nothing: silent
      ring?.style.setProperty('--p', '100'); if (key) key.style.transform = '';
      onEngine(b); feel.landedOn(key);
    };
    const t0 = performance.now();
    rec.current = { mr, stream, chunks, t0, raf: 0, ac, an };
    try { mr.start(); } catch { stream.getTracks().forEach(t => t.stop()); rec.current = null; held.current = false; return; }
    setRecording(true);
    const buf = an ? new Uint8Array(an.fftSize) : null;
    const tick = () => {
      const r = rec.current; if (!r) return;
      const p = Math.min(100, ((performance.now() - r.t0) / (ENGINE_SECONDS * 1000)) * 100);
      ringEl()?.style.setProperty('--p', String(p));
      if (r.an && buf) { r.an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; s += x * x; } const rms = Math.sqrt(s / buf.length); const k = keyEl(); if (k) k.style.transform = `scale(${(1 + Math.min(0.5, rms * 1.6)).toFixed(3)})`; }
      if (p >= 100) { stop(); return; }
      r.raf = requestAnimationFrame(tick);
    };
    rec.current.raf = requestAnimationFrame(tick);
  };
  useEffect(() => () => { stop(); }, []);   // leaving the page mid-hold stops the microphone
  return { recording, start, stop };
}
function HoldCloud({ mime, onEngine }: { mime: 'audio/webm' | 'audio/mp4' | null; onEngine: (b: Blob | null) => void }) {
  const h = useHold(mime, onEngine);
  return <button className="btn primary block" style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} aria-pressed={h.recording}
    onPointerDown={e => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); void h.start(); }} onPointerUp={h.stop} onPointerCancel={h.stop} onContextMenu={e => e.preventDefault()}
    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void h.start(); } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') h.stop(); }}>{h.recording ? 'Listening' : 'Hold'}</button>;
}
function EnginePage({ mime, engine, onEngine }: { mime: 'audio/webm' | 'audio/mp4' | null; engine: Blob | null; onEngine: (b: Blob | null) => void }) {
  const [playing, setPlaying] = useState(false);
  const url = useMemo(() => (engine ? URL.createObjectURL(engine) : null), [engine]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const play = () => {
    if (!url) return;
    feel.tap();
    audio.current?.pause();
    const a = new Audio(url); audio.current = a; setPlaying(true);
    const key = document.getElementById('engine-key'); const stopBreath = key ? breathe(key) : undefined;
    a.onended = a.onerror = () => { setPlaying(false); stopBreath?.(); };
    a.play().catch(() => { setPlaying(false); stopBreath?.(); });
  };
  useEffect(() => () => { audio.current?.pause(); }, []);
  const again = useHold(mime, onEngine);
  return (
    <section className="enter" key="engine">
      <h1 className="q">The <em>engine.</em></h1>
      {/* the ring fills as the eight seconds run; the key inside it swells with the sound; lit and tappable once kept (lego.md §4.1: the object inside the ring it means) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 30, gap: 10 }}>
        <button id="engine-ring" className="ring big" aria-label={engine ? 'Play the engine' : 'The engine'} disabled={!engine} onClick={play} style={{ width: 132, height: 132, margin: 0, cursor: engine ? 'pointer' : 'default', opacity: engine || again.recording ? 1 : 0.6, transition: 'opacity .3s', ['--p' as string]: engine ? 100 : 0 }}>
          <span style={{ width: 112, height: 112 }}><i id="engine-key" style={{ display: 'inline-block', lineHeight: 0, willChange: 'transform', transition: 'transform .08s linear' }}><Obj name="key" h={64} /></i></span>
        </button>
        {engine && !playing && <button className="textlink" style={{ color: 'var(--faint)', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} aria-pressed={again.recording}
          onPointerDown={e => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); void again.start(); }} onPointerUp={again.stop} onPointerCancel={again.stop} onContextMenu={e => e.preventDefault()}>{again.recording ? 'Listening' : 'Hold again'}</button>}
      </div>
    </section>
  );
}

/* ---------- /auction/:lot : Live while bidding; Sold after the hammer ---------- */
export function LotPage({ id }: { id: string }) {
  /* #/auction/:lot/payout is the payout page under Sold (gap table W3-C); #/auction/settings/whop opens the lane settings on the Whop page. */
  const sub = useHash().split('/')[3];
  if (id === 'settings') return <LaneSettings onDone={() => go('/auction')} start={sub === 'whop' ? 'whop' : undefined} />;
  return <LotPageOf id={id} view={sub === 'payout' ? 'payout' : 'sale'} />;
}
function LotPageOf({ id, view }: { id: string; view: 'sale' | 'payout' }) {
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
  /* Every frame goes through keepContact: the socket never carries sale.contact, so the last one read with the
     dealer key stays on the lot (the Sold call line). A sale that arrives over the socket before any read carried
     a contact (the clock closed it while Live was on the glass) is read once more with the key. */
  const askedContact = useRef(false);
  useEffect(() => {
    let on = true;
    askedContact.current = false;
    const take = (l: Lot) => { if (on) setLot(prev => keepContact(prev, l)); };
    getLot(id).then(r => { if (!on) return; if (r.ok) take(r.value); else setGone(true); });
    const stop = watchLot(id, l => {
      take(l);
      if (l.sale && !l.sale.contact && !askedContact.current) { askedContact.current = true; getLot(id).then(r => { if (r.ok && r.value.sale?.contact) take(r.value); }); }
    });
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => { on = false; stop(); clearInterval(t); };
  }, [id]);
  const link = lotLinks().find(l => l.lotId === id);
  const v = cars.find(c => c.id === link?.vehicleId);
  if (gone) return <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div><p className="empty">This lot is not on the lane.</p></main>;
  if (!lot) return <main className="wrap center"><div className="top"><Back to="#/auction" label="Lane" /></div><p className="empty">Reaching the lane…</p></main>;
  /* the frame the sale arrives on is already the hammer's (the effect above has not run yet) */
  const landing = hammer || (!!lot.sale && sawLive.current);
  if (lot.sale && !landing && view === 'payout') return <Payout lot={lot} v={v} />;
  if (lot.sale && !landing) return <Sold lot={lot} v={v} link={link} onLot={l => setLot(prev => keepContact(prev, l))} />;
  return <Live lot={lot} v={v} link={link} hammer={landing} onLot={l => setLot(prev => keepContact(prev, l))} />;
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
  /* The floor first covered while Live is on the glass (DOCTRINE §4 rule 14): the dealer's own win, once. The chime, the air and the
     tick land on the Floor row. A lot opened already covered is silent: nothing happened in front of anyone. */
  const floorRow = useRef<HTMLDivElement>(null);
  const floorNow = lot.car?.collateral?.floor ?? lot.start;
  const covered = useRef(lot.bids > 0 && lot.high >= floorNow);
  useEffect(() => {
    const now = lot.bids > 0 && lot.high >= floorNow;
    if (now && !covered.current && !hammer) feel.landedOn(floorRow.current);
    covered.current = now;
  }, [lot.bids, lot.high, floorNow]); // eslint-disable-line react-hooks/exhaustive-deps
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
        {laneWord(lot.car?.lane) && <p className="note" style={{ marginTop: 4, color: 'var(--faint)' }}>{laneWord(lot.car?.lane)}</p>}
        <div className="group">
          <div className="row" ref={floorRow}><span className="t"><b>Floor</b><small>{lot.bids ? (lot.high >= floor ? 'Covered' : 'Not yet reached') : 'Bidding opens here'}</small></span><span className="v num">{usd(floor)}</span></div>
          {lot.car?.collateral?.title.status === 'lender' && <div className="row"><span className="t"><b>Title at {lot.car.collateral.title.lienholder || 'the lender'}</b><small>{lot.car.collateral.title.releaseDays} days to release after payoff</small></span><span className="v num">{usd(lot.car.collateral.title.payoff ?? 0)}</span></div>}
        </div>
        {/* the ring is the close (simplicity-audit §4 row 12): no Closes row; a closed lot with no bids says nothing, the cloud under it is the next piece */}
        {lowering && <>
          <div className="money" style={{ marginTop: 28 }}><input className="input num" inputMode="numeric" autoFocus value={grouped(newFloor)} onChange={e => setNewFloor(digits(e.target.value))} placeholder={n(floor)} /></div>
        </>}
      </section>
      {asking && <ActionSheet line={<>End it now at <b className="num">{usd(lot.high)}</b>. The high bidder has it.</>} verb="Sell It Now" onAct={sell} onClose={() => setAsking(false)} />}
      {!hammer && <div className="dock"><div className="in">
        {closed ? <button className="btn primary block" onClick={() => { feel.next(); goAgain(link?.vehicleId); }}>Let it go</button>
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

/* The plates verb in the title row: a .textlink laid into the row's value column, touching the date (no margin, no pad). */
const VERB: CSSProperties = { display: 'inline-block', margin: 0, padding: '4px 0 0' };
const FAINT: CSSProperties = { ...VERB, color: 'var(--faint)', fontWeight: 600, padding: '2px 0 0' };
/* The plates date, faint, stacked under its word (its right edge under the word's, clear of the dot): the value column stays one
   word wide, so the title line beside it keeps two lines on 393. */
const WHEN: CSSProperties = { display: 'block', marginTop: 2, paddingRight: DOT.width + DOT.marginLeft, color: 'var(--faint)', fontWeight: 600, lineHeight: 1.2 };

/** The hour-after page was seen through (the number tapped, or Not now): kept on this device for the lot. */
const CALLED = 'obavia.desk.auction.called:';
const wasCalled = (lot: string) => { try { return !!localStorage.getItem(CALLED + lot); } catch { return false; } };
const markCalled = (lot: string) => { try { localStorage.setItem(CALLED + lot, '1'); } catch { /* private mode */ } };
/** The Filed mark, computed once per lot and filed 130-U as Sold opens (finding C, October 13: the render ran on the tap, 200 s on
    the glass with the word still lit). The tap awaits whatever is already done. Keyed on the sale so a 130-U filed later re-renders. */
const MARKS = new Map<string, Promise<FiledMark['form130U'] | undefined>>();

function Sold({ lot, v, link, onLot }: { lot: Lot; v?: Vehicle; link?: LotLink; onLot: (l: Lot) => void }) {
  const s = lot.sale!;
  const { dealer, sales } = useStore();
  const [called, setCalled] = useState(() => wasCalled(lot.id));
  const [filing, setFiling] = useState(false);
  const [starting, setStarting] = useState(false);
  const keyObj = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState({ titleTo: link?.titleTo, taxSent: link?.taxSent });
  const [mode, setMode] = useState<'sale' | 'vin' | 'void' | 'kickback'>('sale');
  const [vin, setVin] = useState('');
  const [note, setNote] = useState('');
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
  /* the pass is caught: the six fill in where the camera was, the boxes breathe once, the air and the tick */
  const sixBoxes = useRef<HTMLDivElement>(null);
  useEffect(() => { if (caught) feel.landedOn(sixBoxes.current, false); }, [caught]);
  const name = v ? carName(v) : lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id;
  const state = s.startedAt ? 'started' : s.voidedAt ? 'voided' : s.forfeitedAt ? 'forfeited' : s.paidAt ? 'paid' : 'owed';
  const who = s.contact?.name?.trim() || 'Buyer';
  const phone = s.contact?.phone ?? null;
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
  /* CP9: the deadline in the push's words. The Worker pushes "Pay by <payBy(deadlineAt)>" (worker/src/auction.ts); the Pay by row says the same. */
  /* CF9's setter half: the winner's name and number for the one call within the hour; "Buyer" when the Worker has no name. */
  const fees = lot.car?.dealer?.fees ?? dealer.fees;
  /* The plates (worker README "The plates (sale.plates)"): once the car has started, the day-21 row carries one verb at a
     time from the Worker's own order (Filed, Approved, Mailed; Filed again after a kickback) and, while filed, the faint
     word Kickback. Each tap posts the word; the word on the glass after is sale.plates.state from the lot that comes
     back, with its date, never the tap's. A refusal (409 not_started, plates_order) is said in four words. */
  const plates = s.plates;
  const verb = state === 'started' ? platesVerb(plates?.state) : null;
  const platesWord = useRef<HTMLSpanElement>(null), platesSeen = useRef(plates?.state);
  useEffect(() => { if (platesSeen.current !== plates?.state && platesWord.current) pulse(platesWord.current); platesSeen.current = plates?.state; }, [plates?.state]);
  /* Filed carries the mark of the exact 130-U that went to the county (W3-F: official.ts filed130U, the stable bytes' sha256, the
     business date, the agent), from this car's Desk sale whose 130-U is filed; nothing when the 130-U is still a draft or the
     paperwork was never opened here. The Worker ignores the field today (README); it rides so a follow-up reads it. */
  const filedSales = v ? sales.filter(x => x.vehicle.id === v.id && x.documents.form130U?.state === 'filed').sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const markKey = `${lot.id}:${filedSales.map(x => x.id).join(',')}`;
  const filedMarkFor = () => {
    let p = MARKS.get(markKey);
    if (!p) {
      p = (async () => { for (const x of filedSales) { const f = await filed130U(x, dealer).catch(() => null); if (f) return f.mark.form130U; } return undefined; })();
      MARKS.set(markKey, p);
    }
    return p;
  };
  /* the render runs off the tap: as Sold opens on a started sale whose next word is Filed, the mark is computed in the background */
  useEffect(() => { if (state === 'started' && verb === 'filed' && filedSales.length) void filedMarkFor(); }, [markKey, state, verb]); // eslint-disable-line react-hooks/exhaustive-deps
  const file = async (next: PlatesState, words?: string) => {
    feel.next(); setBusy(true); setErr(null); setFiling(next === 'filed');
    const r = await markPlates(lot.id, next, words, next === 'filed' ? await filedMarkFor() : undefined); setBusy(false); setFiling(false);
    if (r.ok) { onLot(r.value); if (mode !== 'sale') { setMode('sale'); setNote(''); } } else setErr(said(r.reason));
  };
  /* while the Worker has the Filed tap, the word breathes (motion.ts breathe) and takes no second tap */
  const filingWord = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (filing) return breathe(filingWord.current); }, [filing]);
  /* the $250 arriving (DOCTRINE §4 rule 14): the coin lands in its row with the chime the frame payout.state turns sent or paid */
  const [coinAt, setCoinAt] = useState(0);
  const coinRow = useRef<HTMLAnchorElement>(null);
  const payoutSeen = useRef(s.payout?.state);
  useEffect(() => {
    const now = s.payout?.state, was = payoutSeen.current; payoutSeen.current = now;
    if ((now === 'sent' || now === 'paid') && was !== 'sent' && was !== 'paid' && was !== undefined) { setCoinAt(n => n + 1); feel.landedOn(coinRow.current); }
  }, [s.payout?.state]);
  /* the hour after the hammer (simplicity-audit §4 row 1): the buyer's name, the number as the one tappable, the ring counting the hour */
  const hourLeft = s.wonAt + 3_600_000 - Date.now();
  const hourPage = mode === 'sale' && state === 'owed' && !!phone && !called && hourLeft > 0;
  const platesLine = plates ? PLATES_WORDS[plates.state] : titleW.state === 'done' ? 'Done' : shortDay(titleW.due);
  const offer = offerState(s.offer);
  const titleStep = laneTitleStep(s.contact?.state);
  const platesWhen = plates ? monthDay(today(dealer.timeZone, new Date(plates.at))) : null;
  const platesTone = plates?.state === 'mailed' ? 'good' : tone(titleW);
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/auction" label="Lane" /></div>
      {hourPage && <section className="enter" key="hour">
        <Ring className="ring big" p={Math.round((1 - hourLeft / 3_600_000) * 100)}><span className="num" style={{ ...FACE, fontSize: 17 }}>{Math.ceil(hourLeft / 60_000)}m</span></Ring>
        <Moment name="hammer" h={96} delay={0.3} style={{ display: 'block', margin: '0 auto 8px' }} />
        <h1 className="q">{who}<em>.</em></h1>
        <p className="note">{name}</p>
      </section>}
      {!hourPage && <section className="enter" key={state + mode}>
        {state === 'owed' && <Ring className="ring big" p={Math.round((1 - Math.max(0, left) / total) * 100)}><span className="num" style={{ ...FACE, fontSize: 17 }}>{h(left)}</span></Ring>}
        {mode === 'vin' && !cam && <div ref={keyObj} style={{ display: 'block', margin: '0 auto 8px', width: 'fit-content' }}><Obj name="key" h={72} /></div>}
        <h1 className="q num">{usd(s.hammer)}</h1>
        <p className="note">{name}{state === 'voided' ? ' · Voided' : state === 'forfeited' ? ' · The buyer walked.' : ''}</p>
        {laneWord(lot.car?.lane) && <p className="note" style={{ marginTop: 4, color: 'var(--faint)' }}>{laneWord(lot.car?.lane)}</p>}
        {mode === 'sale' && <div className="group">
          <div className="row"><span className="t"><b>Won</b></span><span className="v">{new Date(s.wonAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
          {state !== 'started' && state !== 'forfeited' && <div className="row"><span className="t"><b>Pay by</b></span><V obj="clock">{payBy(s.deadlineAt)}</V></div>}
          {state === 'owed' && <div className="row"><span className="t"><b>Collect</b></span><span className="v num">{usd(collect(s.hammer, fees))}</span></div>}
          {/* the deposit row is the way to the payout page: the same coin and $250 there, one row per piece of the money; the coin plays once as the $250 arrives */}
          <a ref={coinRow} className="row" href={`#/auction/${lot.id}/payout`} onClick={feel.next} style={{ textDecoration: 'none', color: 'inherit' }}><span className="t"><b>{s.payout || s.deposit === 'applied' || s.deposit === 'to_dealer' ? depositWords(s) : 'Deposit'}</b></span><span className="v num" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Moment name="coin" h={36} play={coinAt} />{usd(DEPOSIT_USD)}</span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></a>
          {/* the second chance (decisions §2 row 9): the under-bidder's twelve hours, the clock touching what is left, beside Let It Go Again in the dock */}
          {state === 'forfeited' && offer && <div className="row"><span className="t"><b>{OFFER_WORDS[offer]}</b><small>{offer === 'open' ? 'The next bidder, at their number' : offer === 'expired' ? 'Nobody took it' : 'A new sale is on this lot'}</small></span>{offer === 'open' ? <V obj="clock">{offerLeft(s.offer!)}</V> : <span className="v num">{usd(s.offer!.amount)}</span>}</div>}
          {state === 'forfeited' && offer === 'open' && <div className="row"><span className="t"><b>Their number</b></span><span className="v num">{usd(s.offer!.amount)}</span></div>}
          {link && <div className="row"><span className="t"><b>Floor</b></span><span className="v num">{usd(link.floor)}</span></div>}
          {/* the Buyer Acknowledgment (decisions §9 D8) or the paper packet (D9) at pickup: W3-F's words (filed.ts laneTitleStep), the title touching them.
              On the glass from Paid until the 130-U is filed; after that the day-21 row below carries the county's clock. */}
          {live && (state === 'paid' || state === 'started') && !plates && <div className="row"><span className="t"><b>{titleStep.title}</b>{titleStep.lines.map(l => <small key={l}>{l}</small>)}</span><Obj name="title" h={36} /></div>}
          {live && <div className="row" style={plates?.state === 'kickback' && plates.note ? { flexWrap: 'wrap', rowGap: 2 } : undefined}>
            <span className="t"><b>Title to the buyer before day 21.</b></span>
            <V obj="title"><span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span ref={platesWord} style={{ whiteSpace: 'nowrap' }}>{platesLine} <i className={`dot ${platesTone}`} style={DOT} aria-label={plates ? PLATES_WORDS[plates.state] : titleW.state} /></span>
              {platesWhen && <span style={WHEN}>{platesWhen}</span>}
              {verb && <button ref={filingWord} className="textlink" style={VERB} disabled={busy} aria-disabled={filing || undefined} onClick={() => file(verb)}>{filing ? 'Filing' : PLATES_WORDS[verb]}</button>}
              {verb && platesKickback(plates?.state) && <button className="textlink" style={FAINT} disabled={busy} onClick={() => { feel.tap(); setNote(''); setMode('kickback'); }}>Kickback</button>}
            </span></V>
            {/* the county's words sit on the row they explain, a full line under it, so the title line beside the value keeps its width on 393 */}
            {plates?.state === 'kickback' && plates.note && <small style={{ flexBasis: '100%', marginTop: 0 }}>{plates.note}</small>}
          </div>}
          {live && <div className="row"><span className="t"><b>Tax to the county.</b></span><span className="v" style={{ whiteSpace: 'nowrap' }}>{taxW.state === 'done' ? 'Done' : shortDay(taxW.due)} <i className={`dot ${tone(taxW)}`} style={DOT} aria-label={taxW.state} /></span></div>}
          {/* deviation 6: Marketplace has no API to retract a listing (reach.ts), so the sold car's listing is ended by the dealer, on their own listing, from here */}
          {live && lot.car?.listingUrl && <a className="row" href={lot.car.listingUrl} target="_blank" rel="noreferrer" onClick={feel.tap} style={{ textDecoration: 'none', color: 'inherit' }}><span className="t"><b>End your Marketplace listing</b><small>Sold here, so it comes down</small></span><span className="go"><Ic n="link" s={20} w={2.2} /></span></a>}
        </div>}
        {mode === 'vin' && cam && <div className="scan"><video ref={video} muted playsInline autoPlay aria-label="The buyer’s pass, through the camera" /><i aria-hidden="true" /></div>}
        {mode === 'vin' && !cam && <div ref={sixBoxes} className="code" onClick={() => six.current?.focus()}>
          {/* six boxes in the shape the buyer's phone showed under its code (auction/src/pass.ts); the key above them is the pass's object */}
          {Array.from({ length: 6 }, (_, k) => <span key={k} className={k === vin.length ? 'cur' : ''}>{vin[k] ?? ''}</span>)}
          <input ref={six} autoFocus={!caught} value={vin} onChange={e => { feel.key(); setCaught(false); setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/I/g, '1').replace(/[OQ]/g, '0').slice(0, 6)); /* a VIN has no I, O or Q: the Bodoni 1 and 0 typed as letters are the digits */ }} autoCapitalize="characters" autoComplete="off" aria-label="The six under the buyer’s code" />
        </div>}
        {mode === 'void' && <>
          <p className="note" style={{ marginTop: 28 }}>Ending a sale you cannot deliver returns the buyer’s deposit in full and counts against your lane standing. A second one closes the lane to you.</p>
          <div className="choices">{WHY.map(w => <Choice key={w} label={w} disabled={busy} onPick={() => setWhy(w)} />)}</div>
        </>}
        {mode === 'kickback' && <>
          <p className="note" style={{ marginTop: 28 }}>The county’s words.</p>
          <label className="field"><textarea className="input" autoFocus rows={3} maxLength={240} value={note} onChange={e => setNote(e.target.value.slice(0, 240))} placeholder="What came back with the 130-U" aria-label="The county’s words" style={{ height: 'auto', padding: '16px 18px', lineHeight: 1.4, resize: 'none' }} /></label>
        </>}
        {err && <p className="note">{err}</p>}
      </section>}
      {why && <ActionSheet line={<>The buyer’s <b className="num">{usd(250)}</b> deposit goes back in full. This counts against your lane standing.</>} verb="End The Sale" onAct={() => act(() => voidSale(lot.id, why))} onClose={() => setWhy(null)} />}
      <div className="dock"><div className="in">
        {hourPage && <a className="btn primary block num" href={`tel:${phone}`} onClick={() => { feel.next(); markCalled(lot.id); setCalled(true); }} style={{ letterSpacing: '.06em' }}>{dial(phone!)}</a>}
        {hourPage && <button className="textlink" onClick={() => { feel.tap(); markCalled(lot.id); setCalled(true); }}>Not now</button>}
        {!hourPage && mode === 'sale' && state === 'owed' && <button className="btn primary block" disabled={busy} onClick={() => act(() => markPaid(lot.id))}>Paid</button>}
        {mode === 'sale' && state === 'paid' && <button className="btn primary block" onClick={() => { feel.next(); setVin(''); setCaught(false); setCam(scanner); setMode('vin'); }}>{scanner ? 'Scan The Pass' : 'Type The Pass'}</button>}
        {/* the Desk's sale opens from the lane's signed papers (sign.ts openLaneSale: GET /sales/:lot/papers, the buyer's name under the signature).
            Nothing read: the stamp says so and nothing opens; a second tap asks the lane again. Never a blank buyer. */}
        {mode === 'sale' && state === 'started' && v && <button className="btn primary block" disabled={busy} onClick={async () => { feel.next(); setBusy(true); setErr(null); const o = await openLaneSale(lot.id); setBusy(false); if (!o) { setErr(said('buyer not read')); return; } feel.done(); const id = startSale(v, laneBuyer(o), 'en', v.mileage ?? 0, v.titleStatus); go(`/sale/${id}/guide`); }}>Open The Paperwork</button>}
        {mode === 'sale' && (state === 'forfeited' || state === 'voided') && <button className="btn primary block" onClick={() => { feel.next(); goAgain(link?.vehicleId); }}>Let it go</button>}
        {/* the engine started: the key turns as the chime lands (DOCTRINE §4 rule 14), then the page settles into Started */}
        {mode === 'vin' && <button className="btn primary block" disabled={busy || starting || vin.length < 6} onClick={async () => { setBusy(true); setErr(null); const r = await pickup(lot.id, vin); setBusy(false); if (!r.ok) { setErr(said(r.reason)); return; } setStarting(true); feel.done(); turnKey(keyObj.current); setTimeout(() => { setStarting(false); onLot(r.value); setMode('sale'); }, 620); }}>Started</button>}
        {mode === 'kickback' && <button className="btn primary block" disabled={busy || !note.trim()} onClick={() => file('kickback', note)}>Kickback</button>}
        {!hourPage && mode === 'sale' && (state === 'owed' || state === 'paid') && <button className="textlink" onClick={() => { feel.tap(); setMode('void'); }}>Can’t deliver</button>}
        {mode === 'sale' && state === 'started' && titleW.state !== 'done' && <button className="textlink" onClick={() => mark('titleTo')}>Title done</button>}
        {mode === 'sale' && state === 'started' && titleW.state === 'done' && taxW.state !== 'done' && <button className="textlink" onClick={() => mark('taxSent')}>Tax sent</button>}
        {mode === 'vin' && cam && <button className="textlink" onClick={() => { feel.tap(); setCam(false); }}>Type The Pass</button>}
        {mode !== 'sale' && <button className="textlink" onClick={() => { feel.tap(); setCam(false); setMode('sale'); }}>Back</button>}
      </div></div>
    </main>
  );
}

/* ---------- /auction/:lot/payout : the dealer's money on this sale, one row per piece (gap table W3-C; phases.md Phase 3 Dealers) ----------
   A justification surface (after the hammer, lego.md §8 CP1): the state word at the top, then rows whose numbers share a face and
   a baseline so the eye adds them (lego.md §4.2), each with its object touching it. The $250 is the only money Obavia holds
   (decisions §9 D5): its state is the sale's payout, the coin beside it. The balance is W3-A's invoice (GET /invoices/:lot), the
   clock beside it while the buyer's deadline runs. The payoff and the net are the dealer's own money, split as W3-A writes it
   (invoice.ts splitFor), both owed until the owner's line for deviation 5 names how a lender is paid: so they say "At the lot",
   never a date. There is nothing to do here, so there is no button; the one exception is a dealer owed the $250 with no Whop
   account, whose one action is Connect Whop. */
const PAYOUT_NOTE: Record<ReturnType<typeof payoutPageState>, string> = { pending: 'Until the engine starts.', owed: 'Until Whop sends it.', cleared: 'Whop sent it.' };
function Payout({ lot, v }: { lot: Lot; v?: Vehicle }) {
  const s = lot.sale!;
  const { dealer } = useStore();
  const [inv, setInv] = useState<Invoice | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    getInvoices(lot.id).then(r => { if (on) setInv(r.ok ? r.value.balance : null); });
    getMe().then(r => { if (on) setMe(r.ok ? r.value : null); });
    return () => { on = false; };
  }, [lot.id]);
  const name = v ? carName(v) : lot.car ? `${lot.car.year} ${lot.car.make} ${lot.car.model}` : lot.id;
  const state = payoutPageState(s);
  const unwound = !!s.voidedAt || !!s.forfeitedAt;
  const fees = lot.car?.dealer?.fees ?? dealer.fees;
  const balance = collect(s.hammer, fees);
  const split = payoutSplit(s.hammer, lot.car?.collateral);
  const paidWords = s.payout?.state === 'paid' ? `Paid by ${s.payout.method ?? 'hand'}` : s.payout?.state === 'sent' ? 'Sent by Whop' : null;
  const when = (t?: number) => (t ? new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : null);
  /* the balance row's small line: the invoice's state once read; before the lane answers, the deadline the buyer was pushed (CP9) */
  const settled = !!s.paidAt || inv?.state === 'paid' || inv?.state === 'paid_at_lot';
  const balanceLine = s.voidedAt ? 'Nothing due' : settled ? INVOICE_WORDS[inv?.state === 'paid' ? 'paid' : 'paid_at_lot'] : inv?.state === 'voided' ? INVOICE_WORDS.voided : `Pay by ${payBy(s.deadlineAt)}`;
  const balanceOpen = !unwound && !settled && inv?.state !== 'voided';
  const connect = state === 'owed' && me !== undefined && !me?.whopAccount;
  return (
    <main className="wrap center">
      <div className="top"><Back to={`#/auction/${lot.id}`} label="Sold" /></div>
      <section className="enter" key={state}>
        <Obj name="coin" h={72} style={{ display: 'block', margin: '0 auto 8px' }} />
        <h1 className="q">{PAYOUT_PAGE_WORDS[state]}<em>.</em></h1>
        <p className="note">{name} · {usd(s.hammer)}</p>
        <div className="group">
          <div className="row"><span className="t"><b>{s.voidedAt ? 'Deposit, released' : s.forfeitedAt ? 'The deposit, yours' : 'The deposit'}</b><small>{s.voidedAt ? 'Back to the buyer' : paidWords ? [paidWords, when(s.payout?.at)].filter(Boolean).join(' · ') : PAYOUT_NOTE[state]}</small></span><V obj="coin">{usd(DEPOSIT_USD)}</V></div>
          {!s.forfeitedAt && <div className="row"><span className="t"><b>The balance</b><small>{balanceLine}</small></span>{balanceOpen ? <V obj="clock">{usd(balance)}</V> : <span className="v num">{usd(s.voidedAt ? 0 : balance)}</span>}</div>}
          {!unwound && split.lender && <div className="row"><span className="t"><b>{split.lender.name} first</b><small>The payoff, at the lot</small></span><span className="v num">{usd(split.lender.amount)}</span></div>}
          {!unwound && <div className="row"><span className="t"><b>You net</b><small>At the lot, less the payoff</small></span><span className="v num">{usd(split.net)}</span></div>}
        </div>
        {/* Obavia moves the $250 only (decisions §9 D5); the rest is collected at the lot. Said once, under the rows, for the justifier (CP1). */}
        {!unwound && <p className="note" style={{ marginTop: 18 }}>Obavia moves the {usd(DEPOSIT_USD)}. The rest is yours at the lot.</p>}
      </section>
      {connect && <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/auction/settings/whop'); }}>Connect Whop</button></div></div>}
    </main>
  );
}
