'use client';

import { useId, useRef, type KeyboardEvent } from 'react';
import type { AssistanceMode } from '@apohenia/domain/schemas';
import { MODE_COPY } from '@apohenia/domain/practice';
import { Glyph } from '@/components/ui';
import { MODES, modeName } from './practice-lib';
import styles from './practice.module.css';

export interface ModeControlProps {
  value: AssistanceMode;
  onChange: (mode: AssistanceMode) => void;
}

/**
 * Assistance mode: a segmented control of five glyphs (full · reveal · mirror · cue · none).
 * Exposed as a radiogroup with roving tabindex; every option's accessible name is the whole
 * truth from the domain labels. Reducing assistance is optional and reversible (sr-only copy).
 */
export function ModeControl({ value, onChange }: ModeControlProps) {
  const copyId = useId();
  const ref = useRef<HTMLDivElement>(null);

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = MODES.findIndex((m) => m.mode === value);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % MODES.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + MODES.length) % MODES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = MODES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = MODES[next];
    if (!target) return;
    onChange(target.mode);
    ref.current?.querySelector<HTMLButtonElement>(`[data-mode-option="${target.mode}"]`)?.focus();
  }

  return (
    <div ref={ref} role="radiogroup" aria-label="Assistance mode" aria-describedby={copyId} className={styles.seg} data-mode-control data-mode={value}>
      {MODES.map((m) => {
        const selected = m.mode === value;
        return (
          <button
            key={m.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={modeName(m.mode)}
            tabIndex={selected ? 0 : -1}
            className={[styles.segItem, selected ? styles.segSelected : ''].join(' ').trim()}
            onClick={() => onChange(m.mode)}
            onKeyDown={onKey}
            data-mode-option={m.mode}
          >
            <span className={styles.segGlyph} aria-hidden="true">
              <Glyph glyph={m.glyph} size={22} />
            </span>
            <span className={styles.segWord} aria-hidden="true">
              {m.word}
            </span>
          </button>
        );
      })}
      <span id={copyId} className="sr-only" data-mode-copy>
        {MODE_COPY}
      </span>
    </div>
  );
}
