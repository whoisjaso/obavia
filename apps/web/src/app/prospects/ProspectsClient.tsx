'use client';

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ImportReport, QueueItem, SyntheticProspectsSeed } from '@apohenia/domain/schemas';
import { DialSuppressionList, EMPTY_IMPORTED_LIST, ImportedList } from '@apohenia/domain/schemas';
import { applyImport, buildQueue, dryRunImport, importedQueueItems, policyGlyph, problemText } from '@apohenia/domain/dialer';
import { Avatar, Card, Chip, FictionalPill, GlyphPill, Icon, IconButton, NotAssessedLabel, Sheet, Stat, Tile, TileGrid, TopBar } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { formatPhone } from '../dial-lib';
import { endpointLabel, localClock, matchesQuery, sharedWith } from './queue-lib';
import styles from './prospects.module.css';

export interface ProspectsClientProps {
  seed: SyntheticProspectsSeed;
}

const EMPTY_LIST: DialSuppressionList = [];

/** Largest CSV accepted from the file picker (about 40k rows): past this the browser tab stalls. */
const MAX_CSV_BYTES = 4_000_000;

type SheetKind = { kind: 'search' } | { kind: 'record'; id: string } | { kind: 'import' };

/** The import sheet walks pick → report → done; a fatal file stays on `pick` with the reason shown. */
type ImportStage = { step: 'pick'; error: string | null } | { step: 'report'; report: ImportReport; filename: string | null } | { step: 'done'; added: number };

/** Wall clock at 30-second resolution; null on the server and during hydration (no mismatch). */
function useNow(): number | null {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 30_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => null,
  );
}

function pillTone(status: QueueItem['policy_status']): 'orange' | 'red' | 'green' {
  return status === 'suppressed' ? 'red' : status === 'requires_review' ? 'orange' : 'green';
}

/** Seed text can carry a dash separator ("General manager — not identified"); the stage prints a comma. */
function plainText(text: string): string {
  return text.replace(/\s+[—–]\s+/g, ', ');
}

/** The policy pill only when the record deviates from OK (review or do not call); a default row carries no mark. */
function policyPill(item: QueueItem) {
  const policy = policyGlyph(item.policy_status);
  if (item.policy_status === 'allow') return null;
  return <GlyphPill icon={item.policy_status === 'suppressed' ? 'ban' : 'hourglass'} weight="fill" label={policy.word} name={policy.name} tone={pillTone(item.policy_status)} data-chip={policy.word} />;
}

/**
 * Queue: one card per record (Avatar, contact on up to two lines, role, company and city, local
 * clock). A policy pill appears only when the record deviates from OK. A TopBar search icon opens a
 * Sheet; an Import tile opens a one-line Sheet (CSV import is Increment 2). There is no dial control
 * on this screen: the sequential session dials from `/`.
 */
