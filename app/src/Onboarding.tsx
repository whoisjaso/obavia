import { useEffect, useState } from 'react';
import { AGENCY, STEPS } from './data';
import { biggest, int, k, pct, teamCounts } from './engine';
import { Ic, useCount } from './ui';
import { sounds } from './sound';

const TEAM = teamCounts();
const TOOLS = [
  { id: 'phone', icon: 'phone', name: 'Phone system', what: 'Every call, recorded and heard' },
  { id: 'calendar', icon: 'calendar', name: 'Calendar', what: 'Who booked, who showed' },
  { id: 'card', icon: 'card', name: 'Payments', what: 'What was actually collected' },
];
const READ = [
  { n: TEAM[0], what: 'leads' },
  { n: 744, what: 'calls heard' },
  { n: TEAM[2], what: 'meetings' },
  { n: TEAM[4], what: 'payments' },
];

export function Onboarding({ done }: { done: (to: string) => void }) {
  const [step, setStep] = useState(0);
  const [on, setOn] = useState<Record<string, 'wait' | 'ok'>>({});
  const [name, setName] = useState(AGENCY.name);
  const [deal, setDeal] = useState('6,000');
  const [read, setRead] = useState(0);
  const top = biggest(TEAM);
  const next = () => { sounds.tap(); setStep(s => s + 1); };

  const connect = (id: string) => {
    if (on[id]) return;
    setOn(o => ({ ...o, [id]: 'wait' }));
    setTimeout(() => { setOn(o => ({ ...o, [id]: 'ok' })); sounds.done(); }, 1100 + Math.random() * 500);
  };
  const all = TOOLS.every(t => on[t.id] === 'ok');

  useEffect(() => {
    if (step !== 3) return;
    setRead(0);
    const ts = READ.map((_, i) => setTimeout(() => setRead(i + 1), 650 + i * 650));
    const end = setTimeout(() => { sounds.reveal(); setStep(4); }, 650 + READ.length * 650 + 500);
    return () => { ts.forEach(clearTimeout); clearTimeout(end); };
  }, [step]);

  const worth = useCount(step === 4 ? top.worth : 0, 1300);

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label="Set up Obavia">
      <div className="ob-in">
        <div className="ob-top">
          <div className="dots" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <i key={i} className={i === step ? 'on' : ''} />)}</div>
          {step > 0 && step < 3 && <button className="btn plain" onClick={() => setStep(s => s - 1)}>Back</button>}
        </div>

        {step === 0 && (
          <div className="ob-step" key="0">
            <img className="mark-lg" src="./mark.svg" alt="" />
            <h1>See where your sales leak.</h1>
            <p className="lede">Connect three tools. Obavia reads the last 30 days and shows you the one step costing you the most, in dollars.</p>
            <div style={{ flex: 1, minHeight: 40 }} />
            <div className="foot"><button className="btn primary block" onClick={next}>Get started</button></div>
          </div>
        )}

        {step === 1 && (
          <div className="ob-step" key="1">
            <h1>Connect what you already use.</h1>
            <p className="lede">Nothing new for your team to learn. They keep working the way they do.</p>
            <div className="group">
              {TOOLS.map(t => (
                <div key={t.id} className="cell conn">
                  <span className="ic"><Ic name={t.icon} size={21} /></span>
                  <div className="t"><b>{t.name}</b><small>{t.what}</small></div>
                  <div className="v">
                    {on[t.id] === 'ok' ? <span className="state ok"><Ic name="check" size={17} w={2.4} className="okc" />Connected</span>
                      : on[t.id] === 'wait' ? <span className="spin" aria-label="Connecting" />
                      : <button className="btn tinted sm" onClick={() => connect(t.id)}>Connect</button>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 40 }} />
            <div className="foot"><button className="btn primary block" disabled={!all} onClick={next}>Continue</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step" key="2">
            <h1>Two quick numbers.</h1>
            <p className="lede">So every leak is shown in your money, not a percentage.</p>
            <div className="group">
              <div className="field"><label htmlFor="ob-name">Agency</label><input id="ob-name" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="field"><label htmlFor="ob-deal">A won deal is worth</label>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, font: '700 20px var(--sans)' }}>$<input id="ob-deal" inputMode="numeric" value={deal} onChange={e => setDeal(e.target.value.replace(/[^\d,]/g, ''))} /></div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 40 }} />
            <div className="foot"><button className="btn primary block" disabled={!name.trim() || !deal} onClick={next}>Read my last 30 days</button></div>
          </div>
        )}

        {step === 3 && (
          <div className="ob-step" key="3">
            <h1>Reading your month.</h1>
            <p className="lede">Every lead, call, meeting and payment, lined up from first touch to cash.</p>
            <div className="group reading">
              {READ.map((r, i) => (
                <div key={r.what} className={'rl' + (read > i ? ' on' : '')}>
                  {read > i ? <Ic name="check" size={20} w={2.4} className="ic" /> : <span className="spin" />}
                  <span>{r.what[0].toUpperCase() + r.what.slice(1)}</span><b className="num">{int(r.n)}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="ob-step reveal" key="4">
            <p className="lede" style={{ margin: 0 }}>Your biggest leak</p>
            <div className="amt num">{k(worth)}<small>a month</small></div>
            <span className="where">{STEPS[top.step]} · {pct(top.pct)}</span>
            <p className="lede">Half of your booked calls never show up. That one step is worth more than every other fix combined.</p>
            <div style={{ flex: 1, minHeight: 40 }} />
            <div className="foot">
              <button className="btn primary block" onClick={() => done('leaks/' + top.step)}>Show me why</button>
              <button className="btn plain" onClick={() => done('overview')}>Go to my month</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
