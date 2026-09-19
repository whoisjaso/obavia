import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
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
  return (
    <div lang={locale} className="app">
      <Nav locale={locale} appName={t.appName} dealers={t.nav.dealers} language={t.nav.language} />
      <main>{children}</main>
    </div>
  );
}
