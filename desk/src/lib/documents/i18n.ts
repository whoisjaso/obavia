// ============================================================
// Document i18n — server-side translation access for documents
//
// Imports messages/*.json directly (no next-intl dependency).
// Used by the document preview components (which Puppeteer renders
// to PDF via /documents/render) and the customer portal.
// ============================================================

import en from './messages/en.json';
import es from './messages/es.json';
import { applyBrandTokens } from '@/lib/brand-messages';

import { dealership } from '@/lib/dealership-config';

// Resolved per dealer (production resolves once at load for its one dealer).
let resolved: { key: string; messages: Record<string, typeof en> } | null = null;
function catalogues() {
  const key = dealership.legalName;
  if (resolved?.key !== key) resolved = { key, messages: { en: applyBrandTokens(en), es: applyBrandTokens(es) } };
  return resolved.messages;
}

export type DocLocale = 'en' | 'es';

/** Get the full documents translation namespace for a locale */
export function getDocStrings(locale: string = 'en') {
  const safeLocale: DocLocale = (locale === 'es') ? 'es' : 'en';
  return catalogues()[safeLocale].documents;
}

/** Get the locale string, validated */
export function resolveLocale(input: string | null | undefined): DocLocale {
  return input === 'es' ? 'es' : 'en';
}

export type DocStrings = ReturnType<typeof getDocStrings>;
