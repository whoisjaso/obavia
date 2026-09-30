/* Native scroll remains the source of truth. One compositor update per scroll
   frame; no perpetual RAF loop, event cancellation, or synthetic scrolling. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const atmosphere = document.createElement('div');
atmosphere.className = 'cloud-atmosphere';
atmosphere.setAttribute('aria-hidden', 'true');
atmosphere.innerHTML = '<div class="cloud-layer cloud-layer-far"></div><div class="cloud-layer"></div>';
document.body.prepend(atmosphere);
let frame = 0;
const paused = () => reduce.matches || root.classList.contains('motion-paused');
function updateDepth() {
  frame = 0;
  if (paused()) return;
  // Bounded displacement keeps edges outside the viewport on long pages.
  const progress = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
  atmosphere.style.setProperty('--cloud-near', `${-Math.min(56, progress * 56)}px`);
  atmosphere.style.setProperty('--cloud-far', `${Math.min(24, progress * 24)}px`);
}
function requestDepth() { if (!frame && !paused()) frame = requestAnimationFrame(updateDepth); }
addEventListener('scroll', requestDepth, { passive: true });
addEventListener('resize', requestDepth, { passive: true });
reduce.addEventListener('change', requestDepth);
new MutationObserver(requestDepth).observe(root, { attributes: true, attributeFilter: ['class'] });
requestDepth();
// Index already owns its section/hero choreography. Match its quiet fade on
// editorial routes; every section is visible by default if JS fails.
if (document.body.matches('.editorial-page,.setup-page')) {
  const animations = new Set();
  const animate = target => {
    if (paused()) return;
    const animation = target.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    animation.finished.finally(() => animations.delete(animation)).catch(() => {});
  };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animate(entry.target);
    observer.unobserve(entry.target);
  }), { threshold: .08 });
  document.querySelectorAll('.editorial-intro,.editorial-row,.setup-main>aside,.setup-form').forEach(element => observer.observe(element));
  reduce.addEventListener('change', () => { if (reduce.matches) animations.forEach(animation => animation.cancel()); });
}
