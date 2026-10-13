/* A filed sale, read into what the official 130-U's boxes want. The desk's
   counterpart of the production `from-agreement.ts`: pure, so a test can hand
   it a sale and read the boxes back. Everything prints cased for paper
   (presentation-case): the VIN, plate and state codes in capitals, every other
   field with each word capitalised, deliberate mixed case left alone. */
import type { AgreementData } from './field-mapping';
import { codeCase, fieldCase, vinCase } from '@/lib/documents/presentation-case';
import { splitPersonName } from '@/lib/forms/person-name';
import { ID_KIND, type Sale } from '@/lib/sale';
import type { DealerConfig } from '@/lib/config';
import { colourName } from '@/lib/colour';
import { lenderName, saleMoney } from '@/lib/filed';
import { parseMoney } from '@/lib/money';

export function agreementFromSale(s: Sale, dealer: DealerConfig, opts: { date: string; agent?: string }): AgreementData {
  const v = s.vehicle, b = s.buyer, p = s.step.paperwork?.form130U ?? {}, bos = s.step.paperwork?.billOfSale ?? {};
  const r = saleMoney(s, dealer), funding = s.step.funding?.type;
  const business = p.buyerKind === 'business';
  const name = splitPersonName(b.fullName);
  const lender = lenderName(s.step.funding);
  // The lien: the lender's on a bank deal, the dealer's on a note or a cash balance (SOP, Funding).
  const hasLien = funding === 'lender' || funding === 'inHouse' || r.balance > 0;
  const iso = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(opts.date), saleDate = iso ? `${iso[3]}-${iso[1]}-${iso[2]}` : opts.date;
  return {
    vin: vinCase(v.vin), year: String(v.year ?? ''), make: fieldCase(v.make), model: fieldCase(v.model), body_style: fieldCase(v.bodyStyle),
    major_color: fieldCase(colourName(v.color)), odometer: v.mileage != null ? String(v.mileage) : '',
    odometer_brand: bos.mileage === 'notActual' ? 'N' : bos.mileage === 'exceeds' ? 'X' : 'A',
    empty_weight: p.emptyWeight || (v.emptyWeight ? String(v.emptyWeight) : undefined),
    carrying_capacity: p.capacity || undefined,
    tx_plate_no: s.step.plate ? codeCase(s.step.plate) : undefined,
    buyer_first_name: business ? '' : fieldCase(name.first ?? ''), buyer_middle_name: business ? undefined : fieldCase(name.middle ?? '') || undefined,
    buyer_last_name: business ? '' : fieldCase(name.last ?? ''), buyer_suffix: business ? undefined : name.suffix || undefined,
    buyer_entity_name: business ? fieldCase(b.fullName) : undefined,
    buyer_address: fieldCase(b.address), buyer_city: fieldCase(b.city), buyer_state: codeCase(b.state), buyer_zip: b.zip,
    buyer_county: fieldCase(p.county || b.county), buyer_phone: b.phone || undefined, buyer_email: b.email || undefined,
    buyer_dl_number: codeCase(b.idNumber) || undefined, buyer_dl_state: codeCase(b.idIssuer || p.idState || '') || undefined, buyer_id_kind: ID_KIND[b.idType],
    sale_price: r.salePrice, sale_date: saleDate,
    trade_in_amount: parseMoney(bos.tradeAllowance) || undefined, trade_in_description: bos.tradeDesc ? fieldCase(bos.tradeDesc) : undefined,
    applying_for: p.applyingFor === 'title' ? 'title_only' : p.applyingFor === 'registration' ? 'registration_only' : 'title_and_registration',
    applicant_type: business ? 'business' : 'individual',
    has_lien: hasLien, lien_date: hasLien ? saleDate : undefined,
    lienholder_name: hasLien ? (funding === 'lender' ? lender ?? undefined : dealer.legalName) : undefined,
    seller_agent_name: opts.agent,
  };
}
