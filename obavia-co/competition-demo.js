/** Synthetic illustration of the existing comparable-performance policy, not live payments. */
export const competitionFixture = Object.freeze({
 currency:'USD',assigned:40,matured:40,minMatured:25,
 rows:[{id:'maya',name:'Maya Chen',collectedMinor:6200000,refundMinor:200000},{id:'alex',name:'Alex Morgan',collectedMinor:5000000,refundMinor:200000},{id:'sam',name:'Sam Patel',collectedMinor:4200000,refundMinor:200000}],
 event:{id:'sample-collection-alex-01',rep:'alex',amountMinor:1400000,alreadyIncludedOpportunity:true},
});
const root=typeof document!=='undefined'?document.querySelector('#competition-demo'):null;
if(root){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),list=root.querySelector('.competition-ranks'),rows=new Map([...list.children].map(el=>[el.dataset.cpRep,el])),story=root.querySelector('.competition-story'),title=root.querySelector('.competition-story-title'),copy=root.querySelector('.competition-story-copy'),change=root.querySelector('.competition-change'),next=root.querySelector('.competition-next'),evidence=root.querySelector('.competition-evidence');
 let elapsed=reduce.matches?18000:0,last=0,raf=0,visible=false,phase=-1,reordered=false,cycles=0;const animations=new Set();
 const dollar=minor=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(minor/100);
 let selectedTier='bags';
 const tierButtons=[...root.querySelectorAll('[data-cp-tier]')],tierHeading=root.querySelector('.competition-tier-heading'),tierName=root.querySelector('#competition-tier-name'),tierRange=root.querySelector('#competition-tier-range'),empty=root.querySelector('.competition-tier-empty');
 const tierMark=root.querySelector('.competition-tier-mark'),bagMark=tierMark.innerHTML,marks={coins:'<circle cx="16" cy="16" r="10"/><path d="M16 10v12M12 13h6a3 3 0 0 1 0 6h-6"/>',cash:'<rect x="3" y="8" width="26" height="16" rx="3"/><circle cx="16" cy="16" r="4"/>',stacks:'<path d="M4 11l12-6 12 6-12 6ZM4 16l12 6 12-6M4 21l12 6 12-6"/>',diamonds:'<path d="M8 6h16l6 8-14 15L2 14ZM2 14h28M8 6l8 23 8-23"/>'};
 const ranges={coins:'Below $1,000 net collected',cash:'$1,000 to under $10,000 net collected',stacks:'$10,000 to under $30,000 net collected',bags:'$30,000 to under $100,000 net collected',diamonds:'$100,000+ net collected'};
 for(const [id,row] of rows){const crown=document.createElement('span');crown.className='competition-crown';crown.setAttribute('role','img');crown.setAttribute('aria-label','First place in Bags');crown.innerHTML='<svg viewBox="0 0 24 20" aria-hidden="true"><path d="M3 5l5 4 4-7 4 7 5-4-2 12H5Z" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 19h12" stroke="currentColor" stroke-width="1.5"/></svg>';row.querySelector('.competition-avatar').append(crown);row.dataset.cpLeader=String(id==='maya');row.querySelector('.competition-rank').setAttribute('aria-label',`Rank ${row.querySelector('.competition-rank').textContent} in Bags`);}
 const paused=()=>selectedTier!=='bags'||document.hidden||reduce.matches||document.documentElement.classList.contains('motion-paused')||evidence.open||!visible;
 function cancel(){for(const a of animations)a.cancel();animations.clear();}
 function sort(final,animate){
  if(reordered===final)return;reordered=final;
  const before=new Map([...rows].map(([id,el])=>[id,el.getBoundingClientRect().top]));
  const sorted=[...competitionFixture.rows].sort((a,b)=>{const net=r=>r.collectedMinor-r.refundMinor+(final&&r.id==='alex'?competitionFixture.event.amountMinor:0);return net(b)-net(a)||a.name.localeCompare(b.name);});
  sorted.forEach((r,i)=>{const el=rows.get(r.id);list.append(el);el.querySelector('.competition-rank').textContent=i+1;el.querySelector('.competition-rank').setAttribute('aria-label',`Rank ${i+1} in Bags`);el.dataset.cpLeader=String(i===0);});
  if(animate&&!paused())for(const [id,el]of rows){const delta=before.get(id)-el.getBoundingClientRect().top;if(!delta)continue;const a=el.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:750,easing:'cubic-bezier(.22,1,.36,1)'});animations.add(a);a.onfinish=()=>animations.delete(a);}
 }
 function render(){
  const staticMode=reduce.matches,p=staticMode?1:Math.min(1,Math.max(0,(elapsed-4000)/1800)),net=4800000+Math.round(1400000*p),finished=staticMode||elapsed>=6200;
  rows.get('alex').querySelector('b').textContent=dollar(net/competitionFixture.assigned);
  change.textContent=`${dollar(net)} net collected ÷ 40 assigned`;
  sort(finished,true);
  const beat=staticMode?3:elapsed<4000?0:elapsed<6200?1:elapsed<10500?2:3;
  if(beat!==phase){phase=beat;const text=[['A result ready to count.','Reconciled to an existing opportunity, with Alex’s approved credit.'],['The same 40 opportunities.','Alex’s eligible collection updates the team’s comparable results.'],['Alex moves into first.','$1,550 per opportunity puts Alex ahead of Maya’s $1,500.'],['Make progress useful to everyone.','Review an approved handoff together and choose one thing to practice.']][beat];title.textContent=text[0];copy.textContent=text[1];}
  next.style.visibility=beat===3?'visible':'hidden';next.disabled=beat!==3;
  root.dataset.cpPhase=String(beat);root.dataset.cpElapsed=String(Math.round(elapsed));root.dataset.cpCycles=String(cycles);root.dataset.cpRank=reordered?'1':'2';
  // Only the board/story fade at the authored repeat boundary; evidence stays usable.
  const alpha=staticMode||paused()?1:elapsed>20250?(20500-elapsed)/250:cycles&&elapsed<300?elapsed/300:1;
  list.style.opacity=String(alpha);story.style.opacity=String(alpha);
 }
 function tick(now){raf=0;if(paused()){last=0;return;}if(last)elapsed+=Math.min(100,now-last);last=now;if(elapsed>=20500){elapsed=0;cycles++;cancel();}render();raf=requestAnimationFrame(tick);}
 function sync(){cancelAnimationFrame(raf);raf=0;last=0;if(paused())cancel();render();if(!paused())raf=requestAnimationFrame(tick);}
 for(const button of tierButtons)button.addEventListener('click',()=>{selectedTier=button.dataset.cpTier;for(const item of tierButtons)item.setAttribute('aria-pressed',String(item===button));tierName.textContent=button.textContent;tierRange.textContent=ranges[selectedTier];tierHeading.dataset.tier=selectedTier;tierMark.innerHTML=selectedTier==='bags'?bagMark:`<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${marks[selectedTier]}</g>`;const populated=selectedTier==='bags';list.hidden=!populated;story.hidden=!populated;root.querySelector('.competition-metric').hidden=!populated;root.querySelector('.competition-context').hidden=!populated;empty.hidden=populated;sync();});
 next.addEventListener('click',()=>{evidence.open=true;evidence.querySelector('summary').focus();});
 evidence.addEventListener('toggle',sync);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>=.3;sync();},{threshold:[0,.3]}).observe(root.querySelector('.competition-window'));
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',()=>{if(reduce.matches)elapsed=18000;sync();});
 render();
}
