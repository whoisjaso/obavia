/**
 * Synthetic CRM records (brief §9) for /prospects and /pipeline. Every record is FICTIONAL.
 * Companies, locations, contacts and phone endpoints are separate; several locations may share one
 * switchboard and several contacts may share one number. Nothing here authorizes a call.
 */

export type ContactPolicy = 'requires_review';

export interface SyntheticCompany {
  id: string;
  name: string;
  kind: 'dealer_group' | 'single_store';
}

export interface SyntheticLocation {
  id: string;
  company_id: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  /** Endpoint id of the shared switchboard, if any. */
  switchboard_endpoint_id: string | null;
}

export interface PhoneEndpoint {
  id: string;
  /** E.164, fictional 555-01xx range. */
  e164: string;
  label: string;
  source: 'synthetic';
  verified_at: null;
  contact_policy: ContactPolicy;
  jurisdiction: 'unknown';
}

export interface SyntheticContact {
  id: string;
  location_id: string;
  name: string;
  role: string;
  endpoint_ids: string[];
  /** Synthetic call that used this contact, if any. */
  call_id: string | null;
}

export const SYNTHETIC_ENDPOINTS: PhoneEndpoint[] = [
  { id: 'ep-001', e164: '+15550100001', label: 'Riverbend Motors main line', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-002', e164: '+15550100002', label: 'Copper Ridge switchboard (shared by two locations)', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-003', e164: '+15550100003', label: 'Harbor Lane Motors internet desk (shared by two contacts)', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-004', e164: '+15550100004', label: 'Northgate Auto Plaza main line', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-005', e164: '+15550100005', label: 'Summit Trail Motors main line', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-006', e164: '+15550100006', label: 'Blue Heron Autos main line', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-007', e164: '+15550100007', label: 'Prairie Wind Motorcars main line', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-008', e164: '+15550100008', label: 'Ironwood Auto Mall main line', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
  { id: 'ep-009', e164: '+15550100009', label: 'Copper Ridge — Marcus Ferreira direct', source: 'synthetic', verified_at: null, contact_policy: 'requires_review', jurisdiction: 'unknown' },
];

export const SYNTHETIC_COMPANIES: SyntheticCompany[] = [
  { id: 'co-riverbend', name: 'Riverbend Motors', kind: 'single_store' },
  { id: 'co-copper-ridge', name: 'Copper Ridge Auto Group', kind: 'dealer_group' },
  { id: 'co-harbor-lane', name: 'Harbor Lane Motors', kind: 'single_store' },
  { id: 'co-northgate', name: 'Northgate Auto Plaza', kind: 'single_store' },
  { id: 'co-summit-trail', name: 'Summit Trail Motors', kind: 'single_store' },
  { id: 'co-blue-heron', name: 'Blue Heron Autos', kind: 'single_store' },
  { id: 'co-prairie-wind', name: 'Prairie Wind Motorcars', kind: 'single_store' },
  { id: 'co-ironwood', name: 'Ironwood Auto Mall', kind: 'single_store' },
];

export const SYNTHETIC_LOCATIONS: SyntheticLocation[] = [
  { id: 'loc-riverbend', company_id: 'co-riverbend', name: 'Riverbend Motors', city: 'Fictional City', state: 'TX', timezone: 'America/Chicago', switchboard_endpoint_id: null },
  { id: 'loc-copper-north', company_id: 'co-copper-ridge', name: 'Copper Ridge North', city: 'Fictional City', state: 'TX', timezone: 'America/Chicago', switchboard_endpoint_id: 'ep-002' },
  { id: 'loc-copper-south', company_id: 'co-copper-ridge', name: 'Copper Ridge South', city: 'Fictional City', state: 'TX', timezone: 'America/Chicago', switchboard_endpoint_id: 'ep-002' },
  { id: 'loc-harbor-lane', company_id: 'co-harbor-lane', name: 'Harbor Lane Motors', city: 'Fictional Harbor', state: 'WA', timezone: 'America/Los_Angeles', switchboard_endpoint_id: null },
  { id: 'loc-northgate', company_id: 'co-northgate', name: 'Northgate Auto Plaza', city: 'Fictional Heights', state: 'OH', timezone: 'America/New_York', switchboard_endpoint_id: null },
  { id: 'loc-summit-trail', company_id: 'co-summit-trail', name: 'Summit Trail Motors', city: 'Fictional Ridge', state: 'CO', timezone: 'America/Denver', switchboard_endpoint_id: null },
  { id: 'loc-blue-heron', company_id: 'co-blue-heron', name: 'Blue Heron Autos', city: 'Fictional Bay', state: 'FL', timezone: 'America/New_York', switchboard_endpoint_id: null },
  { id: 'loc-prairie-wind', company_id: 'co-prairie-wind', name: 'Prairie Wind Motorcars', city: 'Fictional Plains', state: 'KS', timezone: 'America/Chicago', switchboard_endpoint_id: null },
  { id: 'loc-ironwood', company_id: 'co-ironwood', name: 'Ironwood Auto Mall', city: 'Fictional Grove', state: 'MI', timezone: 'America/Detroit', switchboard_endpoint_id: null },
];

export const SYNTHETIC_CONTACTS: SyntheticContact[] = [
  { id: 'ct-dana', location_id: 'loc-riverbend', name: 'Dana Whitlock', role: 'General manager', endpoint_ids: ['ep-001'], call_id: 'syn-a-profit-not-revenue' },
  { id: 'ct-marcus', location_id: 'loc-copper-north', name: 'Marcus Ferreira', role: 'Dealer principal', endpoint_ids: ['ep-002', 'ep-009'], call_id: 'syn-b-staff-time' },
  { id: 'ct-copper-south-gm', location_id: 'loc-copper-south', name: 'Unknown (switchboard only)', role: 'General manager — not identified', endpoint_ids: ['ep-002'], call_id: null },
  { id: 'ct-priya', location_id: 'loc-harbor-lane', name: 'Priya Natarajan', role: 'General manager', endpoint_ids: ['ep-003'], call_id: 'syn-c-efficiency-confirmed' },
  { id: 'ct-harbor-internet', location_id: 'loc-harbor-lane', name: 'Internet director (name not confirmed)', role: 'Internet director', endpoint_ids: ['ep-003'], call_id: null },
  { id: 'ct-tom', location_id: 'loc-northgate', name: 'Tom Okafor', role: 'Owner', endpoint_ids: ['ep-004'], call_id: 'syn-d-gratification' },
  { id: 'ct-elena', location_id: 'loc-summit-trail', name: 'Elena Marsh', role: 'General manager', endpoint_ids: ['ep-005'], call_id: 'syn-e-basketball' },
  { id: 'ct-ray', location_id: 'loc-blue-heron', name: 'Ray Delgado', role: 'Owner', endpoint_ids: ['ep-006'], call_id: 'syn-f-revenue-rejected-quoted-other' },
  { id: 'ct-simone', location_id: 'loc-prairie-wind', name: 'Simone Achterberg', role: 'General manager', endpoint_ids: ['ep-007'], call_id: 'syn-g-profit-prophet-revision' },
  { id: 'ct-victor', location_id: 'loc-ironwood', name: 'Victor Lindqvist', role: 'Owner', endpoint_ids: ['ep-008'], call_id: 'syn-h-opt-out' },
];

export interface ProspectRow {
  contact: SyntheticContact;
  location: SyntheticLocation;
  company: SyntheticCompany;
  endpoints: PhoneEndpoint[];
  /** Other contacts sharing at least one endpoint. */
  shares_number_with: string[];
  /** Synthetic call H asked to be removed: suppressed pending review. */
  suppression: 'opt_out_requested' | null;
}

export function prospectRows(): ProspectRow[] {
  return SYNTHETIC_CONTACTS.map((contact) => {
    const location = SYNTHETIC_LOCATIONS.find((l) => l.id === contact.location_id)!;
    const company = SYNTHETIC_COMPANIES.find((c) => c.id === location.company_id)!;
    const endpoints = contact.endpoint_ids.map((id) => SYNTHETIC_ENDPOINTS.find((e) => e.id === id)!);
    const shares = SYNTHETIC_CONTACTS.filter((o) => o.id !== contact.id && o.endpoint_ids.some((id) => contact.endpoint_ids.includes(id))).map((o) => o.name);
    return { contact, location, company, endpoints, shares_number_with: shares, suppression: contact.call_id === 'syn-h-opt-out' ? 'opt_out_requested' : null };
  });
}

/** Call statuses (brief §9). A connected call is not a qualified opportunity; "won" is user-confirmed. */
export const CALL_STATUSES: { key: string; label: string; definition: string }[] = [
  { key: 'attempted', label: 'Attempted', definition: 'A human started a call attempt.' },
  { key: 'ringing', label: 'Ringing', definition: 'The far end is ringing; nobody has answered.' },
  { key: 'connected', label: 'Connected', definition: 'A person answered. Not automatically a qualified opportunity.' },
  { key: 'decision_maker_conversation', label: 'Decision-maker conversation', definition: 'The person who owns the decision was on the line.' },
  { key: 'callback_requested', label: 'Callback requested', definition: 'The prospect asked for a call at a stated time.' },
  { key: 'meeting_scheduled', label: 'Meeting scheduled', definition: 'A mutually agreed meeting with a date and timezone.' },
  { key: 'qualified', label: 'Qualified', definition: 'Relevant problem, fit and authority established from what the prospect said.' },
  { key: 'proposal_authorized', label: 'Proposal authorized', definition: 'The prospect explicitly asked for a proposal.' },
  { key: 'won', label: 'Won', definition: 'User-confirmed business outcome — never an LLM judgment.' },
  { key: 'lost', label: 'Lost', definition: 'User-confirmed: the prospect declined.' },
  { key: 'no_fit', label: 'No fit', definition: 'Respectful disqualification; a good outcome when honest.' },
  { key: 'do_not_call', label: 'Do not call', definition: 'Explicit opt-out. Persists through re-import and future scheduling.' },
];

export interface PipelineLane {
  key: string;
  label: string;
  definition: string;
}

export const PIPELINE_LANES: PipelineLane[] = [
  { key: 'agreed_follow_up', label: 'Agreed follow-up', definition: 'The prospect agreed to a specific next contact (date, timezone, resource). Only lane that permits a scheduled touch.' },
  { key: 'budget', label: 'Budget', definition: 'No approved budget yet. Not relabelled as fear or resistance (scenario 37).' },
  { key: 'authority', label: 'Authority', definition: 'Another authorized person must be in the decision. Ask who, do not push.' },
  { key: 'implementation', label: 'Implementation', definition: 'Fit exists, but the store cannot absorb a change now (staffing, systems, timing).' },
  { key: 'no_fit', label: 'No fit', definition: 'Honest disqualification. Recorded as a respected outcome, not a loss to reopen.' },
  { key: 'deferral', label: 'Deferral', definition: 'Prospect will decide later; no agreed date. A date may not be shifted without agreement.' },
  { key: 'no_contact', label: 'No contact', definition: 'Attempted, never connected. No inference about interest.' },
  { key: 'do_not_call', label: 'Do not call', definition: 'Explicit opt-out. Suppressed from every future list and reimport.' },
];

/** The source's 1/2/4/6/8-week lanes are a VIEW only; they never authorize unsolicited messaging. */
export const FOLLOW_UP_WEEK_VIEW = [1, 2, 4, 6, 8] as const;
export const FOLLOW_UP_WEEK_NOTE = 'A view, not permission to message: a week lane never authorizes an unsolicited touch or a shifted date without agreement.';

export interface PipelineCard {
  id: string;
  lane: string;
  company: string;
  contact: string;
  summary: string;
  call_id: string | null;
  timezone: string;
  agreed_when: string | null;
  synthetic: true;
}

export const SYNTHETIC_PIPELINE_CARDS: PipelineCard[] = [
  { id: 'pc-a', lane: 'agreed_follow_up', company: 'Riverbend Motors', contact: 'Dana Whitlock', summary: 'Walk-through with the internet manager. Their word: PROFIT (net, not gross).', call_id: 'syn-a-profit-not-revenue', timezone: 'America/Chicago', agreed_when: 'Thursday 10:00', synthetic: true },
  { id: 'pc-b', lane: 'agreed_follow_up', company: 'Copper Ridge Auto Group', contact: 'Marcus Ferreira', summary: 'Send one-page summary first, then pick a time next week. Their word: STAFF TIME.', call_id: 'syn-b-staff-time', timezone: 'America/Chicago', agreed_when: 'Next week (after summary)', synthetic: true },
  { id: 'pc-c', lane: 'agreed_follow_up', company: 'Harbor Lane Motors', contact: 'Priya Natarajan', summary: 'Fifteen minutes with the internet director. Confirmed shared term: EFFICIENCY.', call_id: 'syn-c-efficiency-confirmed', timezone: 'America/Los_Angeles', agreed_when: 'Friday morning', synthetic: true },
  { id: 'pc-d', lane: 'authority', company: 'Northgate Auto Plaza', contact: 'Tom Okafor', summary: 'Used-car director must be in the room (she has the weekend staff). Tuesday afternoon agreed.', call_id: 'syn-d-gratification', timezone: 'America/New_York', agreed_when: 'Tuesday afternoon', synthetic: true },
  { id: 'pc-e', lane: 'agreed_follow_up', company: 'Summit Trail Motors', contact: 'Elena Marsh', summary: 'Short call with Luis (internet manager) on the line next week.', call_id: 'syn-e-basketball', timezone: 'America/Denver', agreed_when: 'Next week', synthetic: true },
  { id: 'pc-f', lane: 'deferral', company: 'Blue Heron Autos', contact: 'Ray Delgado', summary: '"Send me something first and I\'ll decide." No date agreed. Their word: RETENTION.', call_id: 'syn-f-revenue-rejected-quoted-other', timezone: 'America/New_York', agreed_when: null, synthetic: true },
  { id: 'pc-g', lane: 'agreed_follow_up', company: 'Prairie Wind Motorcars', contact: 'Simone Achterberg', summary: 'Look at lead flow together. Clarify "the Prophet" (forecast sheet) before any calculation.', call_id: 'syn-g-profit-prophet-revision', timezone: 'America/Chicago', agreed_when: 'Wednesday', synthetic: true },
  { id: 'pc-h', lane: 'do_not_call', company: 'Ironwood Auto Mall', contact: 'Victor Lindqvist', summary: 'Asked to be taken off the list. Suppressed. No further contact.', call_id: 'syn-h-opt-out', timezone: 'America/Detroit', agreed_when: null, synthetic: true },
  { id: 'pc-i', lane: 'budget', company: 'Copper Ridge Auto Group (South)', contact: 'Unknown (switchboard only)', summary: 'Example: no approved budget this quarter. Not relabelled as fear.', call_id: null, timezone: 'America/Chicago', agreed_when: null, synthetic: true },
  { id: 'pc-j', lane: 'implementation', company: 'Harbor Lane Motors', contact: 'Internet director (name not confirmed)', summary: 'Example: CRM migration in progress; cannot absorb a process change until it lands.', call_id: null, timezone: 'America/Los_Angeles', agreed_when: null, synthetic: true },
  { id: 'pc-k', lane: 'no_fit', company: 'Example single-point store', contact: 'Example owner', summary: 'Example: no website inquiry volume to follow through on. Respectfully disqualified.', call_id: null, timezone: 'America/Chicago', agreed_when: null, synthetic: true },
  { id: 'pc-l', lane: 'no_contact', company: 'Example dealer group', contact: 'Example GM', summary: 'Example: two attempts, no answer. No inference about interest.', call_id: null, timezone: 'America/New_York', agreed_when: null, synthetic: true },
];
