// Seeded market estimates for the Houston area. These are ESTIMATE ranges
// used until a real listing or market feed exists. Every card built from
// this table must say "estimate" and "not a live listing".

export interface MarketEntry {
  id: string;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  body: "sedan" | "suv" | "truck" | "ev" | "hatch" | "coupe" | "minivan";
  priceLow: number; // typical asking, used, good condition
  priceHigh: number;
  aliases: string[];
  note?: string;
}

export const MARKET: MarketEntry[] = [
  { id: "tesla-model-3", make: "Tesla", model: "Model 3", yearFrom: 2019, yearTo: 2023, body: "ev", priceLow: 19500, priceHigh: 32000, aliases: ["model 3", "model three", "tesla 3"] },
  { id: "tesla-model-y", make: "Tesla", model: "Model Y", yearFrom: 2020, yearTo: 2023, body: "ev", priceLow: 24000, priceHigh: 37000, aliases: ["model y"] },
  { id: "tesla-model-s", make: "Tesla", model: "Model S", yearFrom: 2016, yearTo: 2021, body: "ev", priceLow: 22000, priceHigh: 48000, aliases: ["model s"] },
  { id: "tesla-model-x", make: "Tesla", model: "Model X", yearFrom: 2016, yearTo: 2021, body: "ev", priceLow: 30000, priceHigh: 55000, aliases: ["model x"] },
  { id: "toyota-camry", make: "Toyota", model: "Camry", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 14000, priceHigh: 27000, aliases: ["camry"] },
  { id: "toyota-corolla", make: "Toyota", model: "Corolla", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 12000, priceHigh: 22000, aliases: ["corolla"] },
  { id: "toyota-rav4", make: "Toyota", model: "RAV4", yearFrom: 2017, yearTo: 2023, body: "suv", priceLow: 17000, priceHigh: 31000, aliases: ["rav4", "rav 4"] },
  { id: "toyota-tacoma", make: "Toyota", model: "Tacoma", yearFrom: 2016, yearTo: 2023, body: "truck", priceLow: 19000, priceHigh: 36000, aliases: ["tacoma"] },
  { id: "honda-civic", make: "Honda", model: "Civic", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 13000, priceHigh: 25000, aliases: ["civic"] },
  { id: "honda-accord", make: "Honda", model: "Accord", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 15000, priceHigh: 28000, aliases: ["accord"] },
  { id: "honda-crv", make: "Honda", model: "CR-V", yearFrom: 2017, yearTo: 2023, body: "suv", priceLow: 16000, priceHigh: 30000, aliases: ["cr-v", "crv"] },
  { id: "nissan-altima", make: "Nissan", model: "Altima", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 10000, priceHigh: 22000, aliases: ["altima"] },
  { id: "nissan-rogue", make: "Nissan", model: "Rogue", yearFrom: 2017, yearTo: 2023, body: "suv", priceLow: 12000, priceHigh: 25000, aliases: ["rogue"] },
  { id: "hyundai-elantra", make: "Hyundai", model: "Elantra", yearFrom: 2018, yearTo: 2023, body: "sedan", priceLow: 10500, priceHigh: 21000, aliases: ["elantra"] },
  { id: "hyundai-sonata", make: "Hyundai", model: "Sonata", yearFrom: 2018, yearTo: 2023, body: "sedan", priceLow: 12000, priceHigh: 24000, aliases: ["sonata"] },
  { id: "kia-optima-k5", make: "Kia", model: "K5", yearFrom: 2021, yearTo: 2023, body: "sedan", priceLow: 17000, priceHigh: 27000, aliases: ["k5", "optima"] },
  { id: "ford-f150", make: "Ford", model: "F-150", yearFrom: 2016, yearTo: 2023, body: "truck", priceLow: 17000, priceHigh: 42000, aliases: ["f150", "f-150", "f 150"] },
  { id: "ford-explorer", make: "Ford", model: "Explorer", yearFrom: 2017, yearTo: 2023, body: "suv", priceLow: 15000, priceHigh: 34000, aliases: ["explorer"] },
  { id: "chevy-silverado", make: "Chevrolet", model: "Silverado 1500", yearFrom: 2016, yearTo: 2023, body: "truck", priceLow: 17000, priceHigh: 42000, aliases: ["silverado", "chevy truck"] },
  { id: "chevy-malibu", make: "Chevrolet", model: "Malibu", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 10000, priceHigh: 21000, aliases: ["malibu"] },
  { id: "chevy-equinox", make: "Chevrolet", model: "Equinox", yearFrom: 2018, yearTo: 2023, body: "suv", priceLow: 12000, priceHigh: 24000, aliases: ["equinox"] },
  { id: "ram-1500", make: "Ram", model: "1500", yearFrom: 2016, yearTo: 2023, body: "truck", priceLow: 17000, priceHigh: 42000, aliases: ["ram 1500", "ram truck", "ram"] },
  { id: "bmw-3", make: "BMW", model: "3 Series", yearFrom: 2017, yearTo: 2022, body: "sedan", priceLow: 16000, priceHigh: 34000, aliases: ["330i", "3 series", "bmw 3"] },
  { id: "mercedes-c", make: "Mercedes-Benz", model: "C-Class", yearFrom: 2017, yearTo: 2022, body: "sedan", priceLow: 17000, priceHigh: 36000, aliases: ["c300", "c-class", "c class"] },
  { id: "lexus-es", make: "Lexus", model: "ES", yearFrom: 2017, yearTo: 2023, body: "sedan", priceLow: 19000, priceHigh: 36000, aliases: ["es350", "lexus es"] },
  { id: "jeep-wrangler", make: "Jeep", model: "Wrangler", yearFrom: 2016, yearTo: 2023, body: "suv", priceLow: 19000, priceHigh: 40000, aliases: ["wrangler"] },
  { id: "mazda-cx5", make: "Mazda", model: "CX-5", yearFrom: 2017, yearTo: 2023, body: "suv", priceLow: 14000, priceHigh: 28000, aliases: ["cx-5", "cx5"] },
  { id: "subaru-outback", make: "Subaru", model: "Outback", yearFrom: 2017, yearTo: 2023, body: "suv", priceLow: 15000, priceHigh: 30000, aliases: ["outback"] },
  { id: "dodge-charger", make: "Dodge", model: "Charger", yearFrom: 2016, yearTo: 2023, body: "sedan", priceLow: 15000, priceHigh: 34000, aliases: ["charger"] },
  { id: "chevy-bolt", make: "Chevrolet", model: "Bolt EV", yearFrom: 2019, yearTo: 2023, body: "ev", priceLow: 13000, priceHigh: 22000, aliases: ["bolt"] },
];

