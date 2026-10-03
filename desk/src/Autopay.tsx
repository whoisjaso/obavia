/* Autopay, page by page: how they'll pay, the card or account, which day,
   then they sign. And the account's history, where on-purpose shows red. */
import { useState } from 'react';
import { WEEKDAY, abaOk, authorization, checkCard, paydayHint, signal, timeline, type Funding, type OnFile } from './lib/autopay';
import { money, today, type Lang } from './lib/loans';
import { first, nice } from './Payments';
import { autopayOff, setAutopay, setPayday, useStore } from './store';
import { Back, Ic, feel, go, transition } from './ui';

const brandOf = (n: string) => /^4/.test(n) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : /^6/.test(n) ? 'Discover' : 'Card';
/** Preview only: the processor reports funding type when the card is saved. These are the processors' published test cards. */
const PREVIEW_FUNDING: Record<string, Funding> = { '4242424242424242': 'credit', '5555555555554444': 'credit', '5105105105105100': 'prepaid', '4000056655665556': 'debit', '5200828282828210': 'debit' };
export const methodText = (m: OnFile) => m.kind === 'card' ? `${m.brand} ending ${m.last4}` : `${m.bank ?? 'Bank'} ending ${m.last4}`;
const NO: Record<string, [string, string]> = {
  invalid: ['Check The Number.', 'That card number isn’t valid.'],
  expired: ['Card Expired.', 'Use a card that hasn’t expired.'],
  prepaid: ['No Prepaid Cards.', 'Use a bank debit card or a bank account.'],
  credit: ['Use A Debit Card.', 'Car payments can’t go on a credit card.'],
  blocked: ['Use Another Card.', 'This card’s bank isn’t accepted here.'],
};

