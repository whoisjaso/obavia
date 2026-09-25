/* ============================================================
   OBAVIA · shared page engine
   Sound, sky, reveals, counters, the funnel line, scroll scenes,
   the mobile menu and page transitions. No libraries.
   ============================================================ */
(() => {
const OBV = window.OBV = window.OBV || {};
const root = document.documentElement;
const HOST = root.dataset.host === 'home';          // the home page brings its own film, nav and sound
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
root.classList.add('js');
const clamp = (v,a=0,b=1) => v<a?a:v>b?b:v;
const ramp = (t,a,b) => clamp((t-a)/(b-a));
const eo = k => 1-Math.pow(1-k,3);
const eio = k => k<.5 ? 4*k*k*k : 1-Math.pow(-2*k+2,3)/2;
const lerp = (a,b,k) => a+(b-a)*k;
const $ = (s,c=document) => c.querySelector(s), $$ = (s,c=document) => [...c.querySelectorAll(s)];
Object.assign(OBV, {clamp, ramp, eo, eio, lerp, REDUCED});

/* ============================================================
   SOUND: synthesized, no files. Air, glass, breath.
   Browsers allow audio only after a person interacts, so it
   fades in quietly at the first tap, click or key. No switches.
   ============================================================ */
const S = OBV.snd = {on:false, ac:null};
const host = () => HOST && window.obaviaSnd;
function init(){
  const ac = new (window.AudioContext||window.webkitAudioContext)(); S.ac = ac;
  const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); S.master = master;
  const len = ac.sampleRate*2.8, ir = ac.createBuffer(2,len,ac.sampleRate);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); }
  const verb = ac.createConvolver(); verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = .5; verb.connect(vg); vg.connect(master); S.verb = verb;
  const nb = ac.createBuffer(1,ac.sampleRate*4,ac.sampleRate), nd = nb.getChannelData(0); let b = 0;
  for(let i=0;i<nd.length;i++){ b=.985*b+.015*(Math.random()*2-1); nd[i]=b*5; } S.noise = nb;
  const src = ac.createBufferSource(); src.buffer = nb; src.loop = true;          // air, breathing through a lowpass
  const lp = ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 400;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value=.06; lg.gain.value=160; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const ag = ac.createGain(); ag.gain.value = .045; src.connect(lp); lp.connect(ag); ag.connect(master); src.start();
}
const out = g => { g.connect(S.master); g.connect(S.verb); };
const live = () => S.on && S.ac;
S.chime = (f,gain=.05) => { const h=host(); if(h) return h.chime(f,gain); if(!live()) return;
  const ac=S.ac, t0=ac.currentTime+.01, g=ac.createGain(); out(g);
  g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(gain,t0+.012); g.gain.exponentialRampToValueAtTime(.0001,t0+2.6);
  [[f,1,'sine'],[f*2.76,.22,'sine'],[f/2,.18,'triangle']].forEach(([fr,a,ty])=>{ const o=ac.createOscillator(), og=ac.createGain(); o.type=ty; o.frequency.value=fr; og.gain.value=a; o.connect(og); og.connect(g); o.start(t0); o.stop(t0+2.7); }); };
S.whoosh = (dur=1.4,gain=.05,f0=300,f1=1400) => { const h=host(); if(h) return h.whoosh(dur,gain,f0,f1); if(!live()) return;
  const ac=S.ac, t0=ac.currentTime+.01, s=ac.createBufferSource(); s.buffer=S.noise;
  const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=.8;
  bp.frequency.setValueAtTime(f0,t0); bp.frequency.exponentialRampToValueAtTime(f1,t0+dur*.55); bp.frequency.exponentialRampToValueAtTime(f0*1.6,t0+dur);
  const g=ac.createGain(); g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(gain,t0+dur*.45); g.gain.linearRampToValueAtTime(0,t0+dur);
  s.connect(bp); bp.connect(g); out(g); s.start(t0,Math.random()*2); s.stop(t0+dur+.1); };