export function findVehicle(text: string): MarketEntry | null {
  const t = text.toLowerCase();
  let best: MarketEntry | null = null;
  let bestLen = 0;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const m of MARKET) {
    const names = [m.model.toLowerCase(), `${m.make} ${m.model}`.toLowerCase(), ...m.aliases];
    for (const n of names) {
      // Whole-word match only, so "es" (Lexus ES) never matches inside "mes".
      // Short names must be preceded by the make to count.
      const short = n.length <= 3;
      const re = short ? new RegExp(`\\b${esc(m.make.toLowerCase())}\\s+${esc(n)}\\b`) : new RegExp(`\\b${esc(n)}\\b`);
      if (re.test(t) && n.length > bestLen) { best = m; bestLen = n.length; }
    }
  }
  return best;
}

export function midPrice(m: MarketEntry): number {
  return Math.round((m.priceLow + m.priceHigh) / 2 / 100) * 100;
}

export function alternativesUnder(maxPrice: number, prefer?: MarketEntry | null, limit = 3): MarketEntry[] {
  const pool = MARKET.filter((m) => m.id !== prefer?.id && m.priceLow <= maxPrice);
  const scored = pool.map((m) => {
    let s = 0;
    if (prefer && m.body === prefer.body) s += 3;
    if (prefer && m.make === prefer.make) s += 2;
    // prefer entries whose midpoint is close to but under the max
    const mid = midPrice(m);
    s += mid <= maxPrice ? 2 - Math.min(2, (maxPrice - mid) / maxPrice) : 0;
    return { m, s };
  });
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.m);
}
