/* One box finds anything: a name, a phone number, a VIN, a stock number or a
   receipt number. Dealers say finding an old deal is the worst part of their
   DMS; here it's typing what you remember. */
import type { Loan } from './loans';
import type { Sale, Vehicle } from './sale';

export type Hit = { kind: 'note' | 'sale' | 'car'; to: string; label: string; gloss: string; score: number };
const digits = (s: string) => s.replace(/\D/g, '');
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function find(q: string, loans: Loan[], sales: Sale[], lot: Vehicle[]): Hit[] {
  const text = norm(q.trim()), num = digits(q), words = text.split(/\s+/).filter(Boolean);
  if (!text) return [];
  const vinLike = /^[a-hj-npr-z0-9]{5,17}$/i.test(q.trim()) && /\d/.test(q) && /[a-z]/i.test(q);
  const nameHit = (n: string) => words.every(w => norm(n).split(/\s+/).some(p => p.startsWith(w)));
  const out: Hit[] = [];
  const carOf = (l: Loan) => sales.find(s => s.id === l.saleId)?.vehicle;

  for (const l of loans) {
    const v = carOf(l), stock = /Stock (\S+)/.exec(l.vehicle)?.[1] ?? v?.stock ?? '';
    let score = 0, why = '';
    if (nameHit(l.buyer.name)) { score = 3; why = l.vehicle; }
    else if (num.length >= 4 && digits(l.buyer.phone).includes(num)) { score = 3; why = l.buyer.phone; }
    else if (num && l.payments.some(p => String(p.receipt) === num)) { score = 4; why = `Receipt #${num}`; }
    else if (stock && norm(stock) === text) { score = 4; why = l.vehicle; }
    else if (vinLike && v?.vin && norm(v.vin).includes(text)) { score = 4; why = `VIN ${v.vin}`; }
    else if (words.length && words.every(w => norm(l.vehicle).includes(w))) { score = 2; why = l.vehicle; }
    if (score) out.push({ kind: 'note', to: `/payments/${l.id}`, label: l.buyer.name, gloss: why, score: score + 0.5 });
  }
  for (const s of sales) {
    if (loans.some(l => l.saleId === s.id)) continue;   // the note already stands for this sale
    const car = `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}`;
    const hit = nameHit(s.buyer.fullName || ' ') ? 3 : (num.length >= 4 && digits(s.buyer.phone).includes(num)) ? 3
      : norm(s.vehicle.stock) === text || (vinLike && norm(s.vehicle.vin).includes(text)) ? 4 : words.every(w => norm(car).includes(w)) ? 2 : 0;
    if (hit) out.push({ kind: 'sale', to: `/sale/${s.id}`, label: s.buyer.fullName || car, gloss: `${s.status === 'completed' ? 'Sold' : 'Sale in progress'} · ${car}`, score: hit });
  }
  for (const v of lot) {
    const car = `${v.year} ${v.make} ${v.model}`;
    const hit = norm(v.stock) === text || (vinLike && norm(v.vin).includes(text)) ? 4 : words.every(w => norm(car).includes(w)) ? 2 : 0;
    if (hit) out.push({ kind: 'car', to: `/new`, label: car, gloss: `On the lot · Stock ${v.stock}`, score: hit - 0.5 });
  }
  return out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 12);
}
