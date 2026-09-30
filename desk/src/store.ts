/* The workspace: the dealer, the lot and the sales, kept in this browser for
   the preview. The backend (Supabase, per the SOP) replaces this module; the
   screens only call these functions. Writers merge ONE key of step_data. */
import { useSyncExternalStore } from 'react';
import { EXAMPLE_DEALER, type DealerConfig } from './lib/config';
import type { DocType } from './lib/plan';
import type { AgreementState, Buyer, Sale, StepData, Vehicle } from './lib/sale';
import { EXAMPLE_LOT, exampleSales } from './data';
import { MARKETPLACE_TERMS, termsHash, type Consent } from './lib/consent';

type State = { dealer: DealerConfig; onboarded: boolean; example: boolean; lot: Vehicle[]; sales: Sale[]; consents?: Partial<Record<Consent['id'], Consent>> };
const KEY = 'obavia.desk.v1';

function fresh(): State { return { dealer: EXAMPLE_DEALER, onboarded: false, example: true, lot: EXAMPLE_LOT, sales: exampleSales() }; }
function load(): State { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* private mode */ } return fresh(); }

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

/** Record that the dealer accepted the Marketplace terms on screen now. */
export function acceptMarketplace(name: string) {
  const c: Consent = { id: 'marketplace', version: MARKETPLACE_TERMS.version, hash: termsHash(MARKETPLACE_TERMS), name: name.trim(), licence: state.dealer.licence, at: new Date().toISOString(), timeZone: state.dealer.timeZone };
  set({ ...state, consents: { ...state.consents, marketplace: c } });
}
/** Withdrawing consent switches the feature off. */
export function withdrawMarketplace() { const { marketplace: _, ...rest } = state.consents ?? {}; set({ ...state, consents: rest }); }
