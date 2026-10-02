/* An official form, shown as the real pages it prints: the state's PDF, filled,
   rasterised for the screen. What the buyer reads here is the paper. */
import { useEffect, useState } from 'react';
import type { DealerConfig } from './lib/config';
import type { DocType } from './lib/plan';
import type { Sale } from './lib/sale';
import { officialPdf } from './lib/official';

async function rasterise(bytes: Uint8Array, width: number): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n), base = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: (width * 2) / base.width });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
    pages.push(c.toDataURL('image/png'));
  }
  return pages;
}

export function OfficialForm({ doc, sale, dealer, buyerSig, onReady }: { doc: DocType; sale: Sale; dealer: DealerConfig; buyerSig?: string | null; onReady?: () => void }) {
  const [state, setState] = useState<{ pages?: string[]; url?: string; refused?: string; error?: string }>({});
  useEffect(() => {
    let gone = false, url: string | undefined;
    officialPdf(doc, sale, dealer, buyerSig).then(async r => {
      if ('refused' in r) { if (!gone) { setState({ refused: r.refused }); onReady?.(); } return; }
      url = URL.createObjectURL(new Blob([r.pdf.slice()], { type: 'application/pdf' }));
      const pages = await rasterise(r.pdf, 820);
      if (!gone) { setState({ pages, url }); requestAnimationFrame(() => onReady?.()); }
    }).catch(e => { if (!gone) setState({ error: e instanceof Error ? e.message : String(e) }); });
    return () => { gone = true; if (url) URL.revokeObjectURL(url); };
  }, [doc, sale, dealer, buyerSig]);
  if (state.refused) return <div className="official-form refused"><p>{state.refused}</p></div>;
  if (state.error) return <div className="official-form refused"><p>The form could not be filled: {state.error}</p></div>;
  if (!state.pages) return <div className="official-form loading" aria-busy="true"><p>Filling the official form…</p></div>;
  return (
    <div className="official-form">
      {state.pages.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1} of the official form`} />)}
      {state.url && <a className="textlink" href={state.url} target="_blank" rel="noreferrer">Open The PDF</a>}
    </div>
  );
}
