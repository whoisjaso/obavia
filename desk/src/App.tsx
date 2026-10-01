import { Ceremony, Packet } from './Packet';
import { Desk, GuideRedirect, Step } from './Corridor';
import { Onboarding } from './Onboarding';
import { Paper } from './Paper';
import { Past, Sales, Start } from './Sales';
import { Account, AccountPage, PaymentList, Payments, TakePayment } from './Payments';
import { MatchList, MatchOne } from './Match';
import { CashTaken, CloseDay } from './Cash';
import { AutopaySetup, History } from './Autopay';
import { ConditionPage } from './Condition';
import { Channel, MarketplaceConsent, Reach, ReachGroup } from './Reach';
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
  if (a === 'reach') return id === 'marketplace' ? <MarketplaceConsent /> : id === 'g' && b ? <ReachGroup key={b} group={b as 'phone'} /> : id ? <Channel id={id} /> : <Reach />;
  if (a === 'payments') {
    if (id === 'cash' && b) return <CashTaken key={b} id={b} />;
    if (id === 'close') return <CloseDay />;
    if (id === 'match') return b ? <MatchOne key={b} id={decodeURIComponent(b)} /> : <MatchList />;
    if (id === 'list') return <PaymentList key={b} which={(b === 'late' || b === 'today' || b === 'watch' ? b : 'all')} />;
    if (id && b === 'autopay') return <AutopaySetup key={id} id={id} />;
    if (id && b === 'condition') return <ConditionPage key={id} id={id} />;
    if (id && b === 'history') return <History key={id} id={id} />;
    if (id && b === 'pay') return <TakePayment key={id} id={id} />;
    if (id && b) return <AccountPage key={`${id}/${b}`} id={id} page={b} />;
    return id ? <Account key={id} id={id} /> : <Payments />;
  }
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
