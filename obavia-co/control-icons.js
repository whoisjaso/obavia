// Native details behavior and labels stay intact; only the decorative marker changes.
function markSummary(summary){
 if(summary.closest('.mobile-nav')||summary.querySelector(':scope > .disclosure-chevron'))return;
 const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
 icon.classList.add('disclosure-chevron');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.setAttribute('focusable','false');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M9 5l7 7-7 7');icon.append(path);summary.prepend(icon);
}
function inspect(node){if(node.nodeType!==1)return;if(node.matches('summary'))markSummary(node);node.querySelectorAll('summary').forEach(markSummary);}
inspect(document.documentElement);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)inspect(node);}).observe(document.body,{childList:true,subtree:true});
