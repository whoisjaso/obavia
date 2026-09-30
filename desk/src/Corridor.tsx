/* The corridor: one question per screen, the answer is the submit, back
   works, and a step that does not apply does not exist. Every screen reads
   done-ness from buildGuideSteps; nothing here stores "done". */
import { useState } from 'react';
import { LENDERS } from './data';
import { DOC_TITLE } from './lib/documents';
import { usd } from './lib/money';
import { applyPlanAnswer, PLAN_FREEZERS, type PlanQuestion, type SalePlan } from './lib/plan';
import { buildGuideSteps, ID_FIELDS, nextOpenStep, signedCount, type IdKey, type Sale } from './lib/sale';
import { saleReceipt } from './Sheet';
import { getSale, mergeStep, setLanguage, setVehicleTitle, useStore } from './store';
import { Back, CarArt, Chev, Choice, Ic, Receipt, backward, feel, go } from './ui';

export const stepRoute = (id: string, key: string) =>
  key.startsWith('document:') ? `/sale/${id}/paper/${key.slice(9)}` : key === 'packet' ? `/sale/${id}/packet` : `/sale/${id}/guide/${encodeURIComponent(key)}`;

/** After any answer: land on the first open step. */
export function advance(id: string) {
  const s = getSale(id)!; const n = nextOpenStep(s);
  go(n ? stepRoute(id, n.key) : `/sale/${id}/packet`);
}

const FUNDING = { cash: 'Cash', inHouse: 'Buy Here Pay Here', lender: 'Bank Financing' } as const;

export function answerOf(s: Sale, key: string): string {
  const st = s.step, p = st.salePlan ?? {};
  const yn = (b?: boolean | null) => (b === true ? 'Yes' : b === false ? 'No' : '');
  switch (key) {
    case 'language': return s.language === 'es' ? 'Español' : s.language === 'en' ? 'English' : '';
    case 'plan:salvage': return { rebuild: 'Rebuild The Title', towAway: 'Tow-Away', undecided: 'Not Decided' }[st.salvagePlan?.path ?? 'undecided'];
    case 'buyer': return s.buyer.fullName;
    case 'buyerId': return st.buyerId?.mailingConfirmed ? 'Confirmed' : st.buyerId?.image ? 'Card On File' : '';
    case 'funding': return st.funding?.type ? FUNDING[st.funding.type] : '';
    case 'lender': return st.funding?.lenderOther || LENDERS.find(l => l.id === st.funding?.lenderId)?.name || '';
    case 'paid': return st.money?.amount ? usd(Number(st.money.amount)) : '';
    case 'price': return st.money?.priceBasis === 'outTheDoor' ? 'Out The Door' : st.money?.priceBasis === 'vehicleOnly' ? 'Plus Tax And Fees' : '';
    case 'plan:registration': return p.registrationBy === 'dealer' ? 'Us' : p.registrationBy === 'buyer' ? 'The Buyer' : '';
    case 'plate': return st.plate || (st.plateAsked ? 'Not Yet' : '');
    case 'plan:title-signer': return p.titleSignedBy === 'buyer' ? 'The Buyer' : p.titleSignedBy === 'dealer' ? 'Us, For Them' : '';
    case 'plan:price-includes': return yn(p.priceIncludesRegistration);
    case 'plan:inspection': return p.inspectionBy ? { dealer: 'We Take It', buyer: 'They Take It', done: 'Already Done' }[p.inspectionBy] : '';
    case 'plan:insurance': return p.insuranceShown === true ? 'Yes, Shown' : p.insuranceShown === false ? 'No' : '';
    case 'title': return st.plate ?? '';
  }
  if (key.startsWith('document:')) { const d = s.documents[key.slice(9) as keyof typeof s.documents]; return d?.buyerSigned ? 'Signed' : d?.state === 'filed' ? 'Filed, Not Yet Signed' : ''; }
  return '';
}

