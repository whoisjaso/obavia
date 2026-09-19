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
    <div lang={locale} className="app">
      <header className="navbar">
        <Link href={`/${locale}`} className="navbrand" aria-label={t.appName}>
          <span className="navmark" aria-hidden="true">O</span>
          <span>{t.appName}</span>
        </Link>
        <nav aria-label="Primary" className="navlinks">
          <Link href={`/${locale}/dealer`}>{t.nav.dealers}</Link>
          <Link href={`/${other}`} hrefLang={other} lang={other}>{t.nav.language}</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
