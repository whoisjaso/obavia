import { useMemo, useState } from 'react';
import { TX_COUNTY } from './data';
import { usd } from './lib/money';
import type { TitleStatus } from './lib/plan';
import { signedCount, type Buyer, type Sale, type Vehicle } from './lib/sale';
import { checkDigitOk, decodeVin, isValidVin } from './lib/vin';
import { addVehicle, me, startSale, useStore } from './store';
import { Back, CarArt, Chev, Choice, Ic, feel, go, transition } from './ui';


/* ---------- /  : open sales, one primary action ---------- */
export function Sales() {
  const { dealer, sales, example } = useStore();
  const who = me();
  const open = sales.filter(s => s.status === 'in_progress');
  return (
    <main className="wrap center">
      <div className="top">
        <a className="who" href="#/people" onClick={feel.tap} aria-label="People at the desk"><span className="lgmini" style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: dealer.brand.accent, color: '#fff', font: '800 12px/1 var(--sans)', overflow: 'hidden' }}>{dealer.brand.logo ? <img src={dealer.brand.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} /> : dealer.brand.monogram}</span>{who && <span className="whoname">{who.name.split(' ')[0]}</span>}</a>
        <span style={{ display: 'flex', gap: 18 }}><a className="link" href="#/payments" onClick={feel.tap}>Payments</a><a className="link" href="#/reach" onClick={feel.tap}>Reach</a><a className="link" href="#/past" onClick={feel.tap}>Past</a></span>
      </div>
      <section className="enter" key="home">
        <h1 className="q">{open.length ? <>Pick up <em>a sale.</em></> : <>Ready when <em>they are.</em></>}</h1>
        <div className="choices">{open.map(s => <SaleRow key={s.id} s={s} />)}</div>
        {example && <span className="example">Example data</span>}
      </section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/new'); }}>Start A Sale</button></div></div>
    </main>
  );
}

function SaleRow({ s }: { s: Sale }) {
  const c = signedCount(s);
  return (
    <a className="choice" href={`#/sale/${s.id}`} onClick={feel.next}>
      <span className="art car-art"><CarArt color={s.vehicle.color} body={s.vehicle.bodyStyle} w={44} /></span>
      <span className="t"><b>{s.buyer.fullName}</b><small>{s.vehicle.year} {s.vehicle.make} {s.vehicle.model}{c.owed ? ` · ${c.signed} of ${c.owed} signed` : ''}</small></span>
      <span className="go"><Ic n="chev" s={18} w={2.4} /></span>
    </a>
  );
}

