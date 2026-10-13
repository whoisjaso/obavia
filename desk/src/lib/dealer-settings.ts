/* The dealer's lane settings (gap-table Wave 2-C; phases Phase 2, Onboarding (dealer)): whether cars
   go on the lane, the pickup hours, the pickup address and the after-hours line. Asked once at
   onboarding, one question a page, and changed later from the same pages (Onboarding.tsx, LaneSettings).

   The lot carries them (auction/worker/README.md, CarMeta in lib/auction.ts): `hours` is the list of
   pickup windows the buyer picks one of on Pickup (auction/src/sale.ts pickupWhen; an empty list is
   "Call to set a time"), `dealer.afterHours` is the number under them, `dealer.street` the address.
   lotFields() is what Go sends; the Go wiring is the dealers agent's (Auction.tsx). */
import type { DealerConfig } from './config';
import type { DealerRecord, DealerIndex } from './dealers';
import { formatPhone, phoneToE164 } from './forms/phone';

/** The three hour choices (ops runbook: the desk says the pickup hours on every call). Hyphens, not
    dashes: pickupWhen folds any dash to a hyphen, so the buyer sees the same text either way. */
export const HOURS = {
  weekdays: { label: 'Mon To Fri, 9 To 6', hours: ['Mon-Fri 9 am-6 pm'] },
  saturday: { label: 'Mon To Sat, 9 To 6', hours: ['Mon-Fri 9 am-6 pm', 'Sat 9 am-6 pm'] },
  call: { label: 'Call To Set A Time', hours: [] as string[] },
} as const;
export type HoursChoice = keyof typeof HOURS;
export const HOURS_ORDER: HoursChoice[] = ['weekdays', 'saturday', 'call'];

export type DealerSettings = {
  lane: boolean;          // "Let cars go on the lane"
  hours: string[];        // the lot's `hours`, as the buyer's Pickup reads them
  address: string;        // the pickup address, one line: street, city, state zip
  afterHours: string;     // E.164, +1 and ten digits
  /* The Whop connected account the dealer is paid into (dealers.whop_account), as the Worker masks it
     ("biz_••••ab12"): kept here once the Whop page connected it or GET /dealers/me said so, so the
     settings row has a word before the lane answers. Null is "Not yet". The Worker's row is the record. */
  whopAccount: string | null;
};

/** Which of the three choices a stored list is, or null for a list the Desk did not write. */
export function hoursChoice(hours: string[]): HoursChoice | null {
  return HOURS_ORDER.find(k => HOURS[k].hours.length === hours.length && HOURS[k].hours.every((h, i) => h === hours[i])) ?? null;
}

/** The lot's address on one line, the shape CarMeta's dealer.street already takes. */
export function oneLine(d: Pick<DealerConfig, 'street' | 'city' | 'state' | 'zip'>): string {
  const tail = [d.state, d.zip].filter(x => x?.trim()).join(' ');
  return [d.street, d.city, tail].map(x => (x ?? '').trim()).filter(Boolean).join(', ');
}

/** A US number in E.164 with a real area code and exchange (the Worker's /me/phone rule). */
export const E164 = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
export const toE164 = (v: string) => phoneToE164(v) ?? '';

/** The settings before the dealer answers: on for a lane key, weekdays 9 to 6, the lot's address and the Desk's phone. */
export function defaultSettings(dealer: Pick<DealerConfig, 'street' | 'city' | 'state' | 'zip' | 'phone'>, laneKey: boolean): DealerSettings {
  return { lane: laneKey, hours: [...HOURS.weekdays.hours], address: oneLine(dealer), afterHours: toE164(dealer.phone), whopAccount: null };
}

export type SettingsProblem = 'afterHours' | 'address' | 'hours';
/** What is wrong, field by field; empty when the settings can go on a lot. Lane off still validates:
    turning it on later sends the same fields. */
export function problems(s: DealerSettings): SettingsProblem[] {
  const out: SettingsProblem[] = [];
  if (!E164.test(s.afterHours)) out.push('afterHours');
  if (!s.address.trim()) out.push('address');
  if (!Array.isArray(s.hours) || s.hours.some(h => typeof h !== 'string' || !h.trim())) out.push('hours');
  return out;
}
export const isValid = (s: DealerSettings) => problems(s).length === 0;

/** The lane may take a lot from this dealer: the toggle is on and every field is valid. Go checks it before lotFields. */
export const laneReady = (s: DealerSettings) => s.lane && isValid(s);

/** What Go sends with the lot: `hours` as stored, `afterHours` printed the way dealer.phone already
    goes ("(214) 555-0142"; the Worker's shill check compares digits only), `address` for dealer.street. */
export function lotFields(s: DealerSettings): { hours: string[]; afterHours: string; address: string } {
  return { hours: [...s.hours], afterHours: formatPhone(s.afterHours), address: s.address.trim() };
}

/** The GDN inside a dealer key: `d:P123456.<sig>` is P123456. The admin key (`d:*`) and anything else is null. */
export function gdnFromKey(key: string | null | undefined): string | null {
  const m = /^d:([A-Za-z0-9]+)\.[A-Za-z0-9_-]+$/.exec((key ?? '').trim());
  return m ? m[1].toUpperCase() : null;
}

/** The TxDMV record for that GDN, or null when the list does not carry it. */
export function recordFor(idx: Pick<DealerIndex, 'list'> | null | undefined, gdn: string | null): DealerRecord | null {
  if (!idx || !gdn) return null;
  return idx.list.find(d => d.licence.toUpperCase() === gdn) ?? null;
}
