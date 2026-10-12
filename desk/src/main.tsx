import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Sky, feel } from './ui';
import { watchEnter } from './motion';
import './styles.css';

// A soft tick on every keystroke in any field.
addEventListener('input', e => { if ((e.target as HTMLElement).matches('input:not([type=checkbox]):not([type=file]), textarea')) feel.key(); });

const root = document.getElementById('root')!;
// Every .enter section settles in through GSAP (src/motion.ts); the observer is in place before the first render.
watchEnter(root);
createRoot(root).render(<StrictMode><Sky /><App /></StrictMode>);