S.pad = (freqs,dur=6,gain=.018) => { const h=host(); if(h) return h.pad(freqs,dur,gain); if(!live()) return;
  const ac=S.ac, t0=ac.currentTime+.02, lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1300;
  const g=ac.createGain(); g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(1,t0+1.4); g.gain.setValueAtTime(1,t0+dur-2.2); g.gain.linearRampToValueAtTime(0,t0+dur);
  lp.connect(g); out(g);
  freqs.forEach(f=>[0,-6,6].forEach(dt=>{ const o=ac.createOscillator(), og=ac.createGain(); o.type=dt?'triangle':'sine'; o.frequency.value=f; o.detune.value=dt; og.gain.value=dt?gain*.35:gain; o.connect(og); og.connect(lp); o.start(t0); o.stop(t0+dur+.1); })); };
S.tick = (f=2400,gain=.012) => { const h=host(); if(h) return h.tick(f,gain); if(!live()) return;
  const ac=S.ac, t0=ac.currentTime+.005, o=ac.createOscillator(), g=ac.createGain();
  o.frequency.value=f; g.gain.setValueAtTime(gain,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+.07); o.connect(g); g.connect(S.master); o.start(t0); o.stop(t0+.09); };
S.key = () => { if(host()) return host().tick(1700+Math.random()*900,.008); if(!live()) return;   // a soft key, for typing
  const ac=S.ac, t0=ac.currentTime+.004, s=ac.createBufferSource(); s.buffer=S.noise;
  const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2600+Math.random()*1800; bp.Q.value=2.2;
  const g=ac.createGain(); g.gain.setValueAtTime(.05,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+.035);
  s.connect(bp); bp.connect(g); g.connect(S.master); s.start(t0,Math.random()*3); s.stop(t0+.05); };
S.good = () => { S.chime(1318.5,.03); setTimeout(()=>S.chime(1975.5,.018),90); };        // a stage that holds: a bright fifth
S.leak = () => { S.chime(659.25,.014); if(host()) return host().pad([164.81,246.94],2.6,.02); if(!live()) return;   // a stage that leaks: low, calm
  const ac=S.ac, t0=ac.currentTime+.01, o=ac.createOscillator(), g=ac.createGain(), lp=ac.createBiquadFilter();
  o.type='sine'; o.frequency.setValueAtTime(196,t0); o.frequency.exponentialRampToValueAtTime(164.81,t0+.6);
  lp.type='lowpass'; lp.frequency.value=700; g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.07,t0+.04); g.gain.exponentialRampToValueAtTime(.0001,t0+1.6);
  o.connect(lp); lp.connect(g); out(g); o.start(t0); o.stop(t0+1.7); };
S.duck = on => { if(!S.ac||!S.master) return; S.master.gain.setTargetAtTime(on?0:(S.on?.75:0),S.ac.currentTime,.25); };   // quiet while a film plays
S.arrive = () => { S.pad([130.81,196,261.63,329.63,392],6.5,.016); S.chime(1046.5,.04); setTimeout(()=>S.chime(1567.98,.028),170); };
const NOTES = [523.25,587.33,659.25,783.99,880,1046.5,1174.66];
S.note = (i,g=.035) => S.chime(NOTES[((i%NOTES.length)+NOTES.length)%NOTES.length],g);
let lastAir = 0;
S.air = () => { const n=performance.now(); if(n-lastAir<1400) return; lastAir=n; S.whoosh(1.3,.028,420,1150); };

if(!HOST){
  const wake = () => {
    removeEventListener('pointerdown',wake,true); removeEventListener('keydown',wake,true);
    try{ if(!S.ac) init(); S.on=true; S.ac.resume(); S.master.gain.setTargetAtTime(.75,S.ac.currentTime,.8); }catch(e){}
  };
  addEventListener('pointerdown',wake,true); addEventListener('keydown',wake,true);
  document.addEventListener('visibilitychange',()=>{ if(!S.ac) return; document.hidden?S.ac.suspend():S.on&&S.ac.resume(); });
  addEventListener('pageshow',()=>{ if(S.ac&&S.on) S.ac.resume(); });
  document.addEventListener('pointerdown',e=>{ if(e.target.closest('a,button,summary')) S.tick(1900,.012); },{passive:true});
}

/* ============================================================
   SKY, NAV, MENU, TRANSITIONS
   ============================================================ */
