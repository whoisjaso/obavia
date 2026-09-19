import Link from "next/link";
import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentStaffId } from "@/lib/auth";
import { store } from "@/lib/store";

const reasons: Record<Locale, Record<string, string>> = {
  en: {
    no_check: "Packet has not been checked",
    review_required: "Check needs your review",
    blocker: "Check found a blocking issue",
    not_invited: "Customer not invited yet",
    invite_pending: "Waiting for the customer to accept",
    registration_ready: "Delivered; registration not started",
    disputed: "Customer flagged this workspace",
    new_inquiry: "New buyer from the app. Call them back.",
  },
  es: {
    no_check: "El paquete no se ha revisado",
    review_required: "La revisión necesita tu atención",
    blocker: "La revisión encontró un bloqueo",
    not_invited: "El cliente aún no ha sido invitado",
    invite_pending: "Esperando que el cliente acepte",
    registration_ready: "Entregado; registro sin iniciar",
    disputed: "El cliente reportó este espacio",
    new_inquiry: "Nuevo comprador desde la app. Devuélvele la llamada.",
  },
};

export default async function TodayPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const staff = await currentStaffId();
  const org = await store.getOrg((await store.orgForStaff(staff)) ?? "");
  const items = await store.todayForStaff(staff);
  const date = new Date().toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  return (
    <>
      <p className="eyebrow">{org?.name}</p>
      <h1>{t.today.title}</h1>
      <p className="lede">{date}. {t.today.subtitle}</p>

      <section className="chapter" aria-labelledby="today-h">
        <h2 id="today-h" className="sr-only">{t.today.title}</h2>
        {items.length === 0 ? (
          <p className="empty" data-testid="today-empty">{t.today.empty}</p>
        ) : (
          <ul className="list" data-testid="today-list">
            {items.map((it) => (
              <li key={it.inquiry?.id ?? it.dealId} className="today-row">
                <div>
                  <div className="title">{it.title}</div>
                  <div className="why">{reasons[locale][it.reasonKey]}</div>
                </div>
                {it.inquiry ? (
                  <a className="btn" href={it.inquiry.contact.includes("@") ? `mailto:${it.inquiry.contact}` : `tel:${it.inquiry.contact}`}>{it.inquiry.contact}</a>
                ) : (
                  <Link className="btn" href={`/${locale}/dealer/workspaces/${it.dealId}`}>{t.today.open}</Link>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="small muted" style={{ marginTop: 14 }}>{t.today.handled}</p>
      </section>

      <section className="chapter">
        <Link className="btn primary" href={`/${locale}/dealer/workspaces/new`}>{t.nav.newWorkspace}</Link>
      </section>
    </>
  );
}
