import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const other = locale === "en" ? "es" : "en";
  return (
    <div lang={locale}>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="ctx">Triple J Auto Investment</span>
          <Link href={`/${locale}/dealer`} className="brand" aria-label={t.appName}>
            <span className="mono" aria-hidden="true">O</span>
            <span className="word">{t.appName}</span>
          </Link>
          <nav aria-label="Primary">
            <Link href={`/${locale}/dealer`}>{t.nav.today}</Link>
            <Link href={`/${locale}/dealer/workspaces`}>{t.nav.workspaces}</Link>
            <Link href={`/${other}/dealer`} hrefLang={other} lang={other}>
              {t.nav.language}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
