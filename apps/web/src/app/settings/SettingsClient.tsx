'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AssistanceMode, DEFAULT_ASSISTANCE_MODE } from '@apohenia/domain/schemas';
import { MODE_COPY, MODE_DESCRIPTIONS, MODE_LABELS, isAssisted } from '@apohenia/domain/practice';
import { Card, Chip, Icon, Sheet, Stat, Tile, TileGrid, Toast, TopBar, useToast, type IconName } from '@/components/ui';
import { STORAGE_NAMESPACE, clearAllStored, exportAllStored, listStoredKeys, useStoredState, type StoredKeyInfo } from '@/lib/storage';
import styles from './settings.module.css';

const ASSISTANCE_MODE_KEY = 'settings.assistance_mode';

/** Five marks (full, reveal, mirror, cue, none): the same set Train shows. */
const MODES: readonly { mode: AssistanceMode; icon: IconName; word: string }[] = [
  { mode: 'full_script', icon: 'list', word: 'full' },
  { mode: 'recall_with_reveal', icon: 'circle-half', word: 'reveal' },
  { mode: 'primary_plus_mirror', icon: 'swap', word: 'mirror' },
  { mode: 'stage_purpose_cue', icon: 'target', word: 'cue' },
  { mode: 'unassisted', icon: 'circle', word: 'none' },
];

