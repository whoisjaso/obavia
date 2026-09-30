import { useMemo, useState } from 'react';
import { TX_COUNTY } from './data';
import { usd } from './lib/money';
import type { TitleStatus } from './lib/plan';
import { badge, nextOpenStep, signedCount, type Buyer, type Sale, type Vehicle } from './lib/sale';
import { checkDigitOk, decodeVin, isValidVin } from './lib/vin';
import { addVehicle, startSale, useStore } from './store';
import { Back, CarArt, Chev, Choice, Ic, feel, go } from './ui';

const ago = (iso: string) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60e3); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

/* ---------- /  : open sales, one primary action ---------- */
export function Sales() {
  const { dealer, sales, example } = useStore();
  const open = sales.filter(s => s.status === 'in_progress');
  return (
    <main className="wrap">
      <div className="top">
        <span className="who"><span className="lgmini" style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: dealer.brand.accent, color: '#fff', font: '800 12px/1 var(--sans)', overflow: 'hidden' }}>{dealer.brand.logo ? <img src={dealer.brand.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} /> : dealer.brand.monogram}</span>{dealer.dba}</span>
        <a className="link" href="#/past" onClick={feel.tap}>Past Sales</a>
      </div>
      <h1 className="h1 enter">Handle A Sale</h1>
      {example && <span className="example">Example data</span>}
      <h2 className="h2">Open Sales</h2>
      <div className="group enter2">
        {open.length ? open.map(s => <SaleRow key={s.id} s={s} />) : <p className="empty">No open sales. Start one when a buyer is ready.</p>}
      </div>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/new'); }}><Ic n="plus" s={20} w={2.4} />Start A Sale</button></div></div>
    </main>
  );
}

function SaleRow({ s }: { s: Sale }) {
  const c = signedCount(s), nx = nextOpenStep(s), b = badge(s);
  return (
    <a className="row" href={`#/sale/${s.id}`} onClick={feel.tap}>
      <CarArt color={s.vehicle.color} body={s.vehicle.bodyStyle} w={64} />
      <span className="t"><b>{s.buyer.fullName}</b><small>{s.vehicle.year} {s.vehicle.make} {s.vehicle.model} · {nx?.question ?? 'Ready To Complete'}</small>{b && <span className="status warn" style={{ marginTop: 6 }}>{b}</span>}</span>
      <span className="v num">{c.owed ? `${c.signed} Of ${c.owed} Signed` : ago(s.createdAt)}</span><Chev />
    </a>
  );
}

export function Past() {
  const { sales } = useStore();
  const [q, setQ] = useState('');
  const done = sales.filter(s => s.status === 'completed' && `${s.buyer.fullName} ${s.vehicle.make} ${s.vehicle.model} ${s.vehicle.vin}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="wrap">
      <div className="top"><Back to="#/" /></div>
      <h1 className="h1">Past Sales</h1>
      <label className="field"><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search buyer, car or VIN" /></label>
      <div className="group">{done.length ? done.map(s => (
        <a key={s.id} className="row" href={`#/sale/${s.id}/packet`}><CarArt color={s.vehicle.color} body={s.vehicle.bodyStyle} w={56} />
          <span className="t"><b>{s.buyer.fullName}</b><small>{s.vehicle.year} {s.vehicle.make} {s.vehicle.model}</small></span>
          <span className="v">{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : ''}</span><Chev /></a>
      )) : <p className="empty">Completed sales land here.</p>}</div>
    </main>
  );
}

/* ---------- /new : Start A Sale. Read back before anything is written. ---------- */
const TITLES: { v: TitleStatus; label: string; gloss?: string }[] = [
  { v: 'clean', label: 'Clean' }, { v: 'rebuilt_salvage', label: 'Rebuilt Salvage' }, { v: 'salvage_unrebuilt', label: 'Salvage', gloss: 'Not rebuilt' }, { v: 'unknown', label: 'Other' },
];

