import Link from "next/link";
import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentStaffId } from "@/lib/auth";
import { todayForStaff, getOrg, orgForStaff } from "@/lib/store/memory";

const reasons: Record<Locale, Record<string, string>> = {
  en: {
    no_check: "Packet has not been checked",
    review_required: "Check needs your review",
    blocker: "Check found a blocking issue",
    not_invited: "Customer not invited yet",
    invite_pending: "Waiting for the customer to accept",
    registration_ready: "Delivered; registration not started",
    disputed: "Customer flagged this workspace",
  },
  es: {
    no_check: "El paquete no se ha revisado",
    review_required: "La revisión necesita tu atención",
    blocker: "La revisión encontró un bloqueo",
    not_invited: "El cliente aún no ha sido invitado",
    invite_pending: "Esperando que el cliente acepte",
    registration_ready: "Entregado; registro sin iniciar",
    disputed: "El cliente reportó este espacio",
  },
};

export default async function TodayPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const staff = await currentStaffId();
  const org = getOrg(orgForStaff(staff) ?? "");
  const items = todayForStaff(staff);
  return (
    <>
      <h1>{t.today.title}</h1>
      <p className="muted">{org?.name} · {t.today.subtitle}</p>
      <section className="card" aria-labelledby="today-h">
        <h2 id="today-h" className="sr-only">{t.today.title}</h2>
        {items.length === 0 ? (
          <p className="muted" data-testid="today-empty">{t.today.empty}</p>
        ) : (
          <ul className="list" data-testid="today-list">
            {items.map((it) => (
              <li key={it.dealId} className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{it.title}</div>
                  <div className="small muted">{reasons[locale][it.reasonKey]}</div>
                </div>
                <Link className="btn" href={`/${locale}/dealer/workspaces/${it.dealId}`}>{t.today.open}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link className="btn primary" href={`/${locale}/dealer/workspaces/new`}>{t.nav.newWorkspace}</Link>
    </>
  );
}
