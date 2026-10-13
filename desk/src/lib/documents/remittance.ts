/* The per-car remittance (decisions §2 row 4: "the floorplan payoff goes to the lender first, direct; the dealer's net
   follows. A per-car remittance PDF for the lender"; gap table W3-F): one page from the sale's payout rows as the
   lane holds them (auction/worker dealer_payouts: the $250 applied, W3-A's lender row and dealer-net row) and the
   balance invoice's state. Every figure names the row it came from; a row still owed is printed owed, with no date
   beside it: nothing here promises when money lands (DOCTRINE §3 Claims). No fee line of any kind appears until a
   fee row exists, and none can before the GDN issues (43 TAC §215.85; growth plan line 88). */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { DealerConfig } from '../config';

export type RemittanceRow = { id: string; reason: string; amountUsd: number; state: string; at?: number | null; transferId?: string | null; method?: string | null };
export type RemittanceInput = {
  lotId: string;
  dealer: Pick<DealerConfig, 'legalName' | 'licence' | 'street' | 'city' | 'state' | 'zip' | 'phone'>;
  vehicle: { year: number | string; make: string; model: string; vin: string };
  hammer: number; wonAt: number; startedAt?: number | null;
  lender?: { name: string; payoff?: number | null } | null;
  payouts: RemittanceRow[];
  invoice?: { id?: string | null; kind: string; state: string; amountUsd: number } | null;
  date: string;   // MM/DD/YYYY, the business date it was printed
};

/** The words for a payout row's reason, in the order the money moves: the lender first, then the dealer's net, then
    the deposit that counted toward the price. Anything else prints its reason as given. */
export const REMITTANCE_REASONS: Record<string, string> = { lender: 'Lender payoff', applied_net: 'Dealer net', applied: 'Deposit applied to the price', forfeit: 'Deposit forfeited to the dealer', no_pay: 'Deposit forfeited (no payment)' };
const ORDER = ['lender', 'applied_net', 'applied', 'forfeit', 'no_pay'];
export const REMITTANCE_STATES: Record<string, string> = { owed: 'Owed, not sent', sent: 'Sent', paid: 'Paid by hand' };

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const INK = rgb(0, 0, 0), MUTED = rgb(0.32, 0.36, 0.42);
const dateOf = (ms: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: '2-digit', day: '2-digit', year: 'numeric' }).format(new Date(ms));

export async function remittancePdf(input: RemittanceInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Remittance, lot ${input.lotId}`); pdf.setProducer('Obavia Desk');
  const page = pdf.addPage([612, 792]);
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = (t: string, x: number, y: number, size = 11, font: PDFFont = reg, color = INK) => page.drawText(t, { x, y, size, font, color });
  const rule = (y: number) => page.drawLine({ start: { x: 54, y }, end: { x: 558, y }, thickness: 0.75, color: INK });
  const label = (t: string, x: number, y: number) => text(t, x, y, 7, reg, MUTED);
  const right = (t: string, xRight: number, y: number, size: number, font: PDFFont) => text(t, xRight - font.widthOfTextAtSize(t, size), y, size, font);

  text('Remittance', 54, 730, 22, bold);
  text(`Lot ${input.lotId} · sold at public auction on the Obavia lane · printed ${input.date}`, 54, 712, 10);

  label('FROM (SELLER)', 54, 680);
  text(input.dealer.legalName || '', 54, 664, 12, bold);
  text(`Texas Dealer License ${input.dealer.licence || ''}`.trim(), 54, 649, 10);
  text([input.dealer.street, input.dealer.city, [input.dealer.state, input.dealer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), 54, 635, 10);
  if (input.dealer.phone) text(input.dealer.phone, 54, 621, 10);
  label('TO (LIENHOLDER)', 320, 680);
  text(input.lender?.name || 'No lienholder on this car', 320, 664, 12, bold);
  if (input.lender?.payoff != null) text(`Payoff on the dealer's floor record ${usd(input.lender.payoff)}`, 320, 649, 10);

  label('VEHICLE', 54, 590);
  text(`${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`, 54, 574, 12, bold);
  text(`VIN ${input.vehicle.vin}`, 54, 559, 10);
  text(`Hammer ${usd(input.hammer)} on ${dateOf(input.wonAt)}${input.startedAt ? `; engine started ${dateOf(input.startedAt)} (the sale)` : '; not yet started'}`, 54, 545, 10);

  // the rows, lender first
  let y = 500;
  label('WHAT', 54, y); label('AMOUNT', 290, y); label('STATE', 360, y); label('SOURCE ROW', 486, y);
  y -= 6; rule(y); y -= 18;
  const rows = [...input.payouts].sort((a, b) => (ORDER.indexOf(a.reason) + 1 || 99) - (ORDER.indexOf(b.reason) + 1 || 99));
  for (const r of rows) {
    text(REMITTANCE_REASONS[r.reason] ?? r.reason, 54, y, 11, bold);
    right(usd(r.amountUsd), 345, y, 11, bold);
    const st = REMITTANCE_STATES[r.state] ?? r.state;
    text(r.state === 'owed' ? st : `${st}${r.at ? ` ${dateOf(r.at)}` : ''}${r.transferId ? ` · ${r.transferId}` : r.method ? ` · ${r.method}` : ''}`, 360, y, 9);
    text(r.id, 486, y, 8, reg, MUTED);
    y -= 18;
  }
  if (!rows.length) { text('No payout rows on this sale yet.', 54, y, 10); y -= 18; }
  if (input.invoice) {
    text(input.invoice.kind === 'balance' ? 'Balance invoice (buyer to dealer)' : `Invoice (${input.invoice.kind})`, 54, y, 11, bold);
    right(usd(input.invoice.amountUsd), 345, y, 11, bold);
    text(input.invoice.state, 360, y, 9);
    text(input.invoice.id ?? '', 486, y, 8, reg, MUTED);
    y -= 18;
  }
  rule(y + 10); y -= 14;
  const lines = [
    'Each figure is the lane\'s own payout row, named at the right, as it stood when this page was printed.',
    'A row marked owed has not been sent; no date for it is promised here. The lender is paid first from the proceeds, then the dealer\'s net (Obavia auction decisions, 2026-10-12, §2 row 4).',
    'The buyer paid the dealer; Obavia held only the refundable $250 deposit, applied to the price at the engine start (Tax Code §152.0411; collateral.md §4).',
  ];
  for (const l of lines) y = wrap(page, reg, l, 54, y, 9, 504);
  rule(80);
  label('DEALER REPRESENTATIVE', 54, 70);
  return pdf.save();
}

function wrap(page: PDFPage, font: PDFFont, t: string, x: number, y: number, size: number, w: number): number {
  const words = t.split(' '); let line = '', yy = y;
  const put = (s: string) => { page.drawText(s, { x, y: yy, size, font, color: INK }); yy -= size * 1.4; };
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(next, size) > w && line) { put(line); line = word; } else line = next; }
  if (line) put(line);
  return yy - 4;
}
