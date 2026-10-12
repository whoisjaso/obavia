/* Plates. One ring, three ticks: Filed · Approved · Mailed. Pull to refresh.
   A county kickback turns the ring amber and the dealer fixes it. */
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ring } from '../../components/Ring';
import { feel } from '../../feel';
import { useSale, type Plates as Stage } from '../../sale';
import { theme } from '../../theme';

const STEPS: Stage[] = ['filed', 'approved', 'mailed'];
const LABEL: Record<Stage, string> = { none: '', filed: 'Filed', approved: 'Approved', mailed: 'Mailed', kickback: 'Dealer fixing' };

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
    <ScrollView style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, alignItems: 'center', gap: 28 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={theme.color.accent} />}>
      <View style={s.ringWrap}>
        <View style={{ position: 'absolute' }}><Ring size={200} stroke={10} progress={Math.max(0.02, progress)} blue={false} grey={stage === 'none'} /></View>
        {stage === 'kickback' && <View style={StyleSheet.absoluteFill}><Ring size={200} stroke={10} progress={0.34} blue={false} /></View>}
        <View style={s.ticks}>
          {STEPS.map((st, k) => {
            const on = stage === 'mailed' || (i >= k && stage !== 'kickback');
            return (
              <View key={st} style={s.tick} accessibilityLabel={`${LABEL[st]}${on ? ', done' : ''}`}>
                <Svg width={26} height={26} viewBox="0 0 26 26">
                  <Circle cx={13} cy={13} r={11} stroke={on ? theme.color.good : theme.color.line} strokeWidth={2} fill={on ? theme.color.good + '18' : 'none'} />
                  {on && <Path d="M7 13.5 L11 17.5 L19 8.5" stroke={theme.color.good} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                </Svg>
                <Text style={[s.tickText, on && { color: theme.color.ink }]}>{LABEL[st]}</Text>
              </View>
            );
          })}
        </View>
      </View>
      {stage === 'kickback' && <Text style={s.amber}>{LABEL.kickback}</Text>}
      <Pressable onPress={onBack} hitSlop={12}><Text style={s.back}>Back</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  ringWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  ticks: { gap: 10 },
  tick: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tickText: { fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.faint },
  amber: { fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.warn },
  back: { fontFamily: theme.font.sans, fontSize: 14, color: theme.color.accent },
});
