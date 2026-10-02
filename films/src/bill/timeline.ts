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
import type { Cue, SoundKind } from "../evening/timeline";
import { keyCues, type Line } from "../pain/typed";
import type { Note } from "../pain/timeline";

export const FPS = 30;
export const SECONDS = 30;
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

export const T = {
  wake: 0.3,
  note: 0.8,                       // the invoice arrives
  open: 2.2,                       // tap it
  rows: ITEMS.map((_, i) => 2.95 + i * 0.34),
  total: 6.25,                     // the total lands
  runner: [7.7, 8.8],              // the title runner's texts
  sleep: 10.0,
  linesOut: [11.95, 13.55, 15.65, 17.75, 21.3],
  desk: 21.5,
  copies: [22.55, 23.05],          // Copy, Copy
  plate: 23.6,                     // the plate, typed
  on: 24.95,                       // Plates Are On
  pull: 26.0,
  end: SECONDS,
} as const;

export const NOTE_INVOICE: Note = { t: T.note, app: "Mail", from: "Billing", text: "Your October invoice is ready." };
export const RUNNER: Note[] = [
  { t: T.runner[0], app: "Messages", from: "Ray · Title Runner", text: "county kicked 2 of your deals back. need re-signs" },
  { t: T.runner[1], app: "Messages", from: "Ray · Title Runner", text: "this month’s invoice attached" },
];

export const PLATE = "SKV4821";
export const plateAt = (i: number) => T.plate + i * 0.12;

export const LINES: Line[] = [
  { t: 10.4, text: "You pay for the software.", size: 92 },
  { t: 12.15, text: "Then for every add-on.", size: 92 },
  { t: 13.75, text: "Then per contract. Per credit pull.", size: 88 },
  { t: 15.85, text: "Then someone to file your titles.", size: 88 },
  { t: 17.95, text: "What did your last sale really cost you?", size: 88 },
];

export const CUES: Cue[] = [
  { t: T.note, kind: "note" },
  { t: T.open, kind: "tap" },
  ...T.rows.map((t, i) => ({ t, kind: "key" as SoundKind, v: i + 3 })),
  { t: T.total, kind: "note", v: 2 },
  { t: T.runner[0], kind: "note" },
  { t: T.runner[1], kind: "note", v: 1 },
  { t: T.sleep, kind: "lock", v: 1 },
  ...keyCues(LINES),
  { t: T.desk, kind: "lock" },
  ...T.copies.map(t => ({ t, kind: "tap" as SoundKind })),
  ...[...PLATE].map((_, i) => ({ t: plateAt(i), kind: "key" as SoundKind, v: i })),
  { t: T.on, kind: "tap" },
  { t: T.on + 0.12, kind: "done" },
];

export const f = (s: number) => Math.round(s * FPS);
