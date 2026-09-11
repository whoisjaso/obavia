/**
 * Route-local helpers for /sources. Pure; safe in client bundles (no seed imports).
 * `filterRows` mirrors `filterSourceRows` in @apohenia/domain/sources over the slim row shape.
 */
import type { SourceRow } from '@apohenia/domain/sources';

export interface RowFilters {
  classification?: string;
  query?: string;
}

export function filterRows(rows: readonly SourceRow[], f: RowFilters): SourceRow[] {
  const q = (f.query ?? '').trim().toLowerCase();
  return rows.filter((r) => {
    if (f.classification && r.use_classification !== f.classification) return false;
    if (q.length > 0) {
      const hay = `${r.id}\n${r.title}\n${r.template}\n${r.purpose}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Named-only section titles in the seed already say "no records supplied"; the UI shows that
 * as a glyph instead, so strip the trailing note from the visible title (data is unchanged).
 */
export function namedOnlyTitle(title: string): string {
  return title
    .replace(/\s*\(named in framework;\s*no records supplied\)\s*$/i, '')
    .replace(/\s*\(named in framework;\s*(internal wording ambiguity noted)\);\s*no records supplied\s*$/i, ' ($1)')
    .replace(/\s*\(named in framework;\s*(not validated)\);\s*no records supplied\s*$/i, ' ($1)')
    .replace(/;\s*no records supplied\s*$/i, '')
    .trim();
}

/** ≤2-word tile label for a section ("Closing: future pace and consequence" → "Future Pace"); the full title stays in the accessible name. */
export function sectionShortName(title: string): string {
  if (/^reviewed\b/i.test(title)) return 'Reviewed Call';
  const clean = namedOnlyTitle(title)
    .replace(/^Named in framework range\s+[A-Z0-9–-]+\s*\(([^)]*)\).*$/i, '$1')
    .replace(/^[^:]+:\s*/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^A-Za-z0-9/ ]+/g, ' ')
    .trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0 && !/^(and|the|of|a|an)$/i.test(w));
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** One glyph per section family (Setting ◎ · Closing ◆ · Mirror ⇄ · Objection ⚑ · Identity ◯ · Reviewed call ▶ · other ≡). */
export function sectionGlyph(title: string): string {
  const t = title.toLowerCase();
  if (t.startsWith('setting')) return '◎';
  if (t.startsWith('closing')) return '◆';
  if (t.includes('mirror')) return '⇄';
  if (t.includes('objection')) return '⚑';
  if (t.includes('identity')) return '◯';
  if (t.includes('reviewed')) return '▶';
  if (t.includes('follow-up') || t.includes('diary')) return '◷';
  if (t.includes('upsell') || t.includes('referral')) return '↗';
  return '≡';
}