/* ---------- /sale/:id : the sale as a state, every row a link back ---------- */
export function Desk({ id }: { id: string }) {
  useStore();
  const s = getSale(id); if (!s) return <main className="wrap"><Back to="#/" /><p className="empty">This sale is not here.</p></main>;
  const steps = buildGuideSteps(s), done = steps.filter(x => x.done).length, nx = nextOpenStep(s), c = signedCount(s);
  const groups = ['Buyer', 'Money', 'Plan', 'Documents', 'Title'] as const;
  return (
    <main className="wrap">
      <div className="top"><Back to="#/" label="Sales" /><span className="progress">{done} Of {steps.length}</span></div>
      <div className="hero enter">
        <span className="pic"><CarArt color={s.vehicle.color} body={s.vehicle.bodyStyle} w={110} /></span>
        <span style={{ flex: 1, minWidth: 0 }}><b>{s.buyer.fullName}</b><small>{s.vehicle.year} {s.vehicle.make} {s.vehicle.model}{c.owed ? ` · ${c.signed} Of ${c.owed} Signed` : ''}</small></span>
        <span className="ring" style={{ ['--p' as string]: Math.round((done / steps.length) * 100) }}><span className="num">{done}/{steps.length}</span></span>
      </div>
      {groups.map(g => { const rows = steps.filter(x => x.group === g); return rows.length ? (
        <section key={g}><h2 className="h2">{g}</h2><div className="group">{rows.map(x => (
          <a key={x.key} className="row" href={'#' + stepRoute(id, x.key)} onClick={feel.tap}>
            <span className="t"><b>{x.question}</b>{answerOf(s, x.key) && <small>{answerOf(s, x.key)}</small>}</span>
            <span className={'status ' + (x.done ? 'good' : x === nx ? 'warn' : '')}>{x.done ? 'Done' : x === nx ? 'Next' : 'Open'}</span><Chev />
          </a>))}</div></section>) : null; })}
      <div className="dock"><div className="in">
        {nx ? <button className="btn primary block" onClick={() => { feel.next(); go(stepRoute(id, nx.key)); }}>Continue</button>
          : <button className="btn primary block" onClick={() => { feel.next(); go(`/sale/${id}/packet`); }}>Open The Packet</button>}
      </div></div>
    </main>
  );
}

/* ---------- /sale/:id/guide : redirect to the first open step ---------- */
export function GuideRedirect({ id }: { id: string }) { setTimeout(() => advance(id)); return null; }

