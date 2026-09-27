// Renders every variant of every template to out/<variant>-<format>.png (1080 wide).
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright');
const path = require('path');
const ADS = { ad: ['leak', 'price', 'closer', 'babe', 'we', 'softyes'], offer: ['type', 'why', 'friday', 'babe-offer', 'words'] }, FORMATS = { story: 1920, feed: 1350 };
(async () => {
  const b = await chromium.launch();
  for (const [f, h] of Object.entries(FORMATS)) {
    const p = await b.newPage({ viewport: { width: 1080, height: h } });
    for (const [tpl, variants] of Object.entries(ADS)) for (const v of variants) {
      await p.goto('file://' + path.join(__dirname, `${tpl}.html?v=${v.replace('-offer', '')}&f=${f}`));
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(__dirname, 'out', `${v}-${f}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
