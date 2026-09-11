'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, CalendarDots, CalendarPlus, ChatCircleText, Clock, ClockCounterClockwise, PhoneX, Prohibit, SealCheck, ShieldCheck, SunHorizon, ThumbsDown, Voicemail, type Icon } from '@phosphor-icons/react';
import type { DialResult, DispositionKind } from '@apohenia/domain/schemas';
import { Chip, Sheet } from '@/components/ui';
import styles from './dial.module.css';

export interface OutcomeSheetProps {
  open: boolean;
  contact: string;
  /** The simulated dial result: its tile is marked "Suggested" and focused first (never auto-chosen). */
  suggested: DialResult | null;
  onChoose: (kind: DispositionKind, callbackAt?: string) => void;
}

type OutcomeTone = 'neutral' | 'green' | 'red' | 'blue' | 'orange';

interface OutcomeTile {
  kind: DispositionKind;
  label: string;
  icon: Icon;
  tone: OutcomeTone;
  name: string;
}

const TONE_CLASS: Record<OutcomeTone, string> = {
  neutral: '',
  green: styles.toneGreen ?? '',
  red: styles.toneRed ?? '',
  blue: styles.toneBlue ?? '',
  orange: styles.toneOrange ?? '',
};

/** Nine tiles (DESIGN_SYSTEM §3.3), brief §9 statuses. One tap records the disposition. */
export const OUTCOME_TILES: readonly OutcomeTile[] = [
  { kind: 'no_answer', label: 'No answer', icon: PhoneX, tone: 'neutral', name: 'No answer: attempted, nobody picked up' },
  { kind: 'voicemail', label: 'Voicemail', icon: Voicemail, tone: 'neutral', name: 'Voicemail: reached a mailbox, no message left' },
  { kind: 'gatekeeper', label: 'Gatekeeper', icon: ShieldCheck, tone: 'neutral', name: 'Gatekeeper: spoke to someone who is not the decision maker' },
  { kind: 'callback', label: 'Callback', icon: ClockCounterClockwise, tone: 'blue', name: 'Callback requested: pick a time next' },
  { kind: 'talked', label: 'Talked', icon: ChatCircleText, tone: 'blue', name: 'Talked: decision-maker conversation, no next step agreed' },
  { kind: 'meeting', label: 'Meeting', icon: CalendarCheck, tone: 'green', name: 'Meeting scheduled: a mutually agreed time' },
  { kind: 'qualified', label: 'Qualified', icon: SealCheck, tone: 'green', name: 'Qualified: relevant problem, fit and authority established from what they said' },
  { kind: 'no_fit', label: 'No fit', icon: ThumbsDown, tone: 'orange', name: 'No fit: respectful disqualification' },
  { kind: 'do_not_call', label: 'Do not call', icon: Prohibit, tone: 'red', name: 'Do not call: explicit opt-out, the number is suppressed for good' },
];

const SUGGESTED: Record<DialResult, DispositionKind> = { no_answer: 'no_answer', voicemail: 'voicemail', gatekeeper: 'gatekeeper', connected: 'talked', failed: 'no_answer' };

interface TimeTile {
  id: 'later' | 'tomorrow' | 'next_week' | 'pick';
  label: string;
  icon: Icon;
  name: string;
  when: () => Date | null;
}

function at(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const TIME_TILES: readonly TimeTile[] = [
  { id: 'later', label: 'Later today', icon: Clock, name: 'Later today: about three hours from now', when: () => new Date(Date.now() + 3 * 3600_000) },
  { id: 'tomorrow', label: 'Tomorrow', icon: SunHorizon, name: 'Tomorrow at 10:00', when: () => at(new Date(Date.now() + 24 * 3600_000), 10) },
  { id: 'next_week', label: 'Next week', icon: CalendarDots, name: 'Next week, same weekday at 10:00', when: () => at(new Date(Date.now() + 7 * 24 * 3600_000), 10) },
  { id: 'pick', label: 'Pick', icon: CalendarPlus, name: 'Pick a date and time', when: () => null },
];

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Outcome sheet: required after every call, a disposition before the next record (brief §9).
 * The simulated result is marked "Suggested" (a tinted edge and a caption, nothing like the focus
 * ring) and never chosen for you. `Callback` opens a second sheet with four time tiles; `Do not call`
 * writes suppression.
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
        <div ref={gridRef} className={styles.outcomeGrid} role="group" aria-label={`Outcome for the call with ${contact}. Choose one.`}>
          {OUTCOME_TILES.map((t) => {
            const isSuggested = t.kind === suggestedKind;
            const Glyph = t.icon;
            return (
              <button
                key={t.kind}
                type="button"
                className={[styles.outcomeTile, TONE_CLASS[t.tone], isSuggested ? styles.suggestedTile : ''].join(' ').trim()}
                aria-label={`${t.name}${isSuggested ? '. Suggested from the simulated result, not chosen yet' : ''}`}
                onClick={() => choose(t.kind)}
                data-outcome={t.kind}
                data-suggested={isSuggested ? 'true' : undefined}
              >
                <Glyph size={32} weight="regular" className={styles.outcomeIcon} aria-hidden="true" />
                <span className={styles.outcomeLabel}>{t.label}</span>
                {isSuggested ? <span className={styles.outcomeCap}>Suggested</span> : null}
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={open && step === 'when'} onClose={() => setStep('outcome')} title="When" data-sheet="callback-when">
        <div className={styles.whenGrid} role="group" aria-label="Callback time">
          {TIME_TILES.map((t) => {
            const Glyph = t.icon;
            const pressed = t.id === 'pick' ? picking : undefined;
            return (
              <button key={t.id} type="button" className={styles.outcomeTile} aria-label={t.name} aria-pressed={pressed} onClick={() => chooseWhen(t)} data-when={t.id}>
                <Glyph size={32} weight="regular" className={styles.outcomeIcon} aria-hidden="true" />
                <span className={styles.outcomeLabel}>{t.label}</span>
              </button>
            );
          })}
        </div>
        {picking ? (
          <div className={styles.pickRow}>
            <input type="datetime-local" className={styles.pickInput} aria-label="Callback date and time" value={picked} onChange={(e) => setPicked(e.target.value)} />
            <Chip label="Set" tone="blue" selected onClick={() => onChoose('callback', new Date(picked).toISOString())} name="Set the callback to the picked date and time" />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
