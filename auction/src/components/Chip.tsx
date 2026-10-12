/* The deposit chip. Hollow while the money is held, filled when paid. */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme } from '../theme';

export function Chip({ label, filled, landKey }: { label: string; filled?: boolean; landKey?: number }) {
  const y = useSharedValue(0), o = useSharedValue(1);
  useEffect(() => {
    if (landKey === undefined) return;
    y.value = 10; o.value = 0;
    y.value = withSpring(0, theme.spring.lift); o.value = withSpring(1, theme.spring.lift);
  }, [landKey]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  return (
    <Animated.View style={[s.chip, filled ? s.filled : s.hollow, style]}>
      <Text style={[s.text, filled && { color: theme.color.cloud }]}>{label}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: 12, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  hollow: { borderColor: theme.color.accent, backgroundColor: 'transparent' },
  filled: { borderColor: theme.color.accent, backgroundColor: theme.color.accent },
  text: { fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.accent, fontVariant: ['tabular-nums'] },
});
