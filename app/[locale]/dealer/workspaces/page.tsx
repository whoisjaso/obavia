import Link from "next/link";
import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentStaffId } from "@/lib/auth";
import { listDealsForStaff } from "@/lib/store/memory";

export default async function WorkspacesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const deals = listDealsForStaff(await currentStaffId());
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{t.workspaces.title}</h1>
        <Link className="btn primary" href={`/${locale}/dealer/workspaces/new`}>{t.workspaces.new}</Link>
      </div>
      {deals.length === 0 ? (
        <p className="card muted" data-testid="workspaces-empty">{t.workspaces.empty}</p>
      ) : (
        <ul className="list card" data-testid="workspaces-list">
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/${locale}/dealer/workspaces/${d.id}`} style={{ textDecoration: "none" }}>
                <div style={{ fontWeight: 600 }}>{d.buyer.name}</div>
                <div className="small muted">
                  {t.workspaces.vehicle}: {d.vehicle.vin} · {t.workspaces.created}: {new Date(d.createdAt).toLocaleDateString(locale)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
