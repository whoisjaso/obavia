/* Plates. One ring, the plate inside it, the one word inside the ring: the ring's fill and its word are the
   stage (simplicity-audit change 16, October 13, 2026; Find My does not caption its ring). Pull to refresh. A
   county kickback turns the ring amber and the dealer fixes it. Before the server has sent a filing the ring is
   grey and says the dealer's deadline (sale.ts platesWords), never a stage that has not happened. */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ring } from '../../components/Ring';
import { FAINT, Object3D } from '../../components/Object3D';
import { Button, Caps } from '../../components/Type';
import { feel } from '../../feel';
import { platesWords, useSale, type Plates as Stage } from '../../sale';
import { theme } from '../../theme';

const STEPS: Exclude<Stage, 'none'>[] = ['filed', 'approved', 'mailed'];

export function Plates({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const sale = useSale();
  const [busy, setBusy] = useState(false);
  if (!sale) return null;
  const stage = sale.plates;
  // before a filing the words are the deadline: "Filed by" over the date, so the date never breaks across lines
  const words = stage === 'none' ? platesWords(sale).replace(/^(\S+ \S+) /, '$1\n') : platesWords(sale);
  const i = STEPS.indexOf(stage as Exclude<Stage, 'none'>);
  const progress = stage === 'kickback' ? 0.34 : (i + 1) / 3;
  const refresh = () => { setBusy(true); feel.touch(); setTimeout(() => setBusy(false), 700); };
  return (
    <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + theme.space.m, paddingBottom: insets.bottom + theme.space.m, paddingHorizontal: theme.space.m, alignItems: 'center', justifyContent: 'center' }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={theme.color.accent} />}>
      <View style={s.ringWrap}>
        <Ring size={220} stroke={6} progress={Math.max(0.02, progress)} blue={false} grey={stage === 'none'} warn={stage === 'kickback'} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* the plate inside the ring that measures it (lego §4.1, touching): the ring is the plate's clock */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Object3D name="plate" width={136} strength={stage === 'none' ? FAINT : 1} style={{ marginBottom: 2 }} />
            <Caps size={18} ink={stage === 'kickback' ? theme.color.warn : stage === 'none' ? theme.color.muted : theme.color.ink} style={s.word}>{words}</Caps>
          </View>
        </View>
      </View>
      <View style={{ marginTop: theme.space.xl, alignSelf: 'stretch' }}><Button label="Back" onPress={onBack} ghost /></View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  ringWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  word: { maxWidth: 190, lineHeight: 24 },   // inside the ring: the deadline reads as two centred lines
});
