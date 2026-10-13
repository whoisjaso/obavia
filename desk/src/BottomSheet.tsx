/* The Desk's bottom sheet (native-patterns §7 lines 10 and 12; cloud-system §4; lego §3, iOS row).
   A cloud forming from the bottom over a scrim: it rises on the spring at damping 0.75, follows the
   thumb down, leaves on the iOS sheet curve when flicked or pulled past the line, and comes back up on
   the spring when let go short of it. Escape, a tap on the scrim, and "Not now" all leave it the same
   way. Leaving is silent (the house asymmetry: a cancel makes no sound).

   Sheet.tsx is the printed document; this file is the glass one. Two uses:
   - ActionSheet: one line of consequence, the one verb in ink, "Not now" faint. It replaces every
     browser confirm() on the Desk (Sell It Now, Suspend, Restore, void).
   - PhotoSheet: a Let It Go photo full-bleed, with "Remove" on the photo itself. */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sheetBack, sheetDrag, sheetIn, sheetOut } from './motion';
import { feel } from './ui';

type Leave = (v?: number) => void;

function BottomSheet({ label, className = '', onClose, children }: { label: string; className?: string; onClose: () => void; children: (leave: Leave) => ReactNode }) {
  const panel = useRef<HTMLDivElement>(null), scrim = useRef<HTMLDivElement>(null);
  const leaving = useRef(false), dragged = useRef(false);
  const drag = useRef<{ id: number; y0: number; on: boolean; s: { y: number; t: number }[] } | null>(null);
  const close = useRef(onClose); close.current = onClose;

  const leave: Leave = (v = 0) => {
    const p = panel.current, s = scrim.current;
    if (leaving.current) return; leaving.current = true;
    if (!p || !s) { close.current(); return; }
    sheetOut(p, s, () => close.current(), v);
  };

  useEffect(() => {
    const p = panel.current!, s = scrim.current!, was = document.activeElement as HTMLElement | null;
    sheetIn(p, s); feel.sheet();
    p.focus({ preventScroll: true });
    const html = document.documentElement, overflow = html.style.overflow; html.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); leave(); return; }
      if (e.key !== 'Tab') return; // keep the keyboard inside the sheet
      const f = [...p.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length;
      e.preventDefault(); f[n].focus();
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); html.style.overflow = overflow; if (was?.isConnected) was.focus({ preventScroll: true }); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* The drag: nothing moves until the thumb has gone 6 px, so a tap on a button inside stays a tap. Over
     the top the sheet resists (a square-root friction); down it follows 1:1. Let go past 28 percent of its
     height, or flicked faster than 0.5 px a millisecond, it leaves at the thumb's speed; else it springs back. */
  const down = (e: React.PointerEvent) => {
    if (e.button > 0 || !e.isPrimary || drag.current || leaving.current) return;
    drag.current = { id: e.pointerId, y0: e.clientY, on: false, s: [{ y: e.clientY, t: e.timeStamp }] };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current, p = panel.current, s = scrim.current;
    if (!d || e.pointerId !== d.id || !p || !s) return;
    const dy = e.clientY - d.y0;
    if (!d.on) { if (Math.abs(dy) < 6) return; d.on = true; dragged.current = true; p.setPointerCapture(e.pointerId); }
    sheetDrag(p, s, dy >= 0 ? dy : -Math.sqrt(-dy) * 2.5);
    d.s.push({ y: e.clientY, t: e.timeStamp }); while (d.s.length > 2 && e.timeStamp - d.s[0].t > 100) d.s.shift();
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current, p = panel.current, s = scrim.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.on || !p || !s) return;
    const dy = e.clientY - d.y0, a = d.s[0], dt = Math.max(1, e.timeStamp - a.t), v = (e.clientY - a.y) / dt;
    if (dy > Math.min(160, p.offsetHeight * 0.28) || (v > 0.5 && dy > 12)) leave(v); else sheetBack(p, s);
  };

  return createPortal(
    <>
      <div ref={scrim} className="sheet-scrim" aria-hidden="true" onClick={() => leave()} />
      <div ref={panel} className={`sheet-panel ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={e => { if (dragged.current) { dragged.current = false; e.stopPropagation(); e.preventDefault(); } }}>
        <i className="sheet-grab" aria-hidden="true" />
        {children(leave)}
      </div>
    </>,
    document.body,
  );
}

/** The iOS action sheet, the Desk's way: what happens, in one line; the one verb; "Not now". The verb
 *  runs at once (the sheet leaves while the lane answers); "Not now", the scrim and Escape are silent. */
export function ActionSheet({ line, verb, onAct, onClose }: { line: ReactNode; verb: string; onAct: () => void; onClose: () => void }) {
  return (
    <BottomSheet label={verb} className="act" onClose={onClose}>
      {leave => <>
        <p className="sheet-line">{line}</p>
        <button className="btn primary block sheet-verb" onClick={() => { feel.tap(); onAct(); leave(); }}>{verb}</button>
        <button className="textlink sheet-not" onClick={() => leave()}>Not now</button>
      </>}
    </BottomSheet>
  );
}

/** A photo, full-bleed, the way iOS Photos opens one: swipe it down to put it back; "Remove" sits on it. */
export function PhotoSheet({ src, n, onRemove, onClose }: { src: string; n: number; onRemove: () => void; onClose: () => void }) {
  return (
    <BottomSheet label={`Photo ${n}`} className="photo" onClose={onClose}>
      {leave => (
        <div className="sheet-photo">
          <img src={src} alt={`Photo ${n}`} draggable={false} />
          <button className="sheet-remove" onClick={() => { feel.tap(); onRemove(); leave(); }}>Remove</button>
        </div>
      )}
    </BottomSheet>
  );
}
