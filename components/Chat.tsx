"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/domain/types";
import type { AdvisorResult, VehicleCard } from "@/lib/fit/advisor";
import type { BuyerProfile } from "@/lib/fit/engine";

interface Msg { id: number; role: "user" | "assistant"; text: string; result?: AdvisorResult | null }

const copy: Record<Locale, {
  greeting: string; placeholder: string; send: string; chips: string[]; estimate: string; notListing: string;
  fit: Record<"likely" | "stretch" | "unlikely", string>; perMonth: string; down: string; asking: string; talk: string; thinking: string; error: string;
}> = {
  en: {
    greeting: "Tell me about your situation and what you want to drive. For example: 700 credit score, $600 down, and I want a Tesla Model 3.",
    placeholder: "Credit, down payment, and the car you want",
    send: "Send",
    chips: ["700 score, $600 down, Tesla Model 3", "Bad credit, $2k down, $350 a month", "Good credit, what can I get for $400 a month?"],
    estimate: "Estimates from what you told us. Not a credit decision or an offer.",
    notListing: "Houston-area asking range, not a live listing",
    fit: { likely: "Realistic", stretch: "A stretch", unlikely: "Unlikely as is" },
    perMonth: "/mo",
    down: "down",
    asking: "Typically asks",
    talk: "Talk to a dealer",
    thinking: "Running the numbers",
    error: "Something went wrong. Try again.",
  },
  es: {
    greeting: "Cuéntame tu situación y qué te gustaría manejar. Por ejemplo: crédito de 700, $600 de enganche y quiero un Tesla Model 3.",
    placeholder: "Crédito, enganche y el carro que quieres",
    send: "Enviar",
    chips: ["Puntaje 700, $600 de enganche, Tesla Model 3", "Mal crédito, $2k de enganche, $350 al mes", "Buen crédito, ¿qué me alcanza con $400 al mes?"],
    estimate: "Estimaciones con lo que nos dijiste. No es una decisión de crédito ni una oferta.",
    notListing: "Rango de precio en Houston, no un anuncio en vivo",
    fit: { likely: "Realista", stretch: "Está justo", unlikely: "Poco probable así" },
    perMonth: "/mes",
    down: "de enganche",
    asking: "Suele pedirse",
    talk: "Hablar con un dealer",
    thinking: "Haciendo los números",
    error: "Algo salió mal. Inténtalo de nuevo.",
  },
};

const money = (n: number, l: Locale) => new Intl.NumberFormat(l === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function Chat({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "assistant", text: t.greeting }]);
  const [profile, setProfile] = useState<BuyerProfile>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Msg[] = [...msgs, { id: Date.now(), role: "user", text: clean }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, profile, turns: next.filter((m) => m.id !== 0).map((m) => ({ role: m.role, text: m.text })) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { text: string; result: AdvisorResult | null };
      if (data.result?.profile) setProfile(data.result.profile);
      setMsgs((m) => [...m, { id: Date.now() + 1, role: "assistant", text: data.text, result: data.result }]);
    } catch {
      setMsgs((m) => [...m, { id: Date.now() + 2, role: "assistant", text: t.error }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const showChips = msgs.length === 1;

  return (
    <div className="chat">
      <div className="thread" role="log" aria-live="polite" aria-relevant="additions">
        {msgs.map((m) => (
          <div key={m.id} className={`turn ${m.role}`}>
            <div className={`bubble ${m.role}`} data-testid={`msg-${m.role}`}>{m.text}</div>
            {m.result && m.result.cards.length > 0 && (
              <div className="cards" data-testid="cards">
                {m.result.cards.map((c) => <FitCard key={c.id} card={c} locale={locale} t={t} />)}
                <p className="fineprint">{t.estimate}</p>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="turn assistant"><div className="bubble assistant typing" aria-label={t.thinking}><span /><span /><span /></div></div>
        )}
        <div ref={endRef} />
      </div>

      {showChips && (
        <div className="chips" aria-label="Examples">
          {t.chips.map((c) => (
            <button key={c} type="button" className="chip" onClick={() => send(c)}>{c}</button>
          ))}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          autoComplete="off"
          enterKeyHint="send"
          data-testid="composer"
        />
        <button type="submit" className="sendbtn" disabled={busy || !input.trim()} aria-label={t.send} data-testid="send">
          ↑
        </button>
      </form>
    </div>
  );
}

function FitCard({ card, locale, t }: { card: VehicleCard; locale: Locale; t: (typeof copy)["en"] }) {
  const e = card.estimate;
  return (
    <div className={`fitcard ${card.fit.fit}`} data-testid="fitcard" data-fit={card.fit.fit}>
      <div className="fitcard-head">
        <div className="fitcard-title">{card.title}</div>
        <span className={`fitpill ${card.fit.fit}`}>{t.fit[card.fit.fit]}</span>
      </div>
      <div className="fitcard-pay">
        {money(e.paymentLow, locale)}–{money(e.paymentHigh, locale)}<span className="unit">{t.perMonth}</span>
      </div>
      <div className="fitcard-sub">
        {t.asking} {money(card.priceLow, locale)}–{money(card.priceHigh, locale)} · {e.termMonths} mo · {money(Math.max(0, e.outTheDoor - e.financed), locale)} {t.down}
      </div>
      <div className="fitcard-note">{t.notListing}</div>
    </div>
  );
}
