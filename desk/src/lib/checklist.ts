/* The runbook as the Desk's own checklist (gap table W4-C; phases.md Phase 5 Ops "the runbook as the Desk's own
   checklist"). The rows are docs/plan/ops-runbook.md §20, "The daily checklist (one page)", under the runbook's own two
   headings, each row the runbook's line verbatim or shorter, never longer (checklist.test.ts holds every row against the
   file). The desk person ticks each as it is done; the ticks are kept per day on this device and cleared by the one faint
   Reset at the foot. Nothing here changes a step: the runbook is the record, this is the page it is read from. */

export type ChecklistRow = { id: string; text: string };
export type ChecklistGroup = { heading: string; rows: ChecklistRow[] };

/** ops-runbook.md §20, the two headings and their numbered lines, in the file's order. The section references
    ("§13", "(§5, §16, §16a)") and the route in brackets are left out: on the glass the row is the thing to do. */
export const CHECKLIST: ChecklistGroup[] = [
  { heading: 'Morning, before 10 am', rows: [
    { id: 'm1', text: 'Ask the owner: "Was last night equal?" Write yes or no. If "balance below deposits held", no car goes live today.' },
    { id: 'm2', text: 'Open the Lane list on the pilot\'s device. Open every car in Sold.' },
    { id: 'm3', text: 'For each sale still Owed: has the money landed? Yes: press Paid At The Lot now. A deadline that passes unmarked forfeits, with no undo.' },
    { id: 'm4', text: 'For each sale with a deadline before tonight: write its Pay by in the desk log for the 9 pm check.' },
    { id: 'm5', text: 'The title and tax dots on every Sold page: amber means act this week; red means today, and tell the owner.' },
    { id: 'm6', text: 'Every live car has its Buyers Guide on the window. Every car being picked up today has its Buyers Guide on it.' },
    { id: 'm7', text: 'No live car is at the mechanic or off the licensed lot. Nobody works on a car while it is on the lane.' },
    { id: 'm8', text: 'The one number: every text and voicemail since last night has its reply and its desk log line.' },
    { id: 'm9', text: 'Before any walk-in sale today: check the car is not on the Lane list.' },
  ] },
  { heading: '9 pm', rows: [
    { id: 'n1', text: 'The one number: answer every text from today with its reply. Anything for the owner goes to the owner tonight, with the callback time.' },
    { id: 'n2', text: 'Lots closing tonight: the Live page open. Do not press Sell It Now while the ring is blue.' },
    { id: 'n3', text: 'Every hammer since the morning: the winner call, or "not called: no number" in the log.' },
    { id: 'n4', text: 'Every deadline before tomorrow morning: if the money is in, Paid At The Lot now.' },
    { id: 'n5', text: 'Every pickup today: It Started pressed, or the reason it was not in the log.' },
    { id: 'n6', text: 'Write the day\'s counts in the desk log: Sold, called within the hour, started, no-shows, wrong-car scans, voids.' },
  ] },
];
export const CHECKLIST_ROWS = CHECKLIST.flatMap(g => g.rows);

/** The row on the glass: the first sentence is the bold line (the verb), the rest the small line under it. */
export function splitRow(text: string): { lead: string; rest: string } {
  const m = /^(.*?[.?!]["”]?)(\s+(.*))?$/.exec(text);
  if (!m || !m[3]) return { lead: text, rest: '' };
  return { lead: m[1], rest: m[3] };
}

/* ---------- the ticks, per day, on this device ---------- */
const KEY = 'obavia.desk.checklist:';
export type Ticks = Record<string, true>;
export function readTicks(day: string, store: Pick<Storage, 'getItem'> | null = storage()): Ticks {
  try { const v = store?.getItem(KEY + day); const t = v ? JSON.parse(v) : {}; return t && typeof t === 'object' ? t : {}; } catch { return {}; }
}
export function writeTicks(day: string, ticks: Ticks, store: Pick<Storage, 'setItem' | 'removeItem'> | null = storage()) {
  try { if (Object.keys(ticks).length) store?.setItem(KEY + day, JSON.stringify(ticks)); else store?.removeItem(KEY + day); } catch { /* private mode */ }
}
export const toggleTick = (ticks: Ticks, id: string): Ticks => { const n = { ...ticks }; if (n[id]) delete n[id]; else n[id] = true; return n; };
/** Every row of a group ticked: the moment the last one lands gets the chime (DOCTRINE §4 rule 14). */
export const groupDone = (g: ChecklistGroup, ticks: Ticks) => g.rows.every(r => !!ticks[r.id]);
function storage(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } }
