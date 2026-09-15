/**
 * CSV prospect import — parsing, header mapping, NANP normalization, duplicate handling and the
 * policy invariant that an imported row is never dialable. Pure Node; no clock, no filesystem.
 */
import { describe, expect, it } from 'vitest';
import { ImportReport, ImportedList, ImportedRecord, QueueItem, EMPTY_IMPORTED_LIST } from '../src/schemas';
import { applyImport, detectDelimiter, dryRunImport, importedQueueItems, looksLikeHeader, mapColumns, normalizePhone, parseCsv, problemText, removeImported } from '../src/dialer';

const OPTS = { idPrefix: 'b1' };

describe('parseCsv', () => {
  it('reads quoted fields with commas, doubled quotes and newlines', () => {
    const rows = parseCsv('a,"b,c","say ""hi""","line1\nline2"\n1,2,3,4');
    expect(rows[0]).toEqual(['a', 'b,c', 'say "hi"', 'line1\nline2']);
    expect(rows[1]).toEqual(['1', '2', '3', '4']);
  });

  it('handles CRLF and a missing trailing newline', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('strips a leading byte-order mark from the first header', () => {
    expect(parseCsv('﻿name,phone')[0]).toEqual(['name', 'phone']);
  });

  it('detects semicolon and tab delimiters', () => {
    expect(detectDelimiter('name;phone;city')).toBe(';');
    expect(detectDelimiter('name\tphone\tcity')).toBe('\t');
    expect(detectDelimiter('name,phone,city')).toBe(',');
  });
});

describe('mapColumns', () => {
  it('matches aliases regardless of case and punctuation', () => {
    expect(mapColumns(['Full Name', 'Phone_Number', 'Dealership', 'Job Title', 'City', 'ST'])).toEqual({
      contact: 0,
      phone: 1,
      company: 2,
      role: 3,
      city: 4,
      state: 5,
    });
  });

  it('never assigns one column to two fields', () => {
    const mapping = mapColumns(['name', 'name']);
    expect(mapping.contact).toBe(0);
    expect(Object.values(mapping).filter((v) => v === 0)).toHaveLength(1);
  });

  it('recognises a header only when it names both required fields', () => {
    expect(looksLikeHeader(['name', 'phone'])).toBe(true);
    expect(looksLikeHeader(['name', 'city'])).toBe(false);
    expect(looksLikeHeader(['Ada Vance', '5125550134'])).toBe(false);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['(512) 555-0134', '+15125550134'],
    ['512.555.0134', '+15125550134'],
    ['1-512-555-0134', '+15125550134'],
    ['+1 512 555 0134', '+15125550134'],
    ['512 555 0134 x204', '+15125550134'],
    ['5125550134 ext. 9', '+15125550134'],
  ])('normalizes %s', (raw, expected) => {
    expect(normalizePhone(raw).e164).toBe(expected);
  });

  it('refuses numbers outside the numbering plan rather than guessing', () => {
    expect(normalizePhone('+44 20 7946 0958').problem).toBe('phone_not_nanp');
    expect(normalizePhone('12345').problem).toBe('phone_not_nanp');
    expect(normalizePhone('012-555-0134').problem).toBe('phone_not_nanp');
    expect(normalizePhone('no digits here').problem).toBe('phone_unparseable');
  });
});

describe('dryRunImport', () => {
  const csv = ['Name,Phone,Dealership,Title,City,State', 'Ada Vance,(512) 555-0134,Vance Motors,Owner,Austin,tx', 'Ruiz Ortega,512.555.0187,Ortega Auto,GM,Dallas,TX'].join('\n');

  it('accepts well-formed rows and normalizes phone and state', () => {
    const report = dryRunImport(csv, OPTS);
    expect(ImportReport.safeParse(report).success).toBe(true);
    expect(report.fatal).toBeNull();
    expect(report.rows_read).toBe(2);
    expect(report.accepted).toHaveLength(2);
    expect(report.accepted[0]).toMatchObject({ contact: 'Ada Vance', phone: '+15125550134', company: 'Vance Motors', state: 'TX', fictional: false });
    expect(report.accepted[0]!.source_row).toBe(2);
  });

  it('never marks an imported record fictional', () => {
    for (const record of dryRunImport(csv, OPTS).accepted) {
      expect(ImportedRecord.safeParse(record).success).toBe(true);
      expect(record.fictional).toBe(false);
    }
  });

  it('refuses the file when no phone column exists, naming what is missing', () => {
    const report = dryRunImport('Name,City\nAda Vance,Austin', OPTS);
    expect(report.fatal).toContain('phone number');
    expect(report.accepted).toHaveLength(0);
  });

  it('rejects rows with a reason and keeps the source line number', () => {
    const report = dryRunImport(['Name,Phone', 'Ada Vance,(512) 555-0134', ',5125550188', 'No Phone,', 'Bad Number,+44 20 7946 0958'].join('\n'), OPTS);
    expect(report.accepted).toHaveLength(1);
    expect(report.rejected.map((r) => [r.source_row, r.problems])).toEqual([
      [3, ['missing_contact']],
      [4, ['missing_phone']],
      [5, ['phone_not_nanp']],
    ]);
  });

  it('reports a repeated number inside the file instead of importing it twice', () => {
    const report = dryRunImport(['Name,Phone', 'Ada Vance,5125550134', 'Ada V.,(512) 555-0134'].join('\n'), OPTS);
    expect(report.accepted).toHaveLength(1);
    expect(report.rejected[0]!.problems).toEqual(['duplicate_in_file']);
  });

  it('reports a number that was already imported', () => {
    const report = dryRunImport('Name,Phone\nAda Vance,5125550134', { ...OPTS, existingPhones: ['+15125550134'] });
    expect(report.accepted).toHaveLength(0);
    expect(report.rejected[0]!.problems).toEqual(['duplicate_existing']);
  });

  it('handles a file with no header by using an explicit mapping', () => {
    const report = dryRunImport('Ada Vance,5125550134', { ...OPTS, mapping: { contact: 0, phone: 1 } });
    expect(report.accepted).toHaveLength(1);
    expect(report.accepted[0]!.source_row).toBe(1);
  });

  it('is deterministic: the same text and options give the same report', () => {
    expect(dryRunImport(csv, OPTS)).toEqual(dryRunImport(csv, OPTS));
  });

  it('returns a fatal report for an empty file', () => {
    expect(dryRunImport('   \n\n', OPTS).fatal).toBe('The file has no rows.');
  });

  it('gives every problem plain-language text', () => {
    const report = dryRunImport(['Name,Phone', ',abc'].join('\n'), OPTS);
    for (const problem of report.rejected.flatMap((r) => r.problems)) {
      expect(problemText(problem).length).toBeGreaterThan(0);
    }
  });
});

describe('applyImport', () => {
  const report = dryRunImport('Name,Phone\nAda Vance,5125550134\nRuiz Ortega,5125550187', OPTS);
  const batch = { id: 'b1', at: '2026-09-15T08:00:00.000Z', filename: 'dealers.csv' };

  it('stores accepted records and records the batch', () => {
    const list = applyImport(EMPTY_IMPORTED_LIST, report, batch);
    expect(ImportedList.safeParse(list).success).toBe(true);
    expect(list.records).toHaveLength(2);
    expect(list.batches[0]).toMatchObject({ filename: 'dealers.csv', accepted: 2, rejected: 0 });
  });

  it('does not double-add a number already stored', () => {
    const once = applyImport(EMPTY_IMPORTED_LIST, report, batch);
    const twice = applyImport(once, report, { ...batch, id: 'b2' });
    expect(twice.records).toHaveLength(2);
    expect(twice.batches[1]!.accepted).toBe(0);
  });

  it('stores nothing from a fatal report', () => {
    const fatal = dryRunImport('Name,City\nAda,Austin', OPTS);
    expect(applyImport(EMPTY_IMPORTED_LIST, fatal, batch)).toEqual(EMPTY_IMPORTED_LIST);
  });

  it('removes one record and leaves the rest', () => {
    const list = applyImport(EMPTY_IMPORTED_LIST, report, batch);
    const after = removeImported(list, list.records[0]!.id);
    expect(after.records.map((r) => r.id)).toEqual([list.records[1]!.id]);
  });
});

describe('importedQueueItems', () => {
  const records = dryRunImport('Name,Phone\nAda Vance,5125550134', OPTS).accepted;

  it('always requires review: an imported row is never dialable', () => {
    const [item] = importedQueueItems(records);
    expect(item!.policy_status).toBe('requires_review');
    expect(item!.origin).toBe('imported');
    expect(item!.fictional).toBe(false);
    expect(QueueItem.safeParse(item).success).toBe(true);
  });

  it('marks a suppressed number do-not-call', () => {
    const [item] = importedQueueItems(records, ['+15125550134']);
    expect(item!.policy_status).toBe('suppressed');
  });

  it('never carries a synthetic transcript', () => {
    expect(importedQueueItems(records).every((i) => i.call_id === null)).toBe(true);
  });
});

describe('QueueItem origin invariant', () => {
  it('refuses a record that claims to be both imported and fictional', () => {
    const [item] = importedQueueItems(dryRunImport('Name,Phone\nAda Vance,5125550134', OPTS).accepted);
    expect(QueueItem.safeParse({ ...item, fictional: true }).success).toBe(false);
    expect(QueueItem.safeParse({ ...item, origin: 'synthetic' }).success).toBe(false);
  });
});
