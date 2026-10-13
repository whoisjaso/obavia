/* Every document, as it prints.

   Official state and federal forms (130-U, VTR-271, rebuilt disclosure) are
   the official PDF, filled (OfficialForm). Everything the dealer authors is
   drawn by the production desk's own document components on its own paper
   (DocPaper in PaperFrame), from the payload lib/paper.ts builds. Nothing here
   is a look-alike: the preview is the page that prints. */
import { useEffect, useMemo, useState } from 'react';
import { notSet, type DealerConfig } from './lib/config';
import { asFiled, saleMoney } from './lib/filed';
import { DOC_TITLE } from './lib/documents';
import { isOfficial } from './lib/official';
import { paperData, isoDate } from './lib/paper';
import { useDealership } from './lib/dealership-config';
import { OfficialForm } from './OfficialForm';
import { DocPaper } from './paper/DocPaper';
import { PaperFrame, printableHtml } from './paper/PaperFrame';
import type { DocType } from './lib/plan';
import type { Sale } from './lib/sale';

export const saleReceipt = saleMoney;
export { colourName } from './lib/colour';

/** The dealer as the paper prints it: a missing legal fact prints "[Not set: …]" rather than a blank. */
export function paperDealer(d: DealerConfig): DealerConfig {
  const or = (v: string | undefined, label: string) => (v ?? '').trim() || notSet(label);
  return { ...d, legalName: or(d.legalName, 'Legal name'), street: or(d.street, 'Street'), city: or(d.city, 'City'), zip: or(d.zip, 'ZIP'),
    county: or(d.county, 'County'), phone: or(d.phone, 'Phone'), licence: or(d.licence, 'Dealer licence (GDN)') };
}

type Props = { doc: DocType; sale: Sale; dealer: DealerConfig; buyerSig?: string | null; dealerSig?: boolean; compact?: boolean; onReady?: () => void };

export function Sheet({ onReady, ...props }: Props) {
  if (isOfficial(props.doc)) return <OfficialForm doc={props.doc} sale={props.sale} dealer={props.dealer} buyerSig={props.buyerSig} onReady={onReady} />;
  return <DealerPaper {...props} onReady={onReady} />;
}

function DealerPaper({ doc, sale: live, dealer: liveDealer, buyerSig, compact, onReady }: Props) {
  // Once filed, the paper reads the facts it was filed with, never today's records.
  const f = asFiled(doc, live, liveDealer), dealer = useMemo(() => paperDealer(f.dealer), [f.dealer]);
  useDealership(dealer);
  const payload = paperData(doc, f.sale, dealer, { date: f.date });
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => { if (!payload) onReady?.(); }, [payload === null]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!payload) return null;
  const title = DOC_TITLE[doc];
  const open = () => {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([printableHtml(html, title)], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <div className={'dealer-paper' + (compact ? ' compact' : '')}>
      <PaperFrame title={title} onReady={onReady} onHtml={setHtml}>
        <DocPaper section={payload.section} data={payload.data} buyerSignature={buyerSig} buyerSignatureDate={buyerSig ? isoDate(f.signedOn ?? f.date) : null}
          pendingTranslation={f.sale.language === 'es' && !f.dealer.spanishApproved} />
      </PaperFrame>
      {!compact && html && <button type="button" className="textlink" onClick={open}>Open The PDF</button>}
    </div>
  );
}
