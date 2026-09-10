/**
 * Source study records — the 207 curated question records, 39 sections and the
 * package validation report produced by `scripts/parse-question-bank.mjs`.
 *
 * These are STUDY records. `adapt` is not live approval; `study_only` cannot be
 * auto-presented as a live recommendation; `private_training` is a self-reflection
 * exercise (brief §3).
 */
import { z } from 'zod';

export const SourceId = z.enum(['A', 'B']);
export type SourceId = z.infer<typeof SourceId>;

export const UseClassification = z.enum(['adapt', 'study_only', 'private_training']);
export type UseClassification = z.infer<typeof UseClassification>;

/** One curated source-derived question record. Fields mirror data/source_question_records.json exactly. */
export const SourceQuestionRecord = z.strictObject({
  /** Record id, e.g. "L06" (family letter + two digits). */
  id: z.string().regex(/^[A-Z]\d{2}$/),
  title: z.string(),
  /** Family letter (I, L, S, E, F, C, P, M, O, D, T, U, R, X, Y, V). */
  family: z.string().regex(/^[A-Z]$/),
  section_id: z.string().regex(/^[AB]\d{2}$/),
  section_title: z.string(),
  source: SourceId,
  /** Editorially normalized template — NOT an exact quote. */
  template: z.string(),
  purpose: z.string(),
  /** Delivery cue as described in the source text (free string, e.g. "curious-skeptical", "not_audio_verified"). */
  delivery: z.string(),
  use_classification: UseClassification,
  /** Half-open [start, end) Unicode code-point offsets into the original single-line transcript. */
  offset_start: z.number().int().nonnegative(),
  offset_end: z.number().int().nonnegative(),
  /** Unchanged source excerpt, copied verbatim from the supplied markdown. */
  excerpt: z.string(),
  excerpt_length: z.number().int().nonnegative(),
  claimed_length: z.number().int().nonnegative(),
  length_matches_offsets: z.boolean(),
  /** False until the raw Source A/B transcripts are supplied and hashed. */
  hash_verified: z.boolean(),
  markdown_line: z.number().int().positive(),
});
export type SourceQuestionRecord = z.infer<typeof SourceQuestionRecord>;

/** A section of the organized question bank. `records_supplied: false` = named in the framework, no records. */
export const SourceSection = z.strictObject({
  id: z.string().regex(/^[AB]\d{2}$/),
  source: SourceId,
  title: z.string(),
  heading_line: z.number().int().positive().nullable(),
  record_ids: z.array(z.string()),
  record_count: z.number().int().nonnegative(),
  records_supplied: z.boolean(),
});
export type SourceSection = z.infer<typeof SourceSection>;

/** Output of the parser/validator run (`npm run seed:validate`). */
export const PackageValidation = z.strictObject({
  generated_from: z.string(),
  package_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  offset_convention: z.string(),
  raw_sources_supplied: z.boolean(),
  hash_verification: z.string(),
  expected_record_count: z.number().int(),
  record_count: z.number().int(),
  section_count_with_records: z.number().int(),
  section_count_named_only: z.number().int(),
  brief_claims_section_count: z.number().int(),
  section_count_note: z.string(),
  by_classification: z.record(z.string(), z.number().int()),
  by_family: z.record(z.string(), z.number().int()),
  by_source: z.record(z.string(), z.number().int()),
  excerpt_length_mismatches: z.array(
    z.object({ id: z.string(), claimed: z.number().int(), actual: z.number().int() }),
  ),
  errors: z.array(z.string()),
  ok: z.boolean(),
});
export type PackageValidation = z.infer<typeof PackageValidation>;

// ---- Additive (M-sources) ----

/**
 * Additive (M-sources): one entry in the register of resources that the framework or brief
 * names but the supplied package does not contain (or cannot verify). Nothing here is
 * reconstructed; `handling` always says so.
 */
export const MissingResource = z.strictObject({
  /** Stable id, e.g. "raw_source_a". */
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  /** Where the resource is named (framework section / brief section). */
  named_in: z.string(),
  what_is_supplied: z.string(),
  what_is_missing: z.string(),
  /** Must contain the phrase "marked missing — not reconstructed". */
  handling: z.string().includes('marked missing — not reconstructed'),
});
export type MissingResource = z.infer<typeof MissingResource>;

/** Additive (M-sources): envelope of data/source_missing_resources.json. */
export const MissingResourceRegister = z.strictObject({
  register_note: z.string(),
  resources: z.array(MissingResource),
});
export type MissingResourceRegister = z.infer<typeof MissingResourceRegister>;

/** Additive (M-sources): per-record result written by scripts/verify-source-offsets.mjs. */
export const OffsetVerificationRecord = z.strictObject({
  id: z.string(),
  source: SourceId,
  /** True only when the raw source was present AND the code-point slice equalled the excerpt. */
  hash_verified: z.boolean(),
  status: z.enum(['verified', 'mismatch', 'source_missing']),
  note: z.string().optional(),
});
export type OffsetVerificationRecord = z.infer<typeof OffsetVerificationRecord>;

/** Additive (M-sources): data/source_offset_verification.json (sibling of the parser output; never overwrites it). */
export const OffsetVerification = z.strictObject({
  generated_by: z.string(),
  generated_at: z.string(),
  offset_convention: z.string(),
  sources: z.record(
    SourceId,
    z.strictObject({
      path: z.string(),
      supplied: z.boolean(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
      code_points: z.number().int().nonnegative().nullable(),
    }),
  ),
  records: z.array(OffsetVerificationRecord),
  verified_count: z.number().int().nonnegative(),
  mismatch_count: z.number().int().nonnegative(),
  pending_count: z.number().int().nonnegative(),
  ok: z.boolean(),
});
export type OffsetVerification = z.infer<typeof OffsetVerification>;
