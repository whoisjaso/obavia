/** Shared public-page motion. Content is always visible without JavaScript.
 * Existing home hero, loader, cloud depth and demo clocks retain ownership.
 */
const pageReduce = matchMedia('(prefers-reduced-motion: reduce)');
const pageRoot = document.documentElement;
const pageAnimations = new Set();
const pagePaused = () => pageReduce.matches || pageRoot.classList.contains('motion-paused');
// Home arrival distinguishes direct entry/reload from internal navigation.
function pageFade(element, delay = 0, duration = 340) {
  if (pagePaused() || document.hidden) return;
  const animation = element.animate([{ opacity: .45 }, { opacity: 1 }], {
    duration, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards',
  });
  pageAnimations.add(animation);
  animation.finished.then(() => pageAnimations.delete(animation), () => pageAnimations.delete(animation));
}
function pageStop() { if (pagePaused() || document.hidden) { pageAnimations.forEach(animation => animation.cancel()); pageAnimations.clear(); } }
pageReduce.addEventListener('change', pageStop);
document.addEventListener('visibilitychange', pageStop);
new MutationObserver(pageStop).observe(pageRoot, { attributes: true, attributeFilter: ['class'] });
// Parent section fades already owned by cloud-atmosphere/landing are excluded.
// Their content receives a restrained short stagger; demo state elements do not.
const pageGroups = document.querySelectorAll('.editorial-intro,.editorial-row,.aux-intro,.aux-section-heading,.aux-final,.competition-intro,.fn-heading,.aux-split,.aux-preview,.aux-faq,.public-footer');
const pageObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const children = [...entry.target.children].filter(child => !child.matches('script,style'));
    children.slice(0, 4).forEach((child, index) => pageFade(child, index * 45));
    pageObserver.unobserve(entry.target);
  }
}, { threshold: .08 });
pageGroups.forEach(group => pageObserver.observe(group));
const pageSurfaces = document.querySelectorAll('.competition-window,.fn-window,.journal-card,.pricing-card,.plan-card,.aux-card,.journal-empty,.request-card');
const pageSurfaceObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, index) => {
    if (!entry.isIntersecting) return;
    pageFade(entry.target, Math.min(index, 2) * 45, 360);
    pageSurfaceObserver.unobserve(entry.target);
  });
}, { threshold: .06 });
pageSurfaces.forEach(surface => pageSurfaceObserver.observe(surface));
// Setup fields are inserted by setup.js: reveal each newly selected step once.
const pageSetup = document.querySelector('#step-content');
if (pageSetup) {
  const revealStep = () => [...pageSetup.children].slice(0, 4).forEach((child, index) => pageFade(child, index * 35, 300));
  revealStep();
  new MutationObserver(revealStep).observe(pageSetup, { childList: true });
}
// Matched exit/entry: one complete page surface, continuous easing and native scroll.
function pageEnter(){
 if(pagePaused()||document.hidden||pageRoot.classList.contains('brand-pending'))return;
 const surface=document.querySelector('main');if(!surface)return;
 const animation=surface.animate([{opacity:.15,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:460,easing:'cubic-bezier(.22,.61,.36,1)'});
 pageAnimations.add(animation);animation.finished.then(()=>pageAnimations.delete(animation),()=>pageAnimations.delete(animation));
}
let pageLeaving=false;
pageEnter();
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||pagePaused()||pageLeaving)return;
 const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
 const url=new URL(anchor.href,location.href);
 if(url.origin!==location.origin||url.hash||!(url.pathname==='/'||/^\/(?:obavia\/)?(?:index|product|teams|pricing|blog|about|setup|waitlist|active-listening-sales|setter-closer-handoff|sales-funnel-conversion)(?:\.html)?$/.test(url.pathname))||url.href===location.href)return;
 event.preventDefault();pageLeaving=true;document.querySelector('.mobile-nav')?.removeAttribute('open');
 const surface=document.querySelector('main')||document.body;
 const animation=surface.animate([{opacity:1,transform:'translateY(0)'},{opacity:.15,transform:'translateY(-4px)'}],{duration:220,easing:'cubic-bezier(.55,.055,.675,.19)',fill:'forwards'});
 pageAnimations.add(animation);setTimeout(()=>location.assign(url.href),220);
});
addEventListener('pageshow',event=>{pageLeaving=false;if(event.persisted){pageAnimations.forEach(animation=>animation.cancel());pageAnimations.clear();pageEnter();}});