/* ---------- /sale/:id/guide/:key : one question ---------- */
export function Step({ id, stepKey }: { id: string; stepKey: string }) {
  const { dealer } = useStore();
  const s = getSale(id);
  if (!s) return <main className="wrap"><Back to="#/" /><p className="empty">This sale is not here.</p></main>;
  const steps = buildGuideSteps(s), idx = steps.findIndex(x => x.key === stepKey), step = steps[idx];
  if (!step) { setTimeout(() => advance(id)); return null; }
  const plan = s.step.salePlan ?? {};
  const frozenBy = PLAN_FREEZERS.find(d => s.documents[d]?.state === 'filed');
  const planPick = <Q extends PlanQuestion>(q: Q, v: SalePlan[Q]) => { mergeStep(id, 'salePlan', applyPlanAnswer(plan, q, v)); advance(id); };
  const r = saleReceipt(s, dealer);

  const body = (() => {
    if (stepKey.startsWith('plan:') && stepKey !== 'plan:salvage' && frozenBy) return <p className="note">Locked. The {DOC_TITLE[frozenBy]} is filed with this answer.</p>;
    switch (stepKey) {
      case 'language': return <div className="choices"><Choice label="English" on={s.language === 'en'} onPick={() => { setLanguage(id, 'en'); advance(id); }} /><Choice label="Español" gloss="Spanish" on={s.language === 'es'} onPick={() => { setLanguage(id, 'es'); advance(id); }} /></div>;
      case 'plan:salvage': return <div className="choices">
        <Choice label="Rebuild The Title First" gloss="Then it sells as a rebuilt car" on={s.step.salvagePlan?.path === 'rebuild'} onPick={() => { mergeStep(id, 'salvagePlan', { path: 'rebuild' }); advance(id); }} />
        <Choice label="Tow-Away, As-Is" gloss="Salvage title, no plates. Salvage dealing is separately licensed." on={s.step.salvagePlan?.path === 'towAway'} onPick={() => { mergeStep(id, 'salvagePlan', { path: 'towAway' }); advance(id); }} />
        <Choice label="Not Decided" gloss="Everything is saved. Documents wait." on={s.step.salvagePlan?.path === 'undecided'} onPick={() => { mergeStep(id, 'salvagePlan', { path: 'undecided' }); go(`/sale/${id}`); }} />
      </div>;
      case 'buyer': return <><div className="group"><div className="row"><span className="t"><b>{s.buyer.fullName}</b><small>{s.buyer.phone} · {s.buyer.address}, {s.buyer.city}</small></span></div></div>
        <div className="choices"><Choice label="That’s Them" on onPick={() => advance(id)} /></div></>;
      case 'buyerId': return <BuyerId s={s} />;
      case 'funding': return <div className="choices">
        <Choice icon="cash" label="Cash" on={s.step.funding?.type === 'cash'} onPick={() => { mergeStep(id, 'funding', { type: 'cash' }); advance(id); }} />
        <Choice icon="house" label="Buy Here Pay Here" gloss="In-House Financing" on={s.step.funding?.type === 'inHouse'} onPick={() => { mergeStep(id, 'funding', { type: 'inHouse' }); advance(id); }} />
        <Choice icon="bank" label="Bank Financing" on={s.step.funding?.type === 'lender'} onPick={() => { mergeStep(id, 'funding', { type: 'lender' }); advance(id); }} />
      </div>;
      case 'lender': return <Lender s={s} />;
      case 'paid': return <Paid s={s} />;
      case 'price': return <><div className="choices">
        <Choice label="Yes, Out The Door" gloss="Tax and fees are inside it" on={s.step.money?.priceBasis === 'outTheDoor'} onPick={() => { mergeStep(id, 'money', { ...s.step.money, priceBasis: 'outTheDoor' }); advance(id); }} />
        <Choice label="No, Plus Tax And Fees" gloss="They go on top" on={s.step.money?.priceBasis === 'vehicleOnly'} onPick={() => { mergeStep(id, 'money', { ...s.step.money, priceBasis: 'vehicleOnly' }); advance(id); }} />
      </div><Receipt r={r} /></>;
      case 'plan:registration': return <div className="choices"><Choice label="Us" gloss="We file through webDEALER" on={plan.registrationBy === 'dealer'} onPick={() => planPick('registrationBy', 'dealer')} /><Choice label="The Buyer" on={plan.registrationBy === 'buyer'} onPick={() => planPick('registrationBy', 'buyer')} /></div>;
      case 'plate': return <Plate s={s} />;
      case 'plan:title-signer': return <div className="choices"><Choice label="The Buyer, Here Today" on={plan.titleSignedBy === 'buyer'} onPick={() => planPick('titleSignedBy', 'buyer')} /><Choice label="Us, For Them" gloss="Adds a power of attorney" on={plan.titleSignedBy === 'dealer'} onPick={() => planPick('titleSignedBy', 'dealer')} /></div>;
      case 'plan:price-includes': return <div className="choices"><Choice label="Yes" on={plan.priceIncludesRegistration === true} onPick={() => planPick('priceIncludesRegistration', true)} /><Choice label="No" on={plan.priceIncludesRegistration === false} onPick={() => planPick('priceIncludesRegistration', false)} /></div>;
      case 'plan:inspection': return <div className="choices"><Choice label="We Take It" on={plan.inspectionBy === 'dealer'} onPick={() => planPick('inspectionBy', 'dealer')} /><Choice label="They Take It" on={plan.inspectionBy === 'buyer'} onPick={() => planPick('inspectionBy', 'buyer')} /><Choice label="Already Done" on={plan.inspectionBy === 'done'} onPick={() => planPick('inspectionBy', 'done')} /></div>;
      case 'plan:insurance': return <div className="choices"><Choice label="Yes, Shown" on={plan.insuranceShown === true} onPick={() => planPick('insuranceShown', true)} /><Choice label="No" gloss="Adds an insurance acknowledgment" on={plan.insuranceShown === false} onPick={() => planPick('insuranceShown', false)} /></div>;
      case 'titleWork': return <><p className="note">Every document waits until the title is rebuilt.</p><div className="choices"><Choice label="The Title Is Rebuilt" onPick={() => { setVehicleTitle(s.vehicle.id, 'rebuilt_salvage'); advance(id); }} /></div></>;
      case 'title': return <WebDealer s={s} />;
    }
  })();

  return (
    <main className="wrap">
      <div className="top"><button className="back" onClick={() => { feel.tap(); backward(); history.length > 1 ? history.back() : go(`/sale/${id}`); }}><Ic n="chev" s={18} w={2.4} />Back</button>
        <span className="progress num">Step {idx + 1} Of {steps.length}</span></div>
      <div className="bar"><i style={{ width: `${((idx + 1) / steps.length) * 100}%` }} /></div>
      <section className="enter" key={stepKey}><h1 className="q">{step.question}</h1>{body}</section>
      <a className="textlink noprint" href={`#/sale/${id}`} style={{ marginTop: 28, textAlign: 'center' }}>The Whole Sale</a>
    </main>
  );
}

