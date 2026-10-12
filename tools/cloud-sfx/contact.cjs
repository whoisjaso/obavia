// Rasterizes assets/cloud-sfx/waveforms.svg to waveforms.png with the Playwright Chromium the auction app already installs.
// Run after make.mjs:  node tools/cloud-sfx/contact.cjs
const { chromium } = require('/home/user/obavia/auction/node_modules/playwright');
(async () => {
  const svg = require('fs').readFileSync('/home/user/obavia/assets/cloud-sfx/waveforms.svg','utf8');
  const w = +svg.match(/width="(\d+)"/)[1], h = +svg.match(/height="(\d+)"/)[1];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.setContent(`<html><body style="margin:0;background:#1C2436">${svg}</body></html>`);
  await p.screenshot({ path: '/home/user/obavia/assets/cloud-sfx/waveforms.png', clip:{x:0,y:0,width:w,height:h} });
  await b.close();
})();
