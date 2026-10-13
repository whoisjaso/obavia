/* The Bill. The money pain: what a sale really costs a small lot.

   Act one: the morning invoice from the DMS, every add-on and per-deal fee
   landing one line at a time, then texts from the title runner. Act two:
   typed lines on black that name each layer of cost, and the question.
   Act three: the Desk's own title step, every webDEALER field ready to
   copy, the plate typed, Plates Are On.

   Where the figures come from:
   - The invoice lines are one popular independent-dealer DMS's published
     prices (October 2026): DMS $99, buy here pay here $50, accounting $99,
     book values $64, website $125, credit subcode $24.99 a month; $3 per
     eContract, $5 per printed deal, credit reports from $4 each. The film
     names no vendor; the counts (18, 9, 22) are illustrative.
   - Since July 1, 2025 every Texas dealer files title and registration in
     webDEALER (HB 718). The Desk's title step lists every field it asks
     for, ready to copy (desk/src/Corridor.tsx, WebDealer).
   Names are fictional. */
import type { Cue } from "../evening/timeline";
import type { Line } from "../pain/typed";
import type { Note } from "../pain/timeline";

export const FPS = 30;
export const SECONDS = 64;
export const FRAMES = FPS * SECONDS;

export type Item = { label: string; detail?: string; cents: number };
export const ITEMS: Item[] = [
  { label: "DMS", detail: "Monthly", cents: 9900 },
  { label: "Buy here pay here", detail: "Add-on", cents: 5000 },
  { label: "Accounting", detail: "Add-on", cents: 9900 },
  { label: "Book values", detail: "Add-on", cents: 6400 },
  { label: "Website", detail: "Add-on", cents: 12500 },
  { label: "Credit subcode", detail: "Monthly", cents: 2499 },
  { label: "eContracts", detail: "18 × $3.00", cents: 5400 },
  { label: "Printed deals", detail: "9 × $5.00", cents: 4500 },
  { label: "Credit reports", detail: "22 × $4.00", cents: 8800 },
];
export const TOTAL = ITEMS.reduce((t, i) => t + i.cents, 0);   // $648.99

/* Slow on purpose: every beat holds long enough to read twice. The only
   sound is the notification; everything else plays in silence. */
export const T = {
  wake: 1.0,
  note: 2.0,                       // the invoice arrives
  open: 5.0,                       // tap it (silent)
  rows: ITEMS.map((_, i) => 6.2 + i * 0.75),
  total: 13.2,                     // the total lands, and holds
  runner: [16.0, 19.5],            // the title runner's texts
  sleep: 22.5,
  linesOut: [26.6, 30.6, 35.6, 40.6, 48.0],
  desk: 48.6,
  copies: [50.6, 51.8],            // Copy, Copy
  plate: 53.0,                     // the plate, typed
  on: 55.6,                        // Plates Are On
  pull: 57.6,
  end: 64,
} as const;

export const NOTE_INVOICE: Note = { t: T.note, app: "Mail", from: "Your Dealer Software", text: "Your October invoice is ready." };
export const RUNNER: Note[] = [
  { t: T.runner[0], app: "Messages", from: "Ray · Title Runner", text: "county kicked 2 of your deals back. need re-signs" },
  { t: T.runner[1], app: "Messages", from: "Ray · Title Runner", text: "this month’s invoice attached" },
];

export const PLATE = "SKV4821";
export const plateAt = (i: number) => T.plate + i * 0.2;

const SLOW = 11;   // characters a second: slow enough to read as it types
export const LINES: Line[] = [
  { t: 23.4, text: "You pay for the software.", size: 92, cps: SLOW },
  { t: 27.4, text: "Then for every add-on.", size: 92, cps: SLOW },
  { t: 31.4, text: "Then per contract. Per credit pull.", size: 88, cps: SLOW },
  { t: 36.4, text: "Then someone to file your titles.", size: 88, cps: SLOW },
  { t: 41.4, text: "What did your last sale really cost you?", size: 88, cps: SLOW },
];

/** The only sound: the notification, once per notification. */
export const CUES: Cue[] = [
  { t: T.note, kind: "note" },
  { t: T.runner[0], kind: "note" },
  { t: T.runner[1], kind: "note", v: 1 },
];

export const f = (s: number) => Math.round(s * FPS);
