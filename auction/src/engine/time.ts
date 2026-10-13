/* The pay-by words, one function for every surface (DOCTRINE CP9: the same deadline in the same words on
   the page, the push, the SMS and the Desk). Pure: no React, no platform. The phone's sale.ts, the Worker's
   push (worker/src/push.ts) and the Desk import this. */

/** The pilot's zone: Triple J is in Houston. A sender that is not the buyer's phone (the Worker, the Desk) passes it. */
export const PILOT_TZ = 'America/Chicago';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Thu 4 pm" on the hour, "Thu 4:37 pm" otherwise, on the clock of `timeZone` (the pilot's by default, so the
    phone, the push and the Desk say the same words wherever the device is). Write it after "Pay by". */
export function payByWords(at: number, timeZone: string = PILOT_TZ): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = DAYS.indexOf(get('weekday')), h = Number(get('hour')) % 24, m = Number(get('minute'));
  const clock = `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'pm' : 'am'}`;
  return `${DAYS[day]} ${clock}`;
}
