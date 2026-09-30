// The existing selected-word flight provides the exact source connection.
// This quieter continuation stays in panel padding while the explanation changes.
const root=document.querySelector('.primary-listener #listener');
if(root){
 // Keep the existing identity and waveform nodes on the transcript's own turn clock.
 const person=root.querySelector('.person'),wave=root.querySelector('.wave');
 if(person&&wave&&!root.querySelector('.listener-speaker-row')){
  const speakerRow=document.createElement('div');speakerRow.className='listener-speaker-row';
  wave.before(speakerRow);speakerRow.append(person,wave);
  root.classList.add('listener-speaker-ready');
 }
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path'),start=document.createElementNS(ns,'circle'),end=document.createElementNS(ns,'circle');
 svg.classList.add('listener-continuity');svg.setAttribute('aria-hidden','true');svg.append(path,start,end);[start,end].forEach(dot=>dot.setAttribute('r','2.4'));root.append(svg);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let visible=false,frame=0,previous='',animation=null;
 function draw(){frame=0;const beat=root.dataset.beat,active=['evidence','interpret','respond'].includes(beat);svg.classList.toggle('is-connected',active&&visible);if(!active||!visible){animation?.cancel();previous='';return;}
  const box=root.getBoundingClientRect(),source=root.querySelector('.transcript-panel').getBoundingClientRect(),dest=root.querySelector('.insight-panel').getBoundingClientRect(),word=(root.querySelector('#transcript .selected-key')||root.querySelector('#transcript')).getBoundingClientRect(),target=(root.querySelector('#evidence-target')||root.querySelector('#insight .insight-headline')||root.querySelector('.response-editor')||root.querySelector('#insight')).getBoundingClientRect();
  const mobile=dest.top>=source.bottom-2,x0=source.right-box.left-10,y0=Math.min(source.bottom-box.top-18,word.top-box.top+Math.min(word.height,30)/2),x1=dest.left-box.left+10,y1=target.top-box.top+Math.min(target.height,30)/2;
  const d=mobile?`M ${x0} ${y0} V ${source.bottom-box.top} H ${x1} V ${y1}`:`M ${x0} ${y0} H ${source.right-box.left} V ${y1} H ${x1}`;
  path.setAttribute('d',d);start.setAttribute('cx',x0);start.setAttribute('cy',y0);end.setAttribute('cx',x1);end.setAttribute('cy',y1);svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  if(previous!==beat){animation?.cancel();if(!reduced.matches&&!document.documentElement.classList.contains('motion-paused')){const length=path.getTotalLength();animation=path.animate([{strokeDasharray:`${length}`,strokeDashoffset:length},{strokeDasharray:`${length}`,strokeDashoffset:0}],{duration:650,easing:'ease-out'});}previous=beat;}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-beat']});
 new ResizeObserver(schedule).observe(root);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting; schedule();},{threshold:0}).observe(root);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){animation?.cancel();svg.classList.remove('is-connected');}else schedule();});
 new MutationObserver(()=>{animation?.cancel();schedule();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 reduced.addEventListener('change',()=>{animation?.cancel();schedule();});
}