if(!HOST && !$('.skybg')){
  document.body.insertAdjacentHTML('afterbegin','<div class="skybg" aria-hidden="true"><span class="sun"></span><i></i><i></i><i></i><i></i></div><div class="grainfx" aria-hidden="true"></div><div class="progress" aria-hidden="true"></div>');
}
const nav = $('#nav'), prog = $('.progress');
const menuBtn = $('.menu-btn'), sheet = $('.sheet');
if(menuBtn && sheet){
  const setMenu = on => {
    root.classList.toggle('menu-open',on); menuBtn.setAttribute('aria-expanded',on);
    sheet.setAttribute('aria-hidden',!on); sheet.inert = !on;
    if(on){ S.whoosh(.9,.04,500,1500); setTimeout(()=>S.note(4,.025),160); $('a',sheet)?.focus({preventScroll:true}); }
    else S.tick(1500,.01);
  };
  sheet.inert = true;
  menuBtn.addEventListener('click',()=>setMenu(!root.classList.contains('menu-open')));
  addEventListener('keydown',e=>{ if(e.key==='Escape' && root.classList.contains('menu-open')){ setMenu(false); menuBtn.focus(); } });
  $$('a',sheet).forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  addEventListener('resize',()=>{ if(innerWidth>860 && root.classList.contains('menu-open')) setMenu(false); });
}
// between pages: a breath of air, and a soft fade where the browser can't cross-fade documents itself
const crossDoc = 'onpagereveal' in window;
document.addEventListener('click',e=>{
  const a = e.target.closest('a[href]'); if(!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  const url = new URL(a.href, location.href);
  if(url.origin!==location.origin || !/\.html?$|\/$/.test(url.pathname) || (url.pathname===location.pathname && url.hash)) return;
  S.whoosh(.8,.035,380,1300);
  if(crossDoc || REDUCED) return;
  e.preventDefault(); document.body.classList.add('leaving'); setTimeout(()=>{ location.href = url.href; },260);
});
addEventListener('pageshow',()=>document.body.classList.remove('leaving'));

/* ============================================================
   TEXT: split headings, reveals, counters, typing
   ============================================================ */
function split(el){
  let i = 0;
  const walk = node => {
    [...node.childNodes].forEach(ch=>{
      if(ch.nodeType===3){
        const parts = ch.textContent.split(/(\s+)/); if(!ch.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        parts.forEach(p=>{ if(!p) return; if(/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
          else { const s=document.createElement('span'); s.className='w'; s.style.setProperty('--i',i++); s.textContent=p; frag.appendChild(s); } });
        ch.replaceWith(frag);
      } else if(ch.nodeType===1 && !ch.classList.contains('w')) walk(ch);
    });
  };
  walk(el);
}
$$('[data-split]').forEach(split);

const io = 'IntersectionObserver' in window ? new IntersectionObserver(es=>{
  for(const e of es){ if(!e.isIntersecting) continue;
    const el=e.target; el.classList.add('in'); io.unobserve(el);
    if(el.matches('.head,[data-air]')) S.air();
    el.dispatchEvent(new Event('revealed')); }
},{threshold:.16, rootMargin:'0px 0px -6% 0px'}) : null;
OBV.reveal = el => io ? io.observe(el) : (el.classList.add('in'), el.dispatchEvent(new Event('revealed')));
if(!HOST) $$('[data-reveal],[data-split]').forEach(OBV.reveal);
else $$('[data-split]').forEach(OBV.reveal);
OBV.onReveal = (el,fn,th=.35) => {
  if(!('IntersectionObserver' in window)) return fn();
  const o = new IntersectionObserver(es=>{ if(es[0].isIntersecting){ o.disconnect(); fn(); } },{threshold:th}); o.observe(el);
};

const FMT = {
  int: v => Math.round(v).toLocaleString('en-US'),
  money: v => '$'+Math.round(v).toLocaleString('en-US'),
  k: v => v>=1e6 ? '$'+(v/1e6).toFixed(v>=1e7?1:2).replace(/\.?0+$/,'')+'M' : v>=1e3 ? '$'+Math.round(v/1e3)+'K' : '$'+Math.round(v),
  pct: v => Math.round(v)+'%',
  dec: v => v.toFixed(1),
};
OBV.fmt = FMT;
OBV.count = (el,to,{from=0,dur=900,fmt='int',sound=true}={}) => {
  const f = FMT[fmt]||FMT.int;
  if(REDUCED){ el.textContent=f(to); return; }
  const t0 = performance.now(); let lt = 0;
  (function up(n){ const k=eo(clamp((n-t0)/dur)); el.textContent=f(lerp(from,to,k));
    if(sound && n-lt>95 && k<1){ lt=n; S.tick(2200+k*900,.009); }
    if(k<1) requestAnimationFrame(up); })(t0);
};
$$('[data-count]').forEach(el=>{
  const to=+el.dataset.count, fmt=el.dataset.fmt||'int'; el.textContent=(FMT[fmt]||FMT.int)(+el.dataset.from||0);
  OBV.onReveal(el,()=>setTimeout(()=>OBV.count(el,to,{fmt,from:+el.dataset.from||0,dur:+el.dataset.dur||1100}), +el.dataset.delay||0),.6);
});
OBV.type = (el,text,{cps=38,sound=true}={}) => new Promise(res=>{
  if(REDUCED){ el.textContent=text; return res(); }
  let i=0; el.textContent=''; el.classList.add('typing');
  const step = () => { i++; el.textContent=text.slice(0,i); if(sound && text[i-1]!==' ' && i%2) S.key();
    if(i<text.length) setTimeout(step, 1000/cps*(/[.,]/.test(text[i-1])?5:1)); else { el.classList.remove('typing'); res(); } };
  step();
});
OBV.wait = ms => new Promise(r=>setTimeout(r,ms));

/* ============================================================
   THE FUNNEL LINE
   Volume becomes the thickness of one ribbon. What falls off at
   each stage drifts away. Each conversion wears a halo against
   its own benchmark, and the end is the blend: revenue per lead.
   ============================================================ */
const BENCH = [{w:45,s:65},{w:55,s:75},{w:55,s:78},{w:20,s:38},{w:80,s:95}];
const HLAB = {good:'Strong', norm:'On pace', leak:'Leak'};
const HCOL = {good:'#96E0BA', norm:'#C8D6FC', leak:'#F5C593'};
const HTINT = {good:'118,214,166', leak:'244,178,112'};
OBV.health = (i,pct,bench=BENCH) => { const b=bench[i]||{w:-1,s:999}; return pct<b.w?'leak':pct>=b.s?'good':'norm'; };
OBV.blend = hs => `conic-gradient(from 200deg, ${[...hs,'norm'].map(h=>HCOL[h]).join(', ')}, ${HCOL[hs[0]||'norm']})`;
const FUNNELS = [];
OBV.funnel = (el,cfg) => {
  const st = cfg.stages, n = st.length;
  const conv = st.slice(1).map((s,i)=>s.v/st[i].v*100);
  const hs = conv.map((c,i)=>OBV.health(i,c,cfg.bench));
  const rpl = cfg.cash/st[0].v;
  el.classList.add('fnl'); if(cfg.compact) el.classList.add('compact');
  el.setAttribute('role','img');
  el.setAttribute('aria-label',(cfg.label?cfg.label+': ':'')+st.map(s=>`${FMT.int(s.v)} ${s.n.toLowerCase()}`).join(', ')+`. ${FMT.money(rpl)} collected per lead.`);
  el.innerHTML = '<canvas aria-hidden="true"></canvas>'
    + st.map(s=>`<div class="fnl-st" aria-hidden="true"><b class="num">0</b><span>${s.n}</span></div>`).join('')
    + conv.map((c,i)=>`<div class="hp" data-h="${hs[i]}" aria-hidden="true"><b class="num">${Math.round(c)}%</b><span>${HLAB[hs[i]]}</span></div>`).join('')
    + `<div class="fnl-end" aria-hidden="true"><div class="orb" style="--blend:${OBV.blend(hs)};--os:${cfg.compact?64:104}px"><b class="num">${FMT.money(rpl)}</b></div><span>${cfg.endLabel||'per lead'}</span></div>`;
  const cv = $('canvas',el), ctx = cv.getContext('2d');
  const labs = $$('.fnl-st',el), pills = $$('.hp',el), end = $('.fnl-end',el);
  const F = {el, cfg, conv, hs, rpl, p:0, shown:-1, fired:-1, vis:false, parts:[], last:performance.now(), L:null};

  function layout(){
    const w = el.clientWidth, compact = !!cfg.compact, vert = w < (compact ? 460 : 560);
    const L = {w, vert, compact}; el.classList.toggle('vert', vert);
    if(!vert){
      L.axis = compact ? 64 : 158; L.T = compact ? 40 : Math.min(116, w*.1);
      const endW = compact ? 96 : 176, x0 = compact ? 26 : 44, xN = w-endW-(compact?8:22);
      L.pos = st.map((_,i)=>x0+i*(xN-x0)/(n-1));
      L.endX = w-endW/2+(compact?4:0); L.endY = L.axis;
      L.h = compact ? 150 : 330;
      labs.forEach((l,i)=>{ l.style.left=L.pos[i]+'px'; l.style.top=(L.axis-L.T/2-(compact?34:70))+'px'; l.style.textAlign='center'; l.style.transform=''; });
      pills.forEach((p,i)=>{ p.style.left=((L.pos[i]+L.pos[i+1])/2)+'px'; p.style.top=(L.axis+L.T/2+(compact?12:22))+'px'; });
    } else {
      L.axis = compact ? 46 : 58; L.T = compact ? 62 : 78; const y0 = compact ? 34 : 44, dy = compact ? 78 : 98;
      L.pos = st.map((_,i)=>y0+i*dy);
      L.endX = w/2; L.endY = L.pos[n-1]+(compact?118:150); L.h = L.endY+(compact?76:96);
      labs.forEach((l,i)=>{ l.style.left=(L.axis+L.T/2+22)+'px'; l.style.top=(L.pos[i]-22)+'px'; l.style.textAlign='left'; l.style.transform='none'; });
      pills.forEach((p,i)=>{ p.style.left=(w-44)+'px'; p.style.top=((L.pos[i]+L.pos[i+1])/2-21)+'px'; });
    }
    end.style.left=L.endX+'px'; end.style.top=L.endY+'px';
    L.th = st.map(s=>L.T*(.14+.86*Math.sqrt(s.v/st[0].v)));
    L.start = L.pos[0]-(vert?20:22); L.stop = L.pos[n-1]; L.total = (L.stop-L.start) + (vert ? Math.hypot(L.endX-L.axis,L.endY-60-L.stop)+60 : (L.endX-(compact?32:52))-L.stop);
    el.style.height = L.h+'px';
    const dpr = Math.min(devicePixelRatio||1,2); cv.width=Math.round(w*dpr); cv.height=Math.round(L.h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    F.L = L; F.parts.length = 0; seed();
  }
  const thAt = s => { const L=F.L; if(s<=L.pos[0]) return L.th[0]; if(s>=L.stop) return L.th[n-1];
    let i=0; while(i<n-2 && s>L.pos[i+1]) i++; const k=(s-L.pos[i])/(L.pos[i+1]-L.pos[i]); const e=k*k*(3-2*k); return lerp(L.th[i],L.th[i+1],e); };
  // map (along, across) to x,y
  const P = (a,c) => F.L.vert ? [F.L.axis+c, a] : [a, F.L.axis+c];
  const tailPt = k => { const L=F.L;
    if(!L.vert){ const x=lerp(L.stop,L.endX-(L.compact?32:52),k); return [x,L.axis]; }
    const x0=L.axis, y0=L.stop, x1=L.endX, y1=L.endY-60, u=1-k;
    return [u*u*u*x0+3*u*u*k*x0+3*u*k*k*x1+k*k*k*x1, u*u*u*y0+3*u*u*k*(y0+60)+3*u*k*k*(y1-40)+k*k*k*y1]; };
  const tailLen = () => F.L.total-(F.L.stop-F.L.start);

  function seed(){
    const N = REDUCED ? 0 : F.L.compact ? 22 : F.L.vert ? 34 : 56;
    for(let j=0;j<N;j++){ const p=spawn(); p.s=F.L.start+Math.random()*(F.L.total); F.parts.push(p); }
  }
  function spawn(){
    const L=F.L, r=Math.random(); let die=-1;
    for(let i=1;i<n;i++) if(r>st[i].v/st[0].v){ die=i; break; }
    return {s:L.start, off:(Math.random()-.5)*.8, v:(L.compact?34:58)*(.7+Math.random()*.6),
      dieAt: die<0 ? Infinity : lerp(L.pos[die-1],L.pos[die],.3+.45*Math.random()), seg:die-1, dead:0, dx:0, dy:0, r:1.3+Math.random()*1.1};
  }
  function draw(dt){
    const L=F.L; if(!L) return;
    ctx.clearRect(0,0,L.w,L.h);
    const reach = L.start + F.p*L.total;                  // how much of the line exists
    const ribEnd = Math.min(reach, L.stop);
    if(ribEnd>L.start){
      // the ribbon
      const top=[], bot=[], steps=Math.max(24,Math.round((ribEnd-L.start)/5));
      for(let k=0;k<=steps;k++){ const s=lerp(L.start,ribEnd,k/steps), h=thAt(s)/2; top.push(P(s,-h)); bot.push(P(s,h)); }
      ctx.beginPath(); top.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y)); for(let k=bot.length-1;k>=0;k--) ctx.lineTo(bot[k][0],bot[k][1]); ctx.closePath();
      const [gx0,gy0]=P(L.start,0), [gx1,gy1]=P(L.stop,0), g=ctx.createLinearGradient(gx0,gy0,gx1,gy1);
      g.addColorStop(0,'rgba(214,225,253,.95)'); g.addColorStop(.55,'rgba(176,195,240,.95)'); g.addColorStop(1,'rgba(125,151,199,.95)');
      ctx.fillStyle=g; ctx.fill();
      // health: each segment glows against its own benchmark
      ctx.save(); ctx.clip();
      hs.forEach((h,i)=>{ if(h==='norm') return; const a=L.pos[i], b=L.pos[i+1]; if(ribEnd<=a) return;
        const [ax,ay]=P(a,0), [bx,by]=P(b,0), tg=ctx.createLinearGradient(ax,ay,bx,by), c=HTINT[h];
        tg.addColorStop(0,`rgba(${c},0)`); tg.addColorStop(.5,`rgba(${c},${h==='leak'?.75:.6})`); tg.addColorStop(1,`rgba(${c},0)`);
        ctx.fillStyle=tg; const T=L.T; if(L.vert) ctx.fillRect(L.axis-T,a,T*2,Math.min(b,ribEnd)-a); else ctx.fillRect(a,L.axis-T,Math.min(b,ribEnd)-a,T*2); });
      ctx.restore();
      // a glassy edge
      ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1.2; ctx.beginPath(); top.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
      ctx.strokeStyle='rgba(40,52,79,.10)'; ctx.lineWidth=1; ctx.beginPath(); bot.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
      // stage marks
      L.pos.forEach((s,i)=>{ if(s>ribEnd+.5) return; const h=thAt(s)/2, [x0,y0]=P(s,-h-3), [x1,y1]=P(s,h+3);
        ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); });
    }
    // the thin line into the result
    const tl = tailLen(), tk = clamp((reach-L.stop)/tl);
    if(tk>0){ ctx.strokeStyle='rgba(125,151,199,.9)'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.beginPath();
      for(let k=0;k<=24;k++){ const [x,y]=tailPt(tk*k/24); k?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.stroke(); }
    // the leads themselves: most keep going, some fall away where the stage leaks
    for(const p of F.parts){
      if(F.vis && !REDUCED){
        if(!p.dead){ p.s+=p.v*dt; if(p.s>=p.dieAt){ p.dead=.0001; const sgn=p.off<0?-1:1; p.dx=sgn*(10+Math.random()*16); p.dy=6+Math.random()*10; } }
        else p.dead+=dt;
        if(p.dead>1.1 || p.s>L.start+L.total){ Object.assign(p,spawn()); continue; }
      }
      if(p.s>reach) continue;
      let x,y,a=.62;
      if(p.s<=L.stop){ const h=thAt(Math.min(p.s,L.stop))/2*p.off; [x,y]=P(p.s,h); }
      else { [x,y]=tailPt(clamp((p.s-L.stop)/tl)); a=.8; }
      if(p.dead){ const k=p.dead/1.1; const dd=eo(k); if(L.vert){ x+=p.dx*dd*1.6; y+=p.dy*dd*.4; } else { y+=(p.off<0?-1:1)*(p.dy+8)*dd; x+=p.dx*.3*dd; } a*=1-k;
        const c = hs[p.seg]==='leak' ? '214,140,70' : '125,151,199'; ctx.fillStyle=`rgba(${c},${a})`; }
      else ctx.fillStyle=`rgba(40,52,79,${a})`;
      ctx.beginPath(); ctx.arc(x,y,p.r,0,Math.PI*2); ctx.fill();
    }
  }
  // what the line has reached: counts, halos, the result
  function reached(){
    const L=F.L, reach=L.start+F.p*L.total;
    let k=-1; L.pos.forEach((s,i)=>{ if(reach>=s-2) k=i; });
    const pillK = L.pos.slice(1).reduce((a,s,i)=>reach>=(L.pos[i]+s)/2?i:a,-1);
    const loud = F.vis && cfg.sound!==false, heard = F.heard || (F.heard = new Set());
    const once = (key,fn) => { if(!heard.has(key)){ heard.add(key); if(loud) fn(); } };
    labs.forEach((l,i)=>{ const on=i<=k;
      if(on&&!l.classList.contains('on')){ l.classList.add('on'); OBV.count($('b',l),st[i].v,{dur:700,sound:false}); once('s'+i,()=>S.note(i,.03)); }
      else if(!on) l.classList.remove('on'); });
    pills.forEach((p,i)=>{ const on=i<=pillK;
      if(on&&!p.classList.contains('on')){ p.classList.add('on'); setTimeout(()=>p.classList.contains('on')&&p.classList.add('lit'),320);
        const h=hs[i]; once('p'+i,()=>setTimeout(()=>h==='good'?S.good():h==='leak'?S.leak():S.tick(1800,.014),260)); }
      else if(!on) p.classList.remove('on','lit'); });
    const done = F.p>=.985; F.k = k; F.done = done;
    if(done && !end.classList.contains('on')){ end.classList.add('on'); once('end',S.arrive); } else if(!done) end.classList.remove('on');
  }
  F.set = p => { F.p = clamp(p); reached(); if(REDUCED||!F.vis) draw(0); };
  F.play = (dur=2800) => new Promise(res=>{
    if(REDUCED){ F.set(1); return res(); }
    const t0=performance.now(), p0=F.p;
    (function go(nw){ const k=clamp((nw-t0)/dur); F.set(lerp(p0,1,eio(k))); if(k<1) requestAnimationFrame(go); else res(); })(t0);
  });
  F.frame = now => { const dt=Math.min(.05,(now-F.last)/1000); F.last=now; if(F.vis) draw(dt); };
  layout();
  if(window.ResizeObserver){ let pw=el.clientWidth; new ResizeObserver(()=>{ if(el.clientWidth!==pw){ pw=el.clientWidth; layout(); reached(); draw(0); } }).observe(el); }
  if('IntersectionObserver' in window) new IntersectionObserver(e=>{ F.vis=e[0].isIntersecting; },{rootMargin:'80px'}).observe(el); else F.vis=true;
  if(cfg.auto!==false) OBV.onReveal(el,()=>setTimeout(()=>F.play(cfg.dur),cfg.delay||200),.4);
  draw(0);
  FUNNELS.push(F);
  return F;
};

/* ============================================================
   SCROLL SCENES: a pinned stage reports 0..1 as you pass through
   ============================================================ */
const SCENES = [];
OBV.scrolly = (el,fn) => { SCENES.push({el,fn,p:-1}); };
OBV.sprog = el => { const r=el.getBoundingClientRect(), span=r.height-innerHeight; return span>0?clamp(-r.top/span):clamp((innerHeight-r.top)/(innerHeight+r.height)); };
OBV.frame = [];

let lastY = -1;
function frame(now){
  requestAnimationFrame(frame);
  const y = scrollY;
  if(!HOST && y!==lastY){
    nav && nav.classList.toggle('solid', y>24);
    if(prog){ const max=document.documentElement.scrollHeight-innerHeight; prog.style.transform=`scaleX(${max>0?(y/max).toFixed(4):0})`; }
    $$('[data-par]').forEach(el=>{ const r=el.getBoundingClientRect(), c=(r.top+r.height/2-innerHeight/2); el.style.transform=`translate3d(0,${(-c*(+el.dataset.par||.08)).toFixed(1)}px,0)`; });
  }
  if(y!==lastY || SCENES.some(s=>s.p<0)){ for(const s of SCENES){ const p=OBV.sprog(s.el); if(Math.abs(p-s.p)>.0005){ s.p=p; s.fn(p); } } }
  lastY = y;
  for(const F of FUNNELS) F.frame(now);
  for(const f of OBV.frame) f(now);
}
requestAnimationFrame(frame);
})();
