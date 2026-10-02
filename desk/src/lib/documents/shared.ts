/* Dealer facts the FTC Buyer's Guide prints, read live from the workspace dealer. */
import { dealership } from '@/lib/dealership-config';
export const DEALER = { get name() { return dealership.name; } };
export const dealerLines = () => ({
  name: dealership.name,
  address: [dealership.address.street, dealership.address.locality, [dealership.address.region, dealership.address.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
  phone: dealership.phone.display, website: dealership.website,
});
