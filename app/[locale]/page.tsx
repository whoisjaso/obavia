import { notFound } from "next/navigation";
import type { Locale } from "@/lib/domain/types";
import { isLocale } from "@/lib/i18n/dictionaries";
import { BuyerFlow } from "@/components/BuyerFlow";

export default async function BuyerHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <BuyerFlow locale={locale} />;
}
