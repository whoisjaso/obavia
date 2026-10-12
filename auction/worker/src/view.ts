/* The document page the phone opens inside a WebView: pdf.js renders the PDF
   the Worker serves; reaching the end posts "end" to the app, which unlocks
   the pad. One file, no build. */
export function viewerHtml(pdfUrl: string): string {
  const u = JSON.stringify(pdfUrl);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;background:#F2F6FF}#pages{padding:12px 12px 48px}canvas{display:block;width:100%;height:auto;background:#fff;border-radius:6px;margin:0 0 10px;box-shadow:0 1px 2px rgba(28,36,54,.08)}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs" type="module"></script></head>
<body><div id="pages"></div>
<script type="module">
import * as pdfjs from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
const post = m => { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(m); } catch {} try { window.parent !== window && window.parent.postMessage(m, '*'); } catch {} };
const doc = await pdfjs.getDocument(${u}).promise;
const host = document.getElementById('pages'); const scale = (window.devicePixelRatio || 1) * 1.5;
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i); const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; host.appendChild(c);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
}
post('ready');
let done = false;
const check = () => { if (!done && window.innerHeight + window.scrollY >= document.body.scrollHeight - 24) { done = true; post('end'); } };
addEventListener('scroll', check, { passive: true }); check();
</script></body></html>`;
}