function modeName(mode: AssistanceMode): string {
  return `${MODE_LABELS[mode]}: ${MODE_DESCRIPTIONS[mode]} Tracked as ${isAssisted(mode) ? 'assisted' : 'unassisted'}.`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

/**
 * Settings (DESIGN_SYSTEM §3.6): the default assistance mode as a five-glyph segmented control,
 * local data as a card with big numbers, export / delete behind a sheet. Everything here is the
 * browser's own `apohenia.v1.*` namespace: synthetic, local demo data.
 */
export function SettingsClient() {
  const [mode, setMode, hydrated, resetMode] = useStoredState<AssistanceMode>(ASSISTANCE_MODE_KEY, AssistanceMode, DEFAULT_ASSISTANCE_MODE);
  const [keys, setKeys] = useState<StoredKeyInfo[]>([]);
  const [exported, setExported] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'none' | 'data' | 'delete' | 'export'>('none');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const [toast, showToast] = useToast();
  const copyId = useId();
  const segRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => setKeys(listStoredKeys()), []);

  useEffect(() => {
    // Storage is browser-only; read it after mount (and again whenever the mode changes).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount read of localStorage
    refresh();
  }, [refresh, mode]);

  const totalBytes = keys.reduce((n, k) => n + k.bytes, 0);

  function changeMode(next: AssistanceMode) {
    setMode(next);
    setLive(`Default assistance mode: ${modeName(next)}`);
  }

  function onSegKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = MODES.findIndex((m) => m.mode === mode);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % MODES.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + MODES.length) % MODES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = MODES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = MODES[next];
    if (!target) return;
    changeMode(target.mode);
    segRef.current?.querySelector<HTMLButtonElement>(`[data-mode-option="${target.mode}"]`)?.focus();
  }

  function onExport() {
    const json = JSON.stringify(exportAllStored(), null, 2);
    setExported(json);
    setLastAction(`Exported ${keys.length} entr${keys.length === 1 ? 'y' : 'ies'} as JSON.`);
    setSheet('export');
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apohenia-local-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download is a convenience; the JSON is still shown in the sheet.
    }
  }

  function onDeleteAll() {
    const removed = clearAllStored();
    setSheet('none');
    setExported(null);
    resetMode(); // in-memory only: must not re-create the key we just deleted
    setLastAction(`Deleted ${removed} local entr${removed === 1 ? 'y' : 'ies'}.`);
    showToast('Deleted', 'red');
    refresh();
  }

  return (
    <div className={styles.root} data-settings data-hydrated={hydrated ? 'true' : 'false'}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-settings-status>
        {lastAction ?? live}
      </div>
      <TopBar title="Settings" />

      {/* ---- default assistance mode ---- */}
      <section className={styles.block} aria-labelledby={`${copyId}-mode`}>
        <span id={`${copyId}-mode`} className={styles.kicker}>
          Assistance
        </span>
        <div ref={segRef} role="radiogroup" aria-label="Default assistance mode for new practice sessions" aria-describedby={copyId} className={styles.seg} data-mode-control data-mode={mode}>
          {MODES.map((m) => {
            const selected = m.mode === mode;
            return (
              <button
                key={m.mode}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={modeName(m.mode)}
                tabIndex={selected ? 0 : -1}
                disabled={!hydrated}
                className={[styles.segItem, selected ? styles.segSelected : ''].join(' ').trim()}
                onClick={() => changeMode(m.mode)}
                onKeyDown={onSegKey}
                data-mode-option={m.mode}
              >
                <span className={styles.segGlyph} aria-hidden="true">
                  <Icon name={m.icon} size={22} weight={selected ? 'fill' : 'regular'} />
                </span>
                <span className={styles.segWord} aria-hidden="true">
                  {m.word}
                </span>
              </button>
            );
          })}
          <span id={copyId} className="sr-only">
            Default is the full exact script. {MODE_COPY} It is never a badge of worth.
          </span>
        </div>
      </section>

      {/* ---- local data ---- */}
      <Card onPress={() => setSheet('data')} name={`Local data: ${keys.length} entr${keys.length === 1 ? 'y' : 'ies'}, ${formatBytes(totalBytes)}, in this browser's ${STORAGE_NAMESPACE} namespace. Synthetic demo data; nothing leaves this device unless you export it. Open the list.`} data-local-data>
        <div className={styles.dataRow}>
          <span className={styles.kicker}>Local data</span>
          <div className={styles.dataStats} aria-hidden="true">
            <Stat value={keys.length} icon="list" name="Entries" />
            <Stat value={formatBytes(totalBytes)} icon="shield" name="Size" />
          </div>
        </div>
      </Card>

      <TileGrid columns={2}>
        <Tile icon="arrow-up" label="Export" name={`Export all local data as JSON (${keys.length} entries)`} onClick={onExport} data-export-button />
        <Tile icon="x" label="Delete all" tone="red" name="Delete all local data (asks once more)" onClick={() => setSheet('delete')} data-delete-button />
      </TileGrid>

      {/* ---- me ---- */}
      <TileGrid columns={3}>
        <Tile icon="person" label="Profile" href="/profile" name="Profile" />
        <Tile icon="list" label="Interview" href="/onboarding/identity" name="Identity interview" />
        <Tile icon="wave" label="Insights" href="/insights" name="Insights" />
      </TileGrid>

      {/* ---- keys list ---- */}
      <Sheet open={sheet === 'data'} onClose={() => setSheet('none')} title="Local data" tall data-sheet="local-data">
        <div className={styles.sheetStack}>
          <div className={styles.chips}>
            <Chip static icon="home" label="This browser" name={`Storage namespace ${STORAGE_NAMESPACE} in this browser's localStorage. Synthetic data only. Nothing leaves this device unless you export it.`} />
          </div>
          {keys.length === 0 ? (
            <div className={styles.emptyRow}>
              <span className={styles.emptyGlyph} aria-hidden="true">
                <Icon name="empty" size={48} weight="bold" />
              </span>
              <span className={styles.emptyLabel}>{hydrated ? 'None yet' : 'Reading'}</span>
            </div>
          ) : (
            <ul className={styles.keys} aria-label="Stored keys and sizes" data-stored-keys>
              {keys.map((k) => (
                <li key={k.key} className={styles.keyRow}>
                  <code className={styles.keyName}>{k.key}</code>
                  <span className={styles.keySize}>{formatBytes(k.bytes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>

      {/* ---- export result ---- */}
      <Sheet open={sheet === 'export'} onClose={() => setSheet('none')} title="Export" tall data-sheet="export">
        <div className={styles.sheetStack}>
          <p className={styles.sheetMuted}>Local demo mode, synthetic data. The file was offered as a download; the JSON is also here.</p>
          {exported !== null ? (
            <pre className={styles.exportPre} data-export-json>
              {exported}
            </pre>
          ) : null}
        </div>
      </Sheet>

      {/* ---- delete everything ---- */}
      <Sheet open={sheet === 'delete'} onClose={() => setSheet('none')} title="Delete all" data-sheet="delete-all">
        <div className={styles.sheetStack}>
          <p className={styles.sheetText}>Removes every {STORAGE_NAMESPACE} entry from this browser. Export first if you want a copy. This cannot be undone.</p>
          <TileGrid columns={2}>
            <Tile icon="x" label="Delete" tone="red" name="Delete everything stored by this app in this browser" onClick={onDeleteAll} data-confirm-delete />
            <Tile icon="check" label="Keep" name="Keep my local data" onClick={() => setSheet('none')} />
          </TileGrid>
        </div>
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}
