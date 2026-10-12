/* Plates. One ring, three words. Pull to refresh. A county kickback turns the
   ring amber and the dealer fixes it. */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ring } from '../../components/Ring';
import { Button, Label, Serif } from '../../components/Type';
import { feel } from '../../feel';
import { useSale, type Plates as Stage } from '../../sale';
import { theme } from '../../theme';

const STEPS: Stage[] = ['filed', 'approved', 'mailed'];
const LABEL: Record<Stage, string> = { none: 'Filing', filed: 'Filed', approved: 'Approved', mailed: 'Mailed', kickback: 'Dealer fixing' };

export function Plates({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const sale = useSale();
  const [busy, setBusy] = useState(false);
  if (!sale) return null;
  const stage = sale.plates;
  const i = STEPS.indexOf(stage);
  const progress = stage === 'kickback' ? 0.34 : (i + 1) / 3;
  const refresh = () => { setBusy(true); feel.touch(); setTimeout(() => setBusy(false), 700); };
  return (
    <ScrollView style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + theme.space.m, paddingBottom: insets.bottom + theme.space.m, paddingHorizontal: theme.space.m, alignItems: 'center', justifyContent: 'center' }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={theme.color.accent} />}>
      <Label>Plates</Label>
      <View style={s.ringWrap}>
        <Ring size={220} stroke={6} progress={Math.max(0.02, progress)} blue={false} grey={stage === 'none'} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Serif size={34} ink={stage === 'kickback' ? theme.color.warn : stage === 'none' ? theme.color.faint : theme.color.ink}>{LABEL[stage]}</Serif>
          </View>
        </View>
      </View>
      <View style={s.steps}>
        {STEPS.map((st, k) => {
          const on = stage === 'mailed' || (i >= k && stage !== 'kickback');
          return <Label key={st} ink={on ? theme.color.ink : theme.color.faint}>{LABEL[st]}</Label>;
        })}
      </View>
      <View style={{ marginTop: theme.space.xl, alignSelf: 'stretch' }}><Button label="Back" onPress={onBack} ghost /></View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  ringWrap: { width: 220, height: 220, marginTop: theme.space.m, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: theme.space.m, marginTop: theme.space.l },
});
