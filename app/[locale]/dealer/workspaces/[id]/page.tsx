import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { CheckVerdict, DocumentKind, Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentStaffId } from "@/lib/auth";
import * as store from "@/lib/store/memory";
import { StateGrid } from "@/components/StateGrid";
import { recordDeliveryAction, runPacketCheck, sendInvite, uploadDocument, uploadRegistrationEvidence } from "@/app/actions";

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
  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <p className="eyebrow">{t.nav.workspaces}</p>
      <h1>{deal.buyer.name}</h1>
      <p className="lede">
        {vehicleLabel}
        {vehicleLabel !== deal.vehicle.vin && <> · <code>{deal.vehicle.vin}</code></>}
      </p>

      <section className="chapter" aria-labelledby="states-h">
        <h2 id="states-h">{t.deal.states}</h2>
        <StateGrid states={deal.states} t={t} />
      </section>

      <section className="chapter" aria-labelledby="packet-h">
        <div className="chapter-head">
          <h2 id="packet-h">{t.deal.packet}</h2>
          <form action={runPacketCheck}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="dealId" value={deal.id} />
            <button className="btn primary" type="submit" data-testid="run-check">{t.deal.runCheck}</button>
          </form>
        </div>
        {docs.length === 0 ? (
          <p className="empty" data-testid="packet-empty">{t.deal.packetEmpty}</p>
        ) : (
          <ul className="list" data-testid="packet-list">
            {docs.map((d) => (
              <li key={d.id} className="row between">
                <span>
                  <strong>{t.docKinds[d.kind]}</strong>
                  <span className="muted"> · {d.fileName}</span>
                </span>
                <span className="small muted">v{d.version}{d.executed ? " · executed" : ""}</span>
              </li>
            ))}
          </ul>
        )}

        {check ? (
          <div className={`verdict ${verdictTone[check.verdict]}`} data-testid="verdict" data-verdict={check.verdict}>
            <div className="line">{t.verdict[check.verdict]}</div>
            <div className="small muted">{t.deal.lastCheck} {fmt(check.ranAt)} · {check.ruleSetVersion}</div>
            <p className="small muted" style={{ marginTop: 6 }}>{t.verdict.disclaimer}</p>
            <h3>{t.deal.findings}</h3>
            <div>
              {check.findings.map((f) => (
                <div className="finding" key={f.ruleId}>
                  <span className={`tag ${f.status}`}>{f.status}</span>
                  <div>
                    <div>{f.evidence}</div>
                    {f.question && <div className="muted">{t.deal.question}: {f.question}</div>}
                    <code>{f.ruleId}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="small muted" data-testid="no-check" style={{ marginTop: 10 }}>{t.deal.noCheck}</p>
        )}

        <h3>{t.deal.upload}</h3>
        <form action={uploadDocument} className="surface stack">
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
      </section>

      <section className="chapter" aria-labelledby="rel-h">
        <h2 id="rel-h">{t.deal.relationship}</h2>
        {rel ? (
          <p data-testid="relationship-status" data-status={rel.status}>
            <span className={`ledger-inline ${rel.status}`} style={{ fontFamily: "var(--serif)", fontSize: "1.2rem" }}>{t.relationship[rel.status]}</span>
            <span className="small muted"> · {fmt(rel.invitedAt)} · {rel.inviteChannel}</span>
          </p>
        ) : (
          <p className="empty">{t.deal.notInvited}</p>
        )}
        {inviteUrl && (
          <p className="small">
            {t.deal.inviteLink}:<br />
            <a href={inviteUrl} data-testid="invite-link">{inviteUrl}</a>
          </p>
        )}
        <form action={sendInvite} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="dealId" value={deal.id} />
          <p className="small muted">{t.deal.inviteHelp}</p>
          <button className="btn" type="submit" data-testid="send-invite">{t.deal.invite}</button>
        </form>
      </section>

      <section className="chapter" aria-labelledby="dlv-h">
        <h2 id="dlv-h">{t.deal.delivery}</h2>
        {deliveries.map((d) => (
          <p key={d.id}>
            <span style={{ fontFamily: "var(--serif)", fontSize: "1.2rem" }}>{t.states.delivery.delivered}</span>
            <span className="small muted"> · {fmt(d.at)} · {t.evidence[d.evidenceClass]}{d.note ? ` · ${d.note}` : ""}</span>
          </p>
        ))}
        {deal.states.delivery !== "delivered" && (
          <form action={recordDeliveryAction} className="surface stack">
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
              <label htmlFor="note">{t.deal.note}</label>
              <input id="note" name="note" />
            </div>
            <label className="check">
              <input type="checkbox" name="confirm" required />
              <span>{t.deal.deliveryConfirm}</span>
            </label>
            <button className="btn primary" type="submit" data-testid="record-delivery">{t.deal.recordDelivery}</button>
          </form>
        )}
      </section>

      <section className="chapter" aria-labelledby="reg-h">
        <h2 id="reg-h">{t.deal.registration}</h2>
        <p className="small muted">{t.deal.regHelp}</p>
        {regEvidence.map((r) => (
          <p key={r.id}>
            <span style={{ fontFamily: "var(--serif)", fontSize: "1.2rem" }}>{t.regEvidence[r.kind]}</span>
            <span className="small muted"> · {fmt(r.at)} · {r.fileName}</span>
          </p>
        ))}
        <form action={uploadRegistrationEvidence} className="surface stack">
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
          {deal.states.registration === "not_ready" && <p className="small muted">{t.deal.regNotReady}</p>}
        </form>
        {deal.reviewEligibleAt && <p className="small muted" data-testid="review-eligible">{t.deal.reviewEligibility}</p>}
      </section>

      <section className="chapter" aria-labelledby="audit-h">
        <h2 id="audit-h">{t.deal.audit}</h2>
        <ul className="list small" data-testid="audit-list">
          {audit.map((a) => (
            <li key={a.id} className="row between">
              <code>{a.action}</code>
              <span className="muted">{fmt(a.at)} · {a.actorId}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
