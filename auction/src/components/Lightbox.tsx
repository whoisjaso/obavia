/* A photo opened from its thumbnail, iOS Photos' way. It grows out of the thumbnail's own rectangle to the
   full glass; two fingers pinch it (up to 4x, about the point between them); one finger moves it when zoomed;
   at rest size one finger drags it down and away, the black thinning as it goes, and a flick or 110 pt sends it
   back into its thumbnail. A double tap zooms to 2.5x at the tap and back; a single tap closes. Every gesture runs
   on the UI thread; React hears only "closed". Reduced motion: it fades in and out where it lies, and the pinch
   still follows the fingers (the user's own motion). Dismiss is neutral: silent. */
import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Photo } from '../data/cars';
import { EASE_OUT, EASE_SHEET, spring } from '../motion';
import { theme } from '../theme';

export type Rect = { x: number; y: number; w: number; h: number };

const OPEN_MS = 280, CLOSE_MS = 240, MAX_Z = 4, TAP_Z = 2.5;

export function Lightbox({ photo, from, onClose }: { photo: Photo; from: Rect | null; onClose: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReducedMotion();
  // the photo's own rectangle at rest: contained, centred
  const fit = Math.min(W / photo.w, H / photo.h);
  const iw = photo.w * fit, ih = photo.h * fit;
  // where it starts: inside the thumbnail, centred on it, never spilling past its edges
  const src = from ?? { x: W / 2 - iw / 4, y: H / 2 - ih / 4, w: iw / 2, h: ih / 2 };
  const s0 = Math.min(src.w / iw, src.h / ih);
  const dx0 = src.x + src.w / 2 - W / 2, dy0 = src.y + src.h / 2 - H / 2;

  const p = useSharedValue(0);                      // 0 in the thumbnail, 1 on the glass
  const z = useSharedValue(1), z0 = useSharedValue(1);
  const tx = useSharedValue(0), ty = useSharedValue(0), t0x = useSharedValue(0), t0y = useSharedValue(0);
  const fx = useSharedValue(0), fy = useSharedValue(0);
  const dx = useSharedValue(0), dy = useSharedValue(0);   // the dismiss drag
  const closing = useSharedValue(0);

  // reduced motion keeps the fade (opacity is not motion), so these two never jump
  useEffect(() => { p.value = withTiming(1, { duration: reduce ? 180 : OPEN_MS, easing: EASE_SHEET, reduceMotion: ReduceMotion.Never }); }, []);

  const close = (vy = 0) => {
    'worklet';
    if (closing.value) return;
    closing.value = 1;
    const done = (f?: boolean) => { 'worklet'; if (f) scheduleOnRN(onClose); };
    z.value = withTiming(1, { duration: CLOSE_MS, easing: EASE_OUT });
    tx.value = withTiming(0, { duration: CLOSE_MS, easing: EASE_OUT }); ty.value = withTiming(0, { duration: CLOSE_MS, easing: EASE_OUT });
    dx.value = withTiming(0, { duration: CLOSE_MS, easing: EASE_OUT });
    dy.value = withSpring(0, { ...spring.sheet, velocity: vy });
    p.value = withTiming(0, { duration: reduce ? 160 : CLOSE_MS, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }, done);
  };

  const clampT = () => {
    'worklet';
    // zoomed, the photo may move only as far as keeps an edge on the glass
    const mx = Math.max(0, (iw * z.value - W) / 2), my = Math.max(0, (ih * z.value - H) / 2);
    tx.value = withSpring(Math.max(-mx, Math.min(mx, tx.value)), spring.snap);
    ty.value = withSpring(Math.max(-my, Math.min(my, ty.value)), spring.snap);
  };

  const pinch = Gesture.Pinch()
    .onBegin(e => { z0.value = z.value; t0x.value = tx.value; t0y.value = ty.value; fx.value = e.focalX - W / 2; fy.value = e.focalY - H / 2; })
    .onUpdate(e => {
      const raw = z0.value * e.scale;
      // past the ends it gives, rubber-banded, and springs back on release
      const n = raw < 1 ? 1 - (1 - raw) * 0.35 : raw > MAX_Z ? MAX_Z + (raw - MAX_Z) * 0.2 : raw;
      z.value = n;
      // the point under the fingers stays under the fingers
      tx.value = fx.value - (fx.value - t0x.value) * (n / z0.value);
      ty.value = fy.value - (fy.value - t0y.value) * (n / z0.value);
    })
    .onEnd(() => {
      if (z.value <= 1) { z.value = withSpring(1, spring.snap); tx.value = withSpring(0, spring.snap); ty.value = withSpring(0, spring.snap); return; }
      if (z.value > MAX_Z) z.value = withSpring(MAX_Z, spring.snap);
      clampT();
    });

  const pan = Gesture.Pan().averageTouches(true)
    .onBegin(() => { t0x.value = tx.value; t0y.value = ty.value; })
    .onUpdate(e => {
      if (closing.value) return;
      if (z.value > 1.01) { tx.value = t0x.value + e.translationX; ty.value = t0y.value + e.translationY; return; }
      dx.value = e.translationX * 0.6;
      dy.value = e.translationY > 0 ? e.translationY : e.translationY * 0.2;   // up is rubber-banded
    })
    .onEnd(e => {
      if (closing.value) return;
      if (z.value > 1.01) { clampT(); return; }
      if (dy.value > 110 || e.velocityY > 800) { close(e.velocityY); return; }
      dx.value = withSpring(0, { ...spring.snap, velocity: e.velocityX });
      dy.value = withSpring(0, { ...spring.snap, velocity: e.velocityY });
    });

  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(260).onEnd(e => {
    if (z.value > 1.01) { z.value = withSpring(1, spring.snap); tx.value = withSpring(0, spring.snap); ty.value = withSpring(0, spring.snap); return; }
    const fx2 = e.x - W / 2, fy2 = e.y - H / 2;
    z.value = withSpring(TAP_Z, spring.snap);
    const mx = Math.max(0, (iw * TAP_Z - W) / 2), my = Math.max(0, (ih * TAP_Z - H) / 2);
    tx.value = withSpring(Math.max(-mx, Math.min(mx, -fx2 * (TAP_Z - 1))), spring.snap);
    ty.value = withSpring(Math.max(-my, Math.min(my, -fy2 * (TAP_Z - 1))), spring.snap);
  });
  const tap = Gesture.Tap().maxDuration(220).onEnd(() => { close(0); });

  const gesture = Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(doubleTap, tap));

  const back = useAnimatedStyle(() => ({ opacity: p.value * (1 - Math.min(0.85, Math.max(0, dy.value) / (H * 0.45))) }));
  const img = useAnimatedStyle(() => {
    if (reduce) return { opacity: p.value, transform: [{ translateX: tx.value + dx.value }, { translateY: ty.value + dy.value }, { scale: z.value }] };
    const shrink = interpolate(Math.max(0, dy.value), [0, H * 0.5], [1, 0.75], 'clamp');   // dragged away, it gets smaller
    const base = s0 + (1 - s0) * p.value;
    return {
      opacity: interpolate(p.value, [0, 0.12], [0, 1], 'clamp'),
      transform: [
        { translateX: dx0 * (1 - p.value) + tx.value + dx.value },
        { translateY: dy0 * (1 - p.value) + ty.value + dy.value },
        { scale: base * z.value * shrink },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel="Photo" accessibilityHint="Swipe down to close"
        accessibilityActions={[{ name: 'escape' }]} onAccessibilityAction={() => close(0)}>
        <Animated.View style={[StyleSheet.absoluteFill, s.back, back]} />
        {/* the image takes no pointer: on the web a mouse-down on an <img> starts the browser's own drag */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: (W - iw) / 2, top: (H - ih) / 2, width: iw, height: ih }, img]}>
          <Image source={photo.src} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  back: { backgroundColor: theme.color.ink },
});
