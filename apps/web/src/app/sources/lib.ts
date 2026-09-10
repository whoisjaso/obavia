/**
 * Route-local helpers for /sources. Pure; safe in client bundles (no seed imports).
 * `filterRows` mirrors `filterSourceRows` in @apohenia/domain/sources over the slim row shape.
 */
import type { SourceRow } from '@apohenia/domain/sources';

export interface RowFilters {
  family?: string;
  classification?: string;
  delivery?: string;
  query?: string;
}

export function filterRows(rows: readonly SourceRow[], f: RowFilters): SourceRow[] {
  const q = (f.query ?? '').trim().toLowerCase();
  return rows.filter((r) => {
    if (f.family && r.family !== f.family) return false;
    if (f.classification && r.use_classification !== f.classification) return false;
    if (f.delivery && r.delivery !== f.delivery) return false;
    if (q.length > 0) {
      const hay = `${r.id}\n${r.title}\n${r.template}\n${r.purpose}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Named-only section titles in the seed already say "no records supplied"; the UI shows that
 * as a badge instead, so strip the trailing note from the visible title (data is unchanged).
 */
export function namedOnlyTitle(title: string): string {
  return title
    .replace(/\s*\(named in framework;\s*no records supplied\)\s*$/i, '')
    .replace(/\s*\(named in framework;\s*(internal wording ambiguity noted)\);\s*no records supplied\s*$/i, ' ($1)')
    .replace(/\s*\(named in framework;\s*(not validated)\);\s*no records supplied\s*$/i, ' ($1)')
    .replace(/;\s*no records supplied\s*$/i, '')
    .trim();
}
