import styles from './ui.module.css';

export interface KeyboardHintProps {
  /** Keys to display, e.g. ['Tab'] or ['Ctrl', 'K']. */
  keys: string[];
  /** What the shortcut does. */
  action: string;
}

/** Shows a keyboard shortcut next to its action, using `<kbd>`. */
export function KeyboardHint({ keys, action }: KeyboardHintProps) {
  return (
    <span className={styles.kbdHint}>
      <span>
        {keys.map((k, i) => (
          <span key={k}>
            {i > 0 ? ' + ' : null}
            <kbd className={styles.kbd}>{k}</kbd>
          </span>
        ))}
      </span>
      <span>{action}</span>
    </span>
  );
}
