'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'neutral' | 'red' | 'green';
}

export interface ToastProps {
  message: ToastMessage | null;
  /** Auto-hide delay in ms (default 2500). */
  ms?: number;
  onHide?: () => void;
}

/** One line, bottom above the tab bar, `role="status"`, auto-hides after 2.5s. Rare. */
export function Toast({ message, ms = 2500, onHide }: ToastProps) {
  const [visible, setVisible] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!message) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show then auto-hide; the timer is the point
    setVisible(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setVisible(null);
      onHide?.();
    }, ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, ms, onHide]);
  return (
    <div className={styles.host} role="status" aria-live="polite" aria-atomic="true" data-toast>
      {visible ? (
        <div key={visible.id} className={[styles.toast, styles[visible.tone ?? 'neutral']].join(' ')}>
          {visible.text}
        </div>
      ) : null}
    </div>
  );
}

/** Tiny toast queue: `const [toast, show] = useToast(); <Toast message={toast} />`. */
export function useToast(): [ToastMessage | null, (text: string, tone?: ToastMessage['tone']) => void] {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string, tone?: ToastMessage['tone']) => {
    seq.current += 1;
    setToast({ id: seq.current, text, tone });
  }, []);
  return [toast, show];
}
