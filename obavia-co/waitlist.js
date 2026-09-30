import {waitlistEndpoint} from './app-entry.js';
const form=document.querySelector('#waitlist-form'),fullName=document.querySelector('#waitlist-full-name'),email=document.querySelector('#waitlist-email'),button=document.querySelector('#waitlist-submit'),status=document.querySelector('#waitlist-status');
const config=window.OBAVIA_SITE_CONFIG;
const endpoint=waitlistEndpoint(config,location.origin);
if(endpoint)button.disabled=false;
if(!endpoint){button.disabled=true;status.textContent='Waitlist registration is available on obavia.co. This preview does not accept signups.';}
fullName.addEventListener('input',()=>fullName.setCustomValidity(''));
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const name=fullName.value.normalize('NFC').trim().replace(/\s+/gu,' ');
 fullName.setCustomValidity(!name||Array.from(name).length>160?'Please enter your full name (up to 160 characters).':'');
 if(busy||!endpoint||!form.reportValidity())return;
 busy=true;button.disabled=true;button.textContent='Joining…';status.textContent='';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);let retry=0;
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',signal:controller.signal,body:JSON.stringify({fullName:name,email:email.value.trim(),website:document.querySelector('#waitlist-website').value})});
  const data=await response.json().catch(()=>null);
  if(response.ok&&data?.status==='accepted'){
   form.hidden=true;document.querySelector('.waitlist-panel').dataset.state='success';
   const title=document.querySelector('#waitlist-title');title.textContent='You’re On The Waitlist';title.tabIndex=-1;title.focus();
   document.querySelector('.waitlist-intro').textContent='Thanks for your interest in Obavia.';status.textContent='You’re all set.';return;
  }
  if(response.status===422)status.textContent=data?.error==='invalid_full_name'?'Please check your full name and try again.':'Please check your email address and try again.';
  else if(response.status===429){const value=response.headers.get('Retry-After');retry=Math.max(1,Number(value)||Math.ceil((Date.parse(value)-Date.now())/1000)||30);status.textContent=`Please wait ${retry} seconds before trying again.`;}
  else status.textContent='We couldn’t save your email yet. Please try again.';
 }catch{status.textContent='We couldn’t save your email. Check your connection and try again.';}
 finally{clearTimeout(timeout);busy=false;button.textContent='Join the Waitlist';if(retry)setTimeout(()=>{button.disabled=false;},Math.min(retry,86400)*1000);else button.disabled=false;}
});
