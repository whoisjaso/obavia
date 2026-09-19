"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/domain/types";

// Buyers get a quiet bar: brand and language only. Dealer screens get the
// full navigation. Nothing on the buyer's path competes with the flow.
export function Nav({ locale, appName, dealers, language }: { locale: Locale; appName: string; dealers: string; language: string }) {
  const path = usePathname() ?? "";
  const other = locale === "en" ? "es" : "en";
  const buyer = path === `/${locale}` || path === `/${locale}/`;
  return (
    <header className={`navbar ${buyer ? "quiet" : ""}`}>
      <Link href={`/${locale}`} className="navbrand" aria-label={appName}>
        <span className="navmark" aria-hidden="true">O</span>
        <span>{appName}</span>
      </Link>
      <nav aria-label="Primary" className="navlinks">
        {!buyer && <Link href={`/${locale}/dealer`}>{dealers}</Link>}
        <Link href={buyer ? `/${other}` : path.replace(`/${locale}`, `/${other}`)} hrefLang={other} lang={other} className={buyer ? "pill" : ""}>{language}</Link>
      </nav>
    </header>
  );
}
