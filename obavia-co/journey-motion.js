// One persistent opportunity, six authored moments. No operational events are written.
const journey = document.querySelector('.workspace-story');
if (journey) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const stageButtons = [...journey.querySelectorAll('[data-journey]')];
  const panels = [...journey.querySelectorAll('.journey-panel')];
  const container = journey.querySelector('.journey-panels');
  const stages = ['Capture', 'Connect', 'Book', 'Discover', 'Agree', 'Collect'];
  const shortStages = stages;
  const actions = [
    ['Retain the source of the visit.', 'Capture Marcus’s submitted request.', 'Keep the source and request with the new lead.'],
    ['Route to an eligible, available owner.', 'Contact Marcus through the permitted channel.', 'Agree on a useful next conversation.'],
    ['Record the agreed appointment.', 'Confirm the purpose, time and timezone.', 'Prepare the original context and open questions.'],
    ['Verify attendance from meeting evidence.', 'Understand goals and business constraints.', 'Assess fit against the approved offer policy.'],
    ['Carry context to the closer, if needed.', 'Review the scope and terms together.', 'Record the signed agreement separately from cash.'],
    ['Link the agreement to the same opportunity.', 'Reconcile the authoritative payment evidence.', 'Review attribution and approved commission policy.']
  ];
  const rail = document.createElement('div');
  rail.className = 'journey-motion';
  rail.innerHTML = `<div class="jm-route" aria-label="Six chapters of the same inbound opportunity"><div class="jm-track" aria-hidden="true"><span></span></div><ol>${stages.map((name,i)=>`<li><span class="jm-stop" aria-hidden="true">${i+1}</span><span aria-label="${name}">${shortStages[i]}</span></li>`).join('')}</ol><span class="jm-token" aria-hidden="true">MH</span></div><div class="jm-action"><span>Next Action</span><strong>${actions[0][0]}</strong></div>`;
  container.querySelector('.journey-identity').after(rail);
  const panelStack = document.createElement('div');
  panelStack.className = 'jm-panel-stack';
  container.append(panelStack);
  panels.forEach(panel=>panelStack.append(panel));
  const token = rail.querySelector('.jm-token');
  const stops = [...rail.querySelectorAll('.jm-route li')];
  const fill = rail.querySelector('.jm-track>span');
  const action = rail.querySelector('.jm-action strong');
  // Existing selectors become status labels. This tour never requires a click.
  stageButtons.forEach(button=>{button.disabled=true;button.tabIndex=-1;button.setAttribute('aria-label',button.textContent.trim());});
  journey.querySelector('.journey-nav').setAttribute('aria-label','Opportunity stage overview');
  journey.classList.add('journey-explained');
  let index=0,elapsed=0,last=0,frame=0,visible=false,reading=false,flight=false;
  const HOLD=9200,TRAVEL=850,FINAL_HOLD=10000;
  const globallyPaused=()=>document.documentElement.classList.contains('motion-paused');
  function center(i){const r=stops[i].getBoundingClientRect(),base=rail.querySelector('.jm-route').getBoundingClientRect();return r.left-base.left+r.width/2-14;}
  function present(i){
    index=i;
    stageButtons.forEach((button,n)=>{button.setAttribute('aria-pressed',String(n===i));if(n===i)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    panels.forEach((panel,n)=>{panel.hidden=!reduce.matches&&n!==i;});
    stops.forEach((stop,n)=>{stop.dataset.active=String(n===i);stop.dataset.passed=String(n<i);});
    action.textContent=actions[i][0];
    const description=journey.querySelector('.journey-mobile-description');
    if(description)description.textContent=stageButtons[i].querySelector('small').textContent;
    rail.dataset.stage=String(i);
    rail.dataset.elapsed=String(Math.round(elapsed));
    const identity=container.querySelector('.journey-identity small');
    if(identity)identity.textContent=reduce.matches?'Opportunity · Complete Example':`Opportunity · ${stages[i]}`;
  }
  function draw(){
    const beat=reduce.matches?2:elapsed>=4800?2:elapsed>=2200?1:0;
    panels.forEach((panel,n)=>{
      panel.dataset.beat=String(reduce.matches?2:n===index?beat:0);
      panel.querySelectorAll('[data-jm-beat]').forEach(node=>{
        const shown=reduce.matches||(n===index&&Number(node.dataset.jmBeat)<=beat);
        node.classList.toggle('jm-event-shown',shown);
        node.setAttribute('aria-hidden',String(!shown));
      });
    });
    action.textContent=actions[index][beat];

    const hold=index===5?FINAL_HOLD:HOLD;
    const progress=Math.max(0,Math.min(1,(elapsed-hold)/TRAVEL));
    const moving=progress>0;
    const next=(index+1)%6;
    const ease=progress*progress*(3-2*progress);
    const x=index===5?center(index):center(index)+(center(next)-center(index))*ease;
    token.style.transform=`translateX(${x}px) translateY(${-Math.sin(Math.PI*progress)*7}px)`;
    token.style.opacity=index===5&&moving?String(1-ease):'1';
    fill.style.transform=`scaleX(${(index+(index===5?0:ease))/5})`;
    rail.dataset.moving=String(moving);
    rail.dataset.elapsed=String(Math.round(elapsed));
    if(moving!==flight){flight=moving;rail.classList.toggle('jm-in-transit',flight);}
    if(progress>=1){elapsed=0;flight=false;present(next);rail.classList.remove('jm-in-transit');token.style.opacity='1';token.style.transform=`translateX(${center(next)}px)`;fill.style.transform=`scaleX(${next/5})`;}
  }
  function blocked(){return reduce.matches||globallyPaused()||document.hidden||!visible||reading;}
  function tick(now){frame=0;if(reduce.matches!==journey.classList.contains('jm-reduced')){staticState();return;}if(blocked()){last=0;return;}if(last)elapsed+=Math.min(100,now-last);last=now;draw();frame=requestAnimationFrame(tick);}
  function sync(){if(reduce.matches!==journey.classList.contains('jm-reduced')){staticState();return;}cancelAnimationFrame(frame);frame=0;last=0;rail.dataset.paused=String(blocked());if(!blocked())frame=requestAnimationFrame(tick);}
  function staticState(){journey.classList.toggle('jm-reduced',reduce.matches);elapsed=0;present(0);draw();sync();}
  for(const details of panels.flatMap(panel=>[...panel.querySelectorAll('details')]))details.addEventListener('toggle',()=>{reading=panels.some(panel=>!panel.hidden&&!!panel.querySelector('details[open]'));sync();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.3;sync();},{threshold:[0,.3]}).observe(container);
  new ResizeObserver(()=>draw()).observe(rail);
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  reduce.addEventListener('change',staticState);
  staticState();
}
