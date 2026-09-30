import {audioConfig} from './audio-config.mjs';
import {DURATION, boundaries, stageAt, examples, demoMatch, heardMentions} from './demo-data.mjs';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let current = 'babe', seconds = 0, stage = -1, playing = false, raf = 0, motionPaused = reduce.matches, role = 'rep';
let manifest=null, track=null, totalDuration=DURATION, stageBoundaries=boundaries, captions=true, playAttempt=0;
const audio=$('#dialogue');
const drafts = {};
const flyingAnimations = new Set();
function clearFlying(){for(const animation of flyingAnimations)animation.cancel();flyingAnimations.clear();$$('.flying-token').forEach(el=>el.remove());$('#evidence-target')?.classList.remove('receiving');}
const escape = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt = n => `${Math.floor(n/60)}:${String(Math.floor(n)%60).padStart(2,'0')}`;
for(let i=0;i<44;i++) {const star=document.createElement('i');star.className=`star ${i%9===0?'glint':''}`;star.style.cssText=`left:${(i*37.31)%100}%;top:${(i*17.17)%100}%;--duration:${22+i%19}s;animation-delay:-${i}s`;$('.stars').append(star);}
for(let i=0;i<76;i++){const bar=document.createElement('i');bar.style.cssText=`--h:${6+(i*19%23)}px;--delay:-${i*.11}s`;$('.wave').append(bar);}
let readingLines=[];
function buildReadingLines(words,speech){
 const transcriptBox=$('#transcript'),box=transcriptBox.getBoundingClientRect();
 transcriptBox.querySelector('.reading-underline')?.remove();
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('reading-underline');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height+7}`);svg.style.height=(box.height+7)+'px';
 readingLines=[];
 for(const word of words){const r=word.getBoundingClientRect(),top=Math.round(r.top);let line=readingLines.at(-1);if(!line||Math.abs(line.top-top)>3){line={top,words:[],positions:[],start:speech[+word.dataset.word]?.startMs??0,end:0};readingLines.push(line);}line.words.push(word);line.positions.push({left:r.left-box.left,right:r.right-box.left,bottom:r.bottom-box.top});line.end=speech[+word.dataset.word]?.endMs??line.start+500;}
 readingLines.forEach((line,i)=>{line.left=line.positions[0].left;line.right=line.positions.at(-1).right;line.width=line.right-line.left;const path=document.createElementNS(ns,'path');const y=line.positions[0].bottom+2;path.setAttribute('d',`M ${line.left} ${y} H ${line.right}`);path.setAttribute('pathLength','1');path.dataset.line=String(i);svg.append(path);line.path=path;});
 transcriptBox.append(svg);
}
function drawReadingUnderline(ms,speech,show){
 const svg=$('#transcript .reading-underline');if(!svg)return;
 svg.style.opacity=show?'1':'0';
 readingLines.forEach(line=>{let x=line.left;
  line.words.forEach((word,i)=>{const timing=speech[+word.dataset.word];if(!timing||ms<=timing.startMs)return;const from=line.positions[i].left,to=line.positions[i+1]?.left??line.right;const progress=Math.max(0,Math.min(1,(ms-timing.startMs)/(timing.endMs-timing.startMs)));x=Math.max(x,from+(to-from)*progress);});
  const progress=Math.max(0,Math.min(1,(x-line.left)/Math.max(1,line.width)));line.path.style.strokeDashoffset=String(1-progress);line.path.dataset.progress=progress.toFixed(4);line.path.style.opacity=progress>=1?'.55':'1';
 });
}

function transcript(){
 const e=examples[current], responding=stage===3, repName=current==='babe'?'Jordan':'Avery';let text=responding?e.response:e.quote, index=0;
 const phrases=responding?[]:e.highlights;const matches=phrases.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length);
 const re=matches.length?new RegExp(`(${matches.join('|')})`,'g'):null;
 const wordMarkup=part=>part.split(/(\s+)/).map(word=>/[a-zA-Z]/.test(word)?`<span class="word" data-word="${index++}">${escape(word)}</span>`:/\S/.test(word)?`<span class="reading-punctuation">${escape(word)}</span>`:escape(word)).join('');
 $('#transcript').innerHTML='<span class="reading-quote quote-open">“</span>'+(re?text.split(re):[text]).map(part=>phrases.includes(part)?`<mark class="${part===e.key?'selected-key':''}" data-phrase="${escape(part)}">${wordMarkup(part)}</mark>`:`<span class="context">${wordMarkup(part)}</span>`).join('')+'<span class="reading-quote quote-close">”</span>';
 readingLines=[];
 $('#excerpt').textContent=e.source;$('#source-speaker').textContent=responding?repName:'Marcus';$('#words-title').textContent=responding?'The Rep’s Response':'The Client’s Words';
 $('.person strong').textContent=responding?`${repName} · Sales Rep`:'Marcus · Client';$('.person small').textContent=track?.audioMode==='silent'?'':`Provisional Voice · ${responding?audioConfig.rep.name:audioConfig.client.name}`;$('.avatar').textContent=responding?(current==='babe'?'JL':'AL'):'MH';$('.silent').textContent=track?.audioMode==='silent'?'':`${responding?audioConfig.rep.role:audioConfig.client.role} · Synthetic Voice`;
 const full=$('#full-transcript');if(full&&full.dataset.example!==current){full.dataset.example=current;full.innerHTML=`<summary>Read Full Dialogue</summary><p><strong>Client:</strong> ${escape(e.quote)}</p><p><strong>Rep:</strong> ${escape(e.response)}</p>`;}
}

function details(e, score=false){return `<details class="inline-details"><summary>${score?'Why This Interpretation?':'Inspect The Evidence'}</summary><blockquote>“${escape(e.support)}”</blockquote><p>${escape(e.note)}</p><p>${escape(e.link)}</p></details>`;}
function content(){const e=examples[current];
 if(stage===0&&current==='profit')return `<p class="insight-headline">Profit.<br>There it is again.</p><div class="choice-row"><span class="chosen">profit</span><span id="heard-count">3 Mentions In This Example</span></div><button class="next-step" data-next>Follow The Words <span aria-hidden="true"><svg class="control-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></span></button>`;
 if(stage===0)return `<p class="insight-headline">They could have said<br>something else.</p><div class="choice-row"><span class="chosen">${escape(e.key)}</span>${e.alternatives.map(x=>`<span>${escape(x)}</span>`).join('')}</div><button class="next-step" data-next>Follow The Words <span aria-hidden="true"><svg class="control-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></span></button>`;
 if(stage===1)return `<span class="evidence-token" id="evidence-target">${escape(e.key)}</span><span class="evidence-count" id="mention-count">${current==='profit'?'1 / 3 Mentions':'Selected Expression'}</span><p class="evidence-meaning">${escape(e.evidence)}</p>${details(e)}<button class="next-step" data-next>See The Interpretation <span aria-hidden="true"><svg class="control-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></span></button>`;
 if(stage===2)return `<p class="insight-headline">${current==='babe'?'Baseball may matter to them.':current==='profit'?'Protecting profit may matter as they add capacity.':'Their expertise may matter as they grow.'}</p>${details(e,true)}`;
 return `<details class="response-editor"><summary>Edit The Suggested Question</summary><label class="question-label" for="response">Your Question</label><textarea id="response" class="response" maxlength="500">${escape(drafts[current]??e.response)}</textarea><p class="edit-status" id="edit-status">Draft</p></details>${details(e)}`;
}
function flyWords(sources){
 if(reduce.matches||motionPaused||stage!==1)return;
 const target=$('#evidence-target');if(!target)return;
 const range=document.createRange();range.selectNodeContents(target);const end=range.getBoundingClientRect();const targetFont=parseFloat(getComputedStyle(target).fontSize);
 sources.forEach(({text,start,fontSize},i)=>{
  if(start.bottom<0||start.top>innerHeight||end.top>innerHeight||end.bottom<0)return;
  const clone=document.createElement('span');clone.className='flying-token';clone.textContent=text;clone.setAttribute('aria-hidden','true');
  clone.style.left=`${start.left}px`;clone.style.top=`${start.top}px`;clone.style.fontSize=`${fontSize}px`;clone.style.lineHeight=`${start.height}px`;document.body.append(clone);target.classList.add('receiving');const scale=targetFont/fontSize;
  const animation=clone.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${end.left-start.left}px,${end.top-start.top}px) scale(${scale})`,opacity:1,offset:.82},{transform:`translate(${end.left-start.left}px,${end.top-start.top}px) scale(${scale})`,opacity:0}],{duration:800,delay:i*70,easing:'cubic-bezier(.22,1,.36,1)'});
  flyingAnimations.add(animation);if(playing){animation.pause();animation.currentTime=0;}
  animation.finished.catch(()=>{}).finally(()=>{flyingAnimations.delete(animation);clone.remove();if(!flyingAnimations.size)target.classList.remove('receiving');});
 });
}
function render(animate=false){const nextStage=stageAt(seconds,stageBoundaries), changed=stage!==nextStage;const sources=changed&&nextStage===1?$$('#transcript mark.selected-key').map(mark=>{const range=document.createRange();range.selectNodeContents(mark);return{text:mark.textContent,start:range.getBoundingClientRect(),fontSize:parseFloat(getComputedStyle(mark).fontSize)};}):[];if(changed)clearFlying();stage=nextStage;
 $('#timeline').value=seconds;$('#elapsed').textContent=`${fmt(seconds)} / ${fmt(totalDuration)}`;$('#timeline').setAttribute('aria-valuetext',`${fmt(seconds)}, ${['Listen','Evidence','Interpret','Respond'][stage]}`);$('#source-time').textContent=fmt(seconds);
 if(changed){transcript();$('#insight').innerHTML=content();$('#stage-count').textContent=`0${stage+1} / 04`;$$('.stages [data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.stage===stage)));$('#transcript').classList.toggle('focus-words',stage===1||stage===2);if(animate)flyWords(sources);}
 if(playing&&stage===1)for(const animation of flyingAnimations){const elapsed=(seconds-stageBoundaries[1])*1000;const end=animation.effect.getComputedTiming().endTime;if(elapsed>=end)animation.finish();else animation.currentTime=Math.max(0,elapsed);}
 const speech=track?(stage===3?track.repWords:track.clientWords):[];
 const active=speech.findIndex(w=>seconds*1000>=w.startMs&&seconds*1000<w.endMs);
 const reading=(stage===0||stage===3)&&track&&!reduce.matches&&!motionPaused;
 const words=$$('#transcript [data-word]');
 if(reading&&!readingLines.length)buildReadingLines(words,speech);
 const ms=seconds*1000,smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 let envelope=0;
 if(reading){
  readingLines.forEach((line,i)=>{const fade=Math.min(650,Math.max(350,(line.end-line.start)*.45));const opacity=smooth((ms-line.start)/fade);line.words.forEach(word=>{word.style.opacity=String(opacity);word.dataset.readingLine=String(i);word.classList.remove('active-word');});
   envelope=Math.max(envelope,smooth((ms-line.start)/220)*smooth((line.end-ms)/180));
  });
 }else words.forEach(word=>{word.style.opacity='1';word.classList.remove('active-word');});
 $$('#transcript .reading-punctuation').forEach(punctuation=>{const before=words.filter(word=>word.compareDocumentPosition(punctuation)&Node.DOCUMENT_POSITION_FOLLOWING).at(-1);punctuation.style.opacity=before?.style.opacity||'1';});
 $('#transcript .quote-open').style.opacity=words[0]?.style.opacity||'1';
 $('#transcript .quote-close').style.opacity=words.at(-1)?.style.opacity||'1';
 $('#listener').classList.toggle('line-reading',!!reading);
 $('#listener').dataset.readingLines=String(readingLines.length);
 drawReadingUnderline(ms,speech,!!reading);
 for(const word of speech){if(/[,.!?;:]$/.test(word.text)){const distance=Math.abs(ms-word.endMs);if(distance<120)envelope*=.35+.65*smooth(distance/120);}}
 const speaking=!!reading&&playing&&envelope>.015;
 $('#listener').classList.toggle('speaking',speaking);
 const body=$('.listener-body');body.style.opacity=reduce.matches||motionPaused||!playing||seconds===0?'1':String(Math.min(smooth(seconds/.35),smooth((totalDuration-seconds)/.35)));
 if(stage===0&&current==='profit'&&track&&$('#heard-count'))$('#heard-count').textContent=playing?`${heardMentions(track.clientWords,'profit',seconds*1000)} / 3 Mentions ${track.audioMode==='silent'?'Shown':'Heard'}`:'3 Mentions In This Example';
 if(stage===1&&current==='profit')$('#mention-count').textContent='3 / 3 Mentions';
 const returning=!!track&&stage===0&&seconds>=track.clientDuration;
 $('#listener').classList.toggle('returning',returning);
 const nextBeat=returning?'return':(['listen','evidence','interpret','respond'][stage]);
 if($('#listener').dataset.beat!==nextBeat)$('#listener').dataset.beat=nextBeat;
 $$('#transcript mark').forEach(m=>m.classList.toggle('recalled',returning&&m.dataset.phrase===examples[current].key));
 if(playing&&track)$('#audio-status').textContent=returning?'Return To Their Chosen Words · Take A Closer Look':stage===1?'Evidence · Time To Read':stage===2?'Possible Interpretation · Time To Consider':track.audioMode==='silent'?'Playing Captions':'Playing';
 $$('.wave i').forEach((bar,i)=>{bar.style.transform=`scaleY(${.08+(speaking?envelope*(.2+.65*Math.abs(Math.sin(seconds*7+i*.71))):0)})`;bar.style.opacity=String(.4+(speaking?envelope*.45:0));});
}

// Keep every caption, underline and waveform on one slightly faster silent clock.
const silentPlaybackRate=1.08;
let silentLast=0;
function finishPlayback(){seconds=totalDuration;setPlaying(false);render();listenerNextAt=performance.now()+120;}
function tick(now){
 if(!playing)return;
 if(track?.audioMode==='silent'){if(silentLast)seconds=Math.min(totalDuration,seconds+Math.min(100,now-silentLast)/1000*silentPlaybackRate);silentLast=now;}
 else seconds=Math.min(totalDuration,audio.currentTime);
 render(true);
 if(track?.audioMode==='silent'&&seconds>=totalDuration){finishPlayback();return;}
 raf=requestAnimationFrame(tick);
}
function setPlaying(value){
 const attempt=++playAttempt;silentLast=0;playing=value;if(stage===0&&value){$('#insight').innerHTML=content();}cancelAnimationFrame(raf);$('#listener').classList.toggle('playing',playing);$('#play').innerHTML=playing?'Ⅱ <span>Pause</span>':`<svg class="control-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 5l11 7-11 7Z"/></svg> <span>${track?.audioMode==='silent'?'Play':'Play With Sound'}</span>`;$('#play').setAttribute('aria-label',playing?'Pause demo':track?.audioMode==='silent'?'Play demo':'Play with sound');
 if(playing){if(!track){playing=false;$('#audio-status').textContent='Audio is still preparing. Please try Play again.';setPlaying(false);return;}if(track.audioMode==='silent'){audio.pause();$('#audio-status').textContent='Playing Captions';raf=requestAnimationFrame(tick);return;}audio.currentTime=seconds;audio.play().then(()=>{if(playing&&attempt===playAttempt){$('#audio-status').textContent=track.audioMode==='silent'?'Playing Captions':'Playing';raf=requestAnimationFrame(tick);}}).catch(()=>{if(attempt!==playAttempt)return;setPlaying(false);$('#audio-status').textContent='Audio could not play. Press Play to retry; the transcript remains available.';});}
 else{clearFlying();$('#listener').classList.remove('speaking');audio.pause();if(track)$('#audio-status').textContent='Paused · Your Place Is Kept';$$('.active-word').forEach(w=>w.classList.remove('active-word'));}
}
function jump(next){setPlaying(false);seconds=stageBoundaries[next];if(track&&track.audioMode!=='silent')audio.currentTime=seconds;render(true);}
function chooseTrack(){track=manifest?.[current]||null;if(track){stageBoundaries=track.boundaries;totalDuration=track.duration;if(track.audioMode!=='silent')audio.src=track.src;else audio.removeAttribute('src');$('#timeline').max=totalDuration;$('#audio-status').textContent=track.audioMode==='silent'?'':'Ready when you are.';$('#mute').hidden=track.audioMode==='silent';$('#play').innerHTML=`<svg class="control-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 5l11 7-11 7Z"/></svg> <span>${track.audioMode==='silent'?'Play':'Play With Sound'}</span>`;$('#play').setAttribute('aria-label',track.audioMode==='silent'?'Play demo':'Play with sound');}else{$('#audio-status').textContent='Preparing Demo';}stage=-1;render();}

$$('.examples [data-example]').forEach(b=>b.addEventListener('click',()=>{setPlaying(false);current=b.dataset.example;seconds=0;stage=-1;$$('.examples [data-example]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));chooseTrack();transcript();render();}));
$$('.stages [data-stage]').forEach(b=>b.addEventListener('click',()=>jump(+b.dataset.stage)));
$('#play').addEventListener('click',()=>{if(seconds>=totalDuration){seconds=0;render();}setPlaying(!playing);});
$('#replay').addEventListener('click',()=>{seconds=0;render();setPlaying(true);});
$('#timeline').addEventListener('input',e=>{setPlaying(false);seconds=+e.target.value;if(track&&track.audioMode!=='silent')audio.currentTime=seconds;render();});
$('.playback-options').addEventListener('toggle',()=>{if($('.playback-options').open)setPlaying(false);});
$('#full-transcript').addEventListener('focusin',()=>setPlaying(false));
$('#full-transcript').addEventListener('toggle',()=>{if($('#full-transcript').open)setPlaying(false);});
$('#insight').addEventListener('focusin',()=>setPlaying(false));
$('#insight').addEventListener('click',e=>{if(e.target.closest('[data-next]')){jump(Math.min(3,stage+1));$('#insight h3, #insight summary, #insight textarea, #insight button')?.focus();}});
$('#insight').addEventListener('input',e=>{if(e.target.id==='response'){drafts[current]=e.target.value;$('#edit-status').textContent='Draft updated';}});
$('#insight').addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open)setPlaying(false);},true);
const entranceAnimations=new Set();
function animateEntrance(el,frames,options){const animation=el.animate(frames,options);entranceAnimations.add(animation);animation.finished.then(()=>entranceAnimations.delete(animation),()=>entranceAnimations.delete(animation));}
function motionState(){if(motionPaused||reduce.matches){clearFlying();entranceAnimations.forEach(animation=>animation.cancel());entranceAnimations.clear();}document.documentElement.classList.toggle('motion-paused',motionPaused||reduce.matches);$('#motion').textContent=reduce.matches?'Reduced Motion On':motionPaused?'Resume Page Animation':'Pause Page Animation';$('#motion').setAttribute('aria-label',reduce.matches?'Animation paused for reduced motion':motionPaused?'Resume animation':'Pause animation');$('#motion').setAttribute('aria-pressed',String(motionPaused||reduce.matches));$('#listener').classList.toggle('playing',playing);}
$('#motion').addEventListener('click',()=>{motionPaused=!motionPaused;motionState();});reduce.addEventListener('change',()=>{motionPaused=reduce.matches;motionState();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);document.documentElement.classList.toggle('offscreen',document.hidden);});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)setPlaying(false);},{threshold:.05}).observe($('#listener'));
new IntersectionObserver(entries=>document.documentElement.classList.toggle('offscreen',!entries[0].isIntersecting),{threshold:0}).observe($('.hero'));

const params=new URLSearchParams(location.search);
if(Object.hasOwn(examples,params.get('example')))current=params.get('example');
if(params.get('perspective')==='owner')role='owner';
$$('.examples [data-example]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.example===current)));
transcript();render();motionState();

fetch('./audio/manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.json();}).then(data=>{manifest=data;chooseTrack();}).catch(()=>{$('#audio-status').textContent='Audio is unavailable. Reload to retry; transcript preview remains available.';});
audio.addEventListener('ended',()=>{if(track?.audioMode!=='silent')finishPlayback();});
audio.addEventListener('error',()=>{if(track?.audioMode==='silent')return;setPlaying(false);$('#audio-status').textContent='Audio could not load. Reload to retry.';});
$('#mute').addEventListener('click',()=>{audio.muted=!audio.muted;$('#mute').textContent=audio.muted?'Sound Off':'Sound On';$('#mute').setAttribute('aria-pressed',String(audio.muted));});
$('#captions-toggle').addEventListener('click',()=>{captions=!captions;$('#listener').classList.toggle('captions-off',!captions);$('#captions-toggle').textContent=captions?'Captions On':'Captions Off';$('#captions-toggle').setAttribute('aria-pressed',String(captions));});


// Readiness is measured; the first-entry brand hold never fabricates progress.
const entrance=$('.entrance');
const arrivalTargets=[$('.site-header'),$('.hero-first-line'),$('.hero h1>span:last-child'),$('.hero-note'),$('.hero-psychology'),$('.hero-actions'),$('#listener')].filter(Boolean);
let arrived=false;
function finishArrival(){
 if(arrived)return;arrived=true;performance.mark('obavia-arrival-dismiss');
 document.documentElement.classList.remove('brand-pending');
 entrance.classList.remove('loading');entrance.classList.add('arrived');

 if(!reduce.matches&&!motionPaused&&!location.hash)arrivalTargets.forEach((el,i)=>animateEntrance(el,[{opacity:0},{opacity:1}],{duration:620,delay:i*65,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
}
if(document.documentElement.classList.contains('brand-pending')){
 entrance.classList.add('loading');performance.mark('obavia-arrival-start');
 const started=performance.now();
 const visualAssets=[document.fonts.load('800 40px "Obavia Condensed"'),document.fonts.load('400 15px "Obavia Sans"'),document.fonts.load('700 15px "Obavia Sans"'),document.fonts.load('500 30px "Obavia Display"'),$('.brand img').decode(),new Promise((resolve,reject)=>{const cloud=new Image();cloud.onload=()=>cloud.decode().then(resolve,reject);cloud.onerror=reject;cloud.src='./assets/obavia-clouds.webp';})];
 // Readiness is measured; only its displayed value is interpolated for recognition.
 let ready=0,failed=0,displayed=0,lastFrame=started;
 const fallback=setTimeout(finishArrival,2100);
 visualAssets.forEach(p=>Promise.resolve(p).then(()=>{ready++;}).catch(()=>{failed++;}).finally(()=>{
  entrance.dataset.readiness=String(100*ready/visualAssets.length);
  if(ready+failed===visualAssets.length)performance.mark('obavia-assets-settled');
 }));
 function advanceArrival(now){
  if(arrived){clearTimeout(fallback);return;}
  const elapsed=now-started,dt=Math.min(50,Math.max(0,now-lastFrame));lastFrame=now;
  const t=Math.min(1,Math.max(0,(elapsed-160)/1040));
  const measured=100*ready/visualAssets.length;
  const target=Math.min(measured,100*t*t*(3-2*t));
  displayed=Math.min(target,displayed+dt*.14);
  $('#arrival-count').textContent=String(Math.floor(displayed+1e-6));
  if(ready+failed===visualAssets.length&&elapsed>=1350&&displayed>=measured-.01){clearTimeout(fallback);finishArrival();return;}
  requestAnimationFrame(advanceArrival);
 }
 requestAnimationFrame(advanceArrival);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'||event.key==='Tab')finishArrival();});
 reduce.addEventListener('change',()=>{if(reduce.matches)finishArrival();});
}else finishArrival();

// Native scrolling remains untouched. Reveal only sections entering from below.
if(!reduce.matches&&'IntersectionObserver' in window){
 const reveals=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  entry.target.classList.remove('section-pending');
  if(!reduce.matches&&!motionPaused)animateEntrance(entry.target,[{opacity:.2},{opacity:1}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'});
  reveals.unobserve(entry.target);
 }),{threshold:.06});
 $$('.workspace-story,.connections').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){reveals.observe(el);}});
}

// Two identical logo groups share one linear track; duplicate artwork is silent to assistive technology.
const connections=$('.connections');
new IntersectionObserver(entries=>connections.classList.toggle('logos-offscreen',!entries[0].isIntersecting)).observe(connections);




let heroVisible=true;new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;}).observe($('#listener'));
// One authored opportunity across six inspectable product moments. No provider actions.
const story=$('.workspace-story');
if(story){
 const buttons=$$('[data-journey]'),panels=$$('.journey-panel');
 function selectJourney(index){
  const description=$('.journey-mobile-description');if(description)description.textContent=buttons[index].querySelector('small').textContent;
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  panels.forEach((panel,i)=>{panel.hidden=i!==index;});
 }
 selectJourney(0);story.classList.add('journey-ready');
 buttons.forEach((button,i)=>button.addEventListener('click',()=>selectJourney(i)));
}


// One visible text node, with the swap made at zero opacity. Hidden grid sizers
// reserve the largest phrase at every width, including before fonts settle.
const benefit=$('.hero-benefit');
const benefits=$$('.hero-benefit-size').map(el=>el.textContent);
let benefitElapsed=0,benefitLast=0,benefitIndex=0;
function benefitTick(now){
 const running=arrived&&!motionPaused&&!reduce.matches&&!document.hidden&&heroVisible;
 if(reduce.matches){benefitElapsed=0;benefitIndex=0;benefit.textContent=benefits[0];}
 if(running&&benefitLast){
  benefitElapsed+=Math.min(now-benefitLast,100);
  const phase=benefitElapsed%4400;
  const next=Math.floor(benefitElapsed/4400)%benefits.length;
  if(next!==benefitIndex){benefit.style.opacity='0';benefitIndex=next;benefit.textContent=benefits[next];}
  // First phrase arrives with the page; subsequent phrases have a 300 ms reveal.
  const entering=benefitElapsed>=4400&&phase<300;
  const leaving=phase>4100;
  const progress=entering?phase/300:leaving?(4400-phase)/300:1;
  const eased=progress*progress*(3-2*progress);
  benefit.style.opacity=String(eased);
  benefit.style.transform=`translateY(${entering?(1-eased)*4:leaving?-(1-eased)*4:0}px)`;
 }else{benefit.style.opacity='1';benefit.style.transform='none';}
 benefitLast=now;requestAnimationFrame(benefitTick);
}
requestAnimationFrame(benefitTick);


// Silent directed listener: visible context, exact extraction, interpretation, whole reply.
let listenerInView=false,listenerNextAt=0;
new IntersectionObserver(entries=>{const entry=entries.at(-1);listenerInView=entry.isIntersecting&&entry.intersectionRatio>=.1;if(!listenerInView)setPlaying(false);},{threshold:[0,.1]}).observe($('.transcript-panel'));
audio.muted=true;
setInterval(()=>{
 if(!track)return;
 if(reduce.matches){
  if(playing)setPlaying(false);
  if(stage!==2){seconds=stageBoundaries[2];render();}
  if(!$('#insight .role-quote'))$('#insight').insertAdjacentHTML('beforeend',`<p class="role-quote">“${escape(examples[current].response)}”</p>`);
  return;
 }
 if(document.documentElement.classList.contains('brand-pending')||!listenerInView||motionPaused||document.hidden||($('#listener').contains(document.activeElement)&&document.activeElement?.matches('a,button,textarea,summary,input,select'))||$('#listener details[open]')){if(playing)setPlaying(false);return;}
 if(listenerNextAt){if(performance.now()<listenerNextAt)return;listenerNextAt=0;const keys=Object.keys(examples);current=keys[(keys.indexOf(current)+1)%keys.length];seconds=0;stage=-1;chooseTrack();}
 if(!playing)setPlaying(true);
},200);

new ResizeObserver(()=>{readingLines=[];}).observe($('#transcript'));
document.fonts.ready.then(()=>{readingLines=[];});
