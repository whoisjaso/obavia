"use client";

import { useEffect, useState, useTransition } from "react";
import type { Locale } from "@/lib/domain/types";
import type { AdvisorResult, VehicleCard } from "@/lib/fit/advisor";
import type { CreditBand } from "@/lib/fit/engine";
import { createInquiryAction } from "@/app/actions";

// One question per screen. Big targets, one number at the end. The engine
// (via /api/fit) is the only source of numbers; this file only asks and shows.

type Step = "credit" | "down" | "monthly" | "car" | "result";
const STEPS: Step[] = ["credit", "down", "monthly", "car"];
type Body = "sedan" | "suv" | "truck" | "ev";

interface Model { id: string; name: string; from: number }
const MODELS: Record<Body, Model[]> = {
  sedan: [
    { id: "toyota-corolla", name: "Toyota Corolla", from: 12000 },
    { id: "honda-civic", name: "Honda Civic", from: 13000 },
    { id: "toyota-camry", name: "Toyota Camry", from: 14000 },
    { id: "honda-accord", name: "Honda Accord", from: 15000 },
    { id: "nissan-altima", name: "Nissan Altima", from: 10000 },
    { id: "bmw-3", name: "BMW 3 Series", from: 16000 },
  ],
  suv: [
    { id: "toyota-rav4", name: "Toyota RAV4", from: 17000 },
    { id: "honda-crv", name: "Honda CR-V", from: 16000 },
    { id: "nissan-rogue", name: "Nissan Rogue", from: 12000 },
    { id: "chevy-equinox", name: "Chevrolet Equinox", from: 12000 },
    { id: "ford-explorer", name: "Ford Explorer", from: 15000 },
    { id: "jeep-wrangler", name: "Jeep Wrangler", from: 19000 },
  ],
  truck: [
    { id: "ford-f150", name: "Ford F-150", from: 17000 },
    { id: "chevy-silverado", name: "Chevrolet Silverado", from: 17000 },
    { id: "ram-1500", name: "Ram 1500", from: 17000 },
    { id: "toyota-tacoma", name: "Toyota Tacoma", from: 19000 },
  ],
  ev: [
    { id: "tesla-model-3", name: "Tesla Model 3", from: 19500 },
    { id: "tesla-model-y", name: "Tesla Model Y", from: 24000 },
    { id: "chevy-bolt", name: "Chevrolet Bolt EV", from: 13000 },
    { id: "tesla-model-s", name: "Tesla Model S", from: 22000 },
  ],
};

