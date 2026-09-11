'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { QueueItem, SyntheticProspectsSeed } from '@apohenia/domain/schemas';
import { DialSuppressionList } from '@apohenia/domain/schemas';
import { buildQueue, policyGlyph } from '@apohenia/domain/dialer';
import { Avatar, Card, Chip, FictionalPill, IconButton, Sheet, Stat, StatusGlyph, Tile, TileGrid, TopBar } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { formatPhone } from '../dial-lib';
import { endpointLabel, localClock, matchesQuery, sharedWith } from './queue-lib';
import styles from './prospects.module.css';

export interface ProspectsClientProps {
  seed: SyntheticProspectsSeed;
}

const EMPTY_LIST: DialSuppressionList = [];

type SheetKind = { kind: 'search' } | { kind: 'record'; id: string } | { kind: 'import' };

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

function chipTone(status: QueueItem['policy_status']): 'green' | 'red' | 'teal' {
  return status === 'allow' ? 'green' : status === 'suppressed' ? 'red' : 'teal';
}

/**
 * Queue: one card per record (Avatar · company · contact · city · status glyph). A TopBar search
 * icon opens a Sheet; an Import tile opens a one-line Sheet (CSV import is Increment 2). There is
 * no dial control on this screen — the sequential session dials from `/`.
 */
export function ProspectsClient({ seed }: ProspectsClientProps) {
  const [suppression, , hydrated] = useStoredState('dial.suppression', DialSuppressionList, EMPTY_LIST);
  const suppressed = useMemo(() => suppression.map((s) => s.phone), [suppression]);
  const queue = useMemo(() => buildQueue(seed, { mode: 'demo', suppressed }), [seed, suppressed]);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [query, setQuery] = useState('');
  const now = useNow();

  const counts = useMemo(
    () => ({
      all: queue.length,
      ok: queue.filter((q) => q.policy_status === 'allow').length,
      review: queue.filter((q) => q.policy_status === 'requires_review').length,
      dnc: queue.filter((q) => q.policy_status === 'suppressed').length,
    }),
    [queue],
  );
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
            <span className={styles.company}>{item.company}</span>
            <span className={styles.contact}>{item.contact}</span>
            <span className={styles.meta}>
              <span>{item.city}</span>
              {clock ? (
                <span className={[styles.clock, clock.withinHours ? styles.inHours : ''].join(' ').trim()} role="img" aria-label={clock.name}>
                  <span aria-hidden="true">{clock.withinHours ? '◔' : '◑'}</span> <span aria-hidden="true">{clock.text}</span>
                </span>
              ) : null}
            </span>
          </div>
          <StatusGlyph glyph={policy.glyph} label={policy.word} name={policy.name} tone={chipTone(item.policy_status)} />
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
        <Stat value={counts.ok} icon="check" name="Allowed in demo" color="var(--green)" />
        <Stat value={counts.dnc} icon="ban" name="Do not call" color="var(--red)" />
      </div>

      <TileGrid columns={2}>
        <Tile icon="plus" label="Import" name="Import prospects — CSV import arrives in Increment 2" onClick={() => setSheet({ kind: 'import' })} data-import-tile />
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
              <span className={styles.empty} aria-label="No matches">
                ∅
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
                <span className={styles.recordRole}>{selected.role}</span>
                <span className={styles.recordCompany}>{selected.location !== selected.company ? `${selected.company} · ${selected.location}` : selected.company}</span>
                <span className={styles.recordPlace}>
                  {selected.city}, {selected.state}
                </span>
              </div>
            </div>
            <div className={styles.recordMeta} role="group" aria-label="Local time, number and line">
              <span className={styles.recordFact} role="img" aria-label={selectedClock ? selectedClock.name : `Time zone ${selected.timezone}`} data-record-local>
                <span className={styles.recordFactGlyph} aria-hidden="true">
                  {selectedClock?.withinHours ? '◔' : '◑'}
                </span>
                <span aria-hidden="true">{selectedClock ? selectedClock.text : '—'}</span>
              </span>
              <span className={styles.recordFact} role="img" aria-label={`Number ${selected.phone} (fictional)`} data-record-phone={selected.phone}>
                <span className={styles.recordFactGlyph} aria-hidden="true">
                  ☏
                </span>
                <span aria-hidden="true">{formatPhone(selected.phone)}</span>
              </span>
              {selectedEndpoint ? <Chip static glyph="◌" label={selectedEndpoint} name={`Line: ${selectedEndpoint} — demo, no real line`} /> : null}
            </div>
            <div className={styles.recordChips}>
              <FictionalPill />
              {selectedPolicy ? <Chip static glyph={selectedPolicy.glyph} label={selectedPolicy.word} name={selectedPolicy.name} tone={chipTone(selected.policy_status)} /> : null}
              <Chip
                static
                glyph={selected.entrypoint === 'inbound' ? '↙' : '↗'}
                label={selected.entrypoint}
                name={selected.entrypoint === 'inbound' ? `Inbound: ${selected.inbound_action ?? 'the prospect acted first'}` : 'Cold: no prior action from the prospect'}
              />
              {selectedShared.length > 0 ? <Chip static glyph="⇆" label="shared" name={`Number shared with ${selectedShared.join(', ')}`} tone="teal" /> : null}
              <Chip static glyph="◔" label="unverified" name="Number never verified; jurisdiction unknown; no reviewed contact policy exists for any synthetic record" />
            </div>
            {selected.call_id ? <Card href={`/calls/${encodeURIComponent(selected.call_id)}`} name={`Open the synthetic call review for ${selected.contact}`} dense>
              <span className={styles.linkRow}>
                <span aria-hidden="true">◎</span> <span>Call review</span>
              </span>
            </Card> : null}
          </div>
        ) : null}
      </Sheet>

      {/* ---- import: one line, one glyph ---- */}
      <Sheet open={sheet?.kind === 'import'} onClose={() => setSheet(null)} title="Import" data-sheet="import">
        <div className={styles.importBody}>
          <span className={styles.importGlyph} aria-hidden="true">
            ⇪
          </span>
          <Chip static glyph="◔" label="Increment 2" name="CSV import is not built yet; it arrives in Increment 2 with secure persistence" tone="teal" />
          <p className={styles.importLine}>CSV import arrives in Increment 2 — a row is never permission to call.</p>
          <Tile icon="check" label="OK" onClick={() => setSheet(null)} />
        </div>
      </Sheet>
    </div>
  );
}
