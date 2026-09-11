'use client';

import { useEffect, useRef, useState } from 'react';
import type { DialResult, DispositionKind } from '@apohenia/domain/schemas';
import { Chip, Sheet, Tile, TileGrid, type IconName, type TileTone } from '@/components/ui';
import styles from './dial.module.css';

export interface OutcomeSheetProps {
  open: boolean;
  contact: string;
  /** The simulated dial result — its tile is focused first (never auto-chosen). */
  suggested: DialResult | null;
  onChoose: (kind: DispositionKind, callbackAt?: string) => void;
}

interface OutcomeTile {
  kind: DispositionKind;
  label: string;
  icon: IconName;
  tone: TileTone;
  name: string;
}

/** Nine tiles (DESIGN_SYSTEM §3.3), brief §9 statuses. One tap records the disposition. */
export const OUTCOME_TILES: readonly OutcomeTile[] = [
  { kind: 'no_answer', label: 'No answer', icon: 'phone-off', tone: 'neutral', name: 'No answer — attempted, nobody picked up' },
  { kind: 'voicemail', label: 'Voicemail', icon: 'voicemail', tone: 'neutral', name: 'Voicemail — reached a mailbox; no message left' },
  { kind: 'gatekeeper', label: 'Gatekeeper', icon: 'shield', tone: 'neutral', name: 'Gatekeeper — spoke to someone who is not the decision maker' },
  { kind: 'callback', label: 'Callback', icon: 'refresh', tone: 'blue', name: 'Callback requested — pick a time next' },
  { kind: 'talked', label: 'Talked', icon: 'wave', tone: 'blue', name: 'Talked — decision-maker conversation, no next step agreed' },
  { kind: 'meeting', label: 'Meeting', icon: 'calendar', tone: 'green', name: 'Meeting scheduled — a mutually agreed time' },
  { kind: 'qualified', label: 'Qualified', icon: 'star', tone: 'green', name: 'Qualified — relevant problem, fit and authority established from what they said' },
  { kind: 'no_fit', label: 'No fit', icon: 'x', tone: 'orange', name: 'No fit — respectful disqualification' },
  { kind: 'do_not_call', label: 'Do not call', icon: 'ban', tone: 'red', name: 'Do not call — explicit opt-out; the number is suppressed for good' },
];

const SUGGESTED: Record<DialResult, DispositionKind> = { no_answer: 'no_answer', voicemail: 'voicemail', gatekeeper: 'gatekeeper', connected: 'talked', failed: 'no_answer' };

interface TimeTile {
  id: 'later' | 'tomorrow' | 'next_week' | 'pick';
  label: string;
  icon: IconName;
  when: () => Date | null;
}

function at(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const TIME_TILES: readonly TimeTile[] = [
  { id: 'later', label: 'Later today', icon: 'clock', when: () => new Date(Date.now() + 3 * 3600_000) },
  { id: 'tomorrow', label: 'Tomorrow', icon: 'sun', when: () => at(new Date(Date.now() + 24 * 3600_000), 10) },
  { id: 'next_week', label: 'Next week', icon: 'calendar', when: () => at(new Date(Date.now() + 7 * 24 * 3600_000), 10) },
  { id: 'pick', label: 'Pick', icon: 'plus', when: () => null },
];

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Outcome sheet: required after every call — a disposition before the next record (brief §9).
 * `Callback` opens a second sheet with four time tiles; `Do not call` writes suppression.
 */
export function OutcomeSheet({ open, contact, suggested, onChoose }: OutcomeSheetProps) {
  const [step, setStep] = useState<'outcome' | 'when'>('outcome');
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState(() => toLocalInputValue(at(new Date(Date.now() + 24 * 3600_000), 10)));
  const suggestedKind = suggested ? SUGGESTED[suggested] : null;
  const gridRef = useRef<HTMLDivElement>(null);

  // Focus the suggested tile once the sheet is open (the sheet itself focuses the first control).
  useEffect(() => {
    if (!open || step !== 'outcome' || !suggestedKind) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-outcome="${suggestedKind}"]`);
    const id = requestAnimationFrame(() => el?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, step, suggestedKind]);

  function choose(kind: DispositionKind) {
    if (kind === 'callback') {
      setStep('when');
      return;
    }
    onChoose(kind);
  }

  function chooseWhen(tile: TimeTile) {
    if (tile.id === 'pick') {
      setPicking(true);
      return;
    }
    const when = tile.when();
    if (when) onChoose('callback', when.toISOString());
  }

  return (
    <>
      <Sheet open={open && step === 'outcome'} onClose={() => undefined} title="Outcome" required data-sheet="outcome">
        <div ref={gridRef}>
          <TileGrid columns={3}>
            {OUTCOME_TILES.map((t) => (
              <Tile key={t.kind} icon={t.icon} label={t.label} name={`${t.name}${t.kind === suggestedKind ? ' (suggested from the simulated result — not chosen yet)' : ''}`} tone={t.tone} onClick={() => choose(t.kind)} data-outcome={t.kind} suggested={t.kind === suggestedKind} data-suggested={t.kind === suggestedKind ? 'true' : undefined} />
            ))}
          </TileGrid>
        </div>
        <span className="sr-only">Outcome for the call with {contact}. Choose one tile.</span>
      </Sheet>

      <Sheet open={open && step === 'when'} onClose={() => setStep('outcome')} title="When" data-sheet="callback-when">
        <TileGrid columns={2}>
          {TIME_TILES.map((t) => (
            <Tile key={t.id} icon={t.icon} label={t.label} onClick={() => chooseWhen(t)} data-when={t.id} selected={t.id === 'pick' ? picking : undefined} />
          ))}
        </TileGrid>
        {picking ? (
          <div className={styles.pickRow}>
            <input type="datetime-local" className={styles.pickInput} aria-label="Callback date and time" value={picked} onChange={(e) => setPicked(e.target.value)} />
            <Chip label="Set" tone="blue" selected onClick={() => onChoose('callback', new Date(picked).toISOString())} />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
