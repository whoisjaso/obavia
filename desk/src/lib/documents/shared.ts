import { dealership, onDealership } from '@/lib/dealership-config';

/**
 * Dealer identity on a document. (Production desk: src/lib/documents/shared.ts.)
 *
 * Derived from the one dealership config rather than typed again here. In
 * production these are constants read at load; here the dealer is the
 * workspace's, so they are live bindings refreshed whenever the dealer is set.
 * The legal name already carries the entity suffix.
 */
export let DEALER_NAME = '';
export let DEALER_ADDRESS = '';
export let DEALER_PHONE = '';
export let DEALER_WEBSITE = '';
export let DEALER_LICENSE = '';
onDealership(() => {
  DEALER_NAME = dealership.legalName;
  DEALER_ADDRESS = dealership.address.oneLine;
  DEALER_PHONE = dealership.phone.display ?? '';
  DEALER_WEBSITE = (dealership.website ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  DEALER_LICENSE = dealership.license ?? '';
});

/** Name, address, phone and website, for the FTC Buyer's Guide's dealer box. */
export const dealerLines = () => ({
  name: dealership.name,
  address: dealership.address.oneLine,
  phone: dealership.phone.display, website: dealership.website,
});

export interface SignatureData {
  buyerIdPhoto: string;
  buyerSignature: string;
  buyerSignatureDate: string;
  coBuyerSignature: string;
  coBuyerSignatureDate: string;
  dealerSignature: string;
  dealerSignatureDate: string;
}

export const emptySignatures: SignatureData = {
  buyerIdPhoto: '',
  buyerSignature: '',
  buyerSignatureDate: '',
  coBuyerSignature: '',
  coBuyerSignatureDate: '',
  dealerSignature: '',
  dealerSignatureDate: '',
};

// Only data/HTTP(S)/root-relative URLs can render in an <img>. Older flows
// stored status strings like "uploaded" in the same fields — callers should
// show an "on file" chip instead of a broken image in those cases.
export function isRenderableImageSrc(value?: string | null): boolean {
  const src = (value ?? '').trim();
  return /^(data:image\/|https?:\/\/|\/)/.test(src);
}