function BuyerId({ s }: { s: Sale }) {
  const id = s.step.buyerId;
  const labels: Record<IdKey, string> = { name: 'Name', idNumber: 'ID number', dob: 'Date of birth', expiry: 'Expires', address: 'Address on the card' };
  const read: Record<IdKey, string> = { name: s.buyer.fullName, idNumber: s.buyer.idNumber, dob: '', expiry: '', address: `${s.buyer.address}, ${s.buyer.city}, ${s.buyer.state} ${s.buyer.zip}` };
  const [vals, setVals] = useState<Record<IdKey, string>>(() => Object.fromEntries(ID_FIELDS.map(k => [k, id?.fields[k]?.confirmed ?? id?.fields[k]?.read ?? read[k]])) as Record<IdKey, string>);
  const [ok, setOk] = useState<Record<string, boolean>>(() => Object.fromEntries(ID_FIELDS.map(k => [k, !!id?.fields[k]?.confirmed])));
  const [mail, setMail] = useState<boolean | null>(id?.mailingConfirmed ? true : null);
  const onFile = (image: boolean) => mergeStep(s.id, 'buyerId', { image, fields: Object.fromEntries(ID_FIELDS.map(k => [k, { read: read[k] }])) });

  if (!id) return <div className="choices">
    <Choice icon="phone" label="Take A Photo With A Phone" gloss="Scan a code, snap the front and back" onPick={() => onFile(true)} />
    <Choice icon="upload" label="Upload A Scan" onPick={() => onFile(true)} />
    <Choice icon="type" label="Type It" onPick={() => onFile(false)} />
  </div>;

  const all = ID_FIELDS.every(k => ok[k] && vals[k].trim());
  return (<>
    <div className="group">{ID_FIELDS.map(k => (
      <div key={k} className="row">
        <span className="t"><small>{labels[k]}</small><input className="input" style={{ height: 44, marginTop: 6, fontSize: 16 }} value={vals[k]} placeholder={id.image ? 'Not read. Type it.' : 'Type it'} onChange={e => { setVals({ ...vals, [k]: e.target.value }); setOk({ ...ok, [k]: false }); }} /></span>
        <button className="choice" aria-pressed={ok[k]} style={{ width: 'auto', minHeight: 44, padding: '0 14px', boxShadow: 'none', background: 'none' }} aria-label={`Confirm ${labels[k]}`} onClick={() => { feel.tap(); setOk({ ...ok, [k]: !ok[k] }); }}><span className="tick">{ok[k] && <Ic n="check" s={15} w={3} />}</span></button>
      </div>))}</div>
    <h2 className="h2">Where Should The Plates Go?</h2>
    <div className="choices" style={{ marginTop: 0 }}>
      <Choice label="The Address On The Card" gloss={vals.address} on={mail === true} onPick={() => setMail(true)} />
      <Choice label="A Different Address" gloss="Change it on the buyer, then confirm" on={mail === false} onPick={() => setMail(false)} />
    </div>
    <div className="dock"><div className="in"><button className="btn primary block" disabled={!all || mail !== true} onClick={() => { feel.next(); mergeStep(s.id, 'buyerId', { ...id, fields: Object.fromEntries(ID_FIELDS.map(k => [k, { read: id.fields[k]?.read, confirmed: vals[k].trim() }])), mailingConfirmed: true }); advance(s.id); }}>Every Field Matches</button></div></div>
  </>);
}

function Lender({ s }: { s: Sale }) {
  const [q, setQ] = useState(''); const [other, setOther] = useState(s.step.funding?.lenderOther ?? '');
  const rank = (k: string) => (k === 'Bank' || k === 'Credit Union' ? 0 : 1);
  const list = LENDERS.filter(l => l.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => rank(a.kind) - rank(b.kind) || a.name.localeCompare(b.name));
  return (<>
    <label className="field"><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search lenders" /></label>
    <div className="choices">{list.map(l => <Choice key={l.id} label={l.name} gloss={l.kind} on={s.step.funding?.lenderId === l.id} onPick={() => { mergeStep(s.id, 'funding', { type: 'lender', lenderId: l.id }); advance(s.id); }} />)}</div>
    <label className="field"><span>Not listed</span><input className="input" value={other} onChange={e => setOther(e.target.value)} placeholder="Lender’s name" /></label>
    <button className="btn quiet block" style={{ marginTop: 10 }} disabled={!other.trim()} onClick={() => { feel.next(); mergeStep(s.id, 'funding', { type: 'lender', lenderOther: other.trim() }); advance(s.id); }}>Use This Lender</button>
  </>);
}

