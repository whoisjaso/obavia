/* One Phone, One Evening. Every beat and every sound in one place.
   The picture reads these times and the sound score (scripts/evening-score.py)
   reads the same list, so retiming a beat moves its sound with it.

   The story is the Desk's own evening, nothing it doesn't do:
   Tonight's Text arrives, the owner counts the drawer, closes the day,
   and in the morning the bank deposit matches. Figures are illustrative. */

export const FPS = 30;
export const SECONDS = 20;
export const FRAMES = FPS * SECONDS;

export const T = {
  wake: 0.8,          // lock click, screen lights: 7:00 PM
  note: 1.5,          // Tonight's Text arrives
  open: 3.7,          // tap the banner, the Desk opens on Payments
  row: 5.0,           // tap Close The Day
  keys: [             // the drawer count, with one slip
    { t: 5.9, k: "2" }, { t: 6.22, k: "5" }, { t: 6.75, k: "del" }, { t: 7.12, k: "4" }, { t: 7.4, k: "0" },
  ],
  close: 8.35,        // tap Close The Day: done, with a haptic
  sleep: 10.9,        // lock click, screen sleeps
  morning: 12.6,      // the screen lights on its own: the bank matched
  pull: 14.7,         // the camera pulls back to the mark
  end: SECONDS,
} as const;

export type SoundKind = "lock" | "note" | "key" | "del" | "tap" | "done";
export type Cue = { t: number; kind: SoundKind; v?: number };

/** Every sound, in order. Fewer sounds than beats: rests are part of the score. */
export const CUES: Cue[] = [
  { t: T.wake, kind: "lock" },
  { t: T.note, kind: "note" },
  { t: T.open, kind: "tap" },
  { t: T.row, kind: "tap" },
  ...T.keys.map((x, i) => ({ t: x.t, kind: (x.k === "del" ? "del" : "key") as SoundKind, v: i })),
  { t: T.close, kind: "done" },
  { t: T.sleep, kind: "lock", v: 1 },
  { t: T.morning, kind: "note", v: 1 },
];

export const f = (s: number) => Math.round(s * FPS);
