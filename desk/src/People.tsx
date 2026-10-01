/* Who is at the desk: pick your name, type your PIN. The owner adds people,
   and everything each person does carries their name. */
import { useEffect, useState } from 'react';
import { PIN_LENGTH, can, checkPin, makeStaff, waitLeft, weakPin, type Role, type Staff } from './lib/staff';
import { today } from './lib/loans';
import { first } from './Payments';
import { addStaff, lockDesk, me, removeStaff, signIn, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

/* ---------- the keypad: four dots and ten round keys ---------- */
function Keypad({ onDone, shake }: { onDone: (pin: string) => void; shake?: number }) {
  const [pin, setPin] = useState('');
  useEffect(() => { setPin(''); }, [shake]);
  const press = (k: string) => {
    if (k === 'del') { feel.tap(); setPin(p => p.slice(0, -1)); return; }
    feel.key();
    setPin(p => { const n = (p + k).slice(0, PIN_LENGTH); if (n.length === PIN_LENGTH) setTimeout(() => onDone(n), 120); return n; });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });   // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <div className={`pin ${shake ? 'shake' : ''}`} key={shake} aria-label={`${pin.length} of ${PIN_LENGTH} digits`}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
    </div>
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} />
        : <button key={i} className={k === 'del' ? 'del' : ''} aria-label={k === 'del' ? 'Delete' : k} onClick={() => press(k)}>{k === 'del' ? '⌫' : k}</button>)}
    </div>
  </>;
}

/* ---------- the lock ---------- */
const fails: number[] = [];
export function Lock() {
  const { staff = [], dealer } = useStore();
  const [who, setWho] = useState<Staff | undefined>(staff.length === 1 ? staff[0] : undefined);
  const [shake, setShake] = useState(0);
  const [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return; const i = setInterval(() => setWait(waitLeft(fails, Date.now())), 1000); return () => clearInterval(i); }, [wait]);
  const to = (f: () => void) => transition(() => { f(); scrollTo(0, 0); });

  const tryPin = async (pin: string) => {
    if (!who || waitLeft(fails, Date.now())) return;
    if (await checkPin(who, pin)) { fails.length = 0; feel.done(); signIn(who.id); return; }
    fails.push(Date.now()); setShake(s => s + 1); setWait(waitLeft(fails, Date.now()));
  };

  if (!who) return (
    <main className="wrap center">
      <div className="top"><span className="who">{dealer.dba || dealer.legalName}</span></div>
      <section className="enter" key="who">
        <h1 className="q">Who’s At The Desk?</h1>
        <div className="choices">{staff.map(s => <button key={s.id} className="choice" onClick={() => { feel.next(); to(() => setWho(s)); }}>
          <span className="art face">{s.name.slice(0, 1).toUpperCase()}</span><span className="t"><b>{s.name}</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span>
        </button>)}</div>
      </section>
    </main>
  );
  return (
    <main className="wrap center">
      <div className="top">{staff.length > 1 ? <button className="back" onClick={() => { feel.tap(); to(() => setWho(undefined)); }}><Ic n="chev" s={18} w={2.4} />Not {first(who.name)}?</button> : <span />}</div>
      <section className="enter" key={'pin' + who.id}>
        <span className="face big">{who.name.slice(0, 1).toUpperCase()}</span>
        <h1 className="q">Hi, {first(who.name)}.</h1>
        <p className="note">{wait ? `Too many tries. Wait ${wait} seconds.` : shake ? 'Not that one. Try again.' : 'Your PIN'}</p>
        <Keypad onDone={tryPin} shake={shake} />
      </section>
    </main>
  );
}

/* ---------- the people ---------- */
export function People() {
  const { staff = [], dealer } = useStore();
  const who = me();
  const [sure, setSure] = useState<string | null>(null);
  if (!can(who, 'staff')) return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <section className="enter" key="me">
        <span className="face big">{who!.name.slice(0, 1).toUpperCase()}</span>
        <h1 className="q">{who!.name}.</h1>
        <p className="note">At the desk for {dealer.dba || dealer.legalName}</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); lockDesk(); go('/'); }}>Switch Person</button></div></div>
      </section>
    </main>
  );
  return (
    <main className="wrap center">
      <div className="top"><Back to="#/" label="Sales" /></div>
      <section className="enter" key="people">
        <h1 className="q">{staff.length ? 'Who Works The Desk.' : 'Just You For Now.'}</h1>
        <p className="note">{staff.length ? 'Each person signs in with their own PIN. Cash shows who took it.' : 'Add the people at your desk. Each gets a PIN, and cash shows who took it.'}</p>
        {staff.length > 0 && <div className="list-plain stack">{staff.map(s => <div key={s.id}>
          <b>{s.name}{s.id === who?.id ? ' · You' : ''}</b>
          <span>{s.role === 'owner' ? 'Owner · everything' : 'Desk · sales and payments'}</span>
          {s.id !== who?.id && <small>{sure === s.id
            ? <button className="textlink undo" onClick={() => { feel.tap(); if (!removeStaff(s.id)) alert('Keep at least one owner.'); setSure(null); }}>Remove {first(s.name)}?</button>
            : <button className="textlink" onClick={() => { feel.tap(); setSure(s.id); }}>Remove</button>}</small>}
        </div>)}</div>}
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.next(); go('/people/add'); }}>{staff.length ? 'Add Someone' : 'Start With You'}</button>
          {who && <button className="textlink" onClick={() => { feel.tap(); lockDesk(); go('/'); }}>Lock The Desk</button>}
        </div></div>
      </section>
    </main>
  );
}

