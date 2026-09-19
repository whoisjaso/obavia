import Link from "next/link";
import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentStaffId } from "@/lib/auth";
import { store } from "@/lib/store";

export default async function WorkspacesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const deals = await store.listDealsForStaff(await currentStaffId());
  return (
    <>
      <div className="row between">
        <h1>{t.workspaces.title}</h1>
        <Link className="btn primary" href={`/${locale}/dealer/workspaces/new`}>{t.workspaces.new}</Link>
      </div>
      <section className="chapter">
        {deals.length === 0 ? (
          <p className="empty" data-testid="workspaces-empty">{t.workspaces.empty}</p>
        ) : (
          <ul className="list" data-testid="workspaces-list">
            {deals.map((d) => {
              const vehicle = [d.vehicle.year, d.vehicle.make, d.vehicle.model].filter(Boolean).join(" ") || d.vehicle.vin;
              return (
                <li key={d.id} className="today-row">
                  <Link href={`/${locale}/dealer/workspaces/${d.id}`} style={{ textDecoration: "none" }}>
                    <div className="title">{d.buyer.name}</div>
                    <div className="why">
                      {vehicle} · {t.workspaces.created} {new Date(d.createdAt).toLocaleDateString(locale)}
                    </div>
                  </Link>
                  <Link className="btn" href={`/${locale}/dealer/workspaces/${d.id}`}>{t.today.open}</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
