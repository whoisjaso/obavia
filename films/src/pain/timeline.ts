/* Day 44. The pain of one sale's paperwork, felt on the owner's own phone.

   Act one: a lock screen at night fills with the texts every BHPH owner knows:
   the buyer with no title, the office with a rejected 130-U, the reminder
   that it's day 44, missed calls, and a notice of complaint. Act two: black,
   typed lines that name the cost and ask the question. Act three: the Desk's
   own title screen, three days left, Filed It Today.

   Facts on screen, and where they come from:
   - 45 days to file the title on a seller-financed sale: Tex. Transp. Code
     501.0234 (the Desk's own title watch counts the same 45).
   - Failing to transfer title on time: a warning letter up to $10,000 per
     vehicle: TxDMV Enforcement, Motor Vehicle Dealers Disciplinary Matrix.
   - A buyer who goes to the tax office about a missing transfer gets the
     dealer a complaint: TxDMV Motor Vehicle Dealer Manual, chapter 6.
   Names are fictional. */
import type { Cue, SoundKind } from "../evening/timeline";
import { keyCues, type Line } from "./typed";

export const FPS = 30;
export const SECONDS = 26;
export const FRAMES = FPS * SECONDS;

export type Note = { t: number; app: "Messages" | "Reminders" | "Phone" | "Mail"; from: string; text: string };
export const NOTES: Note[] = [
  { t: 0.9, app: "Messages", from: "Marcus", text: "hey its been 6 weeks. still no title in my name" },
  { t: 2.3, app: "Messages", from: "Dee · Office", text: "county kicked the 130-U back. wrong box again" },
  { t: 3.4, app: "Reminders", from: "Reminders", text: "Marcus title · day 44" },
  { t: 4.3, app: "Messages", from: "Marcus", text: "insurance says they cant renew without it" },
  { t: 5.0, app: "Phone", from: "Missed Call", text: "Marcus" },
  { t: 5.55, app: "Messages", from: "Dee · Office", text: "need you to re-sign the POA tonight" },
  { t: 6.0, app: "Messages", from: "Marcus", text: "should i just go to the tax office myself?" },
  { t: 6.35, app: "Phone", from: "Missed Call", text: "Marcus (2)" },
  { t: 6.65, app: "Messages", from: "Marcus", text: "???" },
  { t: 7.7, app: "Mail", from: "Notice of Complaint", text: "Title not transferred within the required time. A response is required." },
];

export const LINES: Line[] = [
  { t: 10.0, text: "One sale.", size: 112 },
  { t: 11.5, text: "45 days to file the title.", size: 88, note: "Seller-financed sale, Texas" },
  { t: 13.9, text: "Miss it: up to $10,000. Per car.", size: 88, note: "TxDMV dealer disciplinary matrix" },
  { t: 16.6, text: "How many are on your lot right now?", size: 88 },
];

export const T = {
  wake: 0.35,       // the screen is already lit by the first text
  sleep: 9.3,       // lock click: the owner puts it face down
  linesOut: [11.25, 13.65, 16.35, 19.6],
  desk: 19.9,       // the Desk's title screen
  tap: 21.5,        // Filed It Today
  pull: 22.9,
  end: SECONDS,
} as const;

/** Every sound: the notifications, the keys under the typed lines, one lock, one tap, one done. */
export const CUES: Cue[] = [
  ...NOTES.map((n, i) => ({ t: n.t, kind: (n.app === "Phone" ? "buzz" : "note") as SoundKind, v: n.app === "Mail" ? 2 : i % 3 === 2 ? 1 : 0 })),
  { t: NOTES[NOTES.length - 1].t, kind: "buzz" as SoundKind, v: 1 },
  { t: T.sleep, kind: "lock" as SoundKind, v: 1 },
  ...keyCues(LINES),
  { t: T.desk, kind: "lock" as SoundKind },
  { t: T.tap, kind: "tap" as SoundKind },
  { t: T.tap + 0.12, kind: "done" as SoundKind },
];

export const f = (s: number) => Math.round(s * FPS);
