import { useCallback, useEffect, useState } from 'react';
import { MOVES, PLAYBOOK, type Move, type MoveStatus, type StepIndex } from './data';
import { byId, rate } from './engine';

/* Fixes are kept in this browser for now. Connected workspaces keep them server-side. */
const KEY = 'obavia.app.moves.v1';
const load = (): Move[] => { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* private mode */ } return MOVES; };

export function useMoves() {
  const [moves, setMoves] = useState<Move[]>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(moves)); } catch { /* ignore */ } }, [moves]);
  const assign = useCallback((rep: string, step: StepIndex) => {
    const r = byId(rep);
    const m: Move = { id: 'm' + Date.now(), rep, step, text: PLAYBOOK[step].move, status: 'assigned', done: 0, of: 0,
      before: Math.round(rate(r.counts, step)), after: null, created: 'Today', check: 'In 7 days' };
    setMoves(ms => [m, ...ms]);
    return m;
  }, []);
  const advance = useCallback((id: string) => setMoves(ms => ms.map(m => {
    if (m.id !== id) return m;
    const next: Record<MoveStatus, MoveStatus> = { assigned: 'doing', doing: 'checking', checking: 'worked', worked: 'worked', missed: 'missed' };
    const status = next[m.status];
    const of = status === 'doing' ? 12 : m.of, done = status === 'doing' ? 5 : status === 'checking' ? of : m.done;
    const after = status === 'worked' ? (m.after ?? m.before + 9) : status === 'checking' ? (m.after ?? m.before + 6) : m.after;
    return { ...m, status, of, done, after };
  })), []);
  const reset = useCallback(() => setMoves(MOVES), []);
  return { moves, assign, advance, reset };
}

export function useRoute(): [string[], (to: string) => void] {
  const parse = () => (location.hash.replace(/^#\/?/, '') || 'overview').split('/');
  const [r, setR] = useState(parse);
  useEffect(() => { const on = () => { setR(parse()); window.scrollTo({ top: 0 }); }; addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  return [r, (to: string) => { location.hash = '#/' + to; }];
}
