/* A bottom sheet with detents, Maps' shape. The grip and header drag it; the
   content scrolls on its own. Rubber-band, no sound: dragging is neutral.
   The sheet is laid out once at full height and only moves (translateY), so
   no frame re-runs layout; the scrim's opacity follows the sheet.
   It rises like a cloud forming (cloud-system §4): the 0.75 spring from below, the scrim fading in, a
   mist where its top edge would be, the sky material inside. The air leaves (cloud-settle) as it forms;
   while a finger drags it the drift loop plays, its gain following the sheet's speed in steps; it stops on
   release. Reduced motion: it fades in where it rests. */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../feel';
import { EASE_OUT, EASE_SHEET, ms, spring } from '../motion';
import { theme } from '../theme';
import { Feather } from './Cloud';
import { Sky } from './Sky';

/** The drift loop's gain while a finger moves a sheet: velocity in 400 pt/s steps (0 to 6), so the RN
    runtime hears about a step change, never a frame. -1 = released. */
export function useDriftSound() {
  const level = useSharedValue(-1);
  useAnimatedReaction(() => level.value, (v, prev) => { if (v !== prev) scheduleOnRN(feel.drift, v < 0 ? 0 : v / 6); });
  useEffect(() => () => feel.drift(0), []);
  return level;
}
export const driftLevel = (vy: number) => { 'worklet'; return Math.min(6, Math.round(Math.abs(vy) / 400)); };

export function Sheet({ detents = [0.3, 0.6, 1], initial = 1, onClose, header, children, dim = true }: {
  detents?: number[]; initial?: number; onClose: () => void;
  header?: React.ReactNode; children: React.ReactNode; dim?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = height - insets.top - 8;
  const heights = detents.map(d => Math.round(full * d));
  const max = heights[heights.length - 1];
  const reduce = useReducedMotion();
  const h = useSharedValue(reduce ? heights[initial] : 0);       // visible height; the sheet sits at translateY = full - h
  const fade = useSharedValue(reduce ? 0 : 1);
  const start = useSharedValue(0);
  const air = useDriftSound();
  useEffect(() => {
    feel.settle();
    if (reduce) fade.value = withTiming(1, { duration: ms.sheetFade, easing: EASE_OUT });
    else h.value = withSpring(heights[initial], spring.form);
  }, []);
  const done = () => onClose();
  // no finger: the iOS sheet curve, 200 ms. A flick: the spring carries the flick's own speed.
  const close = () => {
    if (reduce) { fade.value = withTiming(0, { duration: ms.exit, easing: EASE_OUT }, f => { if (f) scheduleOnRN(done); }); return; }
    h.value = withTiming(0, { duration: ms.exit, easing: EASE_SHEET }, f => { if (f) scheduleOnRN(done); });
  };
  const pan = Gesture.Pan().activeOffsetY([-6, 6])
    .onBegin(() => { start.value = h.value; })          // grabbed mid-flight: take over from where it is
    .onUpdate(e => {
      const next = start.value - e.translationY;
      h.value = next > max ? max + (next - max) * 0.25 : next;   // rubber-band past full
      air.value = driftLevel(e.velocityY);
    })
    .onFinalize(() => { air.value = -1; })
    .onEnd(e => {
      const projected = h.value - e.velocityY * 0.15;
      if (projected < heights[0] * 0.6) {
        h.value = withSpring(0, { ...spring.sheet, velocity: -e.velocityY }, f => { if (f) scheduleOnRN(done); });
        return;
      }
      let best = heights[0];
      for (const d of heights) if (Math.abs(d - projected) < Math.abs(best - projected)) best = d;
      h.value = withSpring(best, { ...spring.sheet, velocity: -e.velocityY });
    });
  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: full - Math.min(h.value, full + 40) }] }));
  const drag = useDerivedValue(() => heights[initial] - h.value);   // the sky's parallax: pt below rest, down positive
  const scrim = useAnimatedStyle(() => ({ opacity: fade.value * interpolate(h.value, [0, heights[initial]], [0, 1], 'clamp') }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {dim && (
        <Animated.View style={[StyleSheet.absoluteFill, scrim]}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,14,30,0.25)' }]} onPress={close} accessibilityLabel="Close" />
        </Animated.View>
      )}
      <Animated.View style={[s.sheet, { height: full + 40, bottom: -40 }, style]}>
        <Feather />
        <View style={s.body}>
          <Sky radius={28} drag={drag} />
          <GestureDetector gesture={pan}>
            <View style={s.gripZone} accessibilityRole="adjustable" accessibilityLabel="Sheet grip, swipe down to close">
              <View style={s.grab} />
              {header}
            </View>
          </GestureDetector>
          <View style={{ flex: 1, marginBottom: 40 }}>{children}</View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0 },
  body: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', backgroundColor: theme.color.sky },
  gripZone: { paddingTop: 12, paddingBottom: 14 },   // 31 pt of grab plus the header: a thumb finds it without aiming
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: theme.color.line },
});
