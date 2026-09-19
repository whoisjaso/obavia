import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentPersonId } from "@/lib/auth";
import * as store from "@/lib/store/memory";
import { StateGrid } from "@/components/StateGrid";
import { disputeAction } from "@/app/actions";

export default async function BuyerStatusPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const t = getDictionary(locale);
  const personId = await currentPersonId();
  let deal;
  try {
    if (!personId) throw new Error("no session");
    deal = store.requireDealForCustomer(personId, id);
  } catch {
    return <p className="empty" role="alert" data-testid="unauthorized">{t.status.unauthorized}</p>; // AC-2, AC-7
  }
  const org = store.getOrg(deal.orgId);
  const rel = store.getRelationshipForDeal(deal.id);
  const docs = store.listDocuments(deal.id);
  const vehicle = [deal.vehicle.year, deal.vehicle.make, deal.vehicle.model].filter(Boolean).join(" ") || deal.vehicle.vin;
  return (
    <>
      <p className="eyebrow">{org?.name}</p>
      <h1>{t.status.title}</h1>
      <p className="lede">{vehicle}</p>

      <section className="chapter" aria-labelledby="st-h">
        <h2 id="st-h" className="sr-only">{t.deal.states}</h2>
        <StateGrid states={deal.states} t={t} />
      </section>

      <section className="chapter" aria-labelledby="next-h">
        <h2 id="next-h">{t.status.next}</h2>
        <p className="lede" data-testid="next-action">{t.status.nextByReg[deal.states.registration]}</p>
      </section>

      <section className="chapter" aria-labelledby="docs-h">
        <h2 id="docs-h">{t.status.documents}</h2>
        {docs.length === 0 ? <p className="empty">{t.status.noDocs}</p> : (
          <ul className="list">
            {docs.map((d) => (
              <li key={d.id} className="row between">
                <span>{t.docKinds[d.kind]}</span>
                <span className="small muted">v{d.version}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="chapter">
        {rel?.status === "disputed" ? (
          <p className="empty" role="status" data-testid="disputed">{t.status.disputed}</p>
        ) : (
          <form action={disputeAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="dealId" value={deal.id} />
            <button className="btn quiet" type="submit" data-testid="dispute">{t.status.dispute}</button>
          </form>
        )}
      </section>
    </>
  );
}