export function Past() {
  const { sales } = useStore();
  const [q, setQ] = useState('');
  const done = sales.filter(s => s.status === 'completed' && `${s.buyer.fullName} ${s.vehicle.make} ${s.vehicle.model} ${s.vehicle.vin}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <h1 className="q">Past Sales.</h1>
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
  { v: 'clean', label: 'Clean' }, { v: 'rebuilt_salvage', label: 'Rebuilt Salvage' }, { v: 'salvage_unrebuilt', label: 'Salvage' }, { v: 'unknown', label: 'Other' },
];

type Page = 'car' | 'odo' | 'title' | 'lang' | 'name' | 'phone' | 'street' | 'city' | 'zip' | 'county' | 'idType' | 'idNumber' | 'review';
const ID_TYPES = [['dl', 'Driver Licence'], ['stateId', 'State ID'], ['passport', 'Passport'], ['military', 'Military ID']] as const;

export function Start() {
  const { lot, sales } = useStore();
  const busy = new Set(sales.filter(s => s.status === 'in_progress').map(s => s.vehicle.id));
  const [page, setPage] = useState<Page>('car');
  const [car, setCar] = useState<Vehicle | null>(null);
  const [q, setQ] = useState('');
  const [miles, setMiles] = useState('');
  const [title, setTitle] = useState<TitleStatus | null>(null);
  const [lang, setLang] = useState<'en' | 'es' | null>(null);
  const [buyer, setBuyer] = useState<Buyer>({ fullName: '', phone: '', email: '', address: '', city: '', state: 'TX', zip: '', county: '', idType: 'dl', idNumber: '' });
  const [vin, setVin] = useState(''); const [decoding, setDecoding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [vinOpen, setVinOpen] = useState(false);
  const found = useMemo(() => lot.filter(v => !busy.has(v.id) && `${v.stock} ${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase().includes(q.toLowerCase())), [lot, q, sales]);
  const county = TX_COUNTY[buyer.city.trim().toLowerCase()] ?? '';
  const b = { ...buyer, county: buyer.county || county };
  // The county is asked only when the city doesn't give it.
  const pages: Page[] = ['car', 'odo', 'title', 'lang', 'name', 'phone', 'street', 'city', 'zip', ...(county ? [] : ['county' as const]), 'idType', 'idNumber', 'review'];
  const at = Math.max(0, pages.indexOf(page));
  const to = (p: Page, d: 'fwd' | 'back' = 'fwd') => transition(() => { setPage(p); scrollTo(0, 0); }, d);
  // After an edit from the read-back, the answer returns there.
  const next = () => { feel.next(); if (editing) { setEditing(false); to('review'); } else to(pages[at + 1]); };
  const set = (k: keyof Buyer) => (e: React.ChangeEvent<HTMLInputElement>) => setBuyer({ ...buyer, [k]: e.target.value });

  async function decode() {
    if (!isValidVin(vin)) return;
    setDecoding(true);
    const d = await decodeVin(vin.trim().toUpperCase());
    setDecoding(false);
    const v: Vehicle = { id: 'v' + Date.now().toString(36), stock: 'New', vin: vin.trim().toUpperCase(), year: d?.year ?? new Date().getFullYear(), make: d?.make ?? 'Unknown', model: d?.model ?? '', bodyStyle: d?.bodyStyle ?? 'Sedan', price: 0, mileage: null, emptyWeight: d?.curbWeight ?? null, color: '#9AA6BF', titleStatus: 'unknown' };
    addVehicle(v); setCar(v); setTitle(v.titleStatus); next();
  }

  const ok: Partial<Record<Page, boolean>> = {
    odo: !!miles.trim(), name: buyer.fullName.trim().split(/\s+/).length >= 2, phone: buyer.phone.replace(/\D/g, '').length >= 10,
    street: !!buyer.address.trim(), city: !!buyer.city.trim() && buyer.state.length === 2, zip: buyer.zip.length === 5, county: !!buyer.county.trim(), idNumber: !!buyer.idNumber.trim(),
  };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && ok[page]) next(); };
  const ask = (p: Page, question: string, input: React.ReactNode, note?: string) => page === p && (
    <section className="enter" key={p}>
      <h1 className="q">{question}</h1>
      {note && <p className="note">{note}</p>}
      {input}
    </section>
  );
  const first = b.fullName.trim().split(/\s+/)[0] || 'The Buyer';

  return (
    <main className="wrap center">
      <div className="top">{at ? <button className="back" onClick={() => { feel.tap(); setEditing(false); to(pages[at - 1], 'back'); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to="#/" label="Sales" />}</div>
      <div className="bar"><i style={{ width: `${((at + 1) / pages.length) * 100}%` }} /></div>

      {page === 'car' && <section className="enter" key="car">
        <h1 className="q">Which Car?</h1>
        <label className="field"><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Stock, year, make, model or VIN" /></label>
        <div className="lot">{found.map(v => (
          <button key={v.id} className="car" aria-pressed={car?.id === v.id} onClick={() => { feel.next(); setCar(v); setTitle(v.titleStatus); setMiles(v.mileage ? String(v.mileage) : ''); to('odo'); }}>
            <span className="pic"><CarArt color={v.color} body={v.bodyStyle} w={130} /></span>
            <b>{v.year} {v.make} {v.model}</b><small>Stock {v.stock}</small><span className="price">{v.price ? usd(v.price).replace('.00', '') : 'No price yet'}</span>
          </button>))}
        </div>
        {!vinOpen ? <button className="textlink" style={{ marginTop: 18 }} onClick={() => { feel.tap(); setVinOpen(true); }}>Not On The Lot?</button> : <>
        <label className="field"><input className="input num" autoFocus value={vin} onChange={e => setVin(e.target.value.toUpperCase())} placeholder="Type the VIN" maxLength={17} /></label>
        {vin.length === 17 && isValidVin(vin) && !checkDigitOk(vin) && <p className="note" style={{ color: 'var(--warn)', font: '600 14px/1.4 var(--sans)', marginTop: 8 }}>The check digit doesn’t match. Double-check the VIN.</p>}
        <button className="btn quiet block" style={{ marginTop: 12 }} disabled={!isValidVin(vin) || decoding} onClick={decode}>{decoding ? 'Reading The VIN…' : 'Look It Up'}</button></>}
      </section>}

      {ask('odo', 'What Does The Odometer Say?', <div className="money plain"><input className="input" style={{ paddingLeft: 22 }} inputMode="numeric" autoFocus value={miles} onKeyDown={enter} onChange={e => setMiles(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>)}

      {ask('title', 'What’s The Title?', <div className="choices">{TITLES.map(t => <Choice key={t.v} label={t.label} gloss={t.gloss} on={title === t.v} onPick={() => { setTitle(t.v); next(); }} />)}</div>)}

      {ask('lang', 'What Language Is The Sale In?', <div className="choices"><Choice label="English" on={lang === 'en'} onPick={() => { setLang('en'); next(); }} /><Choice label="Español" on={lang === 'es'} onPick={() => { setLang('es'); next(); }} /></div>)}

      {ask('name', 'Who Is Buying The Car?', <label className="field"><input className="input big" autoFocus value={buyer.fullName} onKeyDown={enter} onChange={set('fullName')} placeholder="Full name, as on the ID" autoComplete="name" /></label>)}

      {ask('phone', `What’s ${first}’s Number?`, <label className="field"><input className="input big num" autoFocus value={buyer.phone} onKeyDown={enter} onChange={set('phone')} placeholder="Mobile phone" inputMode="tel" autoComplete="tel" /></label>)}

      {ask('street', `Where Does ${first} Live?`, <label className="field"><input className="input big" autoFocus value={buyer.address} onKeyDown={enter} onChange={set('address')} placeholder="Street address" autoComplete="street-address" /></label>)}

      {ask('city', 'Which City?', <div className="pair">
        <label className="field"><input className="input big" autoFocus value={buyer.city} onKeyDown={enter} onChange={set('city')} placeholder="City" autoComplete="address-level2" /></label>
        <label className="field"><input className="input big" value={buyer.state} onKeyDown={enter} onChange={e => setBuyer({ ...buyer, state: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) })} placeholder="TX" aria-label="State" /></label>
      </div>)}

      {ask('zip', 'And The ZIP?', <label className="field"><input className="input big num" autoFocus value={buyer.zip} onKeyDown={enter} onChange={e => setBuyer({ ...buyer, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="ZIP" inputMode="numeric" autoComplete="postal-code" /></label>)}

      {ask('county', 'Which County?', <label className="field"><input className="input big" autoFocus value={buyer.county} onKeyDown={enter} onChange={set('county')} placeholder="County" /></label>)}

      {ask('idType', 'What ID Did They Show?', <div className="choices">{ID_TYPES.map(([v, l]) => <Choice key={v} label={l} on={buyer.idType === v} onPick={() => { setBuyer({ ...buyer, idType: v }); next(); }} />)}</div>)}

      {ask('idNumber', `The ${ID_TYPES.find(t => t[0] === buyer.idType)![1]} Number?`, <label className="field"><input className="input big num" autoFocus value={buyer.idNumber} onKeyDown={enter} onChange={e => setBuyer({ ...buyer, idNumber: e.target.value.toUpperCase() })} placeholder="As printed" autoCapitalize="characters" /></label>)}

      {page === 'review' && car && <section className="enter" key="review">
        <h1 className="q">Look Right?</h1>
        <button className="hero" style={{ width: '100%', textAlign: 'left' }} onClick={() => { feel.tap(); setEditing(true); to('odo', 'back'); }}><span className="pic"><CarArt color={car.color} body={car.bodyStyle} w={110} /></span><span><b>{car.year} {car.make} {car.model}</b><small>{Number(miles).toLocaleString()} miles · {TITLES.find(t => t.v === title)?.label} title</small></span></button>
        <div className="group">
          {([['Buyer', b.fullName, 'name'], ['Phone', b.phone, 'phone'], ['Address', `${b.address}, ${b.city}, ${b.state} ${b.zip}`, 'street'], ['County', b.county, county ? 'city' : 'county'], ['ID', `${ID_TYPES.find(t => t[0] === b.idType)![1]} · ${b.idNumber}`, 'idType'], ['Language', lang === 'es' ? 'Español' : 'English', 'lang']] as [string, string, Page][]).map(([k, v, p]) => (
            <button key={k} className="row" onClick={() => { feel.tap(); setEditing(true); to(p, 'back'); }}><span className="t"><small>{k}</small><b>{v}</b></span><Chev /></button>))}
        </div>
      </section>}

      <div className="dock"><div className="in">
        {page === 'review'
          ? <button className="btn primary block" onClick={() => { feel.done(); const id = startSale(car!, b, lang!, Number(miles), title!); go(`/sale/${id}/guide`); }}>Start The Sale</button>
          : page in ok && <button className="btn primary block" disabled={!ok[page]} onClick={next}>{editing ? 'Done' : 'Continue'}</button>}
      </div></div>
    </main>
  );
}
