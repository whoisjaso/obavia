"use client";

import { useActionState } from "react";
import type { Locale } from "@/lib/domain/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createWorkspace, type ActionResult } from "@/app/actions";

export function NewWorkspaceForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createWorkspace, null);
  const err = state && !state.ok ? state.error : null;
  const msg = err ? (t.newWorkspace.errors as Record<string, string>)[err] ?? t.common.error : null;
  return (
    <form action={action} className="stack" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {msg && (
        <p role="alert" className="error" id="form-error" data-testid="form-error">{msg}</p>
      )}
      <div className="field">
        <label htmlFor="vin">{t.newWorkspace.vin}</label>
        <input id="vin" name="vin" maxLength={17} autoCapitalize="characters" required aria-invalid={err === "vin"} aria-describedby={err === "vin" ? "form-error" : "vin-help"} />
        <span className="help" id="vin-help">{t.newWorkspace.vinHelp}</span>
      </div>
      <div className="field">
        <label htmlFor="buyerName">{t.newWorkspace.buyerName}</label>
        <input id="buyerName" name="buyerName" autoComplete="off" required aria-invalid={err === "name"} />
      </div>
      <div className="field">
        <label htmlFor="buyerPhone">{t.newWorkspace.buyerPhone}</label>
        <input id="buyerPhone" name="buyerPhone" type="tel" inputMode="tel" aria-invalid={err === "contact"} />
      </div>
      <div className="field">
        <label htmlFor="buyerEmail">{t.newWorkspace.buyerEmail}</label>
        <input id="buyerEmail" name="buyerEmail" type="email" inputMode="email" aria-invalid={err === "contact"} />
      </div>
      <div className="field">
        <label htmlFor="buyerLocale">{t.newWorkspace.buyerLocale}</label>
        <select id="buyerLocale" name="buyerLocale" defaultValue={locale}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="saleType">{t.newWorkspace.saleType}</label>
        <select id="saleType" name="saleType" defaultValue="cash_retail" disabled>
          <option value="cash_retail">{t.newWorkspace.cashRetail}</option>
        </select>
      </div>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? t.common.loading : t.newWorkspace.submit}
      </button>
    </form>
  );
}
