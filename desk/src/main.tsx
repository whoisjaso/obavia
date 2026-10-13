import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Sky, cloudSound, feel, primeClouds } from './ui';
import { cloudPress, watchEnter } from './motion';
import { setCloudSound, watchButtons } from './cloud3d';
import './styles.css';

// A soft tick on every keystroke in any field.
addEventListener('input', e => { if ((e.target as HTMLElement).matches('input:not([type=checkbox]):not([type=file]), textarea')) feel.key(); });

const root = document.getElementById('root')!;
// Every .enter section settles in through GSAP (src/motion.ts); the observer is in place before the first render.
// A page that settles sounds the cloud-settle air (src/ui.tsx guards it to pages a gesture caused).
watchEnter(root, feel.settle);
// Every control sinks under the thumb and rises on release (spec §2); the cloud kit decodes on the first gesture.
addEventListener('pointerdown', primeClouds, { capture: true, passive: true });
addEventListener('keydown', primeClouds, { capture: true, passive: true });
cloudPress(document, { press: feel.touch, release: feel.rise });
setCloudSound(cloudSound);
watchButtons(document.body);
createRoot(root).render(<StrictMode><Sky /><App /></StrictMode>);
