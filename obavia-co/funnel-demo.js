import {counts,stageNames,transitions,diagnosticSample} from './operating-demo-data.mjs';
const root=document.querySelector('#funnel-demo');
if(root){
 const $=s=>root.querySelector(s),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 // The source cohort has six transitions and seven stages. Lead and Contact
 // deliberately share the first transition, with intake and follow-up lenses.
 const views=[
  {t:0,gap:'without two-way contact',focus:'Check assignment and contact attempts.',action:'Check the 40 leads for an owner and a permitted follow-up.',definition:'Lead means an accepted, assigned opportunity. Raw forms and duplicate submissions are separate.'},
  {t:0,gap:'without two-way contact',focus:'Inspect attempts, replies and callbacks.',action:'Separate no answer from an agreed callback before following up.',definition:'Contact means a verified two-way exchange. A dial attempt, delivered email or voicemail is not contact.'},
  {t:1,gap:'without a retained booking',focus:'Inspect the booking conversation.',action:'Review the 20 contact records for booking, nurture or a clear stop reason.',definition:'Booked means a retained eligible appointment in this form-entry example. Direct-booked paths have different denominators.'},
  {t:2,gap:'missed appointments',focus:'Check agendas, timezones and replies.',action:'Have the rep confirm the agenda, timezone and rescheduling option.',definition:'All 140 eligible booking instances are mature and resolved: 70 attended and 70 missed. One retained booking per opportunity makes these counts compatible.'},
  {t:3,gap:'without recorded qualification',focus:'Read the call against your fit criteria.',action:'Review the 28 cases for missing answers or a supported fit decision.',definition:'Qualified means meeting the synthetic offer-fit policy after review: established offer, stated need and decision participation. Unknown is not disqualified.'},
  {t:4,gap:'without a signed win',focus:'Inspect objections and agreed next steps.',action:'Check the 28 cases for an unresolved question, next step or recorded loss.',definition:'Won means a signed order. A qualified opportunity without a win may still be open; it is not automatically lost.'},
  {t:5,gap:'without verified collection',focus:'Reconcile signed orders and payment records.',action:'Reconcile the two sales before deciding whether payment follow-up is needed.',definition:'Collected counts opportunities with an eligible processor-confirmed collection, not money or paid-in-full orders. Missing collection evidence is not proof of nonpayment.'}
 ];
 $('.fn-titlebar').innerHTML='<span class="fn-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Obavia / Business</span>';
 $('.fn-toolbar').innerHTML='<span>September · Offer A</span><span>Synthetic Example</span>';
 $('.fn-focus').innerHTML='<p class="fn-label" id="fn-selected-transition"></p><div class="fn-flow"><div><strong id="fn-from-count"></strong><span id="fn-from-label"></span></div><div class="fn-flow-link"><span id="fn-rate"></span><i aria-hidden="true"></i></div><div><strong id="fn-to-count"></strong><span id="fn-to-label"></span></div></div><p class="fn-denominator" id="fn-denominator"></p><div class="fn-guidance"><div class="fn-gap"><span class="fn-beat-icon" aria-hidden="true">◎</span><div><small>Where It Stalls</small><h3 id="fn-gap-title"></h3></div></div><div class="fn-intervention" data-fn-beat="1"><span class="fn-beat-icon" aria-hidden="true">↳</span><div><small>Inspect the Evidence</small><h3 id="fn-focus-title"></h3></div></div><div class="fn-next" data-fn-beat="2"><span class="fn-beat-icon" aria-hidden="true">→</span><div><small>Try Next</small><p id="fn-next-action"></p><p class="fn-followup"><strong>Then Track</strong><span id="fn-followup"></span></p></div></div><span class="fn-guidance-token" aria-hidden="true">↓</span></div>';
 $('.fn-controls')?.remove();
 $('#fn-stages').innerHTML=stageNames.map((name,i)=>`<li><button class="fn-stage" data-fn-stage="${i}" aria-pressed="false" aria-controls="fn-selected-transition" aria-label="${name}, ${counts[i]} opportunities, review stage"><span>${name}</span><strong>${counts[i]}</strong><small>${i?Math.round(transitions[i-1].value*100)+'%':'Cohort'}</small></button></li>`).join('');
 const context=document.createElement('p');context.id='fn-selected-definition';$('#fn-evidence .fn-evidence-body').prepend(context);
 $('#fn-transition-details').innerHTML=transitions.map(t=>`<div class="fn-metric-row"><span>${t.from} → ${t.name}</span><strong>${t.numerator} / ${t.denominator} · ${(t.value*100).toFixed(t.value*100%1?1:0)}%</strong></div>`).join('');
 $('#fn-records').innerHTML=diagnosticSample.map(r=>`<div class="fn-record-row"><strong>${r.id}</strong><span>${r.attendance}</span><small>${r.agenda} · ${r.reschedule}</small></div>`).join('');
 $('#fn-evidence summary').textContent='Evidence & Definitions';
 let selected=3,elapsed=0,last=0,raf=0,visible=false;
 const staticMode=()=>reduce.matches||document.documentElement.classList.contains('motion-paused');
 const token=$('.fn-guidance-token'),guidance=$('.fn-guidance');
 function draw(){
  const staticView=staticMode(),beat=staticView?2:elapsed>=6500?2:elapsed>=3200?1:0;
  root.dataset.phase=String(beat);root.dataset.elapsed=String(Math.round(elapsed));
  root.querySelectorAll('[data-fn-beat]').forEach(el=>{const shown=Number(el.dataset.fnBeat)<=beat;el.classList.toggle('fn-beat-visible',shown);el.setAttribute('aria-hidden',String(!shown));});
  // A single marker follows the existing gap into a focus, then a next action.
  const travel=elapsed>=5750&&elapsed<6500?{start:5750,from:$('.fn-intervention'),to:$('.fn-next')}:elapsed>=2450&&elapsed<3200?{start:2450,from:$('.fn-gap'),to:$('.fn-intervention')}:null;
  if(!staticView&&travel&&visible&&!document.hidden){const t=(elapsed-travel.start)/750,e=t*t*(3-2*t),r=guidance.getBoundingClientRect(),a=travel.from.getBoundingClientRect(),b=travel.to.getBoundingClientRect();token.style.opacity=String(Math.min(1,t/.15,(1-t)/.15));token.style.transform=`translateY(${a.top-r.top+12+(b.top-a.top)*e}px)`;}else token.style.opacity='0';
 }
 function select(i){
  selected=i;elapsed=0;last=0;root.dataset.selectedStage=String(i);const v=views[i],t=transitions[v.t],rate=(t.value*100).toFixed(t.value*100%1?1:0)+'%';
  $('#fn-selected-transition').textContent=`${t.from} → ${t.name}`;
  $('#fn-from-count').textContent=t.denominator;$('#fn-from-label').textContent=t.from;$('#fn-to-count').textContent=t.numerator;$('#fn-to-label').textContent=t.name;$('#fn-rate').textContent=rate;
  $('#fn-denominator').textContent=`${t.numerator} ${t.name.toLowerCase()} / ${t.denominator} ${t.from==='Lead'?'assigned leads':t.from.toLowerCase()} · Same cohort`;
  $('#fn-followup').textContent=`${t.from} → ${t.name} on the next comparable cohort. Improved, unchanged or inconclusive?`;
  $('#fn-gap-title').textContent=`${t.denominator-t.numerator} ${v.gap}.`;$('#fn-focus-title').textContent=v.focus;$('#fn-next-action').textContent=v.action;context.textContent=v.definition;
  root.querySelectorAll('[data-fn-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.fnStage)===i)));
  draw();run();
 }
 function tick(t){raf=0;if(!visible||document.hidden||staticMode()||$('#fn-evidence').open){last=0;draw();return;}if(last)elapsed+=Math.min(100,t-last);last=t;draw();if(elapsed<11000)raf=requestAnimationFrame(tick);}
 function run(){if(!raf&&visible&&!document.hidden&&!staticMode()&&!$('#fn-evidence').open&&elapsed<11000)raf=requestAnimationFrame(tick);}
 root.querySelectorAll('[data-fn-stage]').forEach(b=>b.addEventListener('click',()=>{if($('#fn-evidence').open)$('#fn-evidence').open=false;select(Number(b.dataset.fnStage));}));
 $('#fn-evidence').addEventListener('toggle',()=>{last=0;draw();run();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.25;last=0;draw();run();},{threshold:[0,.25]}).observe($('.fn-focus'));
 const sync=()=>{last=0;draw();run();};document.addEventListener('visibilitychange',sync);new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});reduce.addEventListener('change',sync);select(3);
}
