/**
 * Sequential dialer (brief §9): human-started session, one active call, cancellable countdown,
 * checks re-run before every dial, disposition required before the next record, pause on inbound /
 * disconnect / unresolved disposition. Demo mode is synthetic and never dials a phone.
 *
 * Owning module agent: M-core. Persisted at `dial.session`, `dial.history`, `dial.suppression`.
 */
import { z } from 'zod';

export const DialMode = z.enum(['demo', 'live']);
export type DialMode = z.infer<typeof DialMode>;

/** Contact-policy state of a queue item. `allow` in demo only means "a synthetic call may be simulated". */
export const PolicyStatus = z.enum(['allow', 'requires_review', 'suppressed']);
export type PolicyStatus = z.infer<typeof PolicyStatus>;

export const DialEntrypoint = z.enum(['cold', 'inbound']);
export type DialEntrypoint = z.infer<typeof DialEntrypoint>;

/** One record prepared for the sequential session (built from the synthetic prospect seed). */
export const QueueItem = z.object({
  id: z.string(),
  contact_id: z.string(),
  company: z.string(),
  /** Location name when it differs from the company (dealer groups). */
  location: z.string(),
  contact: z.string(),
  role: z.string(),
  city: z.string(),
  state: z.string(),
  timezone: z.string(),
  /** E.164, fictional 555-01xx range. */
  phone: z.string(),
  endpoint_id: z.string(),
  policy_status: PolicyStatus,
  /** Which script entry node applies (inbound = the prospect acted first). */
  entrypoint: DialEntrypoint,
  /** For inbound: the documented prospect action ("requested a callback through the website"). */
  inbound_action: z.string().nullable(),
  /** Synthetic transcript this contact's demo call plays, when one was authored. */
  call_id: z.string().nullable(),
  /** Always true: every record is fictional. */
  fictional: z.literal(true),
});
export type QueueItem = z.infer<typeof QueueItem>;

export const DialResult = z.enum(['no_answer', 'voicemail', 'gatekeeper', 'connected', 'failed']);
export type DialResult = z.infer<typeof DialResult>;

/** Wrap-up dispositions (brief §9 statuses, the nine outcome tiles). */
export const DispositionKind = z.enum(['no_answer', 'voicemail', 'gatekeeper', 'callback', 'talked', 'meeting', 'qualified', 'no_fit', 'do_not_call']);
export type DispositionKind = z.infer<typeof DispositionKind>;

export const Disposition = z.object({
  kind: DispositionKind,
  /** ISO time for `callback`; chosen from tiles, never typed. */
  callback_at: z.string().optional(),
  at: z.string(),
});
export type Disposition = z.infer<typeof Disposition>;

export const AttemptStatus = z.enum(['dialing', 'ringing', 'connected', 'wrapup', 'done', 'cancelled', 'skipped']);
export type AttemptStatus = z.infer<typeof AttemptStatus>;

/** One dial attempt (or a logged skip) inside a session. */
export const Attempt = z.object({
  id: z.string(),
  /** 1-based dial number within the session; 0 for skips. */
  n: z.number().int().nonnegative(),
  item_id: z.string(),
  phone: z.string(),
  contact: z.string(),
  company: z.string(),
  started_at: z.string(),
  status: AttemptStatus,
  dial_result: DialResult.nullable(),
  connected_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  talk_ms: z.number().nonnegative(),
  disposition: Disposition.nullable(),
  /** Synthetic transcript played for a demo connection. */
  transcript_id: z.string().nullable(),
  skip_reasons: z.array(z.string()),
});
export type Attempt = z.infer<typeof Attempt>;

export const SuppressionReason = z.enum(['do_not_call', 'opt_out_requested']);
export type SuppressionReason = z.infer<typeof SuppressionReason>;

/** A number that must never be dialed again. Durable across sessions (`dial.suppression`). */
export const SuppressionEntry = z.object({
  phone: z.string(),
  item_id: z.string(),
  contact: z.string(),
  at: z.string(),
  reason: SuppressionReason,
  session_id: z.string().nullable(),
});
export type SuppressionEntry = z.infer<typeof SuppressionEntry>;

export const PauseReason = z.enum(['user', 'inbound', 'disconnect', 'checks_failed', 'queue_empty']);
export type PauseReason = z.infer<typeof PauseReason>;

export const EndReason = z.enum(['user', 'queue_empty', 'checks_failed']);
export type EndReason = z.infer<typeof EndReason>;

export const SessionStatus = z.enum(['idle', 'arming', 'dialing', 'ringing', 'connected', 'wrapup', 'cooldown', 'paused', 'ended']);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionStats = z.object({
  dials: z.number().int().nonnegative(),
  connects: z.number().int().nonnegative(),
  talked: z.number().int().nonnegative(),
  next_steps: z.number().int().nonnegative(),
  talk_ms: z.number().nonnegative(),
  session_ms: z.number().nonnegative(),
});
export type SessionStats = z.infer<typeof SessionStats>;

