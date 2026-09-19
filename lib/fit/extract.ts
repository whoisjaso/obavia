// Deterministic extraction of buyer facts from free text. Used as the
// fallback when no model credential is present, and as a sanity cross-check
// on model output. Never guesses: a fact not found stays undefined.
import type { BuyerProfile, CreditBand } from "./engine";

const num = (s: string) => Number(s.replace(/[,$]/g, ""));

function moneyAfter(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  if (!m) return undefined;
  let raw = m[1];
  let v = num(raw);
  if (/k$/i.test(raw)) v = num(raw.slice(0, -1)) * 1000;
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

export function extractProfile(text: string, prev: BuyerProfile = {}): BuyerProfile {
  const t = text.toLowerCase();
  const out: BuyerProfile = { ...prev };

  const score =
    t.match(/\b([3-8]\d{2})\b\s*(?:credit|score|fico|de cr[eé]dito|puntaje)/) ??
    t.match(/(?:credit|score|fico|cr[eé]dito|puntaje)[^\d]{0,15}\b([3-8]\d{2})\b/);
  if (score) out.creditScore = Number(score[1]);
  if (!out.creditScore) {
    const words: [RegExp, CreditBand][] = [
      [/\b(excellent|great) credit\b|excelente cr[eé]dito|cr[eé]dito excelente/, "super_prime"],
      [/\bgood credit\b|buen cr[eé]dito|cr[eé]dito bueno/, "prime"],
      [/\b(fair|ok|okay|average) credit\b|cr[eé]dito regular/, "near_prime"],
      [/\b(bad|poor|low) credit\b|mal cr[eé]dito|cr[eé]dito malo/, "subprime"],
      [/\b(no credit|first[- ]time buyer|repo|bankruptcy)\b|sin cr[eé]dito|bancarrota/, "deep_subprime"],
    ];
    for (const [re, band] of words) if (re.test(t)) { out.creditBand = band; break; }
  }

  const down =
    moneyAfter(t, /\$?\s*([\d,]+k?)\s*(?:dollars\s*)?(?:down|as a down|for a down|down payment)/) ??
    moneyAfter(t, /down(?: payment)?(?: of)?\s*\$?\s*([\d,]+k?)/) ??
    moneyAfter(t, /\$?\s*([\d,]+k?)\s*(?:d[oó]lares\s*)?(?:de\s+)?enganche/) ??
    moneyAfter(t, /enganche(?: de)?\s*\$?\s*([\d,]+k?)/);
  if (down !== undefined) out.downPayment = down;

  const monthly =
    moneyAfter(t, /\$?\s*([\d,]+k?)\s*(?:\/|per|a)\s*month/) ??
    moneyAfter(t, /(?:monthly|payment)[^\d$]{0,12}\$?\s*([\d,]+k?)/) ??
    moneyAfter(t, /\$?\s*([\d,]+k?)\s*(?:al|por)\s*mes/) ??
    moneyAfter(t, /(?:mensual|pago)[^\d$]{0,12}\$?\s*([\d,]+k?)/);
  if (monthly !== undefined) out.monthlyBudget = monthly;

  const income = moneyAfter(t, /(?:make|earn|income(?: of| is)?|bring home|take home)\s*(?:about|around|roughly)?\s*\$?\s*([\d,]+k?)/);
  if (income !== undefined) {
    // "make 60k" is annual; "make 4,000 a month" is monthly
    const annual = /\b(a year|per year|annually|yr|k\b)/.test(t) && !/(a month|per month|monthly)/.test(t);
    out.monthlyIncome = annual ? Math.round(income / 12) : income;
  }

  const term = t.match(/\b(36|48|60|72|84)\s*(?:months|mo\b)/);
  if (term) out.termMonths = Number(term[1]);

  const city = t.match(/\b(?:in|near|around)\s+(houston|dallas|austin|san antonio|katy|pasadena|sugar land|the woodlands)\b/);
  if (city) out.city = city[1].replace(/\b\w/g, (c) => c.toUpperCase());

  return out;
}
