/**
 * CSV prospect import: parse → map columns → validate rows → dry-run report.
 *
 * Pure and deterministic (no clock, no randomness): the caller supplies the batch id and timestamp
 * so the same file always yields the same report. Nothing here dials, and nothing here can grant
 * permission to call — every imported record leaves this module as `requires_review`.
 */
import type { ColumnMapping, ImportField, ImportReport, ImportedList, ImportedRecord, RejectedRow, RowProblem } from '../schemas/import';
import { REQUIRED_IMPORT_FIELDS } from '../schemas/import';
import type { QueueItem } from '../schemas/dialer';

// ---------------------------------------------------------------------------------------------
// CSV parsing (RFC 4180: quoted fields, embedded commas, doubled quotes, CRLF or LF)
// ---------------------------------------------------------------------------------------------

/** Split CSV text into rows of cells. A quoted field may contain commas, quotes ("") and newlines. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  // A leading byte-order mark would otherwise become part of the first header name.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  while (i < src.length) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cell === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell !== '' || row.length > 0 || quoted) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Guess the delimiter from the first line: comma, semicolon or tab, whichever appears most. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const line = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === ',' || ch === ';' || ch === '\t')) counts[ch] += 1;
  }
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
  if (counts[';'] > counts[',']) return ';';
  return ',';
}

// ---------------------------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------------------------

/** Header names accepted for each field, in preference order. Matching is case- and punctuation-insensitive. */
const HEADER_ALIASES: Record<ImportField, readonly string[]> = {
  contact: ['contact', 'contactname', 'name', 'fullname', 'firstname', 'customer', 'person', 'lead'],
  phone: ['phone', 'phonenumber', 'mobile', 'cell', 'cellphone', 'telephone', 'tel', 'number', 'primaryphone', 'workphone'],
  company: ['company', 'companyname', 'dealership', 'dealer', 'store', 'account', 'business', 'organization'],
  role: ['role', 'title', 'jobtitle', 'position'],
  city: ['city', 'town', 'locality'],
  state: ['state', 'province', 'region', 'st'],
  notes: ['notes', 'note', 'comment', 'comments', 'detail', 'details'],
};

/** Lowercase, strip everything but letters and digits: "Phone Number" and "phone_number" both match. */
function normalizeHeader(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Map header cells to fields. Earliest alias wins; a column is never used for two fields. */
export function mapColumns(header: readonly string[]): ColumnMapping {
  const normalized = header.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const field of Object.keys(HEADER_ALIASES) as ImportField[]) {
    for (const alias of HEADER_ALIASES[field]) {
      const index = normalized.findIndex((h, i) => h === alias && !used.has(i));
      if (index !== -1) {
        mapping[field] = index;
        used.add(index);
        break;
      }
    }
  }
  return mapping;
}

/** True when the first row reads as a header (it names at least the contact and phone columns). */
export function looksLikeHeader(row: readonly string[]): boolean {
  const mapping = mapColumns(row);
  return REQUIRED_IMPORT_FIELDS.every((f) => mapping[f] !== undefined);
}

// ---------------------------------------------------------------------------------------------
// Phone normalization (North American numbering plan only)
// ---------------------------------------------------------------------------------------------

export interface PhoneResult {
  e164: string | null;
  problem: Extract<RowProblem, 'phone_unparseable' | 'phone_not_nanp'> | null;
}

/**
 * Normalize to +1NXXNXXXXXX. Accepts "(512) 555-0134", "512.555.0134", "1-512-555-0134",
 * "+1 512 555 0134" and a trailing extension, which is dropped (an extension is not dialable here).
 * Anything outside the NANP is refused rather than guessed at.
 */
export function normalizePhone(raw: string): PhoneResult {
  const withoutExtension = raw.replace(/\s*(?:x|ext\.?|extension)\s*\d+\s*$/i, '');
  const digits = withoutExtension.replace(/\D/g, '');
  if (digits.length === 0) return { e164: null, problem: 'phone_unparseable' };
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return { e164: null, problem: 'phone_not_nanp' };
  // NANP: area code and exchange both start 2-9.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return { e164: null, problem: 'phone_not_nanp' };
  return { e164: `+1${national}`, problem: null };
}

// ---------------------------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------------------------

export interface DryRunOptions {
  /** Prefix for generated record ids, e.g. the batch id. Ids are `${idPrefix}-${sourceRow}`. */
  idPrefix: string;
  /** Numbers already imported, so a re-imported file reports duplicates instead of doubling the list. */
  existingPhones?: readonly string[];
  /** Override the detected mapping (the UI lets the user correct a column). */
  mapping?: ColumnMapping;
  /** Longest cell text echoed back in a rejection. */
  maxCellChars?: number;
}

const MAX_CELL_CHARS = 120;

