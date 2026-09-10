/**
 * Transcript normalization (brief §12 common model). Provider sequence is NOT assumed
 * globally ordered across speakers. Interim text is never a verified quote.
 *
 * Shared schema (skeleton-owned). Consumed by M-vocab; extend additively only.
 */
import { z } from 'zod';

export const SpeakerRole = z.enum(['representative', 'prospect', 'unknown']);
export type SpeakerRole = z.infer<typeof SpeakerRole>;

export const TranscriptTurn = z.object({
  workspace_id: z.string(),
  call_id: z.string(),
  /** e.g. "synthetic", "twilio_native". */
  provider: z.string(),
  transcription_session_id: z.string(),
  /** Documented provider event identifier, used with provider_sequence for dedupe. */
  provider_event_key: z.string(),
  provider_sequence: z.number().int().nonnegative(),
  /** Provider track name (leg-relative; not universally "representative"/"prospect"). */
  track: z.string(),
  speaker_role: SpeakerRole,
  utterance_id: z.string(),
  /** Revision of this utterance; a later revision replaces earlier text and invalidates dependents. */
  revision: z.number().int().nonnegative(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  text: z.string(),
  is_final: z.boolean(),
  /** Provider confidence, only when the provider supplied one. Distinct from partial-result stability. */
  confidence_if_provided: z.number().min(0).max(1).nullable(),
  /** Consent epoch under which this turn was captured. */
  consent_epoch: z.number().int().nonnegative(),
  received_at: z.string(),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurn>;

/** A synthetic or recorded call transcript used by practice and the vocabulary display. */
export const Transcript = z.object({
  call_id: z.string(),
  title: z.string(),
  /** Always true in Increment 1 — no real prospect audio exists. */
  synthetic: z.boolean(),
  turns: z.array(TranscriptTurn),
});
export type Transcript = z.infer<typeof Transcript>;
