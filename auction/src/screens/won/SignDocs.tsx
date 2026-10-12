/* Sign. Three documents in order, three words on a page. Each opens as Paper;
   the end of the page unlocks the pad; the second and third offer the first
   signature back with one tap. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Choice, Label, Page } from '../../components/Type';
import { setSale, useSale, type Doc } from '../../sale';
import { theme } from '../../theme';
import { Paper } from '../Paper';

const DOCS: { key: Doc; title: string; subtitle?: string }[] = [
  { key: 'guide', title: 'Buyers Guide', subtitle: 'AS IS – NO DEALER WARRANTY' },
  { key: 'bill', title: 'Bill of Sale' },
  { key: 'title', title: 'Title Assignment' },
];

export function SignDocs({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const sale = useSale();
  const [open, setOpen] = useState<Doc | null>(null);
  if (!sale) return null;
  const first = sale.signed.guide ?? sale.signed.bill ?? sale.signed.title;
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
      {doc && (
        <Paper title={doc.title} subtitle={doc.subtitle} onClose={() => setOpen(null)} reuse={doc.key !== 'guide' ? first : undefined}
          sign={sig => { setSale({ signed: { ...sale.signed, [doc.key]: sig } }); setOpen(null); }} />
      )}
    </Page>
  );
}
