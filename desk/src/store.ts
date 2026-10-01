/* The workspace: the dealer, the lot and the sales, kept in this browser for
   the preview. The backend (Supabase, per the SOP) replaces this module; the
   screens only call these functions. Writers merge ONE key of step_data. */
import { useSyncExternalStore } from 'react';
import { EXAMPLE_DEALER, type DealerConfig } from './lib/config';
import type { DocType } from './lib/plan';
import type { AgreementState, Buyer, Sale, StepData, Vehicle } from './lib/sale';
import { EXAMPLE_LOT, exampleSales } from './data';
import { MARKETPLACE_TERMS, termsHash, type Consent } from './lib/consent';
import { addDays, openLoan, takePayment, today, type Frequency, type Loan, type Method } from './lib/loans';
import { PER_YEAR } from './lib/paperwork';
import { parseMoney } from './lib/money';

type State = { dealer: DealerConfig; onboarded: boolean; example: boolean; lot: Vehicle[]; sales: Sale[]; consents?: Partial<Record<Consent['id'], Consent>>; loans?: Loan[]; receiptNo?: number; reachWanted?: string[] };
const KEY = 'obavia.desk.v1';

function fresh(): State { return { dealer: EXAMPLE_DEALER, onboarded: false, example: true, lot: EXAMPLE_LOT, sales: exampleSales(), loans: exampleLoans(EXAMPLE_DEALER.timeZone), receiptNo: 1000 }; }

/** Example in-house notes, dated from today so every state shows: due today, late, late with a charge, current, paid off. */
export function exampleLoans(tz: string): Loan[] {
  const t = today(tz);
  let r = 900;
  const mk = (id: string, name: string, phone: string, vehicle: string, principal: number, apr: number, count: number, f: Frequency, firstDue: string, paid: [number, number][]) => {
    let l = openLoan({ id, buyer: { name, phone }, vehicle, principalCents: principal, apr, count, frequency: f, firstDue, openedOn: addDays(firstDue, -7) });
    for (const [dayOffset, cents] of paid) l = takePayment(l, { on: addDays(firstDue, dayOffset), cents: cents || l.paymentCents, method: 'cash' }, ++r);
    return l;
  };
  return [
    mk('ex-due', 'Jordan Rivera', '(555) 010-2231', '2018 Toyota Corolla LE · Stock 107', 720000, 19.9, 104, 'weekly', addDays(t, -21), [[0, 0], [7, 0], [14, 0]]),
    mk('ex-late', 'Dana Example', '(555) 010-4410', '2016 Chevrolet Silverado 1500 · Stock 111', 1150000, 21, 52, 'biweekly', addDays(t, -37), [[0, 0], [14, 0]]),
    mk('ex-fee', 'Chris Sample', '(555) 010-9032', '2017 Nissan Murano SV · Stock 112', 840000, 18, 36, 'monthly', addDays(t, -79), [[0, 0], [31, 0]]),
    mk('ex-current', 'Alex Placeholder', '(555) 010-1187', '2017 Ford Fusion SE · Stock 115', 560000, 17.5, 78, 'weekly', addDays(t, -12), [[0, 0], [7, 0], [9, 0]]),
  ];
}
function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s: State = JSON.parse(raw); if (!s.loans && s.example) s.loans = exampleLoans(s.dealer.timeZone); return s; }
  } catch { /* private mode */ }
  return fresh();
}

let state = load();
const subs = new Set<() => void>();
function set(next: State) { state = next; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } subs.forEach(f => f()); }

export const useStore = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state);
export const getSale = (id: string) => state.sales.find(s => s.id === id);

export function finishOnboarding(dealer: DealerConfig, lot?: Vehicle[]) { set({ ...state, dealer, onboarded: true, lot: lot ?? state.lot }); }
export function resetWorkspace() { set(fresh()); }

const patchSale = (id: string, f: (s: Sale) => Sale) => set({ ...state, sales: state.sales.map(s => (s.id === id ? f(s) : s)) });

