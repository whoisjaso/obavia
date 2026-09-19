import { notFound } from "next/navigation";
import type { CheckVerdict, DocumentKind, Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentStaffId } from "@/lib/auth";
import * as store from "@/lib/store/memory";
import { StateGrid } from "@/components/StateGrid";
import { recordDeliveryAction, runPacketCheck, sendInvite, uploadDocument, uploadRegistrationEvidence } from "@/app/actions";
import { headers } from "next/headers";

const verdictTone: Record<CheckVerdict, "ok" | "warn" | "bad"> = {
  NO_KNOWN_BLOCKER: "ok",
  REVIEW_REQUIRED: "warn",
  BLOCKING_ISSUE_DETECTED: "bad",
};

const DOC_KINDS: DocumentKind[] = ["form_130u", "bill_of_sale", "odometer", "title_front", "title_back", "id_redacted", "other"];

export default async function DealPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const t = getDictionary(locale);
  const staff = await currentStaffId();
  let deal;
  try {
    deal = store.getDealForStaff(staff, id);
  } catch {
    notFound(); // AC-1: cross-tenant URL yields nothing, not a hint
  }
  const docs = store.listDocuments(deal.id);
  const check = store.getCheck(deal.lastCheckId);
  const rel = store.getRelationshipForDeal(deal.id);
  const deliveries = store.listDeliveries(deal.id);
  const regEvidence = store.listRegEvidence(deal.id);
  const audit = store.listAudit(deal.id);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = rel && rel.status === "invited" ? `${proto}://${host}/${deal.buyer.preferredLocale}/c/${rel.inviteToken}` : null;
  const vehicleLabel = [deal.vehicle.year, deal.vehicle.make, deal.vehicle.model].filter(Boolean).join(" ") || deal.vehicle.vin;

  return (
    <>
      <h1>{deal.buyer.name}</h1>
      <p className="muted">{vehicleLabel} · <code>{deal.vehicle.vin}</code>{deal.vehicle.decodeSource === "manual" ? " · manual VIN entry" : ""}</p>

      <section className="card" aria-labelledby="states-h">
        <h2 id="states-h">{t.deal.states}</h2>
        <StateGrid states={deal.states} t={t} />
      </section>

      <section className="card stack" aria-labelledby="packet-h">
        <h2 id="packet-h">{t.deal.packet}</h2>
        {docs.length === 0 ? <p className="muted" data-testid="packet-empty">—</p> : (
          <ul className="list" data-testid="packet-list">
            {docs.map((d) => (
              <li key={d.id}>
                <strong>{t.docKinds[d.kind]}</strong> · v{d.version} · {d.fileName}
                <div className="small muted"><code>{d.sha256.slice(0, 12)}</code>{d.executed ? " · executed (immutable)" : ""}</div>
              </li>
            ))}
          </ul>
        )}
        <form action={uploadDocument} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="dealId" value={deal.id} />
          <div className="field">
            <label htmlFor="kind">{t.deal.kind}</label>
            <select id="kind" name="kind" defaultValue="form_130u">
              {DOC_KINDS.map((k) => <option key={k} value={k}>{t.docKinds[k]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fileName">{t.deal.file}</label>
            <input id="fileName" name="fileName" required placeholder="130u-page1.jpg" />
          </div>
          <button className="btn" type="submit">{t.deal.uploadSubmit}</button>
        </form>
        <form action={runPacketCheck}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="dealId" value={deal.id} />
          <button className="btn primary" type="submit" data-testid="run-check">{t.deal.runCheck}</button>
        </form>
        {check ? (
          <div className={`verdict ${verdictTone[check.verdict]}`} data-testid="verdict" data-verdict={check.verdict}>
            <div style={{ fontWeight: 700 }}>{t.verdict[check.verdict]}</div>
            <div className="small muted">{t.deal.lastCheck}: {new Date(check.ranAt).toLocaleString(locale)} · {check.ruleSetVersion}</div>
            <p className="small muted">{t.verdict.disclaimer}</p>
            <h3 className="small">{t.deal.findings}</h3>
            <ul className="list">
              {check.findings.map((f) => (
                <li key={f.ruleId}>
                  <span className={`pill ${f.status === "pass" ? "ok" : f.status === "review" ? "warn" : f.status === "blocker" ? "bad" : ""}`}>{f.status}</span>{" "}
                  <code>{f.ruleId}</code>
                  <div className="small">{f.evidence}</div>
                  {f.question && <div className="small"><strong>{t.deal.question}:</strong> {f.question}</div>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted" data-testid="no-check">{t.deal.noCheck}</p>
        )}
      </section>

      <section className="card stack" aria-labelledby="rel-h">
        <h2 id="rel-h">{t.deal.relationship}</h2>
        {rel ? (
          <p data-testid="relationship-status" data-status={rel.status}>
            <span className={`pill ${rel.status === "accepted" ? "ok" : rel.status === "invited" ? "warn" : "bad"}`}>{t.relationship[rel.status]}</span>{" "}
            <span className="small muted">{new Date(rel.invitedAt).toLocaleString(locale)} · {rel.inviteChannel}</span>
          </p>
        ) : (
          <p className="muted">—</p>
        )}
        {inviteUrl && (
          <p className="small">
            {t.deal.inviteLink}: <a href={inviteUrl} data-testid="invite-link">{inviteUrl}</a>
          </p>
        )}
        <form action={sendInvite}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="dealId" value={deal.id} />
          <p className="small muted">{t.deal.inviteHelp}</p>
          <button className="btn" type="submit" data-testid="send-invite">{t.deal.invite}</button>
        </form>
      </section>

      <section className="card stack" aria-labelledby="dlv-h">
        <h2 id="dlv-h">{t.deal.delivery}</h2>
        {deliveries.map((d) => (
          <p key={d.id} className="small">{new Date(d.at).toLocaleString(locale)} · {t.evidence[d.evidenceClass]}{d.note ? ` · ${d.note}` : ""}</p>
        ))}
        {deal.states.delivery !== "delivered" && (
          <form action={recordDeliveryAction} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="dealId" value={deal.id} />
            <div className="field">
              <label htmlFor="evidenceClass">{t.deal.evidenceClass}</label>
              <select id="evidenceClass" name="evidenceClass" defaultValue="signed_receipt">
                <option value="photo">{t.evidence.photo}</option>
                <option value="signed_receipt">{t.evidence.signed_receipt}</option>
                <option value="dealer_attestation">{t.evidence.dealer_attestation}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="note">Note</label>
              <input id="note" name="note" />
            </div>
            <label className="row" style={{ fontWeight: 400 }}>
              <input type="checkbox" name="confirm" required />
              <span className="small">{t.deal.deliveryConfirm}</span>
            </label>
            <button className="btn primary" type="submit" data-testid="record-delivery">{t.deal.recordDelivery}</button>
          </form>
        )}
      </section>

      <section className="card stack" aria-labelledby="reg-h">
        <h2 id="reg-h">{t.deal.registration}</h2>
        <p className="small muted">{t.deal.regHelp}</p>
        {regEvidence.map((r) => (
          <p key={r.id} className="small">{new Date(r.at).toLocaleString(locale)} · {t.regEvidence[r.kind]} · {r.fileName}</p>
        ))}
        <form action={uploadRegistrationEvidence} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="dealId" value={deal.id} />
          <div className="field">
            <label htmlFor="regKind">{t.deal.evidenceClass}</label>
            <select id="regKind" name="kind" defaultValue="webdealer_receipt">
              <option value="webdealer_receipt">{t.regEvidence.webdealer_receipt}</option>
              <option value="county_receipt">{t.regEvidence.county_receipt}</option>
              <option value="other">{t.regEvidence.other}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="regFile">{t.deal.file}</label>
            <input id="regFile" name="fileName" required placeholder="webdealer-receipt.pdf" />
          </div>
          <button className="btn" type="submit" data-testid="upload-reg-evidence" disabled={deal.states.registration === "not_ready"}>{t.deal.uploadRegEvidence}</button>
        </form>
        {deal.reviewEligibleAt && <p className="small muted" data-testid="review-eligible">{t.deal.reviewEligibility}</p>}
      </section>

      <section className="card" aria-labelledby="audit-h">
        <h2 id="audit-h">{t.deal.audit}</h2>
        <ul className="list small" data-testid="audit-list">
          {audit.map((a) => (
            <li key={a.id}><code>{a.action}</code> · {new Date(a.at).toLocaleString(locale)} · {a.actorId}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
