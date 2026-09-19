// The advisor turns a buyer profile + request into an estimate. It is the
// single implementation behind both the Claude tool call and the no-model
// fallback, so the arithmetic never depends on the model.
import type { Locale } from "@/lib/domain/types";
import {
  assessFit,
  bandByKey,
  bandForScore,
  downPaymentToReach,
  estimatePayment,
  maxPriceForBudget,
  type BuyerProfile,
  type FitAssessment,
  type PaymentEstimate,
  type RateBand,
} from "./engine";
import { alternativesUnder, findVehicle, midPrice, type MarketEntry } from "./market";
import { extractProfile } from "./extract";

export interface VehicleCard {
  id: string;
  title: string; // "2019–2023 Tesla Model 3"
  priceLow: number;
  priceHigh: number;
  estimate: PaymentEstimate;
  fit: FitAssessment;
  primary: boolean; // the one the buyer asked for
}

export interface AdvisorResult {
  profile: BuyerProfile;
  band: RateBand | null;
  missing: ("credit" | "down" | "vehicle" | "monthly")[];
  cards: VehicleCard[];
  maxPrice?: number; // for the stated monthly budget
  downToReach?: number; // extra cash needed for the desired vehicle at the stated monthly
  summary: string; // localized, plain language, estimate-labeled
  nextQuestion?: string; // localized
}

const fmt = (n: number, locale: Locale) => new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function bandOf(p: BuyerProfile): RateBand | null {
  if (p.creditScore) return bandForScore(p.creditScore);
  if (p.creditBand) return bandByKey(p.creditBand);
  return null;
}

export function advise(profile: BuyerProfile, latestText: string, locale: Locale): AdvisorResult {
  const p = extractProfile(latestText, profile);
  const vehicle = findVehicle(latestText) ?? (p.desiredVehicle ? findVehicle(p.desiredVehicle) : null);
  if (vehicle) p.desiredVehicle = `${vehicle.make} ${vehicle.model}`;
  const band = bandOf(p);
  const term = p.termMonths ?? 60;
  const down = p.downPayment ?? 0;

  const missing: AdvisorResult["missing"] = [];
  if (!band) missing.push("credit");
  if (p.downPayment === undefined) missing.push("down");
  if (!vehicle && !p.monthlyBudget) missing.push("vehicle");

  const t = strings[locale];
  if (missing.length > 0) {
    const ask = missing[0];
    return { profile: p, band, missing, cards: [], summary: t.needMore, nextQuestion: t.ask[ask] };
  }

  const cards: VehicleCard[] = [];
  let maxPrice: number | undefined;
  let downToReach: number | undefined;
  if (p.monthlyBudget) maxPrice = maxPriceForBudget(p.monthlyBudget, down, band!, term);

  if (vehicle) {
    const price = midPrice(vehicle);
    const est = estimatePayment(price, down, band!, term);
    const fit = assessFit(est, p, band!);
    cards.push({ id: vehicle.id, title: label(vehicle), priceLow: vehicle.priceLow, priceHigh: vehicle.priceHigh, estimate: est, fit, primary: true });
    if (p.monthlyBudget && fit.fit !== "likely") downToReach = downPaymentToReach(p.monthlyBudget, price, band!, term);
  }

  const ceiling = maxPrice ?? (vehicle ? midPrice(vehicle) : 20000);
  const rank: Record<string, number> = { likely: 0, stretch: 1, unlikely: 2 };
  const alts = alternativesUnder(ceiling, vehicle, 6)
    .map((alt) => {
      const price = midPrice(alt);
      const est = estimatePayment(price, down, band!, term);
      const fit = assessFit(est, p, band!);
      return { id: alt.id, title: label(alt), priceLow: alt.priceLow, priceHigh: alt.priceHigh, estimate: est, fit, primary: false } as VehicleCard;
    })
    .filter((c) => !p.monthlyBudget || c.fit.fit !== "unlikely")
    .sort((a, b) => rank[a.fit.fit] - rank[b.fit.fit] || a.estimate.paymentHigh - b.estimate.paymentHigh)
    .slice(0, 3);
  cards.push(...alts);

  const primary = cards.find((c) => c.primary);
  let summary: string;
  if (primary) {
    summary = t.summaryPrimary(primary, band!, fmt.bind(null), locale, p);
    if (downToReach && downToReach > down) summary += " " + t.reach(fmt(downToReach - down, locale), fmt(p.monthlyBudget!, locale));
  } else {
    summary = t.summaryBudget(fmt(ceiling, locale), band!);
  }
  return { profile: p, band, missing, cards, maxPrice, downToReach, summary };
}

