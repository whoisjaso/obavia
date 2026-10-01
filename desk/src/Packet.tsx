/* The packet (everything filed) and the buyer's signing ceremony: one sheet
   per screen, the pad unlocks only once the sheet is read to its end. */
import { useRef, useState } from 'react';
import { DOC_MEANS, DOC_TITLE } from './lib/documents';
import type { DocType } from './lib/plan';
import { owedDocuments, signedCount } from './lib/sale';
import { Sheet, saleReceipt } from './Sheet';
import { completeSale, fileDocument, getSale, openNoteForSale, useStore } from './store';
import { Back, Ic, Pad, feel, go } from './ui';

export function Packet({ id }: { id: string }) {
  const { dealer } = useStore();
  const s = getSale(id)!;
  const owed = owedDocuments(s), c = signedCount(s);
  const [open, setOpen] = useState<DocType | null>(null);
  const allFiled = c.filed === c.owed && c.owed > 0;
  const signable = owed.filter(d => d !== 'powerOfAttorney' && s.documents[d]?.state === 'filed' && !s.documents[d]?.buyerSigned);

  if (open) return (
    <main className="wrap">
      <div className="top noprint"><button className="back" onClick={() => setOpen(null)}><Ic n="chev" s={18} w={2.4} />Packet</button><button className="link" onClick={() => print()}><Ic n="print" s={18} /> Print</button></div>
      <div className="paper"><div className="scroll"><Sheet doc={open} sale={s} dealer={dealer} buyerSig={s.documents[open]?.signature} dealerSig /></div></div>
    </main>
  );

  return (
    <main className="wrap center">
      <div className="top"><Back to={`#/sale/${id}`} label="The Sale" /></div>
      <section className="enter" key="packet">
      <h1 className="q">{c.signed === c.owed && c.owed ? 'All Signed.' : `${c.signed} Of ${c.owed} Signed.`}</h1>
      <div className="choices">{owed.map(d => { const a = s.documents[d]; return (
        <button key={d} className="choice" aria-pressed={!!a?.buyerSigned} onClick={() => { feel.tap(); a?.state === 'filed' ? setOpen(d) : go(`/sale/${id}/paper/${d}`); }}>
          <span className="art"><Ic n="doc" s={24} /></span>
          <span className="t"><b>{DOC_TITLE[d]}</b><small>{a?.buyerSigned ? 'Signed' : a?.state === 'filed' ? (d === 'powerOfAttorney' ? 'Sign in ink' : 'Not signed yet') : 'Not filed'}</small></span>
          <span className="tick">{a?.buyerSigned && <Ic n="check" s={15} w={3} />}</span>
        </button>); })}</div>
      </section>
      {s.status === 'completed' && <p className="empty">Completed {s.completedAt ? new Date(s.completedAt).toLocaleString() : ''}.</p>}
      <div className="dock"><div className="in">
        {signable.length > 0 && allFiled
          ? <button className="btn primary block" onClick={() => { feel.next(); go(`/sign/${id}`); }}><Ic n="pen" s={20} />Sign The Packet</button>
          : s.status !== 'completed' && <button className="btn primary block" disabled={!allFiled} onClick={() => { feel.done(); openNoteForSale(id, saleReceipt(s, dealer).total); completeSale(id); go('/'); }}>Complete Sale</button>}
        <button className="textlink" onClick={() => print()}>Print</button>
      </div></div>
    </main>
  );
}

/* ---------- /sign/:id : the buyer's ceremony. No chrome. ---------- */
export function Ceremony({ id }: { id: string }) {
  const { dealer } = useStore();
  const s = getSale(id)!;
  const [docs] = useState(() => owedDocuments(s).filter(d => d !== 'powerOfAttorney' && s.documents[d]?.state === 'filed' && !s.documents[d]?.buyerSigned));
  const [i, setI] = useState(-1);
  const [read, setRead] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [first, setFirst] = useState<string | null>(null);
  const [reuse, setReuse] = useState(false);
  const [times, setTimes] = useState<Record<string, string>>({});
  const sc = useRef<HTMLDivElement>(null);
  const spanish = s.language === 'es';

  if (i === -1) return (
    <main className="wrap cere"><div className="cover enter">
      <div>
        <img src="./mark.svg" alt="" style={{ width: 56, height: 56 }} />
        <h1 className="q" style={{ marginTop: 20 }}>{s.buyer.fullName}</h1>
        <p className="note">{s.vehicle.year} {s.vehicle.make} {s.vehicle.model}</p>
        <p className="big num">{docs.length}</p><p style={{ font: '700 17px/1 var(--sans)' }}>Documents To Sign</p>
        {spanish && <p className="note">Las firmas en español se hacen en papel por ahora.</p>}
      </div>
    </div>
    <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); setI(spanish ? docs.length : 0); }}>{spanish ? 'Print For Ink' : 'Begin'}</button></div></div></main>
  );

  if (i >= docs.length) return (
    <main className="wrap cere center"><section className="enter" key="done">
      <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
      <h1 className="q">All Signed.</h1>
      <p className="note">{docs.length} {docs.length === 1 ? 'document' : 'documents'} · {Object.values(times).length ? new Date(Object.values(times).pop()!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</p></section>
      <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.done(); go(`/sale/${id}/packet`); }}>Hand Back To The Desk</button></div></div></main>
  );

  const d = docs[i];
  const stroke = reuse && first ? first : sig;
  const sign = () => {
    const at = new Date().toISOString();
    fileDocument(id, d, { buyerSigned: true, signature: stroke!, signedVia: 'ceremony', signedAt: at, state: 'filed' });
    if (!first) setFirst(stroke);
    setTimes({ ...times, [d]: at }); setSig(null); setRead(false); feel.next(); setI(i + 1); scrollTo(0, 0);
  };
  return (
    <main className="wrap cere">
      <div className="top"><span className="progress num">{i + 1} Of {docs.length}</span><span /></div>
      <div className="bar"><i style={{ width: `${((i + 1) / docs.length) * 100}%` }} /></div>
      <h1 className="q" style={{ fontSize: 30 }}>{DOC_TITLE[d]}</h1>
      <div className="paper"><div className="scroll" ref={sc} onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setRead(true); }}>
        <Sheet doc={d} sale={s} dealer={dealer} buyerSig={stroke} dealerSig />
        <div ref={el => { if (el && sc.current && sc.current.scrollHeight <= sc.current.clientHeight + 8 && !read) setTimeout(() => setRead(true)); }} />
      </div></div>
      <p className="means">{DOC_MEANS[d]}</p>
      {first && <label className="consent"><input type="checkbox" checked={reuse} onChange={e => { feel.tap(); setReuse(e.target.checked); }} />Use my signature from the first document on this one.</label>}
      {!(reuse && first) && <Pad key={d} locked={!read} onChange={setSig} />}
      <div className="dock"><div className="in"><button className="btn primary block" disabled={!read || !stroke} onClick={sign}>Sign And Continue</button></div></div>
    </main>
  );
}

