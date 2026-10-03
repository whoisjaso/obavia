import { formTemplate } from "@/lib/documents/form-template";
import { LineCapStyle, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { dealerLines } from "@/lib/documents/shared";

export const BUYERS_GUIDE_TEMPLATE_SOURCE_URL =
  "https://www.ftc.gov/system/files/documents/plain-language/buyersguide_eng_2016-11.pdf";
export const BUYERS_GUIDE_TEMPLATE_SOURCE_URL_ES =
  "https://www.ftc.gov/system/files/documents/plain-language/spdf-0083-guia-del-comprador.pdf";

export type BuyersGuideLanguage = "en" | "es";

export const BUYERS_GUIDE_TEMPLATE_PATH = "buyers-guide-ftc-english-2016.pdf";
export const BUYERS_GUIDE_TEMPLATE_PATH_ES = "buyers-guide-ftc-spanish-2016.pdf";

export const BUYERS_GUIDE_PREFILL_PAGE_INDEXES = [0, 2] as const;
export const BUYERS_GUIDE_AS_IS_PAGE_INDEX = 0;

// Every position below is read off the official FTC PDFs themselves (their
// vector rules, box paths and label text, PDF points, origin bottom-left),
// not estimated from a grid. The checkbox is the box path; each value sits on
// the rule it belongs to, at the x where that rule's printed label starts.

// The AS IS checkbox on page 1: a 22pt square drawn with a 1pt outline.
export const BUYERS_GUIDE_AS_IS_BOX = { x: 81, y: 574, width: 22, height: 22 } as const;
export const BUYERS_GUIDE_AS_IS_BOX_ES = { x: 81, y: 575, width: 22, height: 22 } as const;
/** Half the box's own outline: the inside edge of the printed square. */
export const BUYERS_GUIDE_BOX_OUTLINE = 0.5;

// The X sits wholly inside the square with an even margin on all four sides:
// straight (butt) ends, so nothing reaches past the points below, and a
// stroke the weight of the form's own heavy rules.
export const BUYERS_GUIDE_AS_IS_MARK_INSET = 5;
export const BUYERS_GUIDE_AS_IS_MARK_THICKNESS = 1.75;

/** A typed value: the rule it sits on, where it starts, and the room it has. */
interface FieldSpot {
  /** The rule's y. The baseline sits a fixed gap above it. */
  rule: number;
  x: number;
  maxWidth: number;
  size?: number;
}

// One type system, as on the 130-U: regular Helvetica, pure black, one size
// per row, set down on the line with the same clearance everywhere so the
// descenders (g, j, y, the comma) never touch the rule.
const VALUE_SIZE = 11;
const BASELINE_ABOVE_RULE = 3.5;

interface BuyersGuideLayout {
  templatePath: string;
  asIsBox: { x: number; y: number; width: number; height: number };
  vehicle: { make: FieldSpot; model: FieldSpot; year: FieldSpot; vin: FieldSpot };
  dealer: {
    name: FieldSpot;
    address: FieldSpot;
    phone: FieldSpot;
    email: FieldSpot;
    contact: FieldSpot;
  };
}

// Page 1: the vehicle rule is at y 641.6 with its four labels under it.
// Page 3: one writing rule per row (dealer name, address, telephone and
// email, then the complaints line), each label printed just under its rule.
// The complaints contact is written on the rule below its label, the same in
// both languages.
const LAYOUTS: Record<BuyersGuideLanguage, BuyersGuideLayout> = {
  en: {
    templatePath: BUYERS_GUIDE_TEMPLATE_PATH,
    asIsBox: BUYERS_GUIDE_AS_IS_BOX,
    vehicle: {
      make: { rule: 641.6, x: 80.5, maxWidth: 115 },
      model: { rule: 641.6, x: 203.5, maxWidth: 83 },
      year: { rule: 641.6, x: 294.5, maxWidth: 110 },
      vin: { rule: 641.6, x: 412.5, maxWidth: 127.5 },
    },
    dealer: {
      name: { rule: 219, x: 81, maxWidth: 450 },
      address: { rule: 194, x: 81, maxWidth: 450 },
      phone: { rule: 169, x: 81, maxWidth: 215 },
      email: { rule: 169, x: 306, maxWidth: 225 },
      contact: { rule: 119, x: 81, maxWidth: 450 },
    },
  },
  es: {
    templatePath: BUYERS_GUIDE_TEMPLATE_PATH_ES,
    asIsBox: BUYERS_GUIDE_AS_IS_BOX_ES,
    vehicle: {
      // The Spanish IMPORTANT note runs to a second line just above this row,
      // so the row is set half a point smaller to keep clear air under it.
      make: { rule: 641.6, x: 80.5, maxWidth: 115, size: 10.5 },
      model: { rule: 641.6, x: 203.5, maxWidth: 83, size: 10.5 },
      year: { rule: 641.6, x: 294.5, maxWidth: 80, size: 10.5 },
      vin: { rule: 641.6, x: 382.5, maxWidth: 157.5, size: 10.5 },
    },
    dealer: {
      name: { rule: 217, x: 81, maxWidth: 450 },
      address: { rule: 192, x: 81, maxWidth: 450 },
      phone: { rule: 167, x: 81, maxWidth: 215 },
      email: { rule: 167, x: 306, maxWidth: 225 },
      contact: { rule: 117, x: 81, maxWidth: 450 },
    },
  },
};

/** Where a value's baseline goes: on its rule, clear of it. */
export function buyersGuideBaseline(rule: number): number {
  return rule + BASELINE_ABOVE_RULE;
}

export interface MarkLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

// The X, inside the box with an even margin on every side.
export function buyersGuideAsIsMarkLines(
  language: BuyersGuideLanguage = "en",
): [MarkLine, MarkLine] {
  const { x, y, width, height } = LAYOUTS[language].asIsBox;
  const inset = BUYERS_GUIDE_AS_IS_MARK_INSET;
  const left = x + inset;
  const right = x + width - inset;
  const bottom = y + inset;
  const top = y + height - inset;
  return [
    { start: { x: left, y: bottom }, end: { x: right, y: top } },
    { start: { x: left, y: top }, end: { x: right, y: bottom } },
  ];
}

export interface BuyersGuideVehicleInput {
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  stockNumber?: string | null;
}

export interface BuyersGuideDealerInput {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contact?: string | null;
}

export interface BuyersGuideInput {
  vehicle: BuyersGuideVehicleInput;
  dealer?: BuyersGuideDealerInput;
  language?: BuyersGuideLanguage;
}

const BLACK = rgb(0, 0, 0);

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function drawFitText({
  page,
  font,
  text,
  spot,
}: {
  page: PDFPage;
  font: PDFFont;
  text: unknown;
  spot: FieldSpot;
}) {
  const safe = clean(text);
  if (!safe) return;

  let fontSize = spot.size ?? VALUE_SIZE;
  while (fontSize > 6 && font.widthOfTextAtSize(safe, fontSize) > spot.maxWidth) {
    fontSize -= 0.25;
  }

  page.drawText(safe, {
    x: spot.x,
    y: buyersGuideBaseline(spot.rule),
    size: fontSize,
    font,
    color: BLACK,
  });
}

function drawAsIsSelection(page: PDFPage, language: BuyersGuideLanguage) {
  for (const line of buyersGuideAsIsMarkLines(language)) {
    page.drawLine({
      ...line,
      thickness: BUYERS_GUIDE_AS_IS_MARK_THICKNESS,
      color: BLACK,
      lineCap: LineCapStyle.Butt,
    });
  }
}

function drawPageOneVehicle(
  page: PDFPage,
  font: PDFFont,
  vehicle: BuyersGuideVehicleInput,
  layout: BuyersGuideLayout,
) {
  drawFitText({ page, font, text: vehicle.make ?? "", spot: layout.vehicle.make });
  drawFitText({ page, font, text: vehicle.model ?? "", spot: layout.vehicle.model });
  drawFitText({ page, font, text: vehicle.year ?? "", spot: layout.vehicle.year });
  drawFitText({ page, font, text: vehicle.vin ?? "", spot: layout.vehicle.vin });
}

function drawPageThreeDealer(
  page: PDFPage,
  font: PDFFont,
  dealer: BuyersGuideDealerInput,
  layout: BuyersGuideLayout,
) {
  const email = clean(dealer.email) || dealerLines().website;
  drawFitText({ page, font, text: dealer.name ?? dealerLines().name, spot: layout.dealer.name });
  drawFitText({ page, font, text: dealer.address ?? dealerLines().address, spot: layout.dealer.address });
  drawFitText({ page, font, text: dealer.phone ?? dealerLines().phone, spot: layout.dealer.phone });
  drawFitText({ page, font, text: email, spot: layout.dealer.email });
  drawFitText({ page, font, text: dealer.contact ?? "Sales Office", spot: layout.dealer.contact });
}

export async function generateBuyersGuidePdf(input: BuyersGuideInput): Promise<Uint8Array> {
  const language: BuyersGuideLanguage = input.language === "es" ? "es" : "en";
  const layout = LAYOUTS[language];
  const templateBytes = await formTemplate(layout.templatePath);
  const pdf = await PDFDocument.load(templateBytes);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  if (pages.length !== 3) {
    throw new Error(
      `Expected the FTC Buyers Guide template (${language}) to have 3 pages; found ${pages.length}.`,
    );
  }

  drawAsIsSelection(pages[BUYERS_GUIDE_AS_IS_PAGE_INDEX], language);
  drawPageOneVehicle(pages[BUYERS_GUIDE_PREFILL_PAGE_INDEXES[0]], font, input.vehicle, layout);
  drawPageThreeDealer(pages[BUYERS_GUIDE_PREFILL_PAGE_INDEXES[1]], font, input.dealer ?? {}, layout);

  return pdf.save();
}

export function buildBuyersGuideFilename(
  vehicle: BuyersGuideVehicleInput,
  language: BuyersGuideLanguage = "en",
): string {
  const label = [vehicle.year, vehicle.make, vehicle.model]
    .map(clean)
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const vinTail = clean(vehicle.vin).slice(-6).toUpperCase() || "NOVIN";
  const suffix = language === "es" ? "-es" : "";
  return `buyers-guide-${label || "vehicle"}-${vinTail}${suffix}.pdf`;
}
