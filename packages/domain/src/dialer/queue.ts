/**
 * Queue builder: synthetic prospect seed → ordered `QueueItem`s for a sequential session.
 *
 * Policy truth: every synthetic endpoint carries `contact_policy: requires_review` (no reviewed
 * policy exists). In DEMO mode the item is marked `allow` because nothing is dialed — the simulator
 * plays a synthetic transcript. In LIVE mode the same item stays `requires_review` and the reducer's
 * precheck refuses it until a reviewed policy exists. A contact with an opt-out on record is
 * `suppressed` in every mode and never dialed.
 */
import type { DialMode, QueueItem, SyntheticContact, SyntheticProspectsSeed } from '../schemas/dialer';
import { syntheticProspectsSeed } from './seed';

export interface BuildQueueOptions {
  mode: DialMode;
  /** Durable suppression list (E.164 numbers) from earlier sessions. */
  suppressed?: readonly string[];
}

/** Build the queue from a seed. Deterministic: sorted by `queue_order`, then contact id. */
export function buildQueue(seed: SyntheticProspectsSeed, options: BuildQueueOptions): QueueItem[] {
  const locations = new Map(seed.locations.map((l) => [l.id, l]));
  const companies = new Map(seed.companies.map((c) => [c.id, c]));
  const endpoints = new Map(seed.endpoints.map((e) => [e.id, e]));
  const suppressed = new Set(options.suppressed ?? []);
  const contacts = [...seed.contacts].sort((a, b) => a.queue_order - b.queue_order || a.id.localeCompare(b.id));
  const items: QueueItem[] = [];
  for (const contact of contacts) {
    const location = locations.get(contact.location_id);
    if (!location) throw new Error(`contact ${contact.id} references unknown location ${contact.location_id}`);
    const company = companies.get(location.company_id);
    if (!company) throw new Error(`location ${location.id} references unknown company ${location.company_id}`);
    const endpoint = endpoints.get(primaryEndpointId(contact));
    if (!endpoint) throw new Error(`contact ${contact.id} references unknown endpoint ${primaryEndpointId(contact)}`);
    const policy_status = contact.suppression !== null || suppressed.has(endpoint.e164) ? 'suppressed' : options.mode === 'demo' ? 'allow' : 'requires_review';
    items.push({
      id: `q-${contact.id}`,
      contact_id: contact.id,
      company: company.name,
      location: location.name,
      contact: contact.name,
      role: contact.role,
      city: location.city,
      state: location.state,
      timezone: location.timezone,
      phone: endpoint.e164,
      endpoint_id: endpoint.id,
      policy_status,
      entrypoint: contact.entrypoint,
      inbound_action: contact.inbound_action,
      call_id: contact.call_id,
      fictional: true,
    });
  }
  return items;
}

/** A direct line wins over a shared switchboard when the contact has both. */
function primaryEndpointId(contact: SyntheticContact): string {
  return contact.endpoint_ids[contact.endpoint_ids.length - 1] ?? contact.endpoint_ids[0]!;
}

/** Convenience: the demo queue from the bundled seed. */
export function demoQueue(suppressed: readonly string[] = []): QueueItem[] {
  return buildQueue(syntheticProspectsSeed(), { mode: 'demo', suppressed });
}

/** Items that a session could dial (not suppressed). */
export function dialableItems(queue: readonly QueueItem[]): QueueItem[] {
  return queue.filter((q) => q.policy_status !== 'suppressed');
}

/** Glyph chip for a queue item's policy state (DESIGN_SYSTEM §3.7): ✓ ok · ◔ review · ⊘ DNC. */
export function policyGlyph(status: QueueItem['policy_status']): { glyph: '✓' | '◔' | '⊘'; word: 'ok' | 'review' | 'DNC'; name: string } {
  switch (status) {
    case 'allow':
      return { glyph: '✓', word: 'ok', name: 'Allowed — demo: a synthetic call may be simulated; no real call is placed' };
    case 'requires_review':
      return { glyph: '◔', word: 'review', name: 'Requires review — no reviewed contact policy for this number' };
    case 'suppressed':
      return { glyph: '⊘', word: 'DNC', name: 'Do not call — opt-out on record; never dialed' };
    default:
      return { glyph: '◔', word: 'review', name: 'Requires review' };
  }
}

/** First name for the `{prospect_name}` slot; null when the contact is not identified. */
export function prospectFirstName(item: Pick<QueueItem, 'contact'>): string | null {
  const first = item.contact.trim().split(/\s+/)[0] ?? '';
  if (!first || /^(unknown|internet|general|owner)$/i.test(first)) return null;
  return first.replace(/[^\p{L}'-]/gu, '') || null;
}

/** Slot facts known from the record itself (never invented): prospect name, dealership, inbound action. */
export function knownFactsFor(item: QueueItem): Record<string, string> {
  const facts: Record<string, string> = { dealership_name: item.company };
  const first = prospectFirstName(item);
  if (first) facts['prospect_name'] = first;
  if (item.entrypoint === 'inbound' && item.inbound_action) facts['documented_action'] = item.inbound_action;
  return facts;
}
