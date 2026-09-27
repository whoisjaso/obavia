// Renders every static ad variant to out/<variant>-<format>.png (1080 wide).
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright');
const path = require('path');
const VARIANTS = ['leak', 'price', 'closer'], FORMATS = { story: 1920, feed: 1350 };
(async () => {
  const b = await chromium.launch();
  for (const [f, h] of Object.entries(FORMATS)) {
    const p = await b.newPage({ viewport: { width: 1080, height: h } });
    for (const v of VARIANTS) {
      await p.goto('file://' + path.join(__dirname, `ad.html?v=${v}&f=${f}`));
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: path.join(__dirname, 'out', `${v}-${f}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
