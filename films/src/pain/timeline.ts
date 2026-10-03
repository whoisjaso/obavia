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
import type { Cue } from "../evening/timeline";
import type { Line } from "./typed";

export const FPS = 30;
export const SECONDS = 59;
export const FRAMES = FPS * SECONDS;

export type Note = { t: number; app: "Messages" | "Reminders" | "Phone" | "Mail"; from: string; text: string };
export const NOTES: Note[] = [
  { t: 1.5, app: "Messages", from: "Marcus", text: "hey its been 6 weeks. still no title in my name" },
  { t: 4.0, app: "Messages", from: "Dee · Office", text: "county kicked the 130-U back. wrong box again" },
  { t: 6.3, app: "Reminders", from: "Reminders", text: "Marcus title · day 44" },
  { t: 8.4, app: "Messages", from: "Marcus", text: "insurance says they cant renew without it" },
  { t: 10.3, app: "Phone", from: "Missed Call", text: "Marcus" },
  { t: 12.0, app: "Messages", from: "Dee · Office", text: "need you to re-sign the POA tonight" },
  { t: 13.6, app: "Messages", from: "Marcus", text: "should i just go to the tax office myself?" },
  { t: 15.1, app: "Phone", from: "Missed Call", text: "Marcus (2)" },
  { t: 16.5, app: "Messages", from: "Marcus", text: "???" },
  { t: 19.0, app: "Mail", from: "Notice of Complaint", text: "Title not transferred within the required time. A response is required." },
];

const SLOW = 11;   // characters a second: slow enough to read as it types
export const LINES: Line[] = [
  { t: 24.0, text: "One sale.", size: 112, cps: SLOW },
  { t: 27.4, text: "45 days to file the title.", size: 88, note: "Seller-financed sale, Texas", cps: SLOW },
  { t: 33.2, text: "Miss it: up to $10,000. Per car.", size: 88, note: "TxDMV dealer disciplinary matrix", cps: SLOW },
  { t: 39.6, text: "How many are on your lot right now?", size: 88, cps: SLOW },
];

/* Slow on purpose: every text holds long enough to read. */
export const T = {
  wake: 0.8,        // the screen is already lit by the first text
  sleep: 23.0,      // the owner puts it face down (silent)
  linesOut: [26.8, 32.6, 39.0, 46.5],
  desk: 47.0,       // the Desk's title screen
  tap: 50.5,        // Filed It Today (silent)
  pull: 53.0,
  end: SECONDS,
} as const;

/** The only sound: the notification, once per notification. The complaint's falls. */
export const CUES: Cue[] = NOTES.map((n, i) => ({ t: n.t, kind: "note" as const, v: n.app === "Mail" ? 2 : i % 3 === 2 ? 1 : 0 }));

export const f = (s: number) => Math.round(s * FPS);
