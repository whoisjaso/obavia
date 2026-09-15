/**
 * CSV prospect import (brief §9 precondition for live mode).
 *
 * An imported row is REAL contact data, not a synthetic fixture, and the two never mix:
 *  - every imported endpoint is `source: 'imported'`, `verified_at: null`, `jurisdiction: 'unknown'`
 *    and `contact_policy: 'requires_review'`. A CSV row is never permission to call.
 *  - imported records are excluded from the demo session (the simulator plays synthetic transcripts
 *    only) and from live dialing until a reviewed contact policy exists.
 *
 * Owning module agent: M-core. Persisted at `dial.imported`.
 */
import { z } from 'zod';

/** The fields an import can fill. `contact` and `phone` are the only required ones. */
export const ImportField = z.enum(['contact', 'phone', 'company', 'role', 'city', 'state', 'notes']);
export type ImportField = z.infer<typeof ImportField>;

export const REQUIRED_IMPORT_FIELDS = ['contact', 'phone'] as const;

/** Which CSV column (0-based) feeds each field. A field with no column is absent, never guessed. */
export const ColumnMapping = z.partialRecord(ImportField, z.number().int().nonnegative());
export type ColumnMapping = z.infer<typeof ColumnMapping>;

/** Why a row could not be imported. Every rejection names one of these; none is silent. */
export const RowProblem = z.enum([
  'missing_contact',
  'missing_phone',
  'phone_unparseable',
  'phone_not_nanp',
  'duplicate_in_file',
  'duplicate_existing',
  'row_empty',
]);
export type RowProblem = z.infer<typeof RowProblem>;

/** One imported contact. No policy field is stored here — policy lives on the endpoint and is always review. */
export const ImportedRecord = z.object({
  id: z.string(),
  /** 1-based line in the source file, so a rejected row can be found again. */
  source_row: z.number().int().positive(),
  contact: z.string().min(1),
  /** E.164, North American numbering plan. */
  phone: z.string().regex(/^\+1\d{10}$/),
  company: z.string(),
  role: z.string(),
  city: z.string(),
  state: z.string(),
  notes: z.string(),
  /** Never true for imported data; the field exists so a UI cannot confuse the two origins. */
  fictional: z.literal(false),
});
export type ImportedRecord = z.infer<typeof ImportedRecord>;

/** A row the import refused, kept so the report can show exactly what was dropped and why. */
export const RejectedRow = z.object({
  source_row: z.number().int().positive(),
  problems: z.array(RowProblem).min(1),
  /** The raw cells, truncated by the caller if long. Shown back to the user, never re-parsed. */
  cells: z.array(z.string()),
});
export type RejectedRow = z.infer<typeof RejectedRow>;

/** The dry-run result. Nothing is stored until the user confirms this report. */
export const ImportReport = z.object({
  /** Header line as parsed, so the mapping can be shown and corrected. */
  header: z.array(z.string()),
  mapping: ColumnMapping,
  /** Fields the header did not supply (informational; only contact/phone block an import). */
  missing_fields: z.array(ImportField),
  /** Data rows read, excluding the header. */
  rows_read: z.number().int().nonnegative(),
  accepted: z.array(ImportedRecord),
  rejected: z.array(RejectedRow),
  /** True when the file could not be used at all (no rows, or no contact/phone column). */
  fatal: z.string().nullable(),
});
export type ImportReport = z.infer<typeof ImportReport>;

/** A confirmed import as persisted. Newest batch last; records are deduplicated across batches. */
export const ImportedList = z.object({
  records: z.array(ImportedRecord),
  batches: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      /** File name when one was chosen, else null (pasted text). */
      filename: z.string().nullable(),
      accepted: z.number().int().nonnegative(),
      rejected: z.number().int().nonnegative(),
    }),
  ),
});
export type ImportedList = z.infer<typeof ImportedList>;

export const EMPTY_IMPORTED_LIST: ImportedList = { records: [], batches: [] };
