/* The hammer moment's arithmetic, kept free of the native runtime so it is tested (hammer.test.ts) and shared by
   the player (Hammer.tsx) and by Won's clock. The sheet is the contract's: 24 frames at 60 fps, 0 to `contact`
   the fall, `contact` the strike, `contact` to `rest` the puff opening and freezing; `rest` is the still. */
import type { Moment3D, MomentSheet } from './scene3d';

/** A frame value below zero draws nothing: the hammer under reduced motion before the strike. */
export const HIDDEN = -1;
/** The frame clock runs to just under the next whole frame past the last one, so the last frame holds its full 1000 / fps. */
export const UNDER = 0.999;

/** The frame a clock value shows: its floor, held at the still; negative stays hidden. */
export function frameOf(v: number, rest: number): number {
  'worklet';
  return v < 0 ? HIDDEN : Math.min(rest, Math.floor(v));
}

/** The moment's timing in ms: the fall (frames 0 to contact) and the puff (contact to the still), from the fps. */
export function clock(m: Pick<Moment3D, 'contact' | 'fps' | 'rest'>) {
  const frame = 1000 / m.fps;
  return { frameMs: frame, contactMs: m.contact * frame, puffMs: (m.rest - m.contact + 1) * frame, totalMs: (m.rest + 1) * frame };
}

/** The sheet for a screen: the 2x on 2x screens and finer, the 1x below; whichever ships when only one does. */
export function sheetFor(m: Pick<Moment3D, 'x1' | 'x2'>, pixelRatio: number): MomentSheet | null {
  if (pixelRatio >= 1.5) return m.x2 ?? m.x1;
  return m.x1 ?? m.x2;
}

/** Each frame's window offset in points, snapped to device pixels so a neighbour never bleeds into the edge.
    `cellPt` is the drawn cell height in points; the sheet scales with it. */
export function offsets(sh: MomentSheet, cellPt: number, pixelRatio: number): { xs: number[]; ys: number[]; sheetW: number; sheetH: number } {
  const sc = cellPt / sh.cell.h;
  const snap = (v: number) => Math.round(v * pixelRatio) / pixelRatio || 0;   // || 0: never -0 in a transform
  return {
    xs: sh.frames.map(r => snap(-r.x * sc)),
    ys: sh.frames.map(r => snap(-r.y * sc)),
    sheetW: sh.w * sc, sheetH: sh.h * sc,
  };
}
