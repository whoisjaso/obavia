import { useCallback, useEffect, useRef, useState } from 'react';
import { AGENCY, LEADS, type StepIndex } from './data';
import { biggest, leaks, teamCounts } from './engine';
import { useMoves, useRoute } from './store';
import { Avatar, Ic } from './ui';
import { LeadSheet, Leads, Leaks, Moves, Overview, RepSheet, Reps, Today } from './screens';
import { Onboarding } from './Onboarding';
import { sounds } from './sound';

type Role = 'owner' | 'rep';
const ME = 'jordan';
const TEAM = teamCounts();
const LEAKING = leaks(TEAM).filter(l => l.health === 'leak').length;
const REP_PAGES = ['today', 'my-leads'];
const OB_KEY = 'obavia.onboarded.v1';

const NAV: Record<Role, { to: string; label: string; icon: string; count?: number }[]> = {
  owner: [
    { to: 'overview', label: 'This month', icon: 'overview' },
    { to: 'leaks/' + biggest(TEAM).step, label: 'Leaks', icon: 'leak', count: LEAKING },
    { to: 'reps', label: 'Reps', icon: 'reps' },
    { to: 'moves', label: 'Fixes', icon: 'move' },
    { to: 'leads', label: 'Leads', icon: 'leads' },
  ],
  rep: [
    { to: 'today', label: 'Today', icon: 'today' },
    { to: 'my-leads', label: 'My leads', icon: 'leads' },
  ],
};

const seen = () => { try { return localStorage.getItem(OB_KEY) === '1'; } catch { return true; } };

export default function App() {
  const [[page, arg], go] = useRoute();
  const api = useMoves();
  const role: Role = REP_PAGES.includes(page) ? 'rep' : 'owner';
  const [onboard, setOnboard] = useState(() => !seen());
  const [msg, setMsg] = useState('');
  const timer = useRef<number>();
  const toast = useCallback((s: string) => {
    sounds.done(); setMsg(s); clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(''), 2400);
  }, []);
  const finish = (to: string) => { try { localStorage.setItem(OB_KEY, '1'); } catch { /* private mode */ } setOnboard(false); go(to); };
  const switchRole = (r: Role) => { if (r !== role) { sounds.tap(); go(r === 'owner' ? 'overview' : 'today'); } };
  const current = (to: string) => to.split('/')[0] === page;

  let screen: JSX.Element, sheet: JSX.Element | null = null, close = '';
  switch (page) {
    case 'leaks': screen = <Leaks step={Math.min(3, Math.max(0, Number(arg) || 0)) as StepIndex} go={go} api={api} toast={toast} />; break;
    case 'reps': screen = <Reps go={go} />; if (arg) { sheet = <RepSheet id={arg} api={api} toast={toast} />; close = 'reps'; } break;
    case 'moves': screen = <Moves api={api} />; break;
    case 'leads': screen = <Leads go={go} />; break;
    case 'today': screen = <Today me={ME} go={go} api={api} />; break;
    case 'my-leads': screen = <Leads go={go} mine={ME} />; break;
    default: screen = <Overview go={go} api={api} />;
  }
  if ((page === 'leads' || page === 'my-leads') && arg) {
    const lead = LEADS.find(l => l.id === arg);
    if (lead) { sheet = <LeadSheet lead={lead} />; close = page; }
  }

  useEffect(() => {
    if (!sheet) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') go(close); };
    addEventListener('keydown', on);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', on); document.body.style.overflow = ''; };
  }, [!!sheet, close]); // eslint-disable-line

  const roleSeg = (
    <div className="seg" role="group" aria-label="View as">
      <button aria-pressed={role === 'owner'} onClick={() => switchRole('owner')}>Owner</button>
      <button aria-pressed={role === 'rep'} onClick={() => switchRole('rep')}>Rep</button>
    </div>
  );
  const nav = NAV[role];

  return (
    <div className="shell">
      <aside className="side" aria-label="Main">
        <a className="brand" href="#/overview"><img src="./mark.svg" alt="" />Obavia</a>
        {roleSeg}
        <nav className="nav">
          {nav.map(n => (
            <a key={n.to} href={'#/' + n.to} aria-current={current(n.to) ? 'page' : undefined}>
              <Ic name={n.icon} />{n.label}{!!n.count && <span className="badge">{n.count}</span>}
            </a>
          ))}
        </nav>
        <div className="me">
          <Avatar initials={AGENCY.initials} tint="b" />
          <div><b>{AGENCY.owner}</b><small>{AGENCY.name}</small></div>
          <button onClick={() => setOnboard(true)}>Set up</button>
        </div>
      </aside>

      <main className="main">
        <div className="mtop">
          <a className="brand" href="#/overview"><img src="./mark.svg" alt="" />Obavia</a>
          {roleSeg}
        </div>
        <div className="page" key={page + (page === 'leaks' ? arg : '')}>{screen}</div>
      </main>

      <nav className="tabbar" aria-label="Main">
        {nav.map(n => (
          <a key={n.to} href={'#/' + n.to} aria-current={current(n.to) ? 'page' : undefined}>
            <Ic name={n.icon} size={25} w={1.7} />{n.label}
          </a>
        ))}
      </nav>

      {sheet && <>
        <div className="scrim" onClick={() => go(close)} />
        <div className="sheet" role="dialog" aria-modal="true">
          <div className="grab" />
          <button className="x" aria-label="Close" onClick={() => go(close)}><Ic name="x" size={16} w={2.4} /></button>
          {sheet}
        </div>
      </>}
      {msg && <div className="toast" role="status"><span className="ok"><Ic name="check" size={14} w={3} /></span>{msg}</div>}
      {onboard && <Onboarding done={finish} />}
    </div>
  );
}
