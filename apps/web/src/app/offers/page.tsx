import type { Metadata } from 'next';
import { loadOffers } from '@apohenia/domain/seeds';
import { OffersClient } from './OffersClient';

export const metadata: Metadata = { title: 'Offers' };

/**
 * Owner: M-script. Offer Studio as cards (DESIGN_SYSTEM §3.5): price shows `—` with the accessible
 * name "Price not set — a blank price is not $0"; the fictional fixture carries `✦ Fictional` and
 * sits behind the Practice chip, never in the default list. Server component: loads the seed.
 */
export default function OffersPage() {
  const seed = loadOffers();
  return (
    <>
      <h1 className="sr-only">Offers</h1>
      <OffersClient offers={seed.offer_versions} placeholder={seed._status !== undefined} />
    </>
  );
}
