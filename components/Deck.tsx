"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/domain/types";
import type { VehicleCard } from "@/lib/fit/advisor";

// Swipe deck: one vehicle at a time. Right or heart = save, left or X = pass.
// Saves live in this browser only (localStorage) until accounts exist.
// Numbers on every card come from the engine; this file only shows them.

export type Body = VehicleCard["body"];

const copy: Record<Locale, {
  picks: string; saved: string; pass: string; save: string; done: string; doneSub: string; again: string; talk: string; contacted: string;
  perMonth: string; asks: string; fit: Record<"likely" | "stretch" | "unlikely", string>; empty: string; seen: (n: number, total: number) => string;
}> = {
  en: {
    picks: "Picks", saved: "Saved", pass: "Pass", save: "Save", done: "That's your deck", doneSub: "Your saves are one tap away.", again: "Run it back", talk: "Talk to a dealer", contacted: "Dealer notified",
    perMonth: "/mo", asks: "asks", fit: { likely: "Likely", stretch: "Maybe", unlikely: "Unlikely" }, empty: "Nothing saved yet. Swipe right on one you like.", seen: (n, t) => `${n} of ${t}`,
  },
  es: {
    picks: "Opciones", saved: "Guardados", pass: "Pasar", save: "Guardar", done: "Se acabó el mazo", doneSub: "Tus guardados están a un toque.", again: "Otra vuelta", talk: "Hablar con un dealer", contacted: "Dealer avisado",
    perMonth: "/mes", asks: "pide", fit: { likely: "Probable", stretch: "Quizás", unlikely: "Poco probable" }, empty: "Nada guardado aún. Desliza a la derecha uno que te guste.", seen: (n, t) => `${n} de ${t}`,
  },
};

const money = (n: number, l: Locale) => new Intl.NumberFormat(l === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };
const KEY = "obavia.saved.v1";

interface Saved { card: VehicleCard; savedAt: string; contacted?: boolean }

