import type { Locale } from "@/lib/domain/types";
import { fill, getDictionary } from "@/lib/i18n/dictionaries";
import * as store from "@/lib/store/memory";
import { AcceptForm } from "@/components/AcceptForm";

export default async function AcceptPage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const t = getDictionary(locale);
  const rel = store.getRelationshipByToken(token);
  if (!rel) return <p className="empty" role="alert" data-testid="invite-invalid">{t.accept.invalid}</p>;
  if (rel.status === "declined") return <p className="empty" role="status" data-testid="invite-declined">{t.accept.declined}</p>;
  if (rel.status !== "invited" || rel.expiresAt < new Date().toISOString()) {
    return <p className="empty" role="alert" data-testid="invite-expired">{t.accept.expired}</p>;
  }
  // Nothing about the deal is shown before acceptance except org and vehicle label.
  const deal = store.getDealForStaff(store.TENANT_ZERO_STAFF, rel.dealId) ?? null;
  const org = store.getOrg(rel.orgId);
  const vehicle = deal ? [deal.vehicle.year, deal.vehicle.make, deal.vehicle.model].filter(Boolean).join(" ") || `VIN …${deal.vehicle.vin.slice(-6)}` : "";
  return (
    <>
      <p className="eyebrow">{org?.name}</p>
      <h1>{t.accept.title}</h1>
      <p className="lede">{fill(t.accept.body, { org: org?.name ?? "", vehicle })}</p>
      <section className="chapter">
        <AcceptForm locale={locale} token={token} t={t} />
      </section>
    </>
  );
}