export const SessionLogEntry = z.object({
  at: z.string(),
  kind: z.enum(['start', 'arm', 'cancel', 'dial', 'result', 'end_call', 'disposition', 'skip', 'pause', 'resume', 'suppress', 'end', 'refuse']),
  text: z.string(),
});
export type SessionLogEntry = z.infer<typeof SessionLogEntry>;

/** The whole reducer state. Persisted as `dial.session`. */
export const DialSession = z.object({
  id: z.string().nullable(),
  status: SessionStatus,
  mode: DialMode,
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  ended_reason: EndReason.nullable(),
  queue: z.array(QueueItem),
  /** Index of the current / next record in `queue`. */
  cursor: z.number().int().nonnegative(),
  attempts: z.array(Attempt),
  /** Suppressions written during THIS session (merged into the durable list by the UI). */
  suppression: z.array(SuppressionEntry),
  /** Milliseconds spent in the current status. */
  elapsed_ms: z.number().nonnegative(),
  session_ms: z.number().nonnegative(),
  pause_reason: PauseReason.nullable(),
  /** A pause requested while a call was active; applied after the disposition. */
  pause_requested: PauseReason.nullable(),
  /** End requested while a call was active; applied after the disposition. */
  end_requested: z.boolean(),
  /** A refused START_SESSION (live gate) — the reasons, shown as a sheet. */
  refusal: z.object({ at: z.string(), reasons: z.array(z.string()) }).nullable(),
  log: z.array(SessionLogEntry),
  stats: SessionStats,
});
export type DialSession = z.infer<typeof DialSession>;

/** An ended session as kept in `dial.history` (capped at 50, newest first). */
export const SessionHistoryEntry = z.object({
  id: z.string(),
  mode: DialMode,
  started_at: z.string(),
  ended_at: z.string(),
  ended_reason: EndReason,
  stats: SessionStats,
  attempts: z.array(Attempt),
});
export type SessionHistoryEntry = z.infer<typeof SessionHistoryEntry>;

export const DialHistory = z.array(SessionHistoryEntry).max(50);
export type DialHistory = z.infer<typeof DialHistory>;

export const DialSuppressionList = z.array(SuppressionEntry);
export type DialSuppressionList = z.infer<typeof DialSuppressionList>;

/** Demo-only preferences. `playback_rate` speeds the synthetic transcript up (never the countdowns). */
export const DialPrefs = z.object({
  playback_rate: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]).default(1),
});
export type DialPrefs = z.infer<typeof DialPrefs>;

// ---------------------------------------------------------------------------------------------
// Synthetic prospect seed (data/synthetic_prospects.json). Every record is FICTIONAL.
// ---------------------------------------------------------------------------------------------

export const SyntheticCompany = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['dealer_group', 'single_store']),
});
export type SyntheticCompany = z.infer<typeof SyntheticCompany>;

export const SyntheticLocation = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string(),
  city: z.string(),
  state: z.string(),
  timezone: z.string(),
  /** Endpoint id of the shared switchboard, if any. */
  switchboard_endpoint_id: z.string().nullable(),
});
export type SyntheticLocation = z.infer<typeof SyntheticLocation>;

export const SyntheticEndpoint = z.object({
  id: z.string(),
  /** E.164, fictional 555-01xx range. */
  e164: z.string().regex(/^\+1555010\d{4}$/),
  label: z.string(),
  source: z.literal('synthetic'),
  verified_at: z.null(),
  /** No reviewed contact policy exists for any synthetic number. */
  contact_policy: z.literal('requires_review'),
  jurisdiction: z.literal('unknown'),
});
export type SyntheticEndpoint = z.infer<typeof SyntheticEndpoint>;

export const SyntheticContact = z.object({
  id: z.string(),
  location_id: z.string(),
  name: z.string(),
  role: z.string(),
  endpoint_ids: z.array(z.string()).min(1),
  /** Synthetic call that used this contact, if any. */
  call_id: z.string().nullable(),
  entrypoint: DialEntrypoint,
  inbound_action: z.string().nullable(),
  /** Explicit opt-out on record → never in a dialable queue. */
  suppression: z.enum(['opt_out_requested']).nullable(),
  /** Position in the demo queue (ascending). */
  queue_order: z.number().int().nonnegative(),
});
export type SyntheticContact = z.infer<typeof SyntheticContact>;

export const SyntheticProspectsSeed = z.object({
  _status: z.string().optional(),
  _note: z.string().optional(),
  companies: z.array(SyntheticCompany),
  locations: z.array(SyntheticLocation),
  endpoints: z.array(SyntheticEndpoint),
  contacts: z.array(SyntheticContact),
});
export type SyntheticProspectsSeed = z.infer<typeof SyntheticProspectsSeed>;
