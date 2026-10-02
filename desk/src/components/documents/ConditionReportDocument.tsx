import DocumentLetterhead from "@/components/documents/DocumentLetterhead";
import SignatureLinePreview from "@/components/documents/SignatureLinePreview";
import { usDate } from "@/lib/documents/us-date";
import { brand, dealership } from "@/lib/dealership-config";

/**
 * Condition At Sale, on the house paper.
 *
 * The Desk's own document (the production desk has none): what the car was
 * like when it left, in the buyer's language, signed in ink. Typeset with the
 * production `bos-` system the acknowledgments use, so it reads as one more
 * page of the same packet: letterhead, hairline bands, the VIN on its own
 * ruled line, a checklist, the one sentence that matters, the signature grid.
 */

export type ConditionReportData = {
  buyerName: string;
  buyerAddress: string;
  vehicleDescription: string;
  vin: string;
  vehicleMileage: string;
  saleDate: string;
  language: "en" | "es";
  warranty: boolean;
  warrantyLength: string;
  answers: Record<string, unknown>;
};

const COPY = {
  en: {
    heading: "Condition At Sale", subtitle: "What the vehicle was like when it left the lot", dateLabel: "Date",
    buyerHeading: "Buyer", nameLabel: "Name", addressLabel: "Address",
    vehicleHeading: "Vehicle", vehicleLabel: "Vehicle", mileageLabel: "Odometer",
    checkedHeading: "At The Desk", guide: "The Buyer's Guide was on the window.", drove: "The buyer test drove the vehicle.",
    noLights: "No warning lights were on.", lights: "Warning lights on", none: "None", known: "Not working at sale", nothing: "Nothing known",
    photos: "Photos taken today", noPhotos: "None",
    soldAsIs: "Sold as is, with no warranty.", soldWarranty: (l: string) => `Sold with a warranty${l ? `: ${l}` : ""}.`,
    key: (w: boolean) => w ? "Repairs outside the written warranty are the buyer's. Payments are due whether or not the vehicle needs repairs."
      : "The vehicle is sold as is. Repairs after today are the buyer's. Payments are due whether or not the vehicle needs repairs.",
    attestation: "By signing, the buyer confirms this is the condition of the vehicle at sale.",
    buyerSignatureLabel: "Buyer", dealerSignatureLabel: "Dealer",
  },
  es: {
    heading: "Estado Del Vehículo Al Venderse", subtitle: "Cómo estaba el vehículo al salir del lote", dateLabel: "Fecha",
    buyerHeading: "Comprador", nameLabel: "Nombre", addressLabel: "Dirección",
    vehicleHeading: "Vehículo", vehicleLabel: "Vehículo", mileageLabel: "Odómetro",
    checkedHeading: "En El Escritorio", guide: "La Guía del Comprador estaba en la ventana.", drove: "El comprador lo manejó de prueba.",
    noLights: "No había luces de advertencia.", lights: "Luces de advertencia", none: "Ninguna", known: "No funcionaba al venderse", nothing: "Nada conocido",
    photos: "Fotos tomadas hoy", noPhotos: "Ninguna",
    soldAsIs: "Vendido como está, sin garantía.", soldWarranty: (l: string) => `Vendido con garantía${l ? `: ${l}` : ""}.`,
    key: (w: boolean) => w ? "Las reparaciones fuera de la garantía escrita son responsabilidad del comprador. Los pagos se deben aunque el vehículo necesite reparaciones."
      : "El vehículo se vende como está. Las reparaciones después de hoy son responsabilidad del comprador. Los pagos se deben aunque el vehículo necesite reparaciones.",
    attestation: "Al firmar, el comprador confirma que este es el estado del vehículo al venderse.",
    buyerSignatureLabel: "Comprador", dealerSignatureLabel: "Vendedor",
  },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="bos-field-label">{label}</span>
      <p className="font-medium">{value || " "}</p>
    </div>
  );
}

const photosOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((p): p is string => typeof p === "string" && p.startsWith("data:image/")) : []);

