/* Captures the real Desk screens the films are cut from (public/desk/*.png).
   Build and serve the Desk first:  cd ../desk && npm run build && (cd dist && python3 -m http.server 8767)
   Then:  node capture-desk.cjs   (Playwright from the global install; Manrope served locally). */
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const D = path.join(__dirname, 'node_modules/@fontsource/manrope/files/');
const CSS = [400, 500, 600, 700, 800].map(w => `@font-face{font-family:'Manrope';font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(D + `manrope-latin-${w}-normal.woff2`).toString('base64')}) format('woff2');}`).join('');
const fonts = async ctx => ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.request().url().includes('googleapis') ? r.fulfill({ status: 200, contentType: 'text/css', body: CSS }) : r.fulfill({ status: 204, body: '' }));
const OUT=path.join(__dirname,'public/desk'); fs.mkdirSync(OUT,{recursive:true});

(async()=>{const b=await chromium.launch(); const errs=[];
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'no-preference'}); await fonts(c);
const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
const shot=async(name,wait=750)=>{await p.waitForTimeout(wait); await p.screenshot({path:`${OUT}/${name}.png`});};
const tap=async t=>{await p.getByText(t,{exact:true}).first().click(); await p.waitForTimeout(250);};
await p.goto('http://localhost:8767/index.html'); await shot('01-state',1800);
await p.evaluate(()=>scrollBy(0,520)); await shot('01b-state-scroll'); await p.evaluate(()=>scrollTo(0,0));
await p.getByLabel('Texas').click(); await p.waitForSelector('text=licensed Texas dealers'); await shot('02-search');
for (const [i,q] of ['tri','triple','triple j','triple j auto'].entries()) { await p.fill('input[placeholder="Start typing its name"]',q); await shot(`03-type-${i}`,500); }
await p.getByText('Triple J Auto Investment LLC',{exact:true}).first().click(); await shot('04-isthisyou');
await p.locator('.choice',{hasText:'Text'}).first().click(); const hide=await p.addStyleTag({content:'.example{visibility:hidden!important}'}); await shot('05-code');
for (const [i,v] of ['4','48','482','4821','48217'].entries()) { await p.locator('.code input').fill(v); await shot(`05-code-${i}`,150); }
await hide.evaluate(e=>e.remove()); await p.locator('.code input').fill('482170'); await shot('06-logo',1300);
await tap('Continue'); await shot('07-colour'); await p.locator('.swatch').nth(2).click(); await shot('07b-colour-pick'); await tap('Continue'); await shot('08-systems');
await p.locator('.sys',{hasText:'Frazer'}).click(); await shot('08b-systems-picked'); await tap('Move My Cars From Frazer'); await shot('09-paper',1200);
await p.locator('.paper .scroll').evaluate(e=>e.scrollTop=420); await shot('09b-paper-mid'); await p.locator('.paper .scroll').evaluate(e=>e.scrollTop=e.scrollHeight); await shot('09c-paper-end');
await tap('Start Selling'); await shot('10-sales',1200);
await tap('Start A Sale'); await shot('11-car');
await p.getByText('2016 Honda Accord LX').click(); await shot('12-odo'); await tap('Continue'); await shot('13-title');
await tap('Clean'); await tap('English'); await shot('14-name');
const ans=async(ph,v,name)=>{await p.fill(`input[placeholder="${ph}"]`,v); if(name) await shot(name); await p.keyboard.press('Enter'); await p.waitForTimeout(400);};
await ans('Full name, as on the ID','Maria Example','14b-name-typed'); await ans('Mobile phone','(555) 010-7788'); await ans('Street address','12 Example Road');
await ans('City','Katy'); await ans('ZIP','77449'); await tap('Driver Licence'); await ans('As printed','12345678');
await shot('15-readback'); await tap('Start The Sale'); await shot('16-id');
await tap('Take A Photo With A Phone'); await shot('16b-id-confirm');
for (const l of ['Name','ID number','Date of birth','Expires','Address on the card']) { const row=p.locator('.row',{hasText:l}); const inp=row.locator('input'); if(!(await inp.inputValue())) await inp.fill(l==='Date of birth'?'01/02/1990':'01/02/2030'); await row.getByRole('button').click(); }
await tap('The Address On The Card'); await tap('Every Field Matches'); await shot('17-funding');
await tap('Cash'); await shot('18-paid'); await p.fill('.money input','4000'); await shot('18b-paid-typed'); await tap('Continue');
await shot('19-price'); await tap('Yes, Out The Door'); await shot('20-registration');
await tap('Us'); await tap('Not Yet'); await tap('The Buyer, Here Today'); await tap('Already Done'); await tap('Yes, Shown'); await shot('21-bos-q');
await tap('Real'); await tap('Cash'); await tap('No'); await tap('As-Is'); await shot('22-bos-review');
await p.locator('.pad').scrollIntoViewIfNeeded(); await p.evaluate(()=>scrollBy(0,120)); const box=await p.locator('.pad canvas').boundingBox(); await p.mouse.move(box.x+30,box.y+100); await p.mouse.down(); for(let i=0;i<30;i++) await p.mouse.move(box.x+30+i*8,box.y+100-Math.sin(i/3)*30); await p.mouse.up(); await shot('22b-signed');
await tap('File Signed'); await tap('Title And Registration'); await tap('A Person'); await tap('Continue'); await shot('23-130u');
await tap('File Unsigned, Print For Ink'); await p.fill('input[placeholder="ABC 1234"]','TXA 1234'); await tap('Plates Are On'); await shot('24-packet');
await tap('Sign The Packet'); await shot('25-ceremony'); await tap('Begin'); await shot('26-ceremony-doc');
let k=0; while (await p.getByText('Sign And Continue',{exact:true}).count()) {
 await p.locator('.paper .scroll').evaluate(e=>e.scrollTop=e.scrollHeight); await p.waitForTimeout(300);
 if (await p.locator('.consent input').count()) { await p.locator('.consent input').check(); }
 else { await p.locator('.pad').scrollIntoViewIfNeeded(); await p.evaluate(()=>scrollBy(0,120)); const b2=await p.locator('.pad canvas').boundingBox(); await p.mouse.move(b2.x+30,b2.y+100); await p.mouse.down(); for(let i=0;i<30;i++) await p.mouse.move(b2.x+30+i*8,b2.y+90-Math.cos(i/3)*25); await p.mouse.up(); }
 if(k++===0) await shot('27-ceremony-signed'); await tap('Sign And Continue'); }