const copy: Record<Locale, {
  title: string; sub: string; back: string; next: string; skip: string;
  credit: { q: string; opts: { band: CreditBand; label: string; hint: string }[] };
  down: { q: string; hint: string };
  monthly: { q: string; hint: string };
  car: { q: string; bodies: Record<Body, string>; any: string; pick: string; from: string };
  result: { crunch: string; score: string; fit: Record<"likely" | "stretch" | "unlikely", string>; perMonth: string; down: string; months: string; asks: string; why: string; fits: string; hint: (extra: string, monthly: string) => string; hintBudget: (max: string) => string; talk: string; adjust: string; another: string; restart: string; estimate: string; error: string };
  sheet: { title: string; sub: string; name: string; contact: string; send: string; sent: string; sentSub: string; cancel: string; fail: string };
  reasons: Record<string, string>;
}> = {
  en: {
    title: "What can I actually get?",
    sub: "4 taps. No credit pull.",
    back: "Back",
    next: "Next",
    skip: "Not sure",
    credit: {
      q: "How's your credit?",
      opts: [
        { band: "super_prime", label: "Excellent", hint: "720 and up" },
        { band: "prime", label: "Good", hint: "660 to 719" },
        { band: "near_prime", label: "Fair", hint: "600 to 659" },
        { band: "subprime", label: "Building", hint: "Under 600 or none" },
      ],
    },
    down: { q: "Cash down today?", hint: "More down, lower payment." },
    monthly: { q: "Monthly payment that feels right?", hint: "Be honest. This drives everything." },
    car: { q: "What do you want to drive?", bodies: { sedan: "Sedan", suv: "SUV", truck: "Truck", ev: "Electric" }, any: "Show me what fits", pick: "Pick one", from: "from" },
    result: {
      crunch: "Running your numbers",
      score: "Fit score",
      fit: { likely: "Realistic", stretch: "A stretch", unlikely: "Out of reach" },
      perMonth: "/mo",
      down: "down",
      months: "mo",
      asks: "asks",
      why: "Why this score",
      fits: "What fits you",
      hint: (extra, monthly) => `${extra} more down gets it near ${monthly}/mo.`,
      hintBudget: (max) => `Your payment covers cars up to about ${max}.`,
      talk: "Talk to a dealer",
      adjust: "Adjust numbers",
      another: "Try another car",
      restart: "Start over",
      estimate: "Estimates from what you told us. Not a credit decision or an offer. Houston-area asking ranges, not live listings.",
      error: "Something went wrong. Try again.",
    },
    sheet: {
      title: "A dealer will call you",
      sub: "We send what you told us. No credit pull. No spam.",
      name: "Your name",
      contact: "Phone or email",
      send: "Send",
      sent: "Sent",
      sentSub: "A dealer will reach out soon.",
      cancel: "Cancel",
      fail: "Add your name and a phone or email.",
    },
    reasons: {},
  },
  es: {
    title: "¿Qué me alcanza de verdad?",
    sub: "4 toques. Sin consulta de crédito.",
    back: "Atrás",
    next: "Siguiente",
    skip: "No sé",
    credit: {
      q: "¿Cómo anda tu crédito?",
      opts: [
        { band: "super_prime", label: "Excelente", hint: "720 o más" },
        { band: "prime", label: "Bueno", hint: "660 a 719" },
        { band: "near_prime", label: "Regular", hint: "600 a 659" },
        { band: "subprime", label: "En construcción", hint: "Menos de 600 o sin crédito" },
      ],
    },
    down: { q: "¿Cuánto enganche hoy?", hint: "Más enganche, pago más bajo." },
    monthly: { q: "¿Qué pago mensual te queda bien?", hint: "Sé honesto. Esto define todo." },
    car: { q: "¿Qué quieres manejar?", bodies: { sedan: "Sedán", suv: "SUV", truck: "Troca", ev: "Eléctrico" }, any: "Muéstrame qué me alcanza", pick: "Elige uno", from: "desde" },
    result: {
      crunch: "Haciendo tus números",
      score: "Puntaje de ajuste",
      fit: { likely: "Realista", stretch: "Está justo", unlikely: "Fuera de alcance" },
      perMonth: "/mes",
      down: "de enganche",
      months: "meses",
      asks: "pide",
      why: "Por qué este puntaje",
      fits: "Lo que te alcanza",
      hint: (extra, monthly) => `${extra} más de enganche lo deja cerca de ${monthly}/mes.`,
      hintBudget: (max) => `Tu pago cubre carros de hasta unos ${max}.`,
      talk: "Hablar con un dealer",
      adjust: "Ajustar números",
      another: "Probar otro carro",
      restart: "Empezar de nuevo",
      estimate: "Estimaciones con lo que nos dijiste. No es una decisión de crédito ni una oferta. Rangos de precio en Houston, no anuncios en vivo.",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    sheet: {
      title: "Un dealer te llamará",
      sub: "Le mandamos lo que nos dijiste. Sin consulta de crédito. Sin spam.",
      name: "Tu nombre",
      contact: "Teléfono o correo",
      send: "Enviar",
      sent: "Enviado",
      sentSub: "Un dealer te contactará pronto.",
      cancel: "Cancelar",
      fail: "Pon tu nombre y un teléfono o correo.",
    },
    reasons: {
      "The estimated payment fits inside the monthly amount you gave.": "El pago estimado cabe en el monto mensual que diste.",
      "The estimated payment runs a little above the monthly amount you gave.": "El pago estimado queda un poco arriba del monto mensual que diste.",
      "The estimated payment is well above the monthly amount you gave.": "El pago estimado queda muy por encima del monto mensual que diste.",
      "The payment would be a large share of the monthly income you gave; lenders usually want it under about 15 to 20 percent.": "El pago sería una parte grande del ingreso mensual que diste; los prestamistas suelen querer menos del 15 a 20 por ciento.",
      "With this down payment the loan would exceed about 130 percent of the vehicle price, which most lenders will not fund on a used car.": "Con este enganche el préstamo pasaría del 130 por ciento del precio, y la mayoría de los prestamistas no financia eso en un carro usado.",
      "The loan-to-value is on the high side; a larger down payment would help.": "El préstamo es alto frente al valor del carro; un enganche mayor ayudaría.",
      "In your credit band lenders usually look for at least about 10 percent down.": "En tu nivel de crédito los prestamistas suelen pedir al menos un 10 por ciento de enganche.",
      "Higher-priced vehicles are harder to finance in this credit band.": "Los carros más caros son más difíciles de financiar en este nivel de crédito.",
      "The numbers line up with what lenders commonly fund.": "Los números cuadran con lo que los prestamistas suelen financiar.",
    },
  },
};

const money = (n: number, l: Locale) => new Intl.NumberFormat(l === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface Answers { creditBand?: CreditBand; downPayment: number; monthlyBudget?: number; body?: Body; vehicle?: string; termMonths: number }

export function BuyerFlow({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [step, setStep] = useState<Step>("credit");
  const [a, setA] = useState<Answers>({ downPayment: 1000, monthlyBudget: 400, termMonths: 60 });
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [sheet, setSheet] = useState<"closed" | "open" | "sent">("closed");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  async function run(next: Answers) {
    setBusy(true);
    setErr(false);
    setStep("result");
    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, creditBand: next.creditBand, downPayment: next.downPayment, monthlyBudget: next.monthlyBudget, termMonths: next.termMonths, vehicle: next.vehicle ?? "" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setResult((await res.json()) as AdvisorResult);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  function chooseCredit(band: CreditBand) {
    setPicked(band);
    const next = { ...a, creditBand: band };
    setA(next);
    window.setTimeout(() => { setPicked(null); setStep("down"); }, 220);
  }

  function chooseModel(m: Model | null) {
    setPicked(m?.id ?? "any");
    const next = { ...a, vehicle: m?.name };
    setA(next);
    window.setTimeout(() => { setPicked(null); run(next); }, 220);
  }

  function restart() {
    setA({ downPayment: 1000, monthlyBudget: 400, termMonths: 60 });
    setResult(null);
    setSheet("closed");
    setStep("credit");
  }

  const idx = STEPS.indexOf(step);
  const back = () => setStep(step === "result" ? "car" : STEPS[Math.max(0, idx - 1)]);

  return (
    <div className={`flow step-${step}`}>
      <div className="flow-top">
        {step !== "credit" ? (
          <button type="button" className="backbtn" onClick={back} aria-label={t.back}>‹</button>
        ) : <span className="backbtn" aria-hidden />}
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step === "result" ? 4 : idx} aria-label={t.title}>
          {STEPS.map((s, i) => <span key={s} className={i < (step === "result" ? 4 : idx) ? "on" : i === idx ? "now" : ""} />)}
        </div>
      </div>

      {step === "credit" && (
        <section className="screen" data-testid="step-credit">
          <h1 className="q">{t.credit.q}</h1>
          <p className="qsub">{t.sub}</p>
          <div className="grid2">
            {t.credit.opts.map((o) => (
              <button key={o.band} type="button" className={`tile ${picked === o.band ? "picked" : ""} ${a.creditBand === o.band ? "was" : ""}`} data-testid={`credit-${o.band}`} onClick={() => chooseCredit(o.band)}>
                <Gauge band={o.band} />
                <span className="tile-label">{o.label}</span>
                <span className="tile-hint">{o.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "down" && (
        <section className="screen" data-testid="step-down">
          <h1 className="q">{t.down.q}</h1>
          <p className="qsub">{t.down.hint}</p>
          <div className="bignum" data-testid="down-value">{money(a.downPayment, locale)}</div>
          <input type="range" className="slider" min={0} max={10000} step={250} value={a.downPayment} aria-label={t.down.q} data-testid="down-slider"
            onChange={(e) => setA({ ...a, downPayment: Number(e.target.value) })} />
          <div className="ticks"><span>$0</span><span>$5,000</span><span>$10,000</span></div>
          {result && <Live a={a} locale={locale} t={t} />}
          <div className="chips">
            {[500, 1000, 2000, 5000].map((v) => (
              <button key={v} type="button" className={`chip ${a.downPayment === v ? "on" : ""}`} onClick={() => setA({ ...a, downPayment: v })}>{money(v, locale)}</button>
            ))}
          </div>
          <button type="button" className="cta" data-testid="next" onClick={() => setStep("monthly")}>{t.next}</button>
        </section>
      )}

      {step === "monthly" && (
        <section className="screen" data-testid="step-monthly">
          <h1 className="q">{t.monthly.q}</h1>
          <p className="qsub">{t.monthly.hint}</p>
          <div className="bignum" data-testid="monthly-value">{money(a.monthlyBudget ?? 400, locale)}<span className="unit">{t.result.perMonth}</span></div>
          <input type="range" className="slider" min={200} max={1200} step={25} value={a.monthlyBudget ?? 400} aria-label={t.monthly.q} data-testid="monthly-slider"
            onChange={(e) => setA({ ...a, monthlyBudget: Number(e.target.value) })} />
          <div className="ticks"><span>$200</span><span>$700</span><span>$1,200</span></div>
          <button type="button" className="cta" data-testid="next" onClick={() => (result ? run(a) : setStep("car"))}>{t.next}</button>
          <button type="button" className="ghost" onClick={() => { const n = { ...a, monthlyBudget: undefined }; setA(n); if (result) run(n); else setStep("car"); }}>{t.skip}</button>
        </section>
      )}

      {step === "car" && (
        <section className="screen" data-testid="step-car">
          <h1 className="q">{t.car.q}</h1>
          <div className="grid4">
            {(Object.keys(t.car.bodies) as Body[]).map((b) => (
              <button key={b} type="button" className={`tile small ${a.body === b ? "on" : ""}`} data-testid={`body-${b}`} onClick={() => setA({ ...a, body: b })}>
                <BodyIcon body={b} />
                <span className="tile-label">{t.car.bodies[b]}</span>
              </button>
            ))}
          </div>
          {a.body && (
            <div className="models" data-testid="models">
              <p className="eyebrow">{t.car.pick}</p>
              {MODELS[a.body].map((m) => (
                <button key={m.id} type="button" className={`rowbtn ${picked === m.id ? "picked" : ""}`} data-testid={`model-${m.id}`} onClick={() => chooseModel(m)}>
                  <span>{m.name}</span>
                  <span className="muted">{t.car.from} {money(m.from, locale)}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className={a.body ? "ghost" : "cta"} data-testid="any-car" onClick={() => chooseModel(null)}>{t.car.any}</button>
        </section>
      )}

      {step === "result" && (
        <section className="screen result" data-testid="step-result">
          {busy && (
            <div className="crunch" aria-live="polite">
              <Ring value={0} spin />
              <p>{t.result.crunch}</p>
            </div>
          )}
          {!busy && err && (
            <div className="crunch"><p className="error">{t.result.error}</p><button type="button" className="cta" onClick={() => run(a)}>{t.next}</button></div>
          )}
          {!busy && result && result.cards.length > 0 && (
            <Result result={result} locale={locale} t={t} onTalk={() => setSheet("open")} onAdjust={() => setStep("down")} onAnother={() => setStep("car")} onRestart={restart} />
          )}
          {!busy && result && result.cards.length === 0 && (
            <div className="crunch"><p>{result.summary}</p><button type="button" className="cta" onClick={() => setStep("monthly")}>{t.result.adjust}</button></div>
          )}
        </section>
      )}

      {sheet === "open" && result && (
        <InquirySheet locale={locale} t={t} hero={heroOf(result)} a={a} onClose={() => setSheet("closed")} onSent={() => setSheet("sent")} />
      )}
      {sheet === "sent" && (
        <div className="scrim" role="presentation" onClick={() => setSheet("closed")}>
          <div className="sheet" role="dialog" aria-modal="true" data-testid="sent">
            <div className="check" aria-hidden>✓</div>
            <h2>{t.sheet.sent}</h2>
            <p className="small muted" data-testid="sent-sub">{t.sheet.sentSub}</p>
            <button type="button" className="btn primary wide" onClick={() => setSheet("closed")}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

type Copy = (typeof copy)["en"];

// Live payment preview while the buyer drags a slider (debounced engine call).
function Live({ a, locale, t }: { a: Answers; locale: Locale; t: Copy }) {
  const [p, setP] = useState<{ low: number; high: number; fit: "likely" | "stretch" | "unlikely" } | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/fit", { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
          body: JSON.stringify({ locale, creditBand: a.creditBand, downPayment: a.downPayment, monthlyBudget: a.monthlyBudget, termMonths: a.termMonths, vehicle: a.vehicle ?? "" }) });
        if (!res.ok) return;
        const r = (await res.json()) as AdvisorResult;
        const h = r.cards.find((c) => c.primary) ?? r.cards[0];
        if (h) setP({ low: h.estimate.paymentLow, high: h.estimate.paymentHigh, fit: h.fit.fit });
      } catch { /* stale or aborted */ }
    }, 200);
    return () => { window.clearTimeout(id); ctl.abort(); };
  }, [a, locale]);
  if (!p) return null;
  return (
    <div className={`live ${p.fit}`} data-testid="live" aria-live="polite">
      <span className="live-pay">{money(p.low, locale)}–{money(p.high, locale)}{t.result.perMonth}</span>
      <span className={`fitpill ${p.fit}`}>{t.result.fit[p.fit]}</span>
    </div>
  );
}

function heroOf(r: AdvisorResult): VehicleCard {
  return r.cards.find((c) => c.primary) ?? r.cards[0];
}

function Result({ result, locale, t, onTalk, onAdjust, onAnother, onRestart }: { result: AdvisorResult; locale: Locale; t: Copy; onTalk: () => void; onAdjust: () => void; onAnother: () => void; onRestart: () => void }) {
  const hero = heroOf(result);
  const rest = result.cards.filter((c) => c !== hero);
  const e = hero.estimate;
  const down = result.profile.downPayment ?? 0;
  const reasons = hero.fit.reasons.map((r) => t.reasons[r] ?? r);
  let hint: string | undefined;
  if (hero.primary && hero.fit.fit !== "likely" && result.downToReach && result.downToReach > down && result.profile.monthlyBudget) {
    hint = t.result.hint(money(result.downToReach - down, locale), money(result.profile.monthlyBudget, locale));
  } else if (!hero.primary && result.maxPrice) hint = t.result.hintBudget(money(result.maxPrice, locale));
  return (
    <>
      <div className={`hero-card ${hero.fit.fit}`} data-testid="fitcard" data-fit={hero.fit.fit}>
        <Ring value={hero.fit.score} label={t.result.score} />
        <span className={`fitpill ${hero.fit.fit}`} data-testid="fit-label">{t.result.fit[hero.fit.fit]}</span>
        <div className="hero-title">{hero.title}</div>
        <div className="hero-pay"><Count to={e.paymentLow} locale={locale} /><span className="dash">–</span><Count to={e.paymentHigh} locale={locale} /><span className="unit">{t.result.perMonth}</span></div>
        <div className="hero-sub">{money(down, locale)} {t.result.down} · {e.termMonths} {t.result.months} · {t.result.asks} {money(hero.priceLow, locale)}–{money(hero.priceHigh, locale)}</div>
        {hint && <div className="hero-hint">{hint}</div>}
        {reasons.length > 0 && (
          <details className="why">
            <summary>{t.result.why}</summary>
            <ul>{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </details>
        )}
      </div>

      <div className="actions">
        <button type="button" className="cta" data-testid="talk" onClick={onTalk}>{t.result.talk}</button>
        <div className="row2">
          <button type="button" className="ghost" onClick={onAdjust}>{t.result.adjust}</button>
          <button type="button" className="ghost" onClick={onAnother}>{t.result.another}</button>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="fits" data-testid="alts">
          <p className="eyebrow">{t.result.fits}</p>
          {rest.map((c) => (
            <div key={c.id} className={`alt ${c.fit.fit}`} data-testid="fitcard" data-fit={c.fit.fit}>
              <Ring value={c.fit.score} size={44} />
              <div className="alt-body">
                <div className="alt-title">{c.title}</div>
                <div className="alt-pay">{money(c.estimate.paymentLow, locale)}–{money(c.estimate.paymentHigh, locale)}<span className="unit">{t.result.perMonth}</span></div>
              </div>
              <span className={`fitpill ${c.fit.fit}`}>{t.result.fit[c.fit.fit]}</span>
            </div>
          ))}
        </div>
      )}

      <p className="fineprint">{t.result.estimate}</p>
      <button type="button" className="ghost" onClick={onRestart}>{t.result.restart}</button>
    </>
  );
}

// Animated number. Respects reduced motion by jumping straight to the value.
function Count({ to, locale }: { to: number; locale: Locale }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{money(v, locale)}</span>;
}

// Score ring. SVG stroke animates via CSS transition on the dash offset.
function Ring({ value, label, size = 96, spin = false }: { value: number; label?: string; size?: number; spin?: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => { const id = window.setTimeout(() => setV(value), 30); return () => window.clearTimeout(id); }, [value]);
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 66 ? "ok" : value >= 45 ? "warn" : "bad";
  return (
    <div className={`ring ${tone} ${spin ? "spin" : ""}`} style={{ width: size, height: size }} data-testid={label ? "score" : undefined} aria-label={label ? `${label} ${value}` : undefined}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="arc" strokeDasharray={c} strokeDashoffset={c * (1 - (spin ? 0.25 : v) / 100)} />
      </svg>
      {!spin && <div className="ring-num" style={{ fontSize: size * 0.3 }}>{value}</div>}
      {label && <div className="ring-label">{label}</div>}
    </div>
  );
}

function Gauge({ band }: { band: CreditBand }) {
  const level = { deep_subprime: 1, subprime: 1, near_prime: 2, prime: 3, super_prime: 4 }[band];
  return (
    <span className="gauge" aria-hidden>
      {[1, 2, 3, 4].map((i) => <i key={i} className={i <= level ? "on" : ""} />)}
    </span>
  );
}

function BodyIcon({ body }: { body: Body }) {
  const d: Record<Body, string> = {
    sedan: "M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-1a2 2 0 1 1-4 0H8a2 2 0 1 1-4 0H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm3-1h12l-1.4-3.5H7.4L6 12z",
    suv: "M2 11l2-4a2 2 0 0 1 2-1h9l3 4h2a2 2 0 0 1 2 2v4h-2a2 2 0 1 1-4 0H8a2 2 0 1 1-4 0H2v-5zm4-1h8l-1.8-2.5H6.8L6 10z",
    truck: "M1 8h12v8h1a2 2 0 1 1 4 0h5v-5l-3-4h-4V8H1zm14 1h3l2 2.6V12h-5V9z",
    ev: "M4 12l2-5a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l2 5v4h-1a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H4v-4zm8-4l-2 4h2l-1 3 3-4h-2l1-3h-1z",
  };
  return <svg className="bodyicon" viewBox="0 0 24 24" width="40" height="40" aria-hidden><path d={d[body]} /></svg>;
}

function InquirySheet({ locale, t, hero, a, onClose, onSent }: { locale: Locale; t: Copy; hero: VehicleCard; a: Answers; onClose: () => void; onSent: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  return (
    <div className="scrim" role="presentation" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-h"
        data-testid="sheet"
        onClick={(e) => e.stopPropagation()}
        action={(fd) => start(async () => {
          const r = await createInquiryAction(fd);
          if (r.ok) onSent(); else setErr(true);
        })}
      >
        <div className="grabber" aria-hidden />
        <h2 id="sheet-h">{t.sheet.title}</h2>
        <p className="small muted">{t.sheet.sub}</p>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="vehicle" value={hero.title} />
        <input type="hidden" name="paymentLow" value={hero.estimate.paymentLow} />
        <input type="hidden" name="paymentHigh" value={hero.estimate.paymentHigh} />
        <input type="hidden" name="downPayment" value={a.downPayment} />
        <input type="hidden" name="creditBand" value={a.creditBand ?? ""} />
        <input name="name" placeholder={t.sheet.name} aria-label={t.sheet.name} autoComplete="name" required data-testid="inq-name" />
        <input name="contact" placeholder={t.sheet.contact} aria-label={t.sheet.contact} autoComplete="tel" inputMode="email" required data-testid="inq-contact" />
        {err && <p className="error small">{t.sheet.fail}</p>}
        <button type="submit" className="btn primary wide" disabled={pending} data-testid="inq-send">{t.sheet.send}</button>
        <button type="button" className="btn quiet wide" onClick={onClose}>{t.sheet.cancel}</button>
      </form>
    </div>
  );
}
