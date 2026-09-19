import { notFound } from "next/navigation";
import type { Locale } from "@/lib/domain/types";
import { isLocale } from "@/lib/i18n/dictionaries";
import { Chat } from "@/components/Chat";

const heading: Record<Locale, { title: string; sub: string }> = {
  en: { title: "What can I actually get?", sub: "Honest numbers before you walk onto a lot." },
  es: { title: "¿Qué me alcanza de verdad?", sub: "Números honestos antes de pisar un lote." },
};

export default async function BuyerHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const h = heading[locale];
  return (
    <>
      <div className="hero">
        <h1 className="large-title">{h.title}</h1>
        <p className="sub">{h.sub}</p>
      </div>
      <Chat locale={locale} />
    </>
  );
}
