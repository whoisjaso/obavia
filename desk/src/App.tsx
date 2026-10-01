import { Ceremony, Packet } from './Packet';
import { Desk, GuideRedirect, Step } from './Corridor';
import { Onboarding } from './Onboarding';
import { Paper } from './Paper';
import { Past, Sales, Start } from './Sales';
import { Account, Payments, TakePayment } from './Payments';
import { Channel, MarketplaceConsent, Reach } from './Reach';
import type { DocType } from './lib/plan';
import { getSale, useStore } from './store';
import { useHash } from './ui';

export function App() {
  const { onboarded } = useStore();
  const h = useHash();
  if (!onboarded) return <Onboarding />;
  const [, a, id, b, c, d] = h.split('/');
  if (a === 'new') return <Start />;
  if (a === 'past') return <Past />;
  if (a === 'reach') return id === 'marketplace' ? <MarketplaceConsent /> : id ? <Channel id={id} /> : <Reach />;
  if (a === 'payments') return id && b === 'pay' ? <TakePayment key={id} id={id} /> : id ? <Account key={id} id={id} /> : <Payments />;
  if ((a === 'sale' || a === 'sign') && id && !getSale(id)) return <Sales />;
  if (a === 'sign') return <Ceremony id={id} />;
  if (a === 'sale') {
    if (b === 'guide' && c) return <Step key={c} id={id} stepKey={decodeURIComponent(c)} />;
    if (b === 'guide') return <GuideRedirect id={id} />;
    if (b === 'paper' && c) return <Paper key={`${c}/${d ?? ''}`} id={id} doc={c as DocType} q={d && d !== 'review' ? d : undefined} />;
    if (b === 'packet') return <Packet id={id} />;
    return <Desk id={id} />;
  }
  return <Sales />;
}
