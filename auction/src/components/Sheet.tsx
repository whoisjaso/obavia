/* A bottom sheet with detents, Maps' shape. The grip and header drag it; the
   content scrolls on its own. Rubber-band, no sound: dragging is neutral. */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

export function Sheet({ detents = [0.3, 0.6, 1], initial = 1, onClose, header, children, dim = true }: {
  detents?: number[]; initial?: number; onClose: () => void;
  header?: React.ReactNode; children: React.ReactNode; dim?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = height - insets.top - 8;
  const heights = detents.map(d => Math.round(full * d));
  const h = useSharedValue(0);
  const start = useSharedValue(0);
  useEffect(() => { h.value = withSpring(heights[initial], theme.spring.sheet); }, []);
  const close = () => { h.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, f => { if (f) runOnJS(onClose)(); }); };
  const pan = Gesture.Pan().activeOffsetY([-6, 6])
    .onBegin(() => { start.value = h.value; })
    .onUpdate(e => {
      const next = start.value - e.translationY;
      const max = heights[heights.length - 1];
      h.value = next > max ? max + (next - max) * 0.25 : next;   // rubber-band past full
    })
    .onEnd(e => {
      const projected = h.value - e.velocityY * 0.15;
      if (projected < heights[0] * 0.6) { runOnJS(close)(); return; }
      let best = heights[0];
      for (const d of heights) if (Math.abs(d - projected) < Math.abs(best - projected)) best = d;
      h.value = withSpring(best, theme.spring.sheet);
    });
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {dim && <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,14,30,0.25)' }]} onPress={close} accessibilityLabel="Close" />}
      <Animated.View style={[s.sheet, style]}>
        <GestureDetector gesture={pan}>
          <View>
            <View style={s.grab} />
            {header}
          </View>
        </GestureDetector>
        <View style={{ flex: 1 }}>{children}</View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.color.sky, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: theme.color.line, marginTop: 10, marginBottom: 6 },
});
