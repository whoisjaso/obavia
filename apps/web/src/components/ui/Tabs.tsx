'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './ui.module.css';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Initially selected tab id (defaults to the first). */
  defaultTabId?: string;
  /** Accessible name for the tab list. */
  label: string;
  onChange?: (id: string) => void;
}

/** WAI-ARIA tabs with roving tabindex: Arrow keys move, Home/End jump, selection follows focus. */
export function Tabs({ tabs, defaultTabId, label, onChange }: TabsProps) {
  const [selected, setSelected] = useState(defaultTabId ?? tabs[0]?.id ?? '');
  const baseId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    setSelected(tab.id);
    onChange?.(tab.id);
    buttons.current[index]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const map: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = map[e.key];
    if (next !== undefined) {
      e.preventDefault();
      select(next);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.tabList}>
        {tabs.map((tab, i) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={styles.tab}
              onClick={() => select(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          tabIndex={0}
          className={styles.tabPanel}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
