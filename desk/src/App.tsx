import { Ceremony, Packet } from './Packet';
import { Desk, GuideRedirect, Step } from './Corridor';
import { Onboarding } from './Onboarding';
import { Paper } from './Paper';
import { Past, Sales, Start } from './Sales';
import { Account, AccountPage, Needs, PaymentList, Payments, PaymentsMore, TakePayment, Today } from './Payments';
import { MatchList, MatchOne } from './Match';
import { CashTaken, CloseDay } from './Cash';
import { AutopaySetup, History } from './Autopay';
import { ConditionPage } from './Condition';
import { EveningText, Posted } from './Owner';
import { Channel, MarketplaceConsent, Reach, ReachGroup } from './Reach';
import { AddPerson, Lock, People } from './People';
import { PromiseSetup } from './Promise';
import { Extras } from './Extras';
import { PauseSetup } from './Pause';
import { Import } from './Import';
import { Facts } from './Facts';
import { TaxHome, TaxLines, TitlePage, Titles } from './Tax';
import { BuyerPreview, CreditPage, Find, InsuranceList, InsurancePage, NextCarList, NextCarOne } from './Care';
import type { DocType } from './lib/plan';
import { useEffect, useState } from 'react';
import { deskLocked, getSale, touchDesk, useStore } from './store';
import { useHash } from './ui';

export function App() {
  const { onboarded } = useStore();
  const h = useHash();
  const [, tick] = useState(0);
  useEffect(() => {   // every tap keeps the desk awake; a minute's check locks it once it sits idle
    const awake = () => touchDesk(), i = setInterval(() => tick(n => n + 1), 60_000);
    addEventListener('pointerdown', awake); addEventListener('keydown', awake);
    return () => { clearInterval(i); removeEventListener('pointerdown', awake); removeEventListener('keydown', awake); };
  }, []);
  if (!onboarded) return <Onboarding />;
  if (deskLocked()) return <Lock />;
  const [, a, id, b, c, d] = h.split('/');
  if (a === 'new') return <Start />;
  if (a === 'past') return <Past />;
  if (a === 'find') return <Find />;
  if (a === 'facts') return <Facts />;
  if (a === 'import') return <Import />;
  if (a === 'people') return id === 'add' ? <AddPerson /> : <People />;
  if (a === 'reach') return id === 'marketplace' ? <MarketplaceConsent /> : id === 'g' && b ? <ReachGroup key={b} group={b as 'phone'} /> : id ? <Channel id={id} /> : <Reach />;
  if (a === 'payments') {
    if (id === 'cash' && b) return <CashTaken key={b} id={b} />;
    if (id === 'close') return <CloseDay />;
    if (id === 'posted') return <Posted />;
    if (id === 'needs') return <Needs />;
    if (id === 'today') return <Today />;
    if (id === 'more') return <PaymentsMore />;
    if (id === 'evening') return <EveningText />;
    if (id === 'next') return <NextCarList />;
    if (id === 'insurance') return <InsuranceList />;
    if (id === 'credit') return <CreditPage />;
    if (id === 'tax') return b === 'titles' ? <Titles /> : b === 'lines' ? <TaxLines /> : <TaxHome />;
    if (id === 'match') return b ? <MatchOne key={b} id={decodeURIComponent(b)} /> : <MatchList />;
    if (id === 'list') return <PaymentList key={b} which={(b === 'late' || b === 'today' || b === 'watch' || b === 'promises' ? b : 'all')} />;
    if (id && b === 'autopay') return <AutopaySetup key={id} id={id} />;
    if (id && b === 'promise') return <PromiseSetup key={id} id={id} />;
    if (id && b === 'extras') return <Extras key={id} id={id} />;
    if (id && b === 'pause') return <PauseSetup key={id} id={id} />;
    if (id && b === 'condition') return <ConditionPage key={id} id={id} />;
    if (id && b === 'history') return <History key={id} id={id} />;
    if (id && b === 'title') return <TitlePage key={id} id={id} />;
    if (id && b === 'next') return <NextCarOne key={id} id={id} />;
    if (id && b === 'insurance') return <InsurancePage key={id} id={id} />;
    if (id && b === 'page') return <BuyerPreview key={id} id={id} />;
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
