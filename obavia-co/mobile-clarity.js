// Preserve complete scene context in deliberate mobile disclosure.
for(const panel of document.querySelectorAll('.journey-panel')){
 const details=panel.querySelector('details');if(!details)continue;
 const context=document.createElement('div');context.className='mobile-details-context';
 for(const paragraph of panel.querySelectorAll('.jm-events li p')){
  if(/[“”]|\d{1,2}:\d{2} [AP]M|Partial collection|separate from.*agreement|not collected cash/i.test(paragraph.textContent)){paragraph.classList.add('mobile-essential-context');continue;}
  context.append(paragraph.cloneNode(true));
 }
 const branch=panel.querySelector(':scope > .jm-branch');if(branch)context.append(branch.cloneNode(true));
 if(context.children.length)details.append(context);
}