function loadSaved(): Saved[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Saved[]; } catch { return []; }
}
function storeSaved(s: Saved[]) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function Deck({ cards, locale, onTalk, renderIcon, renderRing }: {
  cards: VehicleCard[];
  locale: Locale;
  onTalk: (card: VehicleCard) => void;
  renderIcon: (body: Body, size: number) => React.ReactNode;
  renderRing: (value: number, size: number) => React.ReactNode;
}) {
  const t = copy[locale];
  const [tab, setTab] = useState<"picks" | "saved">("picks");
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [fly, setFly] = useState<"left" | "right" | null>(null);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => { setSaved(loadSaved()); }, []);
  useEffect(() => { setI(0); }, [cards]);

  const card = cards[i];
  const total = cards.length;

  function decide(dir: "left" | "right") {
    if (!card || fly) return;
    buzz(dir === "right" ? [15, 30, 15] : 10);
    setFly(dir);
    if (dir === "right") {
      const next = [{ card, savedAt: new Date().toISOString() }, ...saved.filter((s) => s.card.id !== card.id)];
      setSaved(next); storeSaved(next);
    }
    window.setTimeout(() => { setFly(null); setDrag(0); setI((n) => n + 1); }, 260);
  }
  function onDown(e: React.PointerEvent) { startX.current = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); }
  function onMove(e: React.PointerEvent) { if (startX.current !== null) setDrag(e.clientX - startX.current); }
  function onUp() {
    if (startX.current === null) return;
    const d = drag; startX.current = null;
    if (d > 90) decide("right"); else if (d < -90) decide("left"); else setDrag(0);
  }
  function markContacted(id: string) {
    const next = saved.map((s) => (s.card.id === id ? { ...s, contacted: true } : s));
    setSaved(next); storeSaved(next);
  }
  function unsave(id: string) {
    const next = saved.filter((s) => s.card.id !== id);
    setSaved(next); storeSaved(next);
  }

  const x = fly === "right" ? 600 : fly === "left" ? -600 : drag;
  const rot = x / 18;
  const lean = drag > 30 ? "yes" : drag < -30 ? "no" : "";

  return (
    <div className="deck" data-testid="deck">
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "picks"} className={tab === "picks" ? "on" : ""} onClick={() => setTab("picks")} data-testid="tab-picks">
          {t.picks} <span className="count">{Math.max(0, total - i)}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")} data-testid="tab-saved">
          {t.saved} <span className="count">{saved.length}</span>
        </button>
      </div>

      {tab === "picks" && (
        card ? (
          <>
            <div className="deck-progress" aria-hidden>
              {cards.map((c, k) => <span key={c.id} className={k < i ? "done" : k === i ? "now" : ""} />)}
            </div>
            <div className="swipe-stack">
              {cards[i + 1] && <div className="vcard under" aria-hidden><div className={`vcard-art ${cards[i + 1].body}`}>{renderIcon(cards[i + 1].body, 120)}</div></div>}
              <div
                className={`vcard ${lean} ${fly ? "fly" : ""}`}
                style={{ transform: `translateX(${x}px) rotate(${rot}deg)`, transition: fly || drag === 0 ? "transform 0.26s cubic-bezier(0.2,0.8,0.2,1)" : "none" }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                data-testid="vcard" data-id={card.id} data-fit={card.fit.fit}
              >
                <div className={`vcard-art ${card.body}`}>
                  {renderIcon(card.body, 120)}
                  <span className="stamp yes">{t.save}</span>
                  <span className="stamp no">{t.pass}</span>
                </div>
                <div className="vcard-body">
                  <div className="vcard-row">
                    <div>
                      <div className="vcard-pay">{money(card.estimate.paymentLow, locale)}–{money(card.estimate.paymentHigh, locale)}<span className="unit">{t.perMonth}</span></div>
                      <div className="vcard-title">{card.title}</div>
                      <div className="vcard-sub">{t.asks} {money(card.priceLow, locale)}–{money(card.priceHigh, locale)}</div>
                    </div>
                    {renderRing(card.fit.score, 64)}
                  </div>
                </div>
              </div>
            </div>
            <div className="deck-actions">
              <button type="button" className="round no" aria-label={t.pass} data-testid="pass" onClick={() => decide("left")}>✕</button>
              <span className="seen">{t.seen(i + 1, total)}</span>
              <button type="button" className="round yes" aria-label={t.save} data-testid="save" onClick={() => decide("right")}>♥</button>
            </div>
          </>
        ) : (
          <div className="deck-done" data-testid="deck-done">
            <div className="check big" aria-hidden>✓</div>
            <h2>{t.done}</h2>
            <p className="muted">{t.doneSub}</p>
            <button type="button" className="cta" onClick={() => setTab("saved")}>{t.saved} · {saved.length}</button>
            <button type="button" className="ghost" onClick={() => setI(0)}>{t.again}</button>
          </div>
        )
      )}

      {tab === "saved" && (
        <div className="saved" data-testid="saved">
          {saved.length === 0 && <p className="muted">{t.empty}</p>}
          {saved.map((s) => (
            <div key={s.card.id} className="srow" data-testid="saved-row">
              <div className={`sicon ${s.card.body}`}>{renderIcon(s.card.body, 36)}</div>
              <div className="sbody">
                <div className="alt-pay">{money(s.card.estimate.paymentLow, locale)}–{money(s.card.estimate.paymentHigh, locale)}<span className="unit">{t.perMonth}</span></div>
                <div className="alt-title">{s.card.title}</div>
              </div>
              {s.contacted ? (
                <span className="fitpill likely">{t.contacted}</span>
              ) : (
                <button type="button" className="chip on" onClick={() => { markContacted(s.card.id); onTalk(s.card); }}>{t.talk}</button>
              )}
              <button type="button" className="unsave" aria-label="Remove" onClick={() => unsave(s.card.id)}>♥</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
