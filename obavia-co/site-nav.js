// Native disclosure navigation with predictable dismissal and restored focus.
const menu=document.querySelector('.mobile-nav');
if(menu){
 const trigger=menu.querySelector('summary');
 const close=(focus=false)=>{menu.open=false;if(focus)trigger.focus();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){close(true);event.preventDefault();}});
}
