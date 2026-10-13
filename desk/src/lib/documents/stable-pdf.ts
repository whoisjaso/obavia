/* A filed official form, saved so that the same frozen facts give the same bytes every time (lib/filed.ts: "what
   prints is what was filed"). pdf-lib stamps the moment of saving into the file's dates; held to the business date
   the document was filed on, two renders of one filed 130-U are byte for byte equal (official.test.ts), so the hash
   the Desk's Filed mark carries (filed.ts filedMark) is the hash of what any later print produces. No field, page or
   appearance is touched. */
import { PDFDocument } from 'pdf-lib';

/** `date` is MM/DD/YYYY, the business date; the file's dates become noon UTC of that day. */
export async function stablePdf(bytes: Uint8Array, date: string): Promise<Uint8Array> {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const at = m ? new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), 12)) : new Date(0);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  pdf.setCreationDate(at); pdf.setModificationDate(at);
  return pdf.save({ updateFieldAppearances: false, useObjectStreams: false });
}
