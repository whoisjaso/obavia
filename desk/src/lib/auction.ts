/* The Desk's side of the auction: the Worker's dealer routes, the dealer's
   key, which cars are on the lane, and the arithmetic the Floor screen shows.
   With no VITE_AUCTION_API the module is inert and every call says so. */
import type { DealerConfig } from './config';
import type { Vehicle } from './sale';

export const AUCTION_API = (import.meta.env.VITE_AUCTION_API ?? '').replace(/\/$/, '');
export const auctionLive = !!AUCTION_API;

const KEY = 'obavia.desk.auction.key';
const LOTS = 'obavia.desk.auction.lots';
export const dealerKey = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (k: string) => { try { localStorage.setItem(KEY, k.trim()); } catch { /* private mode */ } },
};

/** The lane as the Desk remembers it: one lot per car it let go. */
export type LotLink = { lotId: string; vehicleId: string; openedAt: string; closesAt: number; floor: number; days: number };
export function lotLinks(): LotLink[] { try { return JSON.parse(localStorage.getItem(LOTS) ?? '[]'); } catch { return []; } }
export function rememberLot(l: LotLink) { const all = lotLinks().filter(x => x.lotId !== l.lotId); try { localStorage.setItem(LOTS, JSON.stringify([l, ...all])); } catch { /* ignore */ } }

/* ---------- what the Worker holds ---------- */
export type RemotePhoto = { url: string; w: number; h: number };
export type CarMeta = {
  year: number; make: string; model: string; miles: number; vin: string;
  photos: RemotePhoto[];
  grade: [number, number, number, number, number, number];
  title: 'in hand' | 'at lender';
  dealer: { name: string; city: string; street: string; gdn: string; phone: string; afterHours: string; fees: { taxRate: number; title: number; registration: number; doc: number } };
  documents?: { guide?: string; bill?: string; title?: string };
  hours?: string[];
};
export type Lot = {
  id: string; start: number; retail: number; opensAt: number; closesAt: number;
  high: number; leader?: string; bids: number; watching: number;
  closed?: { at: number; sold: boolean };
  car?: CarMeta;
  sale?: { buyer: string; hammer: number; wonAt: number; deadlineAt: number; paidAt?: number; startedAt?: number; forfeitedAt?: number };
};

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
async function call<T>(method: string, path: string, body?: BodyInit | object, type?: string): Promise<Result<T>> {
  const key = dealerKey.get();
  if (!auctionLive) return { ok: false, reason: 'offline' };
  if (!key) return { ok: false, reason: 'no key' };
  try {
    const isJson = body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body === 'object';
    const r = await fetch(`${AUCTION_API}${path}`, { method, headers: { Authorization: `Bearer ${key}`, ...(type ? { 'Content-Type': type } : isJson ? { 'Content-Type': 'application/json' } : {}) }, body: isJson ? JSON.stringify(body) : (body as BodyInit | undefined) });
    if (!r.ok) return { ok: false, reason: (await r.text()) || `http ${r.status}` };
    return { ok: true, value: await r.json() as T };
  } catch { return { ok: false, reason: 'offline' }; }
}

export const lotId = (v: Vehicle) => `${v.vin.slice(-8).toLowerCase()}-${Date.now().toString(36).slice(-4)}`;

/** Photos first (so the lane photo exists at Go), then the lot opens with them. */
export const putPhoto = (lot: string, n: number, blob: Blob) => call<{ url: string }>('PUT', `/lots/${lot}/photos/${n}.jpg`, blob, 'image/jpeg');
export const putDocument = (lot: string, name: string, pdf: Uint8Array) => call<{ url: string }>('PUT', `/lots/${lot}/documents/${name}.pdf`, new Blob([pdf.slice()], { type: 'application/pdf' }), 'application/pdf');
export const openLot = (lot: string, body: { id: string; dealer: string; start: number; retail: number; closesAt: number; car: CarMeta }) => call<Lot>('POST', `/lots/${lot}/open`, body);
export const updateCar = (lot: string, patch: Partial<CarMeta>) => call<Lot>('POST', `/lots/${lot}/car`, patch);
export const closeLot = (lot: string) => call<Lot>('POST', `/lots/${lot}/close`, {});
export const markPaid = (lot: string) => call<Lot>('POST', `/lots/${lot}/paid`, {});
export const pickup = (lot: string, vin: string) => call<Lot>('POST', `/lots/${lot}/pickup`, { vin });
export async function getLot(lot: string): Promise<Result<Lot>> {
  if (!auctionLive) return { ok: false, reason: 'offline' };
  try { const r = await fetch(`${AUCTION_API}/lots/${lot}`); return r.ok ? { ok: true, value: await r.json() as Lot } : { ok: false, reason: `http ${r.status}` }; } catch { return { ok: false, reason: 'offline' }; }
}

/** The live lane over the Worker's socket; falls back to polling every 3 s. */
export function watchLot(lot: string, onLot: (l: Lot) => void): () => void {
  if (!auctionLive) return () => {};
  let ws: WebSocket | undefined, timer: ReturnType<typeof setInterval> | undefined, stopped = false;
  const key = dealerKey.get();
  try {
    ws = new WebSocket(`${AUCTION_API.replace(/^http/, 'ws')}/lots/${lot}/live?token=${encodeURIComponent(key ?? '')}`);
    ws.onmessage = m => { try { const e = JSON.parse(String(m.data)); if (e.lot) onLot(e.lot); } catch { /* ignore */ } };
    ws.onerror = () => { ws?.close(); };
  } catch { /* fall through to polling */ }
  timer = setInterval(async () => { if (stopped) return; const r = await getLot(lot); if (r.ok) onLot(r.value); }, 3000);
  return () => { stopped = true; ws?.close(); if (timer) clearInterval(timer); };
}

/* ---------- the Floor's arithmetic ---------- */
/** What the lane would likely pay: a band under retail, narrowed by condition. An estimate until the lane has its own history. */
export function wholesaleBand(retail: number, grade: number[]): { low: number; high: number } {
  const g = grade.reduce((a, b) => a + b, 0) / Math.max(1, grade.length);   // 0..1
  const mid = retail * (0.62 + 0.16 * g);
  return { low: Math.round(mid * 0.94 / 50) * 50, high: Math.round(mid * 1.06 / 50) * 50 };
}
/** Every week on the lot costs: floorplan interest, insurance, the space. $35 a day is the industry's round number; the dealer's own figure replaces it. */
export const holdingCost = (days: number, perDay = 35) => days * perDay;
/** The floor is the net the dealer walks away with; the hammer the buyer sees is the floor plus nothing (zero premium). */
export function youGetYouBring(floor: number, payoff: number) {
  const net = floor - payoff;
  return net >= 0 ? { get: net, bring: 0 } : { get: 0, bring: -net };
}

/** The car as the lane needs it, from the Desk's vehicle and dealer. */
export function carMeta(v: Vehicle, dealer: DealerConfig, photos: RemotePhoto[], grade: CarMeta['grade'], title: CarMeta['title'], afterHours: string, hours: string[]): CarMeta {
  return {
    year: v.year, make: v.make, model: v.model, miles: v.mileage ?? 0, vin: v.vin, photos, grade, title,
    dealer: { name: dealer.dba || dealer.legalName, city: dealer.city, street: `${dealer.street}, ${dealer.city}, ${dealer.state} ${dealer.zip}`, gdn: dealer.licence, phone: dealer.phone, afterHours: afterHours || dealer.phone, fees: dealer.fees },
    hours,
  };
}
