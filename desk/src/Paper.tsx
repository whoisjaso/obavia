/* One question inside one document, then its review: the facts read back,
   the live sheet that will print, the buyer's pad, File. Filing unsigned and
   printing for ink is always allowed. */
import { useState } from 'react';
import { DOC_TITLE } from './lib/documents';
import { isAnswered, nextPaperworkQuestion, paperworkQuestions } from './lib/paperwork';
import type { DocType } from './lib/plan';
import { Sheet } from './Sheet';
import { advance } from './Corridor';
import { fileDocument, getSale, mergeStep, useStore } from './store';
import { Choice, Ic, Pad, backward, feel, go } from './ui';

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
    fileDocument(id, doc, { state: 'filed', buyerSigned: signed, dealerSigned: true, signature: signed ? sig ?? undefined : undefined, signedVia: signed ? 'desk' : undefined, signedAt: signed ? new Date().toISOString() : undefined });
    advance(id);
  };
  const wet = doc === 'powerOfAttorney';

  return (
    <main className="wrap center">
      <div className="top"><button className="back" onClick={() => { feel.tap(); backward(); history.back(); }}><Ic n="chev" s={18} w={2.4} />Back</button><span className="progress">{DOC_TITLE[doc]}</span></div>
      <div className="bar"><i style={{ width: `${(Math.min(idx + 1, total) / total) * 100}%` }} /></div>

      {cur ? (
        <section className="enter" key={cur.key}>
          <h1 className="q">{cur.question}</h1>
          {cur.kind === 'choice' && <div className="choices">{cur.choices!.map(c => <Choice key={c.v} label={c.label} gloss={c.gloss} on={answers[cur.key] === c.v} onPick={() => save(c.v)} />)}</div>}
          {cur.kind !== 'choice' && <>
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
          {wet ? <p className="note" style={{ marginTop: 14 }}>Signed in ink on the state form.</p> : <Pad onChange={setSig} />}
          <div className="dock"><div className="in">
            {!wet && <button className="btn primary block" disabled={!sig} onClick={() => file(true)}><Ic n="pen" s={20} />File Signed</button>}
            <button className={wet ? 'btn primary block' : 'textlink'} onClick={() => file(false)}>{wet ? 'File For Ink' : 'Print For Ink Instead'}</button>
          </div></div>
        </section>
      )}
    </main>
  );
}
