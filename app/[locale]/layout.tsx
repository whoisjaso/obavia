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
        <Link href={`/${locale}/dealer`} className="brand">
          {t.appName}
        </Link>
        <nav aria-label="Primary">
          <Link href={`/${locale}/dealer`}>{t.nav.today}</Link>
          <Link href={`/${locale}/dealer/workspaces`}>{t.nav.workspaces}</Link>
          <Link href={`/${other}/dealer`} hrefLang={other} lang={other}>
            {t.nav.language}
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
