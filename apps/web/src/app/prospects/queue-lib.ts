/**
 * Small pure helpers for the Queue screen. No React.
 */
import type { QueueItem, SyntheticProspectsSeed } from '@apohenia/domain/schemas';

export interface LocalClock {
  text: string;
  /** 9:00 to 17:59 local = a reasonable calling window. */
  withinHours: boolean;
  /** Full accessible name. */
  name: string;
}

/** The prospect's local wall clock; null when the timezone is unknown to the runtime. */
export function localClock(timezone: string, now: number): LocalClock | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone });
    const parts = fmt.formatToParts(new Date(now));
    const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toUpperCase();
    const hour24 = (hourPart % 12) + (dayPeriod === 'PM' ? 12 : 0);
    const text = fmt.format(new Date(now)).replace(/\s?(AM|PM)$/i, (m) => m.trim().toLowerCase());
    const withinHours = hour24 >= 9 && hour24 < 18;
    return { text, withinHours, name: `Local time ${fmt.format(new Date(now))} (${timezone}), ${withinHours ? 'within' : 'outside'} calling hours` };
  } catch {
    return null;
  }
}

/** Case-insensitive match over the fields a person would search by. */
export function matchesQuery(item: QueueItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.contact, item.company, item.location, item.city, item.state, item.role, item.phone].some((f) => f.toLowerCase().includes(q));
}

/** Names of the other contacts that share this item's phone endpoint (a switchboard or a shared desk). */
export function sharedWith(seed: SyntheticProspectsSeed, item: QueueItem): string[] {
  return seed.contacts.filter((c) => c.id !== item.contact_id && c.endpoint_ids.includes(item.endpoint_id)).map((c) => c.name);
}

/** The endpoint label ("Copper Ridge switchboard (shared by two locations)") for the record sheet. */
export function endpointLabel(seed: SyntheticProspectsSeed, item: QueueItem): string | null {
  return seed.endpoints.find((e) => e.id === item.endpoint_id)?.label ?? null;
}