/* ---------- adding someone, one question at a time ---------- */
export function AddPerson() {
  const { staff = [], dealer } = useStore();
  const firstOne = !staff.length;
  const [step, setStep] = useState<'name' | 'role' | 'pin' | 'again' | 'done'>('name');
  const [name, setName] = useState(firstOne ? dealer.signer.name : '');
  const [role, setRole] = useState<Role>(firstOne ? 'owner' : 'desk');
  const [pin, setPin] = useState('');
  const [say, setSay] = useState('');
  const [shake, setShake] = useState(0);
  if (!can(me(), 'staff')) { go('/people'); return null; }
  const to = (s: typeof step) => transition(() => { setSay(''); setStep(s); scrollTo(0, 0); });
  const taken = staff.some(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  const backTo = { name: null, role: 'name', pin: firstOne ? 'name' : 'role', again: 'pin', done: null }[step] as typeof step | null;
  const top = <div className="top">{backTo ? <button className="back" onClick={() => { feel.tap(); to(backTo); }}><Ic n="chev" s={18} w={2.4} />Back</button> : step === 'name' ? <Back to="#/people" label="People" /> : <span />}</div>;

  if (step === 'name') return (
    <main className="wrap center">{top}
      <section className="enter" key="name">
        <h1 className="q">{firstOne ? 'Your Name?' : 'Their Name?'}</h1>
        <label className="field"><input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="First and last" aria-label="Name" /></label>
        {taken && <p className="note">Someone already has that name.</p>}
        <div className="dock"><div className="in"><button className="btn primary block" disabled={name.trim().length < 2 || taken} onClick={() => { feel.next(); to(firstOne ? 'pin' : 'role'); }}>Next</button></div></div>
      </section>
    </main>
  );
  if (step === 'role') return (
    <main className="wrap center">{top}
      <section className="enter" key="role">
        <h1 className="q">What Can {first(name)} Do?</h1>
        <div className="choices">
          {([['desk', 'Sales And Payments', 'Can’t change settings, undo posts or recount a closed drawer'], ['owner', 'Everything', 'Like you']] as const).map(([r, label, gloss]) =>
            <button key={r} className="choice" aria-pressed={role === r} onClick={() => { feel.next(); setRole(r); to('pin'); }}>
              <span className="t"><b>{label}</b><small>{gloss}</small></span><span className="tick">{role === r && <Ic n="check" s={15} w={3} />}</span>
            </button>)}
        </div>
      </section>
    </main>
  );
  if (step === 'pin' || step === 'again') return (
    <main className="wrap center">{top}
      <section className="enter" key={step}>
        <h1 className="q">{step === 'pin' ? (firstOne ? 'Pick Your PIN.' : `${first(name)} Picks A PIN.`) : 'Once More.'}</h1>
        <p className="note">{say || (step === 'pin' ? `${PIN_LENGTH} digits${firstOne ? '' : `. Hand ${first(name)} the screen`}` : 'The same four digits')}</p>
        <Keypad shake={shake} onDone={async p => {
          if (step === 'pin') { if (weakPin(p)) { setShake(s => s + 1); setSay('Too easy to guess. Pick another.'); return; } setPin(p); to('again'); return; }
          if (p !== pin) { setShake(s => s + 1); setPin(''); transition(() => { setStep('pin'); setSay('Those didn’t match. Start again.'); }); return; }
          addStaff(await makeStaff(name, role, p, today(dealer.timeZone))); feel.done(); to('done');
        }} />
      </section>
    </main>
  );
  return (
    <main className="wrap center">{top}
      <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">{firstOne ? 'You’re Set.' : `${first(name)} Is Set.`}</h1>
        <p className="note">{firstOne ? 'Add the people at your desk next.' : `${first(name)} signs in with their name and PIN.`}</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.next(); go('/people'); }}>Done</button></div></div>
      </section>
    </main>
  );
}