await shot('28-done'); await tap('Hand Back To The Desk'); await shot('29-packet-signed');
await tap('Complete Sale'); await shot('30-sales-after',1200);
await p.goto('http://localhost:8767/index.html#/reach'); await shot('31-reach',1200);
await p.goto('http://localhost:8767/index.html#/reach/marketplace'); await shot('32-marketplace',1200);
// the bill of sale, full page, desktop
const d=await b.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2}); await fonts(d); const q=await d.newPage();
await q.goto('http://localhost:8767/index.html'); await q.waitForTimeout(800); await q.getByLabel('Texas').click(); await q.waitForSelector('text=licensed Texas dealers');
await q.fill('input[placeholder="Start typing its name"]','triple j auto investment'); await q.getByText('Triple J Auto Investment LLC',{exact:true}).first().click(); await q.waitForTimeout(600);
await q.locator('.choice',{hasText:'Text'}).first().click(); await q.waitForTimeout(600); await q.locator('.code input').fill('123456'); await q.waitForTimeout(1100);
await q.getByText('Continue',{exact:true}).click(); await q.waitForTimeout(500); await q.locator('.swatch').nth(2).click(); await q.getByText('Continue',{exact:true}).click(); await q.waitForTimeout(500);
await q.locator('.sys').first().click(); await q.waitForTimeout(300); await q.locator('.dock .btn.primary').click(); await q.waitForTimeout(1200);
await q.evaluate(()=>{const s=document.querySelector('.paper .scroll'); s.style.maxHeight='none'; document.querySelector('.dock')?.remove();}); await q.waitForTimeout(300);
await (await q.$('.paper .sheet')).screenshot({path:`${OUT}/bos-full.png`});
console.log(errs.join('\n')||'no errors'); await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
