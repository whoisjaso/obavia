/* One question inside one document, then its review: the facts read back,
   the live sheet that will print, the buyer's pad, File. Filing unsigned and
   printing for ink is always allowed. */
import { useState } from 'react';
import { DOC_TITLE } from './lib/documents';
import { isAnswered, nextPaperworkQuestion, paperworkQuestions } from './lib/paperwork';
import type { DocType } from './lib/plan';
import { Sheet } from './Sheet';
import { advance } from './Corridor';
import { fileDocument, getSale, me, mergeStep, useStore } from './store';
import { Choice, Ic, Pad, backward, feel, go } from './ui';
import { photosOf } from './lib/condition';
import { financingTerms, freeze } from './lib/filed';
import { missingFacts } from './lib/config';

export function Paper({ id, doc, q }: { id: string; doc: DocType; q?: string }) {
  const { dealer } = useStore();
  const s = getSale(id)!;
  const qs = paperworkQuestions(doc, s);
  const cur = q ? qs.find(x => x.key === q) : nextPaperworkQuestion(doc, s);
  const answers = s.step.paperwork?.[doc] ?? {};
  const [val, setVal] = useState(() => (cur ? answers[cur.key] ?? cur.prefill?.(s) ?? '' : ''));
  const [sig, setSig] = useState<string | null>(null);
  const idx = cur ? qs.findIndex(x => x.key === cur.key) : qs.length;
  const total = qs.length + 1;

  const save = (v: string) => {
    mergeStep(id, 'paperwork', { ...s.step.paperwork, [doc]: { ...answers, [cur!.key]: v } });
    const after = getSale(id)!, n = nextPaperworkQuestion(doc, after);
    setVal(n ? after.step.paperwork?.[doc]?.[n.key] ?? n.prefill?.(after) ?? '' : '');
    go(`/sale/${id}/paper/${doc}${n ? '/' + n.key : '/review'}`);
  };
  const file = (signed: boolean) => {
    feel.done();
    fileDocument(id, doc, { state: 'filed', buyerSigned: signed, dealerSigned: true, signature: signed ? sig ?? undefined : undefined, signedVia: signed ? 'desk' : undefined, signedAt: signed ? new Date().toISOString() : undefined,
      signedUserAgent: signed ? navigator.userAgent.slice(0, 240) : undefined, frozen: freeze(getSale(id)!, dealer, new Date(), me()?.name) });
    advance(id);
  };
  const wet = doc === 'powerOfAttorney';
  // Filing is refused while a legal fact the paper prints is missing, or the agreed payment can't pay the note off.
  const blocked = [...missingFacts(dealer), ...(doc === 'financing' && !Number.isFinite(financingTerms(s, dealer).count) ? ['A payment that covers the interest'] : [])];

  return (
    <main className="wrap center">
      <div className="top"><button className="back" onClick={() => { feel.tap(); backward(); history.back(); }}><Ic n="chev" s={18} w={2.4} />Back</button><span className="progress">{DOC_TITLE[doc]}</span></div>
      <div className="bar"><i style={{ width: `${(Math.min(idx + 1, total) / total) * 100}%` }} /></div>

      {cur ? (
        <section className="enter" key={cur.key}>
          <h1 className="q">{cur.question}</h1>
          {cur.kind === 'choice' && <div className="choices">{cur.choices!.map(c => <Choice key={c.v} label={c.label} gloss={c.gloss} on={answers[cur.key] === c.v} onPick={() => save(c.v)} />)}</div>}
          {cur.kind === 'photos' && <Photos initial={photosOf(answers[cur.key])} onDone={list => { feel.next(); save(JSON.stringify(list)); }} />}
          {cur.kind !== 'choice' && cur.kind !== 'photos' && <>
            {cur.kind === 'money'
              ? <div className="money"><input className="input" inputMode="decimal" autoFocus value={val} onChange={e => setVal(e.target.value)} placeholder="0" /></div>
              : <label className="field"><input className="input num" autoFocus type={cur.kind === 'date' ? 'date' : 'text'} inputMode={cur.kind === 'number' ? 'decimal' : undefined} value={val} onChange={e => setVal(e.target.value)} placeholder={cur.key === 'emptyWeight' ? 'Pounds' : cur.key === 'capacity' ? 'Tons, or Not Applicable' : cur.key === 'rate' ? 'Percent' : ''} /></label>}
            <div className="dock"><div className="in"><button className="btn primary block" disabled={!isAnswered(val)} onClick={() => { feel.next(); save(val); }}>Continue</button></div></div>
          </>}
        </section>
      ) : (
        <section className="enter" key="review">
          <h1 className="q">Sign The {DOC_TITLE[doc]}.</h1>
          <div className="paper"><div className="scroll"><Sheet doc={doc} sale={s} dealer={dealer} buyerSig={sig} dealerSig /></div></div>
          {blocked.length > 0 && <p className="note" style={{ marginTop: 14 }}>Can’t file yet. Missing: {blocked.join(', ')}. {missingFacts(dealer).length > 0 && <a href="#/facts" onClick={feel.tap}>Add Them</a>}</p>}
          {wet ? <p className="note" style={{ marginTop: 14 }}>Signed in ink on the state form.</p> : <Pad onChange={setSig} />}
          <div className="dock"><div className="in">
            {!wet && <button className="btn primary block" disabled={!sig || blocked.length > 0} onClick={() => file(true)}><Ic n="pen" s={20} />File Signed</button>}
            <button className={wet ? 'btn primary block' : 'textlink'} disabled={blocked.length > 0} onClick={() => file(false)}>{wet ? 'File For Ink' : 'Print For Ink Instead'}</button>
          </div></div>
        </section>
      )}
    </main>
  );
}

/** Shrinks a photo to a small JPEG so a sale's record stays light. */
function shrink(f: File, max = 640): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = rej; img.src = url;
  });
}

const MAX_PHOTOS = 6;
function Photos({ initial, onDone }: { initial: string[]; onDone: (list: string[]) => void }) {
  const [list, setList] = useState(initial);
  const add = async (files: FileList | null) => {
    if (!files) return;
    const out: string[] = [];
    for (const f of [...files].slice(0, MAX_PHOTOS - list.length)) { try { out.push(await shrink(f)); } catch { /* not an image */ } }
    feel.tap(); setList(x => [...x, ...out].slice(0, MAX_PHOTOS));
  };
  return (<>
    <p className="note">Front, back, both sides, the dash and anything worn.</p>
    <div className="shots">
      {list.map((src, i) => <button key={i} className="shot" aria-label="Remove photo" onClick={() => { feel.tap(); setList(x => x.filter((_, j) => j !== i)); }}><img src={src} alt="" /><i>×</i></button>)}
      {list.length < MAX_PHOTOS && <label className="shot add"><input type="file" accept="image/*" capture="environment" multiple onChange={e => { add(e.target.files); e.target.value = ''; }} /><Ic n="plus" s={26} /><span>Add</span></label>}
    </div>
    <div className="dock"><div className="in">
      <button className="btn primary block" disabled={!list.length} onClick={() => onDone(list)}>Continue</button>
      {!list.length && <button className="textlink" onClick={() => onDone(list)}>Skip For Now</button>}
    </div></div>
  </>);
}