/** Merge ONE key of step_data; never send the whole blob back. */
export function mergeStep<K extends keyof StepData>(id: string, key: K, value: StepData[K]) {
  patchSale(id, s => ({ ...s, step: { ...s.step, [key]: value } }));
}
export function setLanguage(id: string, language: 'en' | 'es') {
  patchSale(id, s => ({ ...s, language, step: { ...s.step, languageConfirmed: { by: 'desk', at: new Date().toISOString() } } }));
}
export function setBuyer(id: string, buyer: Buyer) { patchSale(id, s => ({ ...s, buyer })); }
export function setVehicleTitle(vehicleId: string, titleStatus: Vehicle['titleStatus']) {
  set({ ...state, lot: state.lot.map(v => (v.id === vehicleId ? { ...v, titleStatus } : v)), sales: state.sales.map(s => (s.vehicle.id === vehicleId ? { ...s, vehicle: { ...s.vehicle, titleStatus } } : s)) });
}
export function fileDocument(id: string, doc: DocType, agreement: AgreementState) {
  patchSale(id, s => ({ ...s, documents: { ...s.documents, [doc]: { ...s.documents[doc], ...agreement } } }));
}

export function startSale(v: Vehicle, buyer: Buyer, language: 'en' | 'es', mileage: number, titleStatus: Vehicle['titleStatus']): string {
  const id = 's' + Date.now().toString(36);
  const vehicle = { ...v, mileage, titleStatus };
  const sale: Sale = {
    id, status: 'in_progress', language, vehicle, buyer, documents: {}, createdAt: new Date().toISOString(),
    step: { languageConfirmed: { by: 'desk', at: new Date().toISOString() }, saleClock: { startedAt: new Date().toISOString() } },
  };
  set({ ...state, lot: state.lot.map(x => (x.id === v.id ? vehicle : x)), sales: [sale, ...state.sales] });
  return id;
}
export function completeSale(id: string) {
  const s = getSale(id); if (!s) return;
  set({ ...state, lot: state.lot.filter(v => v.id !== s.vehicle.id), sales: state.sales.map(x => (x.id === id ? { ...x, status: 'completed', completedAt: new Date().toISOString() } : x)) });
}
export function addVehicle(v: Vehicle) { set({ ...state, lot: [v, ...state.lot] }); }

/* ---------- in-house notes (buy here pay here) ---------- */
export const getLoans = () => state.loans ?? [];
/** Record a payment and hand back its receipt number. */
export function recordPayment(loanId: string, cents: number, method: Method, on: string): number {
  const receipt = (state.receiptNo ?? 1000) + 1;
  set({ ...state, receiptNo: receipt, loans: getLoans().map(l => (l.id === loanId ? takePayment(l, { on, cents, method }, receipt) : l)) });
  return receipt;
}
export function setReminders(loanId: string, on: boolean) { set({ ...state, loans: getLoans().map(l => (l.id === loanId ? { ...l, remindersOn: on } : l)) }); }
/** When an in-house sale completes, its note opens from the financing answers. */
function loanFromSale(s: Sale, total: number): Loan | null {
  if (s.step.funding?.type !== 'inHouse') return null;
  const f = s.step.paperwork?.financing ?? {};
  const freq = (f.frequency in PER_YEAR ? f.frequency : 'monthly') as Frequency;
  const down = parseMoney(f.down) ?? 0, count = Number(f.count) || 0, apr = Number(f.rate) || 0;
  if (!count || !f.firstDue || total - down <= 0) return null;
  return openLoan({ id: 'n' + s.id, saleId: s.id, buyer: { name: s.buyer.fullName, phone: s.buyer.phone }, vehicle: `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}${s.vehicle.stock ? ` · Stock ${s.vehicle.stock}` : ''}`,
    principalCents: Math.round((total - down) * 100), apr, count, frequency: freq, firstDue: f.firstDue, openedOn: today(state.dealer.timeZone) });
}
export function openNoteForSale(id: string, total: number) {
  const s = getSale(id); if (!s || getLoans().some(l => l.saleId === id)) return;
  const l = loanFromSale(s, total); if (l) set({ ...state, loans: [l, ...getLoans()] });
}
/** Reach: channels the dealer wants switched on when they're ready. */
export function toggleReachWanted(id: string) {
  const w = new Set(state.reachWanted ?? []); w.has(id) ? w.delete(id) : w.add(id);
  set({ ...state, reachWanted: [...w] });
}

/** Record that the dealer accepted the Marketplace terms on screen now. */
export function acceptMarketplace(name: string) {
  const c: Consent = { id: 'marketplace', version: MARKETPLACE_TERMS.version, hash: termsHash(MARKETPLACE_TERMS), name: name.trim(), licence: state.dealer.licence, at: new Date().toISOString(), timeZone: state.dealer.timeZone };
  set({ ...state, consents: { ...state.consents, marketplace: c } });
}
/** Withdrawing consent switches the feature off. */
export function withdrawMarketplace() { const { marketplace: _, ...rest } = state.consents ?? {}; set({ ...state, consents: rest }); }
