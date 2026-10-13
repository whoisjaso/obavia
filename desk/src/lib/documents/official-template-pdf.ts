import { PDFDocument, PDFInvalidObject, PDFName, PDFRawStream } from "@cantoo/pdf-lib";

/**
 * The existing VTR-271 endpoint has already decrypted its original form.
 * Remove only stale PDF-index encryption metadata from that known output.
 * No page, image, form field, typography or document text is changed.
 */
export async function repairGeneratedPoaPdf(source: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source, { ignoreEncryption: true });
  delete pdf.context.trailerInfo.Encrypt;
  for (const [reference, object] of pdf.context.enumerateIndirectObjects()) {
    if (object instanceof PDFRawStream && object.dict.get(PDFName.of("Type")) === PDFName.of("XRef")) object.dict.delete(PDFName.of("Encrypt"));
    if (object instanceof PDFInvalidObject) {
      const bytes = new Uint8Array(object.sizeInBytes());
      object.copyBytesInto(bytes, 0);
      const dictionary = new TextDecoder().decode(bytes.subarray(0, 2048)).split("stream", 1)[0];
      if (/\/Type\s*\/XRef\b/.test(dictionary)) pdf.context.delete(reference);
    }
  }
  return pdf.save({ updateFieldAppearances: false });
}
