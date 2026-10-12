/* Sign. Three documents in order: the Buyers Guide, the bill of sale, the title
   assignment. Each opens as Paper; the end of the page unlocks the pad; the
   second and third offer the first signature back with one tap. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../../feel';
import { setSale, useSale, type Doc } from '../../sale';
import { theme } from '../../theme';
import { Paper } from '../Paper';

const DOCS: { key: Doc; title: string; subtitle?: string }[] = [
  { key: 'guide', title: 'Buyers Guide', subtitle: 'AS IS – NO DEALER WARRANTY' },
  { key: 'bill', title: 'Bill of Sale' },
  { key: 'title', title: 'Title Assignment' },
];

export function SignDocs({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const sale = useSale();
  const [open, setOpen] = useState<Doc | null>(null);
  if (!sale) return null;
  const first = sale.signed.guide ?? sale.signed.bill ?? sale.signed.title;
  const next = DOCS.find(d => !sale.signed[d.key]);
  const doc = DOCS.find(d => d.key === open);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky, paddingTop: insets.top + 12 }]}>
      <View style={s.list}>
        {DOCS.map(d => {
          const done = !!sale.signed[d.key], live = next?.key === d.key;
          return (
            <Pressable key={d.key} disabled={!live && !done} onPress={() => { feel.select(); setOpen(d.key); }} style={[s.row, live && s.rowLive]} accessibilityRole="button" accessibilityState={{ disabled: !live && !done }}>
              <View style={s.page} />
              <Text style={[s.rowText, !live && !done && { color: theme.color.faint }]}>{d.title}</Text>
              {done && <Tick />}
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={next ? onClose : onDone} style={[s.btn, next && s.btnGhost]} accessibilityRole="button">
        <Text style={[s.btnText, next && { color: theme.color.accent }]}>{next ? 'Later' : 'Done'}</Text>
      </Pressable>
      {doc && (
        <Paper title={doc.title} subtitle={doc.subtitle} onClose={() => setOpen(null)} reuse={doc.key !== 'guide' ? first : undefined}
          sign={sig => { setSale({ signed: { ...sale.signed, [doc.key]: sig } }); setOpen(null); }} />
      )}
    </View>
  );
}

function Tick() {
  return <Svg width={22} height={22} viewBox="0 0 26 26"><Path d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.good} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 22, gap: 10 },
  row: { height: 64, borderRadius: 18, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  rowLive: { borderColor: theme.color.accent },
  page: { width: 22, height: 28, borderRadius: 3, backgroundColor: theme.color.well, borderWidth: 1, borderColor: theme.color.line },
  rowText: { flex: 1, fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink },
  btn: { marginTop: 'auto', marginHorizontal: 22, marginBottom: 34, height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.cloud },
});
