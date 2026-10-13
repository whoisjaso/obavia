/* Two bars, the only copy on the Lane: Bid beside Retail. The buyer reads
   "I'm under retail" without a sentence. Widths share one scale (retail = full). */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { dollars } from '../engine/money';
import { spring } from '../motion';
import { theme } from '../theme';

function Bar({ label, value, scale, colour }: { label: string; value: number; scale: number; colour: string }) {
  const to = Math.max(0.08, Math.min(1, value / scale));
  const w = useSharedValue(to);   // a page scrolled into view shows its bars, it does not grow them (tens a day)
  useEffect(() => { if (w.value !== to) w.value = withSpring(to, spring.value); }, [to]);
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
      <Bar label="Bid" value={bid} scale={retail} colour={theme.color.cloud} />
      <Bar label="Retail" value={retail} scale={retail} colour="rgba(255,255,255,0.38)" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 58, ...theme.type.sans, fontSize: 17, color: theme.color.cloud, letterSpacing: 0.2, textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },   // absolute and childless: width is the one layout property allowed to move
  value: { width: 78, textAlign: 'right', ...theme.type.sans, fontSize: 17, color: theme.color.cloud, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
});
