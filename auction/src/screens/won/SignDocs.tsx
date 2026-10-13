/* Sign. Two drawn documents in order, the Buyers Guide and the bill of sale.
   Each opens as Paper; the end of the page unlocks the pad; the second offers
   the first signature back with one tap. The title is not drawn here (decisions
   §9 D8, D9): a Texas licence signs it through webDEALER at pickup; any other
   licence takes the paper packet at pickup. One line says which.

   With a Worker the drawing goes to POST /sales/:lot/sign, which stamps it into
   the bytes the Desk uploaded at Go and logs the consent; the sale then holds
   the signed copy's viewer path, never the drawing, and Paper shows that copy.
   The drawing stays in memory only while the second document may reuse it
   (one sale, this launch); nothing writes it to storage or to a log. Without a
   Worker (the local fixtures) the drawing is the sale's mark, as before. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Choice, Label, Page } from '../../components/Type';
import { outOfState, peekSale, setSale, useSale, type Doc } from '../../sale';
import { AUCTION_URL, buyerToken } from '../../store';
import { theme } from '../../theme';
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
const titleLine = (k: keyof typeof TITLE_STEP) => [TITLE_STEP[k].title, ...TITLE_STEP[k].lines].join(' · ');

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

export function SignDocs({ onDone, onClose, docs }: { onDone: () => void; onClose: () => void; docs?: { guide?: string; bill?: string; title?: string } }) {
  const sale = useSale();
  const [open, setOpen] = useState<Doc | null>(null);
  if (!sale) return null;
  const local = !AUCTION_URL;
  const mine = drawn?.lotId === sale.lotId ? drawn.sig : undefined;
  const first = local ? sale.signed.guide ?? sale.signed.bill : mine;
  const next = DOCS.find(d => !sale.signed[d.key]);
  const doc = DOCS.find(d => d.key === open);
  const signedView = doc ? sale.signed[doc.key] : undefined;

  async function sign(key: Doc, sig: Signature, reused: boolean): Promise<boolean> {
    const cur = peekSale(); if (!cur) return false;
    if (local) { setSale({ signed: { ...cur.signed, [key]: sig } }); setOpen(null); return true; }
    const view = await signOnLane(cur.lotId, key, sig, reused);
    if (!view) return false;
    if (!reused) drawn = { lotId: cur.lotId, sig };
    const now = peekSale(); if (now) setSale({ signed: { ...now.signed, [key]: view } });
    return true;   // Paper stays open on the signed copy; Done closes it
  }

  return (
    <>
      <Page foot={<Button label={next ? 'Later' : 'Done'} onPress={next ? onClose : onDone} ghost={!!next} />}>
        <Label style={{ marginBottom: theme.space.m }}>Sign</Label>
        <View>
          {DOCS.map(d => {
            const done = !!sale.signed[d.key], live = next?.key === d.key;
            return <Choice key={d.key} label={d.title} detail={done ? 'signed' : live ? 'next' : undefined} selected={live} dim={!live && !done} onPress={live || done ? () => setOpen(d.key) : undefined} size={26} />;
          })}
        </View>
        <Body ink={theme.color.muted} style={{ textAlign: 'center', marginTop: theme.space.m, paddingHorizontal: theme.space.m }}>{titleLine(outOfState(sale) ? 'packet' : 'acknowledgment')}</Body>
      </Page>
      {/* the document opens over the whole glass, from where the step was: outside the Page, whose
          centred column clipped it to its own box (it opened half-height, its title off the top) */}
      {doc && (
        <Paper title={doc.title} subtitle={doc.subtitle} url={docs?.[doc.key]} onClose={() => setOpen(null)}
          signed={isSignedPath(signedView) ? signedView : undefined}
          reuse={doc.key !== 'guide' ? first : undefined}
          sign={signedView ? undefined : (sig, reused) => sign(doc.key, sig, reused)} />
      )}
    </>
  );
}
