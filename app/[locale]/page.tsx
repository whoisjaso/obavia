import { notFound } from "next/navigation";
import type { Locale } from "@/lib/domain/types";
import { isLocale } from "@/lib/i18n/dictionaries";
import { Chat } from "@/components/Chat";

const heading: Record<Locale, { title: string; sub: string }> = {
  en: { title: "What can I actually get?", sub: "Tell Obavia your credit, your down payment, and the car you want. Get honest numbers before you walk onto a lot." },
  es: { title: "¿Qué me alcanza de verdad?", sub: "Dile a Obavia tu crédito, tu enganche y el carro que quieres. Números honestos antes de pisar un lote." },
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
