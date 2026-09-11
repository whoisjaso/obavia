/**
 * Pure helpers for the Follow-ups screen. No React.
 */

/** Relative, glanceable time chip for a callback: "Today 15:00" · "Tomorrow 10:00" · "Thu 10:00" · "Sep 30". */
export function whenChip(iso: string, now: number = Date.now()): { text: string; name: string; past: boolean } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { text: iso, name: iso, past: false };
  const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const startOf = (t: number) => {
    const x = new Date(t);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const days = Math.round((startOf(d.getTime()) - startOf(now)) / 86_400_000);
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : Math.abs(days) < 7 ? new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d) : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  const full = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(d);
  return { text: `${day} ${time}`, name: `Callback agreed for ${full} — chosen on the outcome sheet`, past: d.getTime() < now };
}

/** Short local date ("Sep 11") for when a disposition was recorded. */
export function shortDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
}

/** Lane glyphs (one each, distinct): the whole truth is in the lane's accessible name. */
export const LANE_GLYPHS: Record<string, string> = {
  agreed_follow_up: '✓',
  budget: '¤',
  authority: '⚑',
  implementation: '⚙',
  no_fit: '✕',
  deferral: '◔',
  no_contact: '○',
  do_not_call: '⊘',
};

export function laneTone(key: string): 'green' | 'red' | 'teal' | 'neutral' | 'gold' {
  switch (key) {
    case 'agreed_follow_up':
      return 'green';
    case 'do_not_call':
      return 'red';
    case 'deferral':
      return 'teal';
    case 'budget':
    case 'authority':
    case 'implementation':
      return 'gold';
    default:
      return 'neutral';
  }
}