/** Parse and validate a CSV without storing anything. The caller shows this report and confirms. */
export function dryRunImport(text: string, options: DryRunOptions): ImportReport {
  const delimiter = detectDelimiter(text);
  const rows = parseCsv(text, delimiter).filter((r) => r.some((c) => c.trim() !== ''));
  const maxCell = options.maxCellChars ?? MAX_CELL_CHARS;
  if (rows.length === 0) {
    return { header: [], mapping: {}, missing_fields: [...REQUIRED_IMPORT_FIELDS], rows_read: 0, accepted: [], rejected: [], fatal: 'The file has no rows.' };
  }
  const hasHeader = looksLikeHeader(rows[0]!);
  const header = hasHeader ? rows[0]!.map((c) => c.trim()) : [];
  const mapping = options.mapping ?? (hasHeader ? mapColumns(header) : {});
  const missing = (Object.keys(HEADER_ALIASES) as ImportField[]).filter((f) => mapping[f] === undefined);
  const blocked = REQUIRED_IMPORT_FIELDS.filter((f) => mapping[f] === undefined);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (blocked.length > 0) {
    const named = blocked.map((f) => (f === 'contact' ? 'a name' : 'a phone number')).join(' and ');
    return {
      header,
      mapping,
      missing_fields: missing,
      rows_read: dataRows.length,
      accepted: [],
      rejected: [],
      fatal: `No column for ${named}. Add a header row naming the columns, or map them by hand.`,
    };
  }

  const accepted: ImportedRecord[] = [];
  const rejected: RejectedRow[] = [];
  const existing = new Set(options.existingPhones ?? []);
  const seenInFile = new Set<string>();
  const firstDataLine = hasHeader ? 2 : 1;

  dataRows.forEach((cells, index) => {
    const sourceRow = firstDataLine + index;
    const at = (field: ImportField): string => {
      const column = mapping[field];
      return column === undefined ? '' : (cells[column] ?? '').trim();
    };
    const problems: RowProblem[] = [];
    const contact = at('contact');
    const rawPhone = at('phone');
    if (contact === '') problems.push('missing_contact');
    if (rawPhone === '') problems.push('missing_phone');
    const phone = rawPhone === '' ? { e164: null, problem: null as PhoneResult['problem'] } : normalizePhone(rawPhone);
    if (phone.problem) problems.push(phone.problem);
    if (phone.e164 !== null) {
      if (existing.has(phone.e164)) problems.push('duplicate_existing');
      else if (seenInFile.has(phone.e164)) problems.push('duplicate_in_file');
    }
    if (problems.length > 0) {
      rejected.push({ source_row: sourceRow, problems, cells: cells.map((c) => c.trim().slice(0, maxCell)) });
      return;
    }
    seenInFile.add(phone.e164!);
    accepted.push({
      id: `${options.idPrefix}-${sourceRow}`,
      source_row: sourceRow,
      contact,
      phone: phone.e164!,
      company: at('company'),
      role: at('role'),
      city: at('city'),
      state: at('state').toUpperCase(),
      notes: at('notes'),
      fictional: false,
    });
  });

  return { header, mapping, missing_fields: missing, rows_read: dataRows.length, accepted, rejected, fatal: null };
}

/** Plain-language reason for a rejection, for the report list. */
export function problemText(problem: RowProblem): string {
  switch (problem) {
    case 'missing_contact':
      return 'no name';
    case 'missing_phone':
      return 'no phone number';
    case 'phone_unparseable':
      return 'phone number has no digits';
    case 'phone_not_nanp':
      return 'not a 10-digit US or Canadian number';
    case 'duplicate_in_file':
      return 'same number appears earlier in this file';
    case 'duplicate_existing':
      return 'already imported';
    case 'row_empty':
      return 'empty row';
    default:
      return 'rejected';
  }
}

/** Apply a confirmed report to the stored list. Pure: returns a new list, never mutates. */
export function applyImport(list: ImportedList, report: ImportReport, batch: { id: string; at: string; filename: string | null }): ImportedList {
  if (report.fatal !== null || report.accepted.length === 0) return list;
  const known = new Set(list.records.map((r) => r.phone));
  const added = report.accepted.filter((r) => !known.has(r.phone));
  return {
    records: [...list.records, ...added],
    batches: [...list.batches, { id: batch.id, at: batch.at, filename: batch.filename, accepted: added.length, rejected: report.rejected.length }],
  };
}

/** Remove one imported record (and nothing else) by id. */
export function removeImported(list: ImportedList, id: string): ImportedList {
  return { ...list, records: list.records.filter((r) => r.id !== id) };
}

// ---------------------------------------------------------------------------------------------
// Queue view
// ---------------------------------------------------------------------------------------------

/**
 * Imported records as queue rows, for display alongside the synthetic queue.
 *
 * Always `requires_review`, in every mode: there is no reviewed contact policy for an imported
 * number, the demo simulator has no transcript for it, and live dialing is not built. A record
 * whose number is on the durable suppression list is `suppressed` instead.
 */
export function importedQueueItems(records: readonly ImportedRecord[], suppressed: readonly string[] = []): QueueItem[] {
  const blocked = new Set(suppressed);
  return records.map((r) => ({
    id: `i-${r.id}`,
    contact_id: r.id,
    company: r.company || 'Company not given',
    location: r.company || 'Company not given',
    contact: r.contact,
    role: r.role || 'Role not given',
    city: r.city,
    state: r.state,
    timezone: '',
    phone: r.phone,
    endpoint_id: `ie-${r.id}`,
    policy_status: blocked.has(r.phone) ? 'suppressed' : 'requires_review',
    entrypoint: 'cold',
    inbound_action: null,
    call_id: null,
    origin: 'imported',
    fictional: false,
  }));
}
