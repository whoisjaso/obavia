import { NextResponse } from "next/server";
import type { Locale } from "@/lib/domain/types";
import { isLocale } from "@/lib/i18n/dictionaries";
import { advise, type AdvisorResult } from "@/lib/fit/advisor";
import type { BuyerProfile, CreditBand } from "@/lib/fit/engine";

export const runtime = "nodejs";

// Structured intake for the tap flow. No model, no text parsing beyond the
// vehicle name: the engine is the only source of numbers.
interface FitRequest {
  locale?: string;
  creditBand?: CreditBand;
  creditScore?: number;
  downPayment?: number;
  monthlyBudget?: number;
  termMonths?: number;
  vehicle?: string; // market alias, e.g. "Toyota Camry"; empty = whatever fits
}

const BANDS: CreditBand[] = ["deep_subprime", "subprime", "near_prime", "prime", "super_prime"];
const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : undefined);

export async function POST(req: Request) {
  let body: FitRequest;
  try {
    body = (await req.json()) as FitRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const locale: Locale = body.locale && isLocale(body.locale) ? body.locale : "en";
  const profile: BuyerProfile = {
    creditBand: body.creditBand && BANDS.includes(body.creditBand) ? body.creditBand : undefined,
    creditScore: num(body.creditScore, 850),
    downPayment: num(body.downPayment, 100_000),
    monthlyBudget: num(body.monthlyBudget, 10_000),
    termMonths: num(body.termMonths, 84),
  };
  const vehicle = typeof body.vehicle === "string" ? body.vehicle.slice(0, 60) : "";
  const result: AdvisorResult = advise(profile, vehicle, locale);
  return NextResponse.json(result);
}
