/* Example lot and sales for the public preview. Clearly example data: no real
   buyer, dealer or VIN on a real title. */
import type { Sale, Vehicle } from './lib/sale';

export const EXAMPLE_LOT: Vehicle[] = [
  { id: 'v1', stock: '104', vin: '1HGCM82633A004352', year: 2016, make: 'Honda', model: 'Accord LX', bodyStyle: 'Sedan', price: 8900, mileage: 118400, emptyWeight: 3270, color: '#8E9AAF', titleStatus: 'clean' },
  { id: 'v2', stock: '107', vin: '2T1BURHE0JC000107', year: 2018, make: 'Toyota', model: 'Corolla LE', bodyStyle: 'Sedan', price: 10500, mileage: 96210, emptyWeight: 2860, color: '#E9ECF2', titleStatus: 'clean' },
  { id: 'v3', stock: '111', vin: '1GCVKREC0GZ000111', year: 2016, make: 'Chevrolet', model: 'Silverado 1500', bodyStyle: 'Truck', price: 16900, mileage: 142750, emptyWeight: null, color: '#3A4A6B', titleStatus: 'clean' },
  { id: 'v4', stock: '112', vin: '5N1AZ2MH4HN000112', year: 2017, make: 'Nissan', model: 'Murano SV', bodyStyle: 'SUV', price: 11200, mileage: 101300, emptyWeight: 3900, color: '#B04A4A', titleStatus: 'rebuilt_salvage' },
  { id: 'v5', stock: '115', vin: '3FA6P0H71HR000115', year: 2017, make: 'Ford', model: 'Fusion SE', bodyStyle: 'Sedan', price: 7400, mileage: 131020, emptyWeight: 3430, color: '#1F2530', titleStatus: 'clean' },
  { id: 'v6', stock: '118', vin: 'JTDKN3DU5F0000118', year: 2015, make: 'Toyota', model: 'Prius Two', bodyStyle: 'Hatchback', price: 5900, mileage: 168900, emptyWeight: 3042, color: '#7FA3C9', titleStatus: 'salvage_unrebuilt' },
];

export function exampleSales(): Sale[] {
  const v = { ...EXAMPLE_LOT[1] };
  return [{
    id: 'example-1', status: 'in_progress', language: 'en', vehicle: v,
    buyer: { fullName: 'Jordan Rivera', phone: '(555) 010-2231', address: '41 Example Lane', city: 'Pasadena', state: 'TX', zip: '77502', county: 'Harris', idType: 'dl', idNumber: '00000000' },
    step: { languageConfirmed: { by: 'desk', at: new Date().toISOString() }, funding: { type: 'cash' }, money: { amount: '10500' } },
    documents: {}, createdAt: new Date(Date.now() - 18 * 60e3).toISOString(),
  }];
}

/** City to county, for the dealer's state. County is asked only when this misses. */
export const TX_COUNTY: Record<string, string> = {
  houston: 'Harris', pasadena: 'Harris', baytown: 'Harris', humble: 'Harris', spring: 'Harris',
  'sugar land': 'Fort Bend', richmond: 'Fort Bend', 'missouri city': 'Fort Bend', pearland: 'Brazoria', 'league city': 'Galveston',
  conroe: 'Montgomery', 'the woodlands': 'Montgomery', dallas: 'Dallas', austin: 'Travis', 'san antonio': 'Bexar', 'fort worth': 'Tarrant',
};

export const LENDERS = [
  { id: 'chase', name: 'Chase Auto', kind: 'Bank' }, { id: 'capone', name: 'Capital One Auto', kind: 'Bank' },
  { id: 'wells', name: 'Wells Fargo Auto', kind: 'Bank' }, { id: 'txdow', name: 'Texas Dow Employees Credit Union', kind: 'Credit Union' },
  { id: 'randolph', name: 'Randolph-Brooks Federal Credit Union', kind: 'Credit Union' },
  { id: 'cudl', name: 'CUDL', kind: 'Aggregator' }, { id: 'westlake', name: 'Westlake Financial', kind: 'Dealer Capital' },
];
