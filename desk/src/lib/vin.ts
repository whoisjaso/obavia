/* VIN validation and the NHTSA vPIC decode. A failed decode never blocks. */

export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
const VAL: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const WEIGHT = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export const isValidVin = (v: string) => VIN_RE.test(v.trim());

/** Position 9. A mismatch is a warning, never a block. */
export function checkDigitOk(vin: string): boolean {
  const v = vin.trim().toUpperCase();
  if (!VIN_RE.test(v)) return false;
  const sum = [...v].reduce((t, ch, i) => t + (/\d/.test(ch) ? Number(ch) : VAL[ch]) * WEIGHT[i], 0);
  const r = sum % 11;
  return v[8] === (r === 10 ? 'X' : String(r));
}

const UPPER = new Set(['BMW', 'GMC', 'RAM']);
const nil = (x?: string) => (!x || x === 'Not Applicable' ? null : x.trim() || null);

export type Decoded = { year: number | null; make: string | null; model: string | null; bodyStyle: string | null; drivetrain: string | null; engine: string | null; curbWeight: number | null };

export function normaliseDecode(r: Record<string, string>): Decoded {
  const make = nil(r.Make);
  const body = (nil(r.BodyClass) ?? '').toLowerCase();
  const bodyStyle = [['pickup', 'Truck'], ['truck', 'Truck'], ['van', 'Van'], ['sport utility', 'SUV'], ['crossover', 'Crossover'], ['convertible', 'Convertible'], ['coupe', 'Coupe'], ['wagon', 'Wagon'], ['hatchback', 'Hatchback'], ['sedan', 'Sedan']].find(([k]) => body.includes(k))?.[1] ?? null;
  const cyl = nil(r.EngineCylinders), disp = nil(r.DisplacementL);
  const weight = Number(nil(r.CurbWeightLB) ?? '');
  return {
    year: Number(nil(r.ModelYear)) || null,
    make: make ? (UPPER.has(make.toUpperCase()) ? make.toUpperCase() : make.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())) : null,
    model: [nil(r.Model), nil(r.Trim)].filter(Boolean).join(' ') || null,
    bodyStyle,
    drivetrain: (() => { const d = (nil(r.DriveType) ?? '').toUpperCase(); return ['AWD', '4WD', 'RWD', 'FWD', '2WD'].find(k => d.includes(k)) ?? null; })(),
    engine: disp && cyl ? `${Number(disp).toFixed(1)}L V${cyl}` : cyl ? `${cyl}-Cylinder` : null,
    curbWeight: weight > 0 ? weight : null,
  };
}

export async function decodeVin(vin: string, timeoutMs = 10000): Promise<Decoded | null> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, { signal: ctl.signal });
    const j = await res.json();
    return j?.Results?.[0] ? normaliseDecode(j.Results[0]) : null;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Trucks and vans only are asked the carrying capacity. */
export const asksCarryingCapacity = (bodyStyle?: string | null) => bodyStyle === 'Truck' || bodyStyle === 'Van';