function label(m: MarketEntry) {
  return `${m.yearFrom}–${m.yearTo} ${m.make} ${m.model}`;
}

const strings: Record<Locale, {
  needMore: string;
  ask: Record<"credit" | "down" | "vehicle" | "monthly", string>;
  summaryPrimary: (c: VehicleCard, b: RateBand, f: (n: number, l: Locale) => string, l: Locale, p: BuyerProfile) => string;
  summaryBudget: (max: string, b: RateBand) => string;
  reach: (extra: string, monthly: string) => string;
}> = {
  en: {
    needMore: "I can run the numbers once I have a little more.",
    ask: {
      credit: "Roughly where is your credit? A score if you know it, or just excellent, good, fair, or bad.",
      down: "How much can you put down today?",
      vehicle: "What are you hoping to drive, or what monthly payment feels comfortable?",
      monthly: "What monthly payment feels comfortable?",
    },
    summaryPrimary: (c, b, f, l, p) => {
      const fitWord = c.fit.fit === "likely" ? "looks realistic" : c.fit.fit === "stretch" ? "is a stretch" : "is unlikely as things stand";
      return `A ${c.title} typically asks ${f(c.priceLow, l)} to ${f(c.priceHigh, l)} around Houston. With ${f(p.downPayment ?? 0, l)} down and ${b.label} credit, a ${c.estimate.termMonths}-month loan lands around ${f(c.estimate.paymentLow, l)} to ${f(c.estimate.paymentHigh, l)} a month. That ${fitWord}. ${c.fit.reasons[0] ?? ""}`.trim();
    },
    summaryBudget: (max, b) => `With ${b.label} credit and that monthly amount, vehicles priced up to about ${max} are in range. Here are a few that usually fit.`,
    reach: (extra, monthly) => `To hold it near ${monthly} a month you would need about ${extra} more down.`,
  },
  es: {
    needMore: "Puedo hacer los números en cuanto tenga un poco más de información.",
    ask: {
      credit: "¿Cómo anda tu crédito? Un puntaje si lo sabes, o simplemente excelente, bueno, regular o malo.",
      down: "¿Cuánto puedes dar de enganche hoy?",
      vehicle: "¿Qué te gustaría manejar, o qué pago mensual te queda cómodo?",
      monthly: "¿Qué pago mensual te queda cómodo?",
    },
    summaryPrimary: (c, b, f, l, p) => {
      const fitWord = c.fit.fit === "likely" ? "se ve realista" : c.fit.fit === "stretch" ? "está justo" : "es poco probable como están las cosas";
      return `Un ${c.title} suele pedirse entre ${f(c.priceLow, l)} y ${f(c.priceHigh, l)} en Houston. Con ${f(p.downPayment ?? 0, l)} de enganche y crédito ${b.labelEs}, un préstamo a ${c.estimate.termMonths} meses queda cerca de ${f(c.estimate.paymentLow, l)} a ${f(c.estimate.paymentHigh, l)} al mes. Eso ${fitWord}.`;
    },
    summaryBudget: (max, b) => `Con crédito ${b.labelEs} y ese pago mensual, vehículos de hasta unos ${max} están a tu alcance. Aquí van algunos que suelen encajar.`,
    reach: (extra, monthly) => `Para mantenerlo cerca de ${monthly} al mes necesitarías unos ${extra} más de enganche.`,
  },
};
