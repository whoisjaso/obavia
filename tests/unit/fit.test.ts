import { describe, expect, it } from "vitest";
import { assessFit, bandForScore, downPaymentToReach, estimatePayment, maxPriceForBudget, monthlyPayment } from "@/lib/fit/engine";
import { alternativesUnder, findVehicle, midPrice } from "@/lib/fit/market";
import { extractProfile } from "@/lib/fit/extract";
import { containsBannedLanguage } from "@/lib/domain/check";

describe("affordability engine", () => {
  it("bands scores", () => {
    expect(bandForScore(700).band).toBe("prime");
    expect(bandForScore(580).band).toBe("subprime");
    expect(bandForScore(900).band).toBe("super_prime");
  });
  it("computes an amortized payment", () => {
    expect(Math.round(monthlyPayment(20000, 7.0, 60))).toBe(396);
  });
  it("estimates payment with Texas tax and fixed fees, as a range", () => {
    const e = estimatePayment(25000, 600, bandForScore(700), 60);
    expect(e.outTheDoor).toBe(Math.round(25000 * 1.0625 + 400));
    expect(e.paymentLow).toBeLessThan(e.paymentHigh);
    expect(e.financed).toBe(e.outTheDoor - 600);
  });
  it("inverts budget to a max price", () => {
    const band = bandForScore(700);
    const max = maxPriceForBudget(450, 2000, band, 60);
    const check = estimatePayment(max, 2000, band, 60);
    expect(check.paymentHigh).toBeLessThanOrEqual(450);
  });
  it("Tesla with $600 down and 700 score is a stretch or unlikely, not likely", () => {
    const band = bandForScore(700);
    const est = estimatePayment(26000, 600, band, 60);
    const fit = assessFit(est, { creditScore: 700, downPayment: 600, monthlyBudget: 400 }, band);
    expect(fit.fit).not.toBe("likely");
    expect(fit.reasons.length).toBeGreaterThan(0);
  });
  it("down payment to reach a target monthly", () => {
    const band = bandForScore(700);
    const need = downPaymentToReach(400, 26000, band, 60);
    const check = estimatePayment(26000, need, band, 60);
    expect(check.paymentHigh).toBeLessThanOrEqual(400);
  });
  it("never emits approval or prequalification language in reasons", () => {
    const band = bandForScore(560);
    const est = estimatePayment(30000, 500, band, 72);
    const fit = assessFit(est, { creditScore: 560, downPayment: 500, monthlyBudget: 300, monthlyIncome: 2500 }, band);
    for (const r of fit.reasons) {
      expect(containsBannedLanguage(r)).toBeNull();
      expect(r.toLowerCase()).not.toMatch(/prequalif|pre-qualif/);
    }
  });
});

describe("market table", () => {
  it("finds a vehicle by alias", () => {
    expect(findVehicle("I want a tesla model 3 please")?.id).toBe("tesla-model-3");
    expect(findVehicle("thinking f150 or a tacoma")?.id).toBe("toyota-tacoma");
    expect(findVehicle("anything reliable")).toBeNull();
    expect(findVehicle("350 al mes")).toBeNull();
    expect(findVehicle("a lexus es would be nice")?.id).toBe("lexus-es");
  });
  it("suggests alternatives under a max, preferring same body", () => {
    const tesla = findVehicle("model 3")!;
    const alts = alternativesUnder(20000, tesla);
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(a.priceLow).toBeLessThanOrEqual(20000);
    expect(alts[0].body).toBe("ev");
    expect(midPrice(tesla)).toBeGreaterThan(0);
  });
});

describe("extraction", () => {
  it("pulls score, down, monthly, vehicle-adjacent facts", () => {
    const p = extractProfile("I have a 700 credit score, want a Tesla Model 3, can only afford $600 down and about $450 a month");
    expect(p.creditScore).toBe(700);
    expect(p.downPayment).toBe(600);
    expect(p.monthlyBudget).toBe(450);
  });
  it("handles words for credit and k for thousands", () => {
    const p = extractProfile("bad credit, 2k down, I make 60k a year");
    expect(p.creditBand).toBe("subprime");
    expect(p.downPayment).toBe(2000);
    expect(p.monthlyIncome).toBe(5000);
  });
  it("understands Spanish phrasing", () => {
    const p = extractProfile("mal crédito, 2k de enganche, 350 al mes");
    expect(p.creditBand).toBe("subprime");
    expect(p.downPayment).toBe(2000);
    expect(p.monthlyBudget).toBe(350);
    expect(extractProfile("crédito de 700 y quiero un corolla").creditScore).toBe(700);
  });
  it("does not invent facts", () => {
    const p = extractProfile("hello");
    expect(p.creditScore).toBeUndefined();
    expect(p.downPayment).toBeUndefined();
  });
});
