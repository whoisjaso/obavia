/* Comptroller Form 14-312 (Rev.12-12/4), "Texas Motor Vehicle Sales Tax Exemption Certificate for Vehicles Taken
   Out of State": the exemption certificate an out-of-state buyer signs at the sale (decisions §9 D9; gap table W3-F).
   The blank is the Comptroller's own file (public/forms/14-312.pdf, from https://comptroller.texas.gov/forms/14-312.pdf,
   read 2026-10-13); only its boxes are written, and it is never flattened, as the 130-U is not.

   Tax Code §152.092, read 2026-10-13 (texas.public.law mirror of statutes.capitol.texas.gov, TX.152.htm#152.092):
     (a) the chapter's taxes do not apply to the retail sale of a motor vehicle transported out of state, prior to any
         use in this state other than the transportation out, for use exclusively outside this state;
     (b) to qualify, the purchaser must sign at the time of the purchase an exemption certificate that (1) is on a form
         designated by the comptroller, (2) contains all information the comptroller considers reasonable, (3) is signed
         by the purchaser, and (4) authorizes the comptroller to provide a copy to the state of intended use and
         registration.
   So: this form and no other ((b)(1)); every box the form asks for is filled from the sale ((b)(2)); the purchaser
   signs it in ink at pickup ((b)(3): the signature line is left for the pen; D9: the packet is paper, no electronic
   signature here); the authorisation is the form's own printed sentence ((b)(4)).
   The form's note: it is furnished to and retained by the seller, not sent to the Comptroller; the seller keeps the
   sale's records four years (Tax Code §152.063(a), read 2026-10-13). Which county or state accepts what, and on
   what day, is not claimed here. */
import { PDFDocument, StandardFonts } from 'pdf-lib';

export const FORM_14_312_TEMPLATE_PATH = '14-312.pdf';
export const FORM_14_312_SOURCE_URL = 'https://comptroller.texas.gov/forms/14-312.pdf';
export const FORM_14_312_REVISION = 'Rev.12-12/4';

/** What the form asks, as the sale answers it. Every string is printed as given (the caller cases it). */
export type Form14312Input = {
  purchaserName: string;          // "Name of purchaser"
  purchaserStreet: string;        // "Address (Street & number, P.O. Box or route number)"
  purchaserCityStateZip: string;  // "City, state and ZIP code"
  purchaserPhone: string;         // "Phone (Area code and number)"
  vin: string;                    // "Vehicle identification number"
  make: string;                   // "Make of vehicle"
  modelYear: string;              // "Model year"
  registrationState: string;      // "State or country where vehicle will be used/registered"
  sellerName: string;             // "Seller"
  sellerStreet: string;           // "Street address"
  sellerCityStateZip: string;     // "City, state and ZIP code" (the seller's)
  signerTitle?: string;           // "Title": the signer's office when the purchaser is an entity; blank for a person
  date: string;                   // "Date", MM/DD/YYYY, the business date of the sale
};

/** The form's AcroForm field names (read off the Comptroller's file with its own field list), one per box, with
    where each value comes from and the rule that puts it there. */
export const FORM_14_312_FIELDS: Record<keyof Form14312Input, { field: string; label: string; from: string; cite: string }> = {
  purchaserName: { field: 'Purch', label: 'Name of purchaser', from: 'sale.buyer.fullName', cite: 'Tax Code §152.092(b)(2), (b)(3): the purchaser named is the one who signs' },
  purchaserStreet: { field: 'PurchSt', label: 'Address (Street & number, P.O. Box or route number)', from: 'sale.buyer.address', cite: '§152.092(b)(2); the form\'s box' },
  purchaserCityStateZip: { field: 'PurchCty', label: 'City, state and ZIP code', from: 'sale.buyer.city, state, zip', cite: '§152.092(b)(2); the form\'s box' },
  purchaserPhone: { field: 'PurchPh', label: 'Phone (Area code and number)', from: 'sale.buyer.phone', cite: '§152.092(b)(2); the form\'s box' },
  vin: { field: 'VehId', label: 'Vehicle identification number', from: 'sale.vehicle.vin', cite: '§152.092(b)(2); the form: "enter Blanket Certificate" only for a blanket certificate, which this is not; §152.063 names the VIN among the seller\'s records' },
  make: { field: 'VehMake', label: 'Make of vehicle', from: 'sale.vehicle.make', cite: '§152.092(b)(2); §152.063' },
  modelYear: { field: 'VehYear', label: 'Model year', from: 'sale.vehicle.year', cite: '§152.092(b)(2); §152.063' },
  registrationState: { field: 'RegSt', label: 'State or country where vehicle will be used/registered', from: 'the buyer\'s licence state (sale.buyer.idIssuer, else sale.buyer.state), never Texas', cite: '§152.092(a): use exclusively outside this state; (b)(4): the state of intended use and registration' },
  sellerName: { field: 'Seller', label: 'Seller', from: 'dealer.legalName', cite: 'the form: furnished to and retained by the seller; §152.063(a)' },
  sellerStreet: { field: 'SellSt', label: 'Street address', from: 'dealer.street', cite: 'the form\'s box' },
  sellerCityStateZip: { field: 'SellCty', label: 'City, state and ZIP code', from: 'dealer.city, state, zip', cite: 'the form\'s box' },
  signerTitle: { field: 'SigTitl', label: 'Title', from: 'blank for a person; the signer\'s office for an entity purchaser', cite: 'the form\'s box; nothing is invented for a person' },
  date: { field: 'SigDate', label: 'Date', from: 'the business date of the sale', cite: '§152.092(b): signed at the time of the purchase' },
};
/** The one line the form leaves to ink: "Purchaser" (the signature). Not a field; the pen signs it at pickup (D9). */
export const FORM_14_312_INK_LINE = 'Purchaser';

export async function fillForm14312(template: Uint8Array, input: Form14312Input): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const key of Object.keys(FORM_14_312_FIELDS) as (keyof Form14312Input)[]) {
    const value = (input[key] ?? '').trim();
    const f = form.getTextField(FORM_14_312_FIELDS[key].field);
    f.setText(value);
    f.setFontSize(10);
  }
  form.updateFieldAppearances(font);
  return pdf.save({ updateFieldAppearances: false });
}
