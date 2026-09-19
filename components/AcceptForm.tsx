"use client";

import { useActionState } from "react";
import type { Locale } from "@/lib/domain/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { respondToInviteAction } from "@/app/actions";

export function AcceptForm({ locale, token, t }: { locale: Locale; token: string; t: Dictionary }) {
  const [state, action, pending] = useActionState<{ error?: string } | null, FormData>(respondToInviteAction, null);
  const err = state?.error;
  if (err === "declined") return <p className="empty" role="status" data-testid="invite-declined">{t.accept.declined}</p>;
  const msg = err === "contact_mismatch" ? t.accept.verifyError : err === "expired" ? t.accept.expired : err === "invalid" ? t.accept.invalid : null;
  return (
    <form action={action} className="stack" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      {msg && <p role="alert" className="error" data-testid="accept-error">{msg}</p>}
      <div className="field">
        <label htmlFor="contact">{t.accept.verify}</label>
        <input id="contact" name="contact" required autoComplete="off" aria-invalid={err === "contact_mismatch"} aria-describedby="contact-help" />
        <span className="help" id="contact-help">{t.accept.verifyHelp}</span>
      </div>
      <div className="row">
        <button className="btn primary" type="submit" name="decision" value="accept" disabled={pending} data-testid="accept">{t.accept.accept}</button>
        <button className="btn quiet" type="submit" name="decision" value="decline" disabled={pending} data-testid="decline">{t.accept.decline}</button>
      </div>
    </form>
  );
}