export function ProspectsClient({ seed }: ProspectsClientProps) {
  const [suppression, , hydrated] = useStoredState('dial.suppression', DialSuppressionList, EMPTY_LIST);
  const [imported, setImported] = useStoredState('dial.imported', ImportedList, EMPTY_IMPORTED_LIST);
  const suppressed = useMemo(() => suppression.map((s) => s.phone), [suppression]);
  const synthetic = useMemo(() => buildQueue(seed, { mode: 'demo', suppressed }), [seed, suppressed]);
  const mine = useMemo(() => importedQueueItems(imported.records, suppressed), [imported.records, suppressed]);
  const queue = useMemo(() => [...mine, ...synthetic], [mine, synthetic]);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [stage, setStage] = useState<ImportStage>({ step: 'pick', error: null });
  const [pasted, setPasted] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const now = useNow();

  const counts = useMemo(
    () => ({
      all: queue.length,
      ok: queue.filter((q) => q.policy_status === 'allow').length,
      review: queue.filter((q) => q.policy_status === 'requires_review').length,
      dnc: queue.filter((q) => q.policy_status === 'suppressed').length,
      mine: mine.length,
    }),
    [queue, mine],
  );

  /** Dry run only: the file is parsed in this browser and nothing is stored until the report is confirmed. */
  const runDryRun = useCallback(
    (text: string, filename: string | null) => {
      const report = dryRunImport(text, { idPrefix: `b${Date.now()}`, existingPhones: imported.records.map((r) => r.phone) });
      if (report.fatal !== null) {
        setStage({ step: 'pick', error: report.fatal });
        return;
      }
      setStage({ step: 'report', report, filename });
    },
    [imported.records],
  );

  const chooseFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.size > MAX_CSV_BYTES) {
        setStage({ step: 'pick', error: 'That file is larger than 4 MB. Split it and import the parts.' });
        return;
      }
      try {
        runDryRun(await file.text(), file.name);
      } catch {
        setStage({ step: 'pick', error: 'That file could not be read as text.' });
      }
    },
    [runDryRun],
  );

  function confirmImport() {
    if (stage.step !== 'report') return;
    const before = imported.records.length;
    const next = applyImport(imported, stage.report, { id: `b${Date.now()}`, at: new Date().toISOString(), filename: stage.filename });
    setImported(next);
    setStage({ step: 'done', added: next.records.length - before });
    setPasted('');
  }

  function closeImport() {
    setSheet(null);
    setStage({ step: 'pick', error: null });
    setPasted('');
  }
  const results = useMemo(() => queue.filter((q) => matchesQuery(q, query)), [queue, query]);
  const selected = sheet?.kind === 'record' ? (queue.find((q) => q.id === sheet.id) ?? null) : null;
  const selectedClock = selected && now !== null ? localClock(selected.timezone, now) : null;
  const selectedPolicy = selected ? policyGlyph(selected.policy_status) : null;
  const selectedShared = selected ? sharedWith(seed, selected) : [];
  const selectedEndpoint = selected ? endpointLabel(seed, selected) : null;

  function open(item: QueueItem) {
    setSheet({ kind: 'record', id: item.id });
  }

  const card = (item: QueueItem) => {
    const policy = policyGlyph(item.policy_status);
    const clock = now !== null ? localClock(item.timezone, now) : null;
    return (
      <Card
        key={item.id}
        onPress={() => open(item)}
        name={`${item.contact}, ${item.company}, ${item.city}. ${policy.name}. Open record.`}
        dense
        data-prospect-card
        data-contact-id={item.contact_id}
        data-policy={item.policy_status}
        className={item.policy_status === 'suppressed' ? styles.dnc : undefined}
      >
        <div className={styles.row}>
          <Avatar name={item.contact} size={48} />
          <div className={styles.text}>
            <span className={styles.contact}>{item.contact}</span>
            <span className={styles.roleLine}>
              <span className={styles.role}>{plainText(item.role)}</span>
              {policyPill(item)}
            </span>
            <span className={styles.meta}>
              <span className={styles.place}>
                {item.company} · {item.city}
              </span>
              {clock ? (
                <span className={[styles.clock, clock.withinHours ? styles.inHours : ''].join(' ').trim()} role="img" aria-label={clock.name}>
                  <Icon name={clock.withinHours ? 'sun' : 'moon'} size={13} weight="fill" /> <span aria-hidden="true">{clock.text}</span>
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={styles.root} data-queue data-hydrated={hydrated ? 'true' : 'false'}>
      <TopBar
        title="Queue"
        right={
          <>
            <IconButton icon="search" label="Search prospects" onClick={() => setSheet({ kind: 'search' })} data-search />
            <IconButton icon="phone" label="Back to Dial" href="/" />
          </>
        }
      />

      <div className={styles.stats} data-queue-stats>
        <Stat value={counts.all} icon="list" name="Records" />
        {counts.mine > 0 ? <Stat value={counts.mine} icon="hourglass" name="Imported: needs a reviewed contact policy before any call" color="var(--gold)" /> : <Stat value={counts.ok} icon="check" name="Allowed in demo" color="var(--green)" />}
        <Stat value={counts.dnc} icon="ban" name="Do not call" color="var(--red)" />
      </div>

      <TileGrid columns={2}>
        <Tile icon="plus" label="Import" name="Import prospects from a CSV file. A row is never permission to call" onClick={() => setSheet({ kind: 'import' })} data-import-tile />
        <Tile icon="history" label="History" name="Call history" href="/calls" />
      </TileGrid>

      <div className={styles.list} data-prospect-list>
        {queue.map(card)}
      </div>

      {/* ---- search ---- */}
      <Sheet open={sheet?.kind === 'search'} onClose={() => setSheet(null)} title="Search" tall data-sheet="search">
        <div className={styles.search}>
          <input
            type="search"
            className={styles.searchInput}
            aria-label="Search prospects"
            placeholder="Name, store, city…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-search-input
          />
          <div className={styles.list} data-search-results aria-live="polite">
            {results.length === 0 ? (
              <span className={styles.empty} role="status" aria-label="No matches">
                <Icon name="empty" size={48} weight="bold" />
                <span aria-hidden="true">No matches</span>
              </span>
            ) : (
              results.map(card)
            )}
          </div>
        </div>
      </Sheet>

      {/* ---- record (no dial control inside) ---- */}
      <Sheet open={selected !== null} onClose={() => setSheet(null)} title="Record" data-sheet="record">
        {selected ? (
          <div className={styles.record}>
            <div className={styles.recordHead}>
              <Avatar name={selected.contact} size={72} />
              <div className={styles.recordWho}>
                <span className={styles.recordName}>{selected.contact}</span>
                <span className={styles.recordRole}>{plainText(selected.role)}</span>
                <span className={styles.recordCompany}>{selected.location !== selected.company ? `${selected.company} · ${selected.location}` : selected.company}</span>
                <span className={styles.recordPlace}>
                  {selected.city}, {selected.state}
                </span>
              </div>
            </div>
            <div className={styles.recordMeta} role="group" aria-label="Local time, number and line">
              {selectedClock ? (
                <span className={styles.recordFact} role="img" aria-label={selectedClock.name} data-record-local>
                  <span className={styles.recordFactGlyph} aria-hidden="true">
                    <Icon name={selectedClock.withinHours ? 'sun' : 'moon'} size={16} weight="fill" />
                  </span>
                  <span aria-hidden="true">{selectedClock.text}</span>
                </span>
              ) : (
                <NotAssessedLabel label="Local time unknown" name="Local time unknown: the time zone is not known to this browser" data-record-local />
              )}
              <span className={styles.recordFact} role="img" aria-label={`Number ${selected.phone}${selected.origin === 'synthetic' ? ' (fictional)' : ''}`} data-record-phone={selected.phone}>
                <span className={styles.recordFactGlyph} aria-hidden="true">
                  <Icon name="phone" size={16} weight="fill" />
                </span>
                <span aria-hidden="true">{formatPhone(selected.phone)}</span>
              </span>
              {selectedEndpoint ? <Chip static icon="circle-dashed" label={selectedEndpoint.replace(/\s*\(.*\)\s*$/, '')} name={`Line: ${selectedEndpoint}. Demo, no real line`} /> : null}
            </div>
            <div className={styles.recordChips}>
              {selected.origin === 'synthetic' ? <FictionalPill /> : <Chip static icon="person" label="imported" name="Imported from your own CSV. This is real contact data, not a fixture" tone="teal" />}
              {selectedPolicy ? <Chip static icon={selected.policy_status === 'suppressed' ? 'ban' : selected.policy_status === 'requires_review' ? 'hourglass' : 'check'} label={selectedPolicy.word} name={selectedPolicy.name} tone={selected.policy_status === 'suppressed' ? 'red' : selected.policy_status === 'requires_review' ? 'gold' : 'green'} /> : null}
              <Chip
                static
                icon={selected.entrypoint === 'inbound' ? 'arrow-down' : 'arrow-up'}
                label={selected.entrypoint}
                name={selected.entrypoint === 'inbound' ? `Inbound: ${selected.inbound_action ?? 'the prospect acted first'}` : 'Cold: no prior action from the prospect'}
              />
              {selectedShared.length > 0 ? <Chip static icon="swap" label="shared" name={`Number shared with ${selectedShared.join(', ')}`} tone="teal" /> : null}
              <Chip static icon="hourglass" label="unverified" name={selected.origin === 'synthetic' ? 'Number never verified; jurisdiction unknown; no reviewed contact policy exists for any synthetic record' : 'Number never verified; jurisdiction unknown; no reviewed contact policy exists for this number, so it is not dialable'} />
            </div>
            {selected.call_id ? <Card href={`/calls/${encodeURIComponent(selected.call_id)}`} name={`Open the synthetic call review for ${selected.contact}`} dense>
              <span className={styles.linkRow}>
                <Icon name="target" size={18} weight="bold" /> <span>Call review</span>
              </span>
            </Card> : null}
          </div>
        ) : null}
      </Sheet>

      {/* ---- import: pick a file, read the report, then confirm ---- */}
      <Sheet
        open={sheet?.kind === 'import'}
        onClose={closeImport}
        title="Import"
        tall={stage.step === 'report'}
        data-sheet="import"
        footer={
          stage.step === 'report' ? (
            <>
              <Tile
                icon="check"
                label="Import"
                size="sm"
                tone="green"
                name={`Import ${stage.report.accepted.length} ${stage.report.accepted.length === 1 ? 'record' : 'records'} into this browser`}
                onClick={confirmImport}
                disabled={stage.report.accepted.length === 0}
                data-import-confirm
              />
              <Tile icon="x" label="Cancel" size="sm" onClick={closeImport} />
            </>
          ) : undefined
        }
      >
        {stage.step === 'pick' ? (
          <div className={styles.importBody} data-import-step="pick">
            <span className={styles.importGlyph} aria-hidden="true">
              <Icon name="arrow-up" size={64} weight="bold" />
            </span>
            <p className={styles.importLine}>A CSV with a name and a phone number in each row. Everything stays in this browser.</p>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              className={styles.fileInput}
              onChange={(e) => {
                void chooseFile(e.target.files?.[0]);
                e.target.value = '';
              }}
              data-import-file
            />
            <TileGrid columns={2}>
              <Tile icon="plus" label="Choose File" name="Choose a CSV file to read" onClick={() => fileInput.current?.click()} />
              <Tile
                icon="check"
                label="Read Text"
                name="Read the pasted rows below"
                tone={pasted.trim() === '' ? undefined : 'green'}
                disabled={pasted.trim() === ''}
                onClick={() => runDryRun(pasted, null)}
                data-import-read
              />
            </TileGrid>
            <textarea
              className={styles.paste}
              aria-label="Paste CSV rows"
              placeholder={'name,phone,dealership\nAda Vance,(512) 555-0134,Vance Motors'}
              rows={4}
              spellCheck={false}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              data-import-paste
            />
            {stage.error !== null ? (
              <p className={styles.importError} role="alert" data-import-error>
                {stage.error}
              </p>
            ) : null}
            <Chip static icon="hourglass" label="review" name="Imported numbers are marked review and are never dialed: no reviewed contact policy exists for them" tone="gold" />
            <p className={styles.importLine}>A row is never permission to call.</p>
          </div>
        ) : stage.step === 'report' ? (
          <div className={styles.report} data-import-step="report">
            <div className={styles.stats} data-import-counts>
              <Stat value={stage.report.accepted.length} icon="check" name="Rows that can be imported" color="var(--green)" />
              <Stat value={stage.report.rejected.length} icon="ban" name="Rows that were refused" color={stage.report.rejected.length > 0 ? 'var(--red)' : undefined} />
              <Stat value={stage.report.rows_read} icon="list" name="Rows read" />
            </div>
            {stage.report.missing_fields.length > 0 ? (
              <p className={styles.importLine} data-import-missing>
                No column for {stage.report.missing_fields.join(', ')}. Those stay empty.
              </p>
            ) : null}
            {stage.report.rejected.length > 0 ? (
              <div className={styles.rejected} data-import-rejected>
                {stage.report.rejected.slice(0, 25).map((row) => (
                  <Card key={row.source_row} dense name={`Row ${row.source_row} refused: ${row.problems.map(problemText).join(', ')}`}>
                    <span className={styles.rejectRow}>
                      <span className={styles.rejectLine}>Row {row.source_row}</span>
                      <span className={styles.rejectWhy}>{row.problems.map(problemText).join(' · ')}</span>
                      <span className={styles.rejectCells}>{row.cells.filter((c) => c !== '').join(' · ') || '(empty)'}</span>
                    </span>
                  </Card>
                ))}
                {stage.report.rejected.length > 25 ? <p className={styles.importLine}>and {stage.report.rejected.length - 25} more.</p> : null}
              </div>
            ) : null}
            <p className={styles.importLine}>Imported records are marked review. Nothing here can be dialed.</p>
          </div>
        ) : (
          <div className={styles.importBody} data-import-step="done">
            <span className={styles.importGlyph} aria-hidden="true">
              <Icon name="check" size={64} weight="bold" />
            </span>
            <p className={styles.importLine}>
              {stage.added} {stage.added === 1 ? 'record' : 'records'} added to your queue, marked review.
            </p>
            <Tile icon="check" label="OK" onClick={closeImport} />
          </div>
        )}
      </Sheet>
    </div>
  );
}
