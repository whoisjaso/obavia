import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Sky, feel } from './ui';
import './styles.css';

// A soft tick on every keystroke in any field.
addEventListener('input', e => { if ((e.target as HTMLElement).matches('input:not([type=checkbox]):not([type=file]), textarea')) feel.key(); });

createRoot(document.getElementById('root')!).render(<StrictMode><Sky /><App /></StrictMode>);
