import { useCallback, useEffect, useRef, useState } from 'react';
import { LEADS, type StepIndex } from './data';
import { biggest, leaks, teamCounts } from './engine';
import { useMoves, useRoute } from './store';
import { Icon } from './ui';
import { LeadDrawer, Leads, Leaks, Moves, Overview, RepDrawer, Reps, Today } from './screens';

type Role = 'owner' | 'rep';
const ME = 'jordan';
const TEAM = teamCounts();
const LEAKING = leaks(TEAM).filter(l => l.health === 'leak').length;

const NAV: Record<Role, { to: string; label: string; icon: string; count?: number }[]> = {
  owner: [
    { to: 'overview', label: 'Overview', icon: 'overview' },
    { to: 'leaks/' + biggest(TEAM).step, label: 'Leaks', icon: 'leak', count: LEAKING },
    { to: 'reps', label: 'Reps', icon: 'reps' },
    { to: 'moves', label: 'Moves', icon: 'move' },
    { to: 'leads', label: 'Leads', icon: 'leads' },
  ],
  rep: [
    { to: 'today', label: 'Today', icon: 'today' },
    { to: 'my-leads', label: 'My leads', icon: 'leads' },
  ],
};

export default function App() {
  const [[page, arg], go] = useRoute();
  const api = useMoves();
  const role: Role = ['today', 'my-leads'].includes(page) ? 'rep' : 'owner';
  const [msg, setMsg] = useState('');
  const timer = useRef<number>();
  const toast = useCallback((s: string) => {
    setMsg(s); clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(''), 2600);
  }, []);

  const switchRole = (r: Role) => { if (r !== role) go(r === 'owner' ? 'overview' : 'today'); };

  const base = page === 'my-leads' ? 'my-leads' : page;
  const current = (to: string) => to.split('/')[0] === base;

  let screen: JSX.Element;
  let drawer: JSX.Element | null = null;
  let close = '';
  switch (page) {
    case 'leaks': screen = <Leaks step={(Math.min(3, Math.max(0, Number(arg) || 0)) as StepIndex)} go={go} api={api} toast={toast} />; break;
    case 'reps': screen = <Reps go={go} />; if (arg) { drawer = <RepDrawer id={arg} api={api} toast={toast} />; close = 'reps'; } break;
    case 'moves': screen = <Moves api={api} />; break;
    case 'leads': screen = <Leads go={go} />; break;
    case 'today': screen = <Today me={ME} go={go} api={api} />; break;
    case 'my-leads': screen = <Leads go={go} mine={ME} />; break;
    default: screen = <Overview go={go} api={api} />;
  }
  if ((page === 'leads' || page === 'my-leads') && arg) {
    const lead = LEADS.find(l => l.id === arg);
    if (lead) { drawer = <LeadDrawer lead={lead} />; close = page; }
  }

  useEffect(() => {
    if (!drawer) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') go(close); };
    addEventListener('keydown', on); return () => removeEventListener('keydown', on);
  }, [drawer, close, go]);

  const nav = NAV[role];
  return (
    <div className="shell">
      <aside className="side" aria-label="Main">
        <a className="brand" href="../index.html"><img src="../favicon.svg" alt="" />Obavia</a>
        <div className="who-switch" role="group" aria-label="View as">
          <button aria-pressed={role === 'owner'} onClick={() => switchRole('owner')}>Owner</button>
          <button aria-pressed={role === 'rep'} onClick={() => switchRole('rep')}>Rep</button>
        </div>
        {nav.map(n => (
          <a key={n.to} className="navi" href={'#/' + n.to} aria-current={current(n.to) ? 'page' : undefined}>
            <Icon name={n.icon} size={26} dim={!current(n.to)} />{n.label}
            {!!n.count && <span className="count">{n.count}</span>}
          </a>
        ))}
        <div className="foot"><span className="demo">Demo workspace</span><p style={{ margin: '10px 0 0' }}>Illustrative team. Every name and number is made up.</p></div>
      </aside>

      <main className="main">
        <div className="mtop">
          <a className="brand" style={{ padding: 0 }} href="../index.html"><img src="../favicon.svg" alt="" />Obavia</a>
          <div className="who-switch" role="group" aria-label="View as" style={{ margin: 0, width: 168 }}>
            <button aria-pressed={role === 'owner'} onClick={() => switchRole('owner')}>Owner</button>
            <button aria-pressed={role === 'rep'} onClick={() => switchRole('rep')}>Rep</button>
          </div>
        </div>
        <div key={page + (page === 'leaks' ? arg : '')}>{screen}</div>
      </main>

      <nav className="tabbar" aria-label="Main">
        {nav.map(n => (
          <a key={n.to} href={'#/' + n.to} aria-current={current(n.to) ? 'page' : undefined}>
            <Icon name={n.icon} size={26} />{n.label}
          </a>
        ))}
      </nav>

      {drawer && <>
        <div className="scrim" onClick={() => go(close)} />
        <aside className="drawer" role="dialog" aria-modal="true">
          <button className="close" aria-label="Close" onClick={() => go(close)} />
          {drawer}
        </aside>
      </>}
      {msg && <div className="toast" role="status"><Icon name="check" size={22} />{msg}</div>}
    </div>
  );
}
