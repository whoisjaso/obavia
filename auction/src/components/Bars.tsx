/* Two bars, the only copy on the Lane: Bid beside Retail. The buyer reads
   "I'm under retail" without a sentence. Widths share one scale (retail = full). */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { dollars } from '../engine/money';
import { theme } from '../theme';

function Bar({ label, value, scale, colour, delay }: { label: string; value: number; scale: number; colour: string; delay: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withSpring(Math.max(0.08, Math.min(1, value / scale)), { ...theme.spring.lift, mass: 1 }); }, [value, scale]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={s.row} accessibilityLabel={`${label} ${dollars(value)} dollars`}>
      <Text style={s.label}>{label}</Text>
      <View style={s.track}><Animated.View style={[s.fill, { backgroundColor: colour }, style]} /></View>
      <Text style={s.value}>${dollars(value)}</Text>
    </View>
  );
}

export function Bars({ bid, retail }: { bid: number; retail: number }) {
  return (
    <View style={s.wrap}>
      <Bar label="Bid" value={bid} scale={retail} colour={theme.color.cloud} delay={0} />
      <Bar label="Retail" value={retail} scale={retail} colour="rgba(255,255,255,0.38)" delay={60} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 48, ...theme.type.sans, fontSize: 12, color: theme.color.cloud, opacity: 0.85, letterSpacing: 0.2 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  value: { width: 64, textAlign: 'right', ...theme.type.sans, fontSize: 12, color: theme.color.cloud, opacity: 0.85, fontVariant: ['tabular-nums'] },
});
