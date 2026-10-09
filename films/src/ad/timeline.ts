/* Obavia, 15 seconds. Every frame number lives here, on a 120 bpm grid
   (one beat = 30 frames at 60 fps), and the score reads the same list.

   The story, in the owner's own terms: the dealer buys the car and closes
   the deal; the work in between is Obavia's. The words in the middle are only
   things the Desk does today: photos and listings (Reach), leads, paperwork,
   the title watch, payments. */

export const FPS = 60;
export const SECONDS = 15;
export const FRAMES = FPS * SECONDS;
export const BEAT = 30;                       // 120 bpm
export const b = (n: number) => Math.round(n * BEAT);

export const S = {
  hook: [0, b(2)],                            // You buy the car.
  work: [b(2), b(8)],                         // the work, one word a beat
  ring: [b(8), b(11)],                        // one car, every channel
  desk: [b(11), b(14)],                       // the Desk's own paper
  deal: [b(14), b(18)],                       // You close the deal. (half time)
  grid: [b(18), b(21)],                       // everything between
  mark: [b(21), b(24)],                       // into the mark
  end: [b(24), FRAMES],
} as const;

/** The words under the work, one per beat. */
export const WORK = [
  { at: b(2) + 4, text: "Photos.", img: "photo" },
  { at: b(3), text: "Listings.", img: "listing" },
  { at: b(4), text: "Leads.", img: "text" },
  { at: b(5), text: "Paperwork.", img: "sign" },
  { at: b(6), text: "Title.", img: "plate" },
  { at: b(7), text: "Payments.", img: "pay" },
] as const;

export const RING_WORDS = [{ at: b(8), text: "One car." }, { at: b(9), text: "Every channel." }];

export type Hit = { f: number; kind: "kick" | "snare" | "hat" | "swish" | "whoosh" | "tick" | "impact" | "riser" | "sub" | "pad" | "pop" };

/** The score: drums on the grid where the film runs, out where it breathes. */
export function hits(): Hit[] {
  const h: Hit[] = [];
  // the hook: the voice carries it; a whoosh into the zoom
  h.push({ f: b(2) - 16, kind: "whoosh" });
  // the run: four on the floor from the drop to the half-time beat
  for (let n = 2; n < 14; n++) {
    h.push({ f: b(n), kind: "kick" });
    if (n % 2 === 1) h.push({ f: b(n), kind: "snare" });
    h.push({ f: b(n + 0.5), kind: "hat" });
  }
  [...WORK.slice(1), ...RING_WORDS.slice(1), { at: b(12) }, { at: b(13) }].forEach(w => h.push({ f: w.at, kind: "swish" }));
  h.push({ f: b(8) - 10, kind: "whoosh" }, { f: b(11) - 2, kind: "whoosh" }, { f: b(14) - 2, kind: "whoosh" });   // the cloud wipes
  // half time: the drums fall away; a sub and a pad under "You close the deal."
  h.push({ f: b(14), kind: "sub" }, { f: b(14), kind: "pad" });
  // the grid: tiles pop, sixteenths build, then everything falls into the circle
  for (let i = 0; i < 9; i++) h.push({ f: b(18) + 4 + i * 3, kind: "pop" });
  for (let n = 18; n < 21; n += 0.25) h.push({ f: b(n), kind: "hat" });
  h.push({ f: b(19), kind: "kick" }, { f: b(20), kind: "kick" }, { f: b(19.5), kind: "riser" });
  h.push({ f: b(21), kind: "impact" });
  h.push({ f: b(22.5), kind: "pad" });
  return h.sort((a, z) => a.f - z.f);
}