function Paid({ s }: { s: Sale }) {
  const { dealer } = useStore();
  const [amt, setAmt] = useState(s.step.money?.amount ?? String(s.vehicle.price || ''));
  const [part, setPart] = useState(s.step.money?.paidTodayAmount ?? '');
  const live = { ...s, step: { ...s.step, money: { ...s.step.money, amount: amt, paidTodayAmount: part || null } } };
  return (<>
    <div className="money"><input className="input" inputMode="decimal" autoFocus value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label="Amount" /></div>
    {s.step.funding?.type === 'cash' && <label className="field"><span>Paying part today? (optional)</span><input className="input num" inputMode="decimal" value={part} onChange={e => setPart(e.target.value)} placeholder="The whole amount" /></label>}
    <Receipt r={saleReceipt(live, dealer)} />
    <div className="dock"><div className="in"><button className="btn primary block" disabled={!amt.replace(/[$,\s]/g, '')} onClick={() => { feel.next(); mergeStep(s.id, 'money', { ...s.step.money, amount: amt, paidTodayAmount: part || null }); advance(s.id); }}>Continue</button></div></div>
  </>);
}

function Plate({ s }: { s: Sale }) {
  const [p, setP] = useState(s.step.plate ?? '');
  return (<>
    <label className="field"><input className="input num" style={{ height: 76, fontSize: 30, letterSpacing: '.12em', textAlign: 'center' }} value={p} onChange={e => setP(e.target.value.toUpperCase())} placeholder="ABC 1234" /></label>
    <div className="choices"><Choice label="Not Yet" gloss="It comes after the filing" on={!!s.step.plateAsked && !s.step.plate} onPick={() => { mergeStep(s.id, 'plateAsked', true); advance(s.id); }} /></div>
    <div className="dock"><div className="in"><button className="btn primary block" disabled={!p.trim()} onClick={() => { feel.next(); mergeStep(s.id, 'plate', p.trim()); advance(s.id); }}>Save The Plate</button></div></div>
  </>);
}

function WebDealer({ s }: { s: Sale }) {
  const { dealer } = useStore(); const r = saleReceipt(s, dealer);
  const [plate, setPlate] = useState(s.step.plate ?? '');
  const lienholder = s.step.funding?.type === 'lender' ? (s.step.funding.lenderOther || LENDERS.find(l => l.id === s.step.funding?.lenderId)?.name) : r.balance > 0 || s.step.funding?.type === 'inHouse' ? dealer.legalName : 'None';
  const fields: [string, string][] = [['VIN', s.vehicle.vin], ['Year, make, model', `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}`], ['Odometer', String(s.vehicle.mileage ?? '')], ['Buyer', s.buyer.fullName], ['Address', `${s.buyer.address}, ${s.buyer.city}, ${s.buyer.state} ${s.buyer.zip}`], ['County', s.buyer.county], ['ID number', s.buyer.idNumber], ['Sales price', r.salePrice.toFixed(2)], ['Tax', r.tax.toFixed(2)], ['Lienholder', lienholder ?? 'None'], ['Empty weight', s.step.paperwork?.form130U?.emptyWeight ?? '']];
  return (<>
    <p className="note">Everything webDEALER asks for, ready to copy.</p>
    <div className="group">{fields.map(([k, v]) => (
      <div key={k} className="row"><span className="t"><small>{k}</small><b className="num">{v || 'Missing'}</b></span>
        {v ? <button className="status" onClick={() => { feel.tap(); navigator.clipboard?.writeText(v); }}><Ic n="copy" s={14} /> Copy</button> : <a className="status warn" href={`#/sale/${s.id}`}>Fill It</a>}</div>))}</div>
    <label className="field"><span>The plate they issued</span><input className="input num" style={{ letterSpacing: '.1em' }} value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="ABC 1234" /></label>
    <div className="dock"><div className="in"><button className="btn primary block" disabled={!plate.trim()} onClick={() => { feel.done(); mergeStep(s.id, 'plate', plate.trim()); advance(s.id); }}>Plates Are On</button></div></div>
  </>);
}

