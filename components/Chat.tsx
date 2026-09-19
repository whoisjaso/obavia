"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/lib/domain/types";
import type { AdvisorResult, VehicleCard } from "@/lib/fit/advisor";
import type { BuyerProfile } from "@/lib/fit/engine";
import { createInquiryAction } from "@/app/actions";

// Tap-first buyer flow. Every tap becomes a short plain-language message
// (the same text the buyer could have typed), so the server sees one kind
// of input and the numbers always come from the engine.

interface Msg { id: number; role: "user" | "assistant"; text: string; result?: AdvisorResult | null }
type Step = "credit" | "down" | "monthly" | "car" | "done";
interface Choice { label: string; send?: string; skip?: boolean }

const copy: Record<Locale, {
  greeting: string; placeholder: string; send: string; thinking: string; error: string;
  ask: Record<Exclude<Step, "done">, string>;
  choices: Record<Exclude<Step, "done">, Choice[]>;
  fit: Record<"likely" | "stretch" | "unlikely", string>;
  perMonth: string; down: string; asking: string; months: string; estimate: string; why: string;
  more: string; longer: string; talk: string; restart: string; other: string;
  hint: (extra: string, monthly: string) => string; hintBudget: (max: string) => string;
  sheet: { title: string; sub: string; name: string; contact: string; send: string; sent: string; cancel: string; fail: string };
  reasons: Record<string, string>;
}> = {
  en: {
    greeting: "Three quick taps and I'll show you what fits.",
    placeholder: "Or just type it",
    send: "Send",
    thinking: "Running the numbers",
    error: "Something went wrong. Tap again.",
    ask: {
      credit: "How's your credit?",
      down: "How much can you put down?",
      monthly: "What monthly payment feels right?",
      car: "What do you want to drive?",
    },
    choices: {
      credit: [
        { label: "Excellent", send: "excellent credit" },
        { label: "Good", send: "good credit" },
        { label: "Fair", send: "fair credit" },
        { label: "Bad", send: "bad credit" },
        { label: "No credit yet", send: "no credit" },
      ],
      down: [
        { label: "$0", send: "$0 down" },
        { label: "$500", send: "$500 down" },
        { label: "$1,000", send: "$1,000 down" },
        { label: "$2,000", send: "$2,000 down" },
        { label: "$5,000", send: "$5,000 down" },
      ],
      monthly: [
        { label: "$300", send: "$300 a month" },
        { label: "$400", send: "$400 a month" },
        { label: "$500", send: "$500 a month" },
        { label: "$700", send: "$700 a month" },
        { label: "Not sure", skip: true },
      ],
      car: [
        { label: "Tesla Model 3", send: "Tesla Model 3" },
        { label: "Toyota Camry", send: "Toyota Camry" },
        { label: "Honda Civic", send: "Honda Civic" },
        { label: "Ford F-150", send: "Ford F-150" },
        { label: "Toyota RAV4", send: "Toyota RAV4" },
        { label: "Whatever fits", send: "whatever fits my budget" },
      ],
    },
    fit: { likely: "Realistic", stretch: "A stretch", unlikely: "Out of reach" },
    perMonth: "/mo",
    down: "down",
    asking: "asks",
    months: "mo",
    estimate: "Estimates from what you told us. Not a credit decision or an offer.",
    why: "Why",
    more: "more down",
    longer: "72 months",
    talk: "Talk to a dealer",
    restart: "Start over",
    other: "Something else",
    hint: (extra, monthly) => `${extra} more down gets it near ${monthly}/mo.`,
    hintBudget: (max) => `Your monthly amount covers cars up to about ${max}.`,
    sheet: {
      title: "A dealer will call you",
      sub: "We send them what you told us. No credit pull. No spam.",
      name: "Your name",
      contact: "Phone or email",
      send: "Send",
      sent: "Sent. A dealer will reach out soon.",
      cancel: "Cancel",
      fail: "Add your name and a phone or email.",
    },
    reasons: {},
  },
  es: {
    greeting: "Tres toques y te muestro qué te alcanza.",
    placeholder: "O escríbelo",
    send: "Enviar",
    thinking: "Haciendo los números",
    error: "Algo salió mal. Toca de nuevo.",
    ask: {
      credit: "¿Cómo anda tu crédito?",
      down: "¿Cuánto puedes dar de enganche?",
      monthly: "¿Qué pago mensual te queda bien?",
      car: "¿Qué quieres manejar?",
    },
    choices: {
      credit: [
        { label: "Excelente", send: "excelente crédito" },
        { label: "Bueno", send: "buen crédito" },
        { label: "Regular", send: "crédito regular" },
        { label: "Malo", send: "mal crédito" },
        { label: "Sin crédito", send: "sin crédito" },
      ],
      down: [
        { label: "$0", send: "$0 de enganche" },
        { label: "$500", send: "$500 de enganche" },
        { label: "$1,000", send: "$1,000 de enganche" },
        { label: "$2,000", send: "$2,000 de enganche" },
        { label: "$5,000", send: "$5,000 de enganche" },
      ],
      monthly: [
        { label: "$300", send: "$300 al mes" },
        { label: "$400", send: "$400 al mes" },
        { label: "$500", send: "$500 al mes" },
        { label: "$700", send: "$700 al mes" },
        { label: "No sé", skip: true },
      ],
      car: [
        { label: "Tesla Model 3", send: "Tesla Model 3" },
        { label: "Toyota Camry", send: "Toyota Camry" },
        { label: "Honda Civic", send: "Honda Civic" },
        { label: "Ford F-150", send: "Ford F-150" },
        { label: "Toyota RAV4", send: "Toyota RAV4" },
        { label: "Lo que me alcance", send: "lo que me alcance con mi presupuesto" },
      ],
    },
    fit: { likely: "Realista", stretch: "Está justo", unlikely: "Fuera de alcance" },
    perMonth: "/mes",
    down: "de enganche",
    asking: "pide",
    months: "meses",
    estimate: "Estimaciones con lo que nos dijiste. No es una decisión de crédito ni una oferta.",
    why: "Por qué",
    more: "más de enganche",
    longer: "72 meses",
    talk: "Hablar con un dealer",
    restart: "Empezar de nuevo",
    other: "Otro carro",
    hint: (extra, monthly) => `${extra} más de enganche lo deja cerca de ${monthly}/mes.`,
    hintBudget: (max) => `Tu pago mensual cubre carros de hasta unos ${max}.`,
    sheet: {
      title: "Un dealer te llamará",
      sub: "Le mandamos lo que nos dijiste. Sin consulta de crédito. Sin spam.",
      name: "Tu nombre",
      contact: "Teléfono o correo",
      send: "Enviar",
      sent: "Listo. Un dealer te contactará pronto.",
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

function nextStep(result: AdvisorResult | null | undefined, monthlyAsked: boolean, carAsked: boolean): Step {
  if (!result) return "credit";
  if (result.missing.includes("credit")) return "credit";
  if (result.missing.includes("down")) return "down";
  if (result.missing.includes("vehicle")) return monthlyAsked ? "car" : "monthly";
  if (!result.profile.desiredVehicle && !carAsked) return "car";
  if (result.cards.length === 0) return "car";
  return "done";
}

export function Chat({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "assistant", text: t.greeting }]);
  const [profile, setProfile] = useState<BuyerProfile>({});
  const [step, setStep] = useState<Step>("credit");
  const [monthlyAsked, setMonthlyAsked] = useState(false);
  const [carAsked, setCarAsked] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, step, sheet]);

  async function send(text: string, display?: string, flags: { monthly?: boolean; car?: boolean } = {}) {
    const clean = text.trim();
    if (!clean || busy) return;
    const askedMonthly = monthlyAsked || !!flags.monthly;
    const askedCar = carAsked || !!flags.car;
    if (flags.monthly) setMonthlyAsked(true);
    if (flags.car) setCarAsked(true);
    const next: Msg[] = [...msgs, { id: Date.now(), role: "user", text: display ?? clean }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const turns = next.filter((m) => m.id !== 0).map((m) => ({ role: m.role, text: m.text }));
      turns[turns.length - 1] = { role: "user", text: clean };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, profile, turns }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { text: string; result: AdvisorResult | null };
      if (data.result?.profile) setProfile(data.result.profile);
      const s = nextStep(data.result, askedMonthly || data.result?.profile.monthlyBudget !== undefined, askedCar);
      setStep(s);
      // The engine's own question is replaced by the tap prompt so the buyer
      // never reads the same ask twice.
      const done = s === "done";
      // With cards on screen the numbers are the message; prose only when there is nothing to show.
      const text = done && !(data.result && data.result.cards.length > 0) ? data.text : "";
      const result = data.result && !done ? { ...data.result, cards: [] } : data.result;
      setMsgs((m) => [...m, { id: Date.now() + 1, role: "assistant", text, result }]);
    } catch {
      setMsgs((m) => [...m, { id: Date.now() + 2, role: "assistant", text: t.error }]);
    } finally {
      setBusy(false);
    }
  }

  function pick(c: Choice) {
    if (c.skip) {
      setMonthlyAsked(true);
      setStep("car");
      return;
    }
    send(c.send ?? c.label, c.label, { monthly: step === "monthly", car: step === "car" });
  }

  function restart() {
    setMsgs([{ id: 0, role: "assistant", text: t.greeting }]);
    setProfile({});
    setStep("credit");
    setMonthlyAsked(false);
    setCarAsked(false);
    setSheet(false);
  }

  const last = [...msgs].reverse().find((m) => m.result && m.result.cards.length > 0)?.result ?? null;
  const hero = last ? (last.cards.find((c) => c.primary) ?? last.cards[0]) : null;
  const down = profile.downPayment ?? 0;
  const bump = down < 1000 ? 1000 : down < 3000 ? 2000 : 3000;

  return (
    <div className="chat">
      <div className="thread" role="log" aria-live="polite" aria-relevant="additions">
        {msgs.map((m) => (
          <div key={m.id} className={`turn ${m.role}`}>
            {m.text && <div className={`bubble ${m.role}`} data-testid={`msg-${m.role}`}>{m.text}</div>}
            {m.result && m.result.cards.length > 0 && <Results result={m.result} locale={locale} t={t} />}
          </div>
        ))}
        {busy && (
          <div className="turn assistant"><div className="bubble assistant typing" aria-label={t.thinking}><span /><span /><span /></div></div>
        )}

        {!busy && step !== "done" && (
          <div className="turn assistant ask" data-testid={`ask-${step}`}>
            <div className="bubble assistant" data-testid="msg-assistant">{t.ask[step]}</div>
            <div className="choices" role="group" aria-label={t.ask[step]}>
              {t.choices[step].map((c) => (
                <button key={c.label} type="button" className={`choice ${c.skip ? "quiet" : ""}`} data-testid="choice" data-value={c.send ?? "skip"} onClick={() => pick(c)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!busy && step === "done" && hero && (
          <div className="turn assistant">
            <div className="choices" role="group" aria-label="Next">
              <button type="button" className="choice primary" data-testid="talk" onClick={() => setSheet(true)}>{t.talk}</button>
              {hero.fit.fit !== "likely" && (
                <button type="button" className="choice" onClick={() => send(locale === "es" ? `$${(down + bump).toLocaleString("en-US")} de enganche` : `$${(down + bump).toLocaleString("en-US")} down`, `+${money(bump, locale)} ${t.more}`)}>
                  +{money(bump, locale)} {t.more}
                </button>
              )}
              {(profile.termMonths ?? 60) < 72 && (
                <button type="button" className="choice" onClick={() => send("72 months", t.longer)}>{t.longer}</button>
              )}
              <button type="button" className="choice" onClick={() => { setStep("car"); }}>{t.other}</button>
              <button type="button" className="choice quiet" onClick={restart}>{t.restart}</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {sheet && hero && (
        <InquirySheet locale={locale} t={t} hero={hero} profile={profile} onClose={() => setSheet(false)} onSent={() => {
          setSheet(false);
          setMsgs((m) => [...m, { id: Date.now() + 3, role: "assistant", text: t.sheet.sent }]);
        }} />
      )}

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          autoComplete="off"
          enterKeyHint="send"
          data-testid="composer"
        />
        <button type="submit" className="sendbtn" disabled={busy || !input.trim()} aria-label={t.send} data-testid="send">↑</button>
      </form>
    </div>
  );
}

type Copy = (typeof copy)["en"];

function hintFor(r: AdvisorResult, hero: VehicleCard, locale: Locale, t: Copy): string | undefined {
  const down = r.profile.downPayment ?? 0;
  if (hero.primary && hero.fit.fit !== "likely" && r.downToReach && r.downToReach > down && r.profile.monthlyBudget) {
    return t.hint(money(r.downToReach - down, locale), money(r.profile.monthlyBudget, locale));
  }
  if (!hero.primary && r.maxPrice) return t.hintBudget(money(r.maxPrice, locale));
  return undefined;
}

function Results({ result, locale, t }: { result: AdvisorResult; locale: Locale; t: Copy }) {
  const hero = result.cards.find((c) => c.primary) ?? result.cards[0];
  const rest = result.cards.filter((c) => c !== hero);
  return (
    <div className="cards" data-testid="cards">
      <Hero card={hero} locale={locale} t={t} hint={hintFor(result, hero, locale, t)} />
      {rest.length > 0 && (
        <div className="swipe" data-testid="alts">
          {rest.map((c) => <Alt key={c.id} card={c} locale={locale} t={t} />)}
        </div>
      )}
      <p className="fineprint">{t.estimate}</p>
    </div>
  );
}

function Hero({ card, locale, t, hint }: { card: VehicleCard; locale: Locale; t: Copy; hint?: string }) {
  const e = card.estimate;
  const reasons = card.fit.reasons.map((r) => t.reasons[r] ?? r);
  return (
    <div className={`hero-card ${card.fit.fit}`} data-testid="fitcard" data-fit={card.fit.fit}>
      <div className="hero-top">
        <span className={`fitpill ${card.fit.fit}`}>{t.fit[card.fit.fit]}</span>
        <span className="hero-title">{card.title}</span>
      </div>
      <div className="hero-pay">
        {money(e.paymentLow, locale)}<span className="dash">–</span>{money(e.paymentHigh, locale)}<span className="unit">{t.perMonth}</span>
      </div>
      <div className="hero-sub">{money(Math.max(0, e.outTheDoor - e.financed), locale)} {t.down} · {e.termMonths} {t.months} · {t.asking} {money(card.priceLow, locale)}–{money(card.priceHigh, locale)}</div>
      {hint && <div className="hero-hint">{hint}</div>}
      {reasons.length > 0 && (
        <details className="why">
          <summary>{t.why}</summary>
          <ul>{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

function Alt({ card, locale, t }: { card: VehicleCard; locale: Locale; t: Copy }) {
  const e = card.estimate;
  return (
    <div className={`alt ${card.fit.fit}`} data-testid="fitcard" data-fit={card.fit.fit}>
      <span className={`fitpill ${card.fit.fit}`}>{t.fit[card.fit.fit]}</span>
      <div className="alt-pay">{money(e.paymentLow, locale)}–{money(e.paymentHigh, locale)}<span className="unit">{t.perMonth}</span></div>
      <div className="alt-title">{card.title}</div>
    </div>
  );
}

function InquirySheet({ locale, t, hero, profile, onClose, onSent }: { locale: Locale; t: Copy; hero: VehicleCard; profile: BuyerProfile; onClose: () => void; onSent: () => void }) {
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
        <input type="hidden" name="downPayment" value={profile.downPayment ?? 0} />
        <input type="hidden" name="creditBand" value={profile.creditBand ?? (profile.creditScore ? String(profile.creditScore) : "")} />
        <input name="name" placeholder={t.sheet.name} aria-label={t.sheet.name} autoComplete="name" required data-testid="inq-name" />
        <input name="contact" placeholder={t.sheet.contact} aria-label={t.sheet.contact} autoComplete="tel" inputMode="email" required data-testid="inq-contact" />
        {err && <p className="error small">{t.sheet.fail}</p>}
        <button type="submit" className="btn primary wide" disabled={pending} data-testid="inq-send">{t.sheet.send}</button>
        <button type="button" className="btn quiet wide" onClick={onClose}>{t.sheet.cancel}</button>
      </form>
    </div>
  );
}
