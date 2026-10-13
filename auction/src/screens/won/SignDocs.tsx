/* Sign. Two drawn documents in order, the Buyers Guide and the bill of sale.
   Each opens as Paper; the end of the page unlocks the pad; the second offers
   the first signature back with one tap. The title is not drawn here (decisions
   §9 D8, D9): a Texas licence signs it through webDEALER at pickup; any other
   licence takes the paper packet at pickup. One line says which. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Choice, Label, Page } from '../../components/Type';
import { outOfState, setSale, useSale, type Doc } from '../../sale';
import { theme } from '../../theme';
import { Paper } from '../Paper';

const DOCS: { key: Doc; title: string; subtitle?: string }[] = [
  { key: 'guide', title: 'Buyers Guide', subtitle: 'AS IS - NO DEALER WARRANTY' },
  { key: 'bill', title: 'Bill of Sale' },
];
const TITLE_TX = 'Title through webDEALER at pickup.';
const TITLE_AWAY = 'Paper packet at pickup: Form 14-312, the assigned title, a green 60-day plate.';

export function SignDocs({ onDone, onClose, docs }: { onDone: () => void; onClose: () => void; docs?: { guide?: string; bill?: string; title?: string } }) {
  const sale = useSale();
  const [open, setOpen] = useState<Doc | null>(null);
  if (!sale) return null;
  const first = sale.signed.guide ?? sale.signed.bill;
  const next = DOCS.find(d => !sale.signed[d.key]);
  const doc = DOCS.find(d => d.key === open);
  return (
    <Page foot={<Button label={next ? 'Later' : 'Done'} onPress={next ? onClose : onDone} ghost={!!next} />}>
      <Label style={{ marginBottom: theme.space.m }}>Sign</Label>
      <View>
        {DOCS.map(d => {
          const done = !!sale.signed[d.key], live = next?.key === d.key;
          return <Choice key={d.key} label={d.title} detail={done ? 'signed' : live ? 'next' : undefined} selected={live} dim={!live && !done} onPress={live || done ? () => setOpen(d.key) : undefined} size={26} />;
        })}
      </View>
      <Body ink={theme.color.muted} style={{ fontSize: 14, textAlign: 'center', marginTop: theme.space.m, paddingHorizontal: theme.space.m }}>{outOfState(sale) ? TITLE_AWAY : TITLE_TX}</Body>
      {doc && (
        <Paper title={doc.title} subtitle={doc.subtitle} url={docs?.[doc.key]} onClose={() => setOpen(null)} reuse={doc.key !== 'guide' ? first : undefined}
          sign={sig => { setSale({ signed: { ...sale.signed, [doc.key]: sig } }); setOpen(null); }} />
      )}
    </Page>
  );
}
