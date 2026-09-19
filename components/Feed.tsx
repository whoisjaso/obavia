"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/domain/types";
import type { VehicleCard } from "@/lib/fit/advisor";

// Full-screen vertical feed: one vehicle per screen, swipe up for the next.
// Heart saves (browser-local until accounts exist). Every number is the
// engine's; this file only lays it out with air around it.

export type Body = VehicleCard["body"];
type Fit = VehicleCard["fit"]["fit"];

const copy: Record<Locale, { saved: string; save: string; pass: string; talk: string; contacted: string; perMonth: string; asks: string; fit: Record<Fit, string>; end: string; endSub: string; empty: string; remove: string; swipe: string }> = {
  en: { saved: "Saved", save: "Save", pass: "Pass", talk: "Talk to a dealer", contacted: "Dealer notified", perMonth: "/mo", asks: "asks", fit: { likely: "Likely", stretch: "Maybe", unlikely: "Unlikely" }, end: "That's everything that fits", endSub: "Your saves are up top.", empty: "Nothing saved yet.", remove: "Remove", swipe: "Swipe up" },
  es: { saved: "Guardados", save: "Guardar", pass: "Pasar", talk: "Hablar con un dealer", contacted: "Dealer avisado", perMonth: "/mes", asks: "pide", fit: { likely: "Probable", stretch: "Quizás", unlikely: "Poco probable" }, end: "Eso es todo lo que te alcanza", endSub: "Tus guardados están arriba.", empty: "Nada guardado aún.", remove: "Quitar", swipe: "Desliza" },
};

const money = (n: number, l: Locale) => new Intl.NumberFormat(l === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };
const KEY = "obavia.saved.v1";

interface Saved { card: VehicleCard; savedAt: string; contacted?: boolean }
function loadSaved(): Saved[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Saved[]; } catch { return []; } }
function storeSaved(s: Saved[]) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }

export function Feed({ cards, locale, onTalk, renderIcon, renderRing, hero }: {
  cards: VehicleCard[];
  locale: Locale;
  onTalk: (card: VehicleCard) => void;
  renderIcon: (body: Body, size: number) => React.ReactNode;
  renderRing: (value: number, size: number, fit: Fit) => React.ReactNode;
  hero: React.ReactNode; // the first screen: the buyer's own verdict
}) {
  const t = copy[locale];
  const [saved, setSaved] = useState<Saved[]>([]);
  const [passed, setPassed] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [pop, setPop] = useState<string | null>(null);
  useEffect(() => { setSaved(loadSaved()); }, []);

  const isSaved = (id: string) => saved.some((s) => s.card.id === id);
  function toggleSave(card: VehicleCard) {
    if (isSaved(card.id)) { const next = saved.filter((s) => s.card.id !== card.id); setSaved(next); storeSaved(next); buzz(8); return; }
    const next = [{ card, savedAt: new Date().toISOString() }, ...saved];
    setSaved(next); storeSaved(next); buzz([15, 30, 15]);
    setPop(card.id); window.setTimeout(() => setPop(null), 500);
  }
  function pass(card: VehicleCard) { buzz(10); setPassed((p) => [...p, card.id]); }
  function markContacted(id: string) { const next = saved.map((s) => (s.card.id === id ? { ...s, contacted: true } : s)); setSaved(next); storeSaved(next); }

  const visible = cards.filter((c) => !passed.includes(c.id));

  return (
    <div className="feed" data-testid="feed">
      <button type="button" className="saved-pill" data-testid="tab-saved" onClick={() => setShowSaved(true)} aria-label={t.saved}>
        ♥ {saved.length}
      </button>

      <section className="post hero-post" data-testid="post-hero">{hero}</section>

      {visible.map((c, k) => (
        <section key={c.id} className={`post ${c.fit.fit}`} data-testid="post" data-id={c.id} data-fit={c.fit.fit}>
          <div className={`post-art ${c.body}`}>{renderIcon(c.body, 96)}</div>
          <div className="post-ring">{renderRing(c.fit.score, 120, c.fit.fit)}</div>
          <div className={`verdict-word ${c.fit.fit}`}>{t.fit[c.fit.fit]}</div>
          <div className="post-pay">{money(c.estimate.paymentLow, locale)}–{money(c.estimate.paymentHigh, locale)}<span className="unit">{t.perMonth}</span></div>
          <div className="post-title">{c.title}</div>
          <div className="post-sub">{t.asks} {money(c.priceLow, locale)}–{money(c.priceHigh, locale)}</div>
          <div className="post-actions">
            <button type="button" className={`act ${isSaved(c.id) ? "on" : ""} ${pop === c.id ? "pop" : ""}`} aria-pressed={isSaved(c.id)} aria-label={t.save} data-testid="save" onClick={() => toggleSave(c)}>♥</button>
            <button type="button" className="act" aria-label={t.pass} data-testid="pass" onClick={() => pass(c)}>✕</button>
          </div>
          {k === 0 && <div className="swipe-hint" aria-hidden>{t.swipe} ↑</div>}
        </section>
      ))}

      <section className="post end" data-testid="feed-end">
        <div className="check big" aria-hidden>✓</div>
        <h2>{t.end}</h2>
        <p className="muted">{t.endSub}</p>
      </section>

      {showSaved && (
        <div className="scrim" role="presentation" onClick={() => setShowSaved(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t.saved} data-testid="saved" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" aria-hidden />
            <h2>{t.saved}</h2>
            {saved.length === 0 && <p className="muted">{t.empty}</p>}
            {saved.map((s) => (
              <div key={s.card.id} className="srow" data-testid="saved-row">
                <div className={`sicon ${s.card.body}`}>{renderIcon(s.card.body, 28)}</div>
                <div className="sbody">
                  <div className="alt-pay">{money(s.card.estimate.paymentLow, locale)}–{money(s.card.estimate.paymentHigh, locale)}<span className="unit">{t.perMonth}</span></div>
                  <div className="alt-title">{s.card.title}</div>
                </div>
                {s.contacted ? <span className="fitpill likely">{t.contacted}</span> : (
                  <button type="button" className="chip on" onClick={() => { markContacted(s.card.id); setShowSaved(false); onTalk(s.card); }}>{t.talk}</button>
                )}
                <button type="button" className="unsave" aria-label={t.remove} onClick={() => toggleSave(s.card)}>♥</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
