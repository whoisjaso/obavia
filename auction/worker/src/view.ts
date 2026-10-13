/* The document page the phone opens inside a WebView: pdf.js renders the PDF
   the Worker serves; reaching the end posts "end" to the app, which unlocks
   the pad. One file, no build. `at`: a page index to bring into view once
   drawn (the signed copy opens on the page the stamp is on, sign.ts).
   pdf.js comes from this Worker (/pdfjs/*, wrangler assets copied from the
   pinned pdfjs-dist by `npm run vendor`), never from a third-party origin:
   nothing but Obavia runs on the page at the moment of signature, and a
   network that allows the Worker allows the viewer. */
export const PDFJS_PATH = '/pdfjs';
export function viewerHtml(pdfUrl: string, opts: { at?: number } = {}): string {
  const u = JSON.stringify(pdfUrl);
  const origin = new URL(pdfUrl).origin;   // the Worker's own origin: the PDF and pdf.js come from the same place
  const lib = JSON.stringify(`${origin}${PDFJS_PATH}/pdf.min.mjs`), worker = JSON.stringify(`${origin}${PDFJS_PATH}/pdf.worker.min.mjs`);
  const at = Number.isInteger(opts.at) && (opts.at as number) > 0 ? (opts.at as number) : 0;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;background:#F2F6FF}#pages{padding:12px 12px 48px}canvas{display:block;width:100%;height:auto;background:#fff;border-radius:6px;margin:0 0 10px;box-shadow:0 1px 2px rgba(28,36,54,.08)}</style>
<link rel="modulepreload" href=${lib}></head>
<body><div id="pages"></div>
<script type="module">
const pdfjs = await import(${lib});
pdfjs.GlobalWorkerOptions.workerSrc = ${worker};
const post = m => { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(m); } catch {} try { window.parent !== window && window.parent.postMessage(m, '*'); } catch {} };
const doc = await pdfjs.getDocument(${u}).promise;
const host = document.getElementById('pages'); const scale = (window.devicePixelRatio || 1) * 1.5;
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i); const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; host.appendChild(c);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
}
post('ready');
const target = host.children[${at}]; if (target && ${at} > 0) target.scrollIntoView({ block: 'start' });
let done = false;
const check = () => { if (!done && window.innerHeight + window.scrollY >= document.body.scrollHeight - 24) { done = true; post('end'); } };
addEventListener('scroll', check, { passive: true }); check();
</script></body></html>`;
}
