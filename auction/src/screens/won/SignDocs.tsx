/* Sign. Two drawn documents in order, the Buyers Guide and the bill of sale,
   and no page between them (simplicity-audit change 5, October 13, 2026): the
   Sign step on Won opens the Buyers Guide itself; signing it opens the Bill of
   Sale, which carries the first signature on its pad; signing that returns to
   the steps with the check drawing. The end of each page unlocks its pad. The
   title is not drawn here (decisions §9 D8, D9): a Texas licence signs it
   through webDEALER at pickup; any other licence takes the paper packet at
   pickup. The words for that step are the Desk's (TITLE_STEP below, held equal
   by desk/src/lib/sign.test.ts) and are placed for the dealer at the lot, not
   read here.

   With a Worker the drawing goes to POST /sales/:lot/sign, which stamps it into
   the bytes the Desk uploaded at Go and logs the consent; the sale then holds
   the signed copy's viewer path, never the drawing, and Paper shows that copy.
   The drawing stays in memory only while the second document may reuse it
   (one sale, this launch); nothing writes it to storage or to a log. Without a
   Worker (the local fixtures) the drawing is the sale's mark, as before. */
import React, { useState } from 'react';
import { peekSale, setSale, useSale, type Doc } from '../../sale';
import { AUCTION_URL, buyerToken } from '../../store';
import { CONSENT_VERSION, Paper, isSignedPath, type Signature } from '../Paper';

const DOCS: { key: Doc; title: string; subtitle?: string }[] = [
  { key: 'guide', title: 'Buyers Guide', subtitle: 'AS IS - NO DEALER WARRANTY' },
  { key: 'bill', title: 'Bill of Sale' },
];
/* The title line: which step follows at pickup, by licence state (decisions §9 D8, D9). The same words as the
   Desk's Sold step, desk/src/lib/filed.ts laneTitleStep (TITLE_STEP), which places them for the dealer; the Desk's
   sign.test.ts reads this file and holds the two equal. Four words or fewer per line; no county timing, no fee. */
export const TITLE_STEP = {
  acknowledgment: { title: 'Title at pickup', lines: ['Buyer Acknowledgment in webDEALER', 'Texas DL or ID', 'Last four, audit number', 'No drawn signature'] },
  packet: { title: 'Paper packet at pickup', lines: ['Form 14-312, signed', 'Assigned title handed over', 'Or filed, 30 days', 'Green 60-day plate'] },
} as const;

/** The first drawing of this sale, for the second document's one-tap reuse. Memory only. */
let drawn: { lotId: string; sig: Signature } | null = null;

/** The Worker stamps the drawing into the Desk's PDF and answers with the signed copy's viewer path; a document
    already signed answers 409 with the same path, which is as good. Anything else: null, and the pad stays. */
export async function signOnLane(lotId: string, doc: Doc, sig: Signature, reuse: boolean, base = AUCTION_URL, token = buyerToken()): Promise<string | null> {
  if (!base || !token) return null;
  try {
    const r = await fetch(`${base}/sales/${encodeURIComponent(lotId)}/sign`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ doc, svg: sig, consent: true, consentVersion: CONSENT_VERSION, ...(reuse ? { reuse: true } : {}) }),
    });
    const b = await r.json().catch(() => null) as { error?: string; path?: string } | null;
    if (r.ok || (r.status === 409 && b?.error === 'already_signed')) return `/sales/${lotId}/view/${doc}`;
    return null;
  } catch { return null; }
}

/** `onDone`: both documents signed. `onClose`: the open document swiped down before it was signed (the step
    stays live). The document rises where the step was (lego §4.6, sequence); the next one rises in its place. */
export function SignDocs({ onDone, onClose, docs }: { onDone: () => void; onClose: () => void; docs?: { guide?: string; bill?: string; title?: string } }) {
  const sale = useSale();
  const [open, setOpen] = useState<Doc>(() => DOCS.find(d => !peekSale()?.signed[d.key])?.key ?? 'guide');
  if (!sale) return null;
  const local = !AUCTION_URL;
  const mine = drawn?.lotId === sale.lotId ? drawn.sig : undefined;
  const first = local ? sale.signed.guide ?? sale.signed.bill : mine;
  const doc = DOCS.find(d => d.key === open)!;
  const signedView = sale.signed[doc.key];

  /** The next unsigned document opens; none left, the step is done. */
  const advance = () => {
    const cur = peekSale(); if (!cur) return onDone();
    const nx = DOCS.find(d => !cur.signed[d.key]);
    if (nx) setOpen(nx.key); else onDone();
  };

  async function sign(key: Doc, sig: Signature, reused: boolean): Promise<boolean> {
    const cur = peekSale(); if (!cur) return false;
    if (local) { setSale({ signed: { ...cur.signed, [key]: sig } }); advance(); return true; }
    const view = await signOnLane(cur.lotId, key, sig, reused);
    if (!view) return false;
    if (!reused) drawn = { lotId: cur.lotId, sig };
    const now = peekSale(); if (now) setSale({ signed: { ...now.signed, [key]: view } });
    return true;   // Paper stays open on the signed copy; its Done advances
  }

  return (
    <Paper key={doc.key} title={doc.title} subtitle={doc.subtitle} url={docs?.[doc.key]} onClose={signedView ? advance : onClose}
      signed={isSignedPath(signedView) ? signedView : undefined}
      reuse={doc.key !== 'guide' ? first : undefined}
      sign={signedView ? undefined : (sig, reused) => sign(doc.key, sig, reused)} />
  );
}