export default function ConditionReportDocument({ data, buyerSignature, buyerSignatureDate, pendingTranslation }: {
  data: ConditionReportData; buyerSignature?: string | null; buyerSignatureDate?: string | null; pendingTranslation?: boolean;
}) {
  const copy = COPY[data.language], a = data.answers, pics = photosOf(a.photos);
  const checks = [
    [a.guide === "yes", copy.guide],
    [a.drove === "yes", copy.drove],
    [a.lights === "none", copy.noLights],
  ] as const;
  return (
    <div className="print-doc bos-print doc-sheet" lang={data.language}>
      <section className="bos-page" data-bos-page="condition">
        <DocumentLetterhead title={copy.heading} subtitle={copy.subtitle} reference={[{ label: copy.dateLabel, value: usDate(data.saleDate) }]} />

        <section className="bos-section">
          <h2 className="bos-section-heading">{copy.buyerHeading}</h2>
          <div className="bos-trade-grid">
            <Field label={copy.nameLabel} value={data.buyerName} />
            <Field label={copy.addressLabel} value={data.buyerAddress} />
          </div>
        </section>

        <section className="bos-section">
          <h2 className="bos-section-heading">{copy.vehicleHeading}</h2>
          <div className="doc-vin">
            <div>
              <span className="doc-vin-label">{copy.vehicleLabel}</span>
              <p className="font-medium" style={{ fontSize: "1.05rem" }}>{data.vehicleDescription}</p>
            </div>
            <div className="doc-vin-secondary">
              <span className="doc-vin-label">VIN</span>
              <span className="doc-vin-value">{data.vin}</span>
            </div>
            <div className="doc-vin-secondary">
              <span className="doc-vin-label">{copy.mileageLabel}</span>
              <span className="doc-vin-value">{data.vehicleMileage ? Number(data.vehicleMileage).toLocaleString("en-US") : ""}</span>
            </div>
          </div>
          <p className="bos-helper" style={{ marginTop: "0.75rem" }}>{data.warranty ? copy.soldWarranty(data.warrantyLength) : copy.soldAsIs}</p>
        </section>

        <section className="bos-section">
          <h2 className="bos-major-heading">{copy.checkedHeading}</h2>
          <div className="bos-checklist">
            {checks.map(([done, text], index) => (
              <div key={index} className="bos-checklist-row">
                <span className="bos-checkbox" data-done={done ? "true" : "false"} aria-hidden="true" />
                <div><p className="bos-checklist-note">{text}</p></div>
                <span />
              </div>
            ))}
          </div>
          <div className="bos-trade-grid mt-4">
            <Field label={copy.lights} value={a.lights === "yes" ? String(a.lightsWhich ?? "") : copy.none} />
            <Field label={copy.known} value={a.known === "yes" ? String(a.knownWhat ?? "") : copy.nothing} />
            <Field label={copy.photos} value={pics.length ? String(pics.length) : copy.noPhotos} />
          </div>
          {pics.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {pics.map((src, i) => <img key={i} src={src} alt={`${i + 1}`} className="w-full aspect-[4/3] object-cover border border-black/20" />)}
            </div>
          )}
        </section>

        <section className="bos-signatures print-signatures">
          <p className="bos-signature-agreement"><strong>{copy.key(data.warranty)}</strong> {copy.attestation}</p>
          {pendingTranslation && <p className="bos-helper">Traducción pendiente de revisión legal · Translation pending counsel review</p>}
          <div className="bos-signature-grid">
            <SignatureLinePreview label={copy.buyerSignatureLabel} dateLabel={copy.dateLabel} signatureImage={buyerSignature ?? undefined}
              signatureDate={buyerSignatureDate ?? data.saleDate} printedName={data.buyerName} />
            <SignatureLinePreview label={`${copy.dealerSignatureLabel}, ${brand.legal}`} dateLabel={copy.dateLabel} signatureDate={data.saleDate} />
          </div>
          <p className="bos-helper" style={{ marginTop: "0.75rem" }}>
            {dealership.name} · {dealership.address.street}, {dealership.address.locality},{" "}
            {dealership.address.region} {dealership.address.postalCode}
          </p>
        </section>
      </section>
    </div>
  );
}
