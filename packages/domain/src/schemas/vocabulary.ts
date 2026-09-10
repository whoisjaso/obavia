/**
 * THEIR WORDS strip and decision lenses (brief §7). Provenance distinguishes
 * prospect-originated quotes from seller-proposed/confirmed terms and model hypotheses.
 *
 * Owning module agent: M-vocab.
 */
import { z } from 'zod';
import { SpeakerRole } from './transcript';

export const Provenance = z.enum([
  'prospect_said',
  'seller_proposed_prospect_confirmed',
  'seller_only',
  'model_hypothesis',
]);
export type Provenance = z.infer<typeof Provenance>;

export const MeaningStatus = z.enum(['unknown', 'asked', 'explained', 'confirmed', 'invalidated']);
export type MeaningStatus = z.infer<typeof MeaningStatus>;

export const Stability = z.enum(['interim', 'final']);
export type Stability = z.infer<typeof Stability>;

export const VocabularyEvent = z.object({
  id: z.string(),
  call_id: z.string(),
  exact_text: z.string(),
  speaker_role: SpeakerRole,
  turn_id: z.string(),
  /** Character span within the turn text. */
  span: z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() }),
  revision: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
  /** Interim text may display as provisional but cannot become a confirmed quote until final. */
  stability: Stability,
  meaning: z.string().optional(),
  meaning_status: MeaningStatus,
  first_seen_turn: z.string(),
  last_seen_turn: z.string(),
  repetition_count: z.number().int().positive(),
  explicit_emphasis: z.boolean(),
  /** e.g. "Profit, not revenue" → { rejects: "revenue", note: "explicit contrast" }. */
  correction_or_negation: z.object({ rejects: z.string(), note: z.string() }).optional(),
  provenance: Provenance,
  source_role: SpeakerRole,
  pinned: z.boolean(),
  user_edits: z
    .object({ text: z.string().optional(), meaning: z.string().optional(), edited_at: z.string() })
    .optional(),
});
export type VocabularyEvent = z.infer<typeof VocabularyEvent>;

/** A pinned phrase on the THEIR WORDS strip (3–7 typical; not a hard maximum). */
export const PhrasePin = z.object({
  event_id: z.string(),
  call_id: z.string(),
  order: z.number().int().nonnegative(),
  pinned_at: z.string(),
  /** User-chosen display size in px (approx. 24–36 at desktop default). */
  display_size_px: z.number().int().min(16).max(64).optional(),
});
export type PhrasePin = z.infer<typeof PhrasePin>;

/** Tentative, evidenced, correctable observed preference. Never a diagnosis. */
export const DecisionLens = z.object({
  label: z.string(),
  supporting_event_ids: z.array(z.string()),
  counterevidence: z.array(z.string()),
  evidence_strength: z.enum(['weak', 'moderate', 'strong']),
  status: z.enum(['hypothesis', 'confirmed', 'retracted']),
});
export type DecisionLens = z.infer<typeof DecisionLens>;
