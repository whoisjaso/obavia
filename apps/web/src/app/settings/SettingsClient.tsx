'use client';

import { useCallback, useEffect, useState } from 'react';
import { AssistanceMode, DEFAULT_ASSISTANCE_MODE } from '@apohenia/domain/schemas';
import { Badge, Button, Card, Dialog, Field, Inline, PageHeader, Select, Stack } from '@/components/ui';
import {
  STORAGE_NAMESPACE,
  clearAllStored,
  exportAllStored,
  listStoredKeys,
  useStoredState,
  type StoredKeyInfo,
} from '@/lib/storage';

const ASSISTANCE_MODE_KEY = 'settings.assistance_mode';

const MODE_LABELS: Record<AssistanceMode, string> = {
  full_script: 'Full exact script (default)',
  recall_with_reveal: 'Recall with reveal',
  primary_plus_mirror: 'Primary line plus mirror',
  stage_purpose_cue: 'Stage-purpose cue',
  unassisted: 'Unassisted',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function SettingsClient() {
  const [mode, setMode, hydrated, resetMode] = useStoredState<AssistanceMode>(ASSISTANCE_MODE_KEY, AssistanceMode, DEFAULT_ASSISTANCE_MODE);
  const [keys, setKeys] = useState<StoredKeyInfo[]>([]);
  const [exported, setExported] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const refresh = useCallback(() => setKeys(listStoredKeys()), []);

  useEffect(() => {
    // Storage is browser-only; read it after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount read of localStorage
    refresh();
  }, [refresh, mode]);

  function onExport() {
    const json = JSON.stringify(exportAllStored(), null, 2);
    setExported(json);
    setLastAction(`Exported ${keys.length} entr${keys.length === 1 ? 'y' : 'ies'} as JSON.`);
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apohenia-local-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download is a convenience; the JSON is still shown below.
    }
  }

  function onDeleteAll() {
    const removed = clearAllStored();
    setConfirmOpen(false);
    setExported(null);
    resetMode(); // in-memory only — must not re-create the key we just deleted
    setLastAction(`Deleted ${removed} local entr${removed === 1 ? 'y' : 'ies'}.`);
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Settings"
        purpose="Inspect, export or delete everything this app stores in your browser, and choose the default assistance mode for practice."
        aside={<Badge variant="warning">Local demo mode</Badge>}
      />
      <Stack gap={5}>
        <Card title="Default assistance mode">
          <Field
            id="assistance-mode"
            label="Assistance mode for new practice sessions"
            help="Default is the full exact script. Reducing assistance is optional and reversible; it is never a badge of worth."
          >
            {(control) => (
              <Select
                {...control}
                value={mode}
                disabled={!hydrated}
                onChange={(e) => setMode(AssistanceMode.parse(e.target.value))}
                options={AssistanceMode.options.map((m) => ({ value: m, label: MODE_LABELS[m] }))}
              />
            )}
          </Field>
        </Card>

        <Card title="Local data">
          <Stack gap={3}>
            <p>
              Storage namespace: <code>{STORAGE_NAMESPACE}*</code> in this browser&apos;s localStorage. Synthetic data
              only. Nothing leaves this device unless you export it.
            </p>
            {keys.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>{hydrated ? 'No local entries yet.' : 'Reading local storage…'}</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <caption className="visually-hidden" style={{ textAlign: 'left', color: 'var(--color-muted)' }}>
                  Stored keys and sizes
                </caption>
                <thead>
                  <tr>
                    <th scope="col" style={{ textAlign: 'left', padding: '4px 16px 4px 0' }}>
                      Key
                    </th>
                    <th scope="col" style={{ textAlign: 'right', padding: '4px 0' }}>
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.key}>
                      <td style={{ padding: '4px 16px 4px 0' }}>
                        <code>{k.key}</code>
                      </td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatBytes(k.bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Inline gap={2}>
              <Button onClick={onExport} data-export-button>
                Export local data (JSON)
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)} data-delete-button>
                Delete all local data
              </Button>
            </Inline>
            {lastAction ? (
              <p role="status" data-settings-status>
                {lastAction}
              </p>
            ) : null}
            {exported !== null ? (
              <details open>
                <summary>Exported JSON</summary>
                <pre data-export-json style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
                  {exported}
                </pre>
              </details>
            ) : null}
          </Stack>
        </Card>
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete all local data?"
        description={`This removes every ${STORAGE_NAMESPACE} entry from this browser. Export first if you want a copy. This cannot be undone.`}
        actions={
          <>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={onDeleteAll} data-confirm-delete>
              Delete everything
            </Button>
          </>
        }
      />
    </>
  );
}