type Step = 'how' | 'card' | 'bank' | 'no' | 'day' | 'sign' | 'done';
export function AutopaySetup({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  const t = today(dealer.timeZone);
  const [step, setStep] = useState<Step>(l?.autopay?.on ? 'done' : 'how');
  const [trail, setTrail] = useState<Step[]>([]);
  const [num, setNum] = useState(''), [exp, setExp] = useState(''), [routing, setRouting] = useState(''), [acct, setAcct] = useState('');
  const [why, setWhy] = useState('');
  const [method, setMethod] = useState<OnFile | null>(null);
  const [payday, setPd] = useState<number | undefined>(l?.autopay?.payday);
  const [name, setName] = useState('');
  const [lang, setLang] = useState<Lang>(l?.language ?? 'en');
  if (!l) { go('/payments'); return null; }
  const to = (s: Step) => transition(() => { setTrail(x => [...x, step]); setStep(s); scrollTo(0, 0); });
  const back = () => transition(() => { setStep(trail[trail.length - 1] ?? 'how'); setTrail(x => x.slice(0, -1)); }, 'back');
  const top = <div className="top">{trail.length && step !== 'done' ? <button className="back" onClick={() => { feel.tap(); back(); }}><Ic n="chev" s={18} w={2.4} />Back</button> : <Back to={`#/payments/${l.id}`} label={first(l.buyer.name)} />}</div>;
  const digits = num.replace(/\D/g, '');

  const saveCard = () => {
    const funding = PREVIEW_FUNDING[digits] ?? 'debit';
    const v = checkCard({ number: digits, exp, funding }, t);
    if (!v.ok) { setWhy(v.why); feel.tap(); return to('no'); }
    setMethod({ kind: 'card', brand: brandOf(digits), last4: digits.slice(-4), funding, exp }); feel.next(); to('day');
  };
  const saveBank = () => { setMethod({ kind: 'bank', last4: acct.slice(-4), routing }); feel.next(); to('day'); };
  const sign = () => { feel.done(); setAutopay(l.id, method!, payday, name.trim(), t, lang); setTrail([]); transition(() => setStep('done')); };

  return (
    <main className="wrap center">{top}
      {step === 'how' && <section className="enter" key="how">
        <h1 className="q">Pay Automatically?</h1>
        <div className="choices">
          <button className="choice" onClick={() => { feel.next(); to('card'); }}><span className="art"><Ic n="cash" s={24} /></span><span className="t"><b>Debit Card</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
          <button className="choice" onClick={() => { feel.next(); to('bank'); }}><span className="art"><Ic n="bank" s={24} /></span><span className="t"><b>Bank Account</b></span><span className="go"><Ic n="chev" s={18} w={2.4} /></span></button>
          <a className="choice" href={`#/payments/${l.id}`} onClick={feel.tap}><span className="t"><b>Not Now</b><small>Autopay is their choice</small></span></a>
        </div>
      </section>}

      {step === 'card' && <section className="enter" key="card">
        <h1 className="q">Their Debit Card.</h1>
        <div className="field"><input className="input num" inputMode="numeric" autoComplete="cc-number" autoFocus placeholder="Card number" value={num} onChange={e => setNum(e.target.value.replace(/[^\d ]/g, '').slice(0, 23))} aria-label="Card number" /></div>
        <div className="field"><input className="input num" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={exp} onChange={e => setExp(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))} aria-label="Expiry" /></div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={digits.length < 12 || exp.length < 5} onClick={saveCard}>Check The Card</button></div></div>
      </section>}

      {step === 'bank' && <section className="enter" key="bank">
        <h1 className="q">Their Bank Account.</h1>
        <div className="field"><input className="input num" inputMode="numeric" autoFocus placeholder="Routing number" value={routing} onChange={e => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))} aria-label="Routing number" /></div>
        <div className="field"><input className="input num" inputMode="numeric" placeholder="Account number" value={acct} onChange={e => setAcct(e.target.value.replace(/\D/g, '').slice(0, 17))} aria-label="Account number" /></div>
        {routing.length === 9 && !abaOk(routing) && <p className="note bad">That routing number isn’t valid.</p>}
        <div className="dock"><div className="in"><button className="btn primary block" disabled={!abaOk(routing) || acct.length < 4} onClick={saveBank}>Continue</button></div></div>
      </section>}

      {step === 'no' && <section className="enter" key="no">
        <span className="done-mark pop bad"><b className="bang">!</b></span>
        <h1 className="q">{NO[why]?.[0]}</h1>
        <p className="note">{NO[why]?.[1]}</p>
        <div className="dock"><div className="in"><button className="btn primary block" onClick={() => { feel.tap(); setNum(''); setExp(''); back(); }}>Try Another Card</button>
          <button className="textlink" onClick={() => { feel.tap(); transition(() => { setTrail([]); setStep('bank'); scrollTo(0, 0); }); }}>Use A Bank Account</button></div></div>
      </section>}

      {step === 'day' && <section className="enter" key="day">
        <h1 className="q">When Do They Get Paid?</h1>
        <div className="choices grid2">
          {[5, 4, 3, 1].map(d => <button key={d} className="choice" aria-pressed={payday === d} onClick={() => { feel.tap(); setPd(d); }}><span className="t"><b>{WEEKDAY[d]}</b></span>{payday === d && <span className="tick"><Ic n="check" s={16} w={3} /></span>}</button>)}
        </div>
        <button className="textlink" onClick={() => { feel.tap(); setPd(undefined); to('sign'); }}>Charge On Each Due Date</button>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={payday === undefined} onClick={() => { feel.next(); to('sign'); }}>Continue</button></div></div>
      </section>}

      {step === 'sign' && method && <section className="enter" key="sign">
        <h1 className="q">{first(l.buyer.name)} Signs.</h1>
        <p className="auth" lang={lang}>{authorization(dealer.legalName || dealer.dba, dealer.phone || (lang === 'es' ? 'el concesionario' : 'the dealership'), l, method, payday, lang)}</p>
        <button className="textlink" onClick={() => { feel.tap(); setLang(lang === 'es' ? 'en' : 'es'); }}>{lang === 'es' ? 'Read It In English' : 'Léalo En Español'}</button>
        <div className="field"><input className="input" autoComplete="off" placeholder={lang === 'es' ? 'Su nombre completo' : 'Their full name'} value={name} onChange={e => setName(e.target.value)} aria-label="Signature" /></div>
        <div className="dock"><div className="in"><button className="btn primary block" disabled={name.trim().split(/\s+/).length < 2} onClick={sign}>Turn On Autopay</button></div></div>
      </section>}

      {step === 'done' && l.autopay?.method && <section className="enter" key="done">
        <span className="done-mark pop"><Ic n="check" s={38} w={3} /></span>
        <h1 className="q">{l.autopay.on ? 'Autopay On.' : 'Autopay Off.'}</h1>
        <p className="note">{methodText(l.autopay.method)} · {l.autopay.payday === undefined ? 'each due date' : `${WEEKDAY[l.autopay.payday]}s`} · {money(l.paymentCents)}</p>
        {l.autopay.signedOn === t && <p className="note">Signed copy texted to {first(l.buyer.name)}</p>}
        <div className="dock"><div className="in">
          <button className="btn primary block" onClick={() => { feel.done(); go(`/payments/${l.id}`); }}>Done</button>
          <button className="textlink" onClick={() => { feel.tap(); transition(() => { setTrail([]); setNum(''); setExp(''); setName(''); setStep('how'); scrollTo(0, 0); }, 'back'); }}>Change The Card</button>
          {l.autopay.on && <button className="textlink" onClick={() => { feel.tap(); autopayOff(l.id, t); }}>Turn Off</button>}
        </div></div>
      </section>}
    </main>
  );
}

export function History({ id }: { id: string }) {
  const { dealer, loans = [] } = useStore();
  const l = loans.find(x => x.id === id);
  if (!l) { go('/payments'); return null; }
  const t = today(dealer.timeZone), sig = signal(l, t), hint = paydayHint(l);
  const dot = { good: 'good', amber: 'warn', red: 'late', none: '' } as const;
  return (
    <main className="wrap center">
      <div className="top"><Back to={`#/payments/${l.id}`} label={first(l.buyer.name)} /></div>
      <section className="enter" key="hist">
        <h1 className="q">{sig.tone === 'red' ? <>Stopped <em>on purpose.</em></> : sig.tone === 'amber' ? <>Running <em>short.</em></> : <>The <em>history.</em></>}</h1>
        {sig.tone !== 'none' && <p className="note">{sig.headline}</p>}
        {hint !== undefined && <div className="choices"><button className="choice" onClick={() => { feel.done(); setPayday(l.id, hint); }}><span className="art"><Ic n="sparkle" s={22} /></span><span className="t"><b>Charge On {WEEKDAY[hint]}s</b><small>They always pay on {WEEKDAY[hint]}</small></span></button></div>}
        <div className="list-plain timeline">
          {timeline(l).map((m, i) => <div key={i}><b>{nice(m.on)}</b><span><i className={`dot ${dot[m.tone]}`} aria-hidden="true" />{m.text}</span><small className="num">{m.cents ? money(m.cents) : ''}</small></div>)}
        </div>
      </section>
    </main>
  );
}

