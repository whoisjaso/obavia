/* The production desk's paper, inside the Desk.

   The document components carry the production stylesheet (Tailwind plus
   src/app/globals.css), which would restyle the whole Desk if it were loaded
   on the page. So the paper lives in a same-origin frame with that stylesheet
   and nothing else, and React renders into it through a portal.

   What shows is what prints: the production desk prints these components to
   PDF in print media on letter paper with 0.6in margins. The frame is the
   printable width (7.3in) and its stylesheet has `print` rules switched on
   and `screen` rules switched off, so the preview is the PDF's layout. "Open
   The PDF" hands the same markup, with the stylesheet untouched, to the
   browser's printer. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import paperCss from './paper.css?inline';

const PAGE_W = 816, MARGIN = 57.6, CONTENT_W = PAGE_W - MARGIN * 2;   // letter, 0.6in margins (production @page)

/** Print rules on, screen rules off: the stylesheet as the printer applies it. */
export function asPrinted(css: string): string {
  return css.replace(/@media([^{]*)\{/g, (_m, prelude: string) =>
    `@media${prelude.replace(/\bprint\b/g, '\u0000').replace(/\bscreen\b/g, 'print').replace(/\u0000/g, 'all')}{`);
}

const fontFace = () => {
  const at = (f: string) => new URL(`./paper/fonts/${f}`, document.baseURI).href;
  return `@font-face{font-family:"Geist";src:url("${at('Geist-Variable.woff2')}") format("woff2");font-weight:100 900;font-display:block}
@font-face{font-family:"Geist Mono";src:url("${at('GeistMono-Variable.woff2')}") format("woff2");font-weight:100 900;font-display:block}
${(['normal', 'italic'] as const).map(st => `@font-face{font-family:"Cormorant Garamond Variable";font-style:${st};font-weight:300 700;font-display:block;src:url("${at(`cormorant-garamond-latin-wght-${st}.woff2`)}") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Cormorant Garamond Variable";font-style:${st};font-weight:300 700;font-display:block;src:url("${at(`cormorant-garamond-latin-ext-wght-${st}.woff2`)}") format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}`).join('\n')}`;
};

let printedCss: string | null = null;
const screenCss = () => (printedCss ??= asPrinted(paperCss));

export function PaperFrame({ children, title, onReady, onHtml }: { children: ReactNode; title: string; onReady?: () => void; onHtml?: (html: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null), box = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(1056), [scale, setScale] = useState(1);

  useEffect(() => {
    const f = frame.current; if (!f) return;
    const doc = f.contentDocument!;
    doc.open(); doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${fontFace()}</style><style>${screenCss()}</style></head><body></body></html>`); doc.close();
    setBody(doc.body);
  }, []);

  // Fit the letter-width page to the column, and the frame to the document's height.
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / PAGE_W));
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!body) return;
    const doc = body.ownerDocument, measure = () => setHeight(Math.max(200, doc.documentElement.scrollHeight));
    const ro = new ResizeObserver(measure); ro.observe(doc.documentElement); measure();
    let gone = false;
    // Ready once the fonts are in and the images decoded: the read-to-end gate counts from here.
    Promise.all([doc.fonts?.ready, ...Array.from(doc.images).map(i => i.decode().catch(() => undefined))]).then(() => {
      if (gone) return; measure();
      requestAnimationFrame(() => { if (!gone) { onReady?.(); onHtml?.(body.innerHTML); } });
    });
    return () => { gone = true; ro.disconnect(); };
  }, [body, children]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className="paper-frame" style={{ height: (height + MARGIN * 2) * scale }}>
      <div className="paper-page" style={{ width: PAGE_W, padding: MARGIN, transform: `scale(${scale})` }}>
        <iframe ref={frame} title={title} style={{ width: CONTENT_W, height, border: 0, display: 'block' }} />
      </div>
      {body && createPortal(children, body)}
    </div>
  );
}

/** The printable file: the same markup with the production stylesheet as the printer reads it. */
export function printableHtml(inner: string, title: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title><style>${fontFace()}</style><style>${paperCss}</style>
<style>@media screen{body{max-width:${PAGE_W}px;margin:0 auto;padding:${MARGIN}px;box-sizing:border-box;background:#fff}}</style></head>
<body>${inner}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))</script></body></html>`;
}