export function Start() {
  const { lot, sales } = useStore();
  const busy = new Set(sales.filter(s => s.status === 'in_progress').map(s => s.vehicle.id));
  const [i, setI] = useState(0);
  const [car, setCar] = useState<Vehicle | null>(null);
  const [q, setQ] = useState('');
  const [miles, setMiles] = useState('');
  const [title, setTitle] = useState<TitleStatus | null>(null);
  const [lang, setLang] = useState<'en' | 'es' | null>(null);
  const [buyer, setBuyer] = useState<Buyer>({ fullName: '', phone: '', email: '', address: '', city: '', state: 'TX', zip: '', county: '', idType: 'dl', idNumber: '' });
  const [vin, setVin] = useState(''); const [decoding, setDecoding] = useState(false);
  const next = () => { feel.next(); setI(x => x + 1); };
  const found = useMemo(() => lot.filter(v => !busy.has(v.id) && `${v.stock} ${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase().includes(q.toLowerCase())), [lot, q, sales]);
  const county = TX_COUNTY[buyer.city.trim().toLowerCase()] ?? '';
  const b = { ...buyer, county: buyer.county || county };
  const labels = ['The Car', 'Odometer', 'Title', 'Language', 'Buyer', 'Read Back'];

  async function decode() {
    if (!isValidVin(vin)) return;
    setDecoding(true);
    const d = await decodeVin(vin.trim().toUpperCase());
    setDecoding(false);
    const v: Vehicle = { id: 'v' + Date.now().toString(36), stock: 'New', vin: vin.trim().toUpperCase(), year: d?.year ?? new Date().getFullYear(), make: d?.make ?? 'Unknown', model: d?.model ?? '', bodyStyle: d?.bodyStyle ?? 'Sedan', price: 0, mileage: null, emptyWeight: d?.curbWeight ?? null, color: '#9AA6BF', titleStatus: 'unknown' };
    addVehicle(v); setCar(v); setTitle(v.titleStatus); next();
  }

  const canNext = [!!car, !!miles.trim(), !!title, !!lang, !!(b.fullName.trim() && b.phone.trim() && b.address.trim() && b.city.trim() && b.idNumber.trim() && b.county), true][i];

  return (
    <main className="wrap">
      <div className="top">{i ? <button className="back" onClick={() => { feel.tap(); setI(i - 1); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to="#/" label="Sales" />}<span className="progress">{labels[i]}</span></div>
      <div className="bar"><i style={{ width: `${((i + 1) / 6) * 100}%` }} /></div>

      {i === 0 && <section className="enter" key="0">
        <h1 className="q">Which Car?</h1>
        <label className="field"><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Stock, year, make, model or VIN" /></label>
        <div className="lot">{found.map(v => (
          <button key={v.id} className="car" aria-pressed={car?.id === v.id} onClick={() => { feel.next(); setCar(v); setTitle(v.titleStatus); setMiles(v.mileage ? String(v.mileage) : ''); setI(1); }}>
            <span className="pic"><CarArt color={v.color} body={v.bodyStyle} w={130} /></span>
            <b>{v.year} {v.make} {v.model}</b><small>Stock {v.stock}</small><span className="price">{v.price ? usd(v.price).replace('.00', '') : 'No price yet'}</span>
          </button>))}
        </div>
        <h2 className="h2">Not On The Lot?</h2>
        <label className="field"><input className="input num" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} placeholder="Type the VIN" maxLength={17} /></label>
        {vin.length === 17 && isValidVin(vin) && !checkDigitOk(vin) && <p className="note" style={{ color: 'var(--warn)', font: '600 14px/1.4 var(--sans)', marginTop: 8 }}>The check digit doesn’t match. Double-check the VIN.</p>}
        <button className="btn quiet block" style={{ marginTop: 12 }} disabled={!isValidVin(vin) || decoding} onClick={decode}>{decoding ? 'Reading The VIN…' : 'Look It Up'}</button>
      </section>}

      {i === 1 && car && <section className="enter" key="1">
        <h1 className="q">What Does The Odometer Say?</h1>
        <div className="money plain"><input className="input" style={{ paddingLeft: 22 }} inputMode="numeric" autoFocus value={miles} onChange={e => setMiles(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
        <p className="note" style={{ marginTop: 10 }}>Every document reads this one number.</p>
      </section>}

      {i === 2 && <section className="enter" key="2">
        <h1 className="q">What’s The Title?</h1>
        <div className="choices">{TITLES.map(t => <Choice key={t.v} label={t.label} gloss={t.gloss} on={title === t.v} onPick={() => { setTitle(t.v); setI(3); }} />)}</div>
      </section>}

      {i === 3 && <section className="enter" key="3">
        <h1 className="q">What Language Is The Sale In?</h1>
        <div className="choices"><Choice label="English" on={lang === 'en'} onPick={() => { setLang('en'); setI(4); }} /><Choice label="Español" gloss="Spanish" on={lang === 'es'} onPick={() => { setLang('es'); setI(4); }} /></div>
      </section>}

      {i === 4 && <section className="enter" key="4">
        <h1 className="q">Who Is Buying The Car?</h1>
        <label className="field"><input className="input" autoFocus value={buyer.fullName} onChange={e => setBuyer({ ...buyer, fullName: e.target.value })} placeholder="Full name" autoComplete="name" /></label>
        <label className="field"><input className="input" value={buyer.phone} onChange={e => setBuyer({ ...buyer, phone: e.target.value })} placeholder="Mobile phone" inputMode="tel" autoComplete="tel" /></label>
        <label className="field"><input className="input" value={buyer.address} onChange={e => setBuyer({ ...buyer, address: e.target.value })} placeholder="Street address" autoComplete="street-address" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .7fr 1fr', gap: 10 }}>
          <label className="field"><input className="input" value={buyer.city} onChange={e => setBuyer({ ...buyer, city: e.target.value })} placeholder="City" /></label>
          <label className="field"><input className="input" value={buyer.state} onChange={e => setBuyer({ ...buyer, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="State" /></label>
          <label className="field"><input className="input num" value={buyer.zip} onChange={e => setBuyer({ ...buyer, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="ZIP" inputMode="numeric" /></label>
        </div>
        {buyer.city.trim() && !county && <label className="field"><input className="input" value={buyer.county} onChange={e => setBuyer({ ...buyer, county: e.target.value })} placeholder="County" /></label>}
        <div className="choices grid2" style={{ marginTop: 22 }}>
          {([['dl', 'Driver Licence'], ['stateId', 'State ID'], ['passport', 'Passport'], ['military', 'Military ID']] as const).map(([v, l]) => (
            <button key={v} className="choice" style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center' }} aria-pressed={buyer.idType === v} onClick={() => { feel.tap(); setBuyer({ ...buyer, idType: v }); }}><span className="t"><b style={{ fontSize: 16 }}>{l}</b></span><span className="tick">{buyer.idType === v && <Ic n="check" s={15} w={3} />}</span></button>
          ))}
        </div>
        <label className="field"><input className="input num" value={buyer.idNumber} onChange={e => setBuyer({ ...buyer, idNumber: e.target.value })} placeholder="ID number" /></label>
      </section>}

      {i === 5 && car && <section className="enter" key="5">
        <h1 className="q">Look Right?</h1>
        <div className="hero"><span className="pic"><CarArt color={car.color} body={car.bodyStyle} w={110} /></span><span><b>{car.year} {car.make} {car.model}</b><small>{Number(miles).toLocaleString()} miles · {TITLES.find(t => t.v === title)?.label} title</small></span></div>
        <div className="group">
          {[['Buyer', b.fullName], ['Phone', b.phone], ['Address', `${b.address}, ${b.city}, ${b.state} ${b.zip}`], ['County', b.county], ['ID', b.idNumber], ['Language', lang === 'es' ? 'Español' : 'English']].map(([k, v]) => (
            <div key={k} className="row"><span className="t"><small>{k}</small><b>{v}</b></span></div>))}
        </div>
      </section>}

      <div className="dock"><div className="in">
        {i === 5
          ? <button className="btn primary block" onClick={() => { feel.done(); const id = startSale(car!, b, lang!, Number(miles), title!); go(`/sale/${id}/guide`); }}>Start</button>
          : i !== 2 && i !== 3 && i !== 0 && <button className="btn primary block" disabled={!canNext} onClick={next}>Continue</button>}
      </div></div>
    </main>
  );
}

